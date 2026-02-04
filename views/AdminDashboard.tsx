import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';
import AdminSettings from './AdminSettings';
import CustomersModule from './CustomersModule';
import CommissionsModule from './CommissionsModule';
import InventoryModule from './InventoryModule';
import AdminCalendarView from './AdminCalendarView';
import CashFlowModule from './CashFlowModule';
import CheckoutModule from './CheckoutModule';
import DatePicker from 'react-datepicker';
import SalesHistoryModule from './SalesHistoryModule';
import ExpensesModule from './ExpensesModule';
import SubscriptionPage from './SubscriptionPage';
import 'react-datepicker/dist/react-datepicker.css';
import confetti from 'canvas-confetti';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  X,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
  Package,
  LayoutDashboard,
  Settings,
  ReceiptText,
  CalendarDays,
  CreditCard,
  Banknote,
  History,
  Activity,
  Menu,
  MinusCircle,
  AlertCircle,
  Lock,
  XCircle
} from 'lucide-react';

interface AdminDashboardProps {
  barbershopId: string | null;
  subscriptionStatus?: string;
  userEmail?: string;
}

type ActiveTab =
  | 'dashboard'
  | 'agendamentos'
  | 'lancamento'
  | 'clientes'
  | 'estoque'
  | 'config'
  | 'comissoes'
  | 'historico'
  | 'caixa'
  | 'despesas'
  | 'billing';

type MachineFees = {
  dinheiro: number;
  pix: number;
  debito: number;
  credito: number;
  pacote: number;
};

type Barber = {
  id: string;
  name: string;
  commission_rate?: number | null;
};

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
  venda_id?: string | null;
  tip_amount: number | string;
};

type Expense = {
  id: string;
  barbershop_id: string | null;
  date: string | null;
  created_at?: string | null;
  amount: number | string;
  payment_method?: string | null;
  description: string;
  category?: string | null;
};

// ✅ CONSTANTES: evitar magic strings
const PAYMENT_METHODS = ['dinheiro', 'pix', 'debito', 'credito', 'pacote'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

// ✅ HELPER: parse seguro de datas
const parseDateSafe = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// ✅ HELPER: parse seguro de números
const parseNumberSafe = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// ✅ HELPER: normalizar método de pagamento
const normalizePaymentMethod = (method: string | null | undefined): PaymentMethod => {
  const normalized = (method || '').toString().trim().toLowerCase();
  return PAYMENT_METHODS.includes(normalized as PaymentMethod)
    ? (normalized as PaymentMethod)
    : 'dinheiro';
};

// ✅ COMPONENTE: SidebarItem com suporte a disabled
const SidebarItem = ({
  icon,
  label,
  active,
  onClick,
  disabled = false
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3.5 lg:py-4 transition-all relative group min-h-[44px]
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      ${active ? 'text-amber-500 bg-amber-500/5' : 'text-slate-500 hover:text-slate-300'}
    `}
    aria-current={active ? 'page' : undefined}
  >
    {active && !disabled && (
      <div className="absolute left-0 w-1 h-6 lg:h-8 bg-amber-500 rounded-r-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
    )}
    <div className={`${active && !disabled ? 'scale-110' : disabled ? '' : 'group-hover:scale-110'} transition-transform flex-shrink-0`}>
      {icon}
    </div>
    <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.15em] lg:tracking-[0.2em] text-left">
      {label}
    </span>
    {disabled && (
      <Lock size={14} className="ml-auto text-red-400 flex-shrink-0" />
    )}
  </button>
);

// ✅ COMPONENTE: Toast de erro
const ErrorToast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100] max-w-md">
    <AlertCircle size={20} className="flex-shrink-0" />
    <p className="text-sm font-bold flex-1">{message}</p>
    <button onClick={onClose} className="p-1 hover:bg-red-600 rounded-lg transition-colors">
      <X size={16} />
    </button>
  </div>
);

// ✅ NOVO COMPONENTE: Dashboard Bloqueado
const BlockedDashboard = ({ onActivate, barbershopName, expiresAt }: {
  onActivate: () => void;
  barbershopName: string;
  expiresAt: string | null;
}) => {
  const expirationDate = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'não definida';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 animate-in fade-in duration-700">
      <div className="max-w-2xl w-full">
        {/* Card Principal */}
        <div className="bg-gradient-to-br from-red-950/50 to-red-900/30 border-2 border-red-500/30 rounded-[3rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          {/* Efeito de fundo animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent animate-pulse" />

          {/* Ícone principal */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="bg-red-500/20 p-6 rounded-full border-4 border-red-500/40 animate-bounce">
              <XCircle size={64} className="text-red-400" strokeWidth={2.5} />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h2 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                Sistema <span className="text-red-500">Bloqueado</span>
              </h2>
              <p className="text-sm lg:text-base font-bold text-red-300 uppercase tracking-wider">
                Licença Expirada
              </p>
            </div>

            {/* Mensagem */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 space-y-4">
              <p className="text-slate-300 text-sm lg:text-base font-bold leading-relaxed">
                A licença da unidade <span className="text-white font-black">{barbershopName}</span> expirou em{' '}
                <span className="text-red-400 font-black">{expirationDate}</span>.
              </p>

              <div className="flex items-start gap-3 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs lg:text-sm text-slate-400 font-bold text-left">
                  Para reativar o acesso completo ao sistema, clique no botão abaixo e renove seu plano.
                </p>
              </div>
            </div>

            {/* Botão de ação */}
            <button
              onClick={onActivate}
              className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-12 py-5 rounded-2xl font-black uppercase text-sm lg:text-base tracking-widest transition-all hover:scale-105 shadow-2xl shadow-red-500/30 flex items-center justify-center gap-3 group"
            >
              <ShieldCheck size={24} className="group-hover:rotate-12 transition-transform" />
              Renovar Licença Agora
              <ShieldCheck size={24} className="group-hover:-rotate-12 transition-transform" />
            </button>

            {/* Informações adicionais */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Dúvidas? Entre em contato com o suporte
              </p>
            </div>
          </div>
        </div>

        {/* Cards de recursos bloqueados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-6">
          {[
            { icon: <CalendarDays size={18} />, label: 'Agendamentos' },
            { icon: <DollarSign size={18} />, label: 'Comissões' },
            { icon: <Users size={18} />, label: 'Clientes' },
            { icon: <Package size={18} />, label: 'Estoque' }
          ].map((item, index) => (
            <div
              key={index}
              className="bg-slate-900/40 border border-red-500/20 rounded-xl p-4 flex flex-col items-center gap-2 opacity-50"
            >
              <div className="text-red-400">{item.icon}</div>
              <span className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                {item.label}
              </span>
              <Lock size={12} className="text-red-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ barbershopId, subscriptionStatus, userEmail }) => {
  const { appointments, addAppointment, deleteAppointment, fetchAppointments, loading: bookingLoading } = useBooking();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [dbSubscriptionStatus, setDbSubscriptionStatus] = useState<string | undefined>(subscriptionStatus);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  const [isBlocked, setIsBlocked] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [customCommissions, setCustomCommissions] = useState<Record<string, number>>({});
  const [pendingCheckoutApp, setPendingCheckoutApp] = useState<any | null>(null);

  const [isSarahAnalyzing, setIsSarahAnalyzing] = useState(false);
  const [sarahMessage, setSarahMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [machineFees, setMachineFees] = useState<MachineFees>({
    dinheiro: 0,
    pix: 0,
    debito: 1.99,
    credito: 4.99,
    pacote: 0
  });

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;

  const [barbershopName, setBarbershopName] = useState('');

  const refetchAppointments = useCallback(async () => {
    if (!barbershopId || !fetchAppointments) return;
    try {
      await fetchAppointments(barbershopId);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      setErrorMessage('Erro ao carregar agendamentos. Tente novamente.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [barbershopId, fetchAppointments]);

  const fetchExpenses = useCallback(async () => {
    if (!barbershopId) return;
    try {
      const res = await supabase.from('expenses').select('*').eq('barbershop_id', barbershopId);
      if (res.error) throw res.error;
      if (res.data) setAllExpenses(res.data as Expense[]);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      setErrorMessage('Erro ao carregar despesas.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [barbershopId]);

  const fetchData = useCallback(async () => {
    if (!barbershopId) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    try {
      if (fetchAppointments) {
        fetchAppointments(barbershopId).catch(err =>
          console.error('❌ Erro ao buscar appointments:', err)
        );
      }

      const [
        barbersRes,
        servicesRes,
        inventoryRes,
        settingsRes,
        customersRes,
        shopRes,
        expensesRes
      ] = await Promise.all([
        supabase.from('barbers').select('*').eq('barbershop_id', barbershopId),
        supabase.from('services').select('*').eq('barbershop_id', barbershopId),
        supabase.from('inventory').select('*').eq('barbershop_id', barbershopId).gt('current_stock', 0),
        supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle(),
        supabase.from('customers').select('*, customer_packages(*)').eq('barbershop_id', barbershopId).order('name'),
        supabase.from('barbershops').select('name, subscription_status, expires_at, trial_ends_at, current_plan').eq('id', barbershopId).single(),
        supabase.from('expenses').select('*').eq('barbershop_id', barbershopId)
      ]);

      if (expensesRes.data) setAllExpenses(expensesRes.data as Expense[]);

      if (shopRes.data) {
        const {
          subscription_status: status,
          expires_at: expiresAtDate,
          trial_ends_at: trialEndsAtDate,
          current_plan: plan
        } = shopRes.data;

        setDbSubscriptionStatus(status);
        setTrialEndsAt(trialEndsAtDate);
        setExpiresAt(expiresAtDate);
        setCurrentPlan(plan);
        setBarbershopName(shopRes.data.name);

        const now = new Date();

        // 1. Verifica Trial: Existe data e ela é maior que AGORA?
        const isTrialActive = trialEndsAtDate ? new Date(trialEndsAtDate) > now : false;

        // 2. Verifica Assinatura: Status é ativo E a data de expiração é maior que AGORA?
        const isSubscriptionActive =
          status === 'active' &&
          expiresAtDate &&
          new Date(expiresAtDate) > now;

        // BLOQUEIA se: NÃO está em trial E NÃO tem assinatura ativa
        const shouldBlock = !isTrialActive && !isSubscriptionActive;
        setIsBlocked(shouldBlock);

        if (shouldBlock && activeTab !== 'billing') {
          setActiveTab('dashboard');
        }
      }

      if (barbersRes.data) {
        const list = barbersRes.data as Barber[];
        setBarbers(list);
        const initial: Record<string, number> = {};
        list.forEach(b => (initial[b.id] = parseNumberSafe(b.commission_rate)));
        setCustomCommissions(initial);
      }

      if (servicesRes.data) setAvailableServices(servicesRes.data);
      if (inventoryRes.data) setInventory(inventoryRes.data);
      if (customersRes.data) setAllCustomers(customersRes.data);

      if (settingsRes.data) {
        setMachineFees({
          dinheiro: parseNumberSafe(settingsRes.data.fee_dinheiro),
          pix: parseNumberSafe(settingsRes.data.fee_pix),
          debito: parseNumberSafe(settingsRes.data.fee_debito),
          credito: parseNumberSafe(settingsRes.data.fee_credito),
          pacote: 0
        });
      }
    } catch (error: any) {
      console.error('❌ Erro fatal:', error);
      setErrorMessage(error.message || 'Erro ao carregar dados.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoadingData(false);
    }
  }, [barbershopId, fetchAppointments, activeTab]);

  useEffect(() => {
    fetchData();
  }, [barbershopId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      alert("🚀 Pagamento confirmado! Sua unidade agora é PRO. Aproveite todos os recursos!");

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ffffff', '#000000']
      });

      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      fetchData();
    }

    if (params.get('canceled') === 'true') {
      alert("O checkout foi cancelado. Se precisar de ajuda com o pagamento, fale com o suporte.");
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [fetchData]);

  const barbersById = useMemo(() => {
    const map = new Map<string, Barber>();
    barbers.forEach(b => map.set(b.id, b));
    return map;
  }, [barbers]);

  const pendingApps = useMemo(() => {
    if (!barbershopId) return [];
    return (appointments as Appointment[]).filter(
      app => app.status === 'pendente' && app.barbershop_id === barbershopId
    );
  }, [appointments, barbershopId]);

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('appointments').update({ status: 'confirmado' }).eq('id', id);
        if (error) throw error;
        await refetchAppointments();
      } catch (error) {
        console.error('Erro ao aprovar:', error);
      }
    },
    [refetchAppointments]
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', id);
        if (error) throw error;
        await refetchAppointments();
      } catch (error) {
        console.error('Erro ao rejeitar:', error);
      }
    },
    [refetchAppointments]
  );

  const filteredApps = useMemo(() => {
    if (!barbershopId || !startDate || !endDate) return [];

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    return (appointments as Appointment[]).filter(app => {
      if (app.barbershop_id !== barbershopId) return false;

      const appDate = parseDateSafe(app.date);
      if (!appDate) return false;

      return appDate >= start && appDate <= end;
    });
  }, [appointments, barbershopId, startDate, endDate]);

  const totalBruto = useMemo(() => {
    return filteredApps
      .filter(app => app.status === 'finalizado')
      .reduce((acc, curr) => {
        const valorReal = parseNumberSafe(curr.original_price || curr.price);
        return acc + valorReal;
      }, 0);
  }, [filteredApps]);

  const barberGorjeta = useMemo(() => {
    return filteredApps
      .filter(app => app.status === 'finalizado')
      .reduce((acc, curr) => {
        const valorReal = parseNumberSafe(curr.tip_amount);
        return acc + valorReal;
      }, 0);
  }, [filteredApps]);

  const totalLiquidoReal = useMemo(() => {
    return filteredApps
      .filter(app => app.status === 'finalizado')
      .reduce((acc, curr) => {
        const metodo = normalizePaymentMethod(curr.payment_method);
        const taxa = (machineFees[metodo] || 0) / 100;
        return acc + parseNumberSafe(curr.price) * (1 - taxa);
      }, 0);
  }, [filteredApps, machineFees]);

  const barberPerformance = useMemo(() => {
    return barbers
      .map(barber => {
        const servicesDone = filteredApps.filter(app => {
          if (app.status !== 'finalizado') return false;

          if (app.barber_id) {
            return app.barber_id === barber.id;
          }

          const appBarberName = (app.barber || '').trim().toLowerCase();
          const barberName = (barber.name || '').trim().toLowerCase();
          return appBarberName === barberName;
        });

        const bruto = servicesDone.reduce((acc, curr) => acc + parseNumberSafe(curr.price), 0)
        const gorjetas = servicesDone.reduce((acc, curr) => acc + parseNumberSafe(curr.tip_amount), 0);

        const rate =
          customCommissions[barber.id] !== undefined
            ? customCommissions[barber.id]
            : parseNumberSafe(barber.commission_rate);

        return {
          ...barber,
          count: servicesDone.length,
          bruto,
          gorjetas,
          comissaoValor: bruto * (rate / 100),
          currentRate: rate
        };
      })
      .sort((a, b) => b.bruto - a.bruto);
  }, [barbers, filteredApps, customCommissions]);

  const filteredExpenses = useMemo(() => {
    if (!barbershopId || !startDate || !endDate) return [];

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    return allExpenses.filter(exp => {
      if (exp.barbershop_id !== barbershopId) return false;

      const expDate = parseDateSafe(exp.date);
      if (!expDate) return false;

      return expDate >= start && expDate <= end;
    });
  }, [allExpenses, barbershopId, startDate, endDate]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + parseNumberSafe(exp.amount), 0);
  }, [filteredExpenses]);

  const totalComissoes = useMemo(() => {
    return barberPerformance.reduce((acc, curr) => acc + curr.comissaoValor, 0);
  }, [barberPerformance]);

  const totalGorjeta = useMemo(() => {
    return barberPerformance.reduce((acc, curr) => acc + curr.gorjetas, 0);
  }, [barberPerformance]);

  const lucroLiquidoRealFinal = useMemo(() => {
    return totalLiquidoReal - totalComissoes - totalExpenses;
  }, [totalLiquidoReal, totalComissoes, totalExpenses]);

  const custosOperacionais = useMemo(() => {
    return totalBruto - totalLiquidoReal + totalComissoes + totalGorjeta;
  }, [totalBruto, totalLiquidoReal, totalComissoes]);

  const analyzeWithSarah = useCallback(async () => {
    setIsSarahAnalyzing(true);
    setSarahMessage(null);

    try {
      const payload = {
        data: 'Período Selecionado',
        faturamentoBruto: totalBruto,
        lucroLiquido: lucroLiquidoRealFinal,
        status: lucroLiquidoRealFinal < 0 ? 'PREJUÍZO' : 'LUCRO',
        barbeiros: barberPerformance.map(b => ({
          nome: b.name,
          atendimentos: b.count,
          faturamento: b.bruto
        }))
      };

      const { data, error } = await supabase.functions.invoke('get-ai-insights', { body: payload });
      if (error) throw error;

      if (data?.insight) {
        setSarahMessage(data.insight);
      } else {
        setSarahMessage('Não consegui gerar um insight agora. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao analisar com Sarah:', error);
      setSarahMessage('Desculpe, tive um problema ao processar seus dados. Vamos tentar novamente?');
    } finally {
      setIsSarahAnalyzing(false);
    }
  }, [totalBruto, lucroLiquidoRealFinal, barberPerformance]);

  const handleTabChange = (tab: ActiveTab) => {
    if (isBlocked && tab !== 'billing' && tab !== 'dashboard') {
      setErrorMessage('🔒 Sistema bloqueado. Renove sua licença para continuar.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleFinalizeFromCalendar = (appointment: any) => {
    setPendingCheckoutApp(appointment);
    setActiveTab('lancamento');
  };

  const SubscriptionBanner = () => {
    // Se ainda estiver carregando os dados iniciais, não mostra nada
    if (loadingData || isBlocked) return null;

    const now = new Date();

    // Usa o valor direto que veio do banco ou o estado (garantindo que não seja undefined)
    const currentStatus = dbSubscriptionStatus;
    const trialDateStr = trialEndsAt;

    const trialDate = trialDateStr ? new Date(trialDateStr) : null;
    const isTrialValid = trialDate && trialDate > now;

    if (currentStatus === 'trialing' || isTrialValid) {
      return (
        <div className="mb-8 bg-amber-500/10 border border-amber-500/20 p-4 lg:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-2 rounded-xl text-black">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-black uppercase italic text-white leading-none">
                Modo de Teste <span className="text-amber-500">Ativado</span>
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                {trialDate
                  ? `Sua avaliação expira em: ${trialDate.toLocaleDateString('pt-BR')}`
                  : 'Aproveite seus dias de teste gratuito.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('billing')}
            className="px-6 py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
          >
            Ativar Licença
          </button>
        </div>
      );
    }
    return null;
  };

  if (!barbershopId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f1115] text-slate-300 font-black uppercase text-[10px] tracking-[0.5em] px-4">
        <span className="text-center">Selecione uma barbearia para acessar o painel.</span>
      </div>
    );
  }

  if (bookingLoading || loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f1115] text-amber-500 font-black uppercase text-[10px] tracking-[0.5em] px-4">
        <Loader2 className="animate-spin mb-4" size={40} />
        <span className="text-center">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-300 font-sans overflow-hidden">
      {/* ✅ ERROR TOAST */}
      {errorMessage && <ErrorToast message={errorMessage} onClose={() => setErrorMessage(null)} />}

      {/* OVERLAY PARA FECHAR SIDEBAR NO MOBILE */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ✅ SIDEBAR COM ITENS BLOQUEADOS */}
      <aside
        className={`
          fixed lg:relative
          w-64 lg:w-64
          h-full
          border-r border-white/5 bg-[#0a0b0e]
          flex flex-col
          z-50
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 lg:p-8 mb-2 lg:mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-base lg:text-xl font-black text-white tracking-tighter italic uppercase truncate">
                {barbershopName || 'Barber'}
              </h1>
              <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] mt-1">
                SaaS Edition v1.0
              </p>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Fechar menu"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* ✅ MENU COM ITENS BLOQUEADOS */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Menu principal">
          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => handleTabChange('dashboard')}
            disabled={false}
          />
          <SidebarItem
            icon={<Banknote size={18} />}
            label="Fluxo de Caixa"
            active={activeTab === 'caixa'}
            onClick={() => handleTabChange('caixa')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<CalendarDays size={18} />}
            label="Agendamentos"
            active={activeTab === 'agendamentos'}
            onClick={() => handleTabChange('agendamentos')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<ReceiptText size={18} />}
            label="Lançar Venda"
            active={activeTab === 'lancamento'}
            onClick={() => handleTabChange('lancamento')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<DollarSign size={18} />}
            label="Comissões"
            active={activeTab === 'comissoes'}
            onClick={() => handleTabChange('comissoes')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<Users size={18} />}
            label="Clientes"
            active={activeTab === 'clientes'}
            onClick={() => handleTabChange('clientes')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<Package size={18} />}
            label="Estoque"
            active={activeTab === 'estoque'}
            onClick={() => handleTabChange('estoque')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<MinusCircle size={18} />}
            label="Despesas"
            active={activeTab === 'despesas'}
            onClick={() => handleTabChange('despesas')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<History size={18} />}
            label="Histórico"
            active={activeTab === 'historico'}
            onClick={() => handleTabChange('historico')}
            disabled={isBlocked}
          />

          {/* ✅ ABA DE ASSINATURA: SEMPRE HABILITADA COM DESTAQUE */}
          <div className={`${isBlocked ? 'animate-pulse' : ''}`}>
            <SidebarItem
              icon={<ShieldCheck size={18} className={isBlocked ? "text-red-500" : "text-amber-500"} />}
              label={isBlocked ? "🔓 Renovar" : "Assinatura"}
              active={activeTab === 'billing'}
              onClick={() => handleTabChange('billing')}
              disabled={false}
            />
          </div>

          <SidebarItem
            icon={<Settings size={18} />}
            label="Configurações"
            active={activeTab === 'config'}
            onClick={() => handleTabChange('config')}
            disabled={isBlocked}
          />
        </nav>
      </aside>

      {/* ✅ MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative bg-[#0f1115] custom-scrollbar w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          {/* HAMBURGUER */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-[60] p-3 bg-amber-500 text-black rounded-xl shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-amber-600 min-w-[44px] min-h-[44px]"
            aria-label="Abrir menu"
          >
            <Menu size={22} strokeWidth={3} />
          </button>

          {/* ✅ BANNER DE TRIAL (só se não estiver bloqueado) */}
          <SubscriptionBanner />

          {/* ✅ RENDERIZAÇÃO CONDICIONAL BASEADA EM BLOQUEIO */}
          {isBlocked && activeTab === 'dashboard' ? (
            // Mostra dashboard de bloqueio
            <BlockedDashboard
              onActivate={() => setActiveTab('billing')}
              barbershopName={barbershopName}
              expiresAt={expiresAt}
            />
          ) : activeTab === 'billing' ? (
            // Mostra página de assinatura
            barbershopId && userEmail && (
              <SubscriptionPage
                barbershopId={barbershopId}
                userEmail={userEmail}
                subscriptionStatus={dbSubscriptionStatus}
                expiresAt={expiresAt}
                currentPlan={currentPlan}
              />
            )
          ) : !isBlocked ? (
            // ✅ CONTEÚDO NORMAL (só renderiza se NÃO estiver bloqueado)
            <>
              {/* HEADER HISTÓRICO */}
              {activeTab === 'historico' && (
                <header className="border-b border-white/5 pb-4 lg:pb-8 mb-4 lg:mb-8">
                  <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                    Livro de <span className="text-amber-500">Caixa</span>
                  </h2>
                  <p className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] lg:tracking-[0.3em] mt-2">
                    Relatório detalhado de todas as transações
                  </p>
                </header>
              )}

              {/* HEADER DASHBOARD/AGENDA */}
              {(activeTab === 'dashboard' || activeTab === 'agendamentos') && (
                <header className="flex flex-col gap-4 lg:gap-6 border-b border-white/5 pb-4 lg:pb-8 mb-4 lg:mb-8">
                  <div className="space-y-2 lg:space-y-3">
                    <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 w-fit px-2.5 lg:px-4 py-1.5 rounded-full border border-amber-500/20">
                      <Activity size={12} className="animate-pulse flex-shrink-0" />
                      <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.15em] lg:tracking-[0.2em]">
                        Visão Geral
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                      {activeTab === 'dashboard' ? 'Performance' : 'Agenda'}{' '}
                      <span className="text-amber-500">{activeTab === 'dashboard' ? 'Center' : 'Geral'}</span>
                    </h2>
                  </div>

                  {activeTab === 'dashboard' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-4">
                      <button
                        onClick={analyzeWithSarah}
                        disabled={isSarahAnalyzing}
                        className="bg-slate-900 border border-white/5 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:border-amber-500/50 shadow-xl transition-all flex items-center justify-center min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Analisar com IA"
                      >
                        {isSarahAnalyzing ? (
                          <Loader2 className="animate-spin text-amber-500" size={18} />
                        ) : (
                          <BrainCircuit className="text-amber-500" size={18} />
                        )}
                      </button>

                      <div className="bg-slate-900 border border-white/10 p-3 lg:p-4 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-4 shadow-xl hover:border-amber-500/30 transition-all relative min-h-[48px]">
                        <CalendarIcon size={14} className="text-amber-500 flex-shrink-0" />
                        <DatePicker
                          selectsRange
                          startDate={startDate}
                          endDate={endDate}
                          onChange={(update) => setDateRange(update)}
                          locale={ptBR}
                          dateFormat="dd/MM/yyyy"
                          className="bg-transparent text-white text-xs sm:text-sm font-bold outline-none cursor-pointer w-full min-w-0"
                          placeholderText="Selecione o período"
                          popperPlacement="bottom-start"
                          popperModifiers={[
                            { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }
                          ]}
                          ariaLabelledBy="date-range-label"
                        />
                      </div>
                    </div>
                  )}
                </header>
              )}

              {/* DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 lg:space-y-12 animate-in fade-in duration-700">
                  {pendingApps.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl lg:rounded-2xl xl:rounded-[3rem] p-4 lg:p-8">
                      <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6 flex-wrap">
                        <Clock className="text-amber-500 flex-shrink-0" size={16} />
                        <h4 className="text-base lg:text-xl font-black text-white uppercase italic tracking-tighter">
                          Solicitações <span className="text-amber-500">Pendentes</span>
                        </h4>
                        <span className="bg-amber-500 text-black text-[9px] lg:text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                          {pendingApps.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:gap-4">
                        {pendingApps.map(app => {
                          const appDate = parseDateSafe(app.date);
                          const dateStr = appDate ? appDate.toLocaleDateString('pt-BR') : 'Data inválida';

                          return (
                            <div
                              key={app.id}
                              className="bg-slate-900/60 border border-white/5 p-4 lg:p-5 rounded-xl lg:rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 lg:gap-4 group hover:border-amber-500/30 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-amber-500 font-black text-[9px] lg:text-[10px] uppercase mb-1 truncate">
                                  {app.time} - {dateStr}
                                </p>
                                <h5 className="text-white font-black uppercase italic text-sm lg:text-base truncate">
                                  {app.customerName}
                                </h5>
                                <p className="text-[8px] lg:text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">
                                  {app.service} com {app.barber}
                                </p>
                              </div>

                              <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleReject(app.id)}
                                  className="flex-1 sm:flex-none p-2.5 lg:p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all min-h-[44px] flex items-center justify-center"
                                  aria-label="Rejeitar agendamento"
                                >
                                  <X size={18} />
                                </button>
                                <button
                                  onClick={() => handleApprove(app.id)}
                                  className="flex-1 sm:flex-none p-2.5 lg:p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10 min-h-[44px] flex items-center justify-center"
                                  aria-label="Aprovar agendamento"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-8">
                    <StatCard label="Faturamento" value={totalBruto} icon={<DollarSign size={18} />} variant="amber" />
                    <StatCard label="Comissões, taxa e gorjetas" value={custosOperacionais} icon={<CreditCard size={18} />} variant="slate" />
                    <StatCard label="Líquido Real" value={lucroLiquidoRealFinal} icon={<TrendingUp size={18} />} variant="green" />
                    <StatCard label="Despesas" value={totalExpenses} icon={<MinusCircle size={18} />} variant="red" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-10">
                    <div className="lg:col-span-2 bg-[#0a0b0e] border border-white/5 rounded-xl lg:rounded-2xl xl:rounded-[3rem] p-4 lg:p-10 shadow-2xl">
                      <div className="flex justify-between items-center mb-4 lg:mb-10">
                        <h4 className="text-base lg:text-xl font-black text-white uppercase italic tracking-tighter">Ranking de Performance</h4>
                        <TrendingUp className="text-amber-500 flex-shrink-0" size={18} />
                      </div>

                      <div className="space-y-4 lg:space-y-8">
                        {barberPerformance.map(b => (
                          <div key={b.id}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1 lg:gap-2 mb-2 lg:mb-3">
                              <span className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-widest truncate max-w-full">
                                {b.name} <span className="text-slate-600 ml-1 lg:ml-2 font-bold">({b.count} Atendimentos)</span>
                              </span>
                              <span className="text-sm lg:text-lg font-black text-amber-500 italic tabular-nums flex-shrink-0">
                                R$ {b.bruto.toFixed(2)}
                              </span>
                            </div>

                            <div className="h-1.5 lg:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                style={{ width: `${totalBruto > 0 ? (b.bruto / totalBruto) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}

                        {barberPerformance.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-8">Nenhum dado disponível no período selecionado.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl lg:rounded-2xl xl:rounded-[3rem] p-4 lg:p-10 flex flex-col justify-between shadow-2xl">
                      <div>
                        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-8 text-amber-500">
                          <BrainCircuit size={20} className="flex-shrink-0" />
                          <h4 className="text-base lg:text-xl font-black uppercase italic tracking-tighter leading-none">Sarah Insights</h4>
                        </div>
                        <p className="text-xs lg:text-[14px] font-bold text-white leading-relaxed break-words">
                          {sarahMessage || 'Clique no botão abaixo para analisar a performance.'}
                        </p>
                      </div>

                      <button
                        onClick={analyzeWithSarah}
                        disabled={isSarahAnalyzing}
                        className="w-full mt-4 lg:mt-10 bg-amber-500 text-black py-3.5 lg:py-5 rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-[11px] tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center"
                      >
                        {isSarahAnalyzing ? 'Analisando...' : 'Atualizar Insights'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lancamento' && (
                <CheckoutModule
                  barbershopId={barbershopId}
                  barbers={barbers}
                  services={availableServices}
                  inventory={inventory}
                  customers={allCustomers}
                  machineFees={machineFees}
                  initialAppointment={pendingCheckoutApp}
                  onSuccess={async () => {
                    await refetchAppointments();
                    await fetchData();
                    setPendingCheckoutApp(null);
                  }}
                />
              )}

              {activeTab === 'historico' && (
                <SalesHistoryModule
                  appointments={(appointments as Appointment[]).filter(app => app.barbershop_id === barbershopId)}
                  servicesList={availableServices}
                  productsList={inventory}
                  barbershopId={barbershopId}
                  onDelete={async (id: string) => {
                    try {
                      if (confirm('Deseja estornar esta venda? Isso removerá o valor do faturamento.')) {
                        await deleteAppointment(id);
                        await refetchAppointments();
                      }
                    } catch (error) {
                      console.error('Erro ao deletar:', error);
                    }
                  }}
                />
              )}

              {activeTab === 'agendamentos' && (
                <div className="space-y-4 lg:space-y-8 animate-in fade-in duration-700">
                  <AdminCalendarView
                    barbers={barbers}
                    appointments={(appointments as Appointment[]).filter(app =>
                      app.barbershop_id === barbershopId && app.status !== 'cancelado'
                    )} services={availableServices}
                    barbershopId={barbershopId}
                    onFinalize={handleFinalizeFromCalendar}
                    onSave={async (newBooking: any) => {
                      try {
                        await addAppointment(newBooking);
                        await refetchAppointments();
                      } catch (error) {
                        console.error('Erro ao criar agendamento:', error);
                      }
                    }}
                    onDelete={async (id: string) => {
                      try {
                        await deleteAppointment(id);
                        await refetchAppointments();
                      } catch (error) {
                        console.error('Erro ao deletar agendamento:', error);
                      }
                    }}
                    onUpdate={async (id: string, updates: any) => {
                      try {
                        const { error } = await supabase.from('appointments').update(updates).eq('id', id);
                        if (error) throw error;
                        await refetchAppointments();
                      } catch (error) {
                        console.error('Erro ao atualizar agendamento:', error);
                      }
                    }}
                  />
                </div>
              )}

              {activeTab === 'caixa' && (
                <CashFlowModule
                  barbershopId={barbershopId}
                  appointments={(appointments as Appointment[]).filter(app => app.barbershop_id === barbershopId)}
                />
              )}

              {activeTab === 'despesas' && (
                <div className="space-y-4 lg:space-y-8 animate-in fade-in duration-700">
                  <header className="border-b border-white/5 pb-4 lg:pb-8 mb-4 lg:mb-8">
                    <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                      Gestão de <span className="text-red-500">Custos</span>
                    </h2>
                    <p className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] lg:tracking-[0.3em] mt-2">
                      Controle de saídas e despesas fixas/variáveis
                    </p>
                  </header>

                  <ExpensesModule
                    barbershopId={barbershopId}
                    onUpdate={async () => {
                      await fetchExpenses();
                    }}
                  />
                </div>
              )}

              {activeTab === 'clientes' && <CustomersModule barbershopId={barbershopId} />}
              {activeTab === 'comissoes' && <CommissionsModule barbershopId={barbershopId} />}
              {activeTab === 'estoque' && <InventoryModule barbershopId={barbershopId} />}
              {activeTab === 'config' && <AdminSettings barbershopId={barbershopId} />}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

// ✅ FIX: StatCard com handling de valores negativos
const StatCard = ({
  label,
  value,
  icon,
  variant = 'default'
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'amber' | 'red' | 'green' | 'slate';
}) => {
  const isNegative = value < 0;

  const variants = {
    default: 'bg-[#111319] border-white/5 text-white hover:border-amber-500/30',
    amber: 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-black scale-[1.01] lg:scale-[1.02] shadow-amber-500/20',
    red: 'bg-red-500/10 border-red-500/20 text-red-500 hover:border-red-500/50',
    green: 'bg-green-500/10 border-green-500/20 text-green-500 hover:border-green-500/50',
    slate: 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-500/50'
  } as const;

  const activeVariant = isNegative
    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]'
    : variants[variant];

  return (
    <div
      className={`p-4 sm:p-5 lg:p-8 rounded-xl lg:rounded-[2rem] border transition-all duration-500 shadow-2xl relative overflow-hidden group
        ${activeVariant}
        ${isNegative ? 'animate-pulse' : ''}
      `}
    >
      {isNegative && (
        <div className="absolute top-1.5 right-2 lg:top-2 lg:right-4">
          <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest animate-bounce">Atenção: Prejuízo</span>
        </div>
      )}

      <div className="absolute -right-4 -top-4 w-20 lg:w-24 h-20 lg:h-24 rounded-full blur-3xl opacity-10 transition-colors bg-white" />

      <div className="flex justify-between items-start mb-4 lg:mb-6">
        <p
          className={`text-[9px] lg:text-[10px] font-black uppercase tracking-[0.15em] lg:tracking-[0.2em] ${variant === 'amber' && !isNegative ? 'text-black/60' : 'text-slate-500'
            }`}
        >
          {label}
        </p>
        <div className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl ${variant === 'amber' && !isNegative ? 'bg-black/10' : 'bg-white/5'} flex-shrink-0`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xs lg:text-sm font-bold opacity-40">R$</span>
        <h3 className="text-xl sm:text-2xl lg:text-4xl font-black italic tracking-tighter tabular-nums leading-none break-words">
          {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
      </div>
    </div>
  );
};

export default AdminDashboard;
