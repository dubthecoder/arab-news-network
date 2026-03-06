# Mobile Redesign (Apple News Style) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the <=760px mobile experience as a native-feeling Apple News-style app with swipeable hero carousel, full-bleed cards, bottom nav with country sheet, and system dark mode.

**Architecture:** All changes happen in the single `frontend/public/index.html` file. New mobile CSS replaces the existing `@media (max-width: 760px)` block entirely. New JS functions handle the carousel, bottom nav, country sheet, and system theme detection. Desktop/tablet layouts are untouched.

**Tech Stack:** Vanilla HTML/CSS/JS, CSS scroll-snap for carousel, CSS transitions for bottom sheet.

---

### Task 1: Add Mobile Detection Helper + System Dark Mode

**Files:**
- Modify: `frontend/public/index.html` (JS section, ~line 1719)

**Step 1: Add isMobile helper function**

Add this right after the `setThemeIcon` / `toggleTheme` block (~line 1723):

```javascript
function isMobile() {
  return window.matchMedia('(max-width: 760px)').matches;
}
```

**Step 2: Add system dark mode for mobile**

Modify the theme initialization IIFE (~line 1719) to respect system preference on mobile:

```javascript
(function(){
  if(isMobile()) {
    // Mobile: follow system preference
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    setThemeIcon(theme);
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if(!isMobile()) return;
      var t = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      setThemeIcon(t);
    });
  } else {
    var s=localStorage.getItem('theme')||'light';
    document.documentElement.setAttribute('data-theme',s);
    setThemeIcon(s);
  }
})();
```

**Step 3: Verify in browser**

Open dev tools, toggle mobile viewport. Theme should follow system preference.

**Step 4: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): add isMobile helper and system dark mode"
```

---

### Task 2: Add Bottom Navigation Bar HTML + CSS

**Files:**
- Modify: `frontend/public/index.html` (HTML body + CSS)

**Step 1: Add bottom nav HTML**

Add right before `</div><!-- /app-wrap -->` (after the footer div):

```html
<!-- Mobile bottom nav -->
<nav class="mobile-bottom-nav" id="mobileBottomNav">
  <button class="bottom-nav-item active" id="btnHome" onclick="mobileNavHome()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    <span>الرئيسية</span>
  </button>
  <button class="bottom-nav-item" id="btnCountries" onclick="mobileNavCountries()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    <span>الدول</span>
  </button>
</nav>
```

**Step 2: Add bottom nav CSS**

Add inside the `@media (max-width: 760px)` block:

```css
/* Bottom navigation bar */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(var(--panel-rgb, 255,255,255), 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--line);
  padding: 0.4rem 0 calc(0.4rem + env(safe-area-inset-bottom));
  height: auto;
}

[data-theme="dark"] .mobile-bottom-nav {
  background: rgba(16,19,17, 0.85);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  background: none;
  border: none;
  color: var(--ink-mid);
  font-family: var(--sans);
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.3rem 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.bottom-nav-item svg {
  width: 22px;
  height: 22px;
}

.bottom-nav-item.active {
  color: var(--accent);
}
```

**Step 3: Hide bottom nav on desktop**

Add outside the mobile media query (in the base styles):

```css
.mobile-bottom-nav { display: none; }
```

**Step 4: Add padding-bottom to body on mobile so content isn't hidden behind nav**

In the mobile media query:

```css
#app-wrap {
  padding-bottom: 70px;
}
```

**Step 5: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): add bottom navigation bar with home and countries tabs"
```

---

### Task 3: Add Country Bottom Sheet

**Files:**
- Modify: `frontend/public/index.html` (HTML + CSS + JS)

**Step 1: Add bottom sheet HTML**

Add right after the mobile-bottom-nav element:

```html
<!-- Country bottom sheet -->
<div class="sheet-overlay" id="sheetOverlay" onclick="closeCountrySheet()"></div>
<div class="country-sheet" id="countrySheet">
  <div class="sheet-handle"></div>
  <div class="sheet-title">اختر الدولة</div>
  <div class="sheet-pills" id="sheetPills"></div>
</div>
```

**Step 2: Add bottom sheet CSS**

In the mobile media query:

```css
/* Country bottom sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0,0,0,0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.sheet-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.country-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--panel);
  border-radius: 16px 16px 0 0;
  padding: 0.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.country-sheet.open {
  transform: translateY(0);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--ink-light);
  border-radius: 2px;
  margin: 0 auto 0.75rem;
  opacity: 0.4;
}

.sheet-title {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 1rem;
  text-align: center;
}

.sheet-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.sheet-pill {
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  font-family: var(--sans);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-mid);
  cursor: pointer;
  transition: all 0.2s;
}

.sheet-pill.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
```

**Step 3: Hide sheet elements on desktop**

In base styles (outside media queries):

```css
.sheet-overlay, .country-sheet { display: none; }
```

Then in the mobile media query add:

```css
.sheet-overlay, .country-sheet { display: block; }
```

**Step 4: Add bottom sheet JS**

Add after the country filter click handlers (~line 1690):

```javascript
function mobileNavHome() {
  document.getElementById('btnHome').classList.add('active');
  document.getElementById('btnCountries').classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mobileNavCountries() {
  openCountrySheet();
}

function openCountrySheet() {
  // Populate pills if empty
  var pills = document.getElementById('sheetPills');
  if(!pills.children.length) {
    document.querySelectorAll('#countryFilters .nav-item').forEach(function(el) {
      var pill = document.createElement('button');
      pill.className = 'sheet-pill' + (el.dataset.country === activeCountry ? ' active' : '');
      pill.textContent = el.textContent;
      pill.onclick = function() {
        activeCountry = el.dataset.country;
        // Update both desktop filters and sheet pills
        document.querySelectorAll('#countryFilters .nav-item').forEach(function(e) {
          e.classList.toggle('active', e.dataset.country === activeCountry);
        });
        document.querySelectorAll('.sheet-pill').forEach(function(p, i) {
          var navItems = document.querySelectorAll('#countryFilters .nav-item');
          p.classList.toggle('active', navItems[i] && navItems[i].dataset.country === activeCountry);
        });
        renderFeed();
        closeCountrySheet();
      };
      pills.appendChild(pill);
    });
  }
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('countrySheet').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCountrySheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('countrySheet').classList.remove('open');
  document.body.style.overflow = '';
}
```

**Step 5: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): add country selection bottom sheet"
```

---

### Task 4: Build Mobile Hero Carousel

**Files:**
- Modify: `frontend/public/index.html` (JS `buildHero` function + new CSS)

**Step 1: Add carousel CSS**

In the mobile media query:

```css
/* Hero carousel */
.mobile-carousel {
  position: relative;
  width: 100%;
  margin-bottom: 0.75rem;
}

.carousel-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.carousel-track::-webkit-scrollbar { display: none; }

.carousel-slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-slide-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent 0%, rgba(0,0,0,0.75) 100%);
  padding: 2.5rem 1rem 1rem;
  color: #fff;
}

.carousel-slide-source {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.8);
  margin-bottom: 0.3rem;
}

.carousel-slide-title {
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.3rem;
}

.carousel-slide-time {
  font-size: 0.65rem;
  color: rgba(255,255,255,0.7);
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0;
}

.carousel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-light);
  opacity: 0.3;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.carousel-dot.active {
  opacity: 1;
  background: var(--accent);
  transform: scale(1.3);
}
```

**Step 2: Add `buildMobileHero` JS function**

Add right after the `buildHero` function (~line 1434):

```javascript
function buildMobileHero(lead, subs) {
  var items = [lead].concat(subs || []).filter(function(a) { return a && a.image; }).slice(0, 5);
  if(!items.length) return document.createElement('div');

  var wrap = document.createElement('div');
  wrap.className = 'mobile-carousel';

  var track = document.createElement('div');
  track.className = 'carousel-track';

  items.forEach(function(a) {
    var slide = document.createElement('a');
    slide.className = 'carousel-slide';
    slide.href = articleUrl(a);

    var img = document.createElement('img');
    img.src = a.image;
    img.alt = a.title || '';
    img.onerror = function() { this.style.display = 'none'; };
    slide.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'carousel-slide-overlay';

    var src = document.createElement('div');
    src.className = 'carousel-slide-source';
    src.textContent = a.source || '';
    overlay.appendChild(src);

    var title = document.createElement('div');
    title.className = 'carousel-slide-title';
    title.textContent = a.title || '';
    overlay.appendChild(title);

    var time = document.createElement('div');
    time.className = 'carousel-slide-time';
    time.textContent = getTimeAgo(a.pubDate);
    overlay.appendChild(time);

    slide.appendChild(overlay);
    track.appendChild(slide);
  });

  wrap.appendChild(track);

  // Dots
  var dots = document.createElement('div');
  dots.className = 'carousel-dots';
  items.forEach(function(_, i) {
    var dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.onclick = function() {
      track.scrollTo({ left: track.offsetWidth * i, behavior: 'smooth' });
    };
    dots.appendChild(dot);
  });
  wrap.appendChild(dots);

  // Update dots on scroll
  track.addEventListener('scroll', function() {
    var idx = Math.round(track.scrollLeft / track.offsetWidth);
    dots.querySelectorAll('.carousel-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  });

  // Auto-advance every 5s
  var autoInterval = setInterval(function() {
    var idx = Math.round(track.scrollLeft / track.offsetWidth);
    var next = (idx + 1) % items.length;
    track.scrollTo({ left: track.offsetWidth * next, behavior: 'smooth' });
  }, 5000);

  // Stop auto-advance on user interaction
  track.addEventListener('touchstart', function() {
    clearInterval(autoInterval);
  }, { once: true });

  return wrap;
}
```

**Step 3: Modify `renderFeed` to use mobile hero**

Find the line in `renderFeed` that calls `buildHero` (~line 1325) and wrap it:

```javascript
// Replace: heroArea.appendChild(buildHero(lead, subStories));
if(isMobile()) {
  heroArea.appendChild(buildMobileHero(lead, subStories));
} else {
  heroArea.appendChild(buildHero(lead, subStories));
}
```

**Step 4: Hide desktop hero-wrap on mobile**

In the mobile media query:

```css
.hero-wrap { display: none; }
```

**Step 5: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): add swipeable hero carousel with scroll-snap"
```

---

### Task 5: Rebuild Mobile Article Cards + Section Layout

**Files:**
- Modify: `frontend/public/index.html` (CSS mobile media query)

**Step 1: Replace the existing mobile card/section CSS**

Remove all existing card/section rules from the `@media (max-width: 760px)` block and replace with:

```css
/* Sections */
.section { margin-bottom: 1.25rem; }
.section-header {
  padding: 0.6rem 1rem 0;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}
.section-accent { width: 28px; height: 3px; }
.section-title { font-size: 1.25rem; }
.section-count { font-size: 0.6rem; }

/* All cards: full-bleed, single column */
.card-feat-row {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.card-feat-row > div { display: contents; }

.card-grid-3 {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card, .card-big {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  border-bottom: 1px solid var(--line);
  box-shadow: none;
}

.card-img, .card-big .card-img {
  width: 100%;
  height: 200px;
  min-height: 180px;
  border-radius: 0;
}

.card-body {
  padding: 0.75rem 1rem;
}

.card-source {
  font-size: 0.6rem;
}

.card-title, .card-big .card-title {
  font-size: 1.15rem;
  line-height: 1.25;
}

/* Hide excerpts on mobile for scanability */
.card-excerpt { display: none; }

.card-time {
  font-size: 0.65rem;
}

/* Horizontal cards: make them full-width cards on mobile */
.card-hz {
  flex-direction: column;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--line);
  box-shadow: none;
}

.card-hz .card-img-wrap {
  width: 100%;
}

.card-hz .card-img {
  width: 100%;
  height: 180px;
  min-height: 160px;
}

.card-hz .card-body {
  padding: 0.75rem 1rem;
}

.card-hz .card-title {
  font-size: 1.1rem;
}

/* Brief list */
.brief-list {
  padding: 0;
}
.brief {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--line);
}
.brief-title { font-size: 1.05rem; }
.brief-excerpt { display: none; }
```

**Step 2: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): full-bleed magazine cards, hide excerpts"
```

---

### Task 6: Hide Desktop-Only Elements on Mobile

**Files:**
- Modify: `frontend/public/index.html` (CSS mobile media query)

**Step 1: Add hide rules to mobile media query**

```css
/* Hide desktop-only elements */
.top-bar-controls { display: none; }
.ticker { display: none; }
.nav-bar.country-bar { display: none; }
.hero-live { display: none; }
.hero-sub { display: none; }
.sidebar { display: none; }

/* Simplify top bar for mobile */
.top-bar-inner {
  justify-content: center;
  padding: 0.5rem 1rem;
}

/* Page: remove padding (full-bleed cards) */
.page {
  padding: 0;
  max-width: 100%;
}

/* Content grid: single column, no gap */
.content-grid {
  display: block;
}
```

**Step 2: Ensure stock ticker stays visible**

The `.stock-ticker` class is NOT in the hide list, so it stays. Adjust its mobile styling:

```css
.stock-ticker-half {
  gap: 1rem;
  padding: 0.3rem 0.75rem;
}
.stock-item { font-size: 0.62rem; }
```

**Step 3: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): hide desktop-only elements, simplify layout"
```

---

### Task 7: Simplified Mobile Footer + Cleanup

**Files:**
- Modify: `frontend/public/index.html` (CSS mobile media query)

**Step 1: Update mobile footer**

In the mobile media query:

```css
/* Footer */
.footer-inner {
  flex-direction: column;
  text-align: center;
  padding: 1rem 1rem calc(1rem + 70px);
  gap: 0.35rem;
  font-size: 0.72rem;
}
.footer-logo { font-size: 1rem; }
```

The extra `70px` in padding-bottom accounts for the bottom nav bar.

**Step 2: Remove the old @media (max-width: 400px) block entirely**

The new mobile design is already optimized for small phones. Delete the entire block:

```css
/* DELETE THIS ENTIRE BLOCK */
@media (max-width: 400px) {
  ...
}
```

**Step 3: Add panel-rgb CSS variable for bottom nav backdrop**

In the `:root` variables section, add:

```css
--panel-rgb: 255, 255, 255;
```

In the `[data-theme="dark"]` block, add:

```css
--panel-rgb: 16, 19, 17;
```

**Step 4: Commit**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): clean up footer, remove 400px breakpoint, finalize"
```

---

### Task 8: RTL Carousel Fix + Final Polish

**Files:**
- Modify: `frontend/public/index.html` (CSS + JS)

**Step 1: Force LTR on carousel track**

RTL scroll-snap has inconsistent behavior across browsers. Force LTR on the carousel:

```css
.carousel-track {
  direction: ltr;
}
.carousel-slide-overlay {
  direction: rtl;
  text-align: right;
}
```

**Step 2: Fix carousel scroll direction in JS**

In the `buildMobileHero` function, the `scrollLeft` calculations work naturally in LTR so no changes needed.

**Step 3: Add touch feedback to cards**

In the mobile media query:

```css
.card:active, .card-hz:active, .brief:active {
  background: var(--panel-soft);
  transition: background 0.1s;
}
```

**Step 4: Test on mobile viewport**

Open dev tools, set to iPhone viewport. Verify:
- Carousel swipes left/right, dots update
- Auto-advance works (5s interval)
- Bottom nav shows Home + Countries
- Countries sheet opens/closes
- Country selection filters articles and closes sheet
- No horizontal scrolling
- Dark mode follows system preference
- Stock ticker scrolls
- News ticker is hidden
- Cards are full-bleed with no excerpts
- Footer has padding for bottom nav

**Step 5: Commit and push**

```bash
git add frontend/public/index.html
git commit -m "feat(mobile): RTL carousel fix, touch feedback, polish"
git push origin main
```
