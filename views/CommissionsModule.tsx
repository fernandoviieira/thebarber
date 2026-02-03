import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users, ChevronDown, ChevronUp, Wallet, Save,
    Loader2, Percent, Calendar as CalendarIcon, MinusCircle, Printer, Filter, Receipt, Scissors, Package, TrendingUp
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

const CommissionsModule = ({ barbershopId }: { barbershopId: string | null }) => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
    const [startDate, endDate] = dateRange;
    const [reportData, setReportData] = useState<any[]>([]);
    const [expandedBarber, setExpandedBarber] = useState<string | null>(null);

    const [selectedBarberId, setSelectedBarberId] = useState<string | 'all'>('all');
    const [barbershopName, setBarbershopName] = useState('');

    // Cache de serviços e produtos
    const [servicesCache, setServicesCache] = useState<any[]>([]);
    const [inventoryCache, setInventoryCache] = useState<any[]>([]);

    useEffect(() => {
        if (barbershopId && startDate && endDate) fetchCommissions();
    }, [barbershopId, startDate, endDate]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const startIso = startDate?.toISOString().split('T')[0];
            const endIso = endDate?.toISOString().split('T')[0];

            const { data: shopData } = await supabase
                .from('barbershops')
                .select('name')
                .eq('id', barbershopId)
                .single();

            if (shopData) setBarbershopName(shopData.name);

            // Buscar serviços e produtos
            const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .eq('barbershop_id', barbershopId);

            const { data: inventoryData } = await supabase
                .from('inventory')
                .select('*')
                .eq('barbershop_id', barbershopId);

            setServicesCache(servicesData || []);
            setInventoryCache(inventoryData || []);

            const { data: barbersData } = await supabase
                .from('barbers')
                .select('*')
                .eq('barbershop_id', barbershopId);

            const { data: salesData } = await supabase
                .from('appointments')
                .select('*')
                .eq('barbershop_id', barbershopId)
                .eq('status', 'finalizado')
                .gte('date', startIso)
                .lte('date', endIso)
                .order('date', { ascending: false });

            if (barbersData && salesData) {
                setReportData(barbersData.map(barber => {
                    const mySales = salesData.filter(sale =>
                        sale.barber_id === barber.id ||
                        (!sale.barber_id && sale.barber === barber.name)
                    );

                    // ✅ NOVA LÓGICA DE DETALHAMENTO IGUAL AO HISTÓRICO
                    const salesWithDetailedItems = mySales.map(sale => {
                        const rawServiceStr = sale.service || 'Serviço';
                        const parts = rawServiceStr.split(' + ').map(p => p.trim());

                        const detailedItems = parts.map(part => {
                            let itemPrice = 0;
                            const isGorjeta = part.toLowerCase().includes('gorjeta');
                            const isProduct = part.toLowerCase().includes('(produto)');

                            if (isGorjeta) {
                                const match = part.match(/\d+\.?\d*/);
                                itemPrice = match ? parseFloat(match[0]) : 0;
                                return { name: part, price: itemPrice, commission: itemPrice, isProduct: false, isGorjeta: true };
                            }
                            else if (isProduct) {
                                const productName = part.replace(/\(Produto\)\s+/i, '').trim();
                                const foundProduct = inventoryData?.find(p => p.name.trim() === productName);
                                itemPrice = foundProduct ? Number(foundProduct.price_sell) : 0;
                                const productRate = foundProduct ? Number(foundProduct.commission_rate) : 0;
                                return { name: part, price: itemPrice, commission: itemPrice * (productRate / 100), isProduct: true, isGorjeta: false };
                            }
                            else {
                                const foundService = servicesData?.find(s => s.name.trim() === part);
                                itemPrice = foundService ? Number(foundService.price) : 0;
                                // Usa a taxa específica do barbeiro para serviços
                                return { name: part, price: itemPrice, commission: itemPrice * (barber.commission_rate / 100), isProduct: false, isGorjeta: false };
                            }
                        });

                        const totalVendaComissao = detailedItems.reduce((acc, item) => acc + item.commission, 0);

                        return {
                            ...sale,
                            detailedItems,
                            comissaoTotalVenda: totalVendaComissao
                        };
                    });

                    return {
                        ...barber,
                        atendimentos: salesWithDetailedItems.length,
                        totalBruto: salesWithDetailedItems.reduce((acc, curr) => acc + Number(curr.price), 0),
                        currentRate: barber.commission_rate || 0,
                        expenses: barber.expenses || 0,
                        totalComissaoCalculada: salesWithDetailedItems.reduce((acc, sale) => acc + sale.comissaoTotalVenda, 0),
                        totalGorjetas: salesWithDetailedItems.reduce((acc, sale) => acc + (Number(sale.tip_amount) || 0), 0),
                        detalhes: salesWithDetailedItems
                    };
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateSaleCommission = (venda: any, barberRate: number) => {
        // Se for apenas gorjeta
        if (venda.service === "Caixinha / Gorjeta") {
            return 0;
        }

        const serviceText = venda.service || '';
        let comissaoVenda = 0;

        // Verificar se tem produto na venda
        if (serviceText.includes('(Produto)')) {
            const parts = serviceText.split('+').map(p => p.trim());

            parts.forEach(part => {
                if (part.includes('(Produto)')) {
                    // É um produto
                    const productName = part.replace('(Produto)', '').trim().split(' x')[0].trim();
                    const product = inventoryCache.find(p =>
                        p.name.toLowerCase() === productName.toLowerCase()
                    );

                    if (product && product.commission_rate) {
                        const productPrice = Number(product.price_sell) || 0;
                        comissaoVenda += productPrice * (Number(product.commission_rate) / 100);
                    }
                } else if (!part.toLowerCase().includes('gorjeta')) {
                    // É um serviço
                    const serviceName = part.split(' x')[0].trim();
                    const service = servicesCache.find(s =>
                        s.name.toLowerCase() === serviceName.toLowerCase()
                    );

                    if (service) {
                        const servicePrice = Number(service.price) || 0;
                        comissaoVenda += servicePrice * (barberRate / 100);
                    }
                }
            });

            return comissaoVenda;
        } else {
            // Venda apenas de serviço(s)
            return Number(venda.price) * (barberRate / 100);
        }
    };

    const updateLocalValue = (id: string, field: 'currentRate' | 'expenses', value: number) => {
        setReportData(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const saveBarberChanges = async (barberId: string) => {
        setIsSaving(barberId);
        const barber = reportData.find(b => b.id === barberId);
        if (!barber) return;

        try {
            const { error } = await supabase
                .from('barbers')
                .update({
                    commission_rate: barber.currentRate,
                    expenses: barber.expenses
                })
                .eq('id', barberId);

            if (error) throw error;
            alert(`✅ Dados de ${barber.name} salvos com sucesso!`);
        } catch (e) {
            console.error(e);
            alert("❌ Erro ao salvar no banco de dados.");
        } finally {
            setIsSaving(null);
        }
    };

    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const filteredReportData = selectedBarberId === 'all'
        ? reportData
        : reportData.filter(b => b.id === selectedBarberId);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 md:pb-0">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/5 pb-8 print:hidden">
                <div className="space-y-1">
                    <h2 className="text-3xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">
                        Fechamento <span className="text-amber-500">PRO</span>
                    </h2>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em] ml-1">
                        Gestão de Comissões e Vales
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
                    <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 ml-2">Profissional</span>
                        <div className="bg-slate-900/80 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 flex items-center gap-3">
                            <Filter size={16} className="text-amber-500" />
                            <select
                                value={selectedBarberId}
                                onChange={(e) => setSelectedBarberId(e.target.value)}
                                className="bg-transparent text-white font-black text-xs md:text-sm outline-none cursor-pointer uppercase appearance-none flex-1"
                            >
                                <option value="all" className="bg-slate-900">Todos</option>
                                {reportData.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-xl md:rounded-[2rem] p-3 md:p-4 flex items-center shadow-2xl flex-1">
                        <div className="flex items-center gap-3 px-2 md:px-4">
                            <CalendarIcon size={20} className="text-amber-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Período
                                </span>
                                <DatePicker
                                    selectsRange={true}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(update) => setDateRange(update)}
                                    locale={ptBR}
                                    dateFormat="dd/MM/yy"
                                    className="bg-transparent text-white font-black text-sm md:text-base outline-none cursor-pointer w-full"
                                    shouldCloseOnSelect={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 md:gap-6 print:hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-amber-500 font-black text-[10px] tracking-[0.5em]">
                        <Loader2 className="animate-spin" size={40} />
                        PROCESSANDO...
                    </div>
                ) : (
                    filteredReportData.map(barber => {
                        const totalLiquido = barber.totalComissaoCalculada + barber.totalGorjetas - (barber.expenses || 0);

                        return (
                            <div key={barber.id} className="group">
                                <div
                                    onClick={() => setExpandedBarber(expandedBarber === barber.id ? null : barber.id)}
                                    className={`bg-slate-900/40 border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-8 hover:border-amber-500/30 transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-4 ${expandedBarber === barber.id ? 'border-amber-500/50 rounded-b-none bg-slate-900' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                                        <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[2rem] bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-amber-500 border border-white/5 shadow-2xl shrink-0">
                                            <Users size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter truncate">
                                                {barber.name}
                                            </h4>
                                            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                                {barber.atendimentos} vendas
                                            </p>
                                        </div>
                                        <div className="ml-auto md:hidden">
                                            {expandedBarber === barber.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-4 md:gap-12 w-full md:w-auto border-t border-white/5 pt-4 md:border-0 md:pt-0">
                                        <div className="text-left md:text-right">
                                            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase mb-1">Comissão</p>
                                            <p className="text-sm md:text-xl font-black text-white italic tabular-nums">
                                                R$ {barber.totalComissaoCalculada.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="text-right text-green-500">
                                            <p className="text-[8px] md:text-[10px] font-black uppercase mb-1 opacity-60">Gorjetas</p>
                                            <p className="text-sm md:text-xl font-black italic tabular-nums">
                                                + R$ {barber.totalGorjetas.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-amber-500 px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[2rem] text-center shadow-xl w-full md:w-auto min-w-[140px] md:min-w-[200px]">
                                            <p className="text-[8px] md:text-[10px] font-black text-black/40 uppercase mb-1 italic leading-none">
                                                Saldo Final
                                            </p>
                                            <p className="text-2xl md:text-4xl font-black text-black italic leading-none tabular-nums">
                                                R$ {totalLiquido.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="hidden md:block">
                                            {expandedBarber === barber.id ? (
                                                <ChevronUp className="text-amber-500" />
                                            ) : (
                                                <ChevronDown className="text-slate-700" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {expandedBarber === barber.id && (
                                    <div className="bg-black/60 border-x border-b border-white/10 rounded-b-2xl md:rounded-b-[3rem] overflow-hidden animate-in slide-in-from-top-4 duration-300 p-4 md:p-8 space-y-6 md:space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-white/[0.02] p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-white/5">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Percent size={14} />
                                                    <span className="text-[10px] font-black uppercase italic">Comissão Serviços (%)</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={barber.currentRate}
                                                    onChange={(e) => updateLocalValue(barber.id, 'currentRate', Number(e.target.value))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-amber-500 font-black text-xl outline-none"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <MinusCircle size={14} />
                                                    <span className="text-[10px] font-black uppercase italic">Vale / Adiantamento (R$)</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={barber.expenses}
                                                    onChange={(e) => updateLocalValue(barber.id, 'expenses', Number(e.target.value))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-red-500 font-black text-xl outline-none"
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end pt-2">
                                                <button
                                                    onClick={() => saveBarberChanges(barber.id)}
                                                    disabled={isSaving === barber.id}
                                                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-amber-500 text-black px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all hover:bg-amber-400 disabled:opacity-50"
                                                >
                                                    {isSaving === barber.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <Save size={16} />
                                                    )}
                                                    Salvar Dados
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-white/5">
                                            <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-900">
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                                            Data
                                                        </th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                                            Descrição da Venda
                                                        </th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">
                                                            Valor
                                                        </th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-amber-500 uppercase tracking-widest border-b border-white/5 text-right italic">
                                                            Comissão
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {barber.detalhes.map((venda: any) => {
                                                        const isTipOnly = venda.service === "Caixinha / Gorjeta";

                                                        // Calcular comissão usando a nova função
                                                        const comissaoExibida = calculateSaleCommission(venda, barber.currentRate);

                                                        // Valor exibido
                                                        const valorExibido = Number(venda.original_price || venda.price);

                                                        // Gorjeta
                                                        const gorjetaVenda = Number(venda.tip_amount) || 0;
                                                        const comissaoTotal = comissaoExibida + gorjetaVenda;

                                                        return (
                                                            <tr key={venda.id} className="hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-6 py-3 text-[9px] text-slate-400 font-bold whitespace-nowrap">
                                                                    {new Date(venda.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                                </td>
                                                                <td className="px-6 py-3 text-[10px] font-black uppercase text-white tracking-tighter">
                                                                    <div className="flex flex-col gap-2">
                                                                        {(venda.detailedItems || []).map((item: any, i: number) => (
                                                                            <div key={i} className="flex items-center gap-2">
                                                                                {item.isProduct ? (
                                                                                    <Package size={10} className="text-blue-400" />
                                                                                ) : (
                                                                                    <Scissors size={10} className="text-amber-500" />
                                                                                )}
                                                                                <span className="text-slate-300">{item.name}</span>
                                                                                <span className="text-[12px] text-amber-500/50 ml-auto">
                                                                                    (Com: R$ {Number(item.commission || 0).toFixed(2)})
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {Number(venda.tip_amount) > 0 && (
                                                                            <div className="flex items-center gap-2 text-green-500 text-[8px]">
                                                                                <TrendingUp size={10} />
                                                                                <span>+ GORJETA: R$ {Number(venda.tip_amount).toFixed(2)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3 text-right text-[10px] font-bold tabular-nums text-slate-400">
                                                                    R$ {valorExibido.toFixed(2)}
                                                                </td>
                                                                <td className="px-6 py-3 text-right text-[11px] font-black tabular-nums text-amber-500">
                                                                    R$ {comissaoTotal.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {!loading && filteredReportData.length > 0 && (
                <div className="bg-amber-500 rounded-2xl md:rounded-[4rem] p-6 md:p-12 flex flex-col xl:flex-row justify-between items-center shadow-2xl mt-8 md:mt-12 print:hidden gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 text-center md:text-left">
                        <div className="p-4 md:p-8 bg-black rounded-2xl md:rounded-[2.5rem] shadow-2xl">
                            <Wallet size={32} className="text-amber-500 md:w-12 md:h-12" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-[12px] font-black text-black/50 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-3">
                                Repasse Total Período
                            </p>
                            <h3 className="text-4xl md:text-7xl font-black text-black italic leading-none tabular-nums">
                                R${' '}
                                {filteredReportData
                                    .reduce((acc, b) => acc + (b.totalComissaoCalculada + b.totalGorjetas - (b.expenses || 0)), 0)
                                    .toFixed(2)}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="w-full md:w-auto bg-black text-amber-500 px-8 md:px-14 py-5 md:py-7 rounded-xl md:rounded-[2.5rem] font-black uppercase text-xs md:text-sm tracking-widest flex items-center justify-center gap-4 hover:scale-105 transition-all"
                    >
                        <Printer size={20} /> Imprimir Recibos
                    </button>
                </div>
            )}

            {/* ÁREA DE IMPRESSÃO - CORRIGIDA */}
            <div className="hidden print:block">
                {filteredReportData.map((barber, index) => {
                    const isLast = index === filteredReportData.length - 1;
                    const totalLiquidoPrint = barber.totalComissaoCalculada + barber.totalGorjetas - (barber.expenses || 0);

                    return (
                        <div
                            key={barber.id}
                            style={{
                                pageBreakAfter: isLast ? 'auto' : 'always',
                                pageBreakInside: 'avoid',
                                padding: '20mm',
                                backgroundColor: 'white',
                                color: 'black'
                            }}
                        >
                            {/* Cabeçalho */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>
                                        {barbershopName || 'Barber Pro'}
                                    </h1>
                                    <p style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', margin: '5px 0 0 0' }}>
                                        Recibo de Repasse de Comissões
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    <p style={{ margin: '0 0 5px 0' }}>Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
                                    <p style={{ margin: 0 }}>
                                        Período: {startDate?.toLocaleDateString('pt-BR')} - {endDate?.toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            {/* Nome do Profissional */}
                            <div style={{ marginBottom: '30px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#666', margin: '0 0 5px 0' }}>
                                    Profissional:
                                </p>
                                <h2 style={{ fontSize: '36px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>
                                    {barber.name}
                                </h2>
                            </div>

                            {/* Resumo Financeiro */}
                            <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', textAlign: 'center', marginBottom: '25px' }}>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>
                                            Comissões Total
                                        </p>
                                        <p style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>
                                            R$ {barber.totalComissaoCalculada.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>
                                            Gorjetas (+)
                                        </p>
                                        <p style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>
                                            R$ {barber.totalGorjetas.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>
                                            Taxa Base (%)
                                        </p>
                                        <p style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>
                                            {barber.currentRate}%
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>
                                            Vales/Desc (-)
                                        </p>
                                        <p style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626', margin: 0 }}>
                                            R$ {Number(barber.expenses || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '25px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>
                                        Total Líquido a Receber
                                    </p>
                                    <p style={{ fontSize: '36px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>
                                        R$ {totalLiquidoPrint.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Tabela de Detalhamento - CORRIGIDA COM DETALHAMENTO */}
                            <div style={{ marginBottom: '50px' }}>
                                <h3 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '10px', marginBottom: '20px', fontStyle: 'italic' }}>
                                    Detalhamento das Vendas
                                </h3>
                                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                                            <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: '900' }}>Data</th>
                                            <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: '900' }}>Descrição</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right', fontWeight: '900' }}>Valor</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right', fontWeight: '900' }}>Comissão</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {barber.detalhes.map((venda: any) => {
                                            const gorjetaVenda = Number(venda.tip_amount) || 0;
                                            const comVal = calculateSaleCommission(venda, barber.currentRate);
                                            const comissaoTotal = comVal + gorjetaVenda;
                                            const valorExibido = Number(venda.original_price || venda.price);

                                            return (
                                                <tr key={venda.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 0', verticalAlign: 'top' }}>
                                                        {new Date(venda.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td style={{ padding: '10px 0', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                                                        <div>
                                                            {/* ✅ DETALHAMENTO COMPLETO NA IMPRESSÃO */}
                                                            {(venda.detailedItems || []).map((item: any, i: number) => (
                                                                <div key={i} style={{ marginBottom: '4px', fontSize: '8px' }}>
                                                                    {item.isProduct ? '📦' : '✂️'} {item.name}
                                                                    <span style={{ color: '#f59e0b', marginLeft: '10px' }}>
                                                                        (Com: R$ {Number(item.commission || 0).toFixed(2)})
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {gorjetaVenda > 0 && (
                                                                <div style={{ color: '#10b981', fontSize: '8px', marginTop: '5px' }}>
                                                                    💰 + GORJETA: R$ {gorjetaVenda.toFixed(2)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#9ca3af', verticalAlign: 'top' }}>
                                                        R$ {valorExibido.toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
                                                        R$ {comissaoTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Assinatura */}
                            <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '1px solid black', width: '250px', margin: '50px auto 0', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>
                                    Assinatura
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ESTILOS */}
            <style>{`
                @media print {
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print\\:block, .print\\:block * {
                        visibility: visible;
                    }
                    .print\\:block {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                .react-datepicker { 
                    background-color: #0f1115 !important; 
                    border: 1px solid rgba(255,255,255,0.1) !important; 
                    border-radius: 1.5rem !important; 
                }
                .react-datepicker__header { 
                    background-color: #0f1115 !important; 
                    border-bottom: 1px solid rgba(255,255,255,0.05) !important; 
                }
                .react-datepicker__current-month, 
                .react-datepicker__day-name { 
                    color: #94a3b8 !important; 
                }
                .react-datepicker__day { 
                    color: #f8fafc !important; 
                }
                .react-datepicker__day:hover { 
                    background-color: #1e293b !important; 
                }
                .react-datepicker__day--in-range { 
                    background-color: rgba(245, 158, 11, 0.2) !important; 
                }
                .react-datepicker__day--selected { 
                    background-color: #f59e0b !important; 
                    color: #000 !important; 
                }
                .custom-scrollbar::-webkit-scrollbar { 
                    height: 4px; 
                    width: 4px; 
                }
                .custom-scrollbar::-webkit-scrollbar-track { 
                    background: transparent; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: #333; 
                    border-radius: 10px; 
                }
            `}</style>
        </div>
    );
};

export default CommissionsModule;
