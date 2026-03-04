import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users,
    Plus,
    CheckCircle2,
    TrendingUp,
    Ticket,
    X,
    UserPlus,
    Trash2,
    Edit3,
    Loader2,
    Activity
} from 'lucide-react';

// ─────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    limit_services: number;
    is_active: boolean;
    stripe_price_id?: string;
    stripe_product_id?: string;
}

interface UsageRecord {
    id: string;
    used_at: string;
}

interface Subscriber {
    id: string;
    profiles: { full_name: string; phone: string };
    plan: { name: string; limit_services: number };
    status: string;
    current_period_end: string;
    usage: UsageRecord[];
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function getLastUsed(usage: UsageRecord[]): string | null {
    if (!usage || usage.length === 0) return null;
    return usage
        .slice()
        .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())[0]
        .used_at;
}

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

export default function ClubManagement({ barbershopId }: { barbershopId: string }) {
    const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [newPlan, setNewPlan] = useState({ name: '', description: '', price: '', limit: '' });
    const [newSub, setNewSub] = useState({ customerId: '', planId: '' });

    useEffect(() => {
        if (barbershopId) fetchData();
    }, [barbershopId]);

    // ─────────────────────────────────────
    // FETCH
    // ─────────────────────────────────────

    async function fetchData() {
        setLoading(true);
        try {
            const { data: plansData } = await supabase
                .from('club_plans')
                .select('*')
                .eq('barbershop_id', barbershopId);
            if (plansData) setPlans(plansData);

            const { data: subsData, error: subsError } = await supabase
                .from('club_subscriptions')
                .select(`
                    id,
                    status,
                    current_period_end,
                    profiles:customer_id (
                        full_name,
                        phone
                    ),
                    plan:plan_id (
                        name,
                        limit_services
                    ),
                    usage:club_usage_history (
                        id,
                        used_at
                    )
                `)
                .eq('barbershop_id', barbershopId);

            if (subsError) {
                console.error('❌ Erro na query de assinantes:', subsError.message);
            } else {
                setSubscribers(subsData as any);
            }

            const { data: custData } = await supabase
                .from('customers')
                .select('id, name, phone')
                .eq('barbershop_id', barbershopId)
                .order('name');
            if (custData) setCustomers(custData);

        } catch (error) {
            console.error('Erro geral:', error);
        } finally {
            setLoading(false);
        }
    }

    // ─────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────

    async function handleSavePlan(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            let stripePriceId = null;
            let stripeProductId = null;

            if (!editingPlan) {
                const { data, error: edgeError } = await supabase.functions.invoke('create-club-plan', {
                    body: {
                        name: newPlan.name,
                        description: newPlan.description,
                        amount: parseFloat(newPlan.price),
                        barbershopId: barbershopId
                    }
                });
                if (edgeError) throw edgeError;
                stripePriceId = data.priceId;
                stripeProductId = data.productId;
            }

            const planData = {
                barbershop_id: barbershopId,
                name: newPlan.name,
                description: newPlan.description,
                price: parseFloat(newPlan.price),
                limit_services: parseInt(newPlan.limit),
                stripe_price_id: stripePriceId || editingPlan?.stripe_price_id,
                stripe_product_id: stripeProductId || editingPlan?.stripe_product_id,
            };

            if (editingPlan) {
                await supabase.from('club_plans').update(planData).eq('id', editingPlan.id);
            } else {
                await supabase.from('club_plans').insert([planData]);
            }

            setIsPlanModalOpen(false);
            setEditingPlan(null);
            setNewPlan({ name: '', description: '', price: '', limit: '' });
            fetchData();
        } catch (err: any) {
            alert('Erro ao salvar plano: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeletePlan(plan: Plan) {
        if (!confirm(`Deseja excluir o plano "${plan.name}"?`)) return;
        try {
            if (plan.stripe_product_id) {
                await supabase.functions.invoke('create-club-plan', {
                    method: 'DELETE',
                    body: { productId: plan.stripe_product_id }
                });
            }
            await supabase.from('club_plans').delete().eq('id', plan.id);
            fetchData();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    }

    return (
        <div className="min-h-screen bg-[#0f1115] p-4 sm:p-6 lg:p-8">

            {/* ── HEADER ── */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                        <Ticket className="text-amber-500" size={32} />
                        Clube Barber
                    </h1>
                    <p className="text-xs text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">
                        Gestão de Recorrência e Fidelidade
                    </p>
                </div>

                {/* Botões do header — empilham no mobile */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            setEditingPlan(null);
                            setNewPlan({ name: '', description: '', price: '', limit: '' });
                            setIsPlanModalOpen(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <Plus size={18} /> Novo Plano
                    </button>
                </div>
            </header>

            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

                {/* MRR */}
                <div className="bg-zinc-900/50 border border-white/5 p-5 sm:p-6 rounded-[2rem] backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-amber-500 mb-3">
                        <TrendingUp size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Receita Mensal (MRR)</span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-white italic">
                        R$ {subscribers.reduce((acc, sub) => {
                            const planPrice = plans.find(p => p.name === sub.plan?.name)?.price || 0;
                            return acc + (sub.status === 'active' ? planPrice : 0);
                        }, 0).toFixed(2)}
                    </p>
                </div>

                {/* Assinantes */}
                <div className="bg-zinc-900/50 border border-white/5 p-5 sm:p-6 rounded-[2rem] backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-zinc-400 mb-3">
                        <Users size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Assinantes Ativos</span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-white italic">
                        {subscribers.filter(s => s.status === 'active').length}
                    </p>
                </div>

                {/* Usos no período */}
                <div className="bg-zinc-900/50 border border-white/5 p-5 sm:p-6 rounded-[2rem] backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-zinc-400 mb-3">
                        <Activity size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Usos no Período</span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-white italic">
                        {subscribers.reduce((acc, sub) => acc + (sub.usage?.length ?? 0), 0)}
                    </p>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-2 mb-8 bg-black/20 p-1.5 rounded-2xl w-full sm:w-fit border border-white/5">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                >
                    Planos
                </button>
                <button
                    onClick={() => setActiveTab('subscribers')}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'subscribers' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                >
                    Membros
                </button>
            </div>

            {/* ═══════════════════════════════
                ABA PLANOS
            ═══════════════════════════════ */}
            {activeTab === 'plans' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className="bg-zinc-900/40 border border-white/5 p-7 sm:p-8 rounded-[2.5rem] relative group hover:border-amber-500/30 transition-all flex flex-col h-full"
                        >
                            {/* Botões editar/excluir — sempre visíveis no mobile, hover no desktop */}
                            <div className="absolute top-6 right-6 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setNewPlan({
                                            name: plan.name,
                                            description: plan.description || '',
                                            price: plan.price.toString(),
                                            limit: plan.limit_services.toString()
                                        });
                                        setIsPlanModalOpen(true);
                                    }}
                                    className="p-2.5 bg-zinc-800 hover:bg-amber-500 hover:text-black rounded-full text-zinc-400 transition-all"
                                >
                                    <Edit3 size={15} />
                                </button>
                                <button
                                    onClick={() => handleDeletePlan(plan)}
                                    className="p-2.5 bg-zinc-800 hover:bg-red-500 hover:text-white rounded-full text-zinc-400 transition-all"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter mb-2 pr-20">
                                {plan.name}
                            </h3>
                            <p className="text-zinc-500 text-xs mb-6 line-clamp-2 uppercase font-medium leading-relaxed">
                                {plan.description || 'SEM DESCRIÇÃO'}
                            </p>
                            <div className="mt-auto">
                                <div className="mb-5">
                                    <span className="text-4xl sm:text-5xl font-black text-amber-500 italic">
                                        R$ {plan.price.toFixed(2)}
                                    </span>
                                    <span className="text-zinc-600 text-sm font-bold ml-2">/mês</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <CheckCircle2 size={17} className="text-amber-500 shrink-0" />
                                    <span className="text-sm font-black uppercase italic tracking-wider">
                                        {plan.limit_services} serviços mensais
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty state */}
                    {plans.length === 0 && !loading && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600">
                            <Ticket size={48} className="mb-4 opacity-30" />
                            <p className="text-sm font-black uppercase tracking-widest">Nenhum plano cadastrado</p>
                        </div>
                    )}
                </div>

            ) : (

                /* ═══════════════════════════════
                   ABA MEMBROS
                ═══════════════════════════════ */
                <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">

                    {/* ── MOBILE: cards empilhados ── */}
                    <div className="block sm:hidden divide-y divide-white/5">
                        {subscribers.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500 uppercase font-black text-xs tracking-widest">
                                Nenhum assinante encontrado
                            </div>
                        ) : (
                            subscribers.map(sub => {
                                const usageCount = sub.usage?.length ?? 0;
                                const limit = sub.plan?.limit_services ?? 0;
                                const lastUsed = getLastUsed(sub.usage ?? []);
                                const usageRatio = limit > 0 ? usageCount / limit : 0;
                                const usageColor =
                                    usageRatio >= 1 ? 'text-red-400' :
                                        usageRatio >= 0.75 ? 'text-amber-400' :
                                            'text-green-400';

                                return (
                                    <div key={sub.id} className="p-5 flex flex-col gap-3">
                                        {/* Nome + Status */}
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-black uppercase italic text-base text-white leading-tight">
                                                {sub.profiles?.full_name || 'Nome não encontrado'}
                                            </p>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0 ${sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                                    {sub.status === 'active' ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Telefone */}
                                        <p className="text-sm font-mono text-zinc-400">
                                            {sub.profiles?.phone || '—'}
                                        </p>

                                        {/* Plano + Usos */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-zinc-300 bg-white/5 px-3 py-1 rounded-full">
                                                {sub.plan?.name || '—'}
                                            </span>
                                            <span>
                                                <span className={`text-base font-black italic ${usageColor}`}>{usageCount}</span>
                                                <span className="text-zinc-600 text-xs font-bold"> / {limit} usos</span>
                                            </span>
                                        </div>

                                        {/* Datas */}
                                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                                            <span>
                                                Último uso:{' '}
                                                <span className="text-zinc-400">
                                                    {lastUsed ? new Date(lastUsed).toLocaleDateString('pt-BR') : '—'}
                                                </span>
                                            </span>
                                            <span>
                                                Expira:{' '}
                                                <span className="text-zinc-400">
                                                    {sub.current_period_end
                                                        ? new Date(sub.current_period_end).toLocaleDateString('pt-BR')
                                                        : '--/--/----'
                                                    }
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* ── DESKTOP: tabela ── */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-white">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Membro</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Telefone</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Plano</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500 text-center">Usos</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Último Uso</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Status</th>
                                    <th className="p-5 lg:p-6 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Expira em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {subscribers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-zinc-500 uppercase font-black text-sm tracking-widest">
                                            Nenhum assinante encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    subscribers.map(sub => {
                                        const usageCount = sub.usage?.length ?? 0;
                                        const limit = sub.plan?.limit_services ?? 0;
                                        const lastUsed = getLastUsed(sub.usage ?? []);
                                        const usageRatio = limit > 0 ? usageCount / limit : 0;
                                        const usageColor =
                                            usageRatio >= 1 ? 'text-red-400' :
                                                usageRatio >= 0.75 ? 'text-amber-400' :
                                                    'text-green-400';

                                        return (
                                            <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-5 lg:p-6">
                                                    <p className="font-black uppercase italic text-sm lg:text-base text-white">
                                                        {sub.profiles?.full_name || 'Nome não encontrado'}
                                                    </p>
                                                </td>
                                                <td className="p-5 lg:p-6">
                                                    <p className="text-sm font-mono text-zinc-400">
                                                        {sub.profiles?.phone || '—'}
                                                    </p>
                                                </td>
                                                <td className="p-5 lg:p-6 text-sm font-bold text-zinc-300">
                                                    {sub.plan?.name || '—'}
                                                </td>
                                                <td className="p-5 lg:p-6 text-center">
                                                    <span className={`text-base font-black italic ${usageColor}`}>
                                                        {usageCount}
                                                    </span>
                                                    <span className="text-zinc-600 text-xs font-bold"> / {limit}</span>
                                                </td>
                                                <td className="p-5 lg:p-6 text-sm font-black text-zinc-400">
                                                    {lastUsed
                                                        ? new Date(lastUsed).toLocaleDateString('pt-BR')
                                                        : <span className="text-zinc-600">—</span>
                                                    }
                                                </td>
                                                <td className="p-5 lg:p-6">
                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full w-fit ${sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        <span className="text-xs font-black uppercase tracking-tighter">
                                                            {sub.status === 'active' ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 lg:p-6 text-right text-sm font-black text-zinc-400">
                                                    {sub.current_period_end
                                                        ? new Date(sub.current_period_end).toLocaleDateString('pt-BR')
                                                        : '--/--/----'
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════
                MODAL — NOVO / EDITAR PLANO
            ═══════════════════════════════════════ */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]">
                    <div className="bg-[#16181d] border border-white/10 rounded-t-[2.5rem] sm:rounded-[3rem] p-7 sm:p-8 w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

                        <div className="flex justify-between items-center mb-7">
                            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
                                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                            </h2>
                            <button
                                onClick={() => setIsPlanModalOpen(false)}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="text-zinc-400 hover:text-white" size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2 italic">
                                    Nome do Plano
                                </label>
                                <input
                                    required
                                    placeholder="EX: VIP GOLD"
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 transition-all font-bold placeholder:text-zinc-700"
                                    value={newPlan.name}
                                    onChange={e => setNewPlan({ ...newPlan, name: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2 italic">
                                    Descrição
                                </label>
                                <textarea
                                    placeholder="O que o plano oferece?"
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 transition-all min-h-[90px] font-medium uppercase placeholder:text-zinc-700 resize-none"
                                    value={newPlan.description}
                                    onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2 italic">
                                        Preço (R$)
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 font-bold"
                                        value={newPlan.price}
                                        onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2 italic">
                                        Serviços/mês
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 font-bold"
                                        value={newPlan.limit}
                                        onChange={e => setNewPlan({ ...newPlan, limit: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <Loader2 className="animate-spin" size={18} />
                                    : editingPlan ? 'Salvar Alterações' : 'Publicar Plano'
                                }
                            </button>
                        </form>
                    </div>
                </div>
            )}         
        </div>
    );
}
