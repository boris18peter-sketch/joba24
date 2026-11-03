#!/usr/bin/env python3
"""
patch-ios-live-activity.py — wire the Live Activity widget extension into the
Capacitor Xcode project WITHOUT Xcode.

    python3 scripts/patch-ios-live-activity.py             # apply (idempotent)
    python3 scripts/patch-ios-live-activity.py --check      # parse + report JSON
    python3 scripts/patch-ios-live-activity.py --check --require
    python3 scripts/patch-ios-live-activity.py --check --require --report report.json

── OUTPUT CONTRACT (why there are two streams) ──────────────────────────────
The report is MACHINE DATA. Diagnostics are for a human reading the build log.
Mixing them on one stream is what failed the widget-enabled build:

    python3 patch-ios-live-activity.py --check --require > widget-check.json
    json.load(open("widget-check.json"))
    -> JSONDecodeError: Extra data: line 44 column 1

The JSON document ended at line 43 and `OK: ... fully wired` followed it on
stdout, so the consumer was handed a document plus a sentence. The contract is now:

  * stdout (with --check, unless --quiet) carries THE JSON DOCUMENT AND NOTHING
    ELSE, so `> file.json` stays parseable.
  * `--report FILE` writes the same document to a dedicated file, atomically,
    even on failure and even with --quiet. This is what CI reads.
  * every diagnostic — `OK:`, `ERROR:`, `[live-activity] …` — goes to stderr.

So a consumer never has to guess where the JSON ends, and a failing run still
produces a complete, inspectable report.

── WHY A GENERATOR AND NOT A HAND-EDITED PROJECT ────────────────────────────
A Widget Extension is not a folder of files: it is a second TARGET in
project.pbxproj, with its own build configurations, its own provisioning and an
"Embed Foundation Extensions" copy phase inside the app target. Building one
normally means Xcode's "File > New > Target" wizard.

This script writes exactly the objects that wizard writes, using deterministic
UUIDs (md5 of a seed, so a re-run produces byte-identical output). It is the only
supported way to add the extension here, and it is checked into the repository so
the change is reviewable instead of living in one person's Xcode.

── SAFETY ──────────────────────────────────────────────────────────────────
  * Idempotent: if the target is already present, nothing is written.
  * Every anchor is asserted; a project whose shape changed fails loudly instead
    of producing a half-linked file.
  * `--check` re-parses the file with an OpenStep-plist parser written here, so
    the report describes what Xcode will actually read rather than what this
    script intended to write.

The app target itself is only touched in two places — two files appended to its
Sources phase, and the embed phase + dependency added — so every existing screen,
plugin and signing setting is left exactly as it was.
"""

import argparse
import hashlib
import json
import os
import plistlib
import sys

# ── Identity ────────────────────────────────────────────────────────────────
APP_TARGET_ID = "504EC3031FED79650016851F"
PROJECT_OBJECT_ID = "504EC2FC1FED79650016851F"
APP_TARGET_NAME = "App"
WIDGET_TARGET_NAME = "JobaActivityWidgetExtension"
WIDGET_DIR = "JobaActivityWidget"
APP_BUNDLE_ID = "com.base69e6bdb4986a04a256653a23.app"
# One source of truth: CI passes WIDGET_BUNDLE_ID (the App ID registered in
# Apple), so the project can never be patched with an id that differs from the
# one a provisioning profile was fetched for. Locally the derived default holds.
WIDGET_BUNDLE_ID = (os.environ.get("WIDGET_BUNDLE_ID") or "").strip() or (APP_BUNDLE_ID + "." + WIDGET_DIR)
DEPLOYMENT_TARGET = "16.1"  # ActivityKit + WidgetKit Live Activities

DEFAULT_PROJECT = "ios/App/App.xcodeproj/project.pbxproj"
DEFAULT_INFO_PLIST = "ios/App/App/Info.plist"


def uid(seed):
    """A stable 24-hex-character object id for a named object."""
    return hashlib.md5(("joba24.liveactivity." + seed).encode("utf-8")).hexdigest().upper()[:24]


IDS = {k: uid(k) for k in (
    "widget_group", "file_bundle", "file_attrs", "file_info", "file_product", "file_plugin",
    "bf_attrs_widget", "bf_bundle_widget", "bf_attrs_app", "bf_plugin_app", "bf_product_embed",
    "phase_sources", "phase_frameworks", "phase_resources", "phase_embed",
    "target", "cfg_debug", "cfg_release", "cfg_list", "proxy", "dep",
    # The interactive action: the intent lives in the widget only, the App Group
    # store is compiled into BOTH targets (written by the app, read by the widget).
    "file_intent", "bf_intent_widget", "file_store", "bf_store_widget", "bf_store_app",
)}


# ══════════════════════════════════════════════════════════════════════════════
# OpenStep property-list parser (the format project.pbxproj is written in)
# ══════════════════════════════════════════════════════════════════════════════
PUNCT = "{}()=;,"


def tokenize(text):
    tokens = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in " \t\r\n":
            i += 1
            continue
        if text.startswith("//", i):
            nl = text.find("\n", i)
            i = n if nl < 0 else nl + 1
            continue
        if text.startswith("/*", i):
            end = text.find("*/", i)
            if end < 0:
                raise ValueError("unterminated /* comment at offset %d" % i)
            i = end + 2
            continue
        if c == '"':
            i += 1
            out = []
            while i < n:
                ch = text[i]
                if ch == "\\":
                    i += 1
                    if i < n:
                        out.append(text[i])
                        i += 1
                    continue
                if ch == '"':
                    i += 1
                    tokens.append(("str", "".join(out)))
                    break
                out.append(ch)
                i += 1
            else:
                raise ValueError("unterminated string")
            continue
        if c in PUNCT:
            tokens.append(("punct", c))
            i += 1
            continue
        start = i
        while i < n and text[i] not in " \t\r\n" + PUNCT + '"':
            if text.startswith("//", i) or text.startswith("/*", i):
                break
            i += 1
        if start == i:
            raise ValueError("unexpected character %r at offset %d" % (text[i], i))
        tokens.append(("str", text[start:i]))
    return tokens


class Parser:
    def __init__(self, tokens):
        self.t = tokens
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else ("eof", "")

    def next(self):
        tok = self.peek()
        self.i += 1
        return tok

    def expect(self, ch):
        tok = self.next()
        if tok != ("punct", ch):
            raise ValueError("expected %r, found %r near token %d" % (ch, tok, self.i))

    def value(self):
        kind, val = self.next()
        if kind == "punct" and val == "{":
            out = {}
            while True:
                tok = self.peek()
                if tok == ("punct", "}"):
                    self.next()
                    return out
                key = self.next()
                if key[0] != "str":
                    raise ValueError("expected a dictionary key, found %r" % (key,))
                self.expect("=")
                out[key[1]] = self.value()
                self.expect(";")
        if kind == "punct" and val == "(":
            out = []
            while True:
                tok = self.peek()
                if tok == ("punct", ")"):
                    self.next()
                    return out
                if tok == ("punct", ","):
                    self.next()
                    continue
                out.append(self.value())
            # unreachable
        if kind == "str":
            return val
        raise ValueError("unexpected token %r at position %d" % ((kind, val), self.i))

    def document(self):
        value = self.value()
        if self.peek()[0] != "eof":
            raise ValueError("trailing content after the root object")
        return value


def parse_pbxproj(text):
    return Parser(tokenize(text)).document()


def resolve(objects, entry):
    """A build-phase entry may be a plain id or a {value, comment} pair."""
    if isinstance(entry, dict):
        return objects.get(entry.get("value", ""), {})
    return objects.get(str(entry), {})


def name_of(objects, entry):
    """The file name behind a build-phase entry.

    A phase's `files` array holds PBXBuildFile ids, and a PBXBuildFile is only a
    join row — it has no path of its own, it points at a PBXFileReference. So the
    name lives one hop further out; without this hop every check below would
    report an empty Sources phase on a perfectly wired project.
    """
    obj = resolve(objects, entry)
    if not obj:
        return ""
    if obj.get("path") or obj.get("name"):
        return obj.get("path") or obj.get("name")
    ref = obj.get("fileRef")
    if ref:
        target = objects.get(ref if isinstance(ref, str) else ref.get("value", "")) or {}
        return target.get("path") or target.get("name") or ""
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# Inspection
# ══════════════════════════════════════════════════════════════════════════════
def inspect(project_text, info_plist_path):
    report = {"ok": False, "error": None, "targets": [], "widget": {"present": False},
              "embed": False, "dependency": False, "app_sources": [], "app_conditions": {},
              "info_plist": {}}
    try:
        data = parse_pbxproj(project_text)
    except Exception as exc:  # noqa: BLE001 - the message is the product
        report["error"] = "project.pbxproj is not parseable: %s" % exc
        return report

    objects = data.get("objects") or {}
    project = objects.get(PROJECT_OBJECT_ID) or {}
    target_ids = [t if isinstance(t, str) else t.get("value") for t in (project.get("targets") or [])]
    report["targets"] = [name_of(objects, t) for t in target_ids]
    report["app_sources"] = app_source_names(objects)
    report["app_conditions"] = app_compilation_conditions(objects)

    widget_id = next((t for t in target_ids
                      if (objects.get(t) or {}).get("name") == WIDGET_TARGET_NAME), None)
    if widget_id:
        target = objects[widget_id]
        phases = [p if isinstance(p, str) else p.get("value") for p in (target.get("buildPhases") or [])]
        sources = []
        config_names = []
        for phase_id in phases:
            phase = objects.get(phase_id) or {}
            if phase.get("isa") == "PBXSourcesBuildPhase":
                sources = [name_of(objects, f) for f in (phase.get("files") or [])]
        for cfg in ((objects.get((target.get("buildConfigurationList") or "")) or {}).get("buildConfigurations") or []):
            config_names.append((objects.get((cfg if isinstance(cfg, str) else cfg.get("value"))) or {}).get("name"))
        settings = {}
        for cfg in ((objects.get((target.get("buildConfigurationList") or "")) or {}).get("buildConfigurations") or []):
            obj = objects.get((cfg if isinstance(cfg, str) else cfg.get("value"))) or {}
            settings.update(obj.get("buildSettings") or {})
        report["widget"] = {
            "present": True,
            "id": widget_id,
            "product_type": target.get("productType"),
            "sources": sorted(x for x in sources if x),
            "configurations": config_names,
            "bundle_id": settings.get("PRODUCT_BUNDLE_IDENTIFIER", ""),
            "deployment_target": settings.get("IPHONEOS_DEPLOYMENT_TARGET", ""),
            "infoplist_file": settings.get("INFOPLIST_FILE", ""),
            "skip_install": settings.get("SKIP_INSTALL", ""),
        }

    app = objects.get(APP_TARGET_ID) or {}
    for phase_entry in (app.get("buildPhases") or []):
        phase = resolve(objects, phase_entry)
        if phase.get("isa") != "PBXCopyFilesBuildPhase":
            continue
        embedded = [name_of(objects, f) for f in (phase.get("files") or [])]
        if any(str(x).endswith(".appex") for x in embedded):
            report["embed"] = True
    report["dependency"] = bool(app.get("dependencies"))

    if info_plist_path and os.path.exists(info_plist_path):
        try:
            with open(info_plist_path, "rb") as fh:
                info = plistlib.load(fh)
            report["info_plist"] = {
                "NSSupportsLiveActivities": info.get("NSSupportsLiveActivities"),
                "UIBackgroundModes": info.get("UIBackgroundModes") or [],
            }
        except Exception as exc:  # noqa: BLE001
            report["error"] = "Info.plist is not readable: %s" % exc
            return report

    report["ok"] = True
    return report


def app_source_names(objects):
    """Everything the App target compiles, from ITS OWN sources phase.

    Reported per file name so the CI gate can prove that SceneDelegate.swift and
    LiveActivityPlugin.swift are compiled by the same target - the condition under
    which `JobaActivityPlugin` exists at all."""
    app = objects.get(APP_TARGET_ID) or {}
    for phase_entry in (app.get("buildPhases") or []):
        phase = resolve(objects, phase_entry)
        if phase.get("isa") == "PBXSourcesBuildPhase":
            return sorted(n for n in (name_of(objects, f) for f in (phase.get("files") or [])) if n)
    return []


def app_compilation_conditions(objects):
    """The APP target's SWIFT_ACTIVE_COMPILATION_CONDITIONS per configuration.

    This is what makes the guarded registration in SceneDelegate compile, so the
    gate fails when it is missing. The widget's own copy lives on its own target
    and says nothing about whether the app can see the class."""
    app = objects.get(APP_TARGET_ID) or {}
    out = {}
    for cfg_entry in ((objects.get((app.get("buildConfigurationList") or "")) or {})
                      .get("buildConfigurations") or []):
        obj = resolve(objects, cfg_entry)
        out[obj.get("name") or "?"] = (obj.get("buildSettings") or {}).get(
            "SWIFT_ACTIVE_COMPILATION_CONDITIONS", "")
    return out


# ══════════════════════════════════════════════════════════════════════════════
# Application
# ══════════════════════════════════════════════════════════════════════════════
def must_replace(text, anchor, replacement, what):
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(
            "ERROR: expected exactly 1 occurrence of %s in project.pbxproj, found %d.\n"
            "       The project's shape changed - review this script before building.\n"
            "       anchor: %r" % (what, count, anchor[:120])
        )
    return text.replace(anchor, replacement, 1)


def widget_build_settings():
    common = """				APPLICATION_EXTENSION_API_ONLY = YES;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_ENTITLEMENTS = %s/JobaActivityWidget.entitlements;
				CODE_SIGN_STYLE = Manual;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = %s/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = %s;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
					"@executable_path/../../Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = %s;
				PRODUCT_BUNDLE_PACKAGE_TYPE = "XPC!";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";""" % (WIDGET_DIR, WIDGET_DIR, DEPLOYMENT_TARGET, WIDGET_BUNDLE_ID)
    debug = """			%s /* Debug */ = {
				isa = XCBuildConfiguration;
				buildSettings = {
%s
					SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
					SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				};
				name = Debug;
			};
""" % (IDS["cfg_debug"], common)
    release = """			%s /* Release */ = {
				isa = XCBuildConfiguration;
				buildSettings = {
%s
					SWIFT_ACTIVE_COMPILATION_CONDITIONS = "";
					SWIFT_OPTIMIZATION_LEVEL = "-O";
				};
				name = Release;
			};
""" % (IDS["cfg_release"], common)
    return debug + release


# ── The app target's two build configurations (stable ids in this project) ──────
APP_CONFIG_IDS = {"Debug": "504EC3171FED79650016851F", "Release": "504EC3181FED79650016851F"}


def _config_block(text, config_id, name):
    """The [start, end) slice of ONE build configuration object."""
    marker = "%s /* %s */ = {" % (config_id, name)
    start = text.find(marker)
    if start < 0:
        raise SystemExit(
            "ERROR: could not find the App target's %s build configuration (%s) in "
            "project.pbxproj.\n"
            "       The project's shape changed - review this script before building."
            % (name, config_id)
        )
    end = text.find("\n\t\t};", start)
    if end < 0:
        raise SystemExit("ERROR: unterminated %s build configuration in project.pbxproj" % name)
    return start, end


def add_app_compilation_condition(text):
    """Define LIVE_ACTIVITY_WIDGET on the APP target, in the run that adds the file.

    SceneDelegate registers the plugin behind `#if LIVE_ACTIVITY_WIDGET`, so the
    flag and the class's source file travel together. A build that compiles the
    reference always compiles the class; the shipping build, whose project never
    receives the file, compiles the guard instead of the reference.

    That is the fix for "cannot find 'JobaActivityPlugin' in scope": the app target
    used to reference a type that only some builds contain.

    Only the app target gets the flag - the widget extension never needs it, and
    defining it there would say nothing about whether the app can see the class."""
    plan = {
        "Debug": ("SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;",
                  'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG LIVE_ACTIVITY_WIDGET";'),
        "Release": ('SWIFT_ACTIVE_COMPILATION_CONDITIONS = "";',
                    'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "LIVE_ACTIVITY_WIDGET";'),
    }
    for name in ("Debug", "Release"):
        start, end = _config_block(text, APP_CONFIG_IDS[name], name)
        block = text[start:end]
        if "LIVE_ACTIVITY_WIDGET" in block:
            continue
        old, new = plan[name]
        if block.count(old) != 1:
            raise SystemExit(
                "ERROR: expected exactly 1 occurrence of %r in the App target's %s "
                "configuration, found %d.\n"
                "       The project's shape changed - review this script before building."
                % (old, name, block.count(old))
            )
        text = text[:start] + block.replace(old, new, 1) + text[end:]
    return text


def apply(project_text, info_plist_path):
    if WIDGET_TARGET_NAME in project_text:
        # A project patched by an earlier version of this script has the target
        # but not the compilation condition. Adding it is what makes the guarded
        # registration compile, so a half-patched project is repaired rather than
        # silently left inert.
        repaired = add_app_compilation_condition(project_text)
        if repaired != project_text:
            return repaired, ["widget target already present - added the LIVE_ACTIVITY_WIDGET condition"]
        return project_text, ["already applied - nothing written"]

    notes = []
    t = project_text

    # ── 1. PBXBuildFile ─────────────────────────────────────────────────────
    t = must_replace(t, "/* End PBXBuildFile section */", """		%s /* JobaTaskActivityAttributes.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaTaskActivityAttributes.swift */; };
		%s /* JobaActivityWidgetBundle.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaActivityWidgetBundle.swift */; };
		%s /* JobaTaskActivityAttributes.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaTaskActivityAttributes.swift */; };
		%s /* LiveActivityPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* LiveActivityPlugin.swift */; };
		%s /* JobaActivityWidgetExtension.appex in Embed Foundation Extensions */ = {isa = PBXBuildFile; fileRef = %s /* JobaActivityWidgetExtension.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };
		%s /* JobaTaskActionIntent.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaTaskActionIntent.swift */; };
		%s /* JobaActivityAuthStore.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaActivityAuthStore.swift */; };
		%s /* JobaActivityAuthStore.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaActivityAuthStore.swift */; };
/* End PBXBuildFile section */""" % (
        IDS["bf_attrs_widget"], IDS["file_attrs"],
        IDS["bf_bundle_widget"], IDS["file_bundle"],
        IDS["bf_attrs_app"], IDS["file_attrs"],
        IDS["bf_plugin_app"], IDS["file_plugin"],
        IDS["bf_product_embed"], IDS["file_product"],
        IDS["bf_intent_widget"], IDS["file_intent"],
        IDS["bf_store_widget"], IDS["file_store"],
        IDS["bf_store_app"], IDS["file_store"],
    ), "PBXBuildFile section")
    notes.append("PBXBuildFile: 8 entries")

    # ── 2. PBXFileReference ─────────────────────────────────────────────────
    t = must_replace(t, "/* End PBXFileReference section */", """		%s /* JobaActivityWidgetBundle.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = JobaActivityWidgetBundle.swift; sourceTree = "<group>"; };
		%s /* JobaTaskActivityAttributes.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = JobaTaskActivityAttributes.swift; sourceTree = "<group>"; };
		%s /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
		%s /* JobaActivityWidgetExtension.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = JobaActivityWidgetExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; };
		%s /* LiveActivityPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = LiveActivityPlugin.swift; sourceTree = "<group>"; };
		%s /* JobaTaskActionIntent.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = JobaTaskActionIntent.swift; sourceTree = "<group>"; };
		%s /* JobaActivityAuthStore.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = JobaActivityAuthStore.swift; sourceTree = "<group>"; };
/* End PBXFileReference section */""" % (
        IDS["file_bundle"], IDS["file_attrs"], IDS["file_info"],
        IDS["file_product"], IDS["file_plugin"],
        IDS["file_intent"], IDS["file_store"],
    ), "PBXFileReference section")
    notes.append("PBXFileReference: 7 entries")

    # ── 3. Container proxy + target dependency + copy phase sections ────────
    t = must_replace(t, "/* Begin PBXFileReference section */", """/* Begin PBXContainerItemProxy section */
		%s /* PBXContainerItemProxy */ = {
			isa = PBXContainerItemProxy;
			containerPortal = %s /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = %s;
			remoteInfo = %s;
		};
/* End PBXContainerItemProxy section */

/* Begin PBXCopyFilesBuildPhase section */
		%s /* Embed Foundation Extensions */ = {
			isa = PBXCopyFilesBuildPhase;
			buildActionMask = 2147483647;
			dstPath = "";
			dstSubfolderSpec = 13;
			files = (
				%s /* JobaActivityWidgetExtension.appex in Embed Foundation Extensions */,
			);
			name = "Embed Foundation Extensions";
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXCopyFilesBuildPhase section */

/* Begin PBXFileReference section */""" % (
        IDS["proxy"], PROJECT_OBJECT_ID, IDS["target"], WIDGET_TARGET_NAME,
        IDS["phase_embed"], IDS["bf_product_embed"],
    ), "PBXFileReference section start")
    notes.append("new sections: PBXContainerItemProxy, PBXCopyFilesBuildPhase")

    # ── 4. Frameworks phase for the widget (system frameworks only) ─────────
    t = must_replace(t, "/* End PBXFrameworksBuildPhase section */", """		%s /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */""" % IDS["phase_frameworks"], "PBXFrameworksBuildPhase section")

    # ── 5. Groups: widget group, product, main group, plugin file ref ───────
    t = must_replace(t, "/* End PBXGroup section */", """		%s /* %s */ = {
			isa = PBXGroup;
			children = (
				%s /* JobaActivityWidgetBundle.swift */,
				%s /* JobaTaskActivityAttributes.swift */,
				%s /* JobaTaskActionIntent.swift */,
				%s /* JobaActivityAuthStore.swift */,
				%s /* Info.plist */,
			);
			path = %s;
			sourceTree = "<group>";
		};
/* End PBXGroup section */""" % (
        IDS["widget_group"], WIDGET_DIR,
        IDS["file_bundle"], IDS["file_attrs"], IDS["file_intent"], IDS["file_store"],
        IDS["file_info"], WIDGET_DIR,
    ), "PBXGroup section")
    t = must_replace(t, """				504EC3041FED79650016851F /* App.app */,
""", """				504EC3041FED79650016851F /* App.app */,
				%s /* JobaActivityWidgetExtension.appex */,
""" % IDS["file_product"], "Products group")
    t = must_replace(t, """				504EC3051FED79650016851F /* Products */,
""", """				504EC3051FED79650016851F /* Products */,
				%s /* %s */,
""" % (IDS["widget_group"], WIDGET_DIR), "main group")
    t = must_replace(t, """				9582B6822FE993A50072D4E8 /* SceneDelegate.swift */,
""", """				9582B6822FE993A50072D4E8 /* SceneDelegate.swift */,
				%s /* LiveActivityPlugin.swift */,
""" % IDS["file_plugin"], "App group")
    notes.append("groups: widget group + product + plugin")

    # ── 6. App target: embed phase + dependency ─────────────────────────────
    t = must_replace(t, """				504EC3021FED79650016851F /* Resources */,
""", """				504EC3021FED79650016851F /* Resources */,
				%s /* Embed Foundation Extensions */,
""" % IDS["phase_embed"], "App target build phases")
    t = must_replace(t, """			dependencies = (
			);
			name = App;""", """			dependencies = (
				%s /* PBXTargetDependency */,
			);
			name = App;""" % IDS["dep"], "App target dependencies")
    notes.append("App target: embed phase + dependency")

    # ── 7. Widget native target ─────────────────────────────────────────────
    t = must_replace(t, "/* End PBXNativeTarget section */", """		%s /* %s */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = %s /* Build configuration list for PBXNativeTarget "%s" */;
			buildPhases = (
				%s /* Sources */,
				%s /* Frameworks */,
				%s /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = %s;
			productName = %s;
			productReference = %s /* JobaActivityWidgetExtension.appex */;
			productType = "com.apple.product-type.app-extension";
		};
/* End PBXNativeTarget section */""" % (
        IDS["target"], WIDGET_TARGET_NAME, IDS["cfg_list"], WIDGET_TARGET_NAME,
        IDS["phase_sources"], IDS["phase_frameworks"], IDS["phase_resources"],
        WIDGET_TARGET_NAME, WIDGET_TARGET_NAME, IDS["file_product"],
    ), "PBXNativeTarget section")
    notes.append("PBXNativeTarget: %s" % WIDGET_TARGET_NAME)

    # ── 8. Project: target list + target attributes ─────────────────────────
    t = must_replace(t, """				504EC3031FED79650016851F /* App */,
			);""", """				504EC3031FED79650016851F /* App */,
				%s /* %s */,
			);""" % (IDS["target"], WIDGET_TARGET_NAME), "PBXProject targets")
    t = must_replace(t, """						ProvisioningStyle = Automatic;
					};""", """						ProvisioningStyle = Automatic;
					};
					%s = {
						CreatedOnToolsVersion = 15.0;
						ProvisioningStyle = Manual;
					};""" % IDS["target"], "PBXProject TargetAttributes")
    notes.append("PBXProject: targets + TargetAttributes")

    # ── 9. Resources + Sources phases ───────────────────────────────────────
    t = must_replace(t, "/* End PBXResourcesBuildPhase section */", """		%s /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */""" % IDS["phase_resources"], "PBXResourcesBuildPhase section")
    t = must_replace(t, "/* End PBXSourcesBuildPhase section */", """		%s /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				%s /* JobaTaskActivityAttributes.swift in Sources */,
				%s /* JobaActivityWidgetBundle.swift in Sources */,
				%s /* JobaTaskActionIntent.swift in Sources */,
				%s /* JobaActivityAuthStore.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */""" % (
        IDS["phase_sources"], IDS["bf_attrs_widget"], IDS["bf_bundle_widget"],
        IDS["bf_intent_widget"], IDS["bf_store_widget"],
    ), "PBXSourcesBuildPhase section")
    t = must_replace(t, """				9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */,
""", """				9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */,
				%s /* JobaTaskActivityAttributes.swift in Sources */,
				%s /* LiveActivityPlugin.swift in Sources */,
				%s /* JobaActivityAuthStore.swift in Sources */,
""" % (IDS["bf_attrs_app"], IDS["bf_plugin_app"], IDS["bf_store_app"]), "App Sources phase")
    notes.append("App Sources: attributes + plugin + action store")

    # ── 9b. The flag SceneDelegate's guard reads ────────────────────────────
    # Added in the same run as the file above: the reference and the class it
    # names are now inseparable.
    t = add_app_compilation_condition(t)
    notes.append("App target: LIVE_ACTIVITY_WIDGET compilation condition")

    # ── 10. Target dependency ───────────────────────────────────────────────
    t = must_replace(t, "/* Begin PBXVariantGroup section */", """/* Begin PBXTargetDependency section */
		%s /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			target = %s /* %s */;
			targetProxy = %s /* PBXContainerItemProxy */;
		};
/* End PBXTargetDependency section */

/* Begin PBXVariantGroup section */""" % (
        IDS["dep"], IDS["target"], WIDGET_TARGET_NAME, IDS["proxy"],
    ), "PBXVariantGroup section start")

    # ── 11. Build configurations + configuration list ───────────────────────
    t = must_replace(t, "/* End XCBuildConfiguration section */",
                     widget_build_settings() + "/* End XCBuildConfiguration section */",
                     "XCBuildConfiguration section")
    t = must_replace(t, "/* End XCConfigurationList section */", """		%s /* Build configuration list for PBXNativeTarget "%s" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				%s /* Debug */,
				%s /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */""" % (
        IDS["cfg_list"], WIDGET_TARGET_NAME, IDS["cfg_debug"], IDS["cfg_release"],
    ), "XCConfigurationList section")
    notes.append("XCBuildConfiguration: Debug + Release (iOS %s)" % DEPLOYMENT_TARGET)

    # ── 12. The app must be allowed to show Live Activities ─────────────────
    if info_plist_path and os.path.exists(info_plist_path):
        with open(info_plist_path, "rb") as fh:
            info = plistlib.load(fh)
        if info.get("NSSupportsLiveActivities") is not True:
            info["NSSupportsLiveActivities"] = True
            with open(info_plist_path, "wb") as fh:
                plistlib.dump(info, fh)
            notes.append("Info.plist: NSSupportsLiveActivities = true")
        else:
            notes.append("Info.plist: NSSupportsLiveActivities already true")
    else:
        notes.append("Info.plist: NOT FOUND - Live Activities would not be permitted")

    return t, notes


# ══════════════════════════════════════════════════════════════════════════════
def diag(message):
    """A human line. NEVER stdout: stdout is reserved for the JSON document."""
    sys.stderr.write(str(message) + "\n")
    sys.stderr.flush()


def emit_report(report, path):
    """Write the report to its own file, atomically.

    Always called - success or failure - so the consumer in CI never reads a
    partial document and never has to parse a sentence out of a data stream."""
    if not path:
        return
    directory = os.path.dirname(os.path.abspath(path))
    if directory and not os.path.isdir(directory):
        os.makedirs(directory, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp, path)


def main():
    parser = argparse.ArgumentParser(description="Wire the Live Activity widget extension into the Xcode project")
    parser.add_argument("--check", action="store_true", help="report the project's structure as JSON")
    parser.add_argument("--require", action="store_true", help="with --check: exit 1 unless the target is fully wired")
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--info-plist", dest="info_plist", default=DEFAULT_INFO_PLIST)
    parser.add_argument("--report", default=None,
                        help="write the JSON report to this file (always, even on failure)")
    parser.add_argument("--quiet", action="store_true",
                        help="suppress the JSON on stdout; --report still writes the file")
    args = parser.parse_args()

    if not os.path.exists(args.project):
        emit_report({"ok": False, "error": "%s not found (run this from the repository root)" % args.project,
                     "targets": [], "widget": {"present": False}, "embed": False, "dependency": False,
                     "app_sources": [], "app_conditions": {}, "info_plist": {}}, args.report)
        diag("ERROR: %s not found (run this from the repository root)" % args.project)
        return 1

    if args.check:
        with open(args.project, "r", encoding="utf-8") as fh:
            report = inspect(fh.read(), args.info_plist)
        # The document goes to its own file FIRST, so even a failing run leaves a
        # complete report behind for the caller to read.
        emit_report(report, args.report)
        # stdout carries the document and nothing else - never a human line.
        if not args.quiet:
            json.dump(report, sys.stdout, indent=2, ensure_ascii=False)
            sys.stdout.write("\n")
            sys.stdout.flush()
        if not report["ok"]:
            diag("ERROR: %s" % (report.get("error") or "project check failed"))
            return 1
        if args.require:
            widget = report["widget"]
            app_sources = report["app_sources"]
            missing = []
            if not widget.get("present"):
                missing.append("widget target")
            if widget.get("present"):
                if widget.get("product_type") != "com.apple.product-type.app-extension":
                    missing.append("widget product type")
                if widget.get("bundle_id") != WIDGET_BUNDLE_ID:
                    missing.append("widget bundle id")
                if widget.get("deployment_target") != DEPLOYMENT_TARGET:
                    missing.append("widget deployment target")
                if "JobaActivityWidgetBundle.swift" not in widget.get("sources", []):
                    missing.append("widget sources")
                if not widget.get("infoplist_file"):
                    missing.append("widget Info.plist")
            if not report["embed"]:
                missing.append("Embed Foundation Extensions phase")
            if not report["dependency"]:
                missing.append("app -> widget target dependency")
            for need in ("LiveActivityPlugin.swift", "JobaTaskActivityAttributes.swift"):
                if need not in app_sources:
                    missing.append("App sources: " + need)
            # The class SceneDelegate registers can only exist if the file above
            # is compiled by the SAME target that compiles SceneDelegate.
            if "SceneDelegate.swift" not in app_sources:
                missing.append("App sources: SceneDelegate.swift")
            # ...and SceneDelegate only references it behind this condition.
            conditions = report.get("app_conditions") or {}
            if not conditions:
                missing.append("App target build configurations")
            for cfg_name, value in conditions.items():
                if "LIVE_ACTIVITY_WIDGET" not in (value or ""):
                    missing.append("App %s: LIVE_ACTIVITY_WIDGET compilation condition" % cfg_name)
            if report["info_plist"].get("NSSupportsLiveActivities") is not True:
                missing.append("Info.plist NSSupportsLiveActivities")
            if missing:
                diag("ERROR: the Live Activity target is not fully wired: " + ", ".join(missing))
                return 1
            # Diagnostics are stderr: this line used to land on stdout, right
            # after the JSON, which is what made the CI consumer fail with
            # "Extra data: line 44 column 1".
            diag("OK: Live Activity widget extension is fully wired")
        return 0

    with open(args.project, "r", encoding="utf-8") as fh:
        original = fh.read()

    patched, notes = apply(original, args.info_plist)

    if patched != original:
        # Parse BEFORE writing: a file that cannot be re-read is never saved.
        try:
            parse_pbxproj(patched)
        except Exception as exc:  # noqa: BLE001
            diag("ERROR: refusing to write a project.pbxproj that does not parse: %s" % exc)
            return 1
        with open(args.project, "w", encoding="utf-8") as fh:
            fh.write(patched)

    if not args.quiet:
        for note in notes:
            diag("[live-activity] " + note)
        diag("[live-activity] %s" % ("project.pbxproj updated" if patched != original else "project already patched"))
    return 0


if __name__ == "__main__":
    sys.exit(main())