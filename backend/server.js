import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001; // Fixamos em 3001 para bater com o Túnel
const FRONTEND_URL = "https://thebarber-delta.vercel.app";

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));

app.get('/api/manifest/:slug', (req, res) => {
  const { slug } = req.params;
  const manifest = {
    "name": `BarberPro - ${slug}`,
    "short_name": "BarberPro",
    "start_url": `${FRONTEND_URL}/${slug}`,
    "display": "standalone",
    "background_color": "#09090b",
    "theme_color": "#f59e0b",
    "icons": [
      { "src": `${FRONTEND_URL}/icon-192.png`, "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
      { "src": `${FRONTEND_URL}/icon-512.png`, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
    ]
  };

  // Cabeçalhos críticos para o PWA e Túnel
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL); // Reforço para o Cloudflare
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.json(manifest);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor BarberPro rodando na porta ${PORT}`);
});