import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret || ''
    );

    const dataObject = event.data.object as any;
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {

      const subscriptionId = dataObject.subscription || (dataObject.object === 'subscription' ? dataObject.id : null);

      if (!subscriptionId || typeof subscriptionId !== 'string') {
        return new Response(JSON.stringify({ received: true, note: "Sem ID de sub" }), { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const expiryDate = new Date(subscription.current_period_end * 1000).toISOString();

      const metadata = {
        ...subscription.metadata,
        ...dataObject.metadata
      };

      const isClubMember = metadata.type === 'club_member';

      if (isClubMember) {
        const customerId = metadata.customerId;
        const barbershopId = metadata.barbershopId;
        const planId = metadata.planId;
        const customerEmail = dataObject.customer_details?.email || dataObject.customer_email;

        let phoneToSync = '';
        if (customerEmail) {
          const { data: customerRecord } = await supabaseAdmin
            .from('customers')
            .select('phone')
            .eq('email', customerEmail)
            .eq('barbershop_id', barbershopId)
            .maybeSingle();
          
          if (customerRecord?.phone) {
            phoneToSync = customerRecord.phone;
            await supabaseAdmin
              .from('profiles')
              .update({ phone: phoneToSync })
              .eq('id', customerId);
          }
        }

        const { error } = await supabaseAdmin
          .from('club_subscriptions')
          .upsert({
            customer_id: customerId,
            barbershop_id: barbershopId,
            plan_id: planId,
            status: 'active',
            current_period_end: expiryDate,
            stripe_subscription_id: subscriptionId,
          }, {
            onConflict: 'customer_id'
          });

        if (error) throw error;
      } else {
        const barbershopId = metadata.barbershopId;
        if (barbershopId) {
          const { error } = await supabaseAdmin
            .from('barbershops')
            .update({
              subscription_status: 'active',
              expires_at: expiryDate,
              subscription_id: subscriptionId,
              stripe_customer_id: dataObject.customer
            })
            .eq('id', barbershopId);

          if (error) throw error;
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subId = dataObject.id;
      
      await Promise.all([
        supabaseAdmin
          .from('club_subscriptions')
          .update({ status: 'inactive' })
          .eq('stripe_subscription_id', subId),
        
        supabaseAdmin
          .from('barbershops')
          .update({ subscription_status: 'canceled' })
          .eq('subscription_id', subId)
      ]);
      
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