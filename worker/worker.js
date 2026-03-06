const RSSParser = require('rss-parser');
const Redis = require('ioredis');
const crypto = require('crypto');

const parser = new RSSParser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
    ],
  },
});
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const FETCH_INTERVAL = 20 * 60 * 1000; // 20 minutes
const TTL = 25 * 60; // 25 minutes
const OG_FETCH_TIMEOUT = 4000; // 4s timeout per article

const RSS_FEEDS = [
  { url: 'https://www.aljazeera.net/aljazeerarss/ar/rss.xml', source: '\u0627\u0644\u062c\u0632\u064a\u0631\u0629' },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: '\u0628\u064a \u0628\u064a \u0633\u064a \u0639\u0631\u0628\u064a' },
  { url: 'https://www.skynewsarabia.com/web/rss/middle-east.xml', source: '\u0633\u0643\u0627\u064a \u0646\u064a\u0648\u0632 \u0639\u0631\u0628\u064a\u0629' },
  { url: 'https://aawsat.com/feed', source: '\u0627\u0644\u0634\u0631\u0642 \u0627\u0644\u0623\u0648\u0633\u0637' },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', source: 'CNN \u0639\u0631\u0628\u064a' },
  { url: 'https://rss.dw.com/rdf/rss-ar-all', source: 'DW \u0639\u0631\u0628\u064a' },
  { url: 'https://www.alhurra.com/feed', source: '\u0627\u0644\u062d\u0631\u0629' },
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

// Fetch og:image from an article page when RSS has no image
async function fetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < 30000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }
    reader.cancel();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function fetchFeeds(feeds) {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.map((item) => {
          const link = item.link || '';
          return {
            id: crypto.createHash('md5').update(link).digest('hex').slice(0, 8),
            title: item.title || '',
            link,
            description: (item.contentSnippet || item.content || '').slice(0, 300),
            pubDate: item.pubDate || item.isoDate || '',
            source: feed.source,
            image:
              item.enclosure?.url ||
              item.mediaContent?.$.url ||
              item.mediaThumbnail?.$.url ||
              '',
          };
        });
      } catch (err) {
        console.error(`Failed to fetch ${feed.source}: ${err.message}`);
        return [];
      }
    })
  );

  const articles = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Fetch og:image for articles missing images (in parallel)
  const needImage = articles.filter((a) => !a.image && a.link);
  if (needImage.length > 0) {
    console.log(`Fetching og:image for ${needImage.length} articles...`);
    const ogResults = await Promise.allSettled(
      needImage.map((a) => fetchOgImage(a.link))
    );
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

async function updateFeeds() {
  console.log('Fetching feeds...');
  try {
    const articles = await fetchFeeds(RSS_FEEDS);
    await Promise.all([
      redis.set('news:ar', JSON.stringify(articles), 'EX', TTL),
      redis.set('news:lastUpdate', new Date().toISOString()),
    ]);
    console.log(`Updated: ${articles.length} articles`);
  } catch (err) {
    console.error('Feed update error:', err);
  }
}

// Arab market data (Google Finance paths)
const STOCK_INDICES = [
  // Arab currencies
  { path: 'USD-SAR', name: 'دولار/ريال سعودي', exchange: 'عملات' },
  { path: 'USD-AED', name: 'دولار/درهم إماراتي', exchange: 'عملات' },
  { path: 'USD-EGP', name: 'دولار/جنيه مصري', exchange: 'عملات' },
  { path: 'USD-IQD', name: 'دولار/دينار عراقي', exchange: 'عملات' },
  { path: 'USD-KWD', name: 'دولار/دينار كويتي', exchange: 'عملات' },
  { path: 'USD-QAR', name: 'دولار/ريال قطري', exchange: 'عملات' },
  { path: 'USD-BHD', name: 'دولار/دينار بحريني', exchange: 'عملات' },
  { path: 'USD-OMR', name: 'دولار/ريال عماني', exchange: 'عملات' },
  { path: 'USD-JOD', name: 'دولار/دينار أردني', exchange: 'عملات' },
  { path: 'USD-LBP', name: 'دولار/ليرة لبنانية', exchange: 'عملات' },
  { path: 'USD-TND', name: 'دولار/دينار تونسي', exchange: 'عملات' },
  { path: 'USD-MAD', name: 'دولار/درهم مغربي', exchange: 'عملات' },
  { path: 'USD-DZD', name: 'دولار/دينار جزائري', exchange: 'عملات' },
  { path: 'USD-LYD', name: 'دولار/دينار ليبي', exchange: 'عملات' },
  { path: 'USD-SYP', name: 'دولار/ليرة سورية', exchange: 'عملات' },
  { path: 'USD-YER', name: 'دولار/ريال يمني', exchange: 'عملات' },
  { path: 'USD-SDG', name: 'دولار/جنيه سوداني', exchange: 'عملات' },
  // Major world currencies
  { path: 'EUR-USD', name: 'يورو/دولار', exchange: 'عملات عالمية' },
  { path: 'GBP-USD', name: 'جنيه إسترليني/دولار', exchange: 'عملات عالمية' },
  { path: 'USD-JPY', name: 'دولار/ين ياباني', exchange: 'عملات عالمية' },
  { path: 'USD-CNY', name: 'دولار/يوان صيني', exchange: 'عملات عالمية' },
  { path: 'USD-TRY', name: 'دولار/ليرة تركية', exchange: 'عملات عالمية' },
  { path: 'USD-INR', name: 'دولار/روبية هندية', exchange: 'عملات عالمية' },
  // Crypto
  { path: 'BTC-USD', name: 'بتكوين', exchange: 'رقمية' },
  { path: 'ETH-USD', name: 'إيثريوم', exchange: 'رقمية' },
];

async function fetchSingleStock(index, prevPrices) {
  const url = `https://www.google.com/finance/quote/${index.path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    if (!priceMatch) return null;
    const price = parseFloat(priceMatch[1]);
    const prev = prevPrices[index.path] || price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;

    return {
      symbol: index.path,
      name: index.name,
      exchange: index.exchange,
      price,
      change,
      changePercent,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function fetchStocks() {
  console.log('Fetching stock data...');
  try {
    // Load previous prices for change calculation
    const prevRaw = await redis.get('stocks:ar');
    const prevPrices = {};
    if (prevRaw) {
      JSON.parse(prevRaw).forEach(s => { prevPrices[s.symbol] = s.price; });
    }
    const results = await Promise.allSettled(STOCK_INDICES.map(i => fetchSingleStock(i, prevPrices)));
    const quotes = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    if (quotes.length > 0) {
      await redis.set('stocks:ar', JSON.stringify(quotes), 'EX', TTL);
      console.log(`Updated: ${quotes.length} stock indices`);
    } else {
      console.error('No stock data fetched');
    }
  } catch (err) {
    console.error('Stock fetch error:', err.message);
  }
}

// Minimal HTTP server for Railway health checks
const http = require('http');
const PORT = process.env.PORT || 3002;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
}).listen(PORT, () => {
  console.log(`Worker health check on port ${PORT}`);
});

// Run immediately, then on interval
updateFeeds();
fetchStocks();
setInterval(updateFeeds, FETCH_INTERVAL);
setInterval(fetchStocks, FETCH_INTERVAL);
