# Arab News Style Redesign — Design Doc

**Date:** 2026-03-05
**Status:** Approved

## Goal

Redesign `public/index.html` to match arabnews.com's visual identity — light newspaper aesthetic with a dark mode switcher.

## Branding Reference (scraped via Firecrawl)

- **Primary accent:** `#D85229` (terracotta/burnt orange)
- **Background (light):** `#ECF0E7` (parchment)
- **Text (light):** `#000000`
- **Secondary text:** `#5D686C` (slate grey)
- **Headings font:** Playfair Display (serif)
- **Body font:** Roboto (sans-serif)
- **Border radius:** `4px`
- **Tone:** Professional, editorial, newspaper

## Color System (CSS Variables)

| Variable | Light | Dark |
|---|---|---|
| `--bg` | `#ECF0E7` | `#0f0f0f` |
| `--surface` | `#ffffff` | `#1a1a1a` |
| `--surface-2` | `#f5f5f0` | `#222222` |
| `--border` | `#ddd` | `#2a2a2a` |
| `--text` | `#111111` | `#f0f0f0` |
| `--text-muted` | `#5D686C` | `#888888` |
| `--primary` | `#D85229` | `#D85229` |
| `--header-bg` | `#ffffff` | `#111111` |

## Typography

- Headings: Playfair Display, serif — loaded via Google Fonts
- Body/UI: Roboto, sans-serif — loaded via Google Fonts
- Heading sizes: h1 48px, h2 32px, h3 20px
- Body: 16px / 1.6 line-height

## Layout

- Max width: 1200px, centered
- **Header:** White/dark bar, logo left, lang toggle + dark mode toggle right, terracotta bottom border
- **Nav bar:** Horizontal category tabs (All Sources + per-source badges), scrollable
- **Main grid:** 2-column — hero/feed left (70%), sidebar right (30%) on desktop; single column on mobile
- **Article cards:** Image (if available) + category label + headline (Playfair Display) + byline + time
- **Section headers:** Bold uppercase category labels with terracotta left border
- **Dark mode toggle:** Sun/moon icon button, saves preference to localStorage

## Implementation Approach

CSS custom properties on `:root` for light theme, `[data-theme="dark"]` on `<html>` for dark overrides. Single toggle function flips the attribute and saves to `localStorage`. No build step required.

## Scope

- **File changed:** `public/index.html` only
- **JS logic preserved:** polling, lang toggle, source filters, new-article banner — all unchanged
- **Images:** Render article images when available (`article.image` field already exists in API response)

## Out of Scope

- No backend changes
- No multi-page navigation
- No opinion/sidebar content sections (single live feed only)
