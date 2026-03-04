import React, { useState, useEffect, useCallback } from 'react';
import { SERVICES as DEFAULT_SERVICES, BARBERS as DEFAULT_BARBERS } from '../constants';
import {
  Clock, Star, MapPin, ChevronRight, Award, Scissors,
  Loader2, Ticket, CheckCircle2, X, Crown, Zap, Shield,
  Gem, Sparkles, Gift, Diamond, Lock, Unlock, Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClientHomeProps {
  onStartBooking: () => void;
}

// ─────────────────────────────────────────────
// MODAL DE PLANOS
// ─────────────────────────────────────────────
interface PlansModalProps {
  plans: any[];
  subscribingId: string | null;
  onSubscribe: (plan: any) => void;
  onClose: () => void;
  isSubscriber?: boolean;
  currentPlan?: any;
}

const PlansModal: React.FC<PlansModalProps> = ({
  plans,
  subscribingId,
  onSubscribe,
  onClose,
  isSubscriber,
  currentPlan
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop com efeito especial para membros */}
      <div className={`absolute inset-0 backdrop-blur-md ${isSubscriber
          ? 'bg-gradient-to-br from-amber-950/90 via-black/95 to-purple-950/90'
          : 'bg-black/80'
        }`} />

      {/* Partículas animadas para VIP (só aparece para membros) */}
      {isSubscriber && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-500/30 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Painel */}
      <div className={`relative z-10 w-full md:max-w-5xl border rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_-20px_80px_rgba(245,158,11,0.15)] md:shadow-[0_40px_120px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-6 duration-500 ${isSubscriber
          ? 'bg-gradient-to-br from-zinc-950 via-amber-950/20 to-purple-950/20 border-amber-500/30'
          : 'bg-zinc-950 border-white/10'
        }`}>

        {/* Drag indicator mobile */}
        <div className="flex justify-center pt-3 pb-0 md:hidden">
          <div className={`w-10 h-1 rounded-full ${isSubscriber ? 'bg-amber-500/50' : 'bg-white/20'
            }`} />
        </div>

        {/* Header do modal com status VIP */}
        <div className={`flex items-center justify-between px-6 md:px-8 py-4 border-b ${isSubscriber ? 'border-amber-500/20' : 'border-white/8'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isSubscriber
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/30'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
              }`}>
              {isSubscriber ? <Diamond size={20} /> : <Crown size={20} />}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">
                {isSubscriber ? 'SEU PLANO ATUAL' : 'Exclusividade'}
              </p>
              <h2 className="text-xl md:text-2xl font-serif font-black text-white uppercase italic tracking-tight leading-none mt-0.5">
                {isSubscriber ? currentPlan?.name || 'Clube de Membros' : 'Clube de Membros'}
              </h2>
            </div>
          </div>

          {/* Badge VIP para membros */}
          {isSubscriber && (
            <div className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full text-black text-[8px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
              <Zap size={10} className="fill-current" /> MEMBRO VIP ATIVO
            </div>
          )}

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all active:scale-95 ${isSubscriber
                ? 'bg-white/10 hover:bg-white/15 border border-amber-500/30 text-amber-400 hover:text-white'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white'
              }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de planos */}
        <div className="overflow-y-auto max-h-[70vh] md:max-h-[60vh] px-6 md:px-8 py-6">
          <div className={`grid gap-4 ${plans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
              plans.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
            {plans.map((plan, index) => {
              const isHighlighted = index === Math.floor((plans.length - 1) / 2) && plans.length > 1;
              const isCurrentPlan = isSubscriber && currentPlan?.id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-[1.5rem] border p-6 overflow-hidden transition-all duration-300
                    ${isCurrentPlan
                      ? 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-purple-500/20 border-amber-500 shadow-[0_0_60px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/50'
                      : isHighlighted
                        ? 'bg-amber-500/8 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
                        : 'bg-zinc-900/60 border-white/8 hover:border-white/20'
                    }`}
                >
                  {/* Efeitos especiais para plano atual */}
                  {isCurrentPlan && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10 animate-pulse" />
                      <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/30 rounded-full blur-3xl animate-pulse" />
                    </>
                  )}

                  {isHighlighted && !isCurrentPlan && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-black text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap size={8} fill="currentColor" /> Mais Popular
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <CheckCircle2 size={10} /> PLANO ATUAL
                    </div>
                  )}

                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl
                    ${isCurrentPlan ? 'bg-amber-500/40' : isHighlighted ? 'bg-amber-500/20' : 'bg-amber-500/5'}`}
                  />

                  <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">{plan.name}</h4>

                  {/* Preço com destaque para membros */}
                  <div className="mb-4">
                    <span className={`text-3xl font-black italic leading-none ${isCurrentPlan ? 'text-amber-400' : 'text-amber-500'
                      }`}>
                      R$ {Number(plan.price).toFixed(2)}
                    </span>
                    <span className="text-zinc-600 text-[11px] font-bold ml-1.5 italic">/mês</span>
                  </div>

                  {/* Descrição completa */}
                  {plan.description && (
                    <p className="text-zinc-400 text-[11px] leading-relaxed font-medium mb-4 border-t border-white/5 pt-4">
                      {plan.description}
                    </p>
                  )}

                  {/* Benefícios */}
                  <div className="space-y-2 mb-5 flex-1">
                    <div className="flex items-start gap-2.5 text-zinc-300">
                      <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${isCurrentPlan ? 'text-amber-400' : 'text-amber-500'
                        }`} />
                      <span className="text-[10px] font-black uppercase italic tracking-wider">
                        {plan.limit_services} Serviço{plan.limit_services > 1 ? 's' : ''} Incluso{plan.limit_services > 1 ? 's' : ''}/mês
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-zinc-300">
                      <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${isCurrentPlan ? 'text-amber-400' : 'text-amber-500'
                        }`} />
                      <span className="text-[10px] font-black uppercase italic tracking-wider">Agendamento Prioritário</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-zinc-300">
                      <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${isCurrentPlan ? 'text-amber-400' : 'text-amber-500'
                        }`} />
                      <span className="text-[10px] font-black uppercase italic tracking-wider">Acesso ao Clube Exclusivo</span>
                    </div>

                    {/* Benefício extra para membros */}
                    {isCurrentPlan && (
                      <div className="flex items-start gap-2.5 text-amber-400 mt-3 pt-3 border-t border-amber-500/20">
                        <Sparkles size={14} className="mt-0.5 shrink-0" />
                        <span className="text-[10px] font-black uppercase italic tracking-wider">
                          10% OFF em serviços adicionais
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botão com estados diferentes para membros */}
                  {isCurrentPlan ? (
                    <div className="w-full py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center gap-2 cursor-default">
                      <CheckCircle2 size={15} /> Assinatura Ativa
                    </div>
                  ) : (
                    <button
                      onClick={() => onSubscribe(plan)}
                      disabled={!!subscribingId || isSubscriber}
                      className={`w-full py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95
                        ${isSubscriber
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          : isHighlighted
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_8px_30px_rgba(245,158,11,0.35)]'
                            : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                        }`}
                    >
                      {subscribingId === plan.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : isSubscriber
                          ? <>Indisponível <Lock size={13} /></>
                          : <>Fazer Parte <ChevronRight size={13} strokeWidth={3} /></>
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mensagem para membros já assinantes */}
          {isSubscriber && (
            <div className="mt-6 text-center">
              <p className="text-amber-500/70 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <Shield size={12} />
                Você já possui uma assinatura ativa. Aproveite todos os benefícios!
              </p>
            </div>
          )}
        </div>

        {/* Footer do modal */}
        <div className={`px-6 md:px-8 py-4 border-t ${isSubscriber ? 'border-amber-500/10' : 'border-white/5'
          } flex items-center gap-2.5 ${isSubscriber ? 'bg-gradient-to-r from-transparent via-amber-950/20 to-transparent' : 'bg-zinc-950/60'
          }`}>
          <Shield size={13} className="text-zinc-600 shrink-0" />
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            Pagamento seguro via Stripe · Cancele quando quiser · Sem fidelidade
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const ClientHome: React.FC<ClientHomeProps> = ({ onStartBooking }) => {
  const [realBarbers, setRealBarbers] = useState<any[]>([]);
  const [realServices, setRealServices] = useState<any[]>([]);
  const [clubPlans, setClubPlans] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [shopAddress, setShopAddress] = useState<string>('');
  const [barbershopId, setBarbershopId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>('');
  const [showPlansModal, setShowPlansModal] = useState(false);

  // Estados para verificar assinatura do usuário na tabela club_subscriptions
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const slug = window.location.pathname.split('/')[1];
        setCurrentSlug(slug);

        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('id, address')
          .eq('slug', slug)
          .single();

        if (barbershop) {
          setBarbershopId(barbershop.id);
          setShopAddress(barbershop.address || 'Endereço não informado');

          const [barbersRes, servicesRes, settingsRes, plansRes] = await Promise.all([
            supabase.from('barbers').select('*').eq('barbershop_id', barbershop.id).order('name'),
            supabase.from('services').select('*').eq('barbershop_id', barbershop.id).order('price'),
            supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershop.id).maybeSingle(),
            supabase.from('club_plans').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true),
          ]);

          setRealBarbers(barbersRes.data || DEFAULT_BARBERS);
          setRealServices(servicesRes.data || DEFAULT_SERVICES);
          setShopSettings(settingsRes.data);
          setClubPlans(plansRes.data || []);

          // Verificar assinatura do usuário na tabela club_subscriptions
          await checkUserSubscription(barbershop.id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
        setCheckingSubscription(false);
      }
    }
    loadData();
  }, []);

  const checkUserSubscription = async (barbershopId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Verificação de segurança: se não há sessão ou user, para aqui.
      if (!session || !session.user) {
        setIsSubscriber(false);
        return;
      }

      // 2. O ID correto é session.user.id
      const userId = session.user.id;
      const { data: subscription, error } = await supabase
        .from('club_subscriptions')
        .select(`
        *,
        club_plans!inner (*)
      `)
        .eq('customer_id', userId) // <-- Aqui usamos o ID correto
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        return; // Evita continuar se houver erro de banco
      }

      if (subscription) {
        setIsSubscriber(true);
        setUserSubscription(subscription);
      } else {
        setIsSubscriber(false);
        setUserSubscription(null);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      setIsSubscriber(false);
    }
  };

  // Função para verificar novamente a assinatura (pode ser chamada após ações)
  const refreshSubscription = useCallback(async () => {
    if (barbershopId) {
      await checkUserSubscription(barbershopId);
    }
  }, [barbershopId]);

  // Bloqueia scroll quando modal aberto
  useEffect(() => {
    document.body.style.overflow = showPlansModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showPlansModal]);

  const handleSubscribe = useCallback(async (plan: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert('Por favor, faça login para assinar.'); return; }

    setSubscribingId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-checkout', {
        body: {
          priceId: plan.stripe_price_id,
          customerId: session.user.id,
          planId: plan.id,
          barbershopId,
          successUrl: `${window.location.origin}/${currentSlug}`,
          cancelUrl: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      alert('Erro ao iniciar assinatura: ' + err.message);
    } finally {
      setSubscribingId(null);
    }
  }, [barbershopId, currentSlug]);

  const getStatus = () => {
    if (!shopSettings) return { label: 'Carregando...', color: 'text-zinc-500', dot: 'bg-zinc-500' };
    if (shopSettings.is_closed) return { label: 'Fechado Temporariamente', color: 'text-red-500', dot: 'bg-red-500' };

    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oH, oM] = shopSettings.opening_time.split(':').map(Number);
    const [cH, cM] = shopSettings.closing_time.split(':').map(Number);

    return cur >= oH * 60 + oM && cur < cH * 60 + cM
      ? { label: 'Aberto Agora', color: 'text-emerald-500', dot: 'bg-emerald-500' }
      : { label: 'Fechado no Momento', color: 'text-zinc-500', dot: 'bg-zinc-500' };
  };

  const status = getStatus();

  // ── Loading ──
  if (loading || checkingSubscription) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      {isSubscriber ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500 rounded-full blur-3xl animate-pulse" />
            <Diamond className="text-amber-500 animate-spin-slow relative z-10" size={50} />
          </div>
          <p className="text-amber-500 font-black tracking-widest uppercase text-[10px]">Carregando experiência VIP...</p>
        </>
      ) : (
        <>
          <Loader2 className="text-amber-500 animate-spin" size={40} />
          <p className="text-amber-500 font-black tracking-widest uppercase text-[10px]">Iniciando Experiência...</p>
        </>
      )}
    </div>
  );

  return (
    <>
      {showPlansModal && clubPlans.length > 0 && (
        <PlansModal
          plans={clubPlans}
          subscribingId={subscribingId}
          onSubscribe={handleSubscribe}
          onClose={() => setShowPlansModal(false)}
          isSubscriber={isSubscriber}
          currentPlan={userSubscription?.club_plans}
        />
      )}

      <div className="relative min-h-screen text-white overflow-x-hidden">

        {/* Background fixo com efeito especial para VIPs */}
        <div className="fixed inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-40 md:opacity-60"
            alt="Barbearia Background"
          />
          <div className={`absolute inset-0 ${isSubscriber
              ? 'bg-gradient-to-b from-amber-950/40 via-purple-950/30 to-black'
              : 'bg-gradient-to-b from-black/80 via-black/40 to-black'
            }`} />

          {/* Overlay especial para membros */}
          {isSubscriber && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          )}
        </div>

        <div className="relative z-10">

          {/* ─── Status Bar com indicador VIP ─── */}
          <div className="sticky top-0 z-[100] w-full px-4 pt-3 flex justify-center pointer-events-none">
            <div className={`backdrop-blur-2xl border rounded-2xl p-2.5 md:p-3 flex items-center justify-between shadow-2xl max-w-lg w-full pointer-events-auto ${isSubscriber
                ? 'bg-gradient-to-r from-amber-950/90 via-zinc-950/90 to-purple-950/90 border-amber-500/30'
                : 'bg-zinc-950/90 border-white/10'
              }`}>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-2 h-2 rounded-full animate-pulse ${status.dot}`} />
                <div>
                  <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest leading-none ${status.color}`}>
                    {status.label}
                  </p>
                  {shopSettings && !shopSettings.is_closed && (
                    <p className="text-[8px] text-zinc-500 font-bold uppercase italic mt-0.5 leading-none">
                      {shopSettings.opening_time} — {shopSettings.closing_time}
                    </p>
                  )}
                </div>
              </div>

              {/* Badge VIP para membros */}
              {isSubscriber && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full text-black text-[8px] font-black uppercase tracking-wider mx-2">
                  <Crown size={10} className="fill-current" /> VIP
                </div>
              )}

              <div className={`h-5 w-[1px] ${isSubscriber ? 'bg-amber-500/30' : 'bg-white/10'} mx-2 md:mx-3`} />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${isSubscriber ? 'bg-amber-500/20' : 'bg-amber-500/10'
                  }`}>
                  <MapPin size={13} className={isSubscriber ? 'text-amber-400' : 'text-amber-500'} />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-white uppercase italic tracking-tighter truncate">
                  {shopAddress}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Hero com mensagem personalizada para VIPs ─── */}
          <section className="min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center px-6 text-center pt-6">
            <div className="space-y-3 md:space-y-4 max-w-5xl animate-in fade-in slide-in-from-bottom-10 duration-1000">

              {/* Badge de boas-vindas personalizada */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] ${isSubscriber
                  ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400'
                  : 'bg-black/50 border border-white/10 text-amber-500'
                }`}>
                {isSubscriber ? (
                  <>
                    <Sparkles size={11} className="text-amber-400" /> Bem-vindo de volta, Membro VIP
                  </>
                ) : (
                  <>
                    <Award size={11} /> Tradição & Excelência Premium
                  </>
                )}
              </div>

              <h2 className="text-[13vw] md:text-[7rem] lg:text-[7.5rem] font-serif font-black tracking-tighter leading-[0.85]">
                {isSubscriber ? 'ESTILO' : 'ESTILO'} <br />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isSubscriber
                    ? 'from-amber-400 via-amber-300 to-purple-400'
                    : 'from-amber-400 to-amber-600'
                  } italic`}>
                  {isSubscriber ? 'V.I.P.' : 'SEM LIMITES.'}
                </span>
              </h2>

              <p className={`text-xs font-medium max-w-sm mx-auto leading-relaxed px-4 ${isSubscriber ? 'text-amber-100/70' : 'text-zinc-400'
                }`}>
                {isSubscriber
                  ? 'Aproveite seus benefícios exclusivos, agendamento prioritário e condições especiais.'
                  : 'A experiência definitiva em cuidados masculinos. Onde a tradição encontra a modernidade.'}
              </p>

              {/* CTAs com tratamento VIP */}
              <div className="pt-3 md:pt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onStartBooking}
                  disabled={shopSettings?.is_closed}
                  className={`group relative font-black py-3.5 md:py-4 px-8 md:px-10 rounded-2xl text-base md:text-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full max-w-[260px] sm:w-auto
                    ${shopSettings?.is_closed
                      ? 'bg-zinc-800 text-red-500 cursor-not-allowed opacity-90'
                      : isSubscriber
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-[0_12px_30px_rgba(245,158,11,0.5)] hover:scale-105'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_12px_30px_rgba(245,158,11,0.3)] hover:scale-105'
                    }`}
                >
                  {shopSettings?.is_closed ? 'Unidade Fechada' : isSubscriber ? 'Agendar com Prioridade' : 'Agendar Agora'}
                  {!shopSettings?.is_closed && (
                    <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} size={18} />
                  )}
                </button>

                {clubPlans.length > 0 && (
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className={`group font-black py-3.5 md:py-4 px-8 md:px-10 rounded-2xl text-base md:text-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full max-w-[260px] sm:w-auto border ${isSubscriber
                        ? 'bg-gradient-to-r from-amber-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/60 hover:scale-105'
                        : 'bg-transparent hover:bg-white/5 text-white border-white/20 hover:border-amber-500/50 hover:scale-105'
                      }`}
                  >
                    {isSubscriber ? <Gem size={18} className="text-amber-400" /> : <Crown size={18} className="text-amber-500" />}
                    {isSubscriber ? 'Gerenciar Assinatura' : 'Clube de Membros'}
                  </button>
                )}
              </div>

              {/* Benefícios rápidos para membros */}
              {isSubscriber && userSubscription && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[8px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Zap size={10} className="fill-amber-400" /> {userSubscription.club_plans?.limit_services} serviços inclusos
                  </div>
                  <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Clock size={10} /> Agendamento prioritário
                  </div>
                  <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Gift size={10} /> 10% OFF extra
                  </div>

                  {/* Info de renovação */}
                  {userSubscription.current_period_end && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Clock size={10} /> Renova em {new Date(userSubscription.current_period_end).toLocaleDateString('pt-BR')}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ─── Banner Clube com status personalizado ─── */}
          {clubPlans.length > 0 && (
            <section className="max-w-4xl mx-auto px-6 pb-6 md:pb-10 -mt-2">
              <button
                onClick={() => setShowPlansModal(true)}
                className={`group w-full relative overflow-hidden rounded-[1.5rem] border p-5 md:p-7 flex flex-col md:flex-row items-center gap-4 md:gap-8 text-left transition-all duration-500 active:scale-[0.99] ${isSubscriber
                    ? 'bg-gradient-to-br from-amber-900/30 via-purple-900/30 to-zinc-900 border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.2)] hover:shadow-[0_0_80px_rgba(245,158,11,0.3)]'
                    : 'bg-gradient-to-br from-zinc-900/80 via-amber-500/5 to-zinc-900/80 border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.06)] hover:shadow-[0_0_60px_rgba(245,158,11,0.15)]'
                  }`}
              >
                <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${isSubscriber ? 'bg-amber-500/30' : 'bg-amber-500/10 group-hover:bg-amber-500/20'
                  }`} />
                <div className={`absolute -bottom-12 -left-12 w-44 h-44 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${isSubscriber ? 'bg-purple-500/30' : 'bg-amber-500/5 group-hover:bg-amber-500/10'
                  }`} />

                <div className={`relative shrink-0 p-4 rounded-xl group-hover:scale-110 transition-all duration-500 ${isSubscriber
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-500 group-hover:bg-amber-500/20'
                  }`}>
                  {isSubscriber ? <Diamond size={30} /> : <Crown size={30} />}
                </div>

                <div className="relative flex-1 text-center md:text-left">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-0.5">
                    {isSubscriber ? 'SEU STATUS VIP' : 'Exclusividade'}
                  </p>
                  <h3 className="text-xl md:text-2xl font-serif font-black text-white uppercase italic tracking-tight leading-none mb-2">
                    {isSubscriber ? `Plano ${userSubscription?.club_plans?.name}` : 'Clube de Membros'}
                  </h3>

                  {isSubscriber ? (
                    <>
                      <p className="text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                        Assinatura ativa · {userSubscription?.club_plans?.limit_services} serviços/mês
                      </p>
                      {userSubscription?.current_period_end && (
                        <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-wider mt-1">
                          Renova em {new Date(userSubscription.current_period_end).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                        <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                          <Users size={8} /> Desde {new Date(userSubscription.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        {clubPlans.length} plano{clubPlans.length > 1 ? 's' : ''} disponíve{clubPlans.length > 1 ? 'is' : 'l'} · Assinatura mensal · Cancele quando quiser
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                        {clubPlans.map((p) => (
                          <div key={p.id} className="flex items-baseline gap-1">
                            <span className="text-white text-xs font-black italic">{p.name}</span>
                            <span className="text-amber-500 text-[10px] font-black italic">R$ {Number(p.price).toFixed(2)}/mês</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className={`relative shrink-0 p-2.5 rounded-xl transition-all duration-300 ${isSubscriber
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'bg-white/5 border border-white/10 group-hover:bg-amber-500 group-hover:border-amber-500'
                  }`}>
                  <ChevronRight size={18} className={isSubscriber ? 'text-black' : 'text-white'} strokeWidth={2.5} />
                </div>
              </button>
            </section>
          )}

          {/* ─── Serviços com preços diferenciados para VIPs ─── */}
          <section className="max-w-7xl mx-auto px-6 py-8 md:py-14">
            <div className="flex flex-col items-center mb-6 md:mb-10 text-center">
              <h3 className="text-2xl md:text-4xl font-serif font-bold mb-3 tracking-tight uppercase italic">
                {isSubscriber ? 'Menu VIP' : 'Menu de Serviços'}
              </h3>
              <div className="h-1 w-12 md:w-20 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]" />

              {isSubscriber && (
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider mt-3">
                  Preços com desconto de membro aplicado
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {realServices.map((service) => {
                // Calcular preço com desconto para membros (10% OFF)
                const vipPrice = isSubscriber ? Number(service.price) * 0.9 : Number(service.price);

                return (
                  <div
                    key={service.id}
                    className={`group relative backdrop-blur-xl border p-5 md:p-6 rounded-[1.5rem] transition-all duration-500 ${isSubscriber
                        ? 'bg-gradient-to-br from-amber-950/20 via-zinc-900/40 to-purple-950/20 border-amber-500/20 hover:border-amber-500/60 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]'
                        : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/60 hover:border-amber-500/40'
                      }`}
                  >
                    {/* Indicador de desconto VIP */}
                    {isSubscriber && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg z-10">
                        <Zap size={8} fill="currentColor" /> -10%
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4 md:mb-5">
                      <div className={`p-2.5 md:p-3 rounded-xl border transition-all ${isSubscriber
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 group-hover:bg-amber-500 group-hover:text-black'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-black'
                        }`}>
                        <Scissors size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-widest italic">Valor</span>
                        {isSubscriber ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-zinc-500 line-through italic">
                              R$ {Number(service.price).toFixed(2)}
                            </span>
                            <span className="text-xl md:text-2xl font-black text-amber-400 tracking-tighter italic">
                              R$ {vipPrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl md:text-2xl font-black text-white tracking-tighter italic">
                            R$ {Number(service.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className={`text-lg md:text-xl font-black mb-1.5 uppercase italic ${isSubscriber ? 'group-hover:text-amber-400' : 'group-hover:text-amber-500'
                      } transition-colors`}>
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-[0.15em] italic">
                      <Clock size={11} className={isSubscriber ? 'text-amber-400' : 'text-amber-500'} />
                      {service.duration}
                    </div>

                    {/* Badge de benefício VIP */}
                    {isSubscriber && (
                      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-amber-500/20 text-amber-400 text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                          <Gift size={8} /> EXCLUSIVO VIP
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── Especialistas com tratamento VIP ─── */}
          <section className={`py-10 md:py-16 backdrop-blur-md border-y relative overflow-hidden ${isSubscriber
              ? 'bg-gradient-to-b from-amber-950/30 via-zinc-950/80 to-purple-950/30 border-amber-500/20'
              : 'bg-zinc-950/80 border-white/5'
            }`}>
            {/* Efeito de luz especial para VIPs */}
            {isSubscriber && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
            )}

            <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
              <h3 className="text-2xl md:text-4xl font-serif font-bold mb-8 md:mb-12 tracking-tight uppercase italic">
                {isSubscriber ? 'Elite Team' : 'Nossos Especialistas'}
              </h3>
              <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-6 md:gap-14">
                {realBarbers.map((barber) => (
                  <div key={barber.id} className="group text-center">
                    <div className="relative mb-4 mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
                      <div className={`absolute inset-0 rounded-full blur-[30px] md:blur-[50px] opacity-0 group-hover:opacity-20 transition-all duration-700 ${isSubscriber ? 'bg-amber-400' : 'bg-amber-500'
                        }`} />

                      {/* Coroa VIP para barbeiros destaque (opcional) */}
                      {isSubscriber && barber.rating >= 4.8 && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                          <Crown size={20} className="text-amber-400 fill-amber-400 drop-shadow-lg" />
                        </div>
                      )}

                      <img
                        src={barber.photo}
                        alt={barber.name}
                        className={`relative w-full h-full rounded-full object-cover border-2 transition-all duration-1000 group-hover:scale-105 ${isSubscriber
                            ? 'border-amber-500/30 group-hover:border-amber-400 group-hover:grayscale-0 grayscale-[50%]'
                            : 'border-white/10 group-hover:border-amber-500 group-hover:grayscale-0 grayscale'
                          }`}
                      />
                      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-black text-[7px] md:text-[9px] font-black px-2.5 md:px-4 py-1 md:py-1.5 rounded-full flex items-center gap-1 shadow-xl uppercase italic whitespace-nowrap ${isSubscriber
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-amber-500'
                        }`}>
                        <Star size={8} fill="currentColor" /> {barber.rating || '5.0'}
                      </div>
                    </div>
                    <h4 className="font-black text-base md:text-xl mb-0.5 tracking-tight uppercase italic">{barber.name}</h4>
                    <p className={`text-[8px] md:text-[10px] uppercase font-black tracking-[0.2em] italic truncate ${isSubscriber ? 'text-amber-400/70' : 'text-zinc-600'
                      }`}>
                      {Array.isArray(barber.specialties) ? barber.specialties[0] : 'Master Barber'}
                    </p>

                    {/* Selo de disponibilidade prioritária para membros */}
                    {isSubscriber && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <Zap size={8} className="text-amber-400 fill-amber-400" />
                        <span className="text-[6px] text-amber-400 font-black uppercase tracking-wider">Prioridade</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Seção exclusiva para membros (benefícios) ─── */}
          {isSubscriber && (
            <section className="py-8 md:py-12 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-5 text-center backdrop-blur-sm">
                    <div className="w-10 h-10 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Zap size={18} className="text-amber-400 fill-amber-400" />
                    </div>
                    <h4 className="text-sm font-black uppercase italic mb-1">Agendamento Prioritário</h4>
                    <p className="text-[10px] text-zinc-400">Seus horários são sempre garantidos com preferência total</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-5 text-center backdrop-blur-sm">
                    <div className="w-10 h-10 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Gift size={18} className="text-amber-400" />
                    </div>
                    <h4 className="text-sm font-black uppercase italic mb-1">10% OFF em Serviços</h4>
                    <p className="text-[10px] text-zinc-400">Desconto especial em todos os serviços adicionais</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-5 text-center backdrop-blur-sm">
                    <div className="w-10 h-10 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Diamond size={18} className="text-amber-400" />
                    </div>
                    <h4 className="text-sm font-black uppercase italic mb-1">Eventos Exclusivos</h4>
                    <p className="text-[10px] text-zinc-400">Acesso a eventos e lançamentos antes de todos</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── Footer com selo VIP ─── */}
          <footer className={`py-6 px-6 text-center border-t ${isSubscriber ? 'border-amber-500/20 bg-gradient-to-b from-black to-amber-950/20' : 'border-white/5 bg-black'
            }`}>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] italic">
              © 2026 {shopAddress.split(',')[0]} — Todos os direitos reservados
            </p>
            {isSubscriber && (
              <div className="mt-2 flex items-center justify-center gap-2 text-[8px] text-amber-500/50 font-black uppercase tracking-wider">
                <Crown size={10} /> MEMBRO VIP • TRATAMENTO PREMIUM
              </div>
            )}
          </footer>

        </div>
      </div>
    </>
  );
};

export default ClientHome;