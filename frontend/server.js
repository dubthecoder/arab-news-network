const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Read index.html once and inject API_URL
const htmlPath = path.join(__dirname, 'public', 'index.html');
const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
const injectedHtml = rawHtml.replace(/__API_URL__/g, API_URL);

// Serve static assets normally
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve injected HTML for root
app.get('/', (req, res) => {
  res.type('html').send(injectedHtml);
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
