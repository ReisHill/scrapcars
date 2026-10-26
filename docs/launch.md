# Lean launch plan

Prepared 26 October 2026. The domain `scrapcarsorted.co.uk` is connected to Cloudflare. Google Search Console and Bing Webmaster Tools are verified. The site remains a noindexed preview, and no real quote email has been sent.

## Decisions needed

- The public brand is **Scrap Cars Sorted** at `scrapcarsorted.co.uk`. Confirm whether this is also the registered legal name or a trading name of another person or entity.
- A Google Business Profile URL is optional. Use it only if the profile genuinely represents Scrap Cars Sorted; do not link an unrelated profile, rename one just to add keywords, or create a duplicate listing.
- Legal owner/operator, contact/registered address, public email and optional business phone, company/VAT information where applicable.
- The website passes enquiries to one buying and collection partner. Confirm the buyer's identity, licence/registration details and actual receiving/collection arrangements before live enquiries begin. Identify the buyer before a customer agrees to sell.
- Quote inbox, email provider account and verified sending domain.
- Actual enquiry retention period, mailbox/provider retention and international-transfer arrangements. Check the ICO fee self-assessment where applicable. Do not publish arbitrary retention promises.

Fill these into `config/site.json`. This file is public source; only enter business details intended for publication, never keys or private customer data. `service_role` is `buyer` or `introducer`. `licence_details` must identify the actual operator/authority and relevant details, not an invented badge.

## Prepared in this repository

- 21 static pages, including location pages, canonical URLs, sitemap, custom 404 and mobile quote journey.
- Cloudflare Worker `scrapcars`, GitHub deployment configuration and `/api/quote` endpoint.
- Server validation and full-postcode district checking; client checks alone cannot allow out-of-area enquiries.
- Resend accepts the business notification and a branded customer acknowledgement in one idempotent batch. The customer address is Reply-To on the business message; the business inbox is Reply-To on the customer message. No marketing mail or automatic valuation.
- 5 attempts/minute per IP per Cloudflare location (approximate, not a strict global limit). Existing honeypot, same-origin enforcement, bounded JSON body, timeouts, no application lead database or request-body logging. Monitor abuse; add Turnstile if needed before exposing a heavily targeted site.
- Retry idempotency via Resend for the same form submission, within its 24-hour window. Refreshing the page starts a new submission; this is not durable global deduplication. Provider acceptance is not proof of inbox delivery. Monitor delivery failures in Resend and test the real mailbox.
- A concise privacy policy and quote-request terms template generated for live builds from confirmed settings. Review the rendered wording against actual operations, recipients and provider contracts before setting `policies_reviewed: true`. These cover enquiries, not every term of a later vehicle purchase/collection contract.
- Self-hosted fonts with OFL licences, no analytics/ad scripts or application tracking cookies. No cookie banner is added for services not in use. Reassess if trackers or embeds are introduced.

## Cloudflare setup

See [cloudflare.md](cloudflare.md). Connect `ReisHill/scrapcars` to Workers Builds as `scrapcars`; build `npm run build`, deploy `npx wrangler deploy`.

Build variables:

| Variable | During setup | After delivery test |
| --- | --- | --- |
| `SITE_ORIGIN` | Actual HTTPS preview/custom origin | Canonical domain |
| `SITE_LIVE` | `false` | `true` once settings/policies are reviewed |
| `SITE_INDEXABLE` | `false` | `true` only at final launch |

Worker **runtime** variables (separate from build variables):

| Variable | Value |
| --- | --- |
| `PUBLIC_ORIGIN` | Exact canonical HTTPS origin, no trailing slash |
| `QUOTE_TO` | Business inbox that will answer enquiries |
| `QUOTE_FROM` | Plain verified sender email on the sending domain |
| `QUOTE_DELIVERY_ENABLED` | `false` until configured; `true` for controlled delivery testing and launch |
| `RESEND_API_KEY` | Secret, preferably sending-only and domain-scoped |

Add runtime variables/secrets through Cloudflare Worker Settings. Do not paste keys in chat or source. Verify the sending domain in Resend, add the exact DNS records it provides (including SPF/DKIM), and configure DMARC for the domain. Avoid adding a second SPF record to an existing hostname. Keep the existing mailbox's MX records intact. This endpoint does not provide a mailbox; replies go to the seller through your existing business email.

The rate-limit namespace in `wrangler.jsonc` must be unique in the Cloudflare account if another Worker uses rate limits; check before deploying. Wrangler may overwrite dashboard-managed ordinary variables unless they are preserved: `keep_vars` is enabled. Secrets are managed separately.

Add the purchased domain as a Worker Custom Domain; select apex or www as canonical and redirect the other host, preserving path/query. Disable unnecessary workers.dev and preview URLs at launch or leave them noindexed; do not expose an indexable duplicate. Verify TLS, quote navigation and 404 status on the actual domain.

## Final launch test

1. `npm ci`, `npm run check`, `npx wrangler deploy --dry-run`. These do not send mail.
2. Complete settings and review the rendered live policies/contact/about pages. Keep indexing off.
3. Connect secrets and enable delivery for a controlled test. Submit your own in-area request on the actual domain and confirm it reaches the inbox, Reply-To works, details/reference match, and the page reports sent. Confirm retries do not duplicate the same request. Confirm out-of-area and failed delivery do not report success. Do not send test messages to other people's inboxes.
4. Confirm the stated response target is realistic and business contact/licence details are accurate. Check the privacy notice against current Cloudflare, Resend and mailbox contracts/retention/transfer arrangements. There is no new application database, but emails and provider logs still contain personal data.
5. Set `SITE_INDEXABLE=true` and redeploy only after the above passes. Verify robots, canonicals and indexable metadata on every public page; the 404 page remains noindex. Site indexing does not guarantee ranking or immediate inclusion.

## Google setup and ongoing SEO

1. Add a **Domain property** in Google Search Console. Verify using its exact DNS TXT record in Cloudflare. Search Console is the indexing/SEO console; Google Cloud Console is not additionally required for ordinary site indexing.
2. Submit `https://chosen-domain/sitemap.xml`. Inspect the homepage and a representative location page, then request indexing. Keep the DNS verification record.
3. If there is a genuine Google Business Profile for Scrap Cars Sorted, put the canonical website URL into it and add its URL to the site settings. Local-business structured data includes the profile only when configured. Do not fabricate reviews or aggregate ratings, or publish a private home address just to fill a schema field.
4. Check indexing and mobile experience; strengthen useful location content and verified trust details. Watch real impressions/queries/leads before adding more pages. Avoid duplicate city pages with only the place name swapped.

## Official references

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare static assets and Worker routing](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Cloudflare rate limits and limitations](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Resend sending API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [ICO privacy notice generator](https://ico.org.uk/create-your-own-privacy-notice) and [required privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)
- [Scrap metal dealer requirements and cash restriction](https://www.gov.uk/find-licences/scrap-metal-dealer-registration)
- [Search Console domain properties](https://support.google.com/webmasters/answer/34592)
- [Google Business Profile representation guidelines](https://support.google.com/business/answer/3038177)
