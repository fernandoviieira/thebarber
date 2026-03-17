import Stripe from "npm:stripe@^14.14.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ✅ MAPEAMENTO PARA BATER EXATAMENTE COM OS NOMES DO SEU FRONTEND
const PLAN_MAP: Record<string, string> = {
  'price_1T9qnnCTbvM1pa7EwJFD7WhI': 'Mensal PRO',
  'price_1SwTpoCTbvM1pa7Er9JCBnPA': 'Semestral ELITE',
  'price_1SwTqVCTbvM1pa7EKBjA66GO': 'Anual BLACK',
};

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error("❌ Erro: Assinatura do Stripe ausente no cabeçalho.");
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

    // 1. LÓGICA DE PAGAMENTO BEM-SUCEDIDO
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {

      const subscriptionId = dataObject.subscription || (dataObject.object === 'subscription' ? dataObject.id : null);
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        console.warn("⚠️ Aviso: Evento recebido sem um ID de assinatura válido.");
        return new Response(JSON.stringify({ received: true, note: "Sem ID de sub" }), { status: 200 });
      }

      // Buscamos a assinatura no Stripe para garantir que temos o metadata atualizado
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const expiryDate = new Date(subscription.current_period_end * 1000).toISOString();

      // ✅ IDENTIFICAR O NOME DO PLANO BASEADO NO PRICE ID DA ASSINATURA
      const priceId = subscription.items.data[0].price.id;
      const planFriendlyName = PLAN_MAP[priceId] || 'Plano Profissional';

      // Combinamos metadados do objeto de dados e da assinatura
      const metadata = {
        ...subscription.metadata,
        ...dataObject.metadata
      };

      const isClubMember = metadata.type === 'club_member';

      if (isClubMember) {
        const { customerId, barbershopId, planId } = metadata;
        const { error: clubError } = await supabaseAdmin
          .from('club_subscriptions')
          .upsert({
            customer_id: customerId,
            barbershop_id: barbershopId,
            plan_id: planId,
            status: 'active',
            current_period_end: expiryDate,
            stripe_subscription_id: subscriptionId,
          }, { onConflict: 'customer_id' });

        if (clubError) {
          console.error("❌ Erro ao inserir club_subscription:", clubError.message);
          throw clubError;
        }
      } else {
        const barbershopId = metadata.barbershopId;

        if (!barbershopId) {
          console.error("❌ ERRO CRÍTICO: 'barbershopId' não encontrado nos metadados!");
        } else {
          const { data, error: shopError } = await supabaseAdmin
            .from('barbershops')
            .update({
              subscription_status: 'active',
              expires_at: expiryDate,
              subscription_id: subscriptionId,
              stripe_customer_id: dataObject.customer,
              current_plan: planFriendlyName // ✅ AGORA SALVA O NOME CORRETO NO BANCO
            })
            .eq('id', barbershopId)
            .select();

          if (shopError) {
            console.error("❌ Erro ao atualizar barbershops:", shopError.message);
            throw shopError;
          }
        }
      }
    }

    // 2. LÓGICA DE CANCELAMENTO
    if (event.type === 'customer.subscription.deleted') {
      const subId = dataObject.id;
      const { error: deleteError } = await Promise.all([
        supabaseAdmin
          .from('club_subscriptions')
          .update({ status: 'inactive' })
          .eq('stripe_subscription_id', subId),

        supabaseAdmin
          .from('barbershops')
          .update({
            subscription_status: 'canceled',
            current_plan: null // Opcional: limpa o plano ao cancelar
          })
          .eq('subscription_id', subId)
      ]).then(results => results.find(r => r.error) || { error: null });

      if (deleteError) {
        console.error("❌ Erro no processamento de cancelamento:", deleteError.message);
        throw deleteError;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`❌ Erro Geral no Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
})