import React, { useState, useMemo } from 'react';
import {
  History, Trash2, Banknote, QrCode, Search, Hash, 
  CreditCard as CardIcon, Filter, User, TrendingUp, Package, Scissors, Clock, Calendar, XCircle
} from 'lucide-react';
import { format, startOfDay, subDays, isSameDay, isAfter } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

interface SalesHistoryProps {
  appointments: any[];
  onDelete: (id: string) => Promise<void>;
}

type PaymentFilter = 'todos' | 'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote';
type DateFilter = 'hoje' | 'ontem' | '7dias' | '30dias' | 'personalizado' | 'tudo';

const SalesHistoryModule: React.FC<SalesHistoryProps> = ({ appointments, onDelete }) => {
  const [barberFilter, setBarberFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');
  
  // Estado para o filtro de data personalizado (Passado)
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const filteredSales = useMemo(() => {
    const today = startOfDay(new Date());

    const baseFilter = appointments.filter(app => {
      const appDate = startOfDay(new Date(app.date + 'T00:00:00'));
      
      // --- LÓGICA DE FILTRO DE DATA ---
      let matchesDate = true;
      if (dateFilter === 'hoje') {
        matchesDate = isSameDay(appDate, today);
      } else if (dateFilter === 'ontem') {
        matchesDate = isSameDay(appDate, subDays(today, 1));
      } else if (dateFilter === '7dias') {
        matchesDate = isAfter(appDate, subDays(today, 7));
      } else if (dateFilter === '30dias') {
        matchesDate = isAfter(appDate, subDays(today, 30));
      } else if (dateFilter === 'personalizado') {
        if (startDate && endDate) {
          matchesDate = appDate >= startOfDay(startDate) && appDate <= startOfDay(endDate);
        }
      }

      const matchesStatus = app.status === 'confirmado';
      const matchesSearch = app.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           app.service?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBarber = barberFilter === 'todos' || app.barber === barberFilter;
      const matchesPayment = paymentFilter === 'todos' || (app.payment_method || app.paymentMethod)?.toLowerCase() === paymentFilter;
      
      return matchesStatus && matchesDate && matchesSearch && matchesBarber && matchesPayment;
    });

    const grouped = baseFilter.reduce((acc: any[], current) => {
      const rawId = current.venda_id || current.vendaId || current.id_venda || current.order_id;
      const groupKey = rawId ? String(rawId).trim() : `unique-${current.id}`;
      
      const existingIndex = acc.findIndex(item => {
        const itemRawId = item.venda_id || item.vendaId || item.id_venda || item.order_id;
        return itemRawId && String(itemRawId).trim() === groupKey;
      });

      if (existingIndex !== -1 && rawId) {
        const group = acc[existingIndex];
        group.price = Number(group.price) + Number(current.price);
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
  }, [appointments, searchTerm, paymentFilter, dateFilter, barberFilter, startDate, endDate]);

  const barbersList = useMemo(() => {
    const names = appointments.map(app => app.barber).filter(Boolean);
    return ['todos', ...Array.from(new Set(names))];
  }, [appointments]);

  const totalFiltrado = filteredSales.reduce((acc, curr) => acc + Number(curr.price), 0);

 const getPaymentDetails = (methodRaw: string) => {
    const method = methodRaw?.toLowerCase() || '';
      if (method.includes('pix')) {
        return { icon: <QrCode size={14} />, label: methodRaw, color: 'text-teal-400', bg: 'bg-teal-500/10' };
      }
      if (method.includes('dinheiro')) {
        return { icon: <Banknote size={14} />, label: methodRaw, color: 'text-green-400', bg: 'bg-green-500/10' };
      }
      if (method.includes('pacote') || method.includes('combo')) {
        return { icon: <History size={14} />, label: methodRaw, color: 'text-purple-400', bg: 'bg-purple-500/10' };
      }
      if (method.includes('debito')) {
        return { icon: <CardIcon size={14} />, label: methodRaw, color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      if (method.includes('credito')) {
        return { icon: <CardIcon size={14} />, label: methodRaw, color: 'text-orange-400', bg: 'bg-orange-500/10' };
      }
      return { icon: <CardIcon size={14} />, label: methodRaw || 'Outro', color: 'text-slate-500', bg: 'bg-white/5' };
    };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 md:pb-0">
      
      {/* FILTROS RESPONSIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl md:rounded-[2rem] p-4 md:p-6 space-y-4 shadow-xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Busca */}
             <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input
                type="text"
                placeholder="Cliente ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-xs font-bold focus:border-amber-500/40 outline-none transition-all italic"
              />
            </div>

            {/* Atalhos de Data */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
              {(['hoje', 'ontem', '7dias', '30dias', 'personalizado', 'tudo'] as DateFilter[]).map((d) => (
                <button 
                  key={d} 
                  onClick={() => setDateFilter(d)} 
                  className={`flex-1 min-w-[50px] py-2 rounded-lg text-[8px] font-black uppercase transition-all ${dateFilter === d ? 'bg-amber-500 text-black' : 'text-slate-500'}`}
                >
                  {d === '7dias' ? '7D' : d === '30dias' ? '30D' : d === 'personalizado' ? '📅' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Data Personalizado (Apenas se 'personalizado' estiver ativo) */}
          {dateFilter === 'personalizado' && (
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl animate-in slide-in-from-top-2 duration-300">
               <div className="flex-1 space-y-1">
                 <span className="text-[8px] font-black uppercase text-amber-500/60 ml-1 italic">De</span>
                 <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-[10px] font-bold outline-none"
                 />
               </div>
               <div className="flex-1 space-y-1">
                 <span className="text-[8px] font-black uppercase text-amber-500/60 ml-1 italic">Até</span>
                 <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-[10px] font-bold outline-none"
                 />
               </div>
            </div>
          )}

          {/* Outros Filtros (Barbeiro/Pagamento) */}
          <div className="space-y-3 pt-2">
            <div className="overflow-x-auto no-scrollbar flex gap-2">
              {barbersList.map(b => (
                <button key={b} onClick={() => setBarberFilter(b)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${barberFilter === b ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500'}`}>{b}</button>
              ))}
            </div>
            <div className="overflow-x-auto no-scrollbar flex gap-2">
              {(['todos', 'pix', 'dinheiro', 'debito', 'credito'] as PaymentFilter[]).map(p => (
                <button key={p} onClick={() => setPaymentFilter(p)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${paymentFilter === p ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CARD DE TOTAL */}
        <div className="bg-amber-500 rounded-2xl md:rounded-[2rem] p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[150px]">
          <TrendingUp className="absolute -right-6 -bottom-6 w-32 h-32 text-black/10" />
          <div className="relative z-10">
            <p className="text-black/60 text-[8px] font-black uppercase tracking-widest mb-1">Total Filtrado</p>
            <h3 className="text-4xl md:text-5xl font-black italic text-black tracking-tighter tabular-nums leading-none">
              <span className="text-lg mr-1 font-bold italic">R$</span>
              {totalFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="relative z-10 flex justify-between items-center bg-black/10 rounded-xl p-3 mt-4">
            <span className="text-black/80 font-black uppercase text-[8px] italic">Registros</span>
            <span className="text-black font-black text-sm tabular-nums">{filteredSales.length}</span>
          </div>
        </div>
      </div>

      {/* LISTAGEM (Desktop Tabela / Mobile Cards) */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-black/20">
                <th className="px-8 py-5 text-left font-black">Data/Hora</th>
                <th className="px-8 py-5 text-left font-black">ID</th>
                <th className="px-8 py-5 text-left font-black">Cliente</th>
                <th className="px-8 py-5 text-left font-black">Composição</th>
                <th className="px-8 py-5 text-center font-black">Pagamento</th>
                <th className="px-8 py-5 text-right font-black">Total</th>
                <th className="px-8 py-5 text-right font-black"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredSales.map((sale) => {
                const payment = getPaymentDetails(sale.payment_method || sale.paymentMethod);
                const visualId = sale.displayId ? String(sale.displayId).slice(-6).toUpperCase() : 'AVULSO';
                return (
                  <tr key={sale.allIds[0]} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-4">
                      <div className="text-white text-[11px] font-black uppercase italic">{format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}</div>
                      <div className="text-amber-500 text-[10px] font-black">{sale.time}</div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="bg-white/5 px-2 py-1 rounded text-[12px] font-black text-slate-400 border border-white/5">#{visualId}</span>
                    </td>
                    <td className="px-8 py-4 text-xs font-black text-white uppercase italic leading-none">{sale.customer_name || 'Venda Direta'}</td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1">
                         {sale.serviceList.map((item: any, idx: number) => (
                           <div key={idx} className="flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase leading-none italic">
                              {item.name.toLowerCase().includes('pomada') ? <Package size={10}/> : <Scissors size={10}/>}
                              {item.name}
                           </div>
                         ))}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className={`mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-lg border border-white/5 ${payment.bg} ${payment.color}`}>
                        {payment.icon}
                        <span className="text-[12px]  font-black uppercase italic tracking-tighter">{payment.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-white font-black text-sm italic tabular-nums leading-none">R$ {sale.price.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button onClick={() => { if(window.confirm('Estornar venda?')) sale.allIds.forEach((id: string) => onDelete(id)) }} className="p-2 rounded-xl text-red-500/20 hover:text-red-500 transition-all active:scale-90"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredSales.map((sale) => {
            const payment = getPaymentDetails(sale.payment_method || sale.paymentMethod);
            const visualId = sale.displayId ? String(sale.displayId).slice(-6).toUpperCase() : 'AVULSO';
            return (
              <div key={sale.allIds[0]} className="p-5 space-y-4 active:bg-white/5 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="bg-amber-500/10 p-2 rounded-xl flex flex-col items-center justify-center min-w-[45px] border border-amber-500/20">
                      <span className="text-amber-500 text-[10px] font-black">{format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}</span>
                      <span className="text-white text-[9px] font-black">{sale.time}</span>
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-black uppercase italic tracking-tight">{sale.customer_name || 'Venda Direta'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">#{visualId}</span>
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black ${payment.bg} ${payment.color}`}>{payment.icon} {payment.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-sm italic tabular-nums leading-none tracking-tighter">R$ {sale.price.toFixed(2)}</div>
                    <button onClick={() => { if(window.confirm('Estornar?')) sale.allIds.forEach((id: string) => onDelete(id)) }} className="mt-2 text-red-500/30 p-1 active:scale-90 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 space-y-2 border border-white/5">
                   {sale.serviceList.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase italic">
                          {item.name.toLowerCase().includes('pomada') ? <Package size={10}/> : <Scissors size={10}/>}
                          {item.name}
                        </div>
                        <span className="text-[9px] text-white/30 tabular-nums font-bold italic">R$ {item.price.toFixed(2)}</span>
                     </div>
                   ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredSales.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <XCircle size={32} className="text-slate-800" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Nenhum registro encontrado</p>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Ajuste do DatePicker para o Tema Dark */
        .react-datepicker {
          background-color: #0f1115 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 1.5rem !important;
          font-family: inherit !important;
        }
        .react-datepicker__header {
          background-color: #0f1115 !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .react-datepicker__current-month, .react-datepicker__day-name {
          color: #94a3b8 !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
        }
        .react-datepicker__day {
          color: #f8fafc !important;
          font-weight: 700 !important;
          font-size: 11px !important;
        }
        .react-datepicker__day:hover {
          background-color: #f59e0b !important;
          color: #000 !important;
        }
        .react-datepicker__day--selected {
          background-color: #f59e0b !important;
          color: #000 !important;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default SalesHistoryModule;