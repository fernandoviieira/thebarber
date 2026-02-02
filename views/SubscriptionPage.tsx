import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Zap,
  Crown,
  ShieldCheck,
  Loader2,
  Star,
  CreditCard,
  Settings,
  ArrowRight,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SubscriptionPageProps {
  barbershopId: string;
  userEmail: string;
  subscriptionStatus?: string; // 'trialing' | 'active' | 'canceled' | ...
  expiresAt?: string | null;   // ISO string
  currentPlan?: string | null; // Nome do plano salvo no banco
}

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string; // Ex: 'mês' | '6 meses' | 'ano'
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Dias corridos (por calendário) até a expiração.
 * - 0: expira hoje
 * - 1: expira amanhã
 * - n>1: expira em n dias
 * - negativo: expirou há |n| dias
 */
function getDaysRemainingCalendar(expiresAtIso?: string | null) {
  if (!expiresAtIso) return null;

  const exp = new Date(expiresAtIso);
  if (Number.isNaN(exp.getTime())) return null;

  const today = startOfDay(new Date());
  const expDay = startOfDay(exp);

  const ms = expDay.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatExpiryLabel(daysRemaining: number) {
  if (daysRemaining < 0) {
    const d = Math.abs(daysRemaining);
    return d === 1 ? 'Expirada há 1 dia' : `Expirada há ${d} dias`;
  }
  if (daysRemaining === 0) return 'Expira hoje';
  if (daysRemaining === 1) return 'Expira amanhã';
  return `Expira em ${daysRemaining} dias (corridos)`;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  barbershopId,
  userEmail,
  subscriptionStatus,
  expiresAt,
  currentPlan,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const PLANS: Plan[] = useMemo(
    () => [
      {
        id: 'price_1Sw699CGAUiO3UxF2EYuFKWg',
        name: 'Mensal PRO',
        price: '89,90',
        period: 'mês',
        description: 'Flexibilidade total para seu negócio.',
        icon: <Zap size={22} />,
        popular: false,
        color: 'from-zinc-500 to-zinc-800',
      },
      {
        id: 'price_1Sw6AJCGAUiO3UxFVNsNQI7n',
        name: 'Semestral ELITE',
        price: '479,40',
        period: '6 meses',
        description: 'O preferido das barbearias que crescem.',
        icon: <Star size={22} />,
        popular: true,
        color: 'from-amber-400 to-amber-600',
      },
      {
        id: 'price_1Sw6AzCGAUiO3UxF9SiVikDM',
        name: 'Anual BLACK',
        price: '838,80',
        period: 'ano',
        description: 'O melhor custo-benefício por dia.',
        icon: <Crown size={22} />,
        popular: false,
        color: 'from-amber-600 to-yellow-700',
      },
    ],
    []
  );

  const popularPlanId = useMemo(
    () => PLANS.find((p) => p.popular)?.id ?? PLANS[0]?.id ?? null,
    [PLANS]
  );

  useEffect(() => {
    if (!selectedPlanId && popularPlanId) setSelectedPlanId(popularPlanId);
  }, [popularPlanId, selectedPlanId]);


  const isSubActiveByStatus = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const daysRemaining = useMemo(() => getDaysRemainingCalendar(expiresAt), [expiresAt]);
  const isUrgent = useMemo(() => {
    if (daysRemaining === null) return false;
    return daysRemaining <= 5; // inclui expirado (<0) e até 5 dias
  }, [daysRemaining]);

  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const isOperationallyActive = isSubActiveByStatus && !isExpired;

  const statusTone = useMemo(() => {
    if (isExpired) return 'danger';
    if (isUrgent) return 'danger';
    if (subscriptionStatus === 'active') return 'ok';
    if (subscriptionStatus === 'trialing') return 'warn';
    return 'muted';
  }, [subscriptionStatus, isUrgent, isExpired]);

  const statusLabel = useMemo(() => {
    if (daysRemaining !== null) return formatExpiryLabel(daysRemaining);

    if (subscriptionStatus === 'trialing') return 'Período de Teste Grátis';
    if (subscriptionStatus === 'active') return 'Plano Profissional Ativo';
    if (subscriptionStatus === 'canceled') return 'Assinatura Cancelada';
    return 'Aguardando Ativação';
  }, [subscriptionStatus, daysRemaining]);

  const helperLine = useMemo(() => {
    if (isExpired) {
      return 'Sua licença está expirada. Reative agora para evitar bloqueio da unidade e da Sarah AI.';
    }

    if (isUrgent && isSubActiveByStatus) {
      return 'Renove antes do vencimento para manter sua unidade e a Sarah AI sem interrupções.';
    }

    if (isOperationallyActive) {
      return 'Sua unidade está operando em alta performance.';
    }

    return 'Sua licença não está ativa. Selecione um plano abaixo para liberar o acesso.';
  }, [isExpired, isUrgent, isSubActiveByStatus, isOperationallyActive]);

  const handleSubscribe = async (priceId: string) => {
    // Bloqueia apenas se já for um assinante pagante ativo e sem urgência
    if (subscriptionStatus === 'active' && !isUrgent && !isExpired) return;

    setLoadingPlanId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { barbershopId, userEmail, priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      alert('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleManageBilling = async () => {
    setIsBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { barbershopId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      alert('Erro ao acessar o portal financeiro.');
    } finally {
      setIsBillingLoading(false);
    }
  };

  /**
   * UX: quando estiver urgente (inclui expirado), habilita o botão de billing
   * mesmo se o status estiver inconsistente (ex.: status vazio mas expiresAt existe e expirou).
   */
  const canOpenBillingPortal = isSubActiveByStatus || isUrgent;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* 1) STATUS BAR */}
      <div
        className={`
          border rounded-[2.5rem] p-5 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500
          ${statusTone === 'danger'
            ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.12)]'
            : 'bg-zinc-900/50 border-white/5'}
        `}
      >
        <div className="flex items-center gap-6">
          <div
            className={`
              p-4 rounded-2xl shadow-lg
              ${statusTone === 'danger' ? 'bg-red-500 text-white' : ''}
              ${statusTone === 'ok' ? 'bg-green-500/10 text-green-500' : ''}
              ${statusTone === 'warn' ? 'bg-amber-500/10 text-amber-500' : ''}
              ${statusTone === 'muted' ? 'bg-white/5 text-slate-400' : ''}
            `}
          >
            {statusTone === 'danger' ? <AlertTriangle size={28} /> : <ShieldCheck size={28} />}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Plano Atual:{' '}
                <span className="text-white ml-1">{currentPlan || 'Nenhum'}</span>
              </p>

              {/* Só marca verdinho se estiver operacionalmente ativo (OPÇÃO 1) */}
              {isOperationallyActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
              )}
            </div>

            <h3 className="text-white font-black uppercase italic text-xl lg:text-2xl leading-none tracking-tighter">
              {statusLabel}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <CalendarClock size={14} className="opacity-80" />
              <span>{helperLine}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleManageBilling}
          // Bloqueia se:
          // 1. Estiver carregando OU
          // 2. For um usuário em teste (trialing) - pois ainda não tem portal OU
          // 3. Não tiver permissão de abertura (canOpenBillingPortal)
          disabled={isBillingLoading || subscriptionStatus === 'trialing' || !canOpenBillingPortal}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all group border font-black uppercase text-[10px] tracking-widest
                ${statusTone === 'danger'
              ? 'bg-red-500 text-white border-red-400 hover:bg-red-600 shadow-xl shadow-red-500/20'
              : (canOpenBillingPortal && subscriptionStatus !== 'trialing')
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                : 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed'}
  `}
        >
          {isBillingLoading ? <Loader2 className="animate-spin" size={18} /> : <Settings size={18} />}
          <span>{statusTone === 'danger' ? 'Resolver Faturamento' : 'Configurações de Cobrança'}</span>
        </button>
      </div>

      {/* 2) TÍTULO */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white">
          POTENCIALIZE <br /> <span className="text-amber-500">SUA UNIDADE</span>
        </h2>
        <p className="text-slate-500 uppercase text-[10px] tracking-[0.5em] font-bold">
          Assine agora e libere acesso ilimitado
        </p>
      </div>

      {/* 3) GRID DE PLANOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const isLoading = loadingPlanId === plan.id;

          // Só bloqueia checkout quando está 100% ok (ativo operacionalmente e não urgente)
          const checkoutDisabled = (subscriptionStatus === 'active') && !isUrgent && !isExpired;
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`
                relative flex flex-col rounded-[3rem] p-10 transition-all duration-500 cursor-pointer
                min-w-0 overflow-hidden
                ${plan.popular
                  ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-2 border-amber-500 shadow-2xl'
                  : 'bg-zinc-900/40 border border-white/5'}
                ${isSelected ? 'scale-[1.02] ring-2 ring-amber-500/50 bg-amber-500/5' : 'hover:-translate-y-2'}
                ${checkoutDisabled ? 'opacity-50 grayscale-[0.5]' : ''}
              `}
            >
              {plan.popular && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] px-6 py-2 rounded-full font-black uppercase tracking-widest">
                  Mais Popular
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-10 shadow-xl`}>
                {plan.icon}
              </div>

              <h3 className="text-3xl font-black uppercase italic text-white mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-10 font-bold leading-relaxed">
                {plan.description}
              </p>

              {/* PREÇO (corrigido para não vazar) */}
              <div className="mb-10 flex flex-wrap items-end gap-x-2 gap-y-2 min-w-0">
                <span className="text-xl sm:text-2xl font-black text-white/30 leading-none">R$</span>

                <span className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
                  {plan.price}
                </span>

                {/* Chip do período: não estoura e fica sempre legível */}
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-slate-300 whitespace-nowrap">
                  / {plan.period}
                </span>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                {['Agendamento Ilimitado', 'Sarah AI Insights', 'Gestão Financeira', 'Estoque & Vendas'].map((f, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="p-1 rounded-full bg-amber-500/20 text-amber-500">
                      <Check size={14} />
                    </div>
                    <span className="text-[11px] uppercase font-black text-slate-300">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubscribe(plan.id);
                }}
                disabled={checkoutDisabled || isLoading}
                className={`
                  w-full py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-3
                  ${plan.popular ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/10 text-white hover:bg-white/20'}
                  ${checkoutDisabled ? 'cursor-not-allowed' : ''}
                `}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>{isSelected ? 'Confirmar Plano' : 'Selecionar'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <footer className="text-center pt-10 space-y-4 opacity-50">
        <div className="flex items-center justify-center gap-8 text-slate-500">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase">
            <ShieldCheck size={16} /> Safe Checkout
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase">
            <CreditCard size={16} /> Stripe Secure
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SubscriptionPage;
