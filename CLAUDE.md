# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stores

This theme serves two brands from one codebase:

- **Linen House** (`linen-house`) — premium bed linen and homewares
- **Aura Home** (`aura-home`) — contemporary home textiles and decor

Brand differentiation is handled via design tokens in theme settings. Store configuration lives in `shopify.theme.toml` (created from `shopify.theme.example.toml` — not committed).

## Setup

Copy `shopify.theme.example.toml` to `shopify.theme.toml` and fill in store credentials before running any `shopify` commands.

## Commands

```bash
# Dev servers
pnpm dev:lh          # Linen House dev
pnpm dev:ah          # Aura Home dev

# Push to stores
pnpm dev:lh:push     # Push to Linen House dev
pnpm dev:ah:push     # Push to Aura Home dev
pnpm prod:lh:push    # Push to Linen House prod
pnpm prod:ah:push    # Push to Aura Home prod

# Linting / formatting
pnpm lint:js         # ESLint
pnpm lint:css        # Stylelint
pnpm format          # Prettier (write)
pnpm check:all       # Run all checks

shopify theme check  # Shopify theme validator
```

### Token sync

```bash
node scripts/sync-figma-tokens.js                        # Sync Linen House tokens (default)
node scripts/sync-figma-tokens.js --brand=aura-home      # Sync Aura Home tokens
node scripts/sync-figma-tokens.js --preview               # Preview without writing
```

## Token Standards

Design tokens are managed through Figma variable caches and synced into Shopify theme settings. No CSS namespace layer exists — brand differentiation is handled by Shopify's colour scheme system.

### Token architecture

1. **Figma token caches** — `tokens/figma-variables.json` (Linen House) and `tokens/aura-home-variables.json` (Aura Home) hold extracted Figma variable values using Figma-native names
2. **Sync script** — `node scripts/sync-figma-tokens.js` maps tokens to Shopify Horizon settings (colour schemes, typography, border-radius) in `config/settings_data.json`
3. **Colour schemes** — each brand defines 9 schemes (light, dark, accent, promo, header, nav, etc.) that Shopify applies via `color-{{ section.settings.color_scheme }}` classes
4. **CSS custom properties** — Horizon exposes tokens as `var(--color-foreground)`, `var(--color-background)`, `var(--color-primary)`, etc., scoped by colour scheme. Use these in component CSS — never hardcode colour values

### Rules

- All CSS colour values must use Horizon's scheme-scoped custom properties (`var(--color-foreground)`, `var(--color-background)`, etc.)
- Spacing, border-radius, and typography values come from the sync script output in `settings_data.json` — reference them via Horizon's built-in CSS variables
- If a design property has no matching Horizon variable, flag it explicitly rather than hardcoding a value
- Before adding a raw value to CSS, check whether `sync-figma-tokens.js` already maps it to a setting

## Dual-Brand Constraints

- **One codebase, two brands** — all Liquid, CSS, and JavaScript is shared. Brand differentiation comes only from theme settings (colour schemes, typography, radius)
- **Always check both designs** — every component must be verified against both Linen House and Aura Home Figma files before implementation is complete
- **Never hardcode colours** — use `var(--color-*)` CSS custom properties. Raw hex values will not adapt when switching brands
- **Sync before push** — always run the sync script for the correct brand immediately before pushing to that store

## Theme Architecture

**Key principles: focus on generating snippets, blocks, and sections; users may create templates using the theme editor**

### Directory structure

```
.
├── assets          # Stores static assets (CSS, JS, images, fonts, etc.)
├── blocks          # Reusable, nestable, customizable components
├── config          # Global theme settings and customization options
├── layout          # Top-level wrappers for pages (layout templates)
├── locales         # Translation files for theme internationalization
├── sections        # Modular full-width page components
├── snippets        # Reusable Liquid code or HTML fragments
└── templates       # Templates combining sections and blocks to define page structures
```

### Naming conventions

- **`twp-` prefix** — custom sections/blocks added by The Working Party (not from the upstream Horizon theme). Example: `sections/twp-collection-heading.liquid`
- **`_` prefix on blocks** — private sub-blocks not directly selectable in the theme editor by merchants. Used as sub-components within a section or parent block. Example: `blocks/_carousel-content.liquid`

### TWP section pattern

TWP sections delegate rendering to the `section` snippet, which handles layout, padding, colour scheme, and background media settings. Pass block output via a captured `children` variable:

```liquid
{% capture children %}
  <div class="my-section__content">
    {% content_for 'blocks' %}
  </div>
{% endcapture %}

{% render 'section', section: section, children: children %}
```

#### `sections`

- Sections are `.liquid` files that allow you to create reusable modules that can be customized by merchants
- Sections can include blocks which allow merchants to add, remove, and reorder content within a section
- Sections are made customizable by including the required `{% schema %}` tag that exposes settings in the theme editor via a JSON object
- Examples of sections: hero banners, product grids, testimonials, featured collections

#### `blocks`

- Blocks are `.liquid` files that allow you to create reusable small components that can be customized by merchants (they don't need to fit the full-width of the page)
- Blocks are ideal for logic that needs to be reused and also edited in the theme editor by merchants
- Blocks can include other nested blocks which allow merchants to add, remove, and reorder content within a block too
- Blocks are made customizable by including the required `{% schema %}` tag that exposes settings in the theme editor via a JSON object
- Blocks must have the `{% doc %}` tag as the header if you directly/statically render them in other file via `{% content_for 'block', id: '42', type: 'block_name' %}`
- Examples of blocks: individual testimonials, slides in a carousel, feature items

#### `snippets`

- Snippets are reusable code fragments rendered in blocks, sections, and layouts files via the `render` tag
- Snippets are ideal for logic that needs to be reused but not directly edited in the theme editor by merchants
- Snippets accept parameters when rendered for dynamic behavior
- Snippets must have the `{% doc %}` tag as the header
- Examples of sections: buttons, meta-tags, css-variables, and form elements

#### `layout`

- Defines the overall HTML structure of the site, including `<head>` and `<body>`, and wraps other templates to provide a consistent frame
- Contains repeated global elements like navigation, cart drawer, footer, and usually includes CSS/JS assets and meta tags
- Must include `{{ content_for_header }}` to inject Shopify scripts in the `<head>` and `{{ content_for_layout }}` to render the page content

#### `config`

- `config/settings_schema.json` is a JSON file that defines schema for global theme settings
- `config/settings_data.json` is JSON file that holds the data for the settings defined by `config/settings_schema.json`

#### `assets`

- Contains static files like CSS, JavaScript, and images—including compiled and optimized assets—referenced in templates via the `asset_url` filter
- Keep it here only `critical.css` and static files necessary for every page, otherwise prefer the usage of the `{% stylesheet %}` and `{% javascript %}` tags

#### `locales`

- Stores translation files organized by language code (e.g., `en.default.json`, `fr.json`) to localize all user-facing theme content and editor strings
- Enables multi-language support by providing translations accessible via filters like `{{ 'key' | t }}` in Liquid for proper internationalization

#### `templates`

- JSON file that define the structure, ordering, and which sections and blocks appear on each page type, allowing merchants to customize layouts without code changes

### CSS & JavaScript

- Write CSS and JavaScript per components using the `{% stylesheet %}` and `{% javascript %}` tags
- Note: `{% stylesheet %}` and `{% javascript %}` are only supported in `snippets/`, `blocks/`, and `sections/`

### LiquidDoc

Snippets and blocks (when blocks are statically rendered) must include the LiquidDoc header that documents the purpose of the file and required parameters. Example:

```liquid
{% doc %}
  Renders a responsive image that might be wrapped in a link.

  @param {image} image - The image to be rendered
  @param {string} [url] - An optional destination URL for the image

  @example
  {% render 'image', image: product.featured_image %}
{% enddoc %}
```

## The `{% schema %}` tag on blocks and sections

### Good practices

**Single property settings**: For settings that correspond to a single CSS property, use CSS variables:
```liquid
<div class="collection" style="--gap: {{ block.settings.gap }}px">
  Example
</div>

{% stylesheet %}
  .collection {
    gap: var(--gap);
  }
{% endstylesheet %}

{% schema %}
{
  "settings": [{
    "type": "range",
    "label": "gap",
    "id": "gap",
    "min": 0,
    "max": 100,
    "unit": "px",
    "default": 0
  }]
}
{% endschema %}
```

**Multiple property settings**: For settings that control multiple CSS properties, use CSS classes:
```liquid
<div class="collection {{ block.settings.layout }}">
  Example
</div>

{% stylesheet %}
  .collection--full-width {
    /* multiple styles */
  }
  .collection--narrow {
    /* multiple styles */
  }
{% endstylesheet %}

{% schema %}
{
  "settings": [{
    "type": "select",
    "id": "layout",
    "label": "layout",
    "values": [
      { "value": "collection--full-width", "label": "t:options.full" },
      { "value": "collection--narrow", "label": "t:options.narrow" }
    ]
  }]
}
{% endschema %}
```

#### Mobile layouts

If you need to create a mobile layout and you want the merchant to be able to select one or two columns, use a select input:

```liquid
{% schema %}
{
  "type": "select",
  "id": "columns_mobile",
  "label": "Columns on mobile",
  "options": [
    { "value": 1, "label": "1" },
    { "value": "2", "label": "2" }
  ]
}
{% endschema %}
```

## Liquid

### Liquid delimiters

- **`{{ ... }}`**: Output – prints a value.
- **`{{- ... -}}`**: Output, trims whitespace around the value.
- **`{% ... %}`**: Logic/control tag (if, for, assign, etc.), does not print anything, no whitespace trim.
- **`{%- ... -%}`**: Logic/control tag, trims whitespace around the tag.

### Liquid operators

**Comparison operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`

**Logical operators:** `or`, `and`, `contains`

#### Comparison and comparison tags

**Key condition principles:**
- For simplicity, ALWAYS use nested `if` conditions when the logic requires more than one logical operator
- Parentheses are not supported in Liquid
- Ternary conditionals are not supported in Liquid, so always use `{% if cond %}`

## Translation development standards

### Translation requirements

- **Every user-facing text** must use translation filters.
- **Update `locales/en.default.json`** with all new keys.
- **Use descriptive, hierarchical keys** for organization.
- **Only add English text**; translators handle other languages.

### Translation filter usage

```liquid
<!-- Good -->
<h2>{{ 'sections.featured_collection.title' | t }}</h2>
<button>{{ 'products.add_to_cart' | t }}</button>

<!-- Bad -->
<h2>Featured Collection</h2>
<button>Add to cart</button>
```

### Best practices

- Write clear, concise text
- **Use sentence case** for all user-facing text, including titles, headings, and button labels
- Use interpolation rather than appending strings together
- Escape variables unless they output HTML: `{{ variable | escape }}`

## Localization standards

### File structure

```
locales/
├── en.default.json          # English (required)
├── en.default.schema.json   # English schema strings (required)
├── es.json                  # Spanish
└── ...
```

### Key organization

- Use descriptive, hierarchical keys
- Maximum 3 levels deep
- Use snake_case for key names
- Group related translations

## Examples per kind of asset

### `snippet`

```liquid
{% doc %}
  Renders a responsive image that might be wrapped in a link.

  @param {image} image - The image to be rendered
  @param {string} [url] - An optional destination URL for the image

  @example
  {% render 'image', image: product.featured_image %}
{% enddoc %}

{% liquid
  unless height
    assign width = width | default: image.width
  endunless

  if url
    assign wrapper = 'a'
  else
    assign wrapper = 'div'
  endif
%}

<{{ wrapper }}
  class="image {{ css_class }}"
  {% if url %}
    href="{{ url }}"
  {% endif %}
>
  {{ image | image_url: width: width, height: height, crop: crop | image_tag }}
</{{ wrapper }}>

{% stylesheet %}
  .image {
    display: block;
    width: 100%;
    height: auto;
  }
{% endstylesheet %}
```

### `block`

```liquid
{% doc %}
  Renders a text block.

  @example
  {% content_for 'block', type: 'text', id: 'text' %}
{% enddoc %}

<div
  class="text {{ block.settings.text_style }}"
  style="--text-align: {{ block.settings.alignment }}"
  {{ block.shopify_attributes }}
>
  {{ block.settings.text }}
</div>

{% stylesheet %}
  .text {
    text-align: var(--text-align);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.text",
  "settings": [
    {
      "type": "text",
      "id": "text",
      "label": "t:labels.text",
      "default": "Text"
    }
  ],
  "presets": [{ "name": "t:general.text" }]
}
{% endschema %}
```

### `section`

```liquid
<div class="example-section full-width">
  <div class="example-section__content">
    {% content_for 'blocks' %}
  </div>
</div>

{% stylesheet %}
  .example-section {
    position: relative;
    width: 100%;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.custom_section",
  "blocks": [{ "type": "@theme" }],
  "settings": [],
  "presets": [
    {
      "name": "t:general.custom_section"
    }
  ]
}
{% endschema %}
```
