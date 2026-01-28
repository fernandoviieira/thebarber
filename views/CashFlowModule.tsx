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
            const openingDate = active.opened_at.split('T')[0];
            const salesToday = appointments.filter(app =>
                app.status === 'confirmado' &&
                app.date === openingDate
            );

            const money = salesToday.filter(s => s.payment_method === 'dinheiro').reduce((acc, curr) => acc + Number(curr.price), 0);
            const pix = salesToday.filter(s => s.payment_method === 'pix').reduce((acc, curr) => acc + Number(curr.price), 0);
            const cards = salesToday.filter(s => ['credito', 'debito'].includes(s.payment_method)).reduce((acc, curr) => acc + Number(curr.price), 0);
            const packages = salesToday.filter(s => s.payment_method === 'pacote').reduce((acc, curr) => acc + Number(curr.price), 0);

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

    if (loading) return <div className="p-20 text-center text-amber-500 font-black animate-pulse uppercase tracking-[0.4em]">Sincronizando Gaveta...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 italic font-black">

            {!currentSession ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* TELA DE ABERTURA */}
                    <div className="bg-[#0a0b0e] border border-white/5 rounded-[3rem] p-10 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500"><Unlock size={32} /></div>
                        <h2 className="text-3xl text-white uppercase tracking-tighter mb-2 italic">Abertura de <span className="text-amber-500">Caixa</span></h2>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest mb-8 text-center italic">Valor sugerido do último fechamento</p>
                        <div className="space-y-4 font-black italic">
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                                <Wallet className="text-amber-500" size={24} />
                                <input
                                    type="number"
                                    value={initialValue}
                                    onChange={(e) => setInitialValue(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-white text-4xl outline-none w-full tabular-nums font-black italic"
                                />
                            </div>
                            <button onClick={handleOpenBox} className="w-full bg-white text-black py-6 rounded-2xl uppercase text-xs tracking-widest hover:bg-amber-500 transition-all shadow-xl font-black italic">Confirmar Abertura</button>
                        </div>
                    </div>

                    {/* HISTÓRICO DE FECHAMENTOS DETALHADO */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 font-black italic">
                        <h4 className="text-xs text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2"><History size={16} /> Últimos Fechamentos</h4>
                        <div className="space-y-4">
                            {pastSessions.map(s => {
                                const diff = Number(s.final_value) - Number(s.expected_value);
                                return (
                                    <div key={s.id} className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-white uppercase">{new Date(s.closed_at).toLocaleDateString()}</span>
                                            <span className={`text-[8px] uppercase px-2 py-1 rounded-lg ${diff < 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {diff < 0 ? 'Houve Retirada' : 'Caixa Batido'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                            <div>
                                                <p className="text-[8px] text-slate-500 uppercase">Ficou na Gaveta</p>
                                                <p className="text-sm text-white tabular-nums font-black italic">R$ {Number(s.final_value).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-slate-500 uppercase">Valor Retirado</p>
                                                <p className={`text-sm tabular-nums font-black italic ${diff < 0 ? 'text-amber-500' : 'text-slate-400'}`}>
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
                /* PAINEL ATIVO */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 italic font-black">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-[3rem] p-10 flex items-center justify-between shadow-2xl">
                            <div>
                                <p className="text-[10px] text-green-500 uppercase mb-2 italic font-black leading-none">Saldo Atual na Gaveta (Dinheiro)</p>
                                <h3 className="text-6xl text-white tracking-tighter italic tabular-nums leading-none font-black">R$ {dayStats.totalExpected.toFixed(2)}</h3>
                            </div>
                            <TrendingUp size={48} className="text-green-500 opacity-20" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 uppercase text-[10px] italic font-black leading-none">
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                <span className="text-slate-500 block mb-2 font-black">Troco</span>
                                <span className="text-white text-lg tabular-nums">R$ {Number(currentSession.initial_value).toFixed(2)}</span>
                            </div>
                            <div className="bg-green-500/5 p-5 rounded-3xl border border-green-500/10">
                                <span className="text-green-500 block mb-2 font-black">Dinheiro</span>
                                <span className="text-white text-lg tabular-nums">+ R$ {dayStats.moneySales.toFixed(2)}</span>
                            </div>
                            <div className="bg-blue-500/5 p-5 rounded-3xl border border-blue-500/10">
                                <span className="text-blue-500 block mb-2 font-black">PIX</span>
                                <span className="text-white text-lg tabular-nums">R$ {dayStats.pixSales.toFixed(2)}</span>
                            </div>
                            <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/10">
                                <span className="text-purple-500 block mb-2 font-black">Cartão / Combo</span>
                                <span className="text-white text-lg tabular-nums">R$ {(dayStats.cardSales + dayStats.packageSales).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl flex items-center gap-3 font-black italic">
                            <AlertCircle size={16} className="text-amber-500" />
                            <span className="text-[10px] text-amber-500 uppercase italic font-black leading-tight">
                                Conferência: O faturamento total registrado hoje é R$ {(dayStats.moneySales + dayStats.pixSales + dayStats.cardSales + dayStats.packageSales).toFixed(2)}.
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#0f1115] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl font-black italic">
                        <h4 className="text-red-500 uppercase text-xs tracking-widest flex items-center gap-2 italic font-black leading-none"><Lock size={16} /> Encerrar Dia</h4>
                        <div className="space-y-4 font-black italic">
                            <label className="text-[10px] text-slate-500 uppercase pl-2 font-black italic leading-none">Total que FICARÁ na Gaveta</label>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
                                <Calculator className="text-slate-600" size={24} />
                                <input
                                    type="number"
                                    value={finalValue}
                                    onChange={(e) => setFinalValue(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent text-white text-3xl outline-none w-full tabular-nums font-black italic"
                                />
                            </div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-tighter px-2">A diferença entre o esperado (R$ {dayStats.totalExpected.toFixed(2)}) e este valor será registrada como retirada.</p>
                        </div>
                        <button onClick={handleCloseBox} disabled={actionLoading} className="w-full bg-red-600 text-white py-6 rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] shadow-xl hover:bg-red-500 transition-all">
                            {actionLoading ? <Loader2 className="animate-spin" /> : "Confirmar e Fechar Caixa"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashFlowModule;