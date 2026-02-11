import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/manifest/:slug', (req, res) => {
  const { slug } = req.params;
  
  const manifest = {
    "name": `BarberPro - ${slug}`,
    "short_name": "BarberPro",
    "start_url": `/${slug}`,
    "display": "standalone",
    "background_color": "#09090b",
    "theme_color": "#f59e0b",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  };

  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  // Usar .send(JSON.stringify) é mais seguro que .json() para Manifests
  res.send(JSON.stringify(manifest));
});
app.listen(PORT, '0.0.0.0', () => {
});