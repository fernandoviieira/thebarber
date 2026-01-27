import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1. Tratamento de CORS para o navegador não bloquear a chamada
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 2. Pegamos o objeto que vem do Dashboard (ajustado para bater com o seu payload)
   const payload = await req.json(); 

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY não encontrada nos Secrets do Supabase");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // NOTA: O modelo 2.5-flash pode não estar disponível em todas as regiões, 
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. Criamos o prompt estruturado com os dados recebidos
    const promptSarah = `
      Você é a Sarah, assistente de IA de uma barbearia.
      Analise estes dados e dê um insight rápido e motivador (máximo 3 frases).
      Dados: ${JSON.stringify(payload)}
    `;

    const result = await model.generateContent(promptSarah);
    const text = result.response.text();

    // 4. Retornamos com o nome 'insight' para bater com o seu Dashboard (data.insight)
    return new Response(JSON.stringify({ insight: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});