import React, { useState, useMemo } from 'react';
import {
  History, Trash2, Banknote, QrCode, Search, XCircle,
  CreditCard as CardIcon, HelpCircle, Filter, User, TrendingUp, Hash, Package, Scissors, Coins
} from 'lucide-react';
import { format, startOfDay, subDays } from 'date-fns';

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
    const baseFilter = appointments.filter(app => app.status === 'confirmado');

    const grouped = baseFilter.reduce((acc: any[], current) => {
      const rawId = current.venda_id || current.vendaId || current.id_venda || current.order_id;
      const fallbackKey = `${current.customer_name}-${current.date}-${current.time}`;
      const groupKey = rawId ? String(rawId).trim() : fallbackKey;
      
      const existingIndex = acc.findIndex(item => {
        const itemRawId = item.venda_id || item.vendaId || item.id_venda || item.order_id;
        const itemFallbackKey = `${item.customer_name}-${item.date}-${item.time}`;
        const itemKey = itemRawId ? String(itemRawId).trim() : itemFallbackKey;
        return itemKey === groupKey;
      });

      if (existingIndex !== -1) {
        const group = acc[existingIndex];
        group.price = Number(group.price) + Number(current.price);
        if (!group.serviceList) group.serviceList = [];
        group.serviceList.push({ name: current.service, price: Number(current.price) });
        if (!group.allIds.includes(current.id)) group.allIds.push(current.id);
      } else {
        acc.push({
          ...current,
          displayId: rawId || null, 
          price: Number(current.price),
          serviceList: [{ name: current.service, price: Number(current.price) }],
          allIds: [current.id]
        });
      }
      return acc;
    }, []);

    return grouped.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
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
      default: return { icon: <HelpCircle size={14} />, label: methodRaw || 'Misto', color: 'text-slate-500', bg: 'bg-white/5' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* FILTROS E RESUMO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 text-amber-500 border-b border-white/5 pb-4">
            <Filter size={18} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Painel de Vendas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black px-1">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-amber-500/40 outline-none italic transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black px-1">Período</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 h-[46px]">
                {(['hoje', 'ontem', '7dias', '30dias', 'tudo'] as DateFilter[]).map((d) => (
                  <button key={d} onClick={() => setDateFilter(d)} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${dateFilter === d ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}>{d.replace('dias', 'D')}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
             <div className="space-y-3">
                <span className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black"><User size={12}/> Profissional</span>
                <div className="flex flex-wrap gap-2">
                  {barbersList.map(b => (
                    <button key={b} onClick={() => setBarberFilter(b)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${barberFilter === b ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500 hover:text-white'}`}>{b}</button>
                  ))}
                </div>
             </div>
             <div className="space-y-3">
                <span className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black"><CardIcon size={12}/> Pagamento</span>
                <div className="flex flex-wrap gap-2">
                  {(['todos', 'pix', 'dinheiro', 'debito', 'credito'] as PaymentFilter[]).map(p => (
                    <button key={p} onClick={() => setPaymentFilter(p)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${paymentFilter === p ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500 hover:text-white'}`}>{p}</button>
                  ))}
                </div>
             </div>
          </div>
        </div>

        <div className="bg-amber-500 rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <TrendingUp className="absolute -right-6 -bottom-6 w-40 h-40 text-black/10" />
          <div className="relative z-10">
            <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-1">Total no Período</p>
            <h3 className="text-5xl font-black italic text-black tracking-tighter tabular-nums">
              <span className="text-2xl mr-1">R$</span>
              {totalFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="relative z-10 bg-black/10 rounded-2xl p-4 mt-4">
            <div className="flex justify-between items-center text-black/80 font-black uppercase text-[10px]">
              <span>Atendimentos Reais</span>
              <span>{filteredSales.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA AGRUPADA */}
     <div className="bg-[#0a0b0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5 text-left">Horário</th>
                <th className="px-8 py-5 text-left">ID Comanda</th>
                <th className="px-8 py-5 text-left">Cliente</th>
                <th className="px-8 py-5 text-left">Composição</th>
                <th className="px-8 py-5 text-left">Barbeiro</th>
                <th className="px-8 py-5 text-center">Pagamento</th>
                <th className="px-8 py-5 text-right">Total</th>
                <th className="px-8 py-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredSales.map((sale) => {
                const payment = getPaymentDetails(sale.payment_method || sale.paymentMethod);
                const visualId = sale.displayId 
                  ? (String(sale.displayId).length > 8 ? String(sale.displayId).slice(-6) : sale.displayId)
                  : 'AVULSO';

                return (
                  <tr key={sale.allIds[0]} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-[11px] font-black uppercase italic">
                          {format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}
                        </span>
                        <span className="text-amber-500 text-[10px] font-black mt-1">{sale.time}</span>
                      </div>
                    </td>

                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5 w-fit bg-white/5 px-2 py-1 rounded border border-white/5 group-hover:border-amber-500/30 transition-all">
                        <Hash size={10} className="text-slate-500" />
                        <span className="text-white text-[10px] font-black tracking-wider uppercase">
                           {visualId}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-4 text-xs font-black text-white uppercase italic">
                      {sale.customer_name || 'Venda Direta'}
                    </td>
                    
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1.5">
                         {sale.serviceList.map((item: any, idx: number) => (
                           <div key={idx} className="flex items-center gap-2 text-[9px] uppercase font-bold text-slate-400">
                              {item.name.toLowerCase().includes('pomada') ? <Package size={10} className="text-blue-400"/> : <Scissors size={10} className="text-amber-500"/>}
                              {item.name} <span className="text-white/20 ml-auto tabular-nums">R$ {item.price.toFixed(2)}</span>
                           </div>
                         ))}
                      </div>
                    </td>

                    <td className="px-8 py-4 text-[10px] text-slate-400 font-bold uppercase italic">{sale.barber}</td>
                    
                    <td className="px-8 py-4 text-center">
                      <div className={`mx-auto w-fit flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 ${payment.bg} ${payment.color}`}>
                        {payment.icon}
                        <span className="text-[9px] font-black uppercase tracking-tighter">{payment.label}</span>
                      </div>
                    </td>

                    <td className="px-8 py-4 text-right">
                      <span className="text-white font-black text-sm italic tabular-nums">R$ {sale.price.toFixed(2)}</span>
                    </td>

                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => {
                          if (window.confirm(`Deseja estornar toda a comanda #${visualId}?`)) {
                              sale.allIds.forEach((id: string) => onDelete(id));
                          }
                        }} 
                        className="p-2.5 rounded-xl bg-red-500/5 text-red-500/20 hover:bg-red-500/20 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModule;