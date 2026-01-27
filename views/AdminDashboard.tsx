import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';
import { 
  Users, DollarSign, TrendingUp, Loader2, Calendar as CalendarIcon, 
  Sparkles, Target, Clock, Plus, X, CheckCircle2, Trash2, BrainCircuit
} from 'lucide-react';


interface AdminDashboardProps {
  barbershopId: string | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ barbershopId }) => {
  const { appointments, addAppointment, updateStatus, deleteAppointment, fetchAppointments, loading: bookingLoading } = useBooking();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [customCommissions, setCustomCommissions] = useState<Record<string, number>>({});
  
  const [isSarahAnalyzing, setIsSarahAnalyzing] = useState(false);
  const [sarahMessage, setSarahMessage] = useState<string | null>(null);

  const getTodayDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualService, setManualService] = useState({ barber: '', serviceName: '', price: '' });

  useEffect(() => {
    async function fetchData() {
      if (!barbershopId) return;
      setLoadingData(true);

      if (fetchAppointments) {
        await fetchAppointments(barbershopId);
      }

      const [barbersRes, servicesRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('barbershop_id', barbershopId),
        supabase.from('services').select('*').eq('barbershop_id', barbershopId)
      ]);

      if (barbersRes.data) {
        setBarbers(barbersRes.data);
        const initial: Record<string, number> = {};
        barbersRes.data.forEach(b => initial[b.id] = b.commission_rate || 0); 
        setCustomCommissions(initial);
      }
      if (servicesRes.data) setAvailableServices(servicesRes.data);
      setLoadingData(false);
    }
    fetchData();
  }, [barbershopId]);

  // CÁLCULOS FINANCEIROS
  const filteredApps = appointments.filter(app => {
    const matchDate = app.date === filterDate;
    const matchShop = app.barbershop_id === barbershopId;
    return matchDate && matchShop;
  });

  const totalBruto = filteredApps.filter(app => app.status === 'confirmado').reduce((acc, curr) => acc + Number(curr.price), 0);
  const barberPerformance = barbers.map(barber => {
    const services = filteredApps.filter(app => app.barber === barber.name && app.status === 'confirmado');
    const bruto = services.reduce((acc, curr) => acc + Number(curr.price), 0);
    const rate = customCommissions[barber.id] !== undefined ? customCommissions[barber.id] : (barber.commission_rate || 0);
    return { ...barber, count: services.length, bruto, comissaoValor: bruto * (rate / 100), currentRate: rate };
  }).sort((a, b) => b.bruto - a.bruto);
  const lucroLiquido = totalBruto - barberPerformance.reduce((acc, curr) => acc + curr.comissaoValor, 0);

const analyzeWithSarah = async () => {
    setIsSarahAnalyzing(true);
    setSarahMessage(null);

    try {
      // 1. Log dos dados que estão saindo do seu PC
      const payload = {
          data: new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR'),
          faturamentoBruto: totalBruto,
          lucroLiquido: lucroLiquido,
          barbeiros: barberPerformance.map(b => ({ nome: b.name, atendimentos: b.count, faturamento: b.bruto }))    
      };

      const { data, error } = await supabase.functions.invoke('get-ai-insights', {
        body: payload
      });

      // 2. Log da resposta bruta (Ver se deu erro de rede ou permissão)

      if (error) {
        console.error("[SARAH] Erro na invocação da função:", error);
        throw error;
      }

      // 3. Log do texto gerado pela IA (Ajustado para data.text conforme o index.ts da Function)
      if (data && data.insight) {
        setSarahMessage(data.insight);
      } else {
        console.warn("[SARAH] A função retornou sucesso, mas o campo 'text' está vazio.", data);
        setSarahMessage("Sarah processou os dados, mas não teve uma resposta clara agora.");
      }

    } catch (e: any) {
      console.error("[SARAH] Falha crítica na análise:", e);
      setSarahMessage("Ops! Tive um problema técnico ao me conectar com o servidor.");
    } finally {
      setIsSarahAnalyzing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualService.barber || !manualService.serviceName || !manualService.price) return;
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newApp = {
      barbershop_id: barbershopId!,
      customerName: "Venda Direta (Adm)",
      service: manualService.serviceName,
      barber: manualService.barber,
      date: filterDate,
      time: currentTime, 
      price: Number(manualService.price),
      status: 'confirmado' as const,
      customerPhone: 'Balcão'
    };
    await addAppointment(newApp);
    setIsManualModalOpen(false);
  };

  if (bookingLoading || loadingData) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f1115] text-amber-500 font-black uppercase text-[10px] tracking-[0.5em]">
      <Loader2 className="animate-spin mb-4" size={48} />
      Sincronizando Sarah AI...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 font-sans pb-20 relative overflow-hidden">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>

      {/* Luzes de fundo para tirar o "preto cansativo" */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8 relative z-10">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 w-fit px-4 py-1.5 rounded-full border border-amber-500/20 backdrop-blur-md">
              <Sparkles size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sarah AI Ativa</span>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Center</span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={analyzeWithSarah} 
                disabled={isSarahAnalyzing}
                className="group relative bg-slate-900 border border-white/5 p-4 rounded-2xl hover:border-amber-500/50 transition-all shadow-xl disabled:opacity-50"
             >
                {isSarahAnalyzing ? <Loader2 className="animate-spin text-amber-500" size={24} /> : <BrainCircuit className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />}
             </button>

             <button onClick={() => setIsManualModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all shadow-lg active:scale-95">
               <Plus size={18} strokeWidth={4} /> Novo Checkout
             </button>

             <div className="relative bg-slate-900 border border-white/5 p-4 rounded-2xl shadow-xl flex items-center gap-4 cursor-pointer hover:border-amber-500/50 transition-colors group">
               <input 
                 type="date" 
                 value={filterDate} 
                 onChange={(e) => setFilterDate(e.target.value)} 
                 onClick={(e) => (e.target as any).showPicker?.()}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" 
               />
               <span className="text-white text-sm font-bold pl-2 relative z-10">
                 {new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}
               </span>
               <CalendarIcon size={18} className="text-amber-500 group-hover:scale-110 transition-transform relative z-10" />
             </div>
          </div>
        </header>

        {sarahMessage && (
            <div className="animate-in slide-in-from-top-4 duration-500 bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-[2rem] rounded-tl-none relative shadow-2xl max-w-2xl border border-white/20 z-50">
                <button onClick={() => setSarahMessage(null)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={18} strokeWidth={3}/></button>
                <div className="flex gap-4">
                    <div className="bg-white/20 p-2 rounded-xl h-fit">
                      <Sparkles className="shrink-0" size={24} />
                    </div>
                    <p className="font-bold leading-relaxed">{sarahMessage}</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Receita Bruta" value={totalBruto} icon={<DollarSign size={22}/>} />
          <StatCard label="Comissões" value={totalBruto - lucroLiquido} icon={<Users size={22}/>} />
          <StatCard label="Lucro Líquido" value={lucroLiquido} icon={<TrendingUp size={22}/>} variant="amber" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="px-10 py-6 border-b border-white/5 bg-white/5 text-white font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target size={18} className="text-amber-500" /> Rendimento por Barbeiro
                </div>
              </div>
              <div className="p-6 space-y-4">
                {barberPerformance.map(barber => (
                  <div key={barber.id} className="group bg-slate-800/20 border border-white/5 rounded-[2rem] p-6 hover:bg-slate-800/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-amber-500 transition-all bg-slate-800 flex items-center justify-center shadow-inner">
                        {barber.photo ? <img src={barber.photo} className="w-full h-full object-cover" /> : <Users className="text-slate-600" />}
                      </div>
                      <div>
                        <h5 className="text-2xl font-black text-white italic tracking-tighter uppercase">{barber.name}</h5>
                        <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-[0.2em]">{barber.count} Cortes Finalizados</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 bg-black/40 p-5 rounded-2xl border border-white/5">
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Comissão %</label>
                        <input type="number" value={barber.currentRate} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setCustomCommissions({ ...customCommissions, [barber.id]: Number(e.target.value) })} className="w-14 bg-transparent text-amber-500 font-black text-xl outline-none text-center border-b border-white/10 focus:border-amber-500" />
                      </div>
                      <div className="text-right border-l border-white/5 pl-8">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Produção</label>
                        <p className="text-xl font-bold text-slate-300 tabular-nums italic">R$ {barber.bruto.toFixed(2)}</p>
                      </div>
                      <div className="text-right border-l border-white/5 pl-8">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Repasse</label>
                        <p className="text-2xl font-black text-white italic tabular-nums">R$ {barber.comissaoValor.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md shadow-2xl h-fit">
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic"><Clock size={16} className="text-amber-500" /> Fluxo do Dia</h4>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredApps.map(app => (
                  <div key={app.id} className="flex justify-between items-center group bg-white/5 border border-white/5 p-4 rounded-2xl hover:border-amber-500/30 transition-all">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                           <span className="text-[15px] font-bold text-white">{app.customerName}</span>
                           {app.status === 'pendente' && <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-black uppercase border border-red-500/20">Aguardando</span>}
                         </div>
                         <span className="text-[11px] text-slate-500 font-black uppercase italic mt-0.5">{app.time} • {app.service}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black tabular-nums text-amber-400">R$ {Number(app.price).toFixed(2)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.status === 'pendente' && (
                            <button onClick={() => updateStatus && updateStatus(app.id, 'confirmado')} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"><CheckCircle2 size={14} /></button>
                          )}
                          <button onClick={() => { if(confirm("Deseja remover?")) deleteAppointment(app.id) }} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                  </div>
                ))}
                {filteredApps.length === 0 && <p className="text-center text-[10px] py-14 opacity-20 font-black uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">Sem movimentação</p>}
             </div>
          </div>
        </div>
      </div>

      {isManualModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-md rounded-[3rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Check-<span className="text-amber-500">Out</span></h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Barbeiro</label>
                <select required value={manualService.barber} onChange={(e) => setManualService({...manualService, barber: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 appearance-none">
                  <option value="">Selecione...</option>
                  {barbers.map(b => <option key={b.id} value={b.name} className="bg-slate-900">{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Serviço</label>
                <select required value={manualService.serviceName} onChange={(e) => {
                  const s = availableServices.find(x => x.name === e.target.value);
                  setManualService({...manualService, serviceName: e.target.value, price: s?.price.toString() || ''})
                }} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 appearance-none">
                  <option value="">Escolha...</option>
                  {availableServices.map(s => <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>)}
                </select>
              </div>
              <div className="bg-black/20 rounded-3xl p-6 border border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center mb-2">Preço Final</label>
                <input required type="number" onWheel={(e) => e.currentTarget.blur()} value={manualService.price} onChange={(e) => setManualService({...manualService, price: e.target.value})} className="w-full bg-transparent text-amber-500 font-black text-5xl outline-none text-center" />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">Finalizar Venda</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, variant = 'default' }: any) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all shadow-2xl backdrop-blur-md ${variant === 'amber' ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400 text-black scale-[1.02] shadow-amber-500/20' : 'bg-slate-900/60 border-white/5 text-white hover:border-amber-500/30'}`}>
    <div className="flex justify-between items-start mb-4">
      <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${variant === 'amber' ? 'text-black/60' : 'text-slate-500'}`}>{label}</p>
      <div className={`p-3 rounded-2xl shadow-inner ${variant === 'amber' ? 'bg-black/10' : 'bg-white/5'}`}>{icon}</div>
    </div>
    <h3 className="text-4xl font-black italic tracking-tighter tabular-nums leading-none">R$ {value.toFixed(2)}</h3>
  </div>
);

export default AdminDashboard;