# Cayenne — Linen House Group

[Brands](#brands) |
[Getting started](#getting-started) |
[Token sync](#token-sync) |
[Staying up to date with Horizon changes](#staying-up-to-date-with-horizon-changes) |
[Developer tools](#developer-tools) |
[License](#license)

A multi-brand Shopify Horizon theme serving **Linen House** and **Aura Home** from a single codebase. Brand differentiation is handled entirely through design tokens (colour schemes, typography, border radii) — all Liquid, CSS, and JavaScript is shared.

Based on Horizon, the flagship of a new generation of first party Shopify themes. It incorporates the latest Liquid Storefronts features, including [theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/quick-start?framework=liquid).

- **Web-native in its purest form:** Themes run on the [evergreen web](https://www.w3.org/2001/tag/doc/evergreen-web/). We leverage the latest web browsers to their fullest, while maintaining support for the older ones through progressive enhancement—not polyfills.
- **Lean, fast, and reliable:** Functionality and design defaults to “no” until it meets this requirement. Code ships on quality. Themes must be built with purpose. They shouldn’t support each and every feature in Shopify.
- **Server-rendered:** HTML must be rendered by Shopify servers using Liquid. Business logic and platform primitives such as translations and money formatting don’t belong on the client. Async and on-demand rendering of parts of the page is OK, but we do it sparingly as a progressive enhancement.
- **Functional, not pixel-perfect:** The Web doesn’t require each page to be rendered pixel-perfect by each browser engine. Using semantic markup, progressive enhancement, and clever design, we ensure that themes remain functional regardless of the browser.

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
shopify theme dev --store linen-house    # Linen House
shopify theme dev --store aura-home      # Aura Home
```

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

Based on Horizon. Copyright (c) 2025-present Shopify Inc. See [LICENSE](/LICENSE.md) for further details.
