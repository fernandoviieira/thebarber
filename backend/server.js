import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001; 
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
    // ✅ ALTERAÇÃO CHAVE: Usar caminho relativo para evitar erro de "same origin"
    "start_url": `/${slug}`, 
    // ✅ Escopo definido para a raiz para garantir navegação fluida no PWA
    "scope": "/",            
    "display": "standalone",
    "background_color": "#09090b",
    "theme_color": "#f59e0b",
    "icons": [
      { 
        "src": `${FRONTEND_URL}/icon-192.png`, 
        "sizes": "192x192", 
        "type": "image/png", 
        "purpose": "any maskable" 
      },
      { 
        "src": `${FRONTEND_URL}/icon-512.png`, 
        "sizes": "512x512", 
        "type": "image/png", 
        "purpose": "any maskable" 
      }
    ]
  };

  // Cabeçalhos de resposta para garantir compatibilidade e contornar avisos de túnel
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Log para monitorar as requisições no terminal da VPS
  console.log(`📱 [API] Manifest gerado com sucesso para: ${slug}`);
  
  res.json(manifest);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor BarberPro rodando na porta ${PORT}`);
  console.log(`🚀 API Fixa pronta em: https://api.contafacilpro.com.br`);
});