import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Função Robusta para formatar o número:
 * 1. Remove tudo que não é número.
 * 2. Garante o DDI 55.
 * 3. Remove o 9º dígito se necessário (Opcional, mas recomendado para APIs de integração)
 */
const formatWhatsappNumber = (num: string) => {
  if (!num) return '';
  
  // Remove parênteses, traços, espaços e o símbolo +
  let clean = num.replace(/\D/g, '');
  
  // Se o usuário digitou sem o 55 (ex: 41984591710), nós adicionamos
  if (!clean.startsWith('55') && clean.length >= 10) {
    clean = `55${clean}`;
  }
  
  return clean;
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
      return new Response(JSON.stringify({ error: 'Configurações de ambiente ausentes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Formata os números antes do envio
    const clientNumber = formatWhatsappNumber(number);
    const barbershopNumber = shopNumber ? formatWhatsappNumber(shopNumber) : null;
    
    // 1. Enviar para o cliente
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
    
    // 2. Enviar para a barbearia (se houver número)
    if (barbershopNumber) {
      
      const isCancellation = message.includes('AGENDAMENTO CANCELADO');
      let shopMessage;
      
      if (isCancellation) {
        shopMessage = message;
      } else {
        // Melhora a extração da mensagem para evitar o "Olá,"
        const extractedBody = message.includes('Olá,') ? message.split('Olá,')[1] : message;
        
        shopMessage = `🔔 *NOVO AGENDAMENTO!* 🔔\n\n${extractedBody}\n\n🚀 _Verifique seu painel BarbersPro!_`;
      }
      
      const shopResponse = await fetch(`${url}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        body: JSON.stringify({
          number: barbershopNumber,
          text: shopMessage
        })
      });

      // Se a API retornar erro, logamos para saber o motivo (ex: número não existe)
      if (!shopResponse.ok) {
        const errorText = await shopResponse.text();
        console.error(`❌ Erro Evolution API (Barbearia):`, errorText);
      }

      shopResult = await shopResponse.json();
    }

    return new Response(JSON.stringify({ client: clientResult, shop: shopResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('❌ Erro Crítico na Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
});