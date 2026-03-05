# Arab News Style Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `public/index.html` to match arabnews.com visual identity (light newspaper aesthetic, Playfair Display headings, terracotta accent `#D85229`, 2-column grid) with a dark mode switcher.

**Architecture:** CSS custom properties on `:root` define the light theme; `[data-theme="dark"]` on `<html>` overrides to dark. A single JS toggle flips the attribute and persists to `localStorage`. All existing polling/lang/filter logic stays untouched.

**Tech Stack:** Vanilla HTML/CSS/JS, Google Fonts (Playfair Display + Roboto), no build step.

**Design reference:** `docs/plans/2026-03-05-arabnews-style-design.md`

---

### Task 1: Add Google Fonts and CSS custom properties

**Files:**
- Modify: `public/index.html` — replace everything in `<head>` through the `<style>` opening

**Step 1: Add Google Fonts preconnect links and CSS variables**

In `<head>`, add after the viewport meta tag:
```
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Roboto:wght@400;500;600&display=swap" rel="stylesheet">
```

At the top of `<style>`, replace the existing `*` reset with:
```css
:root {
  --bg: #ECF0E7;
  --surface: #ffffff;
  --surface-2: #f5f5f0;
  --border: #e0e0d8;
  --text: #111111;
  --text-muted: #5D686C;
  --primary: #D85229;
  --header-bg: #ffffff;
  --badge-bg: #f0ede6;
  --badge-border: #ccc;
  --badge-active-bg: rgba(216, 82, 41, 0.1);
}

[data-theme="dark"] {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --surface-2: #222222;
  --border: #2a2a2a;
  --text: #f0f0f0;
  --text-muted: #888888;
  --primary: #D85229;
  --header-bg: #111111;
  --badge-bg: #1e1e1e;
  --badge-border: #333;
  --badge-active-bg: rgba(216, 82, 41, 0.15);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
```

**Step 2: Verify**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); console.log(h.includes('Playfair Display') && h.includes('--primary') ? 'OK' : 'MISSING')"
```
Expected: `OK`

**Step 3: Commit**
```bash
git add public/index.html && git commit -m "style: add CSS variables and Google Fonts for Arab News redesign"
```

---

### Task 2: Rewrite body, header, and control CSS

**Files:**
- Modify: `public/index.html` — `<style>` block, body through lang-toggle

**Step 1: Replace existing `body`, `header`, `logo`, `live-indicator`, `lang-toggle` CSS blocks with:**

```css
body {
  font-family: 'Roboto', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}

header {
  background: var(--header-bg);
  padding: 0.75rem 2rem;
  border-bottom: 3px solid var(--primary);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
}
.logo .accent { color: var(--primary); }

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(216,82,41,0.6); }
  50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(216,82,41,0); }
}

.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 34px;
  height: 34px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}
.theme-toggle:hover { border-color: var(--primary); color: var(--primary); }

.lang-toggle { display: flex; align-items: center; gap: 0.35rem; }
.lang-toggle button {
  background: transparent;
  border: 1px solid var(--badge-border);
  color: var(--text-muted);
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}
.lang-toggle button.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.lang-toggle button:hover:not(.active) { border-color: var(--primary); color: var(--primary); }
```

**Step 2: Verify**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); console.log(h.includes('theme-toggle') && h.includes('header-controls') ? 'OK' : 'MISSING')"
```
Expected: `OK`

**Step 3: Commit**
```bash
git add public/index.html && git commit -m "style: rewrite header CSS with Arab News newspaper style"
```

---

### Task 3: Rewrite layout, card, and sidebar CSS

**Files:**
- Modify: `public/index.html` — `<style>` block, replacing from `body.arabic` through end of `</style>`

**Step 1: Replace with the full layout/card/sidebar CSS**

```css
body.arabic { direction: rtl; font-family: 'Roboto','Tahoma','Arial',sans-serif; }
body.arabic .news-card:hover { transform: translateX(-3px); }
body.arabic .news-card::before { left: auto; right: 0; }

.status-bar {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.6rem 2rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--border);
}
.status-bar::-webkit-scrollbar { display: none; }

.source-badge {
  padding: 0.3rem 0.8rem;
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.source-badge:hover, .source-badge.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--badge-active-bg);
}

.page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 2rem 3rem;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 900px) {
  .page-wrapper { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}

.section-heading {
  font-family: 'Playfair Display', serif;
  font-size: 1.05rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text);
  padding: 0.5rem 0 0.5rem 0.75rem;
  border-left: 4px solid var(--primary);
  margin-bottom: 1rem;
}

.article-count {
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 0 0 0.75rem;
}

.loading { text-align: center; padding: 4rem 0; color: var(--text-muted); }
.loading .spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

.news-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-bottom: 1px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  color: inherit;
  position: relative;
  overflow: hidden;
}
.news-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 12px rgba(216,82,41,0.1);
  transform: translateX(3px);
  z-index: 1;
}
.news-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--primary);
  opacity: 0;
  transition: opacity 0.2s;
}
.news-card:hover::before { opacity: 1; }

.card-body { padding: 0.9rem 1.1rem; flex: 1; }

.card-image {
  width: 115px;
  min-height: 80px;
  object-fit: cover;
  flex-shrink: 0;
  display: block;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
}
.card-source { color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.card-time { color: var(--text-muted); }
.card-new-badge {
  background: var(--primary);
  color: #fff;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.35rem;
  color: var(--text);
}

.card-description {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.news-card.new-item { animation: slideIn 0.5s cubic-bezier(0.16,1,0.3,1); }
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
}

.news-card.flash { animation: flashHighlight 2s ease; }
@keyframes flashHighlight {
  0% { background: rgba(216,82,41,0.08); border-color: var(--primary); }
  100% { background: var(--surface); border-color: var(--border); }
}

.new-articles-banner {
  position: fixed;
  top: 72px; left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: var(--primary);
  color: #fff;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  z-index: 50;
  transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 4px 16px rgba(216,82,41,0.35);
}
.new-articles-banner.visible { transform: translateX(-50%) translateY(0); }

.error-message {
  text-align: center;
  padding: 2rem;
  color: var(--primary);
  background: rgba(216,82,41,0.08);
  border-radius: 4px;
  border: 1px solid rgba(216,82,41,0.2);
  margin: 1rem 0;
}

.sidebar { position: sticky; top: 80px; }
.sidebar-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.sidebar-title {
  font-family: 'Playfair Display', serif;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary);
  margin-bottom: 0.75rem;
}
.sidebar-item {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border);
}
.sidebar-item:last-child { border-bottom: none; }
.sidebar-item a {
  color: var(--text);
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 0.85rem;
  line-height: 1.35;
  display: block;
}
.sidebar-item a:hover { color: var(--primary); }
.sidebar-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

@media (max-width: 768px) {
  header { padding: 0.75rem 1rem; }
  .logo { font-size: 1.4rem; }
  .page-wrapper { padding: 1rem; gap: 1rem; }
  .card-image { width: 90px; }
  .card-title { font-size: 0.92rem; }
}
```

**Step 2: Verify**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); console.log(h.includes('page-wrapper') && h.includes('sidebar-title') ? 'OK' : 'MISSING')"
```
Expected: `OK`

**Step 3: Commit**
```bash
git add public/index.html && git commit -m "style: add newspaper grid, card, and sidebar CSS"
```

---

### Task 4: Rewrite HTML body structure

**Files:**
- Modify: `public/index.html` — replace `<body>` ... `<script>` opening

**Step 1: Replace the body HTML (everything from `<body>` to `<script>`) with:**

```html
<body>
  <header>
    <div class="header-content">
      <div class="logo">ME<span class="accent"> News</span></div>
      <div class="header-controls">
        <div class="live-indicator">
          <div class="live-dot"></div>
          <span>LIVE</span>
          <span id="lastUpdate"></span>
        </div>
        <div class="lang-toggle">
          <button id="btnEn" class="active" onclick="switchLang('en')">EN</button>
          <button id="btnAr" onclick="switchLang('ar')">عربي</button>
        </div>
        <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle dark mode">🌙</button>
      </div>
    </div>
  </header>

  <div class="status-bar" id="sourceFilters">
    <div class="source-badge active" data-source="all">All Sources</div>
  </div>

  <div class="new-articles-banner" id="newBanner" onclick="scrollToTop()">
    New articles available
  </div>

  <div class="page-wrapper">
    <main>
      <div class="section-heading" id="feedHeading">Latest News</div>
      <div id="feed">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Middle East news...</p>
        </div>
      </div>
    </main>

    <aside class="sidebar" id="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-title">Most Recent</div>
        <div id="sidebarList"></div>
      </div>
    </aside>
  </div>

  <script>
```

**Step 2: Verify**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); console.log(h.includes('themeToggle') && h.includes('feedHeading') && h.includes('sidebarList') ? 'OK' : 'MISSING')"
```
Expected: `OK`

**Step 3: Commit**
```bash
git add public/index.html && git commit -m "feat: rewrite HTML body with newspaper layout, sidebar, theme toggle button"
```

---

### Task 5: Update JS — card template, theme toggle, sidebar updater

**Files:**
- Modify: `public/index.html` — `<script>` block

**Step 1: Replace the `createCardHTML` function**

Find and replace the existing `createCardHTML` function with:

```javascript
function createCardHTML(article, isNew) {
  const timeAgo = getTimeAgo(article.pubDate);
  const desc = article.description
    ? article.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';
  const title = (article.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const source = (article.source || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const imageHtml = article.image
    ? `<img class="card-image" src="${article.image}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : '';

  return `
    <a class="news-card ${isNew ? 'new-item' : ''}"
       href="${article.link}" target="_blank" rel="noopener noreferrer">
      <div class="card-body">
        <div class="card-meta">
          <span class="card-source">${source}</span>
          <span class="card-time">${timeAgo}</span>
          ${isNew ? '<span class="card-new-badge">New</span>' : ''}
        </div>
        <h2 class="card-title">${title}</h2>
        ${desc ? '<p class="card-description">' + desc + '</p>' : ''}
      </div>
      ${imageHtml}
    </a>`;
}
```

**Step 2: Add theme toggle and init — add before the final `fetchNews(true)` call:**

```javascript
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', newTheme);
}

(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
})();
```

**Step 3: Add `updateSidebar` function and wire it into `renderFeed`**

Add this function anywhere before `renderFeed`:

```javascript
function updateSidebar() {
  const sidebarList = document.getElementById('sidebarList');
  if (!sidebarList) return;
  const recent = articles.slice(0, 8);
  const rows = recent.map(a => {
    const t = (a.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const s = (a.source || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div class="sidebar-item"><a href="' + a.link + '" target="_blank" rel="noopener noreferrer">' + t + '</a>' +
      '<div class="sidebar-meta">' + s + ' &middot; ' + getTimeAgo(a.pubDate) + '</div></div>';
  });
  sidebarList.innerHTML = rows.join('');
}
```

In `renderFeed`, add `updateSidebar();` as the last line before the closing `}`.

**Step 4: Verify all three additions**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); ['toggleTheme','updateSidebar','card-image'].forEach(k => console.log((h.includes(k)?'OK':'MISSING') + ': ' + k))"
```
Expected: three `OK` lines.

**Step 5: Start server and smoke test**
```bash
pkill -f 'node server.js' 2>/dev/null; node server.js &
sleep 2
curl -s http://localhost:3000 | grep -o 'Playfair Display' | head -1
```
Expected: `Playfair Display`

**Step 6: Commit**
```bash
git add public/index.html && git commit -m "feat: theme toggle, article images, sidebar updater"
```

---

### Task 6: Arabic localisation of feed heading + final smoke test

**Files:**
- Modify: `public/index.html` — `switchLang` function in `<script>`

**Step 1: In `switchLang`, find the line that sets the "All Sources" badge text and add the heading update below it:**

```javascript
// Existing line:
allBadge.textContent = lang === 'ar' ? 'جميع المصادر' : 'All Sources';
// ADD after it:
const heading = document.getElementById('feedHeading');
if (heading) heading.textContent = lang === 'ar' ? 'آخر الأخبار' : 'Latest News';
```

**Step 2: Verify**
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('public/index.html','utf8'); console.log(h.includes('آخر الأخبار') ? 'OK' : 'MISSING')"
```
Expected: `OK`

**Step 3: Final commit**
```bash
git add public/index.html && git commit -m "feat: localise feed heading for Arabic mode"
```

**Step 4: Manual smoke test checklist**
- [ ] Open http://localhost:3000 — light parchment background, Playfair headings
- [ ] Click 🌙 — switches to dark mode
- [ ] Refresh — dark mode persists (localStorage)
- [ ] Click ☀️ — returns to light mode
- [ ] Click عربي — RTL layout, Arabic heading "آخر الأخبار"
- [ ] Sidebar shows 8 most recent articles on desktop
- [ ] Article images appear on cards when available
- [ ] Source filter badges still work
- [ ] New-article banner still appears on scroll

---

## Done

Result: a complete Arab News-style newspaper redesign of `public/index.html` with:
- Playfair Display headings + Roboto body
- Terracotta `#D85229` accent throughout
- Parchment light mode / deep dark mode toggle
- 2-column grid with sticky sidebar
- Article images on cards
- All original functionality preserved
