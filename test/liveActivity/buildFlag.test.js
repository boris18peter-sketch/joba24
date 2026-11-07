import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(here, '../..');
const SCRIPT = join(ROOT, 'scripts/resolve-live-activity-flag.sh');
const YAML = join(ROOT, 'codemagic.yaml');

/**
 * Runs the resolver exactly as Codemagic would, returning what the log showed,
 * what landed in $CM_ENV, and whether the build would have continued.
 */
function resolveFlag(raw, { withEnvFile = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'joba-flag-'));
  const envFile = join(dir, 'cm_env');
  const env = { ...process.env };
  if (withEnvFile) env.CM_ENV = envFile;
  else delete env.CM_ENV;

  let status = 0;
  let output = '';
  try {
    output = execFileSync('bash', [SCRIPT, ...(raw === undefined ? [] : [raw])], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      env,
    });
  } catch (err) {
    status = err.status ?? 1;
    output = `${err.stdout || ''}${err.stderr || ''}`;
  }

  const written = existsSync(envFile) ? readFileSync(envFile, 'utf8').trim() : '';
  return { status, output, written, flag: written ? written.split('=')[1] : null };
}

describe('build flag resolver', () => {
  /* ── BOTH CODEMAGIC FORMATS ──────────────────────────────────────────────
     The exact regression that failed the first widget-enabled build: Codemagic
     hands a `type: boolean` input over as "True"/"False", while every gate
     downstream reads lowercase "true"/"false". */
  it("turns Codemagic's capitalised True into true", () => {
    const r = resolveFlag('True');
    expect(r.status).toBe(0);
    expect(r.written).toBe('ENABLE_LIVE_ACTIVITY_WIDGET=true');
    expect(r.flag).toBe('true');
    expect(r.output).toContain('ENABLE_LIVE_ACTIVITY_WIDGET=true');
    expect(r.output).toContain('enabled for this build');
  });

  it("turns Codemagic's capitalised False into false", () => {
    const r = resolveFlag('False');
    expect(r.status).toBe(0);
    expect(r.written).toBe('ENABLE_LIVE_ACTIVITY_WIDGET=false');
    expect(r.flag).toBe('false');
    expect(r.output).toContain('disabled');
  });

  it('accepts the lowercase form the gates expect', () => {
    expect(resolveFlag('true').flag).toBe('true');
    expect(resolveFlag('false').flag).toBe('false');
  });

  it('accepts surrounding whitespace and a CRLF line ending', () => {
    expect(resolveFlag('  True \r\n').flag).toBe('true');
    expect(resolveFlag('\tfalse\n').flag).toBe('false');
  });

  /* ── THE DEFAULT STAYS OFF ───────────────────────────────────────────────
     An unticked box is what Codemagic resolves for the shipped default. */
  it('leaves an ordinary unticked build as the shipping app', () => {
    const r = resolveFlag('false');
    expect(r.status).toBe(0);
    expect(r.flag).toBe('false');
    // Every widget-only step below reads exactly this, so nothing is armed.
    expect(r.written).not.toContain('=true');
  });

  /* ── NOTHING ELSE CAN ARM IT ─────────────────────────────────────────────
     Each of these stops the build and writes NOTHING to $CM_ENV, so a
     half-resolved flag can never enable the widget by accident. */
  it.each([
    ['a missing value', undefined],
    ['an empty value', ''],
    ['an unresolved placeholder', '${{ inputs.liveActivityWidget }}'],
    ['a non-boolean word', 'maybe'],
    ['a number', '1'],
    ['a typo', 'ture'],
  ])('refuses %s without enabling anything', (_label, raw) => {
    const r = resolveFlag(raw);
    expect(r.status).not.toBe(0);
    expect(r.written).toBe('');
    expect(r.output).toContain('expected true or false');
    expect(r.output).toContain('Refusing to build');
    // The message quotes what it actually received, so the log is diagnosable.
    if (raw) expect(r.output).toContain(raw);
  });

  it('still reports the resolved flag when no $CM_ENV is present', () => {
    const r = resolveFlag('True', { withEnvFile: false });
    expect(r.status).toBe(0);
    expect(r.output).toContain('ENABLE_LIVE_ACTIVITY_WIDGET=true');
  });

  /* ── THE WORKFLOW USES IT ────────────────────────────────────────────────
     The script would be decorative if the step still matched the raw value. */
  it('is the step the workflow actually runs, before the project is patched', () => {
    const yaml = readFileSync(YAML, 'utf8');
    const step = yaml.indexOf('- name: Resolve build flags');
    expect(step).toBeGreaterThan(-1);

    const body = yaml.slice(step, yaml.indexOf('- name: Install npm dependencies', step));
    // The App Clip switch rides through the SAME script, as an optional second
    // argument: one tested normalisation decides both flags.
    expect(body).toContain('bash scripts/resolve-live-activity-flag.sh "${{ inputs.liveActivityWidget }}" "${{ inputs.appClip }}"');
    // The raw comparison that broke on "True" must be gone.
    expect(body).not.toContain('case "$WANT" in');
    expect(body).not.toContain('WANT="${{ inputs.liveActivityWidget }}"');
    // It must run before anything can be patched or signed.
    expect(step).toBeLessThan(yaml.indexOf('python3 scripts/patch-ios-live-activity.py'));
    expect(step).toBeLessThan(yaml.indexOf('app-store-connect fetch-signing-files'));
  });
});