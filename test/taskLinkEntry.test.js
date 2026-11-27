import { describe, it, expect } from 'vitest';
import { shouldEnterFirstRun, launchHasTask } from '../src/lib/entryGate.js';
import { socialProfileUrl } from '../src/lib/socialProfileUrl.js';

/**
 * The reported bug, pinned down: a shared task link is `/?open_task=ID`, and the
 * id only reaches storage in an effect. On a COLD open from Facebook, storage is
 * empty at the moment the router decides, so a gate that trusted storage alone
 * sent the visitor to /welcome. These cases fail if the URL stops counting.
 */
const visitor = {
  isLoadingAuth: false,
  isAuthenticated: false,
  isGuest: false,
  hasSeenFirstRun: false,
};

describe('a shared task link is never treated as a first run', () => {
  it('cold open of /?open_task=ID with empty storage keeps the visitor on the feed', () => {
    expect(shouldEnterFirstRun({
      ...visitor,
      search: '?open_task=6afc044eeca0355dab1764c6',
      pathname: '/',
      pendingTaskId: null,
      linkMarker: false,
    })).toBe(false);
  });

  it('a /task/ID link keeps the visitor on the feed', () => {
    expect(shouldEnterFirstRun({
      ...visitor,
      search: '',
      pathname: '/task/6afc044eeca0355dab1764c6',
      pendingTaskId: null,
      linkMarker: false,
    })).toBe(false);
  });

  it('still holds after the parked id is consumed, while the launch marker lives', () => {
    expect(shouldEnterFirstRun({
      ...visitor,
      search: '',
      pathname: '/',
      pendingTaskId: null,
      linkMarker: true,
    })).toBe(false);
  });

  it('a plain visit still gets the first-run flow', () => {
    expect(shouldEnterFirstRun({
      ...visitor,
      search: '',
      pathname: '/',
      pendingTaskId: null,
      linkMarker: false,
    })).toBe(true);
  });

  it('a campaign link is not a first run', () => {
    expect(shouldEnterFirstRun({
      ...visitor,
      search: '?track=publish',
      pathname: '/',
      campaignTrack: 'publish',
    })).toBe(false);
  });

  it('a signed-in user and a guest are never redirected', () => {
    expect(shouldEnterFirstRun({ ...visitor, isAuthenticated: true })).toBe(false);
    expect(shouldEnterFirstRun({ ...visitor, isGuest: true })).toBe(false);
  });

  it('reads both link shapes the app produces', () => {
    expect(launchHasTask({ search: '?open_task=abc', pathname: '/' })).toBe(true);
    expect(launchHasTask({ search: '', pathname: '/task/abc' })).toBe(true);
    expect(launchHasTask({ search: '?ref=agent', pathname: '/' })).toBe(false);
  });
});

/**
 * A stored social value has to become a link that RESOLVES. These are the real
 * shapes found in the app's own user records.
 */
describe('a stored social value becomes a link that resolves', () => {
  it('keeps a Facebook share link whole instead of collapsing it to /share', () => {
    const url = socialProfileUrl('facebook', 'https://www.facebook.com/share/1exa13jzu8/');
    expect(url).toBe('https://www.facebook.com/share/1exa13jzu8');
    expect(url).not.toBe('https://www.facebook.com/share');
  });

  it('keeps a numeric profile id', () => {
    expect(socialProfileUrl('facebook', 'https://www.facebook.com/profile.php?id=100012345'))
      .toBe('https://www.facebook.com/profile.php?id=100012345');
  });

  it('canonicalises a mobile profile URL to the desktop host', () => {
    expect(socialProfileUrl('facebook', 'https://m.facebook.com/locksmith.raanana/'))
      .toBe('https://www.facebook.com/locksmith.raanana');
  });

  it('builds a plain handle', () => {
    expect(socialProfileUrl('facebook', 'benjmoving')).toBe('https://www.facebook.com/benjmoving');
  });

  it('sends a display name to the people search, never to a made-up profile', () => {
    const url = socialProfileUrl('facebook', 'avihu vindish');
    expect(url.startsWith('https://www.facebook.com/search/people/?q=')).toBe(true);
  });

  it('returns nothing to link for an empty value', () => {
    expect(socialProfileUrl('facebook', '')).toBe(null);
  });
});