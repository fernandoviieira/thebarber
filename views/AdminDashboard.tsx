import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  TrendingUp,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  X,
  CheckCircle2,
  BrainCircuit,
  CreditCard,
  Activity,
  MinusCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

interface AdminDashboardProps {
  barbershopId: string;
}

type Appointment = {
  id: string;
  barbershop_id: string;
  barber_id?: string | null;
  date: string;
  time: string;
  status: string;
  barber: string;
  customerName: string;
  service: string;
  price: number | string;
  original_price?: number | string | null;
  payment_method?: string | null;
  tip_amount: number | string;
};

type Barber = {
  id: string;
  name: string;
  commission_rate?: number | null;
};

type Expense = {
  id: string;
  barbershop_id: string | null;
  date: string | null;
  amount: number | string;
  description: string;
};

const parseDateSafe = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const parseNumberSafe = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ barbershopId }) => {
  const { appointments, fetchAppointments, loading: bookingLoading } = useBooking();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [trialDate, setTrialDate] = useState<barbershops[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [machineFees, setMachineFees] = useState({
    dinheiro: 0,
    pix: 0,
    debito: 1.99,
    credito: 4.99,
    pacote: 0
  });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [isSarahAnalyzing, setIsSarahAnalyzing] = useState(false);
  const [sarahMessage, setSarahMessage] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    // Inicializa com o valor salvo no localStorage, padrão false caso não exista
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`audio_enabled_${barbershopId}`);
      return saved === 'true';
    }
    return false;
  });

  // Busca dados administrativos (sem appointments)
  const fetchData = useCallback(async () => {
    if (!barbershopId) return;
    setLoadingData(true);
    try {
      const [barbersRes, settingsRes, expensesRes, shopRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('barbershop_id', barbershopId),
        supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle(),
        supabase.from('expenses').select('*').eq('barbershop_id', barbershopId),
        supabase.from('barbershops').select('trial_ends_at').eq('id', barbershopId).single()
      ]);

      if (barbersRes.data) setBarbers(barbersRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (shopRes.data) setTrialDate(shopRes.data.trial_ends_at);
      if (settingsRes.data) {
        setMachineFees({
          dinheiro: parseNumberSafe(settingsRes.data.fee_dinheiro),
          pix: parseNumberSafe(settingsRes.data.fee_pix),
          debito: parseNumberSafe(settingsRes.data.fee_debito),
          credito: parseNumberSafe(settingsRes.data.fee_credito),
          pacote: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  }, [barbershopId]);

  // Busca appointments separadamente
  useEffect(() => {
    if (barbershopId && fetchAppointments) {
      fetchAppointments(barbershopId);
    }
  }, [barbershopId]);

  // Efeito principal: Realtime + Carga Inicial
  useEffect(() => {
    fetchData();

    if (!barbershopId) return;

    const channel = supabase
      .channel(`admin_realtime_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && isAudioEnabled) {
            const audio = new Audio('/sounds/notification.wav');
            audio.play().catch(() => console.warn("Interaja com a página para liberar áudio"));
          }

          if (fetchAppointments) fetchAppointments(barbershopId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, fetchData, isAudioEnabled]);

  // Timeout de segurança para loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingData) {
        console.warn('Loading travado - forçando exibição');
        setLoadingData(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loadingData]);

  // Salva a preferência sempre que o usuário alternar o botão
  useEffect(() => {
    if (barbershopId) {
      localStorage.setItem(`audio_enabled_${barbershopId}`, isAudioEnabled.toString());
    }
  }, [isAudioEnabled, barbershopId]);

  // Cálculos Memoizados
  const pendingApps = useMemo(() => {
    return (appointments as Appointment[] || []).filter(
      app => app.status === 'pendente' && app.barbershop_id === barbershopId
    );
  }, [appointments, barbershopId]);

  const filteredApps = useMemo(() => {
    if (!startDate || !endDate || !appointments) return [];

    // Criamos cópias para não afetar o estado do componente
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Usa hora local

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Usa hora local

    return (appointments as Appointment[]).filter(app => {
      if (app.barbershop_id !== barbershopId) return false;

      // Converte a string "YYYY-MM-DD" para um objeto Date local
      const [year, month, day] = app.date.split('-').map(Number);
      const appDate = new Date(year, month - 1, day);

      return appDate >= start && appDate <= end;
    });
  }, [appointments, barbershopId, startDate, endDate]);

  const totalBruto = useMemo(() => {
    return filteredApps
      .filter(app => app.status === 'finalizado')
      .reduce((acc, curr) => {
        const valor = parseNumberSafe(curr.original_price) || parseNumberSafe(curr.price);
        return acc + valor;
      }, 0);
  }, [filteredApps]);

  const totalLiquidoReal = useMemo(() => {
    return filteredApps
      .filter(app => app.status === 'finalizado')
      .reduce((acc, curr) => {
        const metodo = (curr.payment_method || 'dinheiro').toLowerCase();
        const taxa = (machineFees[metodo as keyof typeof machineFees] || 0) / 100;
        return acc + parseNumberSafe(curr.price) * (1 - taxa);
      }, 0);
  }, [filteredApps, machineFees]);

  const barberPerformance = useMemo(() => {
    return barbers.map(barber => {
      const servicesDone = filteredApps.filter(app => {
        if (app.status !== 'finalizado') return false;
        if (app.barber_id) return app.barber_id === barber.id;
        return (app.barber || '').trim().toLowerCase() === (barber.name || '').trim().toLowerCase();
      });

      const bruto = servicesDone.reduce((acc, curr) => acc + parseNumberSafe(curr.price), 0);
      const gorjetas = servicesDone.reduce((acc, curr) => acc + parseNumberSafe(curr.tip_amount), 0);
      const rate = parseNumberSafe(barber.commission_rate);

      return {
        ...barber,
        count: servicesDone.length,
        bruto,
        gorjetas,
        comissaoValor: bruto * (rate / 100)
      };
    }).sort((a, b) => b.bruto - a.bruto);
  }, [barbers, filteredApps]);

  const totalExpenses = useMemo(() => {
    const start = startDate ? new Date(startDate).setUTCHours(0, 0, 0, 0) : 0;
    const end = endDate ? new Date(endDate).setUTCHours(23, 59, 59, 999) : 0;

    return allExpenses
      .filter(exp => {
        const d = parseDateSafe(exp.date);
        return d && d.getTime() >= start && d.getTime() <= end;
      })
      .reduce((acc, exp) => acc + parseNumberSafe(exp.amount), 0);
  }, [allExpenses, startDate, endDate]);

  const totalComissoes = useMemo(() =>
    barberPerformance.reduce((acc, curr) => acc + curr.comissaoValor, 0),
    [barberPerformance]
  );

  const totalGorjeta = useMemo(() =>
    barberPerformance.reduce((acc, curr) => acc + curr.gorjetas, 0),
    [barberPerformance]
  );

  const lucroLiquidoRealFinal = useMemo(() =>
    totalLiquidoReal - totalComissoes - totalExpenses,
    [totalLiquidoReal, totalComissoes, totalExpenses]
  );

  const custosOperacionais = useMemo(() =>
    totalBruto - totalLiquidoReal + totalComissoes + totalGorjeta,
    [totalBruto, totalLiquidoReal, totalComissoes, totalGorjeta]
  );

  const handleApprove = async (id: string) => {
    await supabase.from('appointments').update({ status: 'confirmado' }).eq('id', id);
    if (fetchAppointments) fetchAppointments(barbershopId);
  };

  const handleReject = async (id: string) => {
    await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', id);
    if (fetchAppointments) fetchAppointments(barbershopId);
  };

  const analyzeWithSarah = async () => {
    setIsSarahAnalyzing(true);
    setSarahMessage(null);
    try {
      const payload = {
        faturamentoBruto: totalBruto,
        lucroLiquido: lucroLiquidoRealFinal,
        status: lucroLiquidoRealFinal < 0 ? 'PREJUÍZO' : 'LUCRO',
        barbeiros: barberPerformance.map(b => ({ nome: b.name, faturamento: b.bruto }))
      };
      const { data } = await supabase.functions.invoke('get-ai-insights', { body: payload });
      setSarahMessage(data?.insight || 'Análise concluída com sucesso.');
    } catch (error) {
      setSarahMessage('Não foi possível gerar insights agora.');
    } finally {
      setIsSarahAnalyzing(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f1115] text-amber-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <span className="font-black uppercase text-[10px] tracking-[0.5em]">Carregando Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0f1115] custom-scrollbar p-6">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <header className="flex flex-col gap-6 border-b border-white/5 pb-8">
          <div className="flex justify-between items-start">
            <div className="space-y-3">

             {trialDate && (
  <div className="relative overflow-hidden group bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4 min-w-[240px] shadow-2xl">
    {/* Efeito de brilho de fundo */}
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
    
    <div className="relative w-12 h-12 flex-shrink-0">
      {/* Círculo de progresso simplificado ou Ícone */}
      <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Clock size={18} className="text-amber-500 animate-pulse" />
      </div>
    </div>

    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] italic">
          Free Trial Mode
        </span>
        <div className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
      </div>
      
      <h5 className="text-white font-black text-sm uppercase tracking-tighter">
        {Math.max(0, Math.ceil((new Date(trialDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Dias Restantes
      </h5>
      
      {/* Barra de progresso micro */}
      <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
          style={{ width: '65%' }} // Aqui você calcularia a % baseada no total de 7 ou 15 dias
        />
      </div>
    </div>
  </div>
)}

              <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 w-fit px-4 py-1.5 rounded-full border border-amber-500/20">
                <Activity size={12} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Painel Administrativo</span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter">
                Performance <span className="text-amber-500">Center</span>
              </h2>
            </div>

            <button
              onClick={() => setIsAudioEnabled(prev => !prev)}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${isAudioEnabled
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                }`}
            >
              {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <span className="font-black text-[10px] uppercase tracking-widest">
                {isAudioEnabled ? 'Notificações ON' : 'Notificações OFF'}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={analyzeWithSarah}
              disabled={isSarahAnalyzing}
              className="bg-slate-900 border border-white/5 p-4 rounded-2xl hover:border-amber-500 transition-all shadow-xl disabled:opacity-50"
            >
              {isSarahAnalyzing ? (
                <Loader2 className="animate-spin text-amber-500" size={18} />
              ) : (
                <BrainCircuit className="text-amber-500" size={18} />
              )}
            </button>

            <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
              <CalendarIcon size={14} className="text-amber-500" />
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                locale={ptBR}
                dateFormat="dd/MM/yyyy"
                className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer"
                placeholderText="Filtrar período"
              />
            </div>
          </div>
        </header>

        {pendingApps.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-amber-500" size={18} />
              <h4 className="text-xl font-black text-white uppercase italic">
                Solicitações <span className="text-amber-500">Pendentes</span>
              </h4>
              <span className="bg-amber-500 text-black text-xs font-black px-2.5 py-0.5 rounded-full">
                {pendingApps.length}
              </span>
            </div>
            <div className="grid gap-3">
              {pendingApps.map(app => (
                <div
                  key={app.id}
                  className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl flex justify-between items-center"
                >
                  <div>
                    <p className="text-amber-500 font-black text-[10px] uppercase">
                      {app.time} - {app.date}
                    </p>
                    <h5 className="text-white font-black text-base">{app.customerName}</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {app.service} com {app.barber}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(app.id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Faturamento"
            value={totalBruto.toFixed(2)}
            icon={<DollarSign size={18} />}
            variant="amber"
          />
          <StatCard
            label="Custos Operacionais"
            value={custosOperacionais.toFixed(2)}
            icon={<CreditCard size={18} />}
            variant="slate"
          />
          <StatCard
            label="Líquido Real"
            value={lucroLiquidoRealFinal.toFixed(2)}
            icon={<TrendingUp size={18} />}
            variant="green"
          />
          <StatCard
            label="Despesas"
            value={totalExpenses.toFixed(2)}
            icon={<MinusCircle size={18} />}
            variant="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
            <h4 className="text-xl font-black text-white uppercase italic mb-10 tracking-widest">
              Ranking de Profissionais
            </h4>
            <div className="space-y-8">
              {barberPerformance.map(b => (
                <div key={b.id}>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {b.name} <span className="text-slate-600">({b.count})</span>
                    </span>
                    <span className="text-lg font-black text-amber-500 italic">
                      R$ {b.bruto.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${totalBruto > 0 ? (b.bruto / totalBruto) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-10 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center gap-3 mb-8 text-amber-500">
                <BrainCircuit size={20} />
                <h4 className="text-xl font-black uppercase italic tracking-widest">Sarah Insights</h4>
              </div>
              <p className="text-xs font-bold text-white leading-relaxed opacity-80">
                {sarahMessage || 'Olá! Selecione um período e clique abaixo para analisar seu negócio.'}
              </p>
            </div>
            <button
              onClick={analyzeWithSarah}
              disabled={isSarahAnalyzing}
              className="w-full mt-10 bg-amber-500 text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 transition-all disabled:opacity-50"
            >
              {isSarahAnalyzing ? 'Analisando...' : 'Gerar Relatório IA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, variant = 'default' }: any) => {
  const isNegative = value < 0;
  const variants: any = {
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-500',
    red: 'bg-red-500/5 border-red-500/20 text-red-500',
    green: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500',
    slate: 'bg-slate-800/40 border-slate-700/50 text-slate-400'
  };

  return (
    <div className={`p-8 rounded-[2rem] border transition-all shadow-2xl ${isNegative ? 'bg-red-600 border-red-400 text-white' : variants[variant]
      }`}>
      <div className="flex justify-between items-start mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        <div className="p-3 rounded-2xl bg-white/5">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-bold opacity-40">R$</span>
        <h3 className="text-2xl lg:text-3xl font-black italic tracking-tighter">
          {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h3>
      </div>
    </div>
  );
};

export default AdminDashboard;