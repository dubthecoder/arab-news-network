import type { Env } from './index';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeJsonLd(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

interface ArticleRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  source: string;
  image: string | null;
  pub_date: string | null;
}

export async function handleArticlePage(articleId: string, env: Env): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(articleId).first<ArticleRow>();

  if (!row) {
    return new Response(renderArticleNotFound(), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  }

  return new Response(renderArticlePage(row), {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  });
}

function renderArticleNotFound(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <script>document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'light')</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>المقال غير موجود | شبكة الأخبار العربية</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --page-bg: #e8ede3; --ink: #1f2a33; --accent: #d85229; }
    [data-theme="dark"] { --page-bg: #101311; --ink: #f1efe9; --accent: #e1643d; }
    body { font-family: 'IBM Plex Sans Arabic', sans-serif; background: var(--page-bg); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: var(--ink); }
    .msg { text-align: center; }
    .msg h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    .msg a { color: var(--accent); text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="msg">
    <h1>المقال غير موجود</h1>
    <p>قد يكون المقال قد انتهت صلاحيته أو تم حذفه.</p>
    <a href="/">← العودة للرئيسية</a>
  </div>
</body>
</html>`;
}

function renderArticlePage(article: ArticleRow): string {
  const title = escapeHtml(article.title);
  const desc = escapeHtml(article.description);
  const source = escapeHtml(article.source);
  const image = escapeHtml(article.image);
  const link = escapeHtml(article.url);
  const jTitle = escapeJsonLd(article.title);
  const jDesc = escapeJsonLd(article.description);
  const jSource = escapeJsonLd(article.source);
  const url = `https://arabnews.network/article/${article.id}`;
  const timeAgo = getTimeAgo(article.pub_date);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <script>document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'light')</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${title} | شبكة الأخبار العربية</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="شبكة الأخبار العربية">
  <meta property="og:locale" content="ar_AR">
  ${image ? `<meta property="og:image" content="${image}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  ${image ? `<meta name="twitter:image" content="${image}">` : ''}
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${jTitle}",
    "description": "${jDesc}",
    "url": "${url}",
    ${image ? `"image": "${escapeJsonLd(article.image)}",` : ''}
    "datePublished": "${article.pub_date ? new Date(article.pub_date).toISOString() : ''}",
    "publisher": {
      "@type": "Organization",
      "name": "${jSource}"
    },
    "mainEntityOfPage": "${url}"
  }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --accent: #d85229; --ink: #1f2a33; --ink-mid: #5f6a71;
      --page-bg: #e8ede3; --panel: #ffffff; --line: #d3d9cd;
      --sans: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
      --serif: 'Noto Naskh Arabic', serif;
    }
    [data-theme="dark"] {
      --accent: #e1643d; --ink: #f1efe9; --ink-mid: #b1b9be;
      --page-bg: #101311; --panel: #171b18; --line: #2d3531;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--sans); background: var(--page-bg); color: var(--ink); min-height: 100vh; }
    .article-header { background: var(--ink); padding: 0.8rem 1.5rem; }
    .article-header a { color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
    .article-header a:hover { color: var(--accent); }
    .article-wrap { max-width: 750px; margin: 2rem auto; padding: 0 1rem; }
    .article-card { background: var(--panel); border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(22,30,35,0.08); }
    .article-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .article-body { padding: 1.8rem 2rem 2rem; }
    .article-source { color: var(--accent); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.5rem; }
    .article-time { color: var(--ink-mid); font-size: 0.75rem; margin-bottom: 1rem; }
    .article-title { font-family: var(--serif); font-size: 1.8rem; line-height: 1.4; color: var(--ink); margin-bottom: 1.2rem; }
    .article-desc { font-size: 1.05rem; line-height: 1.8; color: var(--ink-mid); margin-bottom: 2rem; }
    .article-cta { display: inline-block; background: var(--accent); color: #fff; padding: 0.8rem 2rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.15s; }
    .article-cta:hover { background: #b94725; }
    .article-back { display: block; text-align: center; margin-top: 1.5rem; color: var(--ink-mid); text-decoration: none; font-size: 0.9rem; }
    .article-back:hover { color: var(--accent); }
    @media (max-width: 600px) {
      .article-body { padding: 1.2rem 1rem 1.5rem; }
      .article-title { font-size: 1.4rem; }
    }
  </style>
</head>
<body>
  <div class="article-header">
    <a href="/">شبكة الأخبار العربية ←</a>
  </div>
  <div class="article-wrap">
    <article class="article-card">
      ${image ? `<img class="article-img" src="${image}" alt="${title}">` : ''}
      <div class="article-body">
        <div class="article-source">${source}</div>
        <div class="article-time">${timeAgo}</div>
        <h1 class="article-title">${title}</h1>
        <p class="article-desc">${desc}</p>
        <a class="article-cta" href="${link}" target="_blank" rel="noopener noreferrer">اقرأ المقال كاملاً ←</a>
      </div>
    </article>
    <a class="article-back" href="/">→ العودة للرئيسية</a>
  </div>
</body>
</html>`;
}

export async function handleSitemap(env: Env): Promise<Response> {
  const articles = await env.DB.prepare(
    'SELECT id, url, title, source, pub_date FROM articles ORDER BY pub_date DESC LIMIT 1000'
  ).all<{ id: string; url: string; title: string; source: string; pub_date: string | null }>();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://arabnews.network/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
`;
  for (const a of articles.results) {
    if (!a.id) continue;
    const loc = `https://arabnews.network/article/${a.id}`;
    const date = a.pub_date ? new Date(a.pub_date).toISOString().split('T')[0] : '';
    xml += `  <url>
    <loc>${loc}</loc>${date ? `\n    <lastmod>${date}</lastmod>` : ''}
    <changefreq>never</changefreq>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(a.source || '')}</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${a.pub_date ? new Date(a.pub_date).toISOString() : new Date().toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title || '')}</news:title>
    </news:news>
  </url>
`;
  }
  xml += '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
