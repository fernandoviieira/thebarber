import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Função auxiliar para limpar e formatar o número (55 + DDD + Numero)
const formatWhatsappNumber = (num: string) => {
  const clean = num.replace(/\D/g, '');
  return clean.startsWith('55') ? clean : `55${clean}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { number, shopNumber, message } = await req.json();
    
    const url = Deno.env.get('EVOLUTION_URL')
    const instance = Deno.env.get('EVOLUTION_INSTANCE')
    const apiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!url || !instance || !apiKey) {
      return new Response(JSON.stringify({ error: 'Configurações ausentes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const clientNumber = formatWhatsappNumber(number);
    
    const clientResponse = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({
        number: clientNumber,
        text: message
      })
    });
    
    const clientResult = await clientResponse.json();
    let shopResult = null;
    if (shopNumber) {
      const barbeshopNumber = formatWhatsappNumber(shopNumber);
      const adminMessage = `🔔 *NOVO AGENDAMENTO RECEBIDO!* 🔔\n\n${message.split('Olá,')[1] || message}\n\n🚀 _Verifique seu painel para confirmar!_`;
      const shopResponse = await fetch(`${url}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        body: JSON.stringify({
          number: barbeshopNumber,
          text: adminMessage
        })
      });
      shopResult = await shopResponse.json();
    }

    return new Response(JSON.stringify({ client: clientResult, shop: shopResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('❌ Erro interno:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})