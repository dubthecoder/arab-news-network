export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
}

const STOCK_INDICES = [
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
  { path: 'EUR-USD', name: 'يورو/دولار', exchange: 'عملات عالمية' },
  { path: 'GBP-USD', name: 'جنيه إسترليني/دولار', exchange: 'عملات عالمية' },
  { path: 'USD-JPY', name: 'دولار/ين ياباني', exchange: 'عملات عالمية' },
  { path: 'USD-CNY', name: 'دولار/يوان صيني', exchange: 'عملات عالمية' },
  { path: 'USD-TRY', name: 'دولار/ليرة تركية', exchange: 'عملات عالمية' },
  { path: 'USD-INR', name: 'دولار/روبية هندية', exchange: 'عملات عالمية' },
  { path: 'BTC-USD', name: 'بتكوين', exchange: 'رقمية' },
  { path: 'ETH-USD', name: 'إيثريوم', exchange: 'رقمية' },
];

async function fetchSingleStock(
  index: { path: string; name: string; exchange: string },
  prevPrice: number | null
): Promise<StockQuote | null> {
  const url = `https://www.google.com/finance/quote/${index.path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const html = await res.text();
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    if (!priceMatch) return null;
    const price = parseFloat(priceMatch[1]);
    const prev = prevPrice ?? price;
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

export async function fetchStocks(db: D1Database): Promise<void> {
  console.log('Fetching stock data...');
  try {
    // Load previous prices for change calculation
    const prev = await db.prepare('SELECT symbol, price FROM stocks').all<{ symbol: string; price: number }>();
    const prevPrices: Record<string, number> = {};
    for (const row of prev.results) {
      prevPrices[row.symbol] = row.price;
    }

    const results = await Promise.allSettled(
      STOCK_INDICES.map((i) => fetchSingleStock(i, prevPrices[i.path] ?? null))
    );
    const quotes = results
      .filter((r): r is PromiseFulfilledResult<StockQuote> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);

    if (quotes.length > 0) {
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO stocks (symbol, name, exchange, price, change, change_percent, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      );
      await db.batch(quotes.map((q) => stmt.bind(q.symbol, q.name, q.exchange, q.price, q.change, q.changePercent)));
      console.log(`Updated: ${quotes.length} stock indices`);
    } else {
      console.error('No stock data fetched');
    }
  } catch (err) {
    console.error('Stock fetch error:', err);
  }
}
