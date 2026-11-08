#!/usr/bin/env python3
"""
Verify the App Clip in the BUILT archive — the two facts App Store Connect
rejected the first clip build for.

── WHY THIS READS THE ARCHIVE, NOT THE SOURCES ─────────────────────────────
`patch-ios-app-clip.py --check` proves the repository is right. This proves the
ARTIFACT is: it opens the clip bundle Xcode actually produced and the signed
parent app Xcode actually signed, so nothing between a correct source file and
the uploaded binary can quietly undo either fix.

  1. Error 90474 — the built clip's Info.plist must declare all four
     orientations. Portrait alone archives cleanly and is rejected at upload.
  2. Warning 90876 — the SIGNED parent app must carry
     `com.apple.developer.associated-appclip-app-identifiers` naming this clip,
     prefixed with the team that signed it.
  3. The App Clip experience URL check — the SIGNED parent app must declare the
     invocation domain as BOTH `applinks:` and `appclips:`. Apple requires the
     domain on the app and the clip; carried only on the clip, App Store Connect
     answers "This URL is not contained in your app's associated domains".

Every check is read from the build's own artifacts and needs no arguments
beyond the archive path: the team comes from the signature and the clip id comes
from the clip bundle, so nothing can be compared against a stale constant.

Exit code 0 = both hold. Anything else prints the reason and the fix.
"""
import argparse
import glob
import json
import os
import plistlib
import subprocess
import sys

ORIENTATIONS = [
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationPortraitUpsideDown",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
]
APPCLIP_ENTITLEMENT = "com.apple.developer.associated-appclip-app-identifiers"
ASSOCIATED_DOMAINS_KEY = "com.apple.developer.associated-domains"
APP_ENTITLEMENTS = "ios/App/App/App.entitlements"


class VerifyError(Exception):
    """A refusal with an actionable message. Never a traceback."""


def diag(message=""):
    sys.stderr.write(str(message) + "\n")
    sys.stderr.flush()


def read_plist(path):
    try:
        with open(path, "rb") as handle:
            return plistlib.load(handle)
    except (OSError, plistlib.InvalidFileException) as exc:
        raise VerifyError("could not read %s (%s)" % (path, exc))


def signed_entitlements(app_path):
    """The entitlements embedded in a SIGNED bundle, via codesign."""
    try:
        proc = subprocess.run(
            ["codesign", "--display", "--entitlements", ":-", app_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except OSError as exc:
        raise VerifyError("could not run codesign to read %s (%s)" % (app_path, exc))
    if proc.returncode != 0:
        raise VerifyError(
            "codesign could not read the entitlements of %s (%s).\n"
            "       The app in the archive is not signed, so its entitlements cannot be checked."
            % (app_path, proc.stderr.decode("utf-8", "replace").strip()))
    raw = proc.stdout
    start = raw.find(b"<?xml")
    if start < 0:
        raise VerifyError("codesign returned no entitlements for %s - the bundle carries none."
                          % app_path)
    try:
        return plistlib.loads(raw[start:])
    except plistlib.InvalidFileException as exc:
        raise VerifyError("codesign returned unreadable entitlements for %s (%s)" % (app_path, exc))


def associated_domain_hosts(entitlements):
    """{host: {service, ...}} from the SIGNED Associated Domains entitlement."""
    hosts = {}
    for value in (entitlements.get(ASSOCIATED_DOMAINS_KEY) or []):
        service, _, host = str(value).partition(":")
        if host:
            hosts.setdefault(host, set()).add(service)
    return hosts


def team_of(entitlements):
    team = entitlements.get("com.apple.developer.team-identifier") or ""
    if not team:
        app_id = (entitlements.get("application-identifier")
                  or entitlements.get("com.apple.application-identifier") or "")
        team = app_id.partition(".")[0]
    return team


def app_bundle_of(entitlements):
    app_id = (entitlements.get("application-identifier")
              or entitlements.get("com.apple.application-identifier") or "")
    return app_id.partition(".")[2]


def find_one(pattern, what):
    found = sorted(glob.glob(pattern))
    if not found:
        raise VerifyError("%s was not found (%s)" % (what, pattern))
    return found[0]


def verify(archive, entitlements_path=""):
    app = find_one(os.path.join(archive, "Products", "Applications", "*.app"),
                   "the archived app")
    clip_apps = sorted(glob.glob(os.path.join(app, "AppClips", "*.app")))
    if not clip_apps:
        raise VerifyError(
            "the archive contains no App Clip (%s/AppClips/*.app).\n"
            "       The clip target was built but not embedded in the app." % app)
    if len(clip_apps) > 1:
        raise VerifyError("the archive contains %d App Clips, but this app declares one: %s"
                          % (len(clip_apps), ", ".join(os.path.basename(c) for c in clip_apps)))
    clip = clip_apps[0]

    # ── 1. Error 90474 — all four orientations, in the BUILT plist ──────────
    # Read from the product, so a stale copy of the source file or a build
    # setting that overrides the plist cannot hide.
    clip_info = read_plist(os.path.join(clip, "Info.plist"))
    declared = [str(v) for v in (clip_info.get("UISupportedInterfaceOrientations") or [])]
    missing = [o for o in ORIENTATIONS if o not in declared]
    if missing:
        raise VerifyError(
            "the built App Clip declares only %s (App Store Connect error 90474).\n"
            "       A clip that supports iPad must declare all four orientations:\n"
            "       %s\n"
            "       Fix: ios/App/JobaClip/Info.plist must list them; "
            "scripts/patch-ios-app-clip.py --check --require reports it."
            % (", ".join(declared) or "none", ", ".join(ORIENTATIONS)))

    # The iPad key is optional (iOS falls back to the generic one), but when it
    # is present it is what Apple actually reads on an iPad - so it must agree.
    ipad = [str(v) for v in (clip_info.get("UISupportedInterfaceOrientations~ipad") or [])]
    if ipad:
        ipad_missing = [o for o in ORIENTATIONS if o not in ipad]
        if ipad_missing:
            raise VerifyError(
                "the built App Clip's UISupportedInterfaceOrientations~ipad omits %s, which "
                "iPad reads first (App Store Connect error 90474)." % ", ".join(ipad_missing))

    clip_bundle = str(clip_info.get("CFBundleIdentifier") or "")
    if "$(" in clip_bundle:
        # A build setting that reached the product unresolved: nothing downstream
        # could compare against it, so it is named here rather than reported as a
        # mismatch with the app.
        raise VerifyError(
            "the built App Clip's CFBundleIdentifier is still the build setting %r, so the "
            "bundle was not resolved at build time." % clip_bundle)

    # ── 2. Warning 90876 — the SIGNED parent app names its clip ─────────────
    entitlements = (read_plist(entitlements_path) if entitlements_path
                    else signed_entitlements(app))
    team = team_of(entitlements)
    app_bundle = app_bundle_of(entitlements)
    if not team or not clip_bundle:
        raise VerifyError(
            "could not establish the team (%r) or the clip bundle id (%r), so the parent "
            "entitlement cannot be verified." % (team, clip_bundle))
    if app_bundle and clip_bundle != app_bundle + ".Clip":
        raise VerifyError(
            "the archived clip's bundle id is %r but the signed app is %r, so the expected clip "
            "id is %r. The archive mixes two different builds." % (clip_bundle, app_bundle,
                                                                   app_bundle + ".Clip"))

    identifiers = [str(v) for v in (entitlements.get(APPCLIP_ENTITLEMENT) or [])]
    expected = "%s.%s" % (team, clip_bundle)
    if expected not in identifiers:
        raise VerifyError(
            "the signed parent app does not declare %s for this clip "
            "(App Store Connect warning 90876).\n"
            "       declared: %s\n"
            "       expected: %s\n"
            "       Fix: that key belongs in ios/App/App/App.entitlements, and the PARENT app's "
            "provisioning profile must contain it too (App Clips capability on the parent App ID, "
            "then regenerate that profile)."
            % (APPCLIP_ENTITLEMENT, identifiers or "nothing", expected))

    # ── 3. The invocation domain, on the APP as well as the clip ────────────
    # App Store Connect reads this from the SIGNED app when an App Clip
    # experience URL is entered, and answers "This URL is not contained in your
    # app's associated domains" when the app carries the domain only as
    # applinks:. Apple requires both service entries on both targets, so the
    # archive is where that has to be true — a correct source file cannot
    # rescue a binary signed without it.
    hosts = associated_domain_hosts(entitlements)
    if not hosts:
        raise VerifyError(
            "the signed parent app declares no Associated Domains at all, so the App Clip "
            "invocation domain cannot be confirmed.\n"
            "       Fix: %s must declare applinks:<domain> and appclips:<domain>."
            % APP_ENTITLEMENTS)
    for host in sorted(hosts):
        absent = [service for service in ("applinks", "appclips")
                  if service not in hosts[host]]
        if absent:
            present = sorted(hosts[host])[0]
            raise VerifyError(
                "the signed parent app declares %s:%s but not %s:%s.\n"
                "       Apple requires the App Clip invocation domain in the Associated Domains "
                "entitlement on BOTH the app and the App Clip target. Without appclips: on the "
                "app, App Store Connect refuses an App Clip experience URL with\n"
                "       \"This URL is not contained in your app's associated domains\".\n"
                "       Fix: %s must declare both applinks:%s and appclips:%s — "
                "scripts/patch-ios-app-clip.py writes them on every build."
                % (present, host, absent[0], host, APP_ENTITLEMENTS, host, host))

    return {
        "ok": True,
        "app": os.path.basename(app),
        "clip": os.path.basename(clip),
        "clip_bundle_id": clip_bundle,
        "orientations": declared,
        "orientations_ipad": ipad,
        "parent_appclip_identifiers": identifiers,
        "parent_appclip_expected": expected,
        "parent_associated_domains": sorted(
            str(v) for v in (entitlements.get(ASSOCIATED_DOMAINS_KEY) or [])),
        "parent_associated_hosts": {host: sorted(services)
                                    for host, services in hosts.items()},
        "team_id": team,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Verify the App Clip in a built .xcarchive (error 90474, warning 90876)")
    parser.add_argument("--archive", required=True, help="path to App.xcarchive")
    parser.add_argument("--entitlements", default="",
                        help="read these entitlements instead of the archive's signature (tests)")
    parser.add_argument("--report", default="", help="write the JSON report here")
    args = parser.parse_args(argv)

    try:
        report = verify(args.archive, args.entitlements)
    except VerifyError as exc:
        diag("ERROR: %s" % exc)
        if args.report:
            with open(args.report, "w", encoding="utf-8") as handle:
                json.dump({"ok": False, "error": str(exc)}, handle, indent=2, ensure_ascii=False)
        return 1

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)
    diag("OK: clip %s declares all four orientations (90474)" % report["clip_bundle_id"])
    diag("OK: parent app declares %s (90876)" % report["parent_appclip_expected"])
    diag("OK: parent app declares applinks + appclips for %s"
         % ", ".join(sorted(report["parent_associated_hosts"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())