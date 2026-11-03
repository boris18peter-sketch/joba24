#!/usr/bin/env python3
"""
ios-export-options.py — build export_options.plist, one profile per bundle id.

    python3 scripts/ios-export-options.py \
        --profiles-dir "$HOME/Library/MobileDevice/Provisioning Profiles" \
        --app-bundle-id "$BUNDLE_ID" \
        --widget-bundle-id "$WIDGET_BUNDLE_ID" \
        --require-widget "$ENABLE_LIVE_ACTIVITY_WIDGET" \
        --out "$CM_BUILD_DIR/export_options.plist" \
        --report "$CM_BUILD_DIR/export-options.json"

── WHY THIS IS A SCRIPT AND NOT A SHELL LOOP ────────────────────────────────
The step it replaces picked profiles with a `for` loop in the workflow itself,
and it had two faults that only appear once there is a SECOND profile on disk —
which is exactly what enabling the widget does:

  1. `[ -z "$PROFILE_PATH" ] && PROFILE_PATH="$CANDIDATE"` returns 1 on every
     iteration after the first. Under `set -e` that aborts the step, so the
     export died before xcodebuild was ever called.
  2. The loop was untestable: it needed macOS, a keychain and real profiles, so
     nothing could prove which profile a given bundle id would receive.

Here the mapping is a pure function over decoded profiles. `security` is used
only to decode a real .mobileprovision; a file that is already a plist (a decoded
fixture) is read directly, so the whole mapping runs in a test.

── OUTPUT CONTRACT ─────────────────────────────────────────────────────────
The plist goes to --out. The machine report goes to --report as one JSON document,
written even on failure. Diagnostics go to stderr, never stdout.
"""

import argparse
import json
import os
import plistlib
import subprocess
import sys

DEFAULT_SIGNING_CERTIFICATE = "Apple Distribution"
DEFAULT_METHOD = "app-store-connect"


def diag(message):
    sys.stderr.write(str(message) + "\n")
    sys.stderr.flush()


def emit_report(report, path):
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


def parse_bool(raw, name):
    """Codemagic may hand over true/True/false/False/an empty string."""
    value = (raw or "").strip().lower()
    if value in ("", "false"):
        return False
    if value == "true":
        return True
    raise SystemExit("ERROR: %s must be true or false, got %r" % (name, raw))


def load_profile(path):
    """A decoded profile dict from a .mobileprovision OR from a plist file."""
    with open(path, "rb") as fh:
        raw = fh.read()
    if raw.startswith(b"bplist00") or raw.lstrip().startswith(b"<?xml") or raw.lstrip().startswith(b"<plist"):
        return plistlib.loads(raw)
    # A signed .mobileprovision is a CMS envelope: only macOS can open it.
    out = subprocess.run(["security", "cms", "-D", "-i", path],
                         check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    return plistlib.loads(out.stdout)


def describe(path):
    """(bundle_id, name, team_id) for one profile, or None if unreadable."""
    try:
        info = load_profile(path)
    except Exception as exc:  # noqa: BLE001 - an unreadable profile is skipped, not fatal
        diag("  ! could not read %s (%s)" % (os.path.basename(path), exc))
        return None
    ent = info.get("Entitlements") or {}
    app_id = ent.get("application-identifier") or ent.get("com.apple.application-identifier") or ""
    # "<TEAMID>.<bundle id>"
    bundle_id = app_id.split(".", 1)[1] if "." in app_id else ""
    team = (info.get("TeamIdentifier") or [""])[0]
    return {
        "file": path,
        "name": info.get("Name") or "",
        "bundle_id": bundle_id,
        "team_id": team,
        "expires": info.get("ExpirationDate"),
        # The capability that tells a CURRENT profile from one minted before the
        # App Group existed. Both carry the same bundle id; only this differs.
        "groups": list(ent.get("com.apple.security.application-groups") or []),
    }


def collect(paths):
    found = []
    for path in paths:
        described = describe(path)
        if described:
            found.append(described)
    return found


def candidate_files(profiles_dir):
    """Only real .mobileprovision files.

    Anything else in that directory (the export plist this script writes, for
    one) is not a profile and must never be listed as a candidate."""
    if not profiles_dir or not os.path.isdir(profiles_dir):
        return []
    return sorted(os.path.join(profiles_dir, name)
                  for name in os.listdir(profiles_dir)
                  if name.endswith(".mobileprovision"))


def pick(profiles, bundle_id, required_groups=(), allow_single=False):
    """Choose THE profile for one bundle id: (profile, error).

    Selection is by BUNDLE ID — never by file name, and never by position in the
    directory. Among several profiles for the same id it prefers one that
    actually carries the entitlement this app signs with (the App Group), because
    a profile minted before that capability existed has the SAME bundle id as the
    good one: the bundle id alone cannot tell them apart, the entitlement can.

    Remaining ties are broken by expiry (newest first) and then by name, so the
    same set of files always produces the same choice.

    `allow_single` keeps the legacy single-profile fallback for the shipping
    build, where the only profile on disk is the app's by definition.
    """
    candidates = [p for p in profiles if p["bundle_id"] == bundle_id]
    if not candidates:
        if not (allow_single and len(profiles) == 1):
            return None, None
        diag("NOTE: no profile matched %r exactly; using the only profile present (%s)"
             % (bundle_id, profiles[0]["name"]))
        candidates = list(profiles)

    required = [g for g in required_groups if g]
    if required:
        capable = [p for p in candidates if all(g in p["groups"] for g in required)]
        if not capable:
            saw = "; ".join("%s [%s]" % (p["name"] or os.path.basename(p["file"]),
                                         ", ".join(p["groups"]) or "no App Group")
                            for p in candidates)
            return None, ("no profile for %r carries %s — regenerate it with that capability. "
                          "Profiles on disk for this id: %s"
                          % (bundle_id, ", ".join(required), saw))
        candidates = capable

    candidates.sort(key=lambda p: (p["expires"] is not None, p["expires"] or 0, p["name"]), reverse=True)
    chosen = candidates[0]

    # Xcode resolves a profile by NAME. Two valid profiles sharing one name make
    # the signature a coin flip, so refuse instead of exporting a build whose
    # entitlements cannot be predicted.
    clash = [p for p in candidates[1:] if p["name"] and p["name"] == chosen["name"]]
    if clash:
        files = sorted(os.path.basename(p["file"]) for p in [chosen] + clash)
        return None, ("two profiles for %r share the name %r; Xcode picks by name, so the "
                      "signature would be a coin flip. Keep one and remove the other: %s"
                      % (bundle_id, chosen["name"], ", ".join(files)))

    return chosen, None


def build_options(app, widget, team_id, method, certificate):
    provisioning = {app["bundle_id"]: app["name"]}
    if widget:
        provisioning[widget["bundle_id"]] = widget["name"]
    return {
        "method": method,
        "teamID": team_id,
        "signingStyle": "manual",
        "signingCertificate": certificate,
        "provisioningProfiles": provisioning,
    }


def main():
    parser = argparse.ArgumentParser(description="Build export_options.plist from downloaded provisioning profiles")
    parser.add_argument("--profiles-dir", default=None, help="directory holding the downloaded profiles")
    parser.add_argument("--profile", action="append", default=[],
                        help="an individual profile file (repeatable; used instead of --profiles-dir)")
    parser.add_argument("--app-bundle-id", required=True)
    parser.add_argument("--widget-bundle-id", default="")
    parser.add_argument("--require-widget", default="false",
                        help="true when this build embeds the widget extension")
    parser.add_argument("--team-id", default="", help="defaults to the app profile's own TeamIdentifier")
    parser.add_argument("--method", default=DEFAULT_METHOD)
    parser.add_argument("--require-app-group", action="append", default=[],
                        help="an App Group every chosen profile must carry (repeatable). "
                             "A profile minted before the capability existed has the same "
                             "bundle id, so this is what rejects it.")
    parser.add_argument("--signing-certificate", default=DEFAULT_SIGNING_CERTIFICATE)
    parser.add_argument("--out", required=True, help="where to write export_options.plist")
    parser.add_argument("--report", default=None, help="machine-readable JSON report")
    args = parser.parse_args()

    report = {"ok": False, "error": None, "team_id": "", "app": None, "widget": None,
              "profiles": []}

    try:
        require_widget = parse_bool(args.require_widget, "--require-widget")
    except SystemExit as exc:
        report["error"] = str(exc)
        emit_report(report, args.report)
        diag(str(exc))
        return 1

    files = list(args.profile) or candidate_files(args.profiles_dir)
    if not files:
        report["error"] = "no provisioning profiles found in %r" % (args.profiles_dir or "")
        emit_report(report, args.report)
        diag("ERROR: " + report["error"])
        return 1

    profiles = collect(files)
    required_groups = [g for g in (args.require_app_group or []) if g]
    report["profiles"] = [{"name": p["name"], "bundle_id": p["bundle_id"],
                           "file": os.path.basename(p["file"]), "groups": p["groups"]} for p in profiles]
    for profile in profiles:
        diag("  profile: %-48s bundle=%-52s groups=%s"
             % (profile["name"] or "(unnamed)", profile["bundle_id"] or "(unknown)",
                ", ".join(profile["groups"]) or "none"))

    app, app_error = pick(profiles, args.app_bundle_id, required_groups, allow_single=True)
    if app_error:
        report["error"] = app_error
        emit_report(report, args.report)
        diag("ERROR: " + app_error)
        return 1
    if not app:
        report["error"] = ("no provisioning profile matches the app bundle id %r "
                           "(saw: %s)" % (args.app_bundle_id,
                                          ", ".join(p["bundle_id"] or "?" for p in profiles)))
        emit_report(report, args.report)
        diag("ERROR: " + report["error"])
        return 1
    report["app"] = {"name": app["name"], "bundle_id": app["bundle_id"],
                     "file": os.path.basename(app["file"]), "groups": app["groups"]}

    widget = None
    if require_widget:
        if not args.widget_bundle_id:
            report["error"] = "the widget is enabled but --widget-bundle-id is empty"
            emit_report(report, args.report)
            diag("ERROR: " + report["error"])
            return 1
        widget, widget_error = pick(profiles, args.widget_bundle_id, required_groups)
        if widget_error:
            report["error"] = widget_error
            emit_report(report, args.report)
            diag("ERROR: " + widget_error)
            return 1
        if not widget:
            report["error"] = ("the widget is enabled but no profile matches %r "
                               "(the export would fail)" % args.widget_bundle_id)
            emit_report(report, args.report)
            diag("ERROR: " + report["error"])
            return 1
        report["widget"] = {"name": widget["name"], "bundle_id": widget["bundle_id"],
                            "file": os.path.basename(widget["file"]), "groups": widget["groups"]}

    team_id = args.team_id or app["team_id"] or (widget or {}).get("team_id", "")
    if not team_id:
        report["error"] = "could not determine the team id (no --team-id and the profile has no TeamIdentifier)"
        emit_report(report, args.report)
        diag("ERROR: " + report["error"])
        return 1
    report["team_id"] = team_id

    options = build_options(app, widget, team_id, args.method, args.signing_certificate)
    with open(args.out, "wb") as fh:
        plistlib.dump(options, fh)

    report["ok"] = True
    emit_report(report, args.report)
    diag("Using provisioning profile: %s" % app["name"])
    if widget:
        diag("Widget provisioning profile: %s" % widget["name"])
    diag("OK: export options written to %s (team %s, %d bundle id(s))"
         % (args.out, team_id, len(options["provisioningProfiles"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())