import React, { useState, useEffect } from 'react';
import { SERVICES as DEFAULT_SERVICES, BARBERS as DEFAULT_BARBERS } from '../constants';
import { Clock, Star, MapPin, Instagram, Phone, ChevronRight, Award, Scissors, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClientHomeProps {
  onStartBooking: () => void;
}

const ClientHome: React.FC<ClientHomeProps> = ({ onStartBooking }) => {
  const [realBarbers, setRealBarbers] = useState<any[]>([]);
  const [realServices, setRealServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const googleMapsUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.0658302014!2d-46.675451!3d-23.583947!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM1JzAyLjIiUyA0NsKwNDAnMzEuNiJX!5e0!3m2!1spt-BR!2sbr!4v1625500000000!5m2!1spt-BR!2sbr";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // Captura o slug da URL para saber de qual barbearia estamos falando
      const slug = window.location.pathname.split('/')[1];

      // 1. Primeiro buscamos o ID da barbearia pelo slug
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('slug', slug)
        .single();

      if (barbershop) {
        // 2. Busca Barbeiros da Unidade
        const { data: barbers } = await supabase
          .from('barbers')
          .select('*')
          .eq('barbershop_id', barbershop.id)
          .order('name');
        
        // 3. Busca Serviços da Unidade (O que você acabou de criar!)
        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barbershop.id)
          .order('price');

        if (barbers && barbers.length > 0) setRealBarbers(barbers);
        else setRealBarbers(DEFAULT_BARBERS);

        if (services && services.length > 0) setRealServices(services);
        else setRealServices(DEFAULT_SERVICES);
      }
      
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-amber-500 animate-spin" size={40} />
      <p className="text-amber-500 font-black tracking-widest uppercase text-xs">Carregando Experiência...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen text-white">
      {/* BACKGROUND FIXO */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-60"
          alt="Barbearia Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/95" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
              <Award size={14} /> Tradição & Excelência Premium
            </div>
            <h2 className="text-6xl md:text-9xl font-serif font-black tracking-tighter leading-none">
              ESTILO <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 italic">
                SEM LIMITES.
              </span>
            </h2>
            <div className="pt-8">
              <button 
                onClick={onStartBooking}
                className="group relative bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-5 px-12 rounded-2xl text-xl shadow-[0_20px_50px_rgba(245,158,11,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
              >
                Agendar Agora
                <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
              </button>
            </div>
          </div>
        </section>

        {/* Serviços Grid (DINÂMICOS DO BANCO) */}
        <section className="max-w-7xl mx-auto px-4 py-24">
          <div className="flex flex-col items-center mb-16 text-center">
            <h3 className="text-4xl font-serif font-bold mb-4 tracking-tight">Nossa Arte</h3>
            <div className="h-1 w-20 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {realServices.map((service) => (
              <div key={service.id} className="group relative bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-black/60 hover:border-amber-500/50 transition-all duration-500">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                    <Scissors size={28} />
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest">Valor</span>
                    <span className="text-3xl font-black text-white tracking-tighter">R$ {Number(service.price).toFixed(2)}</span>
                  </div>
                </div>
                <h4 className="text-2xl font-bold mb-3 group-hover:text-amber-500 transition-colors">{service.name}</h4>
                <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase tracking-widest">
                  <Clock size={14} className="text-amber-500" />
                  {service.duration}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Especialistas (DINÂMICOS DO BANCO) */}
        <section className="py-24 bg-black/60 backdrop-blur-md border-y border-white/5">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h3 className="text-4xl font-serif font-bold mb-20 tracking-tight">Mestres das Tesouras</h3>
            <div className="flex flex-wrap justify-center gap-12">
              {realBarbers.map((barber) => (
                <div key={barber.id} className="group text-center min-w-[150px]">
                  <div className="relative mb-8 mx-auto w-36 h-36 md:w-48 md:h-48">
                    <div className="absolute inset-0 bg-amber-500 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-all duration-700" />
                    <img 
                      src={barber.photo} 
                      alt={barber.name} 
                      className="relative w-full h-full rounded-full object-cover border-2 border-white/10 group-hover:border-amber-500 transition-all duration-700 grayscale group-hover:grayscale-0" 
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
                      <Star size={12} fill="currentColor" /> {barber.rating || '5.0'}
                    </div>
                  </div>
                  <h4 className="font-bold text-xl mb-1 tracking-tight">{barber.name}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                    {Array.isArray(barber.specialties) ? barber.specialties[0] : 'Especialista'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClientHome;