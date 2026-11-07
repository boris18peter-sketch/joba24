#!/usr/bin/env bash
#
# resolve-live-activity-flag.sh — the ONLY place the Live Activity switch is read.
#
#   Usage:   bash scripts/resolve-live-activity-flag.sh "<raw build input value>"
#
# Codemagic hands a `type: boolean` build input over as a Python-style token —
# "True" / "False" — while YAML, every shell gate below and the project patcher
# all speak lowercase "true" / "false". The first widget-enabled build failed on
# exactly that: 'liveActivityWidget resolved to True (expected true or false)'.
#
# This script owns the normalisation so that ONE tested implementation decides,
# instead of an untestable `case` statement buried in the workflow file:
#
#   True / true / TRUE (and surrounding whitespace, CRLF)  -> true
#   False / false / FALSE (and surrounding whitespace, CRLF) -> false
#   anything else, including empty / missing                 -> exit 1
#
# The exit code is the contract:
#   0  resolved — the value is printed, and appended to $CM_ENV when it is set
#      so the remaining Codemagic steps read $ENABLE_LIVE_ACTIVITY_WIDGET.
#   1  could NOT be resolved — nothing is written, so the variable can never be
#      left over, and the build must stop rather than silently build the
#      shipping app while looking like a widget build.
#
# The default stays OFF: an unticked box resolves to false, which is the app
# that ships today. Nothing here can ever arm the widget by accident.

set -euo pipefail

raw="${1-}"
# The App Clip switch is OPTIONAL. Without a second argument nothing about this
# script's behaviour or output changes — which is why the existing tests, and the
# shipping build, are untouched by its addition.
clip_raw="${2-}"

# One normalisation: drop carriage returns, case-fold, trim the edges.
normalise() { printf '%s' "${1-}" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
normalised="$(normalise "$raw")"

case "$normalised" in
  true)
    flag="true"
    message="enabled for this build (TestFlight only)."
    ;;
  false)
    flag="false"
    message="disabled - building the shipping app."
    ;;
  *)
    # Missing, empty, an unresolved ${{ … }} placeholder, "maybe", "1" —
    # everything that is not a clean boolean stops the build here. Nothing is
    # written to $CM_ENV, so the gates below cannot run half-armed.
    printf "ERROR: liveActivityWidget resolved to '%s' (expected true or false).\n" "$raw"
    printf 'Refusing to build: the Live Activity flag could not be resolved.\n'
    exit 1
    ;;
esac

# ── The App Clip switch (optional second argument) ──────────────────────────
# Same contract, same normalisation: only a real boolean is accepted, and an
# unresolvable value stops the build rather than quietly producing an archive
# that claims to contain a clip and does not.
if [ -n "$clip_raw" ]; then
  case "$(normalise "$clip_raw")" in
    true)
      clip_flag="true"
      clip_message="enabled for this build."
      ;;
    false)
      clip_flag="false"
      clip_message="disabled - no App Clip target added."
      ;;
    *)
      printf "ERROR: appClip resolved to '%s' (expected true or false).\n" "$clip_raw"
      printf 'Refusing to build: the App Clip flag could not be resolved.\n'
      exit 1
      ;;
  esac
fi

if [ -n "${CM_ENV:-}" ]; then
  printf 'ENABLE_LIVE_ACTIVITY_WIDGET=%s\n' "$flag" >> "$CM_ENV"
  if [ -n "$clip_raw" ]; then printf 'ENABLE_APP_CLIP=%s\n' "$clip_flag" >> "$CM_ENV"; fi
fi

printf 'ENABLE_LIVE_ACTIVITY_WIDGET=%s\n' "$flag"
printf 'Live Activity widget: %s\n' "$message"
if [ -n "$clip_raw" ]; then
  printf 'ENABLE_APP_CLIP=%s\n' "$clip_flag"
  printf 'App Clip: %s\n' "$clip_message"
fi