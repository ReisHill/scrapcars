# Scrapcars

The standalone source for [ReisHill/scrapcars](https://github.com/ReisHill/scrapcars). This is the current ScrapLocal design, moved out of ChatGPT-specific hosting and prepared for local development and Cloudflare Workers Static Assets.

## Run on your computer

Install Node.js 24 (or Node 22+) and Python 3.12+. Then:

```sh
git clone https://github.com/ReisHill/scrapcars.git
cd scrapcars
npm ci
npm run dev
```

Open **http://localhost:3000**. Changes to `public/` and `scripts/build.py` rebuild automatically; refresh the browser to see them. No GitHub, Cloudflare or ChatGPT login is needed to run the downloaded source. Node dependencies are only used by Cloudflare tooling; the development server and generator use standard libraries.

`npm run preview` serves a one-off build without file watching. `PORT=3001 npm run dev` changes the port on macOS/Linux. On Windows PowerShell use `$env:PORT=3001; npm run dev`. Set `PYTHON` if your Python executable has a different name.

## Source map

- `scripts/build.py`: page content, shared page template and SEO metadata.
- `public/assets/style.css`: responsive design and components.
- `public/assets/app.js`: registration handoff, form validation and review screen.
- `public/assets/coverage.js`: collection-area lookup and restrictions.
- `public/assets/car-value.svg`: original car-to-money hero illustration.
- `scripts/dev.mjs`, `scripts/server.mjs`: local development server.
- `wrangler.jsonc`: Cloudflare static deployment configuration.
- `tests/`: postcode rules, build output and local HTTP routing checks.
- `dist/`: generated website; ignored by Git and recreated by `npm run build`.

This repository has no dependency on the original `.openai/hosting.json`, Site project ID or hosted preview URL. The old preview remains separate.

## Commands

```sh
npm run dev             # Build, watch source and run locally
npm run build           # Generate all 21 HTML documents and assets
npm run check           # Check browser scripts and run all tests
npm run cloudflare:dev  # Run the actual Cloudflare runtime locally
npm run deploy          # Build and deploy using your authenticated Cloudflare account
```

## Cloudflare and domain setup

Follow [docs/cloudflare.md](docs/cloudflare.md) to connect this GitHub repository to Cloudflare, configure builds, deploy to your own workers.dev address and attach a chosen domain.

## Configuration

`SITE_ORIGIN` is the absolute origin used by canonical URLs, Open Graph metadata and the sitemap. It defaults to `http://localhost:3000` for a normal build; the local development server uses its configured port. Set it to the real Cloudflare URL or your final domain in Cloudflare **build variables** before deploying publicly.

`SITE_INDEXABLE` defaults to `false`: generated HTML is `noindex, nofollow` and robots.txt disallows crawling. Use `SITE_INDEXABLE=true` only after the business details, live form and final domain are ready. Indexable builds reject localhost and non-HTTPS origins. The quote page remains noindex.

Example macOS/Linux build:

```sh
SITE_ORIGIN=https://your-real-domain.example SITE_INDEXABLE=false npm run build
```

`.env.example` documents the settings. Scripts do not automatically load `.env` files. Set variables in your shell or Cloudflare build settings. Do not commit secrets.

## Quote flow and coverage

Homepage and landing-page entry asks only for the registration. The next step pre-fills it, then asks for one of four conditions, V5C status, pickup postcode and email. Phone is optional.

Coverage is checked on the contact form using the full postcode via Postcodes.io. Supported boroughs are Birmingham, Sandwell (including West Bromwich and Smethwick), Dudley, Walsall and Wolverhampton. Postcode prefixes alone are not accepted as proof of coverage. Invalid, out-of-area and unavailable lookups block review; successful checks are cached in memory for five minutes. Only the postcode is sent to the lookup service.

**The form is still a preview. It does not send email, save leads or calculate a price.** `QUOTE_CONFIG.endpoint` in `public/assets/app.js` is `null`. Preserve this until a real handler is deployed. The current privacy and website terms explain the preview.

When enabling email, add a server-side endpoint that validates every field and rechecks collection coverage before accepting a lead. Add abuse protection, delivery failure handling, suitable retention and a production privacy notice. Provider keys belong in Cloudflare secrets, never browser source. Update the preview notices and review button at the same time as enabling delivery.

## Before public launch

Confirm the final brand/domain, real business contact details, collection/payment terms and privacy information. Add only verified licences and genuine reviews. Quote delivery, a domain purchase and DNS changes have not been completed simply by creating this repository.
