# Collection sub-category links (`twp-collection-category-links`)

## Data source

- Collection metafield: **`custom.sub_category_links`** — list of `sub_category_link` metaobjects.
- Collection metafield: **`custom.sub_category_links_layout`** — choice list (`Chip` | `Image`). Liquid reads `.value`, compares case-insensitively to `image`; anything blank or other (including `chip`) uses **Chip** layout.
- Liquid: `closest.collection.metafields.custom.sub_category_links.value` (falls back to `collection` if needed).

### Layout behaviour

- **Image:** grid of linked tiles; **URL required**; at least one of **label or image** required (otherwise the row is skipped).
- **Chip:** pill **links** in a flex row, **wrap + centred** on desktop; **URL and label** required (otherwise the row is skipped).

## Metaobject field mapping (section logic)

The section resolves each list entry with fallbacks:

| Use        | Metaobject fields tried (in order) |
|-----------|-------------------------------------|
| Label     | `title`, `label`, `name`          |
| Image     | `image`, `cover_image`            |
| Link URL  | `collection`, `page`, `product`, `link`, `url` |

If your definition uses different keys, update `sections/twp-collection-category-links.liquid` accordingly.

## Design reference

- **Image layout:** Figma **Sub Categories / Images** — grid of tiles on **≥750px** (3:2 image, 12px radius, label under image). **Mobile (<750px):** horizontal scroll, **~2.5** tiles visible, **40px** right gradient into `var(--color-background)` (Figma `10688:44822` scroll edge).
- **Chip layout:** Figma **Sub Categories / Text** (e.g. `10555:47702`) — pill row, centred on **≥750px**. **Mobile:** horizontal scroll, **~4.8** chips visible, same **40px** gradient.

## Template

`templates/collection.json` includes this section **after** `twp-collection-heading` and **before** `main`. Merchants can remove or reorder in the theme editor.

Layout mode is controlled by the **`custom.sub_category_links_layout`** collection metafield (Chip | Image). **Colour scheme** and **vertical / block padding** use section settings. **Horizontal gutters** are fixed in CSS (**24px** inline-start on mobile only; **24px** inline-start and inline-end from 750px up) so you can keep **padding left & right at 0** for the flush-right mobile scroll strip. The **link list** comes from **`custom.sub_category_links`**.

## Translations

- Storefront: `locales/en.default.json` → `twp_collection_category_links.*`
- Editor: `locales/en.default.schema.json` → `names.twp_collection_category_links`, `info.twp_collection_sub_category_links_data`, settings labels under `settings.twp_collection_category_links_*`

## Troubleshooting

- **Nothing on storefront:** Empty `sub_category_links` list → section outputs no markup. Populate the metafield on the collection.
- **Section missing from sidebar:** The live store’s `collection.json` may have been saved without this section. Re-add **Sub-category links** on the collection template or restore `collection_category_links` in `sections` + `order` in the repo and push.
- **Links exist but row is missing:** A **URL** is required for every row (no link-only display without `href`). **Chip:** label required. **Image:** label or image required. Check field keys match the table above.
