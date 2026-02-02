import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users, ChevronDown, ChevronUp, Wallet, Save,
    Loader2, Percent, Calendar as CalendarIcon, Scissors, MinusCircle, Printer, Filter, Package
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

            const { data: barbersData } = await supabase.from('barbers').select('*').eq('barbershop_id', barbershopId);
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
                        // Tenta pelo ID primeiro (vendas novas)
                        sale.barber_id === barber.id ||
                        // Se não tiver ID, usa o nome (vendas antigas)
                        (!sale.barber_id && sale.barber === barber.name)
                    );
                    // CÁLCULO DA COMISSÃO (SERVIÇOS E PRODUTOS)
                    const comissaoTotalCalculada = mySales.reduce((acc, sale) => {
                        // 1. Comissão fixa de produto
                        if (sale.product_commission && Number(sale.product_commission) > 0) {
                            return acc + Number(sale.product_commission);
                        }
                        // 2. Ignora registro de gorjeta no cálculo de comissão percentual
                        if (sale.service === "Caixinha / Gorjeta") return acc;

                        // 3. Comissão percentual padrão
                        return acc + (Number(sale.price) * (barber.commission_rate / 100));
                    }, 0);

                    // SOMA DAS GORJETAS (Repasse 100%)
                    const totalGorjetas = mySales.reduce((acc, sale) => acc + (Number(sale.tip_amount) || 0), 0);

                    return {
                        ...barber,
                        atendimentos: mySales.length,
                        totalBruto: mySales.reduce((acc, curr) => acc + Number(curr.price), 0),
                        currentRate: barber.commission_rate || 0,
                        expenses: barber.expenses || 0,
                        totalComissaoCalculada: comissaoTotalCalculada,
                        totalGorjetas: totalGorjetas,
                        detalhes: mySales
                    };
                }));
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
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
            alert(`Dados de ${barber.name} salvos com sucesso!`);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar no banco de dados.");
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
                    <h2 className="text-3xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">Fechamento <span className="text-amber-500">PRO</span></h2>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em] ml-1">Gestão de Comissões e Vales</p>
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
                                <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Período</span>
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
                    <div className="py-20 flex flex-col items-center gap-4 text-amber-500 font-black text-[10px] tracking-[0.5em]"><Loader2 className="animate-spin" size={40} /> PROCESSANDO...</div>
                ) : (
                    filteredReportData.map(barber => {
                        const totalLiquido = barber.totalComissaoCalculada + barber.totalGorjetas - (barber.expenses || 0);
                        return (
                            <div key={barber.id} className="group">
                                <div
                                    onClick={() => setExpandedBarber(expandedBarber === barber.id ? null : barber.id)}
                                    className={`bg-slate-900/40 border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-8 hover:border-amber-500/30 transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-4 ${expandedBarber === barber.id ? 'border-amber-500/50 rounded-b-none bg-slate-900' : ''}`}
                                >
                                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                                        <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[2rem] bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-amber-500 border border-white/5 shadow-2xl shrink-0"><Users size={24} /></div>
                                        <div className="min-w-0">
                                            <h4 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter truncate">{barber.name}</h4>
                                            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{barber.atendimentos} atendimentos</p>
                                        </div>
                                        <div className="ml-auto md:hidden">
                                            {expandedBarber === barber.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-4 md:gap-12 w-full md:w-auto border-t border-white/5 pt-4 md:border-0 md:pt-0">
                                        <div className="text-left md:text-right">
                                            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase mb-1">Comissão</p>
                                            <p className="text-sm md:text-xl font-black text-white italic tabular-nums">R$ {barber.totalComissaoCalculada.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right text-green-500">
                                            <p className="text-[8px] md:text-[10px] font-black uppercase mb-1 opacity-60">Gorjetas</p>
                                            <p className="text-sm md:text-xl font-black italic tabular-nums">+ R$ {barber.totalGorjetas.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-amber-500 px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[2rem] text-center shadow-xl w-full md:w-auto min-w-[140px] md:min-w-[200px]">
                                            <p className="text-[8px] md:text-[10px] font-black text-black/40 uppercase mb-1 italic leading-none">Saldo Final</p>
                                            <p className="text-2xl md:text-4xl font-black text-black italic leading-none tabular-nums">R$ {totalLiquido.toFixed(2)}</p>
                                        </div>
                                        <div className="hidden md:block">
                                            {expandedBarber === barber.id ? <ChevronUp className="text-amber-500" /> : <ChevronDown className="text-slate-700" />}
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
                                                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-amber-500 text-black px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                                                >
                                                    {isSaving === barber.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                    Salvar Dados
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-white/5">
                                            <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-900">
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Data</th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Serviço / Produto</th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">Preço</th>
                                                        <th className="px-6 py-4 text-[8px] md:text-[9px] font-black text-amber-500 uppercase tracking-widest border-b border-white/5 text-right italic">Comissão</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {barber.detalhes.map((v: any) => {
                                                        const isProduct = v.product_commission && v.product_commission > 0;
                                                        const isTip = v.service === "Caixinha / Gorjeta" || Number(v.tip_amount) > 0;

                                                        // Cálculo exibição da comissão na linha
                                                        const comissaoItem = isProduct
                                                            ? v.product_commission
                                                            : (isTip ? v.tip_amount : (v.price * (barber.currentRate / 100)));

                                                        return (
                                                            <tr key={v.id} className="hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-6 py-3 text-[9px] text-slate-400 font-bold">{new Date(v.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                                <td className="px-6 py-3 text-[10px] font-black uppercase text-white tracking-tighter flex items-center gap-2">
                                                                    {isProduct ? <Package size={10} className="text-blue-400" /> :
                                                                        isTip ? <Wallet size={10} className="text-green-500" /> :
                                                                            <Scissors size={10} className="text-amber-500" />}
                                                                    {v.service}
                                                                </td>
                                                                <td className="px-6 py-3 text-right text-[10px] font-bold tabular-nums text-slate-400">R$ {Number(v.price).toFixed(2)}</td>
                                                                <td className={`px-6 py-3 text-right text-[11px] font-black tabular-nums ${isTip ? 'text-green-500' : 'text-amber-500'}`}>R$ {Number(comissaoItem).toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {!loading && filteredReportData.length > 0 && (
                <div className="bg-amber-500 rounded-2xl md:rounded-[4rem] p-6 md:p-12 flex flex-col xl:flex-row justify-between items-center shadow-2xl mt-8 md:mt-12 print:hidden gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 text-center md:text-left">
                        <div className="p-4 md:p-8 bg-black rounded-2xl md:rounded-[2.5rem] shadow-2xl"><Wallet size={32} className="text-amber-500 md:w-12 md:h-12" /></div>
                        <div>
                            <p className="text-[10px] md:text-[12px] font-black text-black/50 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-3">Repasse Total Período</p>
                            <h3 className="text-4xl md:text-7xl font-black text-black italic leading-none tabular-nums">
                                R$ {filteredReportData.reduce((acc, b) => acc + (b.totalComissaoCalculada + b.totalGorjetas - (b.expenses || 0)), 0).toFixed(2)}
                            </h3>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="w-full md:w-auto bg-black text-amber-500 px-8 md:px-14 py-5 md:py-7 rounded-xl md:rounded-[2.5rem] font-black uppercase text-xs md:text-sm tracking-widest flex items-center justify-center gap-4 hover:scale-105 transition-all">
                        <Printer size={20} /> Imprimir Recibos
                    </button>
                </div>
            )}

            <div id="print-area" className="hidden print:block bg-white text-black p-0 font-sans">
                {filteredReportData.map((barber, index) => {
                    const isLast = index === filteredReportData.length - 1;
                    const totalLiquidoPrint = barber.totalComissaoCalculada + barber.totalGorjetas - (barber.expenses || 0);

                    return (
                        <div
                            key={barber.id}
                            className="print-content-box"
                            style={{ pageBreakAfter: isLast ? 'auto' : 'always' }}
                        >
                            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
                                <div>
                                    <h1 className="text-2xl font-black uppercase italic tracking-tighter">{barbershopName || 'Barber Pro'}</h1>
                                    <p className="text-[8px] font-bold uppercase tracking-widest">Recibo de Repasse de Comissões</p>
                                </div>
                                <div className="text-right text-[10px] font-bold uppercase">
                                    <p>Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
                                    <p>Período: {startDate?.toLocaleDateString('pt-BR')} - {endDate?.toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <p className="text-xs uppercase font-bold text-gray-500">Profissional:</p>
                                <h2 className="text-4xl font-black uppercase italic">{barber.name}</h2>
                            </div>

                            <div className="bg-gray-100 p-4 rounded-xl mb-5 border border-gray-200">
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-gray-400">Comissões Total</p>
                                        <p className="text-lg font-black">R$ {barber.totalComissaoCalculada.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-gray-400">Gorjetas (+)</p>
                                        <p className="text-lg font-black">R$ {barber.totalGorjetas.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-gray-400">Taxa Base (%)</p>
                                        <p className="text-lg font-black">{barber.currentRate}%</p>
                                    </div>
                                    <div className="text-red-600">
                                        <p className="text-[8px] font-black uppercase text-gray-400">Vales/Desc (-)</p>
                                        <p className="text-lg font-black">R$ {Number(barber.expenses || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-300 text-center">
                                    <p className="text-xs font-black uppercase text-gray-400 mb-1">Total Líquido a Receber</p>
                                    <p className="text-4xl font-black italic">R$ {totalLiquidoPrint.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="mb-12">
                                <h3 className="text-[10px] font-black uppercase border-b border-black pb-2 mb-4 italic">Detalhamento dos Serviços</h3>
                                <table className="w-full text-[9px]">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="py-2 text-left">Data</th>
                                            <th className="py-2 text-left">Item</th>
                                            <th className="py-2 text-right">V. Bruto</th>
                                            <th className="py-2 text-right">Comissão</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {barber.detalhes.map((v: any) => {
                                            const isProd = v.product_commission && v.product_commission > 0;
                                            const isTipPrint = v.service === "Caixinha / Gorjeta" || Number(v.tip_amount) > 0;
                                            const comVal = isProd ? v.product_commission : (isTipPrint ? v.tip_amount : (v.price * (barber.currentRate / 100)));
                                            return (
                                                <tr key={v.id} className="border-b border-gray-100">
                                                    <td className="py-2">{new Date(v.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                    <td className="py-2 font-bold uppercase">{v.service} {isTipPrint && "(GORJETA)"}</td>
                                                    <td className="py-2 text-right text-gray-400">R$ {Number(v.price).toFixed(2)}</td>
                                                    <td className={`py-2 text-right font-bold ${isTipPrint ? 'text-green-600' : ''}`}>R$ {Number(comVal).toFixed(2)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-12 pt-8 border-t border-black w-64 mx-auto text-center">
                                <p className="text-[10px] font-black uppercase italic">Assinatura</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { visibility: hidden !important; background: white !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
                    .print\\:hidden { display: none !important; }
                    .print-content-box { width: 100% !important; page-break-inside: avoid !important; padding-bottom: 20px; border-bottom: 1px dashed #ccc; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; }
                }
                .react-datepicker { background-color: #0f1115 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 1.5rem !important; }
                .react-datepicker__header { background-color: #0f1115 !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
                .react-datepicker__current-month, .react-datepicker__day-name { color: #94a3b8 !important; }
                .react-datepicker__day { color: #f8fafc !important; }
                .react-datepicker__day:hover { background-color: #1e293b !important; }
                .react-datepicker__day--in-range { background-color: rgba(245, 158, 11, 0.2) !important; }
                .react-datepicker__day--selected { background-color: #f59e0b !important; color: #000 !important; }
                .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CommissionsModule;