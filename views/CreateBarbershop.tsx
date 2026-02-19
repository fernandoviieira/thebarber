import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Globe, CheckCircle, Loader2, Phone } from 'lucide-react';

const CreateBarbershop: React.FC = () => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 15);
  };

  async function handleCreate() {
    if (!name || !slug) return alert("Nome e URL são obrigatórios.");
    setIsSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Sessão inválida ou expirada. Por favor, faça login novamente.");
      }

      const trialDays = 20;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .insert([{
          name,
          slug,
          address,
          phone: phone || null,
          owner_id: user.id,
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt.toISOString(),
          expires_at: trialEndsAt.toISOString()
        }])
        .select()
        .single();

      if (shopError) {
        if (shopError.code === '23505') throw new Error("Esta URL (slug) já está em uso. Tente outro nome.");
        throw shopError;
      }

      if (shop) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            barbershop_id: shop.id,
            role: 'admin',
            full_name: user.user_metadata?.full_name || name
          }, { onConflict: 'id' });

        if (profileError) throw profileError;

        setStep(2);
      }
    } catch (err: any) {
      console.error("Erro completo:", err);
      alert("Erro ao configurar unidade: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        {/* Decorativo de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

        {step === 1 ? (
          <div className="space-y-6 relative z-10">
            <header className="text-center space-y-2">
              <div className="bg-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.4)] transform -rotate-6">
                <Store size={32} className="text-black" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Nova Unidade</h2>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Configure seu espaço no Barbers Pro</p>
            </header>

            <div className="space-y-4">
              {/* NOME COMERCIAL */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 block">Nome Comercial</label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
                  }}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-amber-500 outline-none text-white transition-all placeholder:text-zinc-800"
                  placeholder="Ex: Barbearia Luxo"
                />
              </div>

              {/* SLUG (URL) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest ml-2 block italic">Link exclusivo (Slug)</label>
                <div className="flex items-center bg-black border border-zinc-800 rounded-2xl p-4 focus-within:border-amber-500 transition-all">
                  <Globe size={16} className="text-zinc-600 mr-2" />
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''))}
                    className="flex-1 bg-transparent outline-none text-amber-500 font-bold text-sm font-mono"
                    placeholder="barbearia-luxo"
                  />
                </div>
              </div>

              {/* TELEFONE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 block">Telefone / WhatsApp</label>
                <div className="flex items-center bg-black border border-zinc-800 rounded-2xl p-4 focus-within:border-amber-500 transition-all">
                  <Phone size={16} className="text-zinc-600 mr-2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="flex-1 bg-transparent outline-none text-white text-sm"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* CIDADE / LOCALIZAÇÃO */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cidade / Localização</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 focus:border-amber-500 outline-none text-white transition-all placeholder:text-zinc-800"
                  placeholder="Ex: São Paulo, SP"
                />
              </div>

              {/* BOTÃO CRIAR */}
              <button
                onClick={handleCreate}
                disabled={!name || !slug || isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-5 rounded-2xl mt-4 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Ativar Unidade'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 py-6 animate-in zoom-in duration-500 relative z-10">
            <div className="bg-emerald-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <CheckCircle size={56} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Pronto!</h2>
              <p className="text-zinc-400 text-sm mt-2">Sua unidade <span className="text-amber-500 font-bold">{name}</span> está online.</p>
            </div>

            {/* REDIRECIONAMENTO COM SLUG */}
            <button
              onClick={() => {
                window.location.href = `/${slug}`;
              }}
              className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-lg hover:bg-zinc-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Ver meu site de agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateBarbershop;
