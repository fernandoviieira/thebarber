import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  History, Trash2, Banknote, QrCode, Search, Hash,
  CreditCard as CardIcon, Filter, User, TrendingUp, Package, Scissors, Clock, Calendar, XCircle, Layers, ChevronDown, ChevronUp, DollarSign
} from 'lucide-react';
import { format, startOfDay, subDays, isSameDay, isAfter } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

interface SalesHistoryProps {
  appointments: any[];
  onDelete: (id: string) => Promise<void>;
  barbershopId: string | null;
  servicesList: any[]; 
  productsList: any[]; 
  barbersData: any[];
}

type PaymentFilter = 'todos' | 'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote';
type DateFilter = 'hoje' | 'ontem' | '7dias' | '30dias' | 'personalizado' | 'tudo';


const SalesHistoryModule: React.FC<SalesHistoryProps> = ({ appointments, onDelete, barbershopId, servicesList, productsList, barbersData }) => {
  const [barberFilter, setBarberFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');
  const [fees, setFees] = useState<any>({ fee_debito: 0, fee_credito: 0, fee_pix: 0, fee_dinheiro: 0 });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Toggle expansão de linha
  const toggleRowExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  // --- BUSCAR CONFIGURAÇÕES DE TAXAS ---
  useEffect(() => {
    const fetchSettings = async () => {
      if (!barbershopId) return;
      const { data } = await supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle();
      if (data) setFees(data);
    };
    fetchSettings();
  }, [barbershopId]);

  // --- FUNÇÃO PARA CALCULAR VALOR LÍQUIDO (COM SUPORTE A MISTO) ---
  const calculateNetValue = (price: number, methodRaw: string) => {
    const method = methodRaw?.toLowerCase() || '';

    if (!method.includes('+')) {
      let feePercent = 0;
      if (method.includes('pix')) feePercent = fees.fee_pix || 0;
      else if (method.includes('debito')) feePercent = fees.fee_debito || 0;
      else if (method.includes('credito')) feePercent = fees.fee_credito || 0;
      else if (method.includes('dinheiro')) feePercent = fees.fee_dinheiro || 0;
      return price * (1 - feePercent / 100);
    }

    const parts = method.split('+');
    let totalLiquido = 0;
    parts.forEach(part => {
      const valueMatch = part.match(/\d+\.?\d*/);
      const valorParte = valueMatch ? parseFloat(valueMatch[0]) : 0;
      let feePercent = 0;
      if (part.includes('pix')) feePercent = fees.fee_pix || 0;
      else if (part.includes('debito')) feePercent = fees.fee_debito || 0;
      else if (part.includes('credito')) feePercent = fees.fee_credito || 0;
      else if (part.includes('dinheiro')) feePercent = fees.fee_dinheiro || 0;
      totalLiquido += valorParte * (1 - feePercent / 100);
    });
    return totalLiquido;
  };

  const filteredSales = useMemo(() => {
    const today = startOfDay(new Date());
    const baseFilter = appointments.filter(app => {
      const appDate = startOfDay(new Date(app.date + 'T00:00:00'));
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
      } else if (dateFilter === 'tudo') {
        matchesDate = true;
      }

      const matchesStatus = app.status === 'finalizado';
      const matchesSearch = app.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.service?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBarber = barberFilter === 'todos' || app.barber === barberFilter;
      const matchesPayment = paymentFilter === 'todos' || (app.payment_method || app.paymentMethod)?.toLowerCase().includes(paymentFilter);

      return matchesStatus && matchesDate && matchesSearch && matchesBarber && matchesPayment;
    });

    const grouped = baseFilter.reduce((acc: any[], current) => {
      const rawId = current.venda_id || current.vendaId || current.id_venda || current.order_id;
      const groupKey = rawId ? String(rawId).trim() : `unique-${current.id}`;

      const valorBrutoDesteItem = Number(current.original_price || current.price);
      const valorPagoDesteItem = Number(current.price);

      const existingIndex = acc.findIndex(item => {
        const itemRawId = item.venda_id || item.vendaId || item.id_venda || item.order_id;
        return itemRawId && String(itemRawId).trim() === groupKey;
      });

      // ✅ LÓGICA REFINADA: BUSCA DE PREÇOS REAIS NAS LISTAS DE REFERÊNCIA
      const rawServiceStr = current.service || 'Serviço';
      const parts = rawServiceStr.split(' + ').map(p => p.trim());

      const detailedItems = parts.map(part => {
        let itemPrice = 0;
        const isGorjeta = part.toLowerCase().includes('gorjeta');
        const isProduct = part.toLowerCase().includes('(produto)');

        const currentBarberData = barbersData.find(b => b.name === current.barber);
        if (isGorjeta) {
          const match = part.match(/\d+\.?\d*/);
          itemPrice = match ? parseFloat(match[0]) : 0;
          return {
            name: part,
            price: itemPrice,
            isGorjeta: true,
            isProduct: false,
            commission: itemPrice
          };
        }
        else if (isProduct) {
          const productName = part.replace(/\(Produto\)\s+/i, '').trim();
          const foundProduct = productsList.find(p => p.name.trim() === productName);
          itemPrice = foundProduct ? Number(foundProduct.price_sell) : 0;
          const productRate = foundProduct ? Number(foundProduct.commission_rate) : 0;

          return {
            name: part,
            price: itemPrice,
            isGorjeta: false,
            isProduct: true,
            commission: itemPrice * (productRate / 100)
          };
        }
        else {
          // SERVIÇOS
          const foundService = servicesList.find(s => s.name.trim() === part);
          itemPrice = foundService ? Number(foundService.price) : 0;
          return {
            name: part,
            price: itemPrice,
            isGorjeta: false,
            isProduct: false,
            commission: itemPrice * 0.5
          };
        }
      });
      // ✅ AGORA GERENCIA O AGRUPAMENTO
      if (existingIndex !== -1 && rawId) {
        const group = acc[existingIndex];
        group.price += valorPagoDesteItem;
        group.brutoTotal += valorBrutoDesteItem;
        group.serviceList.push(...detailedItems);

        if (!group.allIds.includes(current.id)) group.allIds.push(current.id);
      } else {
        acc.push({
          ...current,
          displayId: rawId || null,
          price: valorPagoDesteItem,
          brutoTotal: valorBrutoDesteItem,
          serviceList: detailedItems,
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

  const totalBruto = filteredSales.reduce((acc, curr) => acc + Number(curr.price), 0);
  const totalLiquido = filteredSales.reduce((acc, curr) => acc + calculateNetValue(curr.price, (curr.payment_method || curr.paymentMethod || '')), 0);

  const getPaymentDetails = (methodRaw: string) => {
    const method = methodRaw?.toLowerCase() || '';
    if (method.includes('+')) return {
      icon: <Layers size={14} />,
      label: 'PAG. MISTO',
      color: 'text-white',
      bg: 'bg-indigo-600'
    };
    if (method.includes('pix')) return { icon: <QrCode size={14} />, label: 'PIX', color: 'text-teal-400', bg: 'bg-teal-500/20' };
    if (method.includes('dinheiro')) return { icon: <Banknote size={14} />, label: 'DINHEIRO', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (method.includes('pacote')) return { icon: <History size={14} />, label: 'COMBO', color: 'text-purple-400', bg: 'bg-purple-500/20' };
    if (method.includes('debito')) return { icon: <CardIcon size={14} />, label: 'DÉBITO', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (method.includes('credito')) return { icon: <CardIcon size={14} />, label: 'CRÉDITO', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { icon: <CardIcon size={14} />, label: methodRaw || 'OUTRO', color: 'text-slate-500', bg: 'bg-white/5' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 md:pb-0 font-bold italic">

      {/* FILTROS RESPONSIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-white/10 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 space-y-6 shadow-2xl">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="BUSCAR CLIENTE OU SERVIÇO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-black focus:border-amber-500 outline-none transition-all uppercase italic"
              />
            </div>

            <div className="flex bg-black p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
              {(['hoje', 'ontem', '7dias', '30dias', 'personalizado', 'tudo'] as DateFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`flex-1 min-w-[60px] py-3 rounded-xl text-[10px] font-black uppercase transition-all ${dateFilter === d ? 'bg-amber-500 text-black shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}
                >
                  {d === '7dias' ? '7D' : d === '30dias' ? '30D' : d === 'personalizado' ? '📅' : d}
                </button>
              ))}
            </div>
          </div>

          {dateFilter === 'personalizado' && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-[1.5rem] animate-in slide-in-from-top-2 duration-300">
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-500 ml-1">Data Inicial</span>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  locale={ptBR}
                  dateFormat="dd/MM/yyyy"
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-black outline-none"
                />
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-500 ml-1">Data Final</span>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  locale={ptBR}
                  dateFormat="dd/MM/yyyy"
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-black outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="overflow-x-auto no-scrollbar flex gap-2">
              {barbersList.map(b => (
                <button key={b} onClick={() => setBarberFilter(b)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${barberFilter === b ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/10 bg-white/5 text-slate-500'}`}>{b}</button>
              ))}
            </div>
            <div className="overflow-x-auto no-scrollbar flex gap-2">
              {(['todos', 'pix', 'dinheiro', 'debito', 'credito', 'pacote'] as PaymentFilter[]).map(p => (
                <button key={p} onClick={() => setPaymentFilter(p)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${paymentFilter === p ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/10 bg-white/5 text-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CARD DE TOTAL LÍQUIDO */}
        <div className="bg-amber-500 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-2xl relative overflow-hidden min-h-[220px]">
          <TrendingUp className="absolute -right-6 -bottom-6 w-48 h-48 text-black/10" />
          <div className="relative z-10 space-y-2">
            <p className="text-black/80 text-[12px] font-black uppercase tracking-[0.2em] leading-none">Lucro Líquido Real</p>
            <h3 className="text-6xl font-black text-black tracking-tighter tabular-nums leading-none">
              <span className="text-2xl mr-1 font-bold">R$</span>
              {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="relative z-10 flex justify-between items-center bg-black/10 rounded-2xl p-4 mt-8 border border-black/5">
            <span className="text-black font-black uppercase text-[10px]">Bruto: R$ {totalBruto.toFixed(2)}</span>
            <span className="bg-black text-amber-500 px-3 py-1 rounded-lg font-black text-xs tabular-nums">{filteredSales.length} VENDAS</span>
          </div>
        </div>
      </div>

      {/* LISTAGEM DESKTOP */}
      <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-black/40">
                <th className="px-4 py-6 text-left w-[50px]"></th>
                <th className="px-6 py-6 text-left min-w-[120px]">Data/Hora</th>
                <th className="px-6 py-6 text-left min-w-[100px]">ID Venda</th>
                <th className="px-6 py-6 text-left min-w-[150px]">Cliente</th>
                <th className="px-6 py-6 text-left min-w-[200px]">Serviços / Produtos</th>
                <th className="px-6 py-6 text-center min-w-[120px]">Pagamento</th>
                <th className="px-6 py-6 text-right text-amber-500 min-w-[120px]">Valor Líquido</th>
                <th className="px-4 py-6 text-right w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredSales.map((sale) => {
                const methodRaw = sale.payment_method || sale.paymentMethod || '';
                const payment = getPaymentDetails(methodRaw);
                const visualId = sale.displayId ? String(sale.displayId).slice(-6).toUpperCase() : 'BALCÃO';
                const netVal = calculateNetValue(sale.price, methodRaw);
                const isExpanded = expandedRows.has(sale.allIds[0]);

                return (
                  <React.Fragment key={sale.allIds[0]}>
                    <tr className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-5">
                        <button
                          onClick={() => toggleRowExpand(sale.allIds[0])}
                          className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-amber-500" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-white text-[13px] font-black uppercase whitespace-nowrap">{format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}</div>
                        <div className="text-amber-500 text-[11px] font-black">{sale.time}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-white/5 px-3 py-1.5 rounded-lg text-[11px] font-black text-slate-400 border border-white/10 italic whitespace-nowrap inline-block">#{visualId}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-white uppercase leading-none">{sale.customerName || 'VENDA DIRETA'}</div>
                        <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold whitespace-nowrap">Prof: {sale.barber}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          {sale.serviceList.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase leading-none">
                              {item.name.toLowerCase().includes('pomada') || item.name.toLowerCase().includes('produto') || item.name.toLowerCase().includes('creme') ?
                                <Package size={12} className="text-blue-400 flex-shrink-0" /> :
                                item.name.toLowerCase().includes('gorjeta') ?
                                  <TrendingUp size={12} className="text-green-400 flex-shrink-0" /> :
                                  <Scissors size={12} className="text-amber-500 flex-shrink-0" />
                              }
                              <span className="break-words">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`mx-auto w-fit flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-white/5 ${payment.bg} ${payment.color}`}>
                          <div className="flex items-center gap-2 text-[11px] font-black whitespace-nowrap">
                            {payment.icon} {payment.label}
                          </div>
                          {methodRaw.includes('+') && (
                            <span className="text-[9px] font-black opacity-90 whitespace-nowrap tracking-tighter uppercase">{methodRaw.replace(/ /g, '')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-white font-black text-lg tabular-nums leading-none tracking-tighter whitespace-nowrap">R$ {netVal.toFixed(2)}</div>
                        <div className="text-[11px] text-slate-500 line-through font-bold mt-1 uppercase tracking-widest whitespace-nowrap">R$ {Number(sale.brutoTotal).toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button onClick={() => { sale.allIds.forEach((id: string) => onDelete(id)) }} className="p-3 rounded-2xl text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"><Trash2 size={18} /></button>
                      </td>
                    </tr>

                    {/* DETALHAMENTO EXPANDIDO */}
                    {isExpanded && (
                      <tr className="bg-black/20">
                        <td colSpan={8} className="px-8 py-6">
                          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-500/20">
                              <DollarSign size={18} className="text-amber-500" />
                              <h4 className="text-amber-500 font-black uppercase text-sm tracking-wider">Detalhamento dos Valores</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sale.serviceList.map((item: any, idx: number) => {
                                const isProduct = item.name.toLowerCase().includes('pomada') ||
                                  item.name.toLowerCase().includes('produto') ||
                                  item.name.toLowerCase().includes('creme');
                                const isGorjeta = item.name.toLowerCase().includes('gorjeta');

                                return (
                                  <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {isGorjeta ? (
                                          <TrendingUp size={14} className="text-green-400 flex-shrink-0" />
                                        ) : isProduct ? (
                                          <Package size={14} className="text-blue-400 flex-shrink-0" />
                                        ) : (
                                          <Scissors size={14} className="text-amber-500 flex-shrink-0" />
                                        )}
                                        <span className="text-white font-black text-xs uppercase leading-tight break-words">{item.name}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Valor Total:</span>
                                        <span className="text-amber-500 font-black text-sm tabular-nums">R$ {Number(item.price).toFixed(2)}</span>
                                      </div>

                                      {!isGorjeta && (
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                          <span className="text-[10px] text-green-400/80 font-bold uppercase">
                                            {item.isProduct ? 'Comissão Produto:' : 'Comissão (50%):'}
                                          </span>
                                          <span className="text-green-400 font-black text-sm tabular-nums">
                                            R$ {Number(item.commission).toFixed(2)}
                                          </span>
                                        </div>
                                      )}

                                      {isGorjeta && (
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                          <span className="text-[10px] text-green-400/80 font-bold uppercase">Gorjeta Integral:</span>
                                          <span className="text-green-400 font-black text-sm tabular-nums">R$ {Number(item.price).toFixed(2)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* TOTALIZADOR */}
                            <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap gap-4 justify-end">
                              <div className="bg-black/60 px-6 py-3 rounded-xl border border-white/10">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total da Venda:</span>
                                <span className="text-white font-black text-xl tabular-nums">R$ {Number(sale.price).toFixed(2)}</span>
                              </div>
                              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 px-6 py-3 rounded-xl border border-green-500/30">
                                <span className="text-[10px] text-green-400 font-bold uppercase block mb-1">Total Comissões:</span>
                                <span className="text-green-400 font-black text-xl tabular-nums">
                                  {/* ✅ Agora apenas somamos o campo commission já calculado no processamento */}
                                  R$ {sale.serviceList.reduce((acc: number, item: any) => acc + Number(item.commission || 0), 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden divide-y divide-white/10">
          {filteredSales.map((sale) => {
            const methodRaw = sale.payment_method || sale.paymentMethod || '';
            const payment = getPaymentDetails(methodRaw);
            const visualId = sale.displayId ? String(sale.displayId).slice(-6).toUpperCase() : 'AVULSO';
            const netVal = calculateNetValue(sale.price, methodRaw);
            const isExpanded = expandedRows.has(sale.allIds[0]);

            return (
              <div key={sale.allIds[0]} className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-black p-3 rounded-2xl flex flex-col items-center justify-center min-w-[55px] shadow-lg">
                      <span className="text-[12px] font-black leading-none">{format(new Date(sale.date + 'T00:00:00'), 'dd/MM')}</span>
                      <span className="text-[10px] font-black mt-1">{sale.time}</span>
                    </div>
                    <div>
                      <h4 className="text-white text-base font-black uppercase tracking-tight leading-none">{sale.customer_name || 'VENDA DIRETA'}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">#{visualId}</span>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black border border-white/5 ${payment.bg} ${payment.color}`}>
                          {payment.icon} {payment.label}
                        </div>
                      </div>
                      {methodRaw.includes('+') && (
                        <p className="text-[8px] font-black text-amber-500/60 uppercase mt-1 tracking-tighter">{methodRaw.replace(/ /g, '')}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 font-black uppercase italic mb-1">Líquido</p>
                    <div className="text-white font-black text-3xl tabular-nums leading-none tracking-tighter">R$ {netVal.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-600 line-through font-black mt-1">R$ {sale.price.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase italic">Itens da Venda</span>
                    <button
                      onClick={() => toggleRowExpand(sale.allIds[0])}
                      className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase"
                    >
                      {isExpanded ? 'Ocultar' : 'Detalhes'}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sale.serviceList.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-300 uppercase">
                          {item.name.toLowerCase().includes('pomada') || item.name.toLowerCase().includes('produto') || item.name.toLowerCase().includes('creme') ?
                            <Package size={12} className="text-blue-400 flex-shrink-0" /> :
                            item.name.toLowerCase().includes('gorjeta') ?
                              <TrendingUp size={12} className="text-green-400 flex-shrink-0" /> :
                              <Scissors size={12} className="text-amber-500 flex-shrink-0" />
                          }
                          <span className="break-words">{item.name}</span>
                        </div>
                        <span className="text-[11px] text-white/50 tabular-nums font-black italic ml-2">R$ {Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DETALHAMENTO MOBILE */}
                {isExpanded && (
                  <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                      <DollarSign size={14} className="text-amber-500" />
                      <h5 className="text-amber-500 font-black uppercase text-[10px] tracking-wider">Detalhamento</h5>
                    </div>

                    {sale.serviceList.map((item: any, idx: number) => {
                      const isProduct = item.name.toLowerCase().includes('pomada') ||
                        item.name.toLowerCase().includes('produto') ||
                        item.name.toLowerCase().includes('creme');
                      const isGorjeta = item.name.toLowerCase().includes('gorjeta');

                      return (
                        <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            {isGorjeta ? (
                              <TrendingUp size={12} className="text-green-400 flex-shrink-0" />
                            ) : isProduct ? (
                              <Package size={12} className="text-blue-400 flex-shrink-0" />
                            ) : (
                              <Scissors size={12} className="text-amber-500 flex-shrink-0" />
                            )}
                            <span className="text-white font-black text-[10px] uppercase break-words">{item.name}</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Valor:</span>
                              <span className="text-amber-500 font-black text-xs tabular-nums">R$ {Number(item.price).toFixed(2)}</span>
                            </div>

                            {!isGorjeta && (
                              <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                                <span className="text-[9px] text-green-400/80 font-bold uppercase">Comissão (50%):</span>
                                <span className="text-green-400 font-black text-xs tabular-nums">R$ {(Number(item.price) * 0.5).toFixed(2)}</span>
                              </div>
                            )}

                            {isGorjeta && (
                              <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                                <span className="text-[9px] text-green-400/80 font-bold uppercase">Integral:</span>
                                <span className="text-green-400 font-black text-xs tabular-nums">R$ {Number(item.price).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-3 border-t border-amber-500/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Total Venda:</span>
                        <span className="text-white font-black text-sm tabular-nums">R$ {Number(sale.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-green-400 font-bold uppercase">Total Comissões:</span>
                        <span className="text-green-400 font-black text-sm tabular-nums">
                          R$ {sale.serviceList.reduce((acc: number, item: any) => {
                            const isGorjeta = item.name.toLowerCase().includes('gorjeta');
                            if (isGorjeta) return acc + Number(item.price);
                            return acc + (Number(item.price) * 0.5);
                          }, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { if (window.confirm('Estornar venda?')) sale.allIds.forEach((id: string) => onDelete(id)) }}
                  className="w-full bg-red-500/5 border border-red-500/20 text-red-500 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:bg-red-500 active:text-white transition-all"
                >
                  <Trash2 size={14} /> Estornar Venda
                </button>
              </div>
            );
          })}
        </div>

        {filteredSales.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center gap-4 opacity-30">
            <XCircle size={48} className="text-slate-700" />
            <p className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] italic leading-none">Nenhum registro no período</p>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .react-datepicker {
          background-color: #0f1115 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 2rem !important;
          font-family: inherit !important;
          padding: 10px;
        }
        .react-datepicker__header {
          background-color: #0f1115 !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name {
          color: #f8fafc !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }
        .react-datepicker__day:hover {
          background-color: #f59e0b !important;
          color: #000 !important;
          border-radius: 0.5rem !important;
        }
        .react-datepicker__day--selected {
          background-color: #f59e0b !important;
          color: #000 !important;
          border-radius: 0.5rem !important;
        }
        .react-datepicker__current-month {
          color: #f59e0b !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default SalesHistoryModule;
