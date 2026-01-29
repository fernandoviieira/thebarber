import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users, ChevronDown, ChevronUp, Download, Wallet, Save,
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
                .eq('status', 'confirmado')
                .gte('date', startIso)
                .lte('date', endIso)
                .order('date', { ascending: false });

            if (barbersData && salesData) {
                setReportData(barbersData.map(barber => {
                    const mySales = salesData.filter(sale => sale.barber === barber.name);
                    const comissaoTotalCalculada = mySales.reduce((acc, sale) => {
                        if (sale.product_commission && Number(sale.product_commission) > 0) {
                            return acc + Number(sale.product_commission);
                        }
                        if (sale.service === "Caixinha / Gorjeta") return acc;
                        return acc + (Number(sale.price) * (barber.commission_rate / 100));
                    }, 0);

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
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 border-b border-white/5 pb-10 print:hidden">
                <div className="space-y-2">
                    <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none">Fechamento <span className="text-amber-500">PRO</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Gestão de Comissões e Adiantamentos</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Selecionar Profissional</span>
                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-amber-500/40 transition-all">
                            <Filter size={18} className="text-amber-500" />
                            <select
                                value={selectedBarberId}
                                onChange={(e) => setSelectedBarberId(e.target.value)}
                                className="bg-transparent text-white font-black text-sm outline-none cursor-pointer uppercase appearance-none flex-1"
                            >
                                <option value="all" className="bg-slate-900">Todos os Profissionais</option>
                                {reportData.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-4 flex items-center shadow-2xl group transition-all hover:border-amber-500/30">
                        <div className="flex items-center gap-4 px-6 py-2">
                            <CalendarIcon size={24} className="text-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Selecionar Período</span>
                                <DatePicker
                                    selectsRange={true}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(update) => setDateRange(update)}
                                    locale={ptBR}
                                    dateFormat="dd/MM/yyyy"
                                    monthsShown={2}
                                    className="bg-transparent text-white font-black text-lg outline-none cursor-pointer w-[250px]"
                                    shouldCloseOnSelect={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 print:hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-amber-500 font-black text-[10px] tracking-[0.5em]"><Loader2 className="animate-spin" size={40} /> PROCESSANDO...</div>
                ) : (
                    filteredReportData.map(barber => {
                        const totalLiquido = barber.totalComissaoCalculada + barber.totalGorjetas - (barber.expenses || 0);
                        return (
                            <div key={barber.id} className="group">
                                <div
                                    onClick={() => setExpandedBarber(expandedBarber === barber.id ? null : barber.id)}
                                    className={`bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 hover:border-amber-500/30 transition-all cursor-pointer flex items-center justify-between ${expandedBarber === barber.id ? 'border-amber-500/50 rounded-b-none bg-slate-900' : ''}`}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-amber-500 border border-white/5 shadow-2xl"><Users size={32} /></div>
                                        <div>
                                            <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter">{barber.name}</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{barber.atendimentos} atendimentos</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Comissões Acumuladas</p>
                                            <p className="text-xl font-black text-white italic tabular-nums">R$ {barber.totalComissaoCalculada.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right text-green-500">
                                            <p className="text-[10px] font-black uppercase mb-1 opacity-60">Gorjetas</p>
                                            <p className="text-xl font-black italic tabular-nums">+ R$ {barber.totalGorjetas.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-amber-500 px-10 py-5 rounded-[2rem] text-center shadow-xl min-w-[200px]">
                                            <p className="text-[10px] font-black text-black/40 uppercase mb-1 italic leading-none">Total Líquido</p>
                                            <p className="text-4xl font-black text-black italic leading-none tabular-nums">R$ {totalLiquido.toFixed(2)}</p>
                                        </div>
                                        {expandedBarber === barber.id ? <ChevronUp className="text-amber-500" /> : <ChevronDown className="text-slate-700" />}
                                    </div>
                                </div>

                                {expandedBarber === barber.id && (
                                    <div className="bg-black/60 border-x border-b border-white/10 rounded-b-[3rem] overflow-hidden animate-in slide-in-from-top-4 duration-300 p-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Percent size={18} />
                                                    <span className="text-xs font-black uppercase italic">Taxa de Comissão Serviços (%)</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={barber.currentRate}
                                                    onChange={(e) => updateLocalValue(barber.id, 'currentRate', Number(e.target.value))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-amber-500 font-black text-2xl outline-none focus:border-amber-500/50"
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <MinusCircle size={18} />
                                                    <span className="text-xs font-black uppercase italic">Lançar Vale/Adiantamento (R$)</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={barber.expenses}
                                                    onChange={(e) => updateLocalValue(barber.id, 'expenses', Number(e.target.value))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-red-500 font-black text-2xl outline-none focus:border-red-500/50"
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <button 
                                                    onClick={() => saveBarberChanges(barber.id)}
                                                    disabled={isSaving === barber.id}
                                                    className="flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSaving === barber.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                    Salvar Dados de {barber.name.split(' ')[0]}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-2xl border border-white/5 relative">
                                            <table className="w-full text-left border-separate border-spacing-0">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-900 shadow-sm">
                                                        <th className="px-10 py-5 bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Data/Horário</th>
                                                        <th className="px-10 py-5 bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Serviço / Produto</th>
                                                        <th className="px-10 py-5 bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-right">Preço</th>
                                                        <th className="px-10 py-5 bg-slate-900 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-white/5 text-right italic">Comissão</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 bg-transparent">
                                                    {barber.detalhes.map((v: any) => {
                                                        const isProduct = v.product_commission && v.product_commission > 0;
                                                        const comissaoItem = isProduct ? v.product_commission : (v.service === "Caixinha / Gorjeta" ? 0 : (v.price * (barber.currentRate / 100)));
                                                        
                                                        return (
                                                            <tr key={v.id} className="hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-10 py-4 text-[10px] text-slate-400 font-bold">{new Date(v.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                                <td className="px-10 py-4 text-xs font-black uppercase text-white tracking-tighter flex items-center gap-2">
                                                                    {isProduct ? <Package size={12} className="text-blue-400"/> : <Scissors size={12} className="text-amber-500"/>}
                                                                    {v.service}
                                                                </td>
                                                                <td className="px-10 py-4 text-right text-xs font-bold tabular-nums text-slate-400">R$ {Number(v.price).toFixed(2)}</td>
                                                                <td className="px-10 py-4 text-right text-sm font-black text-amber-500 tabular-nums">R$ {Number(comissaoItem).toFixed(2)}</td>
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
                <div className="bg-amber-500 rounded-[4rem] p-12 flex flex-col xl:flex-row justify-between items-center shadow-[0_30px_90px_rgba(245,158,11,0.3)] mt-12 print:hidden">
                    <div className="flex items-center gap-10">
                        <div className="p-8 bg-black rounded-[2.5rem] shadow-2xl"><Wallet size={48} className="text-amber-500" /></div>
                        <div>
                            <p className="text-[12px] font-black text-black/50 uppercase tracking-[0.3em] mb-3">Total Líquido a Repassar</p>
                            <h3 className="text-7xl font-black text-black italic leading-none tabular-nums">
                                R$ {filteredReportData.reduce((acc, b) => acc + (b.totalComissaoCalculada + b.totalGorjetas - (b.expenses || 0)), 0).toFixed(2)}
                            </h3>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="mt-10 xl:mt-0 bg-black text-amber-500 px-14 py-7 rounded-[2.5rem] font-black uppercase text-sm tracking-widest flex items-center gap-4 hover:scale-105 transition-all shadow-2xl">
                        <Printer size={24} /> Imprimir {selectedBarberId === 'all' ? 'Recibos' : 'Recibo Selecionado'}
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
                                             const comVal = isProd ? v.product_commission : (v.service === "Caixinha / Gorjeta" ? 0 : (v.price * (barber.currentRate / 100)));
                                             return (
                                                <tr key={v.id} className="border-b border-gray-100">
                                                    <td className="py-2">{new Date(v.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                    <td className="py-2 font-bold uppercase">{v.service}</td>
                                                    <td className="py-2 text-right text-gray-400">R$ {Number(v.price).toFixed(2)}</td>
                                                    <td className="py-2 text-right font-bold">R$ {Number(comVal).toFixed(2)}</td>
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
                .react-datepicker { background-color: #0f1115 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 2rem !important; padding: 20px !important; }
                .react-datepicker__header { background-color: #0f1115 !important; }
                .react-datepicker__current-month, .react-datepicker__day-name { color: #94a3b8 !important; font-weight: 800 !important; }
                .react-datepicker__day { color: #f8fafc !important; }
                .react-datepicker__day--in-range { background-color: rgba(245, 158, 11, 0.2) !important; }
                .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { background-color: #f59e0b !important; color: #000 !important; }
            `}</style>
        </div>
    );
};

export default CommissionsModule;