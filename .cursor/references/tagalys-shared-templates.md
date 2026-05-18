# Tagalys shared UI templates

## `assets/tagalys-shared-templates.js`

- **`getSharedFiltersTemplate()`** — returns `{ options, render }` for the filters template override (collection + search).
- **`getSharedProductTemplate()`** — returns `{ render }` for recommendation (and any future) product tiles.
- Loaded **synchronously** from `snippets/tagalys-config.liquid` **before** the deferred Tagalys SDK script so widget `init` callbacks never run before the helper exists (two consecutive `defer` scripts would race: SDK exposes `Tagalys` before the shared file runs).

## Consumers

- `snippets/tagalys-collection.liquid` — `templates.filters` for `ShopifyCollection.init`.
- `snippets/tagalys-search.liquid` — `templates.filters` (+ optional `noResults`) for `SearchResults.init`.
- `sections/tagalys-recommendations.liquid` — `templates.product` for `Recommendations.init`.

Collection, search, and recommendations use the same init rhythm: named `init*` function, optional attach to `TagalysCustomisations`, `whenTagalysReady(init*)`, `const`/`let`.

## Editing UI

- Filter markup/options: change `getSharedFiltersTemplate` only; collection and search stay aligned.
- Recommendation product tiles: change `getSharedProductTemplate` only.
