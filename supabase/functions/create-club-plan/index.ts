import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno" 

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE',
}

serve(async (req) => {
  const method = req.method;
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (method === 'DELETE') {
      const body = await req.json();
      const { productId } = body;
      if (!productId) {
        console.error("❌ [ERRO] ProductId não foi enviado no corpo da requisição.");
        throw new Error("productId is required for deletion");
      }

      const product = await stripe.products.update(productId, { active: false });
      return new Response(
        JSON.stringify({ success: true, message: 'Produto desativado no Stripe', id: product.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (method === 'POST') {
      const { name, description, amount, barbershopId } = await req.json();
      const product = await stripe.products.create({
        name: name,
        description: description,
        metadata: { barbershop_id: barbershopId }
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(amount * 100),
        currency: 'brl',
        recurring: { interval: 'month' },
      });
      return new Response(
        JSON.stringify({ priceId: price.id, productId: product.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error(`🔥 [ERRO CRÍTICO]: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})