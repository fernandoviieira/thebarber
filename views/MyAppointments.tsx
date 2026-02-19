import React, { useEffect, useState, useMemo } from 'react';
import { useBooking } from './BookingContext';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  User,
  Loader2,
  Trash2,
  CheckCircle2,
  Bell,
  Filter,
  Search,
  X,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MyAppointmentsProps {
  onBack: () => void;
  customerName: string;
  customerPhone: string;
  userId: string;
  isAdmin: boolean;
  barbershopId?: string | null;
}

type FilterStatus = 'todos' | 'pendente' | 'confirmado' | 'finalizado' | 'cancelado';
type SortType = 'data-asc' | 'data-desc' | 'status';
type DateFilterType = 'todos' | 'hoje' | 'semana' | 'mes' | 'proximos' | 'passados' | 'personalizado';

const MyAppointments: React.FC<MyAppointmentsProps> = ({
  onBack,
  customerName,
  customerPhone,
  userId,
  isAdmin,
  barbershopId
}) => {
  const { appointments, loading, updateStatus, deleteAppointment, sendCancellationNotification, fetchAppointments } = useBooking();
  const [justUpdated, setJustUpdated] = useState<string | null>(null);
  const [barbershopPhone, setBarbershopPhone] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [sortType, setSortType] = useState<SortType>('data-asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    setLastUpdate(Date.now());
  }, [appointments]);

  useEffect(() => {
    const fetchBarbershopPhone = async () => {
      if (barbershopId) {
        const { data } = await supabase
          .from('barbershops')
          .select('phone')
          .eq('id', barbershopId)
          .single();

        if (data?.phone) {
          setBarbershopPhone(data.phone);
        }
      }
    };

    fetchBarbershopPhone();
  }, [barbershopId]);

  const isDateInRange = (appointmentDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appDate = new Date(appointmentDate + 'T00:00:00');

    switch (dateFilter) {
      case 'hoje':
        return appDate.toDateString() === today.toDateString();

      case 'semana':
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        return appDate >= today && appDate <= weekEnd;

      case 'mes':
        const monthEnd = new Date(today);
        monthEnd.setMonth(today.getMonth() + 1);
        return appDate >= today && appDate <= monthEnd;

      case 'proximos':
        return appDate >= today;

      case 'passados':
        return appDate < today;

      case 'personalizado':
        if (!customStartDate && !customEndDate) return true;

        const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date('1900-01-01');
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date('2100-12-31');

        return appDate >= start && appDate <= end;

      default:
        return true;
    }
  };

  const filtered = useMemo(() => { 
    return appointments.filter(app => {
      if (isAdmin) return true;

      if (app.status === 'cancelado') return false;

      const matchUserId = userId && app.user_id === userId;
      const cleanAppPhone = (app.customerPhone || "").toString().replace(/\D/g, "");
      const cleanUserPhone = (customerPhone || "").toString().replace(/\D/g, "");
      const matchPhone = cleanUserPhone && cleanAppPhone && cleanAppPhone.slice(-9) === cleanUserPhone.slice(-9);

      return matchUserId || matchPhone;
    });
  }, [appointments, isAdmin, userId, customerPhone, lastUpdate]);

  const myAppointments = useMemo(() => {
    let result = Array.from(new Map(filtered.map(item => [item.id, item])).values());

    if (filterStatus !== 'todos') {
      result = result.filter(app => app.status === filterStatus);
    }

    result = result.filter(app => isDateInRange(app.date));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(app =>
        app.service.toLowerCase().includes(term) ||
        app.barber.toLowerCase().includes(term) ||
        app.customerName?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      switch (sortType) {
        case 'data-desc':
          return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
        case 'status':
          return a.status.localeCompare(b.status);
        default: 
          return a.date.localeCompare(b.date) || a.time.localeCompare(a.time);
      }
    });

    return result;
  }, [filtered, filterStatus, sortType, searchTerm, dateFilter, customStartDate, customEndDate, lastUpdate]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pendente: filtered.filter(a => a.status === 'pendente').length,
    confirmado: filtered.filter(a => a.status === 'confirmado').length,
    finalizado: filtered.filter(a => a.status === 'finalizado').length,
    cancelado: filtered.filter(a => a.status === 'cancelado').length,
  }), [filtered, lastUpdate]);

  useEffect(() => {
    const previousData = JSON.parse(sessionStorage.getItem('my-appointments-data') || '{}');
    const previousIds = new Set(previousData.ids || []);
    const previousStatusMap = new Map(Object.entries(previousData.statusMap || {}));

    const currentIds = myAppointments.map(a => a.id);
    const currentStatusMap = new Map(myAppointments.map(a => [a.id, a.status]));

    const newAppointment = myAppointments.find(app => !previousIds.has(app.id));

    const changedAppointment = myAppointments.find(app =>
      previousIds.has(app.id) &&
      previousStatusMap.get(app.id) !== app.status &&
      app.status === 'confirmado'
    );

    if (newAppointment || changedAppointment) {
      const targetId = newAppointment?.id || changedAppointment?.id;
      setJustUpdated(targetId!);
      setTimeout(() => setJustUpdated(null), 3000);
    }

    sessionStorage.setItem('my-appointments-data', JSON.stringify({
      ids: currentIds,
      statusMap: Object.fromEntries(currentStatusMap)
    }));
  }, [myAppointments]);

  const handleCancel = async (id: string) => {
    const appointment = myAppointments.find(a => a.id === id);

    if (!isAdmin && appointment?.status === 'confirmado') {
      alert("⚠️ Agendamentos confirmados não podem ser cancelados pelo app. Entre em contato com a barbearia.");
      return;
    }

    const isCanceled = appointment?.status === 'cancelado';
    const confirmMessage = isCanceled
      ? "🗑️ Deseja realmente EXCLUIR permanentemente este agendamento cancelado?"
      : "⚠️ Deseja realmente CANCELAR este agendamento?";

    if (window.confirm(confirmMessage)) {
      try {
        let result;

        if (isAdmin && isCanceled) {
          result = await deleteAppointment(id);
        } else {
          result = await updateStatus(id, { status: 'cancelado' });

          if (result.success && appointment && barbershopPhone) {
            sendCancellationNotification(appointment, barbershopPhone)
              .then(notifResult => {
                if (!notifResult.success) {
                  console.warn('⚠️ Notificação não enviada (em background):', notifResult.error);
                }
              })
              .catch(err => {
                console.warn('⚠️ Erro em background na notificação:', err);
              });
          }
        }

        if (result.success) {
          alert(isCanceled
            ? "✅ Agendamento excluído com sucesso!"
            : "✅ Agendamento cancelado com sucesso!"
          );
          
          if (barbershopId) {
            await fetchAppointments(barbershopId);
          }
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('ERRO ao cancelar:', err);
        alert("❌ Erro ao processar o agendamento.");
      }
    }
  };

  const clearFilters = () => {
    setFilterStatus('todos');
    setSortType('data-asc');
    setSearchTerm('');
    setDateFilter('todos');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters = filterStatus !== 'todos' ||
    sortType !== 'data-asc' ||
    searchTerm !== '' ||
    dateFilter !== 'todos' ||
    customStartDate !== '' ||
    customEndDate !== '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-amber-500 bg-gradient-to-br from-[#08080a] via-zinc-950 to-[#08080a]">
        <div className="relative">
          <Loader2 className="animate-spin" size={48} />
          <div className="absolute inset-0 blur-xl bg-amber-500/20 animate-pulse" />
        </div>
        <p className="font-black uppercase italic tracking-widest text-xs animate-pulse">
          Sincronizando Agenda...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 min-h-screen bg-gradient-to-br from-[#08080a] via-zinc-950 to-[#08080a]">

      {/* Header Compacto */}
      <div className="flex items-center gap-3 mb-6 animate-fadeInDown">
        <button
          onClick={onBack}
          className="p-2.5 bg-zinc-900 border border-zinc-800 text-amber-500 rounded-xl hover:bg-zinc-800 hover:border-amber-500/50 transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
            {isAdmin ? "Agenda Geral" : "Meus Agendamentos"}
          </h2>
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-0.5">
            {myAppointments.length} de {stats.total} agendamento(s)
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${showFilters
            ? 'bg-amber-500 text-black border border-amber-400'
            : 'bg-zinc-900 border border-zinc-800 text-amber-500'
            }`}
        >
          <Filter size={18} />
          {hasActiveFilters && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          )}
        </button>
      </div>

      {/* Cards de Estatísticas Compactos */}
      <div className="grid grid-cols-5 gap-1.5 mb-5 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => setFilterStatus('todos')}
          className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${filterStatus === 'todos'
            ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
            : 'bg-zinc-900/50 border-zinc-800'
            }`}
        >
          <p className="text-lg font-black text-white">{stats.total}</p>
          <p className="text-[6px] font-black text-zinc-400 uppercase tracking-wider">Total</p>
        </button>

        <button
          onClick={() => setFilterStatus('pendente')}
          className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${filterStatus === 'pendente'
            ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
            : 'bg-zinc-900/50 border-zinc-800'
            }`}
        >
          <p className="text-lg font-black text-amber-500">{stats.pendente}</p>
          <p className="text-[6px] font-black text-zinc-400 uppercase tracking-wider">Pendente</p>
        </button>

        <button
          onClick={() => setFilterStatus('confirmado')}
          className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${filterStatus === 'confirmado'
            ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
            : 'bg-zinc-900/50 border-zinc-800'
            }`}
        >
          <p className="text-lg font-black text-emerald-500">{stats.confirmado}</p>
          <p className="text-[6px] font-black text-zinc-400 uppercase tracking-wider">Confirmado</p>
        </button>

        <button
          onClick={() => setFilterStatus('finalizado')}
          className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${filterStatus === 'finalizado'
            ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
            : 'bg-zinc-900/50 border-zinc-800'
            }`}
        >
          <p className="text-lg font-black text-blue-500">{stats.finalizado}</p>
          <p className="text-[6px] font-black text-zinc-400 uppercase tracking-wider">Finalizado</p>
        </button>

        {/* Card de Cancelados (visível para admin OU quando há cancelados filtrados) */}
        {(isAdmin || stats.cancelado > 0) && (
          <button
            onClick={() => setFilterStatus('cancelado')}
            className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${filterStatus === 'cancelado'
              ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20'
              : 'bg-zinc-900/50 border-zinc-800'
              }`}
          >
            <p className="text-lg font-black text-red-500">{stats.cancelado}</p>
            <p className="text-[6px] font-black text-zinc-400 uppercase tracking-wider">Cancelado</p>
          </button>
        )}
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="mb-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4 animate-slideInFromTop">

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por serviço, barbeiro ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-all font-bold text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro de Data */}
          <div>
            <label className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">
              <CalendarDays size={12} />
              Filtrar por Período
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { key: 'hoje', label: 'Hoje' },
                { key: 'semana', label: '7 Dias' },
                { key: 'mes', label: '30 Dias' },
                { key: 'proximos', label: 'Próximos' },
                { key: 'passados', label: 'Passados' },
                { key: 'todos', label: 'Todos' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setDateFilter(key as DateFilterType);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase transition-all ${dateFilter === key
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filtro Personalizado */}
            <button
              onClick={() => setDateFilter('personalizado')}
              className={`w-full py-2.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all mb-2 ${dateFilter === 'personalizado'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
            >
              📅 Período Personalizado
            </button>

            {dateFilter === 'personalizado' && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 animate-fadeIn">
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider mb-1.5">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider mb-1.5">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ordenação */}
          <div>
            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">
              Ordenar Por
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'data-asc', label: '+ Recente' },
                { key: 'data-desc', label: '+ Antigo' },
                { key: 'status', label: 'Status' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortType(key as SortType)}
                  className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${sortType === key
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Limpar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full py-2.5 bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-400 border border-red-500/20 rounded-lg font-black text-[10px] uppercase tracking-wider hover:from-red-500 hover:to-orange-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
            >
              🗑️ Limpar Todos os Filtros
            </button>
          )}
        </div>
      )}

      {/* Banner Realtime Compacto */}
      <div className="mb-5 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2.5 backdrop-blur-sm animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="relative">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">
          🔔 Sincronização Ativa - Atualizações em Tempo Real
        </span>
      </div>

      {/* Lista de Agendamentos */}
      {myAppointments.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative inline-block mb-4">
            <Calendar className="text-zinc-800" size={60} />
            <AlertCircle className="absolute -top-2 -right-2 text-amber-500" size={24} />
          </div>
          <p className="text-zinc-400 font-bold uppercase italic text-sm mb-2">
            {hasActiveFilters
              ? 'Nenhum resultado encontrado'
              : 'Nenhum compromisso agendado'}
          </p>
          <p className="text-zinc-700 text-[9px] uppercase font-bold tracking-wider px-8">
            {hasActiveFilters
              ? 'Tente ajustar os filtros de busca'
              : `Telefone cadastrado: ${customerPhone || 'Não informado'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myAppointments.map((app, index) => (
            <div
              key={`${app.id}-${index}`}
              className={`group backdrop-blur-xl border rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl animate-slideInUp ${app.status === 'cancelado'
                ? 'bg-red-950/30 border-red-500/50 shadow-lg shadow-red-500/10'
                : justUpdated === app.id
                  ? 'bg-zinc-900/60 border-emerald-500 shadow-lg shadow-emerald-500/20 animate-pulse'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/30'
                }`}
              style={{
                animationDelay: `${index * 50 + 300}ms`,
                animationFillMode: 'both'
              }}
            >

              {/* Barra lateral colorida por status */}
              <div className={`absolute top-0 left-0 w-1 h-full transition-all ${app.status === 'cancelado'
                ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : app.status === 'confirmado'
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : app.status === 'finalizado'
                    ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                    : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                }`} />

              {/* Header do Card */}
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-2 flex-1">
                  <span className={`inline-block text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border shadow-md ${app.status === 'cancelado'
                    ? 'bg-red-500/25 text-red-300 border-red-500/40'
                    : app.status === 'confirmado'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : app.status === 'finalizado'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                    {app.status}
                  </span>
                  <h4 className={`text-xl font-black uppercase italic tracking-tight leading-none transition-colors ${app.status === 'cancelado'
                    ? 'text-red-400 line-through opacity-70'
                    : 'text-white group-hover:text-amber-500'
                    }`}>
                    {app.service}
                  </h4>
                </div>

                {/* ✅ BOTÃO DE AÇÃO CORRIGIDO - SEMPRE ATIVO PARA ADMIN */}
                {(isAdmin || (!['confirmado', 'finalizado'].includes(app.status))) ? (
                  <button
                    onClick={() => handleCancel(app.id)}
                    className={`group/btn relative p-2.5 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 border ${app.status === 'cancelado'
                      ? 'bg-gradient-to-br from-orange-500/15 to-red-600/15 text-orange-400 hover:from-orange-500 hover:to-red-600 hover:text-white border-orange-500/30 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/30'
                      : 'bg-gradient-to-br from-red-500/15 to-orange-500/15 text-red-400 hover:from-red-500 hover:to-orange-500 hover:text-white border-red-500/30 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/30'
                      }`}
                    title={app.status === 'cancelado' ? 'Excluir Agendamento (Permanente)' : 'Cancelar Agendamento'}
                  >
                    <Trash2 size={18} className="relative z-10" />
                    <div className={`absolute inset-0 rounded-xl blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity ${app.status === 'cancelado' ? 'bg-orange-500/20' : 'bg-red-500/20'
                      }`} />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-md">
                    <CheckCircle2 size={18} />
                    <span className="text-[7px] font-black uppercase tracking-wider">OK</span>
                  </div>
                )}
              </div>

              {/* Informações do Agendamento - LAYOUT COMPACTO */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800/40">
                {/* Data */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${app.status === 'cancelado'
                  ? 'bg-red-950/20 border-red-900/30'
                  : 'bg-zinc-950/40 border-zinc-800/30'
                  }`}>
                  <div className={`p-1.5 rounded-md ${app.status === 'cancelado' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                    <Calendar size={14} className={app.status === 'cancelado' ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-wider">Data</p>
                    <p className={`text-[11px] font-black uppercase truncate ${app.status === 'cancelado' ? 'text-red-400 line-through' : 'text-white'
                      }`}>
                      {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </p>
                  </div>
                </div>

                {/* Horário */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${app.status === 'cancelado'
                  ? 'bg-red-950/20 border-red-900/30'
                  : 'bg-zinc-950/40 border-zinc-800/30'
                  }`}>
                  <div className={`p-1.5 rounded-md ${app.status === 'cancelado' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                    <Clock size={14} className={app.status === 'cancelado' ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-wider">Horário</p>
                    <p className={`text-[11px] font-black uppercase truncate ${app.status === 'cancelado' ? 'text-red-400 line-through' : 'text-white'
                      }`}>{app.time}</p>
                  </div>
                </div>

                {/* Barbeiro */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${app.status === 'cancelado'
                  ? 'bg-red-950/20 border-red-900/30'
                  : 'bg-zinc-950/40 border-zinc-800/30'
                  }`}>
                  <div className={`p-1.5 rounded-md ${app.status === 'cancelado' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                    <User size={14} className={app.status === 'cancelado' ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-wider">Barbeiro</p>
                    <p className={`text-[11px] font-black uppercase truncate ${app.status === 'cancelado' ? 'text-red-400' : 'text-white'
                      }`}>{app.barber}</p>
                  </div>
                </div>

                {/* Local */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${app.status === 'cancelado'
                  ? 'bg-red-950/20 border-red-900/30'
                  : 'bg-zinc-950/40 border-zinc-800/30'
                  }`}>
                  <div className={`p-1.5 rounded-md ${app.status === 'cancelado' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                    <MapPin size={14} className={app.status === 'cancelado' ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-wider">Local</p>
                    <p className={`text-[11px] font-black uppercase truncate ${app.status === 'cancelado' ? 'text-red-400' : 'text-white'
                      }`}>Centro</p>
                  </div>
                </div>
              </div>

              {/* Info adicional para admin */}
              {isAdmin && app.customerName && (
                <div className={`pt-3 border-t ${app.status === 'cancelado' ? 'border-red-900/30' : 'border-zinc-800/30'
                  }`}>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <User size={12} />
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      Cliente: {app.customerName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Indicador de mais resultados */}
      {myAppointments.length > 0 && stats.total > myAppointments.length && (
        <div className="mt-5 text-center py-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50 animate-fadeIn" style={{ animationDelay: `${myAppointments.length * 50 + 500}ms`, animationFillMode: 'both' }}>
          <TrendingUp className="mx-auto mb-1.5 text-amber-500" size={20} />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
            Mostrando {myAppointments.length} de {stats.total} agendamentos
          </p>
        </div>
      )}

      {/* CSS para animações premium */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.5s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out;
        }

        .animate-slideInFromTop {
          animation: slideInFromTop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MyAppointments;