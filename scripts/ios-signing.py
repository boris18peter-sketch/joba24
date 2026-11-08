#!/usr/bin/env python3
"""
ios-signing.py — ONE source of truth for which provisioning profile signs what.

    python3 scripts/ios-signing.py select \
        --profiles-dir "$HOME/Library/MobileDevice/Provisioning Profiles" \
        --app-bundle-id "$BUNDLE_ID" \
        --widget-bundle-id "$WIDGET_BUNDLE_ID" \
        --require-widget "${ENABLE_LIVE_ACTIVITY_WIDGET:-false}" \
        --app-group "group.$BUNDLE_ID" \
        --report "$CM_BUILD_DIR/signing-report.json"

    python3 scripts/ios-signing.py export-options \
        --selection "$CM_BUILD_DIR/signing-report.json" \
        --out "$CM_BUILD_DIR/export_options.plist"

    python3 scripts/ios-signing.py verify-ipa \
        --selection "$CM_BUILD_DIR/signing-report.json" \
        --ipa "$CM_BUILD_DIR/build/ios/ipa/App.ipa"

── THE PROBLEM THIS SOLVES ──────────────────────────────────────────────────
App Store Connect accumulates profiles for one bundle id: every `fetch-signing-
files --create` can mint another, and older ones go "Invalid" (their certificate
was revoked, or the App ID lost a capability). All of them report the SAME bundle
id, and Xcode resolves a profile BY NAME — so a pipeline that matches on the
bundle id, or that lets Xcode see the whole directory, has a genuine coin flip:

  * `xcode-project use-profiles` writes whichever candidate it found first as
    PROVISIONING_PROFILE_SPECIFIER;
  * an export step that scans the directory again can pick a DIFFERENT one, so
    the archive and the .ipa are signed with different profiles;
  * a profile can be "Invalid" and still carry a future expiration date, which is
    why expiry alone is not a validity test;
  * two downloads of the SAME profile (identical UUID) look exactly like "two
    profiles with the same name" and were reported as an unresolvable clash.

── THE CONTRACT ────────────────────────────────────────────────────────────
`select` is the only place a profile is chosen. It:

  1. decodes EVERY .mobileprovision (UUID, name, bundle id, team, creation and
     expiration date, entitlements, App Groups, device lists, certificates);
  2. deduplicates identical copies by UUID;
  3. rejects expired / development / ad hoc / enterprise / wildcard / wrong-team
     / missing-App-Group profiles, and any profile whose certificate is not a
     valid DISTRIBUTION code-signing identity in this build's keychain — a
     verifiable local check that catches the usual cause of "Invalid" in the
     portal;
  4. requires the selected profile to carry the App Group the app signs with;
  5. chooses ONE profile per bundle id deterministically (never by file name);
  6. refuses — with an actionable message — when two DIFFERENT profiles share a
     name, because Xcode cannot tell them apart;
  7. moves every other profile for these bundle ids out of the directory Xcode
     reads, so the archive can only see the selected one. Nothing is deleted:
     the files are moved to a quarantine folder and named in the report.
     NO Apple Developer profile is deleted, revoked or modified — ever.

`export-options` and `verify-ipa` do not scan anything: they read that same
report, so the archive, the IPA export and the verification can never disagree.
`verify-ipa` then proves it from the finished .ipa, where each embedded
profile's UUID is compared with the selection.

── OUTPUT CONTRACT (learned from a real CI failure) ──────────────────────────
The report is machine data and goes ONLY to --report / --selection. Every human
line goes to stderr. Nothing is ever written to stdout, so a consumer can never
receive "a JSON document followed by a sentence".
"""

import argparse
import datetime
import hashlib
import json
import os
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

DEFAULT_METHOD = "app-store-connect"
DEFAULT_SIGNING_CERTIFICATE = "Apple Distribution"

# ── Why a profile was rejected, in words an operator can act on ──────────────
REASON_TEXT = {
    "no_uuid": "it carries no UUID, so it cannot be identified",
    "bundle_id_mismatch": "its application-identifier is for a different bundle id",
    "wildcard_bundle_id": "it is a WILDCARD profile; a wildcard cannot carry this app's "
                          "entitlements and cannot sign an App Store build of a specific bundle id",
    "no_expiration_date": "it states no expiration date, so it cannot be verified",
    "expired": "it has EXPIRED",
    "development_profile": "it is a DEVELOPMENT profile (get-task-allow is true)",
    "enterprise_profile": "it is an ENTERPRISE / in-house profile (ProvisionsAllDevices)",
    "device_registered_profile": "it is an AD HOC / development profile (it lists registered devices)",
    "wrong_platform": "it is not an iOS profile",
    "no_team": "it names no TeamIdentifier",
    "team_mismatch": "its team does not match the signing certificate's team",
    "no_developer_certificate": "it names no developer certificate, so nothing can sign with it",
    "certificate_not_installed": "its certificate is not a valid code signing identity in this "
                                 "build's keychain (revoked, expired, or never fetched) — Xcode "
                                 "could not sign with it",
    "certificate_not_distribution": "its certificate is not a Distribution certificate",
}
REASON_PREFIX_TEXT = {
    "missing_app_group:": "it does not carry the required App Group",
    "missing_appclip_entitlement:":
        "its profile does not carry the App Clip identifier the app declares "
        "(enable App Clips on the parent App ID, then regenerate this profile):",
}


class SigningError(Exception):
    """A refusal with an actionable message. Never a traceback."""


def diag(message=""):
    """Human output. stdout is reserved for machine data, so this is stderr."""
    sys.stderr.write(str(message) + "\n")
    sys.stderr.flush()


def explain(reason):
    if reason in REASON_TEXT:
        return REASON_TEXT[reason]
    for prefix, text in REASON_PREFIX_TEXT.items():
        if reason.startswith(prefix):
            return "%s %s" % (text, reason[len(prefix):])
    return reason


# ══════════════════════════════════════════════════════════════════════════════
# Decoding
# ══════════════════════════════════════════════════════════════════════════════
def _looks_like_plist(raw):
    head = raw.lstrip()[:6]
    return raw.startswith(b"bplist00") or head.startswith(b"<?xml") or head.startswith(b"<plist")


def decode_bytes(raw):
    """The profile dict from raw .mobileprovision bytes.

    A downloaded profile is a CMS envelope that only macOS can unwrap; a decoded
    fixture (as the tests use) is already a plist. Both arrive here."""
    if _looks_like_plist(raw):
        return plistlib.loads(raw)
    with tempfile.NamedTemporaryFile(suffix=".mobileprovision", delete=False) as fh:
        fh.write(raw)
        tmp = fh.name
    try:
        out = subprocess.run(["security", "cms", "-D", "-i", tmp], check=True,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise SigningError("could not decode a provisioning profile (%s)" % exc)
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass
    return plistlib.loads(out.stdout)


def decode_file(path):
    with open(path, "rb") as fh:
        return decode_bytes(fh.read())


def _sha1_der(der):
    return hashlib.sha1(der).hexdigest().upper()


def _iso(value):
    if isinstance(value, datetime.datetime):
        return value.isoformat()
    return value or None


def describe(info, path="", size=0):
    """Every verifiable fact about one profile. Nothing is inferred from its name."""
    ent = info.get("Entitlements") or {}
    app_id = ent.get("application-identifier") or ent.get("com.apple.application-identifier") or ""
    prefix, _, bundle = app_id.partition(".")
    certs = [_sha1_der(c) for c in (info.get("DeveloperCertificates") or [])
             if isinstance(c, (bytes, bytearray))]
    platforms = [str(p) for p in (info.get("Platform") or [])]
    return {
        "file": os.path.basename(path),
        "path": path,
        "size": size,
        "uuid": str(info.get("UUID") or ""),
        "name": str(info.get("Name") or ""),
        "bundle_id": bundle,
        "app_identifier": app_id,
        "team_id": str((info.get("TeamIdentifier") or [""])[0] or ""),
        "team_from_identifier": prefix,
        "created": _iso(info.get("CreationDate")),
        "expires": _iso(info.get("ExpirationDate")),
        "groups": [str(g) for g in (ent.get("com.apple.security.application-groups") or [])],
        # The App Clip ids the PARENT app is allowed to contain. Present only
        # once the App Clips capability is on the parent App ID — an older
        # profile simply has none, which is what the clip build checks for.
        "appclip_identifiers": [
            str(v) for v in (ent.get("com.apple.developer.associated-appclip-app-identifiers") or [])
        ],
        "get_task_allow": ent.get("get-task-allow") is True,
        "beta_reports_active": ent.get("beta-reports-active") is True,
        "aps_environment": str(ent.get("aps-environment") or ""),
        "all_devices": info.get("ProvisionsAllDevices") is True,
        "device_count": len(info.get("ProvisionedDevices") or []),
        "platform": platforms,
        "certificates": certs,
        "entitlements": {str(k): str(v) for k, v in sorted(ent.items())},
        # Parsed dates for comparison only; not serialized as objects.
        "_expires": info.get("ExpirationDate"),
        "_created": info.get("CreationDate"),
    }


def public(profile):
    """The profile dict without the non-JSON parse-time fields."""
    return {k: v for k, v in profile.items() if not k.startswith("_")}


def candidate_files(profiles_dir):
    """Top-level .mobileprovision files only — never the quarantine subfolder."""
    if not profiles_dir or not os.path.isdir(profiles_dir):
        return []
    return sorted(os.path.join(profiles_dir, name) for name in os.listdir(profiles_dir)
                  if name.endswith(".mobileprovision")
                  and os.path.isfile(os.path.join(profiles_dir, name)))


def load_all(profiles_dir):
    """(profiles, unreadable) — every profile in the directory, decoded."""
    profiles, unreadable = [], []
    for path in candidate_files(profiles_dir):
        try:
            profiles.append(describe(decode_file(path), path, os.path.getsize(path)))
        except Exception as exc:  # noqa: BLE001 - one bad file must not hide the rest
            unreadable.append({"file": os.path.basename(path), "error": str(exc)})
    return profiles, unreadable


# ══════════════════════════════════════════════════════════════════════════════
# Deduplication and validity
# ══════════════════════════════════════════════════════════════════════════════
def dedupe(profiles):
    """One entry per UUID; later copies are reported, never silently dropped.

    Two files holding the SAME profile are one profile. Treating them as two was
    what made the widget step report "two profiles share the name" for a single
    profile that had simply been downloaded twice."""
    by_uuid, duplicates = {}, []
    for profile in profiles:
        uuid = profile["uuid"]
        if uuid and uuid in by_uuid:
            duplicates.append({"uuid": uuid, "name": profile["name"],
                               "file": profile["file"],
                               "identical_to": by_uuid[uuid]["file"],
                               "same_bytes": profile["size"] == by_uuid[uuid]["size"]})
            continue
        if uuid:
            by_uuid[uuid] = profile
        else:
            # No UUID: keep it so it is reported as unusable rather than vanishing.
            by_uuid["__no_uuid__%s" % profile["file"]] = profile
    # Deterministic order, independent of the order files were listed in.
    return sorted(by_uuid.values(), key=lambda p: (p["uuid"], p["file"])), duplicates


def wildcard_matches(pattern, bundle_id):
    """Does a wildcard pattern cover this bundle id? (`com.x.*` covers `com.x.app`)"""
    if "*" not in (pattern or ""):
        return False
    prefix = pattern.split("*")[0].rstrip(".")
    if not prefix:
        return True  # a bare "*" matches everything
    return bundle_id == prefix or bundle_id.startswith(prefix + ".")


def evaluate(profile, bundle_id, identities, require_groups, expected_team, now,
             require_appclip=""):
    """Every reason this profile cannot sign `bundle_id`. Empty list = compatible."""
    reasons = []
    if not profile["uuid"]:
        reasons.append("no_uuid")

    if "*" in profile["bundle_id"]:
        if wildcard_matches(profile["bundle_id"], bundle_id):
            reasons.append("wildcard_bundle_id")
        else:
            reasons.append("bundle_id_mismatch")
    elif profile["bundle_id"] != bundle_id:
        reasons.append("bundle_id_mismatch")

    expires = profile["_expires"]
    if not isinstance(expires, datetime.datetime):
        reasons.append("no_expiration_date")
    elif expires <= now:
        reasons.append("expired")

    if profile["get_task_allow"]:
        reasons.append("development_profile")
    if profile["all_devices"]:
        reasons.append("enterprise_profile")
    if profile["device_count"]:
        reasons.append("device_registered_profile")
    if profile["platform"] and "iOS" not in profile["platform"]:
        reasons.append("wrong_platform")

    team = profile["team_id"]
    if not team:
        reasons.append("no_team")
    elif profile["team_from_identifier"] and profile["team_from_identifier"] != team:
        reasons.append("team_mismatch")
    elif expected_team and team != expected_team:
        reasons.append("team_mismatch")

    for group in require_groups:
        if group and group not in profile["groups"]:
            reasons.append("missing_app_group:%s" % group)

    # ── THE CLIP'S PARENT ENTITLEMENT IS A PROFILE REQUIREMENT TOO ───────────
    # Warning 90876 is only resolved when the app's PROFILE carries the same
    # identifier: entitlements and profile must agree, or signing fails. Checked
    # here so the build stops BEFORE archiving, with a message naming the
    # capability to enable rather than an opaque codesign error at upload.
    if require_appclip:
        expected = "%s.%s" % (profile["team_id"], require_appclip)
        if expected not in profile["appclip_identifiers"]:
            reasons.append("missing_appclip_entitlement:%s" % expected)

    if not profile["certificates"]:
        reasons.append("no_developer_certificate")
    else:
        matched = [i for i in identities if i["sha1"] in profile["certificates"]]
        if not matched:
            reasons.append("certificate_not_installed")
        elif not any(i["distribution"] for i in matched):
            reasons.append("certificate_not_distribution")

    return reasons


def matching_identity(profile, identities):
    for identity in identities:
        if identity["sha1"] in profile["certificates"]:
            return identity
    return None


def choose(profiles, bundle_id, identities, require_groups, expected_team, now,
           require_appclip=""):
    """(chosen, evaluated) for one bundle id. Raises when nothing is usable.

    `evaluated` is [(profile, reasons)] for every candidate for THIS bundle id,
    so the failure message — and the report — can say exactly why each one lost.
    """
    considered = [p for p in profiles
                  if p["bundle_id"] == bundle_id or wildcard_matches(p["bundle_id"], bundle_id)]
    evaluated = [(p, evaluate(p, bundle_id, identities, require_groups, expected_team, now,
                              require_appclip))
                 for p in considered]
    usable = [p for p, reasons in evaluated if not reasons]

    if not usable:
        if not considered:
            raise SigningError(
                "no provisioning profile on disk is for %r. Downloaded: %s.\n"
                "Fix: run `app-store-connect fetch-signing-files %s --type IOS_APP_STORE` "
                "once for this bundle id, then rebuild."
                % (bundle_id,
                   ", ".join(sorted(p["bundle_id"] or "(unknown)" for p in profiles)) or "none",
                   bundle_id))
        lines = ["no usable provisioning profile for %r. Every candidate was rejected:" % bundle_id]
        for profile, reasons in evaluated:
            lines.append("  - %s  UUID %s  expires %s" % (
                profile["name"] or profile["file"], profile["uuid"] or "(none)",
                (profile["expires"] or "(none)")[:10]))
            for reason in reasons:
                # The code first (grep-able, stable) then the plain-English reason.
                lines.append("      × %s — %s" % (reason, explain(reason)))
        lines.append("Fix, by hand in Apple Developer (this script never deletes or revokes "
                     "anything): remove the stale profiles for this bundle id, or create ONE "
                     "App Store profile for it with the distribution certificate Codemagic "
                     "downloaded, then rebuild.")
        raise SigningError("\n".join(lines))

    # Two DIFFERENT profiles that present the same name cannot be told apart by
    # Xcode, which resolves profiles by name. Refuse instead of guessing.
    by_name = {}
    for profile in usable:
        by_name.setdefault(profile["name"], []).append(profile)
    clashes = {name: group for name, group in by_name.items() if len(group) > 1}
    if clashes:
        lines = ["two different profiles for %r share one name, and Xcode picks by NAME, "
                 "so the signature would be a coin flip:" % bundle_id]
        for name, group in sorted(clashes.items()):
            lines.append("  name: %r" % (name or "(unnamed)"))
            for profile in group:
                identity = matching_identity(profile, identities)
                lines.append("    - UUID %s  file %s  groups %s  cert %s" % (
                    profile["uuid"], profile["file"],
                    ", ".join(profile["groups"]) or "none",
                    (identity or {}).get("name") or "unmatched"))
        lines.append("Fix, by hand in Apple Developer: keep ONE of them (or rename one) so the "
                     "name is unique, then rebuild.")
        raise SigningError("\n".join(lines))

    def rank(profile):
        expires = profile["_expires"] if isinstance(profile["_expires"], datetime.datetime) else datetime.datetime.min
        created = profile["_created"] if isinstance(profile["_created"], datetime.datetime) else datetime.datetime.min
        # Newest expiry first, then newest creation, then UUID — never the file
        # name, so the same directory always yields the same choice.
        return (expires, created, profile["uuid"])

    return sorted(usable, key=rank, reverse=True)[0], evaluated


# ══════════════════════════════════════════════════════════════════════════════
# Signing identities (the certificate half of the check)
# ══════════════════════════════════════════════════════════════════════════════
IDENTITY_LINE = re.compile(r'^\s*\d+\)\s+([0-9A-Fa-f]{40})\s+"(.+)"\s*$')
IDENTITY_TEAM = re.compile(r'\(([A-Z0-9]{10})\)\s*$')


def parse_identities(text):
    """`security find-identity -v -p codesigning` → [{sha1, name, team_id, distribution}]."""
    identities = []
    for line in (text or "").splitlines():
        match = IDENTITY_LINE.match(line)
        if not match:
            continue
        sha1, name = match.group(1).upper(), match.group(2)
        team_match = IDENTITY_TEAM.search(name)
        identities.append({
            "sha1": sha1,
            "name": name,
            "team_id": team_match.group(1) if team_match else "",
            "distribution": "Distribution" in name,
        })
    return identities


def load_identities():
    try:
        proc = subprocess.run(["security", "find-identity", "-v", "-p", "codesigning"],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except OSError as exc:
        raise SigningError("could not run `security find-identity` to verify the signing "
                           "certificate (%s)" % exc)
    if proc.returncode != 0:
        raise SigningError("could not list code signing identities: %s"
                           % proc.stderr.decode("utf-8", "replace").strip())
    identities = parse_identities(proc.stdout.decode("utf-8", "replace"))
    if not identities:
        raise SigningError(
            "no code signing identity is installed in this build's keychain, so no profile's "
            "certificate can be verified.\n"
            "Fix: the `keychain add-certificates` step must run before this one "
            "(see the `Set up signing certificate` step).")
    return identities


# ══════════════════════════════════════════════════════════════════════════════
# Quarantine — the only selected profiles may remain visible to Xcode
# ══════════════════════════════════════════════════════════════════════════════
def quarantine(profiles_dir, keep_paths, owned_bundle_ids, destination_root):
    """Move every other profile for OUR bundle ids out of Xcode's directory.

    This is what makes "the archive used the selected profile" a structural fact
    instead of a hope: after this, the only profiles on disk for these bundle ids
    are the selected ones. Nothing is deleted — files are moved, and the report
    names each one and where it went."""
    keep = {os.path.abspath(p) for p in keep_paths if p}
    if not profiles_dir or not os.path.isdir(profiles_dir):
        return {"moved": [], "destination": "", "kept": sorted(os.path.basename(p) for p in keep)}
    stamp = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    destination = os.path.join(destination_root or os.path.join(profiles_dir, "..", "Superseded Profiles"), stamp)
    moved, failed = [], []
    for path in candidate_files(profiles_dir):
        if os.path.abspath(path) in keep:
            continue
        try:
            profile = describe(decode_file(path), path)
        except Exception:  # noqa: BLE001 - unreadable files are reported upstream
            continue
        owns = profile["bundle_id"] in owned_bundle_ids or any(
            wildcard_matches(profile["bundle_id"], bid) for bid in owned_bundle_ids)
        if not owns:
            continue
        try:
            os.makedirs(destination, exist_ok=True)
            target = os.path.join(destination, os.path.basename(path))
            shutil.move(path, target)
            moved.append({"file": os.path.basename(path), "uuid": profile["uuid"],
                          "name": profile["name"], "moved_to": target})
        except OSError as exc:
            failed.append({"file": os.path.basename(path), "error": str(exc)})
    if failed:
        raise SigningError(
            "could not move superseded profiles out of Xcode's profiles directory, so the "
            "archive could still pick one of them:\n"
            + "\n".join("  - %s: %s" % (f["file"], f["error"]) for f in failed))
    return {"moved": moved, "destination": destination if moved else "",
            "kept": sorted(os.path.basename(p) for p in keep)}


# ══════════════════════════════════════════════════════════════════════════════
# Report / selection
# ══════════════════════════════════════════════════════════════════════════════
def write_json(payload, path):
    if not path:
        return
    directory = os.path.dirname(os.path.abspath(path))
    if directory and not os.path.isdir(directory):
        os.makedirs(directory, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False, default=str)
        fh.write("\n")
    os.replace(tmp, path)


def read_selection(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            report = json.load(fh)
    except OSError as exc:
        raise SigningError("could not read the signing report %r (%s)" % (path, exc))
    except ValueError as exc:
        raise SigningError("the signing report %r is not valid JSON (%s)" % (path, exc))
    if not report.get("ok"):
        raise SigningError("the signing report %r is not ok: %s"
                           % (path, report.get("error") or "unknown"))
    if not report.get("targets"):
        raise SigningError("the signing report %r contains no selected profile" % path)
    return report


def selected_target(report, role):
    for bundle_id, target in (report.get("targets") or {}).items():
        if target.get("role") == role:
            return bundle_id, target
    return None, None


# ══════════════════════════════════════════════════════════════════════════════
# Subcommands
# ══════════════════════════════════════════════════════════════════════════════
def parse_bool(raw, name):
    value = (raw or "").strip().lower()
    if value in ("", "false"):
        return False
    if value == "true":
        return True
    raise SigningError("%s must be true or false, got %r" % (name, raw))


def cmd_select(args):
    now = datetime.datetime.utcnow()
    require_widget = parse_bool(args.require_widget, "--require-widget")
    require_clip = parse_bool(args.require_clip, "--require-clip")
    require_appclip = parse_bool(args.require_appclip, "--require-appclip")
    app_group = [g for g in (args.app_group or []) if g]

    profiles_dir = os.path.expanduser(args.profiles_dir or "")
    if not candidate_files(profiles_dir):
        raise SigningError("no provisioning profiles found in %r — the fetch step must run first"
                           % (profiles_dir or ""))

    identities = ([{"sha1": i["sha1"].upper(), "name": i.get("name", ""),
                    "team_id": i.get("team_id", ""),
                    "distribution": i.get("distribution", "Distribution" in i.get("name", ""))}
                   for i in json.load(open(args.identities_json, encoding="utf-8"))]
                  if args.identities_json else load_identities())

    expected_team = args.team_id or next(
        (i["team_id"] for i in identities if i["distribution"] and i["team_id"]), "")

    raw_profiles, unreadable = load_all(profiles_dir)
    profiles, duplicates = dedupe(raw_profiles)

    diag("=== Provisioning profiles on disk (decoded, %d file(s) → %d unique) ==="
         % (len(raw_profiles), len(profiles)))
    for profile in profiles:
        identity = matching_identity(profile, identities)
        diag("  UUID %s" % (profile["uuid"] or "(none)"))
        diag("    name      %s" % (profile["name"] or "(unnamed)"))
        diag("    bundle    %s   team %s" % (profile["bundle_id"] or "(unknown)",
                                             profile["team_id"] or "(none)"))
        diag("    dates     created %s   expires %s"
             % ((profile["created"] or "(none)")[:19], (profile["expires"] or "(none)")[:19]))
        diag("    groups    %s" % (", ".join(profile["groups"]) or "none"))
        if profile["appclip_identifiers"]:
            diag("    appclip   %s" % ", ".join(profile["appclip_identifiers"]))
        diag("    flags     %s" % (", ".join(filter(None, [
            "dev(get-task-allow)" if profile["get_task_allow"] else "",
            "all-devices" if profile["all_devices"] else "",
            "%d device(s)" % profile["device_count"] if profile["device_count"] else "",
            "beta-reports-active" if profile["beta_reports_active"] else "",
            "aps:%s" % profile["aps_environment"] if profile["aps_environment"] else "",
        ])) or "app-store distribution"))
        diag("    certs     %s" % (", ".join(
            "%s%s" % (c[:12] + "…",
                      " (%s)" % identity["name"] if identity and identity["sha1"] == c else " (not installed)")
            for c in profile["certificates"]) or "none"))
        diag("    file      %s" % profile["file"])
    for duplicate in duplicates:
        diag("  = duplicate copy of UUID %s ignored: %s (same profile as %s%s)"
             % (duplicate["uuid"], duplicate["file"], duplicate["identical_to"],
                "" if duplicate["same_bytes"] else ", but the files differ in size"))
    for bad in unreadable:
        diag("  ! unreadable profile %s (%s)" % (bad["file"], bad["error"]))

    wanted = [("app", args.app_bundle_id)]
    if require_widget:
        if not args.widget_bundle_id:
            raise SigningError("the widget is enabled but --widget-bundle-id is empty")
        wanted.append(("widget", args.widget_bundle_id))
    if require_clip:
        if not args.clip_bundle_id:
            raise SigningError("the App Clip is enabled but --clip-bundle-id is empty")
        wanted.append(("clip", args.clip_bundle_id))

    # ── THE APP GROUP IS AN APP/WIDGET REQUIREMENT, NOT A CLIP ONE ──────────
    # The app and its widget share the App Group on purpose (that is how the
    # widget reads its auth). A clip shares no container with the app unless it
    # asks to, so demanding the group of the clip's profile would reject the
    # only profile Apple can legally issue for it — and fail the whole build
    # over a group nothing needs.
    role_groups = {"app": app_group, "widget": app_group, "clip": []}

    # ── THE PARENT APP MUST NAME ITS CLIP IN ITS PROFILE, NOT ONLY IN ITS
    #    ENTITLEMENTS ─────────────────────────────────────────────────────────
    # That is the half of warning 90876 the signature enforces: the app's
    # entitlements and its profile must carry the same identifier. Only the APP
    # role is held to it — the clip's own profile legitimately has no such key.
    if require_appclip and not args.clip_bundle_id:
        raise SigningError("the App Clip parent entitlement is required but --clip-bundle-id is empty")
    appclip_for_role = {"app": args.clip_bundle_id if require_appclip else ""}

    targets, rejected, notes = {}, {}, []
    for role, bundle_id in wanted:
        chosen, evaluated = choose(profiles, bundle_id, identities, role_groups[role],
                                   expected_team, now,
                                   require_appclip=appclip_for_role.get(role, ""))
        identity = matching_identity(chosen, identities)
        targets[bundle_id] = {
            "role": role,
            "uuid": chosen["uuid"],
            "name": chosen["name"],
            "file": chosen["file"],
            "path": chosen["path"],
            "bundle_id": chosen["bundle_id"],
            "team_id": chosen["team_id"],
            "expires": chosen["expires"],
            "created": chosen["created"],
            "groups": chosen["groups"],
            "certificate": ({"sha1": identity["sha1"], "name": identity["name"]}
                            if identity else None),
            "entitlements": chosen["entitlements"],
        }
        rejected[bundle_id] = [
            {"uuid": p["uuid"], "name": p["name"], "file": p["file"],
             "expires": p["expires"], "groups": p["groups"],
             "reasons": [explain(r) for r in reasons], "codes": reasons}
            for p, reasons in evaluated if p["uuid"] != chosen["uuid"]]
        skipped = len(rejected[bundle_id])
        if skipped:
            notes.append("%s: %d other profile(s) for this bundle id were rejected"
                         % (bundle_id, skipped))

    # Xcode resolves profiles by name for BOTH targets. Two selected profiles that
    # share a name are indistinguishable, so stop rather than hand it a coin flip.
    names = {}
    for bundle_id, target in targets.items():
        names.setdefault(target["name"], []).append(bundle_id)
    for name, bundle_ids in names.items():
        if len(bundle_ids) > 1:
            raise SigningError(
                "the selected app and widget profiles share the name %r (%s); Xcode resolves a "
                "profile by NAME, so it could sign one target with the other's profile.\n"
                "Fix, by hand in Apple Developer: give one of them a distinct name "
                "(or keep only one profile per name), then rebuild." % (name, ", ".join(bundle_ids)))

    guard = quarantine(profiles_dir, [t["path"] for t in targets.values()],
                       set(wanted_bundle_ids(wanted)), args.quarantine_dir)
    for target in targets.values():
        # The selected file must still be exactly where Xcode will look.
        if not os.path.exists(target["path"]):
            raise SigningError("the selected profile %s disappeared from %r"
                               % (target["file"], profiles_dir))

    report = {
        "ok": True,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "profiles_dir": profiles_dir,
        "team_id": expected_team,
        "method": args.method,
        "signing_certificate": args.signing_certificate,
        "targets": targets,
        "rejected": rejected,
        "identities": identities,
        "audit": {
            "files": len(raw_profiles),
            "unique": len(profiles),
            "profiles": [public(p) for p in profiles],
            "duplicates": duplicates,
            "unreadable": unreadable,
            "quarantine": guard,
        },
        "notes": notes,
    }
    write_json(report, args.report)

    for bundle_id, target in targets.items():
        diag("SELECTED %-6s %s" % (target["role"], bundle_id))
        diag("         name   %s" % target["name"])
        diag("         uuid   %s" % target["uuid"])
        diag("         expires %s   groups %s"
             % ((target["expires"] or "(none)")[:19], ", ".join(target["groups"]) or "none"))
        diag("         cert   %s" % ((target["certificate"] or {}).get("name") or "(unverified)"))
    if guard["moved"]:
        diag("Moved %d superseded profile(s) out of Xcode's directory → %s"
             % (len(guard["moved"]), guard["destination"]))
        for item in guard["moved"]:
            diag("  - %s  UUID %s" % (item["file"], item["uuid"]))
    diag("OK: %d bundle id(s) have exactly one verified profile; nothing was deleted or revoked"
         % len(targets))
    return 0


def wanted_bundle_ids(wanted):
    return [bundle_id for _, bundle_id in wanted]


def cmd_export_options(args):
    report = read_selection(args.selection)
    provisioning = {}
    for bundle_id, target in report["targets"].items():
        if not target.get("name"):
            raise SigningError("the signing report names no profile for %r" % bundle_id)
        provisioning[bundle_id] = target["name"]
    if len(set(provisioning.values())) != len(provisioning):
        raise SigningError("the signing report maps two bundle ids to one profile name, which "
                           "Xcode cannot resolve: %s" % json.dumps(provisioning))
    options = {
        "method": args.method or report.get("method") or DEFAULT_METHOD,
        "teamID": report.get("team_id") or "",
        "signingStyle": "manual",
        "signingCertificate": args.signing_certificate or report.get("signing_certificate")
        or DEFAULT_SIGNING_CERTIFICATE,
        "provisioningProfiles": provisioning,
    }
    if not options["teamID"]:
        raise SigningError("the signing report has no team id")
    with open(args.out, "wb") as fh:
        plistlib.dump(options, fh)
    if args.report:
        write_json({"ok": True, "out": os.path.abspath(args.out), "options": options}, args.report)
    for bundle_id, name in provisioning.items():
        target = report["targets"][bundle_id]
        diag("export profile: %s → %s (UUID %s)" % (bundle_id, name, target["uuid"]))
    diag("OK: export options written to %s (team %s, %d bundle id(s))"
         % (args.out, options["teamID"], len(provisioning)))
    return 0


def embedded_profiles(ipa_path):
    """[(entry name, profile dict)] for every embedded.mobileprovision in the .ipa."""
    if not os.path.isfile(ipa_path):
        raise SigningError("no .ipa at %r, so the signature cannot be verified" % ipa_path)
    found = []
    with zipfile.ZipFile(ipa_path) as archive:
        for name in archive.namelist():
            if not name.endswith("embedded.mobileprovision"):
                continue
            try:
                info = decode_bytes(archive.read(name))
            except SigningError as exc:
                raise SigningError("could not decode %s from the .ipa (%s)" % (name, exc))
            found.append((name, describe(info, name)))
    return found


def cmd_verify_ipa(args):
    report = read_selection(args.selection)
    app_bundle_id, app_target = selected_target(report, "app")
    widget_bundle_id, widget_target = selected_target(report, "widget")
    clip_bundle_id, clip_target = selected_target(report, "clip")
    entries = embedded_profiles(args.ipa)
    if not entries:
        raise SigningError("the .ipa embeds no provisioning profile — it is not a signed build")

    seen = {}
    for name, profile in entries:
        # ── A CLIP SITS ONE LEVEL DEEPER THAN AN EXTENSION ──────────────────
        # An App Clip is embedded at App.app/AppClips/<Clip>.app, so its path
        # has one more component than the app's own profile. Without this branch
        # it fell through to "other" — where every profile for a child of the
        # app's bundle id is reported as an unselected profile, i.e. the clip
        # would have looked like a signature nobody chose.
        if "/AppClips/" in name:
            role = "clip"
        elif ".appex/" in name:
            role = "widget"
        elif name.count("/") == 2:
            role = "app"
        else:
            role = "other"
        seen.setdefault(role, []).append((name, profile))

    labels = {"app": "app", "widget": "widget", "clip": "App Clip"}
    failures = []
    for role, expected_bundle, target in (("app", app_bundle_id, app_target),
                                          ("widget", widget_bundle_id, widget_target),
                                          ("clip", clip_bundle_id, clip_target)):
        found = seen.get(role) or []
        if target is None:
            if found:
                failures.append("the .ipa embeds an %s profile but the %s was not part of this "
                                "build: %s" % (labels[role], labels[role],
                                               ", ".join(n for n, _ in found)))
            continue
        if not found:
            failures.append("no %s provisioning profile is embedded in the .ipa "
                            "(expected UUID %s)" % (labels[role], target["uuid"]))
            continue
        for name, profile in found:
            if profile["bundle_id"] != expected_bundle:
                failures.append("%s embeds a profile for %r, expected %r"
                                % (name, profile["bundle_id"], expected_bundle))
                continue
            if profile["uuid"] != target["uuid"]:
                failures.append(
                    "%s was signed with UUID %s (%s) but %s was selected — the archive and the "
                    "export did not use the same profile"
                    % (name, profile["uuid"] or "(none)", profile["name"], target["uuid"]))
                continue
            for group in (target.get("groups") or []):
                if group not in profile["groups"]:
                    failures.append("%s (UUID %s) does not carry the App Group %s"
                                    % (name, profile["uuid"], group))
            diag("verified %s: UUID %s, bundle %s, groups %s"
                 % (role, profile["uuid"], profile["bundle_id"],
                    ", ".join(profile["groups"]) or "none"))

    # Any EXTRA profile for this app's bundle ids that is not the selected one is
    # a red flag: it means the archive embedded something we did not choose.
    # (A profile for an unrelated bundle id is not this build's business.)
    for role, found in seen.items():
        if role != "other":
            continue
        for name, profile in found:
            bundle = profile["bundle_id"] or ""
            if bundle == app_bundle_id or (app_bundle_id and bundle.startswith(app_bundle_id + ".")):
                failures.append("%s embeds an unselected profile for %r (UUID %s)"
                                % (name, bundle, profile["uuid"] or "(none)"))

    if failures:
        raise SigningError("the exported .ipa does not match the selected profiles:\n"
                           + "\n".join("  - %s" % f for f in failures))

    diag("OK: the .ipa embeds exactly the selected profile UUID(s) — archive and export agree")
    return 0


# ══════════════════════════════════════════════════════════════════════════════
def build_parser():
    parser = argparse.ArgumentParser(
        description="Audit, verify and select the iOS provisioning profiles for this build")
    subparsers = parser.add_subparsers(dest="command", required=True)

    select = subparsers.add_parser("select", help="audit + dedupe + verify + choose one profile per bundle id")
    select.add_argument("--profiles-dir", default="",
                        help="directory holding the downloaded profiles")
    select.add_argument("--app-bundle-id", required=True)
    select.add_argument("--widget-bundle-id", default="")
    select.add_argument("--require-widget", default="false",
                        help="true when this build embeds the widget extension")
    select.add_argument("--clip-bundle-id", default="",
                        help="the App Clip's bundle id (the app's id plus .Clip)")
    select.add_argument("--require-clip", default="false",
                        help="true when this build embeds the App Clip")
    select.add_argument("--require-appclip", default="false",
                        help="true when the APP profile must carry the App Clip identifier "
                             "(warning 90876); uses --clip-bundle-id")
    select.add_argument("--app-group", action="append", default=[],
                        help="an App Group the selected profiles must carry (repeatable)")
    select.add_argument("--team-id", default="",
                        help="defaults to the team of the installed distribution certificate")
    select.add_argument("--identities-json", default="",
                        help="verify against this identity list instead of the keychain (tests)")
    select.add_argument("--quarantine-dir", default="",
                        help="where superseded profiles are moved (default: next to --profiles-dir)")
    select.add_argument("--method", default=DEFAULT_METHOD)
    select.add_argument("--signing-certificate", default=DEFAULT_SIGNING_CERTIFICATE)
    select.add_argument("--report", required=True, help="the report AND the selection, as JSON")
    select.set_defaults(handler=cmd_select)

    export = subparsers.add_parser("export-options", help="export_options.plist from the selection")
    export.add_argument("--selection", required=True)
    export.add_argument("--out", required=True)
    export.add_argument("--method", default="")
    export.add_argument("--signing-certificate", default="")
    export.add_argument("--report", default="")
    export.set_defaults(handler=cmd_export_options)

    verify = subparsers.add_parser("verify-ipa", help="prove the .ipa embeds the selected profiles")
    verify.add_argument("--selection", required=True)
    verify.add_argument("--ipa", required=True)
    verify.set_defaults(handler=cmd_verify_ipa)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except SigningError as exc:
        diag("ERROR: %s" % exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())