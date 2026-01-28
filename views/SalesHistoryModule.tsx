import React, { useState, useMemo } from 'react';
import { 
  History, Trash2, Banknote, QrCode, CreditCard, 
  Package, Clock, Search, CheckCircle2, XCircle, 
  CreditCard as CardIcon, HelpCircle, Calendar, Filter
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalesHistoryProps {
  appointments: any[];
  onDelete: (id: string) => Promise<void>;
}

type PaymentFilter = 'todos' | 'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote';
type DateFilter = 'hoje' | 'ontem' | '7dias' | '30dias' | 'tudo';

const SalesHistoryModule: React.FC<SalesHistoryProps> = ({ appointments, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');

  // LÓGICA DE FILTRAGEM REFINADA
  const filteredSales = useMemo(() => {
    return appointments
      .filter(app => app.status === 'confirmado')
      .filter(app => {
        // 1. Filtro de Nome
        const name = (app.customer_name || app.customerName || 'Venda Direta').toLowerCase();
        const matchName = name.includes(searchTerm.toLowerCase());
        
        // 2. Filtro de Pagamento
        const method = (app.payment_method || app.paymentMethod || '').toLowerCase();
        const matchPayment = paymentFilter === 'todos' || method === paymentFilter;

        // 3. Filtro de Data
        const appDate = startOfDay(new Date(app.date + 'T00:00:00'));
        const hoje = startOfDay(new Date());
        let matchDate = true;

        if (dateFilter === 'hoje') matchDate = appDate.getTime() === hoje.getTime();
        else if (dateFilter === 'ontem') matchDate = appDate.getTime() === startOfDay(subDays(hoje, 1)).getTime();
        else if (dateFilter === '7dias') matchDate = appDate >= startOfDay(subDays(hoje, 7));
        else if (dateFilter === '30dias') matchDate = appDate >= startOfDay(subDays(hoje, 30));
        
        return matchName && matchPayment && matchDate;
      })
      .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
  }, [appointments, searchTerm, paymentFilter, dateFilter]);

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
    <div className="space-y-8 animate-in fade-in duration-500 font-bold italic">
      
      {/* TOOLBAR DE FILTROS */}
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          
          <div className="space-y-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Filtros de Busca</span>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {/* Busca por Nome */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full xl:w-[300px] bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-amber-500/30 transition-all"
                />
              </div>

              {/* Seletor de Data */}
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                {(['hoje', 'ontem', '7dias', '30dias', 'tudo'] as DateFilter[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDateFilter(d)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dateFilter === d ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    {d === '7dias' ? '7 Dias' : d === '30dias' ? '30 Dias' : d}
                  </button>
                ))}
              </div>
            </div>

           {/* Filtro de Pagamento Corrigido */}
<div className="flex flex-wrap gap-2">
  {(['todos', 'dinheiro', 'pix', 'debito', 'credito', 'pacote'] as PaymentFilter[]).map((method) => (
    <button
      key={method}
      onClick={() => setPaymentFilter(method)} // AQUI: Estava setPaymentMethod, mudei para setPaymentFilter
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
        paymentFilter === method 
          ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10' 
          : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
      }`}
    >
      {method}
    </button>
  ))}
</div>
          </div>

          {/* Card de Total */}
          <div className="bg-amber-500 text-black p-8 rounded-[2rem] min-w-[260px] flex flex-col justify-center shadow-[0_20px_50px_rgba(245,158,11,0.15)] relative overflow-hidden group">
            <TrendingUpIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Faturamento no Período</p>
            <h3 className="text-4xl font-black italic tabular-nums leading-none">R$ {totalFiltrado.toFixed(2)}</h3>
          </div>

        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="bg-[#0a0b0e]/50 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Data/Hora</th>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Serviço/Produto</th>
                <th className="px-8 py-6">Profissional</th>
                <th className="px-8 py-6 text-center">Pagamento</th>
                <th className="px-8 py-6">Valor</th>
                <th className="px-8 py-6 text-right px-10">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <XCircle size={48} />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhum lançamento neste período</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const payment = getPaymentDetails(sale.payment_method || sale.paymentMethod);
                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-all group font-bold italic">
                      <td className="px-8 py-5">
                        <div className="flex flex-col leading-tight">
                          <span className="text-white font-black text-xs uppercase italic">
                            {format(new Date(sale.date + 'T00:00:00'), 'dd MMM', { locale: ptBR })}
                          </span>
                          <span className="text-[9px] text-amber-500 font-black uppercase">{sale.time}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-white font-black text-xs uppercase tracking-wider">
                          {sale.customer_name || sale.customerName || "Venda Direta"}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Clock size={12}/></div>
                          <span className="text-xs text-slate-300 uppercase truncate max-w-[150px]">{sale.service}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] text-slate-400 uppercase">{sale.barber}</td>
                      <td className="px-8 py-5 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 ${payment.bg}`}>
                          <span className={payment.color}>{payment.icon}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${payment.color}`}>{payment.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-white text-lg tabular-nums font-black">R$ {Number(sale.price).toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-5 text-right px-10">
                        <button 
                          onClick={() => onDelete(sale.id)}
                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
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

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default SalesHistoryModule;