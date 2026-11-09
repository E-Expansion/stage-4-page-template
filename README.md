# Atelier: Shopify page template

A generic Shopify theme template for E-Expansion, built on Shopify's **Horizon** theme. It is designed around a fictional leather goods brand, "Atelier". The goal is a reusable starting point for client stores. Pages are built from a small set of shared components, and every page with dynamic content is a single template filled from Shopify data.

- **Repository:** `E-Expansion/stage-4-page-template`
- **Dev store:** `stageproject-spikes-en-sparrow.myshopify.com`, theme `stage-4-page-template/main`
- **Theme-wide conventions:** [AGENTS.md](AGENTS.md) covers file contracts, Liquid, CSS and JavaScript

## Status

| Page | Template | Status |
|---|---|---|
| Homepage | `templates/index.json` | Done |
| Header, top bar, footer | `sections/header-group.json`, `sections/footer-group.json` | Done |
| Collection | `templates/collection.json` | Done; needs store setup (see below) |
| Product | `templates/product.json` | To do (still Horizon default) |
| Journal (blog) | `templates/blog.json` | Done; optional store setup (see below) |
| Article | `templates/article.json` | Done; needs store setup (see below) |

## Working on the theme

You need the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and access to the dev store.

```bash
shopify theme dev --store stageproject-spikes-en-sparrow   # local preview with hot reload
shopify theme check --path .                               # lint; should report 0 errors
```

### Git and the Shopify sync

The live theme is connected to this repository through Shopify's GitHub integration:
- **Pushes to `main`** are deployed to the store automatically.
- **Changes made in the theme editor** come back as "Update from Shopify" commits. These mostly touch `templates/*.json`, `config/settings_data.json` and locale files.

Because of that:
- **Pull before you commit.** Otherwise you get merge conflicts in the template JSON files.
- **Check JSON templates after a merge.** A merge has dropped a section here before. After merging, check that every ID in a template's `order` also exists in its `sections`.
- **Expect brief errors after a push.** Shopify applies a push file by file. When code moves between files (for example a renamed snippet), the store can show "Could not find asset" errors for a minute. Wait for the sync to finish before debugging.

The files in `.shopifyignore`, including this README and `AGENTS.md`, are never uploaded to the store.

## Principles

1. **No hard-coded colours or fonts.** Colours come from the theme palette (*Theme settings → Colors*). Setting defaults reference the palette, e.g. `{{ settings.color_palette.color3 }}`. Fonts and sizes use the theme's CSS variables (`--font-heading--family`, `--font-size--lg`, `--gap-md`, …).
2. **Reuse before you build.** Before adding markup, check whether a shared snippet below already covers it, and extend that instead of duplicating it.
3. **One template per page type.** Product, collection, blog and article pages read their content from Shopify data and metafields, never from per-item copies of a template.
4. **Translatable.** Editor labels live in `locales/*.schema.json` (23 languages). Storefront text lives in `locales/*.json` (34 languages). New keys are added to every file.

### Palette

| Slot | Colour | Used for |
|---|---|---|
| `background` | #FFFFFF | Page and card backgrounds |
| `foreground` | #000000 | Text |
| `color1` | #333333 | Dark UI, "New" / "Care guide" badges |
| `color2` | #DFDFDF | Borders |
| `color3` | #B5532F | Accent: buttons, links, low stock |
| `color4` | #B8860B | Rating stars, "Materials" badge |
| `color5` | #2E7D4F | In stock, "Best seller" / "Buying guide" badges |

## Shared components

All of these are snippets in `snippets/` (unless noted) and are called with `{% render %}`. Each file starts with a `{% doc %}` block that lists its parameters.

| Component | What it renders | Used in |
|---|---|---|
| `section-heading` | Heading row: title, text, and a link or side text | Category selector, curated products, UGC, press |
| `.snap-carousel` (class in `assets/base.css`) | Grid on desktop, swipeable row on mobile | Category selector, curated products, subcategories |
| `product-tile` (+ `assets/product-tile.js`) | Product card: badge, colour swatches with image preview on hover, rating, price, stock, add to cart | Curated products, collection grid, article sidebar |
| `product-row` | Product as a horizontal row: badge, image, title, short description, rating, stock, price with discount, swatches | Search drawer |
| `product-swatches`, `product-price`, `product-stock` | Parts shared by `product-tile` and `product-row`: colour swatches (image preview on hover), price with optional "Save x%", stock status | Product tile, product row |
| `product-cart-button` | Round add-to-cart button; adds directly for single-variant or colour-only products (the hovered swatch picks the colour), otherwise links to the product | Product tile, product row |
| `cart-notification` (+ `assets/cart-notification.js`) | "Added to cart" notification at the top right after any add to cart, with View cart and Check out | Layout (every page) |
| `search-drawer` (+ `assets/search-drawer.js`) | Right-hand search panel with live results, opened from the header search fields | Header |
| `product-mention` | Small product card (`row` or `stack` layout) | Article content |
| `article-meta` | Read time and date of an article | Article card, article author line |
| `article-images` | Row of images inside an article | Article content |
| `article-toc` (+ `assets/article-toc.js`) | List of an article's h2s that tracks the current one | Article sidebar, article content |
| `article-sidebar` | On this page, Keep reading and the product tile | Article page |
| `cta-banner` | Dark banner with text and a button | Article content |
| `button-color-vars` | Custom properties that recolour primary buttons | Newsletter signup, article content |
| `category-tile` | Collection tile (normal or `small`) | Category selector, subcategories |
| `article-card` | Article card (`card`, `featured` or `link` layout) | Featured article, blog grid, article sidebar |
| `tag-badge` | Coloured badge from product or article tags | Product tile, article card |
| `listing-toolbar-styles` | Styles for the bar above a listing and the paging below it | Collection and blog listings |
| `star-rating` | Five stars from the review metafields | Product tile, product mention |
| `author-byline` | Avatar and author name, from the article's `custom.author` | Press mentions, article card |
| `author-bio` | "About the author" card | Article page |
| `page-heading` | Breadcrumbs, h1, optional tag badge and text | Page header, article header |
| `breadcrumbs` | Trail built from the current page, with structured data | Page heading |
| `faq-accordion` | One FAQ question (native `<details>`) | FAQ section, article FAQ |
| `faq-structured-data` | FAQPage structured data | FAQ section, article FAQ |
| `seo-text-block` | Bordered long-form text card | SEO text section |
| `chat-trigger-script` | Opens Shopify Inbox from any `[data-chat-trigger]` link | Footer, FAQ |

**Theme-wide settings for these components:**
- *Theme settings → Badges*: six tag badge rules (tag, label, colour). They apply to both products and articles.
- *Theme settings → Product cards*: which parts of the product tile show (badge, colours as text/swatches/both, rating, stock, cart button), the maximum number of swatches, the low-stock threshold, plus stock and star colours.

## Sections

### Homepage (`templates/index.json`)

`hero-banner` → `usp-bar` → `category-selector` → `press-mentions` → `curated-products` → `ugc-grid` → `brand-story` → `faq` → `newsletter-signup`

### Collection (`templates/collection.json`)

`page-header` → `subcategories` → `collection-filters` (products, filters, sorting, pagination) → `seo-text` → `faq`

### Journal (`templates/blog.json`)

`page-header` → `featured-article` → `blog-filters` (tag filters, sorting, search, article grid) → `newsletter-signup`

Shopify cannot sort blogs and Liquid cannot read a sort parameter, so `blog-filters` renders every article (up to 250) and `assets/blog-filters.js` sorts them and reveals them in batches.

### Article (`templates/article.json`)

`main-blog-post`: `_blog-post-header` → `_blog-post-byline` → featured image → `_blog-post-content` → `_blog-post-faq` → `_blog-post-author-bio`. `article-sidebar` sits beside it and is sticky from 990px. On smaller screens it moves under the article and `On this page` collapses into the text, before the first h2.

The article text can place components between paragraphs with a marker on its own line: `[product]`, `[images]` and `[cta]`, filled from the metafields below.

### Header and footer groups

`top-bar` and `header` sit in the header group. `footer` sits in the footer group.

The header search fields open `search-drawer`. While typing it fetches `sections/search-drawer-results.liquid` from Shopify's predictive search, with tabs for products, collections and blog posts. Enter goes to the full search page.

Each top-level menu item picks a collection. Its mega menu columns are that collection's `custom.subcategories`, and the links in each column are the subcollection's own `custom.subcategories` (or its first five products when it has none). The menu therefore always matches the subcategories strip on collection pages. Without a collection, or with an empty metafield, the manual column and link blocks are used. The featured collection always takes the last column.

### Reusable on any template

`page-header`, `faq` (horizontal or vertical layout), `seo-text` and `newsletter-signup`.

## Store setup

These are configured in Shopify admin, not in code. Pages still render without them, but they fall back to placeholders or section settings.

### Metaobject definitions

| Type | Fields |
|---|---|
| `faq` | `question` (single-line text), `answer` (rich text) |
| `author` | `name` (single-line text), `image` (file), `bio` (rich text) |
| `article_cta` | `heading`, `text`, `link_label` (single-line text), `link` (URL) |
| `volume_tier` | `label` (single-line text), `quantity` (integer), `discount` (integer, percent) |

### Metafields

| Owner | Key | Type | Used by |
|---|---|---|---|
| Product, collection, article | `custom.faq` | List of `faq` metaobjects | FAQ section (falls back to its own blocks) |
| Collection | `custom.subcategories` | List of collections | Subcategories section, header mega menu (columns, and links per column) |
| Collection | `custom.seo_heading` | Single-line text | SEO text section |
| Collection | `custom.seo_text` | Rich text | SEO text section |
| Product | `custom.seo_heading` | Single-line text | SEO text section (body is the product description) |
| Blog | `custom.subtitle` | Single-line text | Page header subtitle (falls back to the section's own text) |
| Blog | `custom.featured_article` | Blog post | Featured article (falls back to the latest article) |
| Article | `custom.author` | `author` metaobject | Article card, author byline, author bio |
| Article | `custom.faq_heading` | Single-line text | Article FAQ heading (falls back to the block's heading) |
| Article | `custom.related_articles` | List of blog posts | Keep reading (falls back to the blog's latest articles) |
| Article | `custom.product` | Product | `[product]` marker, article sidebar |
| Article | `custom.product_detail` | Single-line text | Extra text in the `[product]` row, e.g. "fits a 14\" laptop" |
| Article | `custom.images` | List of files (images) | `[images]` marker |
| Article | `custom.cta` | `article_cta` metaobject | `[cta]` marker (falls back to the content block's settings) |
| Product | `custom.tab_benefits`, `custom.tab_compare`, `custom.tab_sustainability` | Rich text | Product detail tabs: text of each tab (connected in the theme editor; empty tabs are hidden) |
| Product | `custom.tab_benefits_heading`, `custom.tab_compare_heading`, `custom.tab_sustainability_heading` | Single-line text | Product detail tabs: heading of each tab |
| Product | `custom.volume_tiers` | List of `volume_tier` metaobjects | "Buy more, pay less" (falls back to the tier blocks; add matching automatic discounts) |
| Product | `reviews.rating`, `reviews.rating_count` | Filled by a review app | Star rating |

### Colour swatches

Swatch colours come from Shopify's standard **Color** metaobject (`shopify--color-pattern`). To set one up:
1. Set the product category.
2. Link the variant option to the category's Color metafield.
3. Give each entry in *Content → Metaobjects → Color* a hex colour or image.
4. Assign each colour variant its own image, so hovering a swatch can preview it.

The values must come from Shopify's standard definition. If they come from a self-made "Color" definition, Shopify rejects them.

### Apps and other setup

- **Search & Discovery:** set up the collection filters (Type, Material, Colour, Availability, Price).
- **Trustpilot:** the review widgets are app blocks. Add them in the theme editor: in the hero, and between the products and the SEO text on collection pages.
- **Shopify Email:** an automation that sends the size & fit guide to customers tagged `size-guide` (set by the newsletter signup).
- **Shopify Inbox:** powers the "Chat with us" and "Direct chat" links. Without it, they link to the contact page.
- **Navigation:** the footer columns read menus from *Content → Menus*.

## Known gaps

- **Off-white page background:** the designs use an off-white page background with white cards. There is no palette slot for it yet, so pages are currently white.
- **Unused old header snippets:** `snippets/header-drawer.liquid` and `snippets/header-row.liquid` belong to the old Horizon header. They are no longer used and show up as Theme Check warnings.
