# Domain evidence and category hierarchy, 2026-10-02

## Baseline and rollback
Before this package: 26 flat GlobalCategory records (all active, all fields empty); 2 existing Brands; 52 BrandCategory links; 4 BrandDomain records. Existing task category keys and all task records are retained. No Brand is created. No payment code is changed.

Migration takes one backup record per GlobalCategory, Brand and BrandCategory in CategoryMigrationBackup before changes (80 records written). It is idempotent and switches each Brand to model version 2 only after the global tree is structurally valid. Old BrandCategory links and form_config are retained, not deleted. To roll back reads, restore affected Brand records from the backup (especially category_model_version), restore the baseline global records, and deactivate newly introduced global nodes. Do not delete nodes referenced by tasks created after migration. Restore prior code through version history before restoring the old schema. No existing Task is rewritten.

## Applied result (verified 2026-10-02)
- 9 parent categories created; 32 services total, 0 orphans, 0 cycles.
- Joba24: version 2, parents = all nine.
- SaveaDate: version 2, parents = events + personal; excluded = other (matches its previous enabled set).
- Tasks rewritten: 0. Brands created: 0.

## Domain evidence recorded (verified 2026-10-02)
The re-check compares the hostname's public DNS against the published entry bundles served over HTTPS from `joba24.base44.app`, on the same host, without following cross-brand redirects.
- joba24.com — DNS verified, HTTPS 200, bundles match. Mapped, active, primary.
- www.joba24.com — DNS verified, HTTPS 301 to https://joba24.com/ then bundles match. Mapped, active. The single redirect is reported, not altered.
- joba24.base44.app — DNS verified, HTTPS 200, bundles match. Mapped, active.
- saveadate.joba24.com — no safe public DNS resolution yet; not verified, not activated. Owner must complete the Base44 Domains connection and DNS records.

A failed re-check clears the stored evidence and does not deactivate a protected canonical mapping.

## Infrastructure procedure (official documentation checked 2026-10-02)
The current documented surface is the app dashboard's Domains page, not a BrandDomain record. Connect existing domain, enter the full hostname, Add, then use DNS instructions or approve Base44's provider-assisted DNS setup. The dashboard's displayed records are authoritative; this application cannot read or alter its control-plane connection state without a separately authorized management integration.

For saveadate.co.il: manual documented root choices are ANAME/ALIAS @ to base44.onrender.com, or if not supported A @ to 216.24.57.1; www is CNAME www to base44.onrender.com. Copy actual values from Base44, not this document if they differ. Remove conflicting root A/AAAA records, and only CAA restrictions that block the required certificate authority. Keep MX/TXT records. DNS-only if provider proxying is offered. Verify in Domains and allow up to 48 hours. Register each hostname used by visitors in Brand Studio as well, then Re-check, then Activate. www must map to the same Brand if used, without a whole-domain redirect to Joba24.

For events.joba24.com: connect this exact hostname separately to this SAME app in Domains. Documented DNS is CNAME events to base44.onrender.com, no conflicting A/AAAA at events. Do not change joba24.com's root record. Verify in Domains, add events.joba24.com to the intended Brand, Re-check, Activate. Wildcard hosting is explicitly NOT supported; a wildcard DNS record does not register subdomains or issue their SSL certificates. Every subdomain needs its own Base44 connection.

Verification records separate DNS observations, same-host HTTPS proof of this app's published entry bundle, Brand assignment and runtime activation. A generic React root, an existing database row, DNS alone, an external redirect or an old verification timestamp is not proof of connection. Platform status is explicitly an observed serving check, not a claim of direct dashboard/API synchronization. Failed re-check clears evidence. Canonical production mappings are preserved.

Removing in Brand Studio removes ONLY the runtime mapping. In Base44 Domains use Unlink Domain; use Delete as well to remove the dashboard listing. Remove unwanted DNS records separately. Canonical joba24.com, www.joba24.com and joba24.base44.app are protected regardless of the Brand's editable flags. An empty Brand may have no domains.

Sources: https://docs.base44.com/Setting-up-your-app/Connecting-an-external-domain and https://docs.base44.com/Setting-up-your-app/Setting-up-your-custom-domain

## Verification boundary
Build and function authoring validation are separate from end-to-end QA. Run requested interactive acceptance scenarios with the Testing Agent. Real domains require owner DNS/dashboard setup and a published build before their observed connection can pass.