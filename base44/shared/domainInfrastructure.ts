export const CANONICAL_HOSTS = ['joba24.com','www.joba24.com','joba24.base44.app'];
export const HOST_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
export const normalizeHostname = raw => String(raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
export const domainReady = d => d.verification_version === 2 && d.platform_status === 'observed_connected' && d.dns_status === 'verified' && !!d.verified_at;
const safeIP = ip => !/^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|224\.|240\.|::|fc|fd|fe80)/i.test(ip);
async function dns(host, type) {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('DNS lookup unavailable');
  const data = await res.json();
  return { status: data.Status, answers: (data.Answer || []).map(a => ({ type: a.type, value: a.data })) };
}
function entries(html) { return [...html.matchAll(/(?:src|href)=["']([^"']*\/assets\/[^"']+\.js)["']/g)].map(m => new URL(m[1], 'https://joba24.base44.app').pathname).sort(); }
export async function inspectDomain(hostname) {
  const checked = new Date().toISOString();
  try {
    if (!HOST_RE.test(hostname) || /\.(local|internal|localhost)$/.test(hostname)) throw new Error('Invalid public hostname');
    const [a, aaaa, cname] = await Promise.all([dns(hostname, 'A'), dns(hostname, 'AAAA'), dns(hostname, 'CNAME')]);
    const answers = [...a.answers, ...aaaa.answers, ...cname.answers];
    const addresses = answers.filter(r => r.type === 1 || r.type === 28).map(r => r.value);
    if (!addresses.length || !addresses.every(safeIP)) return { checked_at: checked, dns_status: 'failed', platform_status: 'not_confirmed', message: 'No safe public DNS resolution', answers };
    const [candidate, baseline] = await Promise.all([
      fetch(`https://${hostname}/`, { redirect: 'manual', signal: AbortSignal.timeout(10000) }),
      fetch('https://joba24.base44.app/', { redirect: 'error', signal: AbortSignal.timeout(10000) }),
    ]);
    const [html, reference] = await Promise.all([candidate.text(), baseline.text()]);
    const expected = entries(reference), observed = entries(html);
    const servesApp = candidate.status === 200 && baseline.status === 200 && expected.length > 0 && expected.every(path => observed.includes(path));
    return { checked_at: checked, dns_status: servesApp ? 'verified' : 'resolved', platform_status: servesApp ? 'observed_connected' : 'not_confirmed', serves_app: servesApp, answers, http_status: candidate.status, redirect_to: candidate.headers.get('location'), entry_bundles: observed, message: servesApp ? 'Same-host HTTPS serves this published app; DNS resolves publicly.' : 'HTTPS did not prove this published app. Check connection, redirects and publish the latest build.' };
  } catch (error) { return { checked_at: checked, dns_status: 'unknown', platform_status: 'not_confirmed', serves_app: false, message: error.message }; }
}
export function externalStep(hostname) {
  return { hostname, wildcard_supported: false, platform_page: 'Domains', documentation: 'https://docs.base44.com/Setting-up-your-app/Connecting-an-external-domain', steps: [
    `In this app's Base44 Domains page use Connect existing domain, enter ${hostname}, then Add.`,
    'Use DNS instructions for exact Type / Name / Value, or approve provider-assisted setup. Dashboard values take precedence; do not point to a guessed Brand/apex domain.',
    'For a subdomain, the documented CNAME target is base44.onrender.com. Connect every full hostname individually: wildcard hosting is not supported.',
    'For a root domain, documented choices are ANAME/ALIAS @ to base44.onrender.com or A @ to 216.24.57.1; www is CNAME www to base44.onrender.com. Copy actual dashboard values.',
    'Remove conflicting A/AAAA at only the hostname being connected; update blocking CAA restrictions. Preserve MX/TXT. Use DNS-only if your provider offers proxying.',
    'Verify in Base44 Domains; allow up to 48 hours. Avoid whole-domain redirects to another Brand.',
    'In Brand Studio register the exact hostname, Re-check, then Activate. Set Primary separately. www also needs a Brand mapping if used.',
  ], removal: `Only the Brand mapping is removed here. In Base44 Domains select ${hostname} and use Unlink Domain; use Delete to remove the dashboard listing. Remove unwanted DNS records at your provider separately.` };
}