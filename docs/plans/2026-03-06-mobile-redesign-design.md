# Mobile Redesign — Apple News Style

## Summary

Rebuild the mobile experience (<=760px) from scratch as a native-feeling mobile news app, rather than a reformatted desktop site. Apple News-inspired: bold typography, full-bleed images, swipeable carousel, bottom navigation.

## Components

### Top Bar
- Minimal: brand name + date
- No tickers, no text size buttons, no theme toggle
- Stock ticker retained as slim single line below

### Hero Carousel
- Swipeable carousel of top 3-5 stories
- Full-bleed images with headline overlaid on dark gradient (white text)
- Source badge + time ago on the overlay
- Dots indicator at bottom
- CSS scroll-snap for native feel (no JS carousel library)

### Article Feed
- Large image cards, one per row, full-width edge-to-edge
- Image on top, headline + source + timestamp below
- No excerpts on mobile (scannable)
- Section dividers with category name

### Bottom Navigation
- 2 tabs: Home + Countries
- Fixed at bottom, blur backdrop
- Countries tab opens a bottom sheet with country pills grid
- Active tab uses accent color

### Dark Mode
- Follows system preference via prefers-color-scheme media query
- No manual toggle on mobile
- Desktop toggle remains unchanged

### Hidden on Mobile
- News ticker (carousel replaces it)
- Text size buttons
- Theme toggle
- Desktop category nav bar
- Sidebar/opinions section (moved below feed or hidden)

### Retained on Mobile
- Stock ticker (slim)
- Country filtering (via bottom sheet)
- Footer (simplified, stacked)

## Technical Approach

All changes are CSS-only for layout, plus minimal JS for:
- Carousel dot indicators and optional auto-advance
- Bottom sheet open/close for countries
- System theme detection

No new dependencies. No build step. Everything stays in index.html.

## Scope

- Only the <=760px breakpoint is affected
- Desktop and tablet layouts remain unchanged
- The same JS rendering functions (buildSection, buildCard, etc.) are reused; mobile-specific rendering only where needed (carousel, bottom nav)
