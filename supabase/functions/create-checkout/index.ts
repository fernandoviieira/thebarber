// ✅ Importações atualizadas para compatibilidade com Deno 2 / Supabase
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0" 

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  // O httpClient continua sendo necessário para o Edge Runtime
  httpClient: Stripe.createFetchHttpClient(), 
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform', // ✅ Adicionado o campo que faltava
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barbershopId, userEmail, priceId } = await req.json()

    // 1. Criar ou buscar o cliente na Stripe
    // Aqui você poderia primeiro checar no seu banco se esse barbershopId já tem um stripe_customer_id
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        barbershopId: barbershopId
      }
    })

    // 2. Criar a sessão de Checkout
    // Dentro de supabase/functions/create-checkout/index.ts

    // Dentro da sua função create-checkout
    const origin = req.headers.get('origin');

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',

      // ✅ Redireciona para /admin/ID-DA-BARBEARIA com um parâmetro de sucesso
      success_url: `${origin}/admin/${barbershopId}?success=true`,
      cancel_url: `${origin}/admin/${barbershopId}?canceled=true`,

      metadata: { barbershopId },
      subscription_data: {
        metadata: { barbershopId }
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("ERRO NA FUNÇÃO:", error.message) // Isso aparecerá nos logs do Supabase
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})