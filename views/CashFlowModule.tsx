import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Wallet, Play, Lock, Unlock, Calculator, CheckCircle2,
    AlertCircle, Loader2, History, Banknote, TrendingUp, ArrowRight, MinusCircle
} from 'lucide-react';

interface CashFlowProps {
    barbershopId: string;
    appointments: any[];
}

const CashFlowModule: React.FC<CashFlowProps> = ({ barbershopId, appointments }) => {
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [initialValue, setInitialValue] = useState<string>('');
    const [finalValue, setFinalValue] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [dayStats, setDayStats] = useState({
        moneySales: 0,
        pixSales: 0,
        cardSales: 0,
        packageSales: 0,
        totalExpected: 0
    });

    const loadData = async () => {
        setLoading(true);
        const { data: active } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('barbershop_id', barbershopId)
            .eq('status', 'open')
            .maybeSingle();

        const { data: history } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('barbershop_id', barbershopId)
            .eq('status', 'closed')
            .order('closed_at', { ascending: false })
            .limit(5);

        if (!active && history && history.length > 0) {
            setInitialValue(history[0].final_value.toString());
        }

        if (active) {
            setCurrentSession(active);
            const openingDate = new Date(active.opened_at).toLocaleDateString('pt-BR');
            const salesToday = appointments.filter(app => {
                const appDate = new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR');
                return app.status === 'finalizado' && appDate === openingDate;
            });
            const money = salesToday
                .filter(s => s.payment_method?.toLowerCase().includes('dinheiro'))
                .reduce((acc, curr) => acc + Number(curr.price || 0), 0);

            const pix = salesToday
                .filter(s => s.payment_method?.toLowerCase().includes('pix'))
                .reduce((acc, curr) => acc + Number(curr.price || 0), 0);

            const cards = salesToday
                .filter(s => s.payment_method?.toLowerCase().includes('credito') ||
                    s.payment_method?.toLowerCase().includes('debito'))
                .reduce((acc, curr) => acc + Number(curr.price || 0), 0);

            const packages = salesToday
                .filter(s => s.payment_method?.toLowerCase().includes('pacote'))
                .reduce((acc, curr) => acc + Number(curr.price || 0), 0);

            setDayStats({
                moneySales: money,
                pixSales: pix,
                cardSales: cards,
                packageSales: packages,
                totalExpected: Number(active.initial_value) + money
            });
        } else {
            setCurrentSession(null);
        }

        if (history) setPastSessions(history);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [barbershopId, appointments]);

    const handleOpenBox = async () => {
        if (!initialValue) return alert("Informe o fundo de reserva!");
        setActionLoading(true);
        const { error } = await supabase.from('cash_flow').insert([{
            barbershop_id: barbershopId,
            initial_value: Number(initialValue),
            status: 'open',
            opened_at: new Date().toISOString()
        }]);
        if (!error) await loadData();
        setActionLoading(false);
    };

    const handleCloseBox = async () => {
        if (!finalValue) return alert("Informe o valor que ficou na gaveta!");
        setActionLoading(true);

        const valorNaGaveta = Number(finalValue);
        const valorEsperado = dayStats.totalExpected;
        const diferenca = valorNaGaveta - valorEsperado;

        try {
            const { error } = await supabase
                .from('cash_flow')
                .update({
                    final_value: valorNaGaveta,
                    expected_value: valorEsperado,
                    status: 'closed',
                    closed_at: new Date().toISOString()
                })
                .eq('id', currentSession.id);

            if (error) throw error;

            alert(diferenca < 0
                ? `Caixa Fechado! Retirada de R$ ${Math.abs(diferenca).toFixed(2)} identificada.`
                : "Caixa Fechado com Sucesso!");

            setFinalValue('');
            await loadData();
        } catch (err) {
            alert("Erro ao fechar caixa.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="p-10 lg:p-20 text-center text-amber-500 font-black animate-pulse uppercase tracking-[0.3em] lg:tracking-[0.4em] text-xs lg:text-sm">
            Sincronizando Gaveta...
        </div>
    );

    return (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500 italic font-black">

            {!currentSession ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start">
                    {/* 🔥 TELA DE ABERTURA - RESPONSIVA */}
                    <div className="bg-[#0a0b0e] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 shadow-2xl text-center">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-amber-500/10 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 text-amber-500">
                            <Unlock size={24} className="lg:w-8 lg:h-8" />
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl text-white uppercase tracking-tighter mb-2 italic leading-none">
                            Abertura de <span className="text-amber-500">Caixa</span>
                        </h2>
                        <p className="text-slate-500 text-[8px] lg:text-[9px] uppercase tracking-widest mb-6 lg:mb-8 text-center italic">
                            Valor sugerido do último fechamento
                        </p>
                        
                        <div className="space-y-3 lg:space-y-4 font-black italic">
                            <div className="bg-black/40 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6 flex items-center gap-3 lg:gap-4">
                                <Wallet className="text-amber-500 flex-shrink-0" size={20} />
                                <input
                                    type="number"
                                    value={initialValue}
                                    onChange={(e) => setInitialValue(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-white text-2xl sm:text-3xl lg:text-4xl outline-none w-full tabular-nums font-black italic min-h-[44px]"
                                />
                            </div>
                            <button 
                                onClick={handleOpenBox} 
                                className="w-full bg-white text-black py-4 lg:py-6 rounded-xl lg:rounded-2xl uppercase text-[10px] lg:text-xs tracking-widest hover:bg-amber-500 transition-all shadow-xl font-black italic min-h-[48px] flex items-center justify-center"
                            >
                                Confirmar Abertura
                            </button>
                        </div>
                    </div>

                    {/* 🔥 HISTÓRICO DE FECHAMENTOS - RESPONSIVO */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 font-black italic">
                        <h4 className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mb-4 lg:mb-8 flex items-center gap-2">
                            <History size={14} className="flex-shrink-0" /> Últimos Fechamentos
                        </h4>
                        <div className="space-y-3 lg:space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {pastSessions.map(s => {
                                const diff = Number(s.final_value) - Number(s.expected_value);
                                return (
                                    <div key={s.id} className="bg-black/40 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-white/5 space-y-3 lg:space-y-4">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[9px] lg:text-[10px] text-white uppercase truncate">
                                                {new Date(s.closed_at).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className={`text-[7px] lg:text-[8px] uppercase px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0 ${diff < 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {diff < 0 ? 'Houve Retirada' : 'Caixa Batido'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 lg:gap-4 pt-2 border-t border-white/5">
                                            <div>
                                                <p className="text-[7px] lg:text-[8px] text-slate-500 uppercase mb-1">Ficou na Gaveta</p>
                                                <p className="text-xs lg:text-sm text-white tabular-nums font-black italic break-all">
                                                    R$ {Number(s.final_value).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[7px] lg:text-[8px] text-slate-500 uppercase mb-1">Valor Retirado</p>
                                                <p className={`text-xs lg:text-sm tabular-nums font-black italic break-all ${diff < 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                    R$ {diff < 0 ? Math.abs(diff).toFixed(2) : '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* 🔥 PAINEL ATIVO - RESPONSIVO */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 italic font-black">
                    <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                        {/* 🔥 SALDO PRINCIPAL */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] lg:text-[10px] text-green-500 uppercase mb-2 italic font-black leading-none">
                                    Saldo Atual na Gaveta (Dinheiro)
                                </p>
                                <h3 className="text-3xl sm:text-4xl lg:text-6xl text-white tracking-tighter italic tabular-nums leading-none font-black break-all">
                                    R$ {dayStats.totalExpected.toFixed(2)}
                                </h3>
                            </div>
                            <TrendingUp size={32} className="lg:w-12 lg:h-12 text-green-500 opacity-20 flex-shrink-0" />
                        </div>

                        {/* 🔥 GRID DE VALORES - SUPER RESPONSIVO */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 uppercase text-[9px] lg:text-[10px] italic font-black leading-none">
                            <div className="bg-white/[0.03] p-3 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/5">
                                <span className="text-slate-500 block mb-1.5 lg:mb-2 font-black text-[8px] lg:text-[10px]">Troco</span>
                                <span className="text-white text-sm lg:text-lg tabular-nums block break-all">
                                    R$ {Number(currentSession.initial_value).toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-green-500/5 p-3 lg:p-5 rounded-2xl lg:rounded-3xl border border-green-500/10">
                                <span className="text-green-500 block mb-1.5 lg:mb-2 font-black text-[8px] lg:text-[10px]">Dinheiro</span>
                                <span className="text-white text-sm lg:text-lg tabular-nums block break-all">
                                    + R$ {dayStats.moneySales.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-blue-500/5 p-3 lg:p-5 rounded-2xl lg:rounded-3xl border border-blue-500/10">
                                <span className="text-blue-500 block mb-1.5 lg:mb-2 font-black text-[8px] lg:text-[10px]">PIX</span>
                                <span className="text-white text-sm lg:text-lg tabular-nums block break-all">
                                    R$ {dayStats.pixSales.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-purple-500/5 p-3 lg:p-5 rounded-2xl lg:rounded-3xl border border-purple-500/10">
                                <span className="text-purple-500 block mb-1.5 lg:mb-2 font-black text-[8px] lg:text-[10px] leading-tight">
                                    Cartão / Combo
                                </span>
                                <span className="text-white text-sm lg:text-lg tabular-nums block break-all">
                                    R$ {(dayStats.cardSales + dayStats.packageSales).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* 🔥 ALERTA DE CONFERÊNCIA */}
                        <div className="bg-amber-500/5 border border-amber-500/10 p-4 lg:p-6 rounded-2xl lg:rounded-3xl flex items-start gap-2 lg:gap-3 font-black italic">
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="text-[9px] lg:text-[10px] text-amber-500 uppercase italic font-black leading-tight break-words">
                                Conferência: O faturamento total registrado hoje é R$ {(dayStats.moneySales + dayStats.pixSales + dayStats.cardSales + dayStats.packageSales).toFixed(2)}.
                            </span>
                        </div>
                    </div>

                    {/* 🔥 PAINEL DE FECHAMENTO - RESPONSIVO */}
                    <div className="bg-[#0f1115] border border-white/10 rounded-2xl lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 space-y-6 lg:space-y-8 shadow-2xl font-black italic">
                        <h4 className="text-red-500 uppercase text-[10px] lg:text-xs tracking-widest flex items-center gap-2 italic font-black leading-none">
                            <Lock size={14} className="flex-shrink-0" /> Encerrar Dia
                        </h4>
                        
                        <div className="space-y-3 lg:space-y-4 font-black italic">
                            <label className="text-[9px] lg:text-[10px] text-slate-500 uppercase pl-2 font-black italic leading-none block">
                                Total que FICARÁ na Gaveta
                            </label>
                            <div className="bg-black/40 border border-white/5 rounded-xl lg:rounded-2xl p-4 lg:p-6 flex items-center gap-3 lg:gap-4">
                                <Calculator className="text-slate-600 flex-shrink-0" size={20} />
                                <input
                                    type="number"
                                    value={finalValue}
                                    onChange={(e) => setFinalValue(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-white text-2xl lg:text-3xl outline-none w-full tabular-nums font-black italic min-h-[44px]"
                                />
                            </div>
                            <p className="text-[8px] lg:text-[9px] text-slate-500 uppercase tracking-tighter px-2 leading-tight break-words">
                                A diferença entre o esperado (R$ {dayStats.totalExpected.toFixed(2)}) e este valor será registrada como retirada.
                            </p>
                        </div>
                        
                        <button 
                            onClick={handleCloseBox} 
                            disabled={actionLoading} 
                            className="w-full bg-red-600 text-white py-4 lg:py-6 rounded-xl lg:rounded-2xl uppercase text-[9px] lg:text-[10px] font-black tracking-[0.2em] shadow-xl hover:bg-red-500 transition-all min-h-[48px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={18} /> : "Confirmar e Fechar Caixa"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashFlowModule;
