import React, { useState, useMemo } from 'react';
import {
  History, Trash2, Banknote, QrCode, Search, Clock, XCircle,
  CreditCard as CardIcon, HelpCircle, Filter, User, TrendingUp
} from 'lucide-react';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalesHistoryProps {
  appointments: any[];
  onDelete: (id: string) => Promise<void>;
}

type PaymentFilter = 'todos' | 'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote';
type DateFilter = 'hoje' | 'ontem' | '7dias' | '30dias' | 'tudo';

const SalesHistoryModule: React.FC<SalesHistoryProps> = ({ appointments, onDelete }) => {
  const [barberFilter, setBarberFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');

  const filteredSales = useMemo(() => {
    return appointments
      .filter(app => app.status === 'confirmado')
      .filter(app => {
        const name = (app.customer_name || app.customerName || 'Venda Direta').toLowerCase();
        const matchName = name.includes(searchTerm.toLowerCase());
        const method = (app.payment_method || app.paymentMethod || '').toLowerCase();
        const matchPayment = paymentFilter === 'todos' || method === paymentFilter;
        const matchBarber = barberFilter === 'todos' || app.barber === barberFilter;

        const appDate = startOfDay(new Date(app.date + 'T00:00:00'));
        const hoje = startOfDay(new Date());
        let matchDate = true;

        if (dateFilter === 'hoje') matchDate = appDate.getTime() === hoje.getTime();
        else if (dateFilter === 'ontem') matchDate = appDate.getTime() === startOfDay(subDays(hoje, 1)).getTime();
        else if (dateFilter === '7dias') matchDate = appDate >= startOfDay(subDays(hoje, 7));
        else if (dateFilter === '30dias') matchDate = appDate >= startOfDay(subDays(hoje, 30));

        return matchName && matchPayment && matchDate && matchBarber;
      })
      .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
  }, [appointments, searchTerm, paymentFilter, dateFilter, barberFilter]);

  const barbersList = useMemo(() => {
    const names = appointments.map(app => app.barber).filter(Boolean);
    return ['todos', ...Array.from(new Set(names))];
  }, [appointments]);

  const totalFiltrado = filteredSales.reduce((acc, curr) => acc + Number(curr.price), 0);

  const getPaymentDetails = (methodRaw: string) => {
    const method = methodRaw?.toLowerCase() || '';
    switch (method) {
      case 'pix': return { icon: <QrCode size={14} />, label: 'PIX', color: 'text-teal-400', bg: 'bg-teal-500/10' };
      case 'dinheiro': return { icon: <Banknote size={14} />, label: 'Dinheiro', color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'pacote': return { icon: <History size={14} />, label: 'Combo', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'debito': return { icon: <CardIcon size={14} />, label: 'Débito', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'credito': return { icon: <CardIcon size={14} />, label: 'Crédito', color: 'text-orange-400', bg: 'bg-orange-500/10' };
      default: return { icon: <HelpCircle size={14} />, label: methodRaw || 'Outro', color: 'text-slate-500', bg: 'bg-white/5' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* SEÇÃO DE FILTROS E RESUMO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA DE BUSCA E DATA */}
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-amber-500 border-b border-white/5 pb-4">
            <Filter size={18} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Painel de Controle</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Busca Nome */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black px-1">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-amber-500/40 transition-all outline-none"
                />
              </div>
            </div>

            {/* Seletor de Período */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black px-1">Período</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 h-[46px]">
                {(['hoje', 'ontem', '7dias', '30dias', 'tudo'] as DateFilter[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDateFilter(d)}
                    className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${dateFilter === d ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    {d.replace('dias', 'D')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtros de Botão (Profissional e Pagamento) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
             <div className="space-y-3">
                <span className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black"><User size={12}/> Profissional</span>
                <div className="flex flex-wrap gap-2">
                  {barbersList.map(b => (
                    <button key={b} onClick={() => setBarberFilter(b)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${barberFilter === b ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500'}`}>
                      {b}
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-3">
                <span className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black"><CardIcon size={12}/> Pagamento</span>
                <div className="flex flex-wrap gap-2">
                  {(['todos', 'pix', 'dinheiro', 'debito', 'credito'] as PaymentFilter[]).map(p => (
                    <button key={p} onClick={() => setPaymentFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${paymentFilter === p ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* CARD DE FATURAMENTO TOTAL */}
        <div className="bg-amber-500 rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl shadow-amber-500/10 relative overflow-hidden">
          <TrendingUp className="absolute -right-6 -bottom-6 w-40 h-40 text-black/10" />
          <div className="relative z-10">
            <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-1">Resultado Filtrado</p>
            <h3 className="text-5xl font-black italic text-black tracking-tighter">
              <span className="text-2xl mr-1">R$</span>
              {totalFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="relative z-10 bg-black/10 rounded-2xl p-4 mt-4">
            <div className="flex justify-between items-center text-black/80 font-black uppercase text-[10px]">
              <span>Lançamentos</span>
              <span>{filteredSales.length} atendimentos</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA - Agora com visual mais leve */}
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5 text-left">Horário</th>
                <th className="px-8 py-5 text-left">Cliente</th>
                <th className="px-8 py-5 text-left">Serviço</th>
                <th className="px-8 py-5 text-left">Barbeiro</th>
                <th className="px-8 py-5 text-center">Pagamento</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <XCircle className="mx-auto text-white/5 mb-4" size={40} />
                    <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Nenhum registro encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const payment = getPaymentDetails(sale.payment_method || sale.paymentMethod);
                  return (
                    <tr key={sale.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex flex-col">
                          <span className="text-white text-[11px] font-black uppercase italic">
                            {format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}
                          </span>
                          <span className="text-amber-500 text-[10px] font-black">{sale.time}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-xs font-black text-white uppercase italic">{sale.customer_name || 'Venda Direta'}</td>
                      <td className="px-8 py-4 text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{sale.service}</td>
                      <td className="px-8 py-4 text-[10px] text-slate-400 font-bold uppercase">{sale.barber}</td>
                      <td className="px-8 py-4">
                        <div className={`mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-lg border border-white/5 ${payment.bg} ${payment.color}`}>
                          {payment.icon}
                          <span className="text-[9px] font-black uppercase tracking-tighter">{payment.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="text-white font-black text-sm italic">R$ {Number(sale.price).toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button onClick={() => onDelete(sale.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModule;