import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ticket, CheckCircle2, ChevronRight } from 'lucide-react';

export default function ClubPlansView({ barbershopId, userId }: { barbershopId: string, userId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      const { data } = await supabase
        .from('club_plans')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);
      if (data) setPlans(data);
    }
    loadPlans();
  }, [barbershopId]);

  const handleSubscribe = async (priceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-checkout', {
        body: {
          priceId: priceId,
          customerId: userId,
          successUrl: `${window.location.origin}/perfil`,
          cancelUrl: `${window.location.origin}/`,
        }
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url; // Redireciona para o Stripe
    } catch (err) {
      alert("Erro ao iniciar pagamento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3 mb-8">
        <Ticket className="text-amber-500" size={24} />
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Planos do Clube</h2>
      </div>

      <div className="grid gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] hover:border-amber-500/20 transition-all group">
            <h3 className="text-lg font-black text-white uppercase italic mb-1">{plan.name}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4 line-clamp-2">
              {plan.description}
            </p>
            
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-black text-amber-500 italic">R$ {plan.price}</span>
                <span className="text-zinc-600 text-[10px] font-bold ml-2">/MÊS</span>
              </div>
              <button 
                onClick={() => handleSubscribe(plan.stripe_price_id)}
                disabled={loading}
                className="bg-white text-black px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group-hover:bg-amber-500 transition-colors"
              >
                Assinar <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}