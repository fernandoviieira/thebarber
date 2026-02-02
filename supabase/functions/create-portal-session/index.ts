// supabase/functions/create-portal-session/index.ts

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

Deno.serve(async (req) => {
  // Resposta para o preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barbershopId } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Busca o customer_id salvo no banco
    const { data: barbershop, error: dbError } = await supabaseAdmin
      .from('barbershops')
      .select('stripe_customer_id')
      .eq('id', barbershopId)
      .single()

    if (dbError || !barbershop?.stripe_customer_id) {
      throw new Error('Cliente Stripe não encontrado para esta barbearia.')
    }

    // Cria a sessão do portal (onde ele gerencia cartão/cancelamento)
    const session = await stripe.billingPortal.sessions.create({
      customer: barbershop.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/billing`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})