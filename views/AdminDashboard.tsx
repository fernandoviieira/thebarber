import React, { useState, useEffect } from 'react';
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
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';
import {
  Users, DollarSign, TrendingUp, Loader2, Calendar as CalendarIcon,
  Sparkles, Target, Clock, Plus, X, CheckCircle2, Trash2, BrainCircuit,
  Package, LayoutDashboard, Settings, LogOut, ReceiptText, CalendarDays,
  ShoppingCart, Minus, CreditCard, Banknote, QrCode, Percent, Save, History, ArrowRight, Activity, Menu
} from 'lucide-react';

interface AdminDashboardProps {
  barbershopId: string | null;
}

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 transition-all relative group ${active ? 'text-amber-500 bg-amber-500/5' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {active && <div className="absolute left-0 w-1 h-6 lg:h-8 bg-amber-500 rounded-r-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />}
    <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{icon}</div>
    <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.15em] lg:tracking-[0.2em]">{label}</span>
  </button>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ barbershopId }) => {
  const { appointments, addAppointment, updateStatus, deleteAppointment, fetchAppointments, loading: bookingLoading } = useBooking();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [customCommissions, setCustomCommissions] = useState<Record<string, number>>({});

  const [isSarahAnalyzing, setIsSarahAnalyzing] = useState(false);
  const [sarahMessage, setSarahMessage] = useState<string | null>(null);

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agendamentos' | 'lancamento' | 'clientes' | 'estoque' | 'config' | 'comissoes' | 'historico' | 'caixa'>('dashboard');

  // 🔥 NOVO: Estado para controlar sidebar mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [machineFees, setMachineFees] = useState({
    dinheiro: 0,
    pix: 0,
    debito: 1.99,
    credito: 4.99,
    pacote: 0
  });
  const [isSavingFees, setIsSavingFees] = useState(false);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;

  const [pdvItems, setPdvItems] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('dinheiro');

  const [barbershopName, setBarbershopName] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!barbershopId) return;
      setLoadingData(true);

      if (fetchAppointments) await fetchAppointments(barbershopId);

      const [barbersRes, servicesRes, inventoryRes, settingsRes, customersRes, shopRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('barbershop_id', barbershopId),
        supabase.from('services').select('*').eq('barbershop_id', barbershopId),
        supabase.from('inventory').select('*').eq('barbershop_id', barbershopId).gt('current_stock', 0),
        supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle(),
        supabase.from('customers').select('*, customer_packages(*)').eq('barbershop_id', barbershopId),
        supabase.from('barbershops').select('name').eq('id', barbershopId).single()
      ]);

      if (shopRes.data) setBarbershopName(shopRes.data.name);

      if (barbersRes.data) {
        setBarbers(barbersRes.data);
        const initial: Record<string, number> = {};
        barbersRes.data.forEach(b => initial[b.id] = b.commission_rate || 0);
        setCustomCommissions(initial);
      }
      if (servicesRes.data) setAvailableServices(servicesRes.data);
      if (inventoryRes.data) setInventory(inventoryRes.data);
      if (customersRes.data) setAllCustomers(customersRes.data);
      if (settingsRes.data) {
        setMachineFees({
          dinheiro: Number(settingsRes.data.fee_dinheiro),
          pix: Number(settingsRes.data.fee_pix),
          debito: Number(settingsRes.data.fee_debito),
          credito: Number(settingsRes.data.fee_credito),
          pacote: 0
        });
      }
      setLoadingData(false);
    }
    fetchData();
  }, [barbershopId, activeTab]);

  const pendingApps = appointments.filter(app =>
    app.status === 'pendente' && app.barbershop_id === barbershopId
  );

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmado' })
      .eq('id', id);

    if (!error && fetchAppointments) {
      await fetchAppointments(barbershopId!);
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', id);

    if (!error && fetchAppointments) {
      await fetchAppointments(barbershopId!);
    }
  };

  const saveFees = async () => {
    setIsSavingFees(true);
    const { error } = await supabase.from('barbershop_settings').upsert({
      barbershop_id: barbershopId,
      fee_dinheiro: machineFees.dinheiro,
      fee_pix: machineFees.pix,
      fee_debito: machineFees.debito,
      fee_credito: machineFees.credito
    });
    setIsSavingFees(false);
    if (!error) alert("Taxas atualizadas com sucesso!");
  };

  const filteredApps = appointments.filter(app => {
    if (!startDate || !endDate) return false;
    const appDate = new Date(app.date + 'T00:00:00');
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return appDate >= start && appDate <= end && app.barbershop_id === barbershopId;
  });

  const totalBruto = filteredApps.filter(app => app.status === 'confirmado').reduce((acc, curr) => acc + Number(curr.price), 0);
  const totalLiquidoReal = filteredApps.filter(app => app.status === 'confirmado').reduce((acc, curr) => {
    const metodo = (curr.payment_method || 'dinheiro') as keyof typeof machineFees;
    const taxa = (machineFees[metodo] || 0) / 100;
    return acc + (Number(curr.price) * (1 - taxa));
  }, 0);

  const barberPerformance = barbers.map(barber => {
    const services = filteredApps.filter(app => app.barber === barber.name && app.status === 'confirmado');
    const bruto = services.reduce((acc, curr) => acc + Number(curr.price), 0);
    const rate = customCommissions[barber.id] !== undefined ? customCommissions[barber.id] : (barber.commission_rate || 0);
    return { ...barber, count: services.length, bruto, comissaoValor: bruto * (rate / 100), currentRate: rate };
  }).sort((a, b) => b.bruto - a.bruto);

  const lucroLiquido = totalLiquidoReal - barberPerformance.reduce((acc, curr) => acc + curr.comissaoValor, 0);

  const addItemToPdv = (item: any, type: 'servico' | 'produto') => {
    const newItem = {
      id: Math.random().toString(),
      originalId: item.id,
      name: item.name,
      price: Number(item.price || item.price_sell),
      type
    };
    setPdvItems([...pdvItems, newItem]);
  };

  const removeItemFromPdv = (id: string) => {
    setPdvItems(pdvItems.filter(i => i.id !== id));
  };

  const getPdvTotal = () => {
    const activePkg = selectedCustomer?.customer_packages?.find((p: any) => p.used_credits < p.total_credits);
    const isFirst = activePkg && activePkg.used_credits === 0;
    let total = (paymentMethod === 'pacote' && isFirst) ? Number(activePkg.price_paid) : 0;
    if (paymentMethod !== 'pacote') return pdvItems.reduce((acc, item) => acc + item.price, 0);
    pdvItems.forEach(item => { if (item.type === 'produto') total += item.price; });
    return total;
  };

  const pdvTotal = getPdvTotal();
  const pdvFee = machineFees[paymentMethod] / 100;
  const pdvTotalLiquido = pdvTotal * (1 - pdvFee);

  const handleFinalizeSale = async () => {
    if (!selectedBarber) return;

    if (paymentMethod !== 'pacote' && pdvItems.length === 0) return;

    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const activePkg = selectedCustomer?.customer_packages?.find(
      (p: any) => p.used_credits < p.total_credits
    );

    const isFirstTime = activePkg && activePkg.used_credits === 0;

    const itemsToProcess = (pdvItems.length === 0 && activePkg)
      ? [{
        name: activePkg.package_name,
        price: isFirstTime ? Number(activePkg.price_paid) : 0,
        type: 'servico',
        originalId: 'pkg_credit'
      }]
      : pdvItems;

    for (const item of itemsToProcess) {
      let finalItemPrice = item.price;

      if (paymentMethod === 'pacote' && item.type === 'servico') {
        finalItemPrice = isFirstTime ? Number(activePkg.price_paid) : 0;
      }

      const newSale = {
        barbershop_id: barbershopId!,
        customerName: selectedCustomer ? selectedCustomer.name : "Venda Direta",
        service: item.name,
        barber: selectedBarber,
        date: now.toISOString().split('T')[0],
        time: currentTime,
        price: finalItemPrice,
        payment_method: paymentMethod,
        status: 'confirmado' as const,
        customerPhone: selectedCustomer ? selectedCustomer.phone : 'Balcão'
      };

      await addAppointment(newSale);

      if (item.type === 'produto') {
        const product = inventory.find(p => p.id === item.originalId);
        if (product) {
          await supabase
            .from('inventory')
            .update({ current_stock: product.current_stock - 1 })
            .eq('id', item.originalId);
        }
      }

      if (paymentMethod === 'pacote' && activePkg && item.type === 'servico') {
        const { error: pkgError } = await supabase
          .from('customer_packages')
          .update({ used_credits: activePkg.used_credits + 1 })
          .eq('id', activePkg.id);

        if (pkgError) console.error("Erro ao descontar crédito:", pkgError);
      }
    }

    setPdvItems([]);
    setSelectedBarber('');
    setSelectedCustomer(null);
    setPaymentMethod('dinheiro');

    if (fetchAppointments) await fetchAppointments(barbershopId!);
    setActiveTab('agendamentos');
  };

  const analyzeWithSarah = async () => {
    setIsSarahAnalyzing(true);
    setSarahMessage(null);
    try {
      const payload = {
        data: "Período Selecionado",
        faturamentoBruto: totalBruto,
        lucroLiquido: lucroLiquido,
        barbeiros: barberPerformance.map(b => ({ nome: b.name, atendimentos: b.count, faturamento: b.bruto }))
      };
      const { data, error } = await supabase.functions.invoke('get-ai-insights', { body: payload });
      if (error) throw error;
      if (data && data.insight) setSarahMessage(data.insight);
    } catch (e: any) {
      setSarahMessage("Erro ao conectar com a Sarah AI.");
    } finally {
      setIsSarahAnalyzing(false);
    }
  };

  // 🔥 Função para fechar sidebar ao clicar em item (mobile)
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Fecha sidebar no mobile
  };

  if (bookingLoading || loadingData) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f1115] text-amber-500 font-black uppercase text-[10px] tracking-[0.5em]">
      <Loader2 className="animate-spin mb-4" size={48} /> Sincronizando...
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-300 font-sans overflow-hidden">

      {/* 🔥 OVERLAY PARA FECHAR SIDEBAR NO MOBILE */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🔥 SIDEBAR RESPONSIVA */}
      <aside className={`
        fixed lg:relative
        w-64 lg:w-64
        h-full
        border-r border-white/5 bg-[#0a0b0e] 
        flex flex-col 
        z-50
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 lg:p-8 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg lg:text-xl font-black text-white tracking-tighter italic uppercase">
                {barbershopName || 'Barber'}
              </h1>
              <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] mt-1">SaaS Edition v1.0</p>
            </div>
            {/* 🔥 BOTÃO FECHAR NO MOBILE */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={<Banknote size={18} />} label="Fluxo de Caixa" active={activeTab === 'caixa'} onClick={() => handleTabChange('caixa')} />
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
          <SidebarItem icon={<CalendarDays size={18} />} label="Agendamentos" active={activeTab === 'agendamentos'} onClick={() => handleTabChange('agendamentos')} />
          <SidebarItem icon={<ReceiptText size={18} />} label="Lançar Venda" active={activeTab === 'lancamento'} onClick={() => handleTabChange('lancamento')} />
          <SidebarItem icon={<DollarSign size={18} />} label="Comissões" active={activeTab === 'comissoes'} onClick={() => handleTabChange('comissoes')} />
          <SidebarItem icon={<Users size={18} />} label="Clientes" active={activeTab === 'clientes'} onClick={() => handleTabChange('clientes')} />
          <SidebarItem icon={<Package size={18} />} label="Estoque" active={activeTab === 'estoque'} onClick={() => handleTabChange('estoque')} />
          <SidebarItem icon={<History size={18} />} label="Histórico" active={activeTab === 'historico'} onClick={() => handleTabChange('historico')} />
          <SidebarItem icon={<Settings size={18} />} label="Configurações" active={activeTab === 'config'} onClick={() => handleTabChange('config')} />
        </nav>
      </aside>

      {/* 🔥 MAIN CONTENT COM PADDING MOBILE */}
      <main className="flex-1 overflow-y-auto relative bg-[#0f1115] custom-scrollbar w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">

          {/* 🔥 BOTÃO HAMBURGUER MOBILE - AJUSTADO */}
<button
  onClick={() => setIsSidebarOpen(true)}
  className="lg:hidden fixed top-5 left-5 z-[60] p-3 bg-amber-500 text-black rounded-xl shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-amber-600"
>
  <Menu size={24} strokeWidth={3} />
</button>

          {/* TÍTULO HISTÓRICO */}
          {activeTab === 'historico' && (
            <header className="border-b border-white/5 pb-6 lg:pb-8 mb-6 lg:mb-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                Livro de <span className="text-amber-500">Caixa</span>
              </h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Relatório detalhado de todas as transações</p>
            </header>
          )}

          {/* HEADER DASHBOARD/AGENDAMENTOS */}
          {(activeTab === 'dashboard' || activeTab === 'agendamentos') && (
            <header className="flex flex-col gap-6 border-b border-white/5 pb-6 lg:pb-8 mb-6 lg:mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 w-fit px-3 lg:px-4 py-1.5 rounded-full border border-amber-500/20">
                  <Activity size={14} className="animate-pulse" />
                  <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em]">Visão Geral</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                  {activeTab === 'dashboard' ? 'Performance' : 'Agenda'} <span className="text-amber-500">{activeTab === 'dashboard' ? 'Center' : 'Geral'}</span>
                </h2>
              </div>

              {/* 🔥 CONTROLES RESPONSIVOS */}
              {activeTab === 'dashboard' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
                  <button 
                    onClick={analyzeWithSarah} 
                    disabled={isSarahAnalyzing} 
                    className="bg-slate-900 border border-white/5 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:border-amber-500/50 shadow-xl transition-all flex items-center justify-center"
                  >
                    {isSarahAnalyzing ? <Loader2 className="animate-spin text-amber-500" size={20} /> : <BrainCircuit className="text-amber-500" size={20} />}
                  </button>

                  {/* 🔥 DATEPICKER RESPONSIVO */}
                  <div className="bg-slate-900 border border-white/10 p-3 lg:p-4 rounded-xl lg:rounded-2xl flex items-center gap-3 lg:gap-4 shadow-xl hover:border-amber-500/30 transition-all relative">
                    <CalendarIcon size={16} className="text-amber-500 flex-shrink-0" />
                    <DatePicker
                      selectsRange={true}
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      locale={ptBR}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent text-white text-xs lg:text-sm font-bold outline-none cursor-pointer w-full min-w-0"
                      placeholderText="Selecione o período"
                      // 🔥 CORREÇÃO CRÍTICA: Remove portal no mobile
                      withPortal={false}
                      // 🔥 Adiciona popperPlacement para mobile
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: "preventOverflow",
                          options: {
                            boundary: "viewport",
                            padding: 8
                          }
                        }
                      ]}
                    />
                  </div>
                </div>
              )}
            </header>
          )}

          {/* DASHBOARD CONTENT */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-700">

              {/* APROVAÇÕES PENDENTES */}
              {pendingApps.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl lg:rounded-[3rem] p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="text-amber-500" size={18} />
                    <h4 className="text-lg lg:text-xl font-black text-white uppercase italic tracking-tighter">
                      Solicitações <span className="text-amber-500">Pendentes</span>
                    </h4>
                    <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                      {pendingApps.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {pendingApps.map(app => (
                      <div key={app.id} className="bg-slate-900/60 border border-white/5 p-4 lg:p-5 rounded-xl lg:rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-amber-500/30 transition-all">
                        <div className="flex-1">
                          <p className="text-amber-500 font-black text-[10px] uppercase mb-1">{app.time} - {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          <h5 className="text-white font-black uppercase italic text-sm lg:text-base">{app.customerName}</h5>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{app.service} com {app.barber}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleReject(app.id)}
                            className="flex-1 sm:flex-none p-2.5 lg:p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <X size={18} />
                          </button>
                          <button
                            onClick={() => handleApprove(app.id)}
                            className="flex-1 sm:flex-none p-2.5 lg:p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🔥 GRID ESTATÍSTICAS RESPONSIVO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
                <StatCard label="Faturamento" value={totalBruto} icon={<DollarSign size={20} />} />
                <StatCard label="Comissões e taxas" value={totalBruto - lucroLiquido} icon={<CreditCard size={20} />} />
                <StatCard label="Líquido Real" value={lucroLiquido} icon={<TrendingUp size={20} />} variant="amber" />
              </div>

              {/* 🔥 RANKING E SARAH RESPONSIVO */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                <div className="lg:col-span-2 bg-[#0a0b0e] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 shadow-2xl">
                  <div className="flex justify-between items-center mb-6 lg:mb-10">
                    <h4 className="text-lg lg:text-xl font-black text-white uppercase italic tracking-tighter">Ranking de Performance</h4>
                    <TrendingUp className="text-amber-500" size={20} />
                  </div>
                  <div className="space-y-6 lg:space-y-8">
                    {barberPerformance.map((b) => (
                      <div key={b.id}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-3">
                          <span className="text-[11px] lg:text-[12px] font-black text-white uppercase tracking-widest">
                            {b.name} <span className="text-slate-600 ml-2 font-bold">({b.count} Atendimentos)</span>
                          </span>
                          <span className="text-base lg:text-lg font-black text-amber-500 italic tabular-nums">R$ {b.bruto.toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                            style={{ width: `${(b.bruto / (totalBruto || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center gap-3 mb-6 lg:mb-8 text-amber-500">
                      <BrainCircuit size={24} />
                      <h4 className="text-lg lg:text-xl font-black uppercase italic tracking-tighter leading-none">Sarah Insights</h4>
                    </div>
                    <p className="text-xs lg:text-[14px] font-bold text-white leading-relaxed">
                      {sarahMessage || "Clique no botão abaixo para analisar a performance."}
                    </p>
                  </div>
                  <button 
                    onClick={analyzeWithSarah} 
                    disabled={isSarahAnalyzing} 
                    className="w-full mt-6 lg:mt-10 bg-amber-500 text-black py-4 lg:py-5 rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-[11px] tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSarahAnalyzing ? "Analisando..." : "Atualizar Insights"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lancamento' && (
            <CheckoutModule
              barbershopId={barbershopId!}
              barbers={barbers}
              services={availableServices}
              inventory={inventory}
              customers={allCustomers}
              machineFees={machineFees}
              onSuccess={() => {
                fetchAppointments(barbershopId!);
              }}
            />
          )}

          {activeTab === 'historico' && (
            <SalesHistoryModule
              appointments={appointments.filter(app => app.barbershop_id === barbershopId)}
              onDelete={async (id) => {
                if (confirm("Deseja estornar esta venda? Isso removerá o valor do faturamento.")) {
                  await deleteAppointment(id);
                  if (fetchAppointments) await fetchAppointments(barbershopId!);
                }
              }}
            />
          )}

          {activeTab === 'agendamentos' && (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700">
              <AdminCalendarView
                barbers={barbers}
                appointments={appointments.filter(app => app.barbershop_id === barbershopId)}
                services={availableServices}
                barbershopId={barbershopId!}
                onSave={async (newBooking) => {
                  await addAppointment(newBooking);
                  if (fetchAppointments) await fetchAppointments(barbershopId!);
                }}
                onDelete={async (id) => {
                  await deleteAppointment(id);
                  if (fetchAppointments) await fetchAppointments(barbershopId!);
                }}
                onUpdate={async (id, updates) => {
                  const { error } = await supabase
                    .from('appointments')
                    .update(updates)
                    .eq('id', id);

                  if (!error && fetchAppointments) {
                    await fetchAppointments(barbershopId!);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'caixa' && (
            <CashFlowModule 
              barbershopId={barbershopId!} 
              appointments={appointments.filter(app => app.barbershop_id === barbershopId)} 
            />
          )}
          {activeTab === 'clientes' && <CustomersModule barbershopId={barbershopId} />}
          {activeTab === 'comissoes' && <CommissionsModule barbershopId={barbershopId} />}
          {activeTab === 'estoque' && <InventoryModule barbershopId={barbershopId} />}
          {activeTab === 'config' && <AdminSettings barbershopId={barbershopId} />}
        </div>
      </main>
    </div>
  );
};

const PaymentBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl border transition-all flex flex-col items-center gap-2 ${active ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-amber-500/50'}`}>
    {icon} <span className="text-[9px] lg:text-[10px] font-black uppercase">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, variant = 'default' }: any) => (
  <div className={`p-6 lg:p-10 rounded-2xl lg:rounded-[3rem] border transition-all shadow-2xl relative overflow-hidden group ${variant === 'amber' ? 'bg-amber-500 border-amber-400 text-black scale-[1.02] lg:scale-[1.05] shadow-amber-500/20' : 'bg-[#0a0b0e] border-white/5 text-white hover:border-amber-500/30'}`}>
    <div className="flex justify-between items-start mb-6 lg:mb-8">
      <p className={`text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] ${variant === 'amber' ? 'text-black/60' : 'text-slate-500'}`}>{label}</p>
      <div className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl ${variant === 'amber' ? 'bg-black/10' : 'bg-white/5 text-amber-500'}`}>{icon}</div>
    </div>
    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black italic tracking-tighter tabular-nums leading-none">R$ {value.toFixed(2)}</h3>
  </div>
);

export default AdminDashboard;