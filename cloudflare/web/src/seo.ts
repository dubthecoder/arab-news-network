import type { Env } from './index';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function handleHomepage(env: Env): Promise<Response> {
  // Get the static index.html from assets
  const assetResponse = await env.ASSETS.fetch(new Request('https://placeholder/_app.html'));
  let html = await assetResponse.text();

  try {
    const articles = await env.DB.prepare(
      'SELECT id, title, source FROM articles ORDER BY pub_date DESC LIMIT 20'
    ).all<{ id: string; title: string; source: string }>();

    if (articles.results.length > 0) {
      const headlines = articles.results
        .map((a) => {
          const href = a.id ? `/article/${a.id}` : '#';
          const t = escapeHtml(a.title);
          const s = escapeHtml(a.source);
          return `<li><a href="${href}">${t}</a> <span>${s}</span></li>`;
        })
        .join('\n      ');

      const seoBlock = `
  <div id="seo-headlines" style="position:absolute;left:-9999px;overflow:hidden;width:1px;height:1px;">
    <h1>شبكة الأخبار العربية - آخر أخبار الشرق الأوسط</h1>
    <nav aria-label="آخر الأخبار">
      <ul>
      ${headlines}
      </ul>
    </nav>
  </div>`;

      html = html.replace('</body>', seoBlock + '\n</body>');
    }
  } catch (err) {
    console.error('Homepage SEO injection error:', err);
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  });
}
