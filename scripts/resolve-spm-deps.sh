#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# RESOLVE SWIFT PACKAGES — with bounded retries, for TRANSIENT failures only
# ═══════════════════════════════════════════════════════════════════════════
#
# WHY THIS EXISTS
# Two consecutive iOS builds died in this step (Step 21) on the same downloads:
#
#   1. HTTP 504 downloading a GitHub release XCFramework
#   2. downloadError("The request timed out.") — Facebook iOS SDK 17.4.0 and
#      Capacitor 8.5.0 binary frameworks
#
# Neither was a manifest problem. GitHub's release CDN produced a transient
# failure, and the step had no retry: one bad minute on the CDN cost a full
# 40-minute archive slot. So the fix is to retry — narrowly.
#
# WHAT IS RETRIED (and why the list is short)
# Only failures that mean "the network was unwell", never "the dependency is
# wrong":
#
#   HTTP 500/502/503/504, Gateway Timeout, Bad Gateway, Service Unavailable
#   "The request timed out", any "timed out", downloadError
#   NSURLErrorDomain -1001 (timeout) … -1009 (offline), NSURLErrorTimedOut
#   Connection reset / connection was lost, Could not resolve host,
#   Temporary failure in name resolution, unexpected EOF
#   Failed to download, TLS/SSL error
#
# EVERYTHING ELSE FAILS IMMEDIATELY, on the first attempt:
#
#   version resolution ("… is unsatisfiable", "no versions of … match")
#   Package.swift / manifest errors, "unable to resolve module dependency"
#   Swift compile and type errors ("cannot find … in scope", "Static member …")
#
# An unrecognised failure is treated as PERMANENT on purpose. A retry loop that
# cannot tell a timeout from a compile error would spend four attempts and two
# minutes repeating a broken build and then report it as "flaky", which is
# exactly how a real error gets buried. Better to fail once, loudly, with the
# log tail.
#
# BACKOFF
# delay = base × 2^(attempt-1), capped, plus up to 25% jitter so several
# parallel resolves do not re-hit the CDN in lockstep:
#   attempt 1 → 20s, 2 → 40s, 3 → 80s (defaults), capped at 120s.
# Bounded: at most SPM_MAX_ATTEMPTS (default 4) attempts, plus at most ONE
# extra "cold" attempt if a PERSISTED download cache is what keeps failing.
#
# THE CACHE, AND WHY CLEARING IT IS SAFE
# Resolving into $CM_BUILD_DIR/SourcePackages lets Codemagic cache that folder
# between builds (its documented SPM pattern), so a green build means the next
# one re-downloads nothing. The known hazard of any download cache is a
# half-written artifact surviving an interrupted run and failing identically
# for ever, so if every attempt failed transiently the directory is removed
# ONCE and resolved cold. A cache that works is never touched.

set -uo pipefail   # not -e: failures are inspected, not fatal

XCODEBUILD="${XCODEBUILD:-xcodebuild}"
PROJECT="${XCODE_PROJECT:-ios/App/App.xcodeproj}"
SCHEME="${XCODE_SCHEME:-App}"
CLONE_DIR="${SPM_CLONE_DIR:-${CM_BUILD_DIR:-$PWD}/SourcePackages}"
MAX_ATTEMPTS="${SPM_MAX_ATTEMPTS:-4}"
BASE_DELAY="${SPM_RETRY_BASE_SECONDS:-20}"
MAX_DELAY="${SPM_RETRY_MAX_SECONDS:-120}"
LOG="${SPM_LOG:-${TMPDIR:-/tmp}/spm-resolve.log}"

# Kept on one line each: grep -E, case-sensitive where it matters.
TRANSIENT_RE='HTTP[/ 0-9]*(500|502|503|504)|Gateway Timeout|Service Unavailable|Bad Gateway|request timed out|[Tt]imed out|[Tt]imeout|downloadError|NSURLErrorDomain[^0-9]*-100[1-9]|NSURLErrorTimedOut|Connection reset|connection was lost|Could not resolve host|Temporary failure in name resolution|unexpected EOF|Failed to download|[Tt][Ll][Ss] error'
PERMANENT_RE='unsatisfiable|no versions of|does not match the requirement|unable to resolve module dependency|cannot find|Static member|Package\.swift|invalid manifest|product .* not found'

mkdir -p "$CLONE_DIR"

# transient | permanent | unknown
classify() {
  if grep -Eq "$TRANSIENT_RE" "$1" 2>/dev/null; then
    echo transient
  elif grep -Eq "$PERMANENT_RE" "$1" 2>/dev/null; then
    echo permanent
  else
    echo unknown
  fi
}

# Runs xcodebuild once, tees its output to the log, returns ITS exit status
# (not tee's). Resolves into the shared, cacheable clone directory.
run_once() {
  local label="$1"
  local status
  echo "=== SPM resolve: $label (clones: $CLONE_DIR) ==="
  "$XCODEBUILD" -resolvePackageDependencies \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -clonedSourcePackagesDirPath "$CLONE_DIR" 2>&1 | tee "$LOG"
  status=${PIPESTATUS[0]}
  return "$status"
}

fail_permanent() {
  echo "ERROR: SPM resolution failed with a non-transient error - NOT retrying."
  echo "       (retrying a resolution or compile error only repeats it and buries the cause)"
  echo "---- last 40 lines of the xcodebuild log ----"
  tail -n 40 "$LOG"
  exit 1
}

attempt=1
cold_done=0

while :; do
  run_once "attempt $attempt of $MAX_ATTEMPTS"
  status=$?
  if [ "$status" -eq 0 ]; then
    echo "OK: Swift Package dependencies resolved on attempt $attempt (exit 0)"
    exit 0
  fi

  verdict=$(classify "$LOG")
  echo "--- attempt $attempt failed (exit $status), classified: $verdict ---"

  if [ "$verdict" != "transient" ]; then
    fail_permanent
  fi

  # Transient. Either back off, or - once - clear the persisted cache and retry
  # cold, because a half-downloaded artifact fails identically for ever.
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    if [ "$cold_done" -eq 0 ] && [ -d "$CLONE_DIR" ]; then
      echo "WARN: all $MAX_ATTEMPTS attempts failed transiently with a persisted clone directory."
      echo "      Clearing $CLONE_DIR once and retrying cold (a partially cached download is a known cause)."
      rm -rf "$CLONE_DIR"
      mkdir -p "$CLONE_DIR"
      cold_done=1
      attempt=$((attempt + 1))
      continue
    fi
    echo "ERROR: SPM resolution still failing after $attempt attempt(s) - giving up rather than looping."
    echo "---- last 40 lines of the xcodebuild log ----"
    tail -n 40 "$LOG"
    exit 1
  fi

  delay=$(( BASE_DELAY * (1 << (attempt - 1)) ))
  if [ "$delay" -gt "$MAX_DELAY" ]; then delay="$MAX_DELAY"; fi
  if [ "$delay" -gt 0 ]; then
    jitter=$(( RANDOM % (delay / 4 + 1) ))
    total=$(( delay + jitter ))
    echo "--- transient failure: retrying in ${total}s ---"
    sleep "$total"
  fi

  attempt=$((attempt + 1))
done