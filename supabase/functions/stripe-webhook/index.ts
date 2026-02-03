import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )


    // --------------------------------------------------------------------------------
    // 1. PAGAMENTO BEM-SUCEDIDO (Início ou Renovação)
    // --------------------------------------------------------------------------------
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
      const dataObject = event.data.object as any;
      const subscriptionId = dataObject.subscription as string;
      const customerId = dataObject.customer as string;
      
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const expiryDate = new Date(subscription.current_period_end * 1000).toISOString();

      const barbershopId =
        dataObject.metadata?.barbershopId ||
        subscription.metadata?.barbershopId;

      const priceId = subscription.items.data[0].price.id;

      let planName = 'Plano Pro'; 
      if (priceId === 'price_1SwUNyCTbvM1pa7EeHFfabwj') planName = 'Mensal';
      if (priceId === 'price_1SwTpoCTbvM1pa7Er9JCBnPA') planName = 'Semestral';
      if (priceId === 'price_1SwTqVCTbvM1pa7EKBjA66GO') planName = 'Anual';

      if (barbershopId) {
        const { error } = await supabaseAdmin
          .from('barbershops')
          .update({
            subscription_status: 'active', // ✅ Volta para active ao pagar/renovar
            expires_at: expiryDate,
            current_plan: planName,
            subscription_id: subscriptionId,
            stripe_customer_id: customerId 
          })
          .eq('id', barbershopId);

        if (error) throw error;
      }
    }

    // --------------------------------------------------------------------------------
    // 2. SOLICITAÇÃO DE CANCELAMENTO (Pelo Portal do Cliente)
    // --------------------------------------------------------------------------------
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      
      // Se 'cancel_at_period_end' for true, o cliente cancelou a renovação,
      // mas o acesso deve continuar ativo até o fim do período já pago.
      if (subscription.cancel_at_period_end) {
        const barbershopId = subscription.metadata?.barbershopId;
        
        if (barbershopId) {
          const { error } = await supabaseAdmin
            .from('barbershops')
            .update({ subscription_status: 'canceled' }) // ✅ Marcamos como cancelado para a UI avisar
            .eq('id', barbershopId);
            
          if (error) throw error;
        }
      }
    }

    // --------------------------------------------------------------------------------
    // 3. EXPIRAÇÃO REAL (O tempo acabou ou cancelamento imediato)
    // --------------------------------------------------------------------------------
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;

      // Aqui o acesso é cortado de verdade
      const { error } = await supabaseAdmin
        .from('barbershops')
        .update({ 
          subscription_status: 'canceled',
          // Opcional: forçar expires_at para agora para garantir o bloqueio no frontend
          expires_at: new Date().toISOString() 
        })
        .eq('subscription_id', subscription.id);

      if (error) throw error;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`❌ Erro no Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
})