import { XMLParser } from 'fast-xml-parser';
import { fetchOgImage } from './og-image';

export interface Article {
  id: string;
  url: string;
  title: string;
  description: string;
  source: string;
  image: string;
  pubDate: string;
}

const RSS_FEEDS = [
  { url: 'https://www.aljazeera.net/aljazeerarss/ar/rss.xml', source: 'الجزيرة' },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: 'بي بي سي عربي' },
  { url: 'https://www.skynewsarabia.com/web/rss/middle-east.xml', source: 'سكاي نيوز عربية' },
  { url: 'https://aawsat.com/feed', source: 'الشرق الأوسط' },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', source: 'CNN عربي' },
  { url: 'https://rss.dw.com/rdf/rss-ar-all', source: 'DW عربي' },
  { url: 'https://www.alhurra.com/feed', source: 'الحرة' },
  { url: 'https://www.alaraby.co.uk/rss', source: 'العربي الجديد' },
  { url: 'https://www.alsumaria.tv/rss', source: 'السومرية' },
  { url: 'https://alkhaleejonline.net/rss.xml', source: 'الخليج أونلاين' },
  { url: 'https://www.alquds.co.uk/feed/', source: 'القدس العربي' },
  { url: 'https://www.france24.com/ar/moyen-orient/rss', source: 'فرانس 24 عربي' },
  { url: 'https://www.almasryalyoum.com/rss/rssfeeds', source: 'المصري اليوم' },
  { url: 'https://www.spa.gov.sa/rss/allnews/ar', source: 'واس' },
  { url: 'https://www.hespress.com/feed', source: 'هسبريس' },
  { url: 'https://www.sana.sy/?feed=rss2&lang=ar', source: 'سانا' },
  { url: 'https://www.ennaharonline.com/feed/', source: 'النهار أونلاين' },
  { url: 'https://www.alquds.com/ar/rss.xml', source: 'جريدة القدس' },
  { url: 'https://www.almanar.com.lb/rss', source: 'قناة المنار' },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  maxEntitiesLimit: 5000,
});

async function hashId(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8);
}

function extractItems(parsed: any): any[] {
  // RSS 2.0
  const channel = parsed?.rss?.channel;
  if (channel?.item) {
    return Array.isArray(channel.item) ? channel.item : [channel.item];
  }
  // Atom
  const feed = parsed?.feed;
  if (feed?.entry) {
    return Array.isArray(feed.entry) ? feed.entry : [feed.entry];
  }
  // RDF
  const rdf = parsed?.['rdf:RDF'];
  if (rdf?.item) {
    return Array.isArray(rdf.item) ? rdf.item : [rdf.item];
  }
  return [];
}

function extractImage(item: any): string {
  // enclosure
  if (item.enclosure?.['@_url']) return item.enclosure['@_url'];
  // media:content
  const mc = item['media:content'];
  if (mc?.['@_url']) return mc['@_url'];
  if (Array.isArray(mc) && mc[0]?.['@_url']) return mc[0]['@_url'];
  // media:thumbnail
  const mt = item['media:thumbnail'];
  if (mt?.['@_url']) return mt['@_url'];
  if (Array.isArray(mt) && mt[0]?.['@_url']) return mt[0]['@_url'];
  return '';
}

function extractLink(item: any): string {
  if (typeof item.link === 'string') return item.link;
  // Atom style
  if (item.link?.['@_href']) return item.link['@_href'];
  if (Array.isArray(item.link)) {
    const alt = item.link.find((l: any) => l['@_rel'] === 'alternate');
    return alt?.['@_href'] || item.link[0]?.['@_href'] || '';
  }
  return '';
}

function extractDescription(item: any): string {
  const raw = item.description || item['content:encoded'] || item.summary || item.content || '';
  const text = typeof raw === 'string' ? raw : '';
  // Strip HTML tags for a clean snippet
  return text.replace(/<[^>]+>/g, '').trim().slice(0, 300);
}

async function fetchSingleFeed(feed: { url: string; source: string }): Promise<Article[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      await res.body?.cancel();
      return [];
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items = extractItems(parsed);

    const articles: Article[] = [];
    for (const item of items) {
      const link = extractLink(item);
      if (!link) continue;
      const id = await hashId(link);
      articles.push({
        id,
        url: link,
        title: (item.title || '').toString().trim(),
        description: extractDescription(item),
        source: feed.source,
        image: extractImage(item),
        pubDate: item.pubDate || item.published || item['dc:date'] || item.updated || '',
      });
    }
    return articles;
  } catch (err) {
    console.error(`Failed to fetch ${feed.source}: ${err}`);
    return [];
  }
}

export async function fetchFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map((f) => fetchSingleFeed(f)));

  const seen = new Set<string>();
  const articles = results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((a) => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Fetch og:image for articles missing images
  const needImage = articles.filter((a) => !a.image && a.url);
  if (needImage.length > 0) {
    console.log(`Fetching og:image for ${needImage.length} articles...`);
    const ogResults = await Promise.allSettled(needImage.map((a) => fetchOgImage(a.url)));
    ogResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        needImage[i].image = r.value;
      }
    });
    const found = ogResults.filter((r) => r.status === 'fulfilled' && r.value).length;
    console.log(`  Found ${found}/${needImage.length} og:images`);
  }

  return articles;
}
