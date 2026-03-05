const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

app.get('/news', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;

    const raw = await redis.get('news:ar');
    let articles = raw ? JSON.parse(raw) : [];

    if (since) {
      articles = articles.filter((item) => new Date(item.pubDate) > since);
    }

    res.json({ articles, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Error reading news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/stocks', async (req, res) => {
  try {
    const raw = await redis.get('stocks:ar');
    const stocks = raw ? JSON.parse(raw) : [];
    res.json({ stocks });
  } catch (err) {
    console.error('Error reading stocks:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
