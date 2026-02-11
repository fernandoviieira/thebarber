import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de CORS para permitir acesso do Frontend na Vercel
app.use(cors({
  origin: '*', 
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));

app.get('/', (req, res) => {
  res.send('BarberPro API Online 🚀');
});

app.get('/api/manifest/:slug', (req, res) => {
  const { slug } = req.params;
  
  // URL principal do seu Frontend na Vercel
  const frontendUrl = "https://thebarber-delta.vercel.app"; 

  const manifest = {
    "name": `BarberPro - ${slug}`,
    "short_name": "BarberPro",
    "start_url": `${frontendUrl}/${slug}`, // ✅ Corrigido para a origem da Vercel
    "display": "standalone",
    "background_color": "#09090b",
    "theme_color": "#f59e0b",
    "icons": [
      { 
        "src": `${frontendUrl}/icon-192.png`, // ✅ Busca o ícone na Vercel
        "sizes": "192x192", 
        "type": "image/png",
        "purpose": "any maskable"
      },
      { 
        "src": `${frontendUrl}/icon-512.png`, // ✅ Busca o ícone na Vercel
        "sizes": "512x512", 
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  
  res.send(JSON.stringify(manifest));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor BarberPro rodando na porta ${PORT}`);
});