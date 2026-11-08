#!/usr/bin/env python3
"""
Add the Joba24 App Clip to the Xcode project.

── WHY A SCRIPT AND NOT A COMMITTED TARGET ────────────────────────────────
`cap sync ios` rewrites part of the iOS project on every build, and the same
pattern already governs the Live Activity extension: the target is ADDED by a
patcher at build time, gated by a flag, so the default archive is untouched.

── WHAT AN APP CLIP NEEDS THAT AN EXTENSION DOES NOT ─────────────────────
  1. Its own target, of product type
     `com.apple.product-type.application.on-demand-install-capable`.
  2. A bundle id derived from the APP's own id (Apple requires the clip to be a
     child of the app). It is READ from the project here, never hardcoded, so it
     can never drift from the app it is embedded in.
  3. `com.apple.developer.parent-application-identifiers` in its entitlements —
     materialised from the committed template with that same app id.
  4. An "Embed App Clips" copy phase (dstSubfolderSpec = 16) in the APP target,
     plus a target dependency, which is what actually puts the .app clip inside
     the app.
  5. The `NSAppClip` Info.plist dictionary, committed with the clip's sources.

Nothing here touches the App target's own sources, settings or signing: only a
dependency and a copy phase are appended to it.
"""
import argparse
import hashlib
import json
import os
import re
import sys

# ── Stable ids in this project ──────────────────────────────────────────────
APP_TARGET_ID = "504EC3031FED79650016851F"
PROJECT_OBJECT_ID = "504EC2FC1FED79650016851F"
MAIN_GROUP_ID = "504EC2FB1FED79650016851F"
ASSETS_REF_ID = "504EC30E1FED79650016851F"
APP_CONFIG_IDS = ("504EC3171FED79650016851F", "504EC3181FED79650016851F")

CLIP_TARGET_NAME = "JobaClip"
CLIP_DIR = "JobaClip"
DEPLOYMENT_TARGET = "15.0"  # matches the app target

DEFAULT_PROJECT = "ios/App/App.xcodeproj/project.pbxproj"
TEMPLATE = "ios/App/JobaClip/JobaClip.entitlements.template"
ENTITLEMENTS = "ios/App/JobaClip/JobaClip.entitlements"

# ── The two files App Store Connect validated the first clip build against ──
# They are NOT part of project.pbxproj, which is exactly why they were missed:
# the clip archive could be wired perfectly and still be rejected at upload.
CLIP_INFO_PLIST = "ios/App/JobaClip/Info.plist"
APP_ENTITLEMENTS = "ios/App/App/App.entitlements"

APPCLIP_ENTITLEMENT = "com.apple.developer.associated-appclip-app-identifiers"
ASSOCIATED_DOMAINS_KEY = "com.apple.developer.associated-domains"

# Error 90474: a clip that supports iPad (TARGETED_DEVICE_FAMILY = "1,2") must
# declare every orientation, because iPad can rotate.
ORIENTATIONS = [
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationPortraitUpsideDown",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
]

# Warning 90876: the PARENT app names the clip it contains, prefixed with the
# Apple Team ID. Same team the app is signed with; APPLE_TEAM_ID overrides it.
DEFAULT_TEAM_ID = "322DV2PB9V"

CLIP_SOURCES = ["JobaClipApp.swift", "ClipRootView.swift", "ClipVideoPlayer.swift"]


def uid(seed):
    """A stable 24-hex-character object id for a named object."""
    return hashlib.md5(("joba24.appclip." + seed).encode("utf-8")).hexdigest().upper()[:24]


IDS = {k: uid(k) for k in (
    "group",
    "file_app", "file_root", "file_video", "file_product",
    "bf_app", "bf_root", "bf_video", "bf_assets", "bf_embed",
    "phase_sources", "phase_frameworks", "phase_resources", "phase_embed",
    "target", "cfg_debug", "cfg_release", "cfg_list", "proxy", "dep",
)}


# ══════════════════════════════════════════════════════════════════════════════
# Anchored text edits
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


def add_to_section(text, name, body):
    """Append `body` to a pbxproj section, creating the section when absent.

    Sections are created on demand because this project ships WITHOUT
    PBXContainerItemProxy / PBXCopyFilesBuildPhase / PBXTargetDependency, while a
    project that was already patched for the Live Activity extension has them. The
    patcher must produce the same result either way, and either order of the two
    patchers must work."""
    end = "/* End %s section */" % name
    if ("/* Begin %s section */" % name) in text:
        return must_replace(text, end, body + end, "%s section" % name)
    return must_replace(
        text,
        "/* End PBXBuildFile section */",
        "/* End PBXBuildFile section */\n\n/* Begin %s section */\n%s/* End %s section */"
        % (name, body, name),
        "%s section (new)" % name,
    )


def app_bundle_id(text):
    """The APP target's own bundle id, as written in the project."""
    for cfg_id in APP_CONFIG_IDS:
        index = text.find("%s /*" % cfg_id)
        if index < 0:
            continue
        block = text[index:index + 6000]
        match = re.search(r'PRODUCT_BUNDLE_IDENTIFIER = ("?)([^";\n]+)\1;', block)
        if match:
            return match.group(2).strip()
    raise SystemExit(
        "ERROR: the App target's PRODUCT_BUNDLE_IDENTIFIER could not be read.\n"
        "       The clip's bundle id and parent identifier are derived from it."
    )


def app_target_slice(text):
    """[start, end) of the App target's object, so edits land in it and nowhere else."""
    start = text.find("\t\t%s /* App */ = {" % APP_TARGET_ID)
    if start < 0:
        raise SystemExit("ERROR: the App target object was not found in project.pbxproj.")
    end = text.find("/* End PBXNativeTarget section */", start)
    if end < 0:
        raise SystemExit("ERROR: the App target has no end marker.")
    return start, end


def insert_first(text, start, end, pattern, insert, what):
    """Insert `insert` just after the first `pattern` inside text[start:end]."""
    block = text[start:end]
    match = re.search(pattern, block)
    if not match:
        raise SystemExit(
            "ERROR: could not find %s in the App target.\n"
            "       The project's shape changed - review this script." % what
        )
    at = start + match.end()
    return text[:at] + insert + text[at:]


# ══════════════════════════════════════════════════════════════════════════════
# Build settings
# ══════════════════════════════════════════════════════════════════════════════
def clip_build_settings(clip_bundle_id):
    return """				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_ENTITLEMENTS = %s/JobaClip.entitlements;
				CODE_SIGN_STYLE = Manual;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = %s/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = %s;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = "%s";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";""" % (CLIP_DIR, CLIP_DIR, DEPLOYMENT_TARGET, clip_bundle_id)


def clip_configurations(clip_bundle_id):
    common = clip_build_settings(clip_bundle_id)
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


# ══════════════════════════════════════════════════════════════════════════════
# The two facts App Store Connect rejected the first clip build for
# ══════════════════════════════════════════════════════════════════════════════
def read_text(path):
    if not os.path.exists(path):
        raise SystemExit("ERROR: %s is missing." % path)
    with open(path, "r") as handle:
        return handle.read()


def block_values(text, key):
    """The <string> values of one key's <array>, in file order. [] when absent."""
    match = re.search(r"<key>%s</key>\s*<array>(.*?)</array>" % re.escape(key), text, re.S)
    if not match:
        return []
    return re.findall(r"<string>([^<]*)</string>", match.group(1))


def set_block(text, key, values):
    """Replace (or insert) one key's array, leaving the rest of the file alone.

    A TEXT edit, not a plist round-trip: the comments in these files are the
    explanation of why each key is there, and plistlib would drop them all.
    """
    block = "\t<key>%s</key>\n\t<array>\n%s\t</array>\n" % (
        key, "".join("\t\t<string>%s</string>\n" % v for v in values))
    pattern = re.compile(r"\t<key>%s</key>\s*<array>.*?</array>\n" % re.escape(key), re.S)
    if pattern.search(text):
        return pattern.sub(lambda _m: block, text, count=1)
    anchor = "</dict>\n</plist>"
    if anchor not in text:
        raise SystemExit("ERROR: cannot add %s to a plist without a closing </dict>." % key)
    return text.replace(anchor, block + anchor, 1)


def clip_appclip_hosts():
    """The `appclips:` hosts the App Clip itself claims, from its own entitlements.

    Read from the CLIP, never typed here twice, so the parent's entry can never
    name a different domain than the clip that is embedded in it."""
    for path in (ENTITLEMENTS, TEMPLATE):
        if not os.path.exists(path):
            continue
        hosts = []
        for value in block_values(read_text(path), ASSOCIATED_DOMAINS_KEY):
            service, _, host = value.partition(":")
            if service == "appclips" and host and host not in hosts:
                hosts.append(host)
        if hosts:
            return hosts
    return []


def associated_domains_required(hosts=None):
    """Both service entries Apple requires for one invocation host."""
    hosts = clip_appclip_hosts() if hosts is None else hosts
    return ["%s:%s" % (service, host)
            for host in hosts for service in ("applinks", "appclips")]


def ensure_parent_associated_domains(hosts=None, path=None):
    """Declare the clip's invocation domain on the PARENT app as well.

    Apple requires the domain in the Associated Domains entitlement on BOTH the
    app and the App Clip target. Carried only on the clip, App Store Connect
    rejects the App Clip experience URL with "This URL is not contained in your
    app's associated domains" — a SIGNED-ENTITLEMENTS fault that no AASA file
    and no ASC setting can cure, because App Store Connect reads it out of the
    uploaded binary.

    Existing entries are kept in their existing order; only what is missing is
    appended, so this is safe to run on every build."""
    path = path or APP_ENTITLEMENTS
    required = associated_domains_required(hosts)
    if not required:
        raise SystemExit(
            "ERROR: the App Clip declares no appclips: associated domain, so the\n"
            "       parent app's invocation domain cannot be derived.\n"
            "       Expected it in %s or %s." % (ENTITLEMENTS, TEMPLATE))
    text = read_text(path)
    existing = block_values(text, ASSOCIATED_DOMAINS_KEY)
    missing = [value for value in required if value not in existing]
    if not missing:
        return "%s: declares %s" % (path, ", ".join(required))
    with open(path, "w") as handle:
        handle.write(set_block(text, ASSOCIATED_DOMAINS_KEY, existing + missing))
    return "%s: added %s" % (path, ", ".join(missing))


def ensure_clip_plist(path=None):
    """Declare all four orientations, on both the generic and the iPad key."""
    path = path or CLIP_INFO_PLIST
    text = read_text(path)
    original = text
    for key in ("UISupportedInterfaceOrientations", "UISupportedInterfaceOrientations~ipad"):
        if block_values(text, key) != ORIENTATIONS:
            text = set_block(text, key, ORIENTATIONS)
    if text == original:
        return "%s: all four orientations already declared" % path
    with open(path, "w") as handle:
        handle.write(text)
    return "%s: all four orientations declared (error 90474)" % path


def appclip_identifier(parent_bundle, team_id):
    return "%s.%s.Clip" % (team_id, parent_bundle)


def ensure_parent_entitlements(project_text, team_id=DEFAULT_TEAM_ID, path=None):
    """Name this app's clip in the PARENT app's entitlements (warning 90876)."""
    path = path or APP_ENTITLEMENTS
    identifier = appclip_identifier(app_bundle_id(project_text), team_id)
    text = read_text(path)
    if block_values(text, APPCLIP_ENTITLEMENT) == [identifier]:
        return "%s: already names %s" % (path, identifier)
    with open(path, "w") as handle:
        handle.write(set_block(text, APPCLIP_ENTITLEMENT, [identifier]))
    return "%s: names %s (warning 90876)" % (path, identifier)


# ══════════════════════════════════════════════════════════════════════════════
# The patch
# ══════════════════════════════════════════════════════════════════════════════
def apply(project_text, team_id=DEFAULT_TEAM_ID, clip_plist=None, app_entitlements=None):
    # ── NORMALISED ON EVERY RUN, INCLUDING AN ALREADY-PATCHED PROJECT ───────
    # The orientation list and the parent's clip identifier live outside
    # project.pbxproj, so a project that is "already applied" says nothing
    # about them. Both are rewritten (idempotently) before anything else, and
    # `--check --require` proves the result instead of trusting an earlier run.
    notes = [ensure_clip_plist(clip_plist),
             ensure_parent_entitlements(project_text, team_id, app_entitlements),
             ensure_parent_associated_domains(path=app_entitlements)]

    if CLIP_TARGET_NAME in project_text:
        return project_text, notes + ["already applied - project untouched"]

    parent_bundle = app_bundle_id(project_text)
    clip_bundle = (os.environ.get("CLIP_BUNDLE_ID") or "").strip() or (parent_bundle + ".Clip")
    t = project_text

    # ── 1. PBXBuildFile ─────────────────────────────────────────────────────
    t = must_replace(t, "/* End PBXBuildFile section */", """		%s /* JobaClipApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* JobaClipApp.swift */; };
		%s /* ClipRootView.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* ClipRootView.swift */; };
		%s /* ClipVideoPlayer.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* ClipVideoPlayer.swift */; };
		%s /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = %s /* Assets.xcassets */; };
		%s /* %s.app in Embed App Clips */ = {isa = PBXBuildFile; fileRef = %s /* %s.app */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };
/* End PBXBuildFile section */""" % (
        IDS["bf_app"], IDS["file_app"],
        IDS["bf_root"], IDS["file_root"],
        IDS["bf_video"], IDS["file_video"],
        IDS["bf_assets"], ASSETS_REF_ID,
        IDS["bf_embed"], CLIP_TARGET_NAME, IDS["file_product"], CLIP_TARGET_NAME,
    ), "PBXBuildFile section")
    notes.append("PBXBuildFile: 5 entries")

    # ── 2. PBXFileReference ─────────────────────────────────────────────────
    t = must_replace(t, "/* End PBXFileReference section */", """		%s /* JobaClipApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = JobaClipApp.swift; sourceTree = "<group>"; };
		%s /* ClipRootView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ClipRootView.swift; sourceTree = "<group>"; };
		%s /* ClipVideoPlayer.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ClipVideoPlayer.swift; sourceTree = "<group>"; };
		%s /* %s.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = %s.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */""" % (
        IDS["file_app"], IDS["file_root"], IDS["file_video"],
        IDS["file_product"], CLIP_TARGET_NAME, CLIP_TARGET_NAME,
    ), "PBXFileReference section")
    notes.append("PBXFileReference: 4 entries")

    # ── 3. Target dependency (proxy + dependency) ───────────────────────────
    t = add_to_section(t, "PBXContainerItemProxy", """		%s /* PBXContainerItemProxy */ = {
			isa = PBXContainerItemProxy;
			containerPortal = %s /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = %s;
			remoteInfo = %s;
		};
""" % (IDS["proxy"], PROJECT_OBJECT_ID, IDS["target"], CLIP_TARGET_NAME))

    t = add_to_section(t, "PBXTargetDependency", """		%s /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			target = %s /* %s */;
			targetProxy = %s /* PBXContainerItemProxy */;
		};
""" % (IDS["dep"], IDS["target"], CLIP_TARGET_NAME, IDS["proxy"]))

    # ── 4. The embed phase — what actually puts the clip inside the app ─────
    t = add_to_section(t, "PBXCopyFilesBuildPhase", """		%s /* Embed App Clips */ = {
			isa = PBXCopyFilesBuildPhase;
			buildActionMask = 2147483647;
			dstPath = "$(CONTENTS_FOLDER_PATH)/AppClips";
			dstSubfolderSpec = 16;
			files = (
				%s /* %s.app in Embed App Clips */,
			);
			name = "Embed App Clips";
			runOnlyForDeploymentPostprocessing = 0;
		};
""" % (IDS["phase_embed"], IDS["bf_embed"], CLIP_TARGET_NAME))

    # ── 5. The clip's own build phases ──────────────────────────────────────
    t = must_replace(t, "/* End PBXSourcesBuildPhase section */", """		%s /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				%s /* JobaClipApp.swift in Sources */,
				%s /* ClipRootView.swift in Sources */,
				%s /* ClipVideoPlayer.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */""" % (IDS["phase_sources"], IDS["bf_app"], IDS["bf_root"], IDS["bf_video"]),
                    "PBXSourcesBuildPhase section")

    t = must_replace(t, "/* End PBXFrameworksBuildPhase section */", """		%s /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */""" % IDS["phase_frameworks"],
                    "PBXFrameworksBuildPhase section")

    # The app's own asset catalog is compiled INTO the clip. That is the whole
    # icon story: one artwork, one catalog, no second copy to drift.
    t = must_replace(t, "/* End PBXResourcesBuildPhase section */", """		%s /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				%s /* Assets.xcassets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */""" % (IDS["phase_resources"], IDS["bf_assets"]),
                    "PBXResourcesBuildPhase section")

    # ── 6. Source group ─────────────────────────────────────────────────────
    t = must_replace(t, "/* End PBXGroup section */", """		%s /* %s */ = {
			isa = PBXGroup;
			children = (
				%s /* JobaClipApp.swift */,
				%s /* ClipRootView.swift */,
				%s /* ClipVideoPlayer.swift */,
			);
			path = %s;
			sourceTree = "<group>";
		};
/* End PBXGroup section */""" % (
        IDS["group"], CLIP_TARGET_NAME,
        IDS["file_app"], IDS["file_root"], IDS["file_video"],
        CLIP_DIR,
    ), "PBXGroup section")

    t = must_replace(t, "\t\t\t\t504EC3061FED79650016851F /* App */,\n", """				%s /* %s */,
				504EC3061FED79650016851F /* App */,
""" % (IDS["group"], CLIP_TARGET_NAME), "the project's main group children")
    notes.append("a %s group beside App" % CLIP_DIR)

    # ── 7. The target ───────────────────────────────────────────────────────
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
			productReference = %s /* %s.app */;
			productType = "com.apple.product-type.application.on-demand-install-capable";
		};
/* End PBXNativeTarget section */""" % (
        IDS["target"], CLIP_TARGET_NAME,
        IDS["cfg_list"], CLIP_TARGET_NAME,
        IDS["phase_sources"], IDS["phase_frameworks"], IDS["phase_resources"],
        CLIP_TARGET_NAME, CLIP_TARGET_NAME,
        IDS["file_product"], CLIP_TARGET_NAME,
    ), "PBXNativeTarget section")
    notes.append("PBXNativeTarget: %s" % CLIP_TARGET_NAME)

    # ── 8. Register the target on the project ───────────────────────────────
    t = insert_first(t, 0, len(t), r"\n(\t*)targets = \(\n",
                     "\t\t\t\t%s /* %s */,\n" % (IDS["target"], CLIP_TARGET_NAME),
                     "the project's targets list")

    # ── 9. The APP depends on the clip and embeds it ────────────────────────
    start, end = app_target_slice(t)
    t = insert_first(t, start, end, r"\n(\t*)dependencies = \(\n",
                     "\t\t\t\t%s /* PBXTargetDependency */,\n" % IDS["dep"],
                     "the App target's dependencies list")
    start, end = app_target_slice(t)
    # LAST in the list, which is where Xcode puts an embed phase: the clip is
    # copied in once the app's own sources and resources exist.
    t = insert_first(t, start, end, r"\n(\t*)504EC3021FED79650016851F /\* Resources \*/,\n",
                     "\t\t\t\t%s /* Embed App Clips */,\n" % IDS["phase_embed"],
                     "the App target's Resources phase (to place Embed App Clips after it)")
    notes.append("App: dependency + Embed App Clips phase")

    # ── 10. Configurations ──────────────────────────────────────────────────
    t = must_replace(t, "/* End XCBuildConfiguration section */", clip_configurations(clip_bundle) +
                     "/* End XCBuildConfiguration section */", "XCBuildConfiguration section")

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
        IDS["cfg_list"], CLIP_TARGET_NAME, IDS["cfg_debug"], IDS["cfg_release"],
    ), "XCConfigurationList section")
    notes.append("configurations: Debug + Release, bundle id %s" % clip_bundle)

    # ── 11. The entitlements file, from the committed template ──────────────
    write_entitlements(parent_bundle)
    notes.append("entitlements written for parent %s" % parent_bundle)

    return t, notes


def write_entitlements(parent_bundle):
    if not os.path.exists(TEMPLATE):
        raise SystemExit("ERROR: %s is missing." % TEMPLATE)
    with open(TEMPLATE, "r") as handle:
        text = handle.read()
    with open(ENTITLEMENTS, "w") as handle:
        handle.write(text.replace("__PARENT_BUNDLE_ID__", parent_bundle))


# ══════════════════════════════════════════════════════════════════════════════
# --check: prove the target is really there, and correctly wired
# ══════════════════════════════════════════════════════════════════════════════
def braces_balanced(text):
    depth = 0
    for char in text:
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def inspect(project_text, team_id=DEFAULT_TEAM_ID, clip_plist=None, app_entitlements=None):
    clip_plist = clip_plist or CLIP_INFO_PLIST
    app_entitlements = app_entitlements or APP_ENTITLEMENTS
    # ── WHAT APPLE VALIDATES, REPORTED EVEN FOR AN UNPATCHED PROJECT ────────
    # The first clip build was rejected for these two and for nothing else, so
    # they are part of the report (and of --require) rather than a footnote.
    expected = appclip_identifier(app_bundle_id(project_text), team_id)
    plist_text = read_text(clip_plist)
    entitlements_text = read_text(app_entitlements)
    orientations = block_values(plist_text, "UISupportedInterfaceOrientations")
    declared = block_values(entitlements_text, APPCLIP_ENTITLEMENT)
    # The App Clip experience URL check reads the APP's signed associated
    # domains, so both service entries for the invocation host are part of the
    # report and of the strict gate.
    domains = block_values(entitlements_text, ASSOCIATED_DOMAINS_KEY)
    required_domains = associated_domains_required()
    report = {"target_present": False, "embed": False, "dependency": False,
              "product_type": None, "bundle_id": None, "sources": [],
              "entitlements": os.path.exists(ENTITLEMENTS),
              "brace_balance_ok": braces_balanced(project_text),
              "clip_orientations": orientations,
              "clip_orientations_complete": orientations == ORIENTATIONS,
              "parent_appclip_identifiers": declared,
              "parent_appclip_expected": expected,
              "parent_appclip_ok": expected in declared,
              "parent_associated_domains": domains,
              "parent_associated_required": required_domains,
              "parent_associated_ok": bool(required_domains)
              and all(value in domains for value in required_domains)}
    if CLIP_TARGET_NAME not in project_text:
        return report
    report["target_present"] = True
    start = project_text.find("%s /* %s */ = {" % (IDS["target"], CLIP_TARGET_NAME))
    if start >= 0:
        block = project_text[start:project_text.find("};", start) + 2]
        match = re.search(r'productType = "([^"]+)";', block)
        report["product_type"] = match.group(1) if match else None
        report["sources"] = [name for name in CLIP_SOURCES if name in project_text]
    config_start = project_text.find("%s /* Debug */ = {" % IDS["cfg_debug"])
    if config_start >= 0:
        config = project_text[config_start:config_start + 2600]
        match = re.search(r'PRODUCT_BUNDLE_IDENTIFIER = "?([^";\n]+)"?;', config)
        report["bundle_id"] = match.group(1) if match else None
    report["embed"] = "Embed App Clips" in project_text and 'dstSubfolderSpec = 16' in project_text
    report["dependency"] = IDS["dep"] in project_text
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description="Add the Joba24 App Clip to the Xcode project.")
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--check", action="store_true", help="only report, never write")
    parser.add_argument("--require", action="store_true", help="fail unless the clip is wired")
    parser.add_argument("--report", default="", help="write the JSON report here")
    parser.add_argument("--dry-run", action="store_true", help="print the result's size only")
    parser.add_argument("--team-id", default=os.environ.get("APPLE_TEAM_ID", DEFAULT_TEAM_ID),
                        help="Apple Team ID prefixed to the clip id in the parent entitlements")
    parser.add_argument("--clip-plist", default=CLIP_INFO_PLIST,
                        help="the clip's Info.plist to normalise")
    parser.add_argument("--app-entitlements", default=APP_ENTITLEMENTS,
                        help="the PARENT app's entitlements to normalise")
    args = parser.parse_args(argv)

    with open(args.project, "r") as handle:
        original = handle.read()

    context = {"team_id": args.team_id, "clip_plist": args.clip_plist,
               "app_entitlements": args.app_entitlements}
    report = {"ok": True, "notes": []}
    if args.check:
        report.update(inspect(original, **context))
        report["ok"] = report["target_present"] and report["brace_balance_ok"]
        if args.require:
            # The two rejections Apple reported are part of the gate: a wired
            # target whose plist or parent entitlements are wrong fails HERE,
            # before an hour of archive, instead of at upload.
            if not (report["target_present"] and report["embed"] and report["dependency"]
                    and report["entitlements"]
                    and report["clip_orientations_complete"] and report["parent_appclip_ok"]
                    and report["parent_associated_ok"]):
                report["ok"] = False
            report["missing"] = [name for name, ok in (
                ("target", report["target_present"]),
                ("embed phase", report["embed"]),
                ("target dependency", report["dependency"]),
                ("clip entitlements file", report["entitlements"]),
                ("all four clip orientations (error 90474)", report["clip_orientations_complete"]),
                ("parent appclip identifier (warning 90876)", report["parent_appclip_ok"]),
                ("applinks + appclips on the parent app", report["parent_associated_ok"]),
            ) if not ok]
            for item in report["missing"]:
                sys.stderr.write("MISSING: %s\n" % item)
    else:
        patched, notes = apply(original, **context)
        report["notes"] = notes
        if patched != original:
            if not braces_balanced(patched):
                raise SystemExit("ERROR: the patched project would not be brace-balanced. Nothing written.")
            if not args.dry_run:
                with open(args.project, "w") as handle:
                    handle.write(patched)
                report["written"] = True
                report.update(inspect(patched, **context))
        else:
            report["written"] = False
            report.update(inspect(patched, **context))
        report["ok"] = report.get("target_present", False)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.report:
        with open(args.report, "w") as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)
    if not report["ok"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())