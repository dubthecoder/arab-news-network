const OG_FETCH_TIMEOUT = 4000;

export async function fetchOgImage(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) {
      await res.body?.cancel();
      return '';
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < 30000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }
    await reader.cancel();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}
