# Cayenne — Linen House Group

[Extensions](#extensions) |
[Brands](#brands) |
[Getting started](#getting-started) |
[Deployment](#deployment) |
[Token sync](#token-sync) |
[Tagalys](#tagalys) |
[Staying up to date with Horizon changes](#staying-up-to-date-with-horizon-changes) |
[Developer tools](#developer-tools) |
[License](#license)

A multi-brand Shopify Horizon theme serving **Linen House** and **Aura Home** from a single codebase. Brand differentiation is handled entirely through design tokens (colour schemes, typography, border radii) — all Liquid, CSS, and JavaScript is shared.

Based on Horizon **v3.5.1**, the flagship of a new generation of first party Shopify themes. It incorporates the latest Liquid Storefronts features, including [theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/quick-start?framework=liquid).

- **Web-native in its purest form:** Themes run on the [evergreen web](https://www.w3.org/2001/tag/doc/evergreen-web/). We leverage the latest web browsers to their fullest, while maintaining support for the older ones through progressive enhancement—not polyfills.
- **Lean, fast, and reliable:** Functionality and design defaults to “no” until it meets this requirement. Code ships on quality. Themes must be built with purpose. They shouldn’t support each and every feature in Shopify.
- **Server-rendered:** HTML must be rendered by Shopify servers using Liquid. Business logic and platform primitives such as translations and money formatting don’t belong on the client. Async and on-demand rendering of parts of the page is OK, but we do it sparingly as a progressive enhancement.
- **Functional, not pixel-perfect:** The Web doesn’t require each page to be rendered pixel-perfect by each browser engine. Using semantic markup, progressive enhancement, and clever design, we ensure that themes remain functional regardless of the browser.

## Extensions

The following extensions have been added on top of the base Horizon theme:

### Multi-brand token sync

A Figma-to-Shopify token pipeline that automates design token synchronisation for both brands. Reads Figma variable caches from JSON files and maps them into Shopify colour schemes, typography, and border-radius settings.

- `scripts/sync-figma-tokens.js` — sync script with `--brand` and `--preview` flags
- `tokens/figma-variables.json` — Linen House token cache
- `tokens/aura-home-variables.json` — Aura Home token cache

### Custom font loading and typography

Brand-aware custom font loading with a metaobject-driven typography system. Linen House uses self-hosted TT Commons Pro; Aura Home uses Futura PT via Adobe Typekit.

- `snippets/custom-fonts.liquid` — `@font-face` declarations and CSS variable overrides per brand
- `snippets/typography-system.liquid` — renders typography presets and overrides from metaobjects

### Composable product card

A modular product card system built from independent child blocks. All display logic is pure Liquid with no JavaScript required.

- `blocks/product-card.liquid` — parent container block
- `blocks/_product-card.liquid` — core card component
- `blocks/_product-card-media.liquid` — media display
- `blocks/_product-card-badges.liquid` — badge system (sold out, sale, low stock, tag-based, metafield-based)
- `blocks/_product-card-swatches.liquid` — variant swatches
- `blocks/_product-card-quick-buy.liquid` — quick purchase

### Layout primitives

Slider, marquee, and tabs layout blocks powered by custom web components.

- `blocks/layout-slider.liquid` + `assets/layout-slider-component.js` — carousel/slider container
- `blocks/layout-marquee.liquid` + `assets/layout-marquee-component.js` — scrolling marquee
- `blocks/layout-tabs.liquid` + `assets/layout-tabs-component.js` — tabbed content

### Tagalys integration

Third-party search, recommendations, A/B testing, and cart upsell behind a master `settings.tagalys_enabled` toggle. Linen House runs Tagalys in production; Aura Home stays on native Shopify. Native Shopify behaviour is the documented fallback path on SDK load failure or when settings are disabled. See the [Tagalys section](#tagalys) below for operational detail.

- `snippets/tagalys-config.liquid` — SDK loader + `onTagalysReady` / `whenTagalysReady` lifecycle helpers
- `snippets/tagalys-ab-testing.liquid` — A/B testing redirects + canonical URL handling for variant collections
- `snippets/tagalys-primary-collection.liquid` — A/B test variant resolver (reference only — Liquid render scope is isolated, see snippet header)
- `snippets/tagalys-analytics.liquid` — page-level event tracking
- `snippets/tagalys-search.liquid` — `/search` results page widget container
- `snippets/tagalys-predictive-search.liquid` + `assets/tagalys-predictive-search.js` — predictive search swap (hijack-on-ready Component subclass)
- `sections/tagalys-recommendations.liquid` — universal recommendation widget with theme-card fallback
- `sections/tagalys-cart-upsell.liquid` — in-cart cross-sell widget
- `assets/tagalys-skin.css` — visual parity layer for Tagalys SDK Preact tiles

## Brands

| | Linen House | Aura Home |
|---|---|---|
| Store | `linen-house` | `aura-home` |
| Heading font | TT Commons Pro | Futura PT |
| Button style | Pill (64px radius) | Sharp (4px radius) |
| Palette | Warm creams and near-black | Cool neutrals and medium grey |

## Getting started

Install the [Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli), then run the local dev server for either brand:

```bash
shopify theme dev -e linen-house-dev     # Linen House
shopify theme dev -e aura-home-dev       # Aura Home
```

## Deployment

Both brands are deployed from the same codebase using the Shopify CLI. Each brand requires its own token sync before pushing.

### Environment setup

Copy the example config and add your credentials for each store:

```bash
cp shopify.theme.example.toml shopify.theme.toml
```

Configure environments for both brands in `shopify.theme.toml`:

```toml
[environments.linen-house-dev]
store = "linen-house-au.myshopify.com"
password = "shptka_your_dev_token"

[environments.linen-house-prod]
store = "linen-house-au.myshopify.com"
password = "shptka_your_prod_token"

[environments.aura-home-dev]
store = "aura-home-au.myshopify.com"
password = "shptka_your_dev_token"

[environments.aura-home-prod]
store = "aura-home-au.myshopify.com"
password = "shptka_your_prod_token"
```

### Pushing to a store

Always sync tokens for the target brand immediately before pushing:

```bash
# Linen House
node scripts/sync-figma-tokens.js
shopify theme push -e linen-house-prod

# Aura Home
node scripts/sync-figma-tokens.js --brand=aura-home
shopify theme push -e aura-home-prod
```

To target a specific environment:

```bash
shopify theme push --environment linen-house-dev
```

> **Important:** The token sync writes brand-specific values to `config/settings_data.json`. Pushing to the wrong store without re-syncing will apply the wrong brand's tokens.

## Token sync

Design tokens are extracted from Figma and stored as JSON caches in `tokens/`. A sync script maps these tokens into Shopify theme settings (colour schemes, typography, border radii).

```bash
node scripts/sync-figma-tokens.js                    # Sync Linen House tokens (default)
node scripts/sync-figma-tokens.js --brand=aura-home  # Sync Aura Home tokens
node scripts/sync-figma-tokens.js --preview           # Preview without writing
```

The script updates `config/settings_data.json` with 9 colour schemes, font picker IDs, and border radius values for the specified brand. Always run the sync for the correct brand before pushing to that store.

### Token architecture

1. **Figma token caches** — `tokens/figma-variables.json` (Linen House) and `tokens/aura-home-variables.json` (Aura Home)
2. **Sync script** — `scripts/sync-figma-tokens.js` maps tokens to Shopify Horizon settings
3. **Colour schemes** — 9 schemes per brand (light, secondary, accent, mid-tone, dark, transparent, promo, header, nav)
4. **CSS custom properties** — use `var(--color-foreground)`, `var(--color-background)`, etc. — never hardcode hex values

## Tagalys

[Tagalys](https://www.tagalys.com/) provides product merchandising, search, recommendations, A/B testing, and cart upsell. The integration is gated by per-store admin settings — Linen House runs Tagalys in production, Aura Home stays on native Shopify. Implementation details and the original plan are in [`docs/plans/2026-04-29-001-feat-tagalys-integration-plan.md`](./docs/plans/2026-04-29-001-feat-tagalys-integration-plan.md).

### Architecture

| Surface | Tagalys mode | When credentials are blank or master switch is off |
|---|---|---|
| Collection grids | **Native (server-side)** — Tagalys writes Shopify's manual sort order via Admin API; theme renders via `_product-card` block | Native Shopify sort + theme renders cards |
| `/search` results page | SDK widget (`tagalys-search-results`) | Native paginate fallback in `sections/search-results.liquid` |
| Predictive search dropdown | Hijack-on-ready: `Tagalys.UIWidgets.ShopifySearchSuggestions` mounted in the existing search modal | Horizon's `<predictive-search-component>` |
| Product recommendations | SDK widget (`tagalys-widget`) | Fallback collection rendered via theme's `_product-card` block |
| Cart upsell | SDK widget (`tagalys-cart-upsell`) — placed via theme editor on the cart page | Section renders nothing |

Theme-card visual parity for SDK-rendered surfaces (search/predictive/recommendations/cart-upsell) is delivered via `assets/tagalys-skin.css` using Horizon's CSS custom properties — brand colour schemes apply automatically on both stores. Tagalys SDK v3 has no Nosto-style dynamic-card mechanism, so the Native mode is the parity strategy for collection grids and the CSS skin handles the SDK-rendered surfaces.

### Configuration

Tagalys is configured per-store via the Shopify admin theme editor (`Theme settings > Tagalys integration`) — the schema lives in `config/settings_schema.json` but per-store values live in `config/settings_data.json`, which is excluded from CLI pushes by `.shopifyignore` so admin values are never overwritten by `shopify theme push`.

Required credentials before any Tagalys feature activates:

- **API server URL** — provided by Tagalys (e.g. `https://api-r2.tagalys.com`)
- **Client code** — provided by Tagalys
- **API key** — provided by Tagalys
- **Store ID** — provided by Tagalys
- **Shopify Storefront API access token** — from a Shopify Custom App (required for multi-currency and product tile rendering)

Every Tagalys consumer surface (search, predictive, recommendations, cart upsell) gates on `tagalys_enabled` plus the feature toggle plus all four credential fields being non-blank. With incomplete credentials the SDK never loads and every surface falls through to native — the master toggle alone is not enough to render anything.

### Predictive search

The predictive search swap uses a hijack-on-ready pattern that preserves Horizon's native fallback. The search modal's `dialog-component` carries a `data-search-provider` state attribute:

| State | Set by | Effect |
|---|---|---|
| `loading` | Liquid (initial) when Tagalys + predictive both enabled | CSS hides both panes during SDK boot |
| `tagalys` | `assets/tagalys-predictive-search.js` on `afterInitialRender` | CSS hides the native pane, Tagalys mount visible |
| `native` | Component on init failure / 2 s init timeout / 4 s safety timeout | CSS hides the Tagalys mount, native predictive resumes |
| (unset) | Liquid when Tagalys or predictive is disabled | CSS shows native predictive; Tagalys mount not rendered |

The native handler in `assets/predictive-search.js` bails when provider is `tagalys` or `loading` so only one provider drives the dropdown at any time. The component (`<tagalys-predictive-search>`) is initialised lazily on the first input or focus event to avoid wasted SDK work for users who never open the search modal.

### Per-brand activation

Linen House: enable Tagalys credentials and `Theme settings > Tagalys integration > Enable Tagalys` in production admin once credentials are populated. Aura Home: leave disabled. The `.shopifyignore` rule ensures `shopify theme push` from this repo never overwrites either store's credentials, so the per-store flip is safe.

## Staying up to date with Horizon changes

Say you're building a new theme off Horizon but you still want to be able to pull in the latest changes, you can add a remote `upstream` pointing to this Horizon repository.

1. Navigate to your local theme folder.
2. Verify the list of remotes and validate that you have both an `origin` and `upstream`:

```sh
git remote -v
```

3. If you don't see an `upstream`, you can add one that points to Shopify's Horizon repository:

```sh
git remote add upstream https://github.com/Shopify/horizon.git
```

4. Pull in the latest Horizon changes into your repository:

```sh
git fetch upstream
git pull upstream main
```

## Developer tools

There are a number of really useful tools that the Shopify Themes team uses during development. Horizon is already set up to work with these tools.

### Shopify CLI

[Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli) helps you build Shopify themes faster and is used to automate and enhance your local development workflow. It comes bundled with a suite of commands for developing Shopify themes—everything from working with themes on a Shopify store (e.g. creating, publishing, deleting themes) or launching a development server for local theme development.

You can follow this [quick start guide for theme developers](https://shopify.dev/docs/themes/tools/cli) to get started.

### Theme Check

We recommend using [Theme Check](https://github.com/shopify/theme-check) as a way to validate and lint your Shopify themes.

We've added Theme Check to Horizon's [list of VS Code extensions](/.vscode/extensions.json) so if you're using Visual Studio Code as your code editor of choice, you'll be prompted to install the [Theme Check VS Code](https://marketplace.visualstudio.com/items?itemName=Shopify.theme-check-vscode) extension upon opening VS Code after you've forked and cloned Horizon.

You can also run it from a terminal with the following Shopify CLI command:

```bash
shopify theme check
```

You can follow the [theme check documentation](https://shopify.dev/docs/storefronts/themes/tools/theme-check) for more details.

#### Shopify/theme-check-action

Horizon runs [Theme Check](#Theme-Check) on every commit via [Shopify/theme-check-action](https://github.com/Shopify/theme-check-action).

## License

Based on Horizon v3.5.1. Copyright (c) 2025-present Shopify Inc. See [LICENSE](/LICENSE.md) for further details.
