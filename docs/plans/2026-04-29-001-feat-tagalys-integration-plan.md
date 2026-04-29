---
title: 'feat: Tagalys integration with theme-parity product cards'
type: feat
status: completed
date: 2026-04-29
---

# feat: Tagalys integration with theme-parity product cards

## Summary

Install the seven `the-working-party/tagalys-starter` components into the Linen House Horizon theme behind the starter's `settings.tagalys_enabled` master switch, add a Tagalys predictive-search swap (not in starter) that hijacks Horizon's existing search modal on SDK-ready, and deliver theme-parity product cards by combining Tagalys Native (server-side) collection mode for grids with a brand-aware CSS skin for SDK-rendered Preact tiles on search/recommendation/upsell surfaces. Per-store activation handled via Shopify admin (Linen House on, Aura Home off).

---

## Problem Frame

Linen House and Aura Home share one Horizon theme; Linen House is adopting Tagalys for collection merchandising, search, recommendations, A/B testing, and cart upsell, while Aura Home stays on native Shopify. The starter pack covers `/search` results, recommendations, cart upsell, A/B testing, and analytics — but not predictive search, and its default fallbacks render minimal product markup that does not match the host theme's product card. We need a clean, conditional integration that preserves native behaviour when Tagalys is disabled or absent, swaps in predictive-search via Horizon's existing Section-Rendering-API + `morph()` seam, and matches the existing Linen House product card on every surface Tagalys touches.

---

## Requirements

- R1. Master `settings.tagalys_enabled` checkbox gates every Tagalys surface; when false, theme behaves identically to today (canonical, search, predictive, recommendations, cart all native).
- R2. Linen House (production): Tagalys ON via Shopify admin. Aura Home (production): Tagalys OFF via Shopify admin. No codebase brand-fork.
- R3. Tagalys predictive search wired into the existing search modal, swapping native predictive results when `tagalys_enabled && tagalys_predictive_search_enabled` are both true.
- R4. All Tagalys-rendered product tiles visually match the existing Horizon product card (preview theme `154225541293` on `linen-house-au.myshopify.com`).
- R5. Native Shopify behaviour remains the documented fallback path on Tagalys SDK load failure or when settings are disabled.
- R6. Canonical-URL behaviour preserved — Tagalys A/B testing canonical override active only when both `tagalys_enabled && tagalys_ab_testing_enabled` are true.
- R7. Settings schema additions are translatable (English defaults via `locales/en.default.schema.json`).
- R8. No regressions to existing collection title/breadcrumb/SEO markup driven by `sections/twp-collection-heading.liquid`.

---

## Scope Boundaries

- Custom product metafields piped to Tagalys (`setPlatformConfiguration.metafields`) limited to those needed for visual parity (e.g. badge label, swatch list, review summary). Non-parity metafields excluded.
- CMP / cookie-consent integration excluded — `analyticsStorageConsentProvided` keeps starter default `return true`.
- Custom currency formatter / multi-market currency tuning beyond the master `tagalys_markets_enabled` toggle excluded.
- Cart drawer / slide-out JS init excluded — cart upsell lives on the cart page only, dropped into the existing `{% content_for 'blocks' %}` zone in `sections/main-cart.liquid` via the theme editor.
- Auto-editing `templates/cart.json` excluded — merchants add the cart upsell block via the editor.
- Aura Home Tagalys enablement excluded.
- Reskinning hover/focus/animation states beyond what the SDK's emitted DOM exposes — flagged for follow-up after runtime DevTools inspection.

### Deferred to Follow-Up Work

- Update `docs/07-integrations/search-merch/INT-07-search-merch.md` to record Tagalys as the chosen platform and unblock the discovery doc — separate documentation PR after this lands.
- Per-brand Tagalys credentials hardening (validation, prevention of cross-brand key leak) — separate PR if/when Aura Home adopts.
- Performance hardening pass on the predictive-search SDK boot path (preconnect, lazy load on first interaction) — separate PR after baseline behaviour is verified in dev.
- Documenting a starter-extension pattern (candidate `extension-tagalys-cards` repo) — separate KB write-up.

---

## Context & Research

### Relevant Code and Patterns

- `blocks/_product-card.liquid` + `blocks/product-card.liquid` + `snippets/product-card.liquid` — the canonical product card. The block pulls in five style snippets (`buy-buttons-styles`, `gift-card-recipient-form-styles`, `quick-add-styles`, `quick-add-modal-styles`, `product-badges-styles`). Reuse via `{% content_for 'block', type: '_product-card', id: 'product-card', closest.product: product %}` — never clone the markup.
- `sections/main-collection.liquid:45-69` — collection grid uses `collection.products` directly inside `{% paginate %}` and renders `_product-card` per product (line 56).
- `sections/twp-collection-heading.liquid` — owns title, breadcrumb, pre-title, description, collection image. This (not main-collection) is where `primary_collection` should be wired for A/B test variants.
- `sections/search-results.liquid:48` — search results page renders `_product-card` per product. Same swap seam as collection.
- `snippets/search-modal.liquid` (rendered globally from `layout/theme.liquid:135`) — wraps `<dialog-component id="search-modal">` containing `<predictive-search-component>` with refs `searchInput` and `predictiveSearchResults`.
- `assets/predictive-search.js:283,313-339` — `PredictiveSearchComponent` extends `Component`, debounces at 200ms, and calls `sectionRenderer.getSectionHTML(this.dataset.sectionId, false, url)` then `morph(predictiveSearchResults, resultsMarkup)`. This is the established Section Rendering API + morph swap pattern — Tagalys swap mounts at the same seam.
- `snippets/meta-tags.liquid:117-120` — only `<link rel="canonical">` location; replaced by `tagalys-ab-testing` snippet's `canonical_url` call when A/B testing is enabled.
- `sections/main-cart.liquid` — already exposes a `{% content_for 'blocks' %}` zone (`.cart-page__more-blocks`); cart upsell drops in there via the editor.
- `config/settings_schema.json` — currently 19 array entries (17 named groups); Tagalys becomes the 20th entry / 18th named group.
- `layout/theme.liquid:28,41,135,140` — `meta-tags` render at line 28, `content_for_header` at line 41, `search-modal` at line 135, `</body>` at line 140.
- `.shopifyignore` — excludes `config/settings_data.json`, `layout/*.json`, `sections/*.json`, `templates/*.json` from CLI pushes. Tagalys settings live in `settings_schema.json` (pushed) but per-store data lives in `settings_data.json` (set via Shopify admin per store).
- `.cursor/rules/` (47 standards files including `product-card-accessibility.mdc`, `snippets.mdc`, `blocks.mdc`) — canonical reference during implementation.
- LiquidDoc convention: 97/108 snippets carry `{% doc %}` headers — mandatory per project CLAUDE.md.

### Institutional Learnings

- **Nosto Dynamic Cards on Horizon perform poorly** — Pedal & Pup, Japanese Taste, Daitool found per-tile theme-card fetch costs ~3s LCP minimum on Horizon. Multiple clients are rolling back. Confirmed by KB notes at `~/business/claude-code-kb/.../meetings/2025-12-10-technical-scoping-website-performance-audit/summary.md` and adjacent meeting notes. The chosen strategy here (Native mode for collections + CSS-skin for SDK surfaces) sidesteps this risk because there is no per-tile fetch.
- **Prettier corrupts Liquid** — `@shopify/prettier-plugin-liquid` collapses `{% liquid %}` blocks, reformats `{% schema %}` JSON, and breaks `{% style %}` whitespace, causing Shopify to reject pushes. Caused 8-file corruption on Blue Bungalow. Add `**/*.liquid` to `.prettierignore` before pulling starter files in. (KB: `learnings/prettier-liquid-corruption.md`)
- **Predictive search swap is patch-based for Horizon** — Horizon's predictive search lives in static private blocks (`_search-input`, `predictive-search-component`). Patching pattern: extend the existing `Component` subclass via `customElements.define` for a sibling element, don't redefine the existing one. (KB: `patterns/horizon-extension-patterns.md`)
- **CSS source-position gotcha** — Shopify's snippet `{% style %}` deduplicates into `<head>`; section `{% stylesheet %}` renders inline in body and wins on equal specificity. Pre-flight any Tagalys CSS overrides in real DevTools with the actual SDK loaded. (KB: `learnings/shopify-style-block-source-order.md`)
- **Per-brand credentials** — starter is brand-agnostic; Linen House and Aura Home each populate `settings_data.json` per-store via Shopify admin. Never share API keys across brands.
- **Existing TWP Tagalys delivery instances**: Pleasure State, Black Milk, Blue Bungalow, Bissell, Rose Bullet, Swimwear Galore. Recommend a 30-min KT call with Lee Renton (Tagalys delivery manager) before implementation start.
- **Existing discovery doc** at `docs/07-integrations/search-merch/INT-07-search-merch.md` lists Tagalys as Option B alongside SearchSpring; update post-merge.

### External References

- [Tagalys UI Widgets v3.0.8 SDK source](https://storage.googleapis.com/tagalys-public-assets/tagalys-ui-widgets-3.0.8.min.js) — only authoritative source for the v3 API surface (no public dev reference doc exists).
- [Tagalys Server-Side Integration](https://www.tagalys.com/features/server-side-integration) — confirms Native mode renders via host theme.
- [Tagalys integration types](https://support.tagalys.com/types-of-integrations-methods)
- [Shopify Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [W3C ARIA APG Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — accessibility contract for the predictive search swap.
- [Klevu predictive search accessibility](https://www.klevu.com/blog/creating-an-optimal-shopify-plus-search-experience-usability-accessibility-ux/) — third-party-search accessibility pitfalls (most fail audits without explicit ARIA wiring).

---

## Key Technical Decisions

- **Master switch reuses `settings.tagalys_enabled`** — no second top-level flag. Every Tagalys surface gates on this plus its feature-specific toggle. Rationale: starter snippets already check this; second flag would be redundant and risk drift.
- **Collection pages use Tagalys Native (server-side) mode for product card parity** — Tagalys writes Shopify's manual sort order; theme renders the grid with its own `_product-card`. 1:1 parity, no SDK tiles, no per-tile fetch performance risk. Rationale: Tagalys SDK v3 has no dynamic-card / template-string mechanism (confirmed by reading the SDK binary), and Horizon-on-Nosto-Dynamic-Cards has documented LCP problems.
- **Search results, predictive dropdown, recommendations, cart upsell rendered by Tagalys SDK and skinned via `assets/tagalys-skin.css`** — single shared stylesheet using Horizon's CSS custom properties (`var(--color-foreground)`, `var(--color-background)`, `var(--color-primary)`, etc.) so brand colour schemes apply automatically. Rationale: SDK is Preact-based with no template hook; CSS is the only viable customisation path. Horizon's scheme tokens make per-brand parity automatic without conditionals.
- **Predictive-search swap uses hijack-on-ready pattern, not full replacement** — leave native `<predictive-search-component>` mounted and toggle `data-search-provider="tagalys|native|loading"` on the search modal; CSS gate hides whichever is inactive. On SDK init success, Tagalys takes over; on failure or timeout, native takes over. Rationale: zero-friction fallback when Tagalys SDK fails to load, preserves Horizon's accessibility and keyboard behaviour, avoids `customElements.define` collisions.
- **Predictive-search Tagalys widget = `Tagalys.UIWidgets.ShopifySearchSuggestions`** mounted via `templates.widget.options.selector` into the existing `predictiveSearchResults` ref container in `snippets/search-modal.liquid`. Init once on first modal open (no documented `destroy()`); subsequent opens reuse the live widget instance.
- **Search results page wraps `sections/search-results.liquid`'s `{% paginate %}` block conditionally** — preserves `<results-list>` wrapper and skip-link parity; on Tagalys-active path, renders the starter's `tagalys-search` widget container in place of the paginated grid.
- **Collection-heading `primary_collection` wires into `sections/twp-collection-heading.liquid`, NOT `main-collection`** — the heading section owns title/description/breadcrumb/image. Main-collection keeps using `collection.products` for the grid.
- **Cart upsell drops into existing `{% content_for 'blocks' %}` zone in `main-cart.liquid` via the theme editor** — no `templates/cart.json` edits required. The starter section's `enabled_on: ["cart"]` already restricts placement.
- **Snippet/section naming follows starter `tagalys-*` prefix**, not `twp-tagalys-*` — keeps starter pack files identical for easier upstream sync if the starter is updated. Internal blocks/components use the project's `_`-prefix convention where appropriate.
- **`{% doc %}` headers on every new snippet and statically-rendered block**, replacing the starter's `{% comment %}` headers — matches project convention (97/108 existing snippets follow this).
- **Predictive-search debounce stays at 200ms** (Horizon's existing value), not the 300ms suggested by best-practices research — match the surrounding code's UX baseline.
- **`window.tagalysDisableLegacyScript = true`** stays as the starter sets it — disables the legacy jQuery template hook that no longer applies to v3.

---

## Open Questions

### Resolved During Planning

- **Does Tagalys SDK v3 support a Nosto-Dynamic-Cards-style mechanism?** Resolved: No. Confirmed by reading the v3.0.8 SDK binary directly. No `?view=` fetch hook, no template-string engine, no `productCard` config, no async tile renderer. The legacy jQuery `tagalys_templates.product_tile` hook is disabled by `window.tagalysDisableLegacyScript = true`. Parity strategy = Native mode (collections) + CSS skin (SDK surfaces).
- **What's the predictive-search widget API?** Resolved: `Tagalys.UIWidgets.ShopifySearchSuggestions.init(selector, config)`; accepts `templates.widget.options.selector` to render into a host container; no widget ID required (dashboard-configured); init once per page.
- **Where does `primary_collection` get wired?** Resolved: `sections/twp-collection-heading.liquid` (the heading section), not `sections/main-collection.liquid` (which owns only the grid).
- **Do we need to edit `templates/cart.json`?** Resolved: No. `sections/main-cart.liquid` exposes a `{% content_for 'blocks' %}` zone where the cart upsell block drops in via the editor.
- **Is there an alternate `templates/product.card.liquid` we can mirror?** Resolved: No — none exists. We will create `sections/tagalys-product-card.liquid` only if a future surface requires per-product card fetching; current scope does not need it.

### Deferred to Implementation

- **Exact CSS class names emitted by Tagalys SDK Preact widgets** — must enumerate at runtime in the dev store with `?preview_theme_id=154225541293`; not in any public Tagalys doc.
- **Final list of product metafields surfaced to `setPlatformConfiguration.metafields.products`** — depends on which card features (badges, ratings, swatch hex codes) appear on parity-critical surfaces; identify during U9 implementation.
- **Whether `ShopifySearchSuggestions.templates.widget.options.sections` config requires bespoke shape for products + popular-searches + recent-searches sections** — confirm via runtime testing; SDK source documented the surface but not all option permutations.
- **Whether the starter's `metafields.products: []` placeholder actually accepts the `[{ namespace, key }]` shape in v3.0.8** as documented in the starter — verify on first dev-store boot.
- **Whether any existing Horizon-shipped dependent style snippet (`buy-buttons-styles`, `quick-add-styles`, etc.) leaks selectors that conflict with Tagalys's emitted DOM** — flag at CSS-skin authoring time.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Shopify admin (per store)                          │
│   Linen House: settings.tagalys_enabled = true   credentials filled in     │
│   Aura Home:   settings.tagalys_enabled = false  credentials blank         │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                            (settings_data.json per store, NOT pushed via CLI)
                                       │
┌──────────────────────────────────────▼─────────────────────────────────────┐
│                         layout/theme.liquid <head>                          │
│   1. tagalys-ab-testing call:'script'   (synchronous, FOUC guard)          │
│   2. tagalys-ab-testing call:'canonical_url'  (replaces native canonical)  │
│   3. tagalys-config                      (defer'd SDK + setConfiguration)  │
│   ────────────────────────────────────────────────────────────────────     │
│                       layout/theme.liquid </body>                           │
│   4. tagalys-analytics                   (manual page-level events)        │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼─────────────────────────────────┐
        │                              │                                 │
        ▼                              ▼                                 ▼
┌──────────────────┐  ┌──────────────────────────┐  ┌────────────────────────────┐
│   Collection     │  │      /search & search    │  │   Recommendations & cart    │
│      pages       │  │         modal            │  │           upsell            │
│                  │  │                          │  │                            │
│  Native mode →   │  │  search-results.liquid:  │  │  Tagalys SDK widgets render │
│  Tagalys writes  │  │   tagalys_enabled &&     │  │  into <div data-tagalys-   │
│  Shopify manual  │  │   tagalys_search_enabled │  │   widget="..."> containers  │
│  sort order;     │  │   ? tagalys-search       │  │                            │
│  theme renders   │  │   : native paginate      │  │  Visual parity via         │
│  _product-card   │  │                          │  │  assets/tagalys-skin.css   │
│  grid as today.  │  │  search-modal.liquid:    │  │  using Horizon CSS tokens. │
│                  │  │   data-search-provider=  │  │                            │
│  twp-collection- │  │   "loading|tagalys|      │  │  Fallback grids (when      │
│  heading uses    │  │    native"; CSS gate     │  │  tagalys_enabled=false)    │
│  primary_        │  │   hides whichever is     │  │  render _product-card      │
│  collection for  │  │   inactive.              │  │  via content_for block.    │
│  title/SEO.      │  │                          │  │                            │
│                  │  │  ShopifySearchSuggestions│  │                            │
│                  │  │  mounts into existing    │  │                            │
│                  │  │  predictiveSearchResults │  │                            │
│                  │  │  ref on first open.      │  │                            │
└──────────────────┘  └──────────────────────────┘  └────────────────────────────┘
```

Predictive-search hijack-on-ready state machine:

```
  initial: data-search-provider="loading"  ← CSS hides both native + tagalys
              │
              ├── Tagalys SDK ready + init succeeds (within 2s timeout)
              │       └──→ "tagalys"   ← CSS shows tagalys mount, hides native
              │
              ├── Tagalys SDK fails or times out
              │       └──→ "native"    ← CSS shows native predictive, hides tagalys
              │
              └── settings.tagalys_predictive_search_enabled = false
                      └──→ "native"    ← initial state set server-side
```

---

## Implementation Units

- U1. **Repo pre-flight: Liquid prettier ignore + worktree hygiene**

**Goal:** Prevent `@shopify/prettier-plugin-liquid` from corrupting starter files when they're pulled in.

**Requirements:** R1 (no regression), prerequisite for U3.

**Dependencies:** None.

**Files:**
- Modify: `.prettierignore` (add `**/*.liquid` if not already excluded)
- Modify: `.husky/*` or `package.json` (audit only — confirm no `lint-staged` / Husky hook runs prettier on `.liquid`)
- Test: none — manual verification after editing a `.liquid` file with prettier disabled

**Approach:**
- Read the existing `.prettierignore` and `.twp/config/.prettierrc*` to confirm scope
- Add `**/*.liquid` if missing
- Audit `package.json` scripts and any `.husky/` hooks; if a hook runs prettier on `.liquid`, scope it to non-liquid files

**Patterns to follow:**
- Existing entries in `.prettierignore`
- KB learning at `learnings/prettier-liquid-corruption.md` (Blue Bungalow incident)

**Test scenarios:**
- *Test expectation: none — pure tooling configuration with no runtime behaviour. Verify by editing a `.liquid` file and confirming prettier does not modify it.*

**Verification:**
- Running `pnpm prettier --check '**/*.liquid'` (or equivalent) reports no targets, or running `pnpm prettier --write` on a liquid file produces no changes.

---

- U2. **Settings schema: Tagalys group + predictive-search toggle + translations**

**Goal:** Add the Tagalys settings group to `config/settings_schema.json` with the predictive-search checkbox, plus English schema translations.

**Requirements:** R1, R2, R3, R7.

**Dependencies:** None.

**Files:**
- Modify: `config/settings_schema.json` (append the Tagalys group as new array entry — currently 19 entries, becomes 20)
- Modify: `locales/en.default.schema.json` (add `t:names.tagalys`, `t:settings.tagalys.*`, `t:content.tagalys.*`)
- Reference: `tagalys-starter/settings_schema.tagalys.json` (copy verbatim, then append `tagalys_predictive_search_enabled` and `tagalys_predictive_min_chars`)
- Test: none — schema-only

**Approach:**
- Append the starter's settings group as the 20th array entry in `settings_schema.json`. Use translation keys (`t:names.tagalys`, `t:settings.tagalys.<id>.label`, etc.) rather than the starter's hardcoded English labels, matching the project convention
- Add inside the Tagalys group, immediately after `tagalys_no_results_limit`:
  - `{ type: "checkbox", id: "tagalys_predictive_search_enabled", label: "t:settings.tagalys.predictive_search_enabled.label", default: false, info: "..." }`
  - `{ type: "range", id: "tagalys_predictive_min_chars", label: "...", min: 1, max: 5, step: 1, default: 2, info: "..." }`
- Add corresponding entries in `locales/en.default.schema.json` keeping max 3 levels deep per project convention
- Confirm the data file (`config/settings_data.json`) is excluded from CLI pushes via `.shopifyignore` so per-store admin values are not overwritten

**Patterns to follow:**
- `config/settings_schema.json` existing groups for translation-key shape and option enums
- `locales/en.default.schema.json` existing namespaces (e.g. `cart`, `search`)
- `.cursor/rules/theme-settings.mdc`, `.cursor/rules/locales.mdc`

**Test scenarios:**
- Happy path: Shopify CLI `theme check` passes after schema additions
- Happy path: pushing the theme to dev store displays the new "Tagalys Integration" group in Theme Settings with all fields and translated labels
- Edge case: enabling `tagalys_predictive_search_enabled` with `tagalys_enabled = false` does NOT render any Tagalys predictive markup (gate is `enabled && predictive_enabled`)
- Edge case: pushing the theme does not overwrite per-store `settings_data.json` (confirm `.shopifyignore` honoured)

**Verification:**
- `shopify theme check` passes; theme editor shows the Tagalys group; switching `tagalys_enabled` flips visibility of dependent settings (info text accuracy).

---

- U3. **Copy and adapt starter snippets into theme**

**Goal:** Install the five Tagalys snippets (`tagalys-config`, `tagalys-ab-testing`, `tagalys-primary-collection`, `tagalys-analytics`, `tagalys-search`) and convert their `{% comment %}` headers to project-standard `{% doc %}` headers.

**Requirements:** R1, R5, R6.

**Dependencies:** U1 (prettier ignore prevents corruption), U2 (settings group exists so snippets' `settings.tagalys_*` references resolve).

**Files:**
- Create: `snippets/tagalys-config.liquid`
- Create: `snippets/tagalys-ab-testing.liquid`
- Create: `snippets/tagalys-primary-collection.liquid`
- Create: `snippets/tagalys-analytics.liquid`
- Create: `snippets/tagalys-search.liquid`
- Test: none — wired up in U4/U5/U6/U7

**Approach:**
- Copy each starter snippet verbatim
- Replace each opening `{% comment %} ... {% endcomment %}` header with a `{% doc %}` header carrying `@param` (where applicable) and `@example` per project convention
- Keep `<!-- ADAPT: ... -->` markers intact so future maintainers can spot customisation points
- Keep `window.tagalysDisableLegacyScript = true` and the `defer` SDK script tag as the starter has them

**Patterns to follow:**
- `{% doc %}` header convention from `snippets/product-card.liquid`, `snippets/predictive-search-products-list.liquid`
- `{% # theme-check-disable RemoteAsset %}` pragmas from the starter for the GCS-hosted SDK URL

**Test scenarios:**
- Happy path: `shopify theme check` passes after copy
- Happy path: each snippet is documented (LiquidDoc lint clean)
- Edge case: Tagalys disabled — `tagalys-config` renders no `<script>` tags, `tagalys-analytics` renders nothing
- Edge case: A/B testing disabled but `tagalys_enabled` true — `tagalys-ab-testing` `call: 'canonical_url'` outputs the standard canonical, not the rewritten variant

**Verification:**
- All five files exist with valid `{% doc %}` headers; `shopify theme check` passes; rendering the snippets in isolation (via a test template if needed) confirms output matches expected gates.

---

- U4. **Wire `theme.liquid` and replace canonical in `meta-tags.liquid`**

**Goal:** Add the three Tagalys render tags in starter-prescribed order and conditionally remove the existing canonical tag.

**Requirements:** R1, R5, R6.

**Dependencies:** U3.

**Files:**
- Modify: `layout/theme.liquid` (insert two ab-testing renders + config render in `<head>`; analytics render before `</body>`)
- Modify: `snippets/meta-tags.liquid` (wrap existing `<link rel="canonical">` at lines 117-120 in `unless settings.tagalys_enabled and settings.tagalys_ab_testing_enabled`)
- Test: none — verified at U10 testing checklist

**Approach:**
- In `layout/theme.liquid`, immediately after the opening `<head>` block (before any other render tags), insert:
  ```liquid
  {% render 'tagalys-ab-testing', call: 'script' %}
  ```
- Move the canonical-tag responsibility out of `meta-tags.liquid` and into the ab-testing snippet on collection pages: in `meta-tags.liquid`, wrap the existing `<link rel="canonical">` block in `{% unless settings.tagalys_enabled and settings.tagalys_ab_testing_enabled %}...{% endunless %}` so it still renders when Tagalys A/B is off; the ab-testing snippet's `call: 'canonical_url'` already outputs a standard canonical when A/B is on but `request.page_type != 'collection'`
- After `meta-tags` render in `theme.liquid` (or in a position consistent with the head order), insert:
  ```liquid
  {% render 'tagalys-ab-testing', call: 'canonical_url' %}
  ```
- Before `{{ content_for_header }}` (line 41), insert:
  ```liquid
  {% render 'tagalys-config' %}
  ```
- Before the closing `</body>` tag (line 140), insert:
  ```liquid
  {% render 'tagalys-analytics' %}
  ```

**Patterns to follow:**
- Existing `{% render 'meta-tags' %}` and `{% render 'scripts' %}` placement at lines 28-31
- `{% # theme-check-disable RemoteAsset %}` style — already used at line 17

**Test scenarios:**
- Happy path: with `tagalys_enabled = true`, collection page emits the Tagalys ab-testing canonical (rewriting variant URLs) and no native canonical
- Happy path: with `tagalys_enabled = false`, collection page emits the native `<link rel="canonical">` from `meta-tags.liquid` and no Tagalys script tags
- Edge case: with `tagalys_enabled = true` and `tagalys_ab_testing_enabled = false`, the ab-testing snippet emits the standard canonical (its else branch) — verify only ONE canonical is emitted (no double canonicals)
- Edge case: with `tagalys_enabled = true` on a non-collection page (PDP, blog), the ab-testing canonical_url call outputs the standard canonical without rewriting
- Error path: SDK URL unreachable — `tagalys-config` still renders the script tag (browser will 404 quietly), `onTagalysReady` never fires, dependent widgets never init; native fallbacks remain visible

**Verification:**
- View source on collection, search, product, blog pages with Tagalys ON and OFF; confirm exactly one `<link rel="canonical">` per page in each combination.

---

- U5. **Wire `primary_collection` into `twp-collection-heading.liquid`**

**Goal:** Make collection title, breadcrumb, description, and image use `primary_collection` (the Tagalys A/B test parent) so SEO surfaces remain stable across A/B variants.

**Requirements:** R6, R8.

**Dependencies:** U3, U4.

**Files:**
- Modify: `sections/twp-collection-heading.liquid`
- Test: none — manual SEO inspection

**Approach:**
- At the top of the section's Liquid block, add `{% render 'tagalys-primary-collection' %}` to populate `primary_collection`
- Replace each direct `closest.collection` / `collection` reference for title/description/image/breadcrumb/metafield reads with `primary_collection`
- Leave any references that drive the product grid alone (the grid lives in `main-collection.liquid` and stays on `collection`)
- Verify `closest.collection` references are correctly substituted — the section uses both `closest.collection.title` and `closest.collection.metafields.custom.title_image` etc.

**Patterns to follow:**
- Existing usage of `closest.collection.*` in `sections/twp-collection-heading.liquid`
- The `tagalys-primary-collection` snippet's documented contract (sets `primary_collection` = same as `collection` when Tagalys/AB are off)

**Test scenarios:**
- Happy path: with Tagalys + A/B both enabled and an A/B variant collection visited, the heading shows the parent collection's title/description/image (not the variant's)
- Happy path: with Tagalys disabled, `primary_collection == collection` and behaviour is identical to today
- Edge case: collection has no title_image metafield — falls back to text title without errors
- Edge case: visiting a non-A/B collection with Tagalys + A/B enabled — `primary_collection == collection`, no rewrites occur
- Integration: breadcrumb URL points to the parent collection's handle, not the variant's

**Verification:**
- Snapshot view-source on a current collection page before and after; diff the heading section's HTML; confirm only Tagalys A/B variant collections see different title/description (and only when A/B is on).

---

- U6. **Wrap `search-results.liquid` paginate block conditionally**

**Goal:** Replace the native search results grid with the Tagalys search widget when `tagalys_enabled && tagalys_search_enabled` are both true.

**Requirements:** R1, R5.

**Dependencies:** U3.

**Files:**
- Modify: `sections/search-results.liquid` (wrap the `{% paginate %}` block beginning around line 24)
- Test: none — manual smoke

**Approach:**
- Wrap the existing `{% paginate search.results by products_per_page %}...{% endpaginate %}` block (lines ~24-69) in a top-level conditional:
  ```liquid
  {% if settings.tagalys_enabled and settings.tagalys_search_enabled %}
    {% render 'tagalys-search' %}
  {% else %}
    {% paginate search.results by products_per_page %}
      ...existing content...
    {% endpaginate %}
  {% endif %}
  ```
- Keep the outer `<results-list>` web component wrapper, skip-link render, section-background, and the `<div class="collection-wrapper grid gap-style">` — these provide spacing and accessibility chrome that should remain regardless of provider
- Pass `data-page-size` from `section.settings.products_per_page` into the Tagalys mount so the SDK respects the merchant-configured grid density

**Patterns to follow:**
- Conditional swap pattern from the starter's INTEGRATION-GUIDE.md Step 5
- Existing skip-link + `<results-list>` chrome in this section

**Test scenarios:**
- Happy path: `tagalys_enabled = true && tagalys_search_enabled = true` — renders the `<div data-tagalys-widget="search-results">` mount; SDK populates results
- Happy path: `tagalys_search_enabled = false` — renders native search results unchanged
- Edge case: search query returns zero results with Tagalys enabled and `tagalys_no_results_widget_id` set — renders the no-results widget with `data-no-results-widget` attribute
- Edge case: search results page reached via filter URL params — Tagalys widget receives the query
- Integration: search-header section above (`sections/search-header.liquid`) and skip-link target work in both branches

**Verification:**
- Visit `/search?q=linen` with Tagalys ON and OFF; confirm in DOM which results path renders; confirm the skip-link still targets `#ResultsList`.

---

- U7. **Tagalys predictive-search swap (hijack-on-ready)**

**Goal:** When `tagalys_enabled && tagalys_predictive_search_enabled`, replace native predictive search results inside the existing search modal with `Tagalys.UIWidgets.ShopifySearchSuggestions`. Preserve native fallback on SDK failure or feature-disable.

**Requirements:** R1, R3, R4, R5.

**Dependencies:** U3, U4.

**Files:**
- Create: `snippets/tagalys-predictive-search.liquid` (Tagalys mount markup + skin gate)
- Create: `assets/tagalys-predictive-search.js` (Component subclass; init-once; AbortController; ARIA)
- Modify: `snippets/search-modal.liquid` (add Tagalys mount sibling next to native predictive search, set `data-search-provider="loading"` initial state)
- Modify: `assets/predictive-search.js` (gate the existing native fetch behind `data-search-provider !== "tagalys"`; set provider to `"native"` on SDK failure / when disabled)
- Test: none — manual smoke + DevTools verification

**Approach:**
- New snippet `snippets/tagalys-predictive-search.liquid` renders a sibling container next to `<predictive-search-component>` in the modal:
  ```
  <tagalys-predictive-search
    data-section-id="..."
    data-min-chars="{{ settings.tagalys_predictive_min_chars }}"
    role="region" aria-live="polite">
    <div class="tagalys-predictive-results"></div>
  </tagalys-predictive-search>
  ```
- New component `assets/tagalys-predictive-search.js` extends `Component`; on first `connectedCallback` after modal-open + first user input, calls `Tagalys.UIWidgets.ShopifySearchSuggestions.init('#predictive-search-input', { templates: { widget: { options: { selector: '.tagalys-predictive-results', alignToSelector: false, minimumCharactersToShowSuggestions: <setting>, onSearchSubmit } } } })`
- On init success, set `searchModal.dataset.searchProvider = 'tagalys'`
- Wrap init in a 2-second timeout; on failure or timeout, set `searchProvider = 'native'` and let the existing `PredictiveSearchComponent` handle keystrokes
- CSS gate (in the new snippet's `{% stylesheet %}`):
  ```
  [data-search-provider="loading"] tagalys-predictive-search,
  [data-search-provider="loading"] predictive-search-component { visibility: hidden; }
  [data-search-provider="tagalys"] predictive-search-component { display: none; }
  [data-search-provider="native"] tagalys-predictive-search { display: none; }
  ```
- Modify `search-modal.liquid` to add `data-search-provider="{% if settings.tagalys_enabled and settings.tagalys_predictive_search_enabled %}loading{% else %}native{% endif %}"` on the dialog wrapper and conditionally include the new snippet
- In `assets/predictive-search.js`, modify `#getSearchResults` (line 313) to bail early when the modal's `data-search-provider === 'tagalys'`
- Maintain ARIA combobox/listbox roles on the Tagalys mount: `role="combobox"` on the input (Horizon already sets this; verify), `role="listbox"` on the Tagalys results container, live region announcing result count after `afterEveryRender` callback fires
- Keyboard nav: ArrowDown/ArrowUp/Enter/Escape continue to work via native form behaviour; if Tagalys widget owns its own internal keyboard handling, document the divergence and add focus management on Escape

**Patterns to follow:**
- `Component` base class pattern from `assets/component.js` and existing extensions like `assets/predictive-search.js`
- Section Rendering API + `morph()` pattern (already used in native predictive search) — Tagalys uses its own DOM, so `morph` is not invoked here, but the data-section-id plumbing is similar
- Hijack-on-ready pattern from KB `patterns/horizon-extension-patterns.md`
- `.cursor/rules/product-card-accessibility.mdc` for ARIA conventions

**Test scenarios:**
- Happy path: open search modal with Tagalys ON, type "linen" — Tagalys suggestions render in `.tagalys-predictive-results`, native predictive container is hidden
- Happy path: with Tagalys OFF, native predictive renders unchanged with 200ms debounce
- Edge case: modal opened, user types before Tagalys SDK finishes loading — `data-search-provider="loading"` hides both; once SDK fires ready, Tagalys appears (no flash of native)
- Error path: SDK fails to load (404, blocked) — after 2s timeout, `data-search-provider` flips to `"native"`; native predictive fetches results normally
- Error path: SDK loads but `Tagalys.UIWidgets.ShopifySearchSuggestions.init` throws — caught, error logged, fallback to `"native"`
- Edge case: `tagalys_predictive_search_enabled = false` but `tagalys_search_enabled = true` — predictive uses native, `/search` results page uses Tagalys
- Integration: ARIA combobox/listbox roles announced correctly via VoiceOver / screen reader; result count live-region updates as user types
- Integration: closing the modal and reopening reuses the same widget instance (no double-init, no listener leak)
- Integration: clicking a Tagalys suggestion navigates to the product page; submitting the form (Enter on input with no suggestion selected) navigates to `/search?q=...`

**Verification:**
- DevTools network tab shows Tagalys SDK request and exactly one `init` call across multiple modal opens; data-search-provider flips correctly under all four states (loading/tagalys/native/disabled); accessibility tree shows correct combobox/listbox roles with VoiceOver enabled.

---

- U8. **Copy and adapt recommendations + cart upsell sections**

**Goal:** Install the two starter sections, override their fallback grids to render the theme's `_product-card` block (instead of the starter's minimal markup), and add `{% doc %}` headers.

**Requirements:** R1, R4, R5.

**Dependencies:** U3.

**Files:**
- Create: `sections/tagalys-recommendations.liquid` (copy from starter, modify fallback grid)
- Create: `sections/tagalys-cart-upsell.liquid` (copy from starter, no fallback grid needed — cart is always present)
- Test: none — manual smoke

**Approach:**
- Copy `tagalys-recommendations.liquid` from starter
- Replace the starter's fallback grid (the `<!-- ADAPT: fallback_product_card -->` block, lines ~50-68) with a loop that calls `_product-card`:
  ```liquid
  {%- for product in fallback_collection.products limit: product_limit -%}
    {% content_for 'block', type: '_product-card', id: 'fallback-product-card-{{ forloop.index }}', closest.product: product %}
  {%- endfor -%}
  ```
- Wrap the loop in the existing `<div class="tagalys-recommendations__grid">` for consistency
- Convert `{% comment %}` header to `{% doc %}` header
- Copy `tagalys-cart-upsell.liquid` verbatim with `{% doc %}` header
- Both sections keep their `enabled_on` schemas (`templates: ["*"]` for recommendations, `templates: ["cart"]` for cart upsell)

**Patterns to follow:**
- `_product-card` invocation pattern from `sections/main-collection.liquid:56` and `sections/search-results.liquid:48`
- Theme-check-disable pragma for `UniqueStaticBlockId` — see `sections/search-results.liquid:55-57`

**Test scenarios:**
- Happy path: Tagalys ON — recommendations section renders `<div data-tagalys-widget="..." />` mount; SDK populates
- Happy path: Tagalys OFF + `fallback_collection` set — renders the configured collection's products via `_product-card` (matches theme product card exactly)
- Happy path: cart upsell with Tagalys ON renders the cart upsell mount; with Tagalys OFF renders nothing
- Edge case: recommendations section with Tagalys OFF and no `fallback_collection` configured — section renders empty (no errors)
- Edge case: cart upsell on a non-cart template — section's `enabled_on: ["cart"]` blocks merchant from adding it
- Integration: fallback grid uses the same product card markup as the main collection grid (visual diff = zero)

**Verification:**
- Add the recommendations section to the homepage via theme editor; toggle Tagalys ON/OFF; confirm fallback grid product card markup is identical to a collection page card; cart upsell appears in the cart-page block zone.

---

- U9. **Author `tagalys-skin.css` for SDK-rendered tile parity**

**Goal:** Style Tagalys's Preact-rendered product tiles (search results, recommendations, cart upsell, predictive dropdown) to visually match the existing Linen House product card using Horizon's CSS custom properties.

**Requirements:** R4.

**Dependencies:** U3, U6, U7, U8 (need the live SDK rendering somewhere to enumerate emitted DOM).

**Files:**
- Create: `assets/tagalys-skin.css`
- Modify: `snippets/tagalys-config.liquid` (add `<link rel="stylesheet" href="{{ 'tagalys-skin.css' | asset_url }}">` conditional on `tagalys_enabled` so the skin loads only when needed)
- Optionally modify: `snippets/tagalys-config.liquid` `metafields.products` block to surface badge/swatch/review metafields needed for parity
- Test: none — visual parity verified manually + screenshot diff

**Approach:**
- **Pre-flight in DevTools:** boot the SDK on the dev store with the recommendations section visible. Inspect the emitted Preact DOM and enumerate exact class names. Document the class map at the top of `tagalys-skin.css`
- Author CSS using Horizon tokens only — `var(--color-foreground)`, `var(--color-background)`, `var(--color-primary)`, `var(--style-border-radius-popover)`, `var(--font-size--*)`, `var(--padding-*)`, etc. — so brand colour schemes apply automatically
- Match the theme product card on: typography hierarchy (title/price), aspect ratio of media, badge placement, swatch row layout, hover/focus states (within reach of Tagalys's emitted DOM), spacing tokens
- Identify product metafields needed for parity (e.g. `badge.label`, `custom.swatch_codes`, review summary) and add them to `setPlatformConfiguration.metafields.products` in `tagalys-config.liquid`
- Acknowledge in CSS comments that hover/animation parity is best-effort given SDK constraints; full parity may require lifecycle-callback DOM mutation (deferred)
- Validate the cascade in DevTools per KB learning `learnings/shopify-style-block-source-order.md` — inject test `<style>` tags into the live page mix to confirm overrides hold against Tagalys's own CSS

**Patterns to follow:**
- Existing per-snippet `{% stylesheet %}` blocks for Horizon scheme consumption
- `assets/critical.css` or `snippets/predictive-search-styles.liquid` for global asset CSS shape

**Test scenarios:**
- Happy path: side-by-side screenshots of Linen House product card on a collection grid vs. Tagalys-rendered tile in a recommendations widget — visual parity at standard sizes (mobile + desktop) within reasonable tolerance
- Happy path: switching colour schemes (e.g. dark scheme on a section) — Tagalys tiles inherit `var(--color-*)` and re-render correctly
- Edge case: tile with no badge/swatch — renders cleanly without empty placeholders
- Edge case: long product titles — truncate with ellipsis matching native card
- Edge case: out-of-stock product — visual signal matches native card's treatment
- Integration: Aura Home (when Tagalys is later enabled there) inherits brand-appropriate tokens automatically with zero CSS changes — confirmed by inspecting `var(--color-*)` resolution under the Aura Home colour scheme
- Integration: search results, predictive dropdown, cart upsell, recommendations all use the same skin and look consistent across surfaces

**Verification:**
- Visual diff acceptable on Linen House dev store for all four surfaces; CSS file size <30KB; no `!important` overrides except where SDK inline styles force the issue (documented).

---

## System-Wide Impact

- **Interaction graph:**
  - `layout/theme.liquid` ← `tagalys-config`, `tagalys-ab-testing` (×2 calls), `tagalys-analytics` — every page on every store affected when `tagalys_enabled` is true
  - `snippets/meta-tags.liquid` ← canonical-tag conditional — every page's `<head>`
  - `assets/predictive-search.js` ← gate on `data-search-provider` — every search modal interaction
  - `sections/twp-collection-heading.liquid` ← `primary_collection` rewrite — every collection page heading
  - `sections/search-results.liquid` ← Tagalys-search wrap — every `/search` page
  - `sections/main-cart.liquid` ← merchant-added cart upsell block via existing zone — cart page only
- **Error propagation:**
  - SDK load failure → `onTagalysReady` never fires → all dependent widgets silently no-op → native fallbacks render where defined (predictive, recommendations); search results page falls back to native paginate (already conditional); collection grid is unaffected (Native mode = server-side)
  - `setConfiguration` / `setPlatformConfiguration` errors → caught by browser console only; the `Tagalys.UIWidgets.X.init` calls fail silently; CSS gate keeps `data-search-provider="loading"` until 2s timeout flips to native
- **State lifecycle risks:**
  - Predictive widget instance leaks if re-init runs on every modal open — guarded by init-once flag in component
  - Tagalys A/B testing redirect on collection pages may race with Shopify's own redirect handling on collection variant URLs — starter's pattern is proven on Swimwear Galore production; keep the synchronous script load
  - `settings_data.json` per-store is set via Shopify admin and is excluded from CLI pushes — risk of a credential being accidentally committed if a developer disables `.shopifyignore`. Document in PR description.
- **API surface parity:**
  - Tagalys `setPlatformConfiguration.metafields.products` parallels Shopify's metafield exposure; if the theme adds new product metafields elsewhere (e.g. swatch system), the Tagalys metafields config must be updated too
- **Integration coverage:**
  - Cross-layer: Horizon Component lifecycle × Tagalys init lifecycle × CSS gate state × accessibility roles. Manual cross-browser DevTools testing required for predictive swap
- **Unchanged invariants:**
  - `<product-card>` web component contract — Tagalys does not replace it; the theme's product card snippet remains canonical
  - Predictive search Section Rendering API path remains the documented native fallback
  - All existing collection/search/cart templates render identically when `tagalys_enabled = false`
  - `scripts/sync-figma-tokens.js` and brand token system unaffected — Tagalys CSS consumes existing tokens, no new tokens introduced
  - Theme push workflow unchanged — `shopify.toml` environments and `.shopifyignore` rules respected as today

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK class names change between v3 minor releases, breaking `tagalys-skin.css` | Medium | High | Pin SDK URL to specific version (`tagalys-ui-widgets-3.0.8.min.js`), document upgrade path in PR description, add a CSS comment with class enumeration timestamp |
| Predictive-search SDK init races with first user keystroke causing flash of native | Medium | Medium | CSS gate (`data-search-provider="loading"`) hides both states until SDK ready or 2s timeout |
| Per-tile metafield needs for parity exceed what `setPlatformConfiguration.metafields` supports in v3 | Low | Medium | Audit at U9; if metafield surface is too thin, use `afterEveryRender` lifecycle DOM mutation as last resort (deferred to follow-up if needed) |
| Native fallback on SDK failure misses some surfaces (e.g. cart upsell with no fallback) | Medium | Low | Cart upsell renders nothing on failure (acceptable); recommendations uses fallback collection; search results uses native paginate |
| `templates/cart.json` auto-regenerates when merchant edits in admin and removes the cart upsell block | Low | Low | Document that the block is editor-managed; include screenshot in PR description showing correct placement on dev store |
| Aura Home inadvertently inherits Tagalys CSS file when push hits Aura store | Low | Low | `tagalys-config` snippet's stylesheet `<link>` is gated on `settings.tagalys_enabled` — only loads on Linen House where the setting is true |
| Prettier hook outside `.prettierignore` corrupts a `.liquid` file mid-PR | Low | High | U1 audits for Husky/lint-staged hooks; PR template asks reviewer to verify no `.liquid` files were reformatted |
| A/B testing canonical-URL behaviour conflicts with Shopify's own canonical handling on alternate-handle collections | Low | Medium | Pattern is production-proven on Swimwear Galore; add manual smoke check across product, collection, search, blog, and homepage in U4 verification |
| Tagalys API/SDK rate limits hit during dev (test queries) | Low | Low | Coordinate with Tagalys solutions team during dev access; set `tagalys_enabled = false` on aura-home-dev to avoid double-counting traffic |

---

## Documentation / Operational Notes

- **PR description must include:**
  - Smoke-test checklist from starter `INTEGRATION-GUIDE.md` Step 9 (core, A/B, search, recommendations, cart upsell, markets), adapted with the new predictive-search and CSS-skin checks
  - Note on `.shopifyignore` and per-store `settings_data.json` workflow (admin sets credentials per store; CLI pushes never overwrite)
  - Note on Tagalys SDK version pin (`tagalys-ui-widgets-3.0.8.min.js`) and the upgrade workflow (re-pin URL + re-validate `tagalys-skin.css` against new SDK DOM)
- **Pre-merge:**
  - Push theme to `linen-house-dev` environment, set `tagalys_enabled = true` and credentials in admin
  - Run smoke checklist on dev store
  - Verify Aura Home dev push with `tagalys_enabled = false` shows zero behavioural change
  - Pre-flight `tagalys-skin.css` selectors in DevTools per KB `learnings/shopify-style-block-source-order.md`
- **Post-merge:**
  - Update `docs/07-integrations/search-merch/INT-07-search-merch.md` to record Tagalys as the chosen platform (deferred follow-up)
  - Capture A/B testing canonical-URL behaviour as a `docs/solutions/` learning post-launch (the KB has zero notes on this despite SWG running it in production)
  - Schedule 30-min KT call with Lee Renton (Tagalys delivery manager) before go-live to surface client-specific gotchas from Pleasure State / Blue Bungalow / Swimwear Galore
- **Rollout:**
  - Linen House: enable Tagalys credentials + `tagalys_enabled = true` in production admin once dev smoke passes
  - Aura Home: leave disabled
  - Monitor Core Web Vitals (LCP, INP) for 2 weeks post-launch; SDK is `defer`-loaded so LCP impact should be minimal

---

## Sources & References

- Tagalys starter pack: [the-working-party/tagalys-starter](https://github.com/the-working-party/tagalys-starter) (private)
- [Tagalys UI Widgets v3.0.8 SDK](https://storage.googleapis.com/tagalys-public-assets/tagalys-ui-widgets-3.0.8.min.js)
- [Tagalys Server-Side Integration](https://www.tagalys.com/features/server-side-integration)
- [Shopify Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [W3C ARIA APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- TWP KB: `~/business/claude-code-kb/notes/2026-03-16-tagalys-starter-reusable-theme-components.md`
- TWP KB: `~/business/claude-code-kb/learnings/prettier-liquid-corruption.md`
- TWP KB: `~/business/claude-code-kb/learnings/shopify-style-block-source-order.md`
- TWP KB: `~/business/claude-code-kb/patterns/horizon-extension-patterns.md`
- TWP KB: `~/business/claude-code-kb/.../meetings/2025-12-10-technical-scoping-website-performance-audit/summary.md` (Nosto Dynamic Cards LCP findings)
- Existing discovery doc: `docs/07-integrations/search-merch/INT-07-search-merch.md`
