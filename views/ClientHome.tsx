import React, { useState, useEffect } from 'react';
import { SERVICES as DEFAULT_SERVICES, BARBERS as DEFAULT_BARBERS } from '../constants';
import { Clock, Star, MapPin, ChevronRight, Award, Scissors, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClientHomeProps {
  onStartBooking: () => void;
}

const ClientHome: React.FC<ClientHomeProps> = ({ onStartBooking }) => {
  const [realBarbers, setRealBarbers] = useState<any[]>([]);
  const [realServices, setRealServices] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [shopAddress, setShopAddress] = useState<string>(''); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const slug = window.location.pathname.split('/')[1];
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('id, address')
          .eq('slug', slug)
          .single();

        if (barbershop) {
          setShopAddress(barbershop.address || 'Endereço não informado');

          const [barbersRes, servicesRes, settingsRes] = await Promise.all([
            supabase.from('barbers').select('*').eq('barbershop_id', barbershop.id).order('name'),
            supabase.from('services').select('*').eq('barbershop_id', barbershop.id).order('price'),
            supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershop.id).maybeSingle()
          ]);

          setRealBarbers(barbersRes.data || DEFAULT_BARBERS);
          setRealServices(servicesRes.data || DEFAULT_SERVICES);
          setShopSettings(settingsRes.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getStatus = () => {
    if (!shopSettings) return { label: 'Carregando...', color: 'text-zinc-500', dot: 'bg-zinc-500' };
    if (shopSettings.is_closed) return { label: 'Fechado Temporariamente', color: 'text-red-500', dot: 'bg-red-500' };

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openH, openM] = shopSettings.opening_time.split(':').map(Number);
    const [closeH, closeM] = shopSettings.closing_time.split(':').map(Number);
    
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    if (currentTime >= openTime && currentTime < closeTime) {
      return { label: 'Aberto Agora', color: 'text-emerald-500', dot: 'bg-emerald-500' };
    }
    return { label: 'Fechado no Momento', color: 'text-zinc-500', dot: 'bg-zinc-500' };
  };

  const status = getStatus();

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-amber-500 animate-spin" size={40} />
      <p className="text-amber-500 font-black tracking-widest uppercase text-[10px]">Iniciando Experiência...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Background com Overlay Otimizado */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-40 md:opacity-60"
          alt="Barbearia Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
      </div>

      <div className="relative z-10">
        {/* Header de Status - Altamente Responsivo */}
        <div className="sticky top-0 z-[100] w-full px-4 pt-4 md:pt-6 flex justify-center pointer-events-none">
          <div className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 md:p-4 flex items-center justify-between shadow-2xl max-w-lg w-full pointer-events-auto">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className={`w-2 h-2 rounded-full animate-pulse ${status.dot} shadow-[0_0_8px_currentcolor]`} />
              <div>
                <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest leading-none ${status.color}`}>
                  {status.label}
                </p>
                {shopSettings && !shopSettings.is_closed && (
                  <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase italic mt-1 leading-none">
                    {shopSettings.opening_time} — {shopSettings.closing_time}
                  </p>
                )}
              </div>
            </div>
            
            <div className="h-6 md:h-8 w-[1px] bg-white/10 mx-2 md:mx-4" />
            
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg shrink-0">
                <MapPin size={14} className="text-amber-500 md:w-4 md:h-4" />
              </div>
              <p className="text-[8px] md:text-[10px] font-black text-white uppercase italic tracking-tighter truncate">
                {shopAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section - Ajuste de Tipografia */}
        <section className="min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center px-6 text-center pt-10">
          <div className="space-y-4 md:space-y-6 max-w-5xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-amber-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
              <Award size={12} className="md:w-3.5 md:h-3.5" /> Tradição & Excelência Premium
            </div>
            
            <h2 className="text-[13vw] md:text-[8rem] lg:text-[8rem] font-serif font-black tracking-tighter leading-[0.85] md:leading-none">
              ESTILO <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 italic">
                SEM LIMITES.
              </span>
            </h2>
            
            <p className="text-zinc-400 text-xs md:text-sm font-medium max-w-md mx-auto leading-relaxed px-4">
              A experiência definitiva em cuidados masculinos. Onde a tradição encontra a modernidade.
            </p>

            <div className="pt-6 md:pt-10">
              <button 
                onClick={onStartBooking}
                disabled={shopSettings?.is_closed}
                className={`group relative font-black py-4 md:py-5 px-8 md:px-12 rounded-2xl text-base md:text-xl transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto w-full max-w-[280px] md:max-w-none md:w-auto
                  ${shopSettings?.is_closed 
                    ? 'bg-zinc-800 text-red-500 cursor-not-allowed opacity-90'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_15px_40px_rgba(245,158,11,0.3)] hover:scale-105'
                  }`}
              >
                {shopSettings?.is_closed ? 'Unidade Fechada' : 'Agendar Agora'}
                {!shopSettings?.is_closed && <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} size={20} />}
              </button>
            </div>
          </div>
        </section>

        {/* Seção de Serviços - Grid Adaptativo */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-32">
          <div className="flex flex-col items-center mb-12 md:mb-20 text-center">
            <h3 className="text-3xl md:text-5xl font-serif font-bold mb-4 tracking-tight uppercase italic">Menu de Serviços</h3>
            <div className="h-1 w-16 md:w-24 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {realServices.map((service) => (
              <div key={service.id} className="group relative bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] hover:bg-zinc-900/60 hover:border-amber-500/40 transition-all duration-500">
                <div className="flex justify-between items-start mb-6 md:mb-8">
                  <div className="p-3 md:p-4 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                    <Scissors size={24} className="md:w-7 md:h-7" />
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">Valor</span>
                    <span className="text-2xl md:text-3xl font-black text-white tracking-tighter italic">R$ {Number(service.price).toFixed(2)}</span>
                  </div>
                </div>
                <h4 className="text-xl md:text-2xl font-black mb-2 group-hover:text-amber-500 transition-colors uppercase italic">{service.name}</h4>
                <div className="flex items-center gap-2 text-zinc-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] italic">
                  <Clock size={12} className="text-amber-500" />
                  {service.duration}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Especialistas - Otimização de Imagens para Mobile */}
        <section className="py-20 md:py-32 bg-zinc-950/80 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
            <h3 className="text-3xl md:text-5xl font-serif font-bold mb-12 md:mb-24 tracking-tight uppercase italic">Nossos Especialistas</h3>
            
            <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-8 md:gap-16 lg:gap-24">
              {realBarbers.map((barber) => (
                <div key={barber.id} className="group text-center">
                  <div className="relative mb-6 mx-auto w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56">
                    <div className="absolute inset-0 bg-amber-500 rounded-full blur-[40px] md:blur-[60px] opacity-0 group-hover:opacity-20 transition-all duration-700" />
                    <img 
                      src={barber.photo} 
                      alt={barber.name} 
                      className="relative w-full h-full rounded-full object-cover border-2 border-white/10 group-hover:border-amber-500 transition-all duration-1000 grayscale group-hover:grayscale-0 group-hover:scale-105" 
                    />
                    <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[8px] md:text-[10px] font-black px-3 md:px-5 py-1.5 md:py-2 rounded-full flex items-center gap-1 shadow-2xl uppercase italic whitespace-nowrap">
                      <Star size={10} fill="currentColor" className="md:w-3 md:h-3" /> {barber.rating || '5.0'}
                    </div>
                  </div>
                  <h4 className="font-black text-lg md:text-2xl mb-1 tracking-tight uppercase italic">{barber.name}</h4>
                  <p className="text-[8px] md:text-[10px] text-zinc-600 uppercase font-black tracking-[0.2em] md:tracking-[0.3em] italic truncate">
                    {Array.isArray(barber.specialties) ? barber.specialties[0] : 'Master Barber'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer Simples Responsivo */}
        <footer className="py-12 px-6 text-center border-t border-white/5 bg-black">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] mb-4 italic">© 2026 {shopAddress.split(',')[0]} — Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
};

export default ClientHome;