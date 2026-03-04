import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { priceId, customerId, successUrl, cancelUrl, planId, barbershopId } = await req.json()

    // Cria a sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Metadata para o Webhook identificar o pagamento
      metadata: {
        type: 'club_member',
        customerId: customerId,
        planId: planId,       // OBRIGATÓRIO
        barbershopId: barbershopId // OBRIGATÓRIO
      },
      subscription_data: {
        metadata: {
          type: 'club_member',
          customerId: customerId,
          planId: planId,       // OBRIGATÓRIO
          barbershopId: barbershopId // OBRIGATÓRIO
        }
      }
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})