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

    // 1. Buscar detalhes do preço para saber se é recorrente ou único
    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = price.type === 'recurring';

    // 2. Criar ou buscar o cliente (Ideal seria buscar por email primeiro para não duplicar)
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { barbershopId }
    })

    const origin = req.headers.get('origin');

    // 3. Criar a sessão de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],

      // ✅ DINÂMICO: Se o preço no Stripe for 'One-time', vira 'payment'. Se for 'Recurring', vira 'subscription'.
      mode: isRecurring ? 'subscription' : 'payment',

      // ✅ CONFIGURAÇÃO DE PARCELAMENTO (Só funciona no modo 'payment')
      ...(!isRecurring && {
        payment_method_options: {
          card: {
            installments: {
              enabled: true,
            },
          },
        },
      }),

      success_url: `${origin}/admin/${barbershopId}?success=true`,
      cancel_url: `${origin}/admin/${barbershopId}?canceled=true`,

      metadata: { barbershopId },
      // subscription_data só pode existir se for modo subscription
      ...(isRecurring && {
        subscription_data: {
          metadata: { barbershopId }
        }
      })
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