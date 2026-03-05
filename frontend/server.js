const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_INTERNAL = process.env.API_URL || 'http://localhost:3001';

// Proxy /api/* to internal API service
app.get('/api/{*splat}', async (req, res) => {
  try {
    const apiPath = req.originalUrl.replace(/^\/api/, '');
    const apiRes = await fetch(`${API_INTERNAL}${apiPath}`);
    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (err) {
    console.error('API proxy error:', err.message);
    res.status(502).json({ error: 'API unavailable' });
  }
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
