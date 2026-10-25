# Cloudflare setup

The project uses **Cloudflare Workers Static Assets**. No account-specific IDs or tokens are committed, and no domain has been purchased or selected.

## Connect GitHub for automatic builds

1. In your Cloudflare account, open **Workers & Pages** and create a Worker from an existing Git repository.
2. Authorize the Cloudflare GitHub integration for **ReisHill/scrapcars**. Select only this repository unless you deliberately want wider access.
3. Set the Worker name to **scrapcars**, matching `wrangler.jsonc`.
4. Use the following build settings:

| Setting | Value |
| --- | --- |
| Repository | `ReisHill/scrapcars` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build variable `SITE_ORIGIN` | Your actual `https://scrapcars.<account-subdomain>.workers.dev` origin |
| Build variable `SITE_INDEXABLE` | `false` until launch |

Cloudflare installs package-lock.json dependencies before the build. The build also needs Python 3, available in the Cloudflare build image. Keep Node on 24, matching `.nvmrc`, or a supported Node 22+ version.

`wrangler.jsonc` points at `dist/`, uses directory index HTML routing, and serves the custom 404 page with a 404 status. It does not enable an SPA fallback: each SEO page has its own generated HTML.

The GitHub `Build and test` workflow validates pushes and pull requests. Hosting is handled by Cloudflare's Git integration, so no Cloudflare token needs to be stored as a GitHub Actions secret for that route.

## Deploy from your own computer instead

```sh
npm ci
npx wrangler login
# Set SITE_ORIGIN to the actual origin assigned to your Cloudflare Worker.
SITE_ORIGIN=https://scrapcars.YOUR-ACCOUNT-SUBDOMAIN.workers.dev npm run deploy
```

The account subdomain is assigned by Cloudflare; do not use the placeholder literally. The first deployment may be used to find the address, then rebuild with the returned origin and deploy again so canonical URLs are correct. Keep indexing off during this setup.

Authenticate on your own computer through Wrangler's browser flow. Do not paste tokens into chat, files, shell command history or the repository. For noninteractive deployments, use an appropriately scoped Cloudflare API token supplied through the CI secret mechanism.

## Add a domain when chosen

1. Register or bring your chosen domain into your own Cloudflare account.
2. In the Worker's **Settings → Domains & Routes**, add the domain as a **Custom Domain**.
3. Decide the canonical host (apex or www), configure the other host to redirect to it, and confirm HTTPS.
4. Change `SITE_ORIGIN` to the chosen canonical HTTPS origin, rebuild and redeploy.
5. Verify canonical URLs, sitemap.xml, quote navigation and 404 behaviour on the real domain.
6. Enable `SITE_INDEXABLE=true` only after the live form, business identity, service terms and privacy information are complete.

Domain registration and payment require a separate chosen domain and purchase. This repository does not create DNS records or register a domain automatically.

## Official references

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [HTML routing and custom 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
