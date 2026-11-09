import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Step 21 ("Resolve SPM dependencies") failed twice in a row on transient
 * downloads — HTTP 504, then downloadError("The request timed out.") for the
 * Facebook iOS SDK 17.4.0 and Capacitor 8.5.0 binary frameworks.
 *
 * The fix is a bounded retry, and the thing that makes a retry safe is what it
 * REFUSES to retry. These tests drive the real script against a fake
 * `xcodebuild` so both halves are proven: transient failures are retried and
 * eventually succeed, while a version-resolution, manifest or compile error
 * stops the build on the first attempt instead of being retried into noise.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const SCRIPT = join(ROOT, 'scripts/resolve-spm-deps.sh');
const YAML = join(ROOT, 'codemagic.yaml');

const read = (path) => readFileSync(path, 'utf8');

/** A stand-in xcodebuild: fails N times with a chosen message, then succeeds. */
function makeShim(dir) {
  const shim = join(dir, 'xcodebuild');
  writeFileSync(shim, `#!/usr/bin/env bash
COUNT_FILE="$SHIM_COUNTER"
ARGS_FILE="$SHIM_ARGS"
n=$(( $(cat "$COUNT_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$COUNT_FILE"
printf '%s\\n' "$*" >> "$ARGS_FILE"
if [ "$n" -le "\${SHIM_FAIL_TIMES:-0}" ]; then
  printf '%s\\n' "$SHIM_FAIL_MSG" >&2
  exit "\${SHIM_FAIL_CODE:-1}"
fi
echo "Resolved source packages"
exit 0
`);
  chmodSync(shim, 0o755);
  return shim;
}

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'joba-spm-'));
  return {
    dir,
    shim: makeShim(dir),
    counter: join(dir, 'count'),
    args: join(dir, 'args'),
    clone: join(dir, 'SourcePackages'),
    log: join(dir, 'resolve.log'),
  };
}

/** Run the resolver with an instant backoff, so tests stay fast. */
function runResolve(box, { failTimes = 0, message = '', code = 1, maxAttempts = 4 } = {}) {
  const result = spawnSync('bash', [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      XCODEBUILD: box.shim,
      XCODE_PROJECT: 'ios/App/App.xcodeproj',
      XCODE_SCHEME: 'App',
      SPM_CLONE_DIR: box.clone,
      SPM_LOG: box.log,
      SPM_MAX_ATTEMPTS: String(maxAttempts),
      SPM_RETRY_BASE_SECONDS: '0', // no real sleeping in tests
      SPM_RETRY_MAX_SECONDS: '0',
      SHIM_COUNTER: box.counter,
      SHIM_ARGS: box.args,
      SHIM_FAIL_TIMES: String(failTimes),
      SHIM_FAIL_MSG: message,
      SHIM_FAIL_CODE: String(code),
    },
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    attempts: Number(readFileSync(box.counter, 'utf8').trim()),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   1. Transient download failures ARE retried
   ══════════════════════════════════════════════════════════════════════════ */
describe('transient download failures', () => {
  it('recovers from the exact HTTP 504 that failed the first build', () => {
    const box = sandbox();
    const r = runResolve(box, {
      failTimes: 1,
      message: 'failed downloading "https://github.com/facebook/facebook-ios-sdk/releases/download/17.4.0/FacebookCore.xcframework.zip": HTTP 504',
    });
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(r.attempts).toBe(2);
    expect(r.stdout).toContain('classified: transient');
    expect(r.stdout).toContain('resolved on attempt 2');
  });

  it('recovers from downloadError("The request timed out.") that failed the second build', () => {
    const box = sandbox();
    const r = runResolve(box, {
      failTimes: 2,
      message: "downloadError(\"The request timed out.\") - Capacitor 8.5.0 frameworks",
    });
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(r.attempts).toBe(3);
    expect(r.stdout.match(/classified: transient/g)).toHaveLength(2);
  });

  it('accepts the other network shapes worth retrying', () => {
    for (const message of [
      'NSURLErrorDomain error -1001 (NSURLErrorTimedOut)',
      'error: Connection reset by peer',
      'fatal: unable to access: Could not resolve host: github.com',
      'error: unexpected EOF while downloading',
      'Bad Gateway (502)',
    ]) {
      const box = sandbox();
      const r = runResolve(box, { failTimes: 1, message });
      expect(r.code, `${message}\n${r.stdout}${r.stderr}`).toBe(0);
      expect(r.attempts).toBe(2);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Real failures are NOT retried — the retry must not hide a broken build
   ══════════════════════════════════════════════════════════════════════════ */
describe('non-transient failures fail on the first attempt', () => {
  it('does not retry an unsatisfiable version requirement', () => {
    const box = sandbox();
    const r = runResolve(box, {
      failTimes: 99,
      message: 'Dependencies could not be resolved because root depends on facebook-ios-sdk 17.4.0 and no versions of facebook-ios-sdk match the requirement.',
    });
    expect(r.code).toBe(1);
    expect(r.attempts).toBe(1); // never retried
    expect(r.stdout).toContain('NOT retrying');
  });

  it('does not retry a Swift compile error', () => {
    const box = sandbox();
    const r = runResolve(box, {
      failTimes: 99,
      message: "error: cannot find 'FacebookCore' in scope",
    });
    expect(r.code).toBe(1);
    expect(r.attempts).toBe(1);
    expect(r.stdout).toContain('NOT retrying');
  });

  it('does not retry an unparseable Package.swift', () => {
    const box = sandbox();
    const r = runResolve(box, {
      failTimes: 99,
      message: "error: package at 'ios/App/CapApp-SPM' is using Swift tools version but the installed version is",
    });
    expect(r.code).toBe(1);
    expect(r.attempts).toBe(1);
  });

  it('treats an unrecognised failure as permanent rather than guessing', () => {
    // Unknown must fail fast: retrying it could mask a real error four times.
    const box = sandbox();
    const r = runResolve(box, { failTimes: 99, message: 'something entirely unexpected happened' });
    expect(r.code).toBe(1);
    expect(r.attempts).toBe(1);
    expect(r.stdout).toContain('classified: unknown');
  });

  it('still exits non-zero when only transient retries are exhausted', () => {
    const box = sandbox();
    const r = runResolve(box, { failTimes: 99, message: 'HTTP 504 Gateway Timeout', maxAttempts: 3 });
    expect(r.code).toBe(1);
    // 3 bounded attempts, plus the single cold retry after clearing the cache.
    expect(r.attempts).toBe(4);
    expect(r.stdout).toContain('giving up rather than looping');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. The persisted SPM cache: used, and cleared only when it is the problem
   ══════════════════════════════════════════════════════════════════════════ */
describe('the cached clone directory', () => {
  it('resolves into the cacheable directory and tells xcodebuild about it', () => {
    const box = sandbox();
    const r = runResolve(box);
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(existsSync(box.clone)).toBe(true);
    expect(readFileSync(box.args, 'utf8')).toContain(`-clonedSourcePackagesDirPath ${box.clone}`);
  });

  it('never deletes a cache that works', () => {
    const box = sandbox();
    mkdirSync(box.clone, { recursive: true });
    const marker = join(box.clone, 'keep-me');
    writeFileSync(marker, 'cached package');

    const r = runResolve(box, { failTimes: 1, message: 'HTTP 503 Service Unavailable' });
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(existsSync(marker)).toBe(true);
  });

  it('clears a poisoned cache once, then retries cold', () => {
    const box = sandbox();
    mkdirSync(box.clone, { recursive: true });
    const stale = join(box.clone, 'half-downloaded.xcframework');
    writeFileSync(stale, 'truncated')

    const r = runResolve(box, {
      failTimes: 99,
      message: 'downloadError("The request timed out.")',
      maxAttempts: 2,
    });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('Clearing');
    expect(existsSync(stale)).toBe(false); // the poisoned artefact is gone
    expect(r.attempts).toBe(3); // 2 bounded + 1 cold, then it stops
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. The CI configuration itself
   ══════════════════════════════════════════════════════════════════════════ */
describe('codemagic.yaml', () => {
  const yaml = read(YAML);

  it('runs the resolver in Step 21, and only there', () => {
    const step = yaml.indexOf('name: Resolve SPM dependencies (validate Package.swift before archive)');
    expect(step).toBeGreaterThan(-1);
    // The step's own block: from its name to the name of the next step.
    const rest = yaml.slice(step + 10);
    const endRel = rest.search(/\n {6}- name: /);
    const body = endRel === -1 ? rest : rest.slice(0, endRel);
    expect(body).toContain('bash scripts/resolve-spm-deps.sh');
    // The manifest is still printed, and the old bare xcodebuild call is gone.
    expect(body).toContain('=== Package.swift used for this build ===');
    expect(body).not.toContain('xcodebuild -resolvePackageDependencies');
    expect(yaml.match(/resolve-spm-deps\.sh/g)).toHaveLength(1);
  });

  it('persists the SPM clone directory with Codemagic dependency caching', () => {
    // Codemagic's documented SPM pattern, and the same path the resolver uses.
    expect(yaml).toMatch(/^ {4}cache:\n {6}cache_paths:\n {8}- \$CM_BUILD_DIR\/SourcePackages\n/m);
    expect(yaml).toContain('$HOME/Library/Caches/org.swift.swiftpm');
  });

  it('keeps the App Clip, widget and signing wiring untouched', () => {
    // Retries must not have disturbed anything they were not asked to touch.
    expect(yaml).toContain('--require-widget "${ENABLE_LIVE_ACTIVITY_WIDGET:-false}"');
    expect(yaml).toContain('--require-appclip "${ENABLE_APP_CLIP:-false}"');
    expect(yaml).toContain('verify-ios-app-clip.py');
    expect(yaml).toContain('patch-ios-app-clip.py');
    expect(yaml).toContain('patch-ios-live-activity.py');
  });

  it('leaves the archive command and its signing flags exactly as they were', () => {
    const archive = yaml.indexOf('xcodebuild archive');
    expect(archive).toBeGreaterThan(-1);
    const body = yaml.slice(archive, archive + 700);
    expect(body).toContain('DEVELOPMENT_TEAM=322DV2PB9V');
    expect(body).toContain('CODE_SIGN_STYLE=Manual');
    // The version pair moves together with every release: commit beb4b8db bumped
    // both in codemagic.yaml (2.130299.9/42 → 2.130300.0/43) and left this
    // assertion behind, so the guard failed on a build that was correct.
    expect(body).toContain('MARKETING_VERSION=2.130300.0');
    expect(body).toContain('CURRENT_PROJECT_VERSION=43');
    // The retry lives in the resolve step only; the archive is never wrapped.
    expect(yaml.match(/xcodebuild archive/g)).toHaveLength(1);
  });

  it('preserves the pinned dependency versions', () => {
    // Facebook 17.x, TikTok 1.7.x and capacitor-swift-pm are pinned by the
    // injection step and must not be "fixed" by a retry change.
    expect(yaml).toContain('.package(url: "https://github.com/facebook/facebook-ios-sdk.git", from: "17.0.0")');
    expect(yaml).toContain('.package(url: "https://github.com/tiktok/tiktok-business-ios-sdk.git", from: "1.7.2")');
    expect(yaml).toContain('https://github.com/ionic-team/capacitor-swift-pm.git');
  });
});