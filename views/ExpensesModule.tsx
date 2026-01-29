import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MinusCircle, Trash2, Tag, 
  ArrowDownCircle, XCircle, Loader2, Plus,
  Banknote, QrCode, CreditCard, HelpCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string; // Novo campo
  date: string;
}

interface ExpensesModuleProps {
  barbershopId: string;
}

const CATEGORIES = ["Geral", "Aluguel", "Produtos", "Marketing", "Limpeza", "Energia/Água", "Internet", "Ferramentas", "Outros"];
const METHODS = ["dinheiro", "pix", "debito", "credito"];

const ExpensesModule: React.FC<ExpensesModuleProps> = ({ barbershopId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Geral');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  const loadExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('date', { ascending: false });

    if (!error && data) {
      setExpenses(data.map(e => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        category: e.category || 'Geral',
        payment_method: e.payment_method || 'dinheiro',
        date: e.date
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadExpenses(); }, [barbershopId]);

  const handleAddExpense = async () => {
    if (!description || !amount) return alert("Preencha descrição e valor!");
    
    setIsAdding(true);
    const { error } = await supabase.from('expenses').insert([{
      barbershop_id: barbershopId,
      description,
      amount: Number(amount),
      category,
      payment_method: paymentMethod,
      date: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
      setDescription('');
      setAmount('');
      await loadExpenses();
    } else {
      alert("Erro ao salvar despesa. Verifique se a coluna 'payment_method' existe no banco.");
    }
    setIsAdding(false);
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'pix': return <QrCode size={14} className="text-teal-400" />;
      case 'dinheiro': return <Banknote size={14} className="text-green-400" />;
      case 'debito': case 'credito': return <CreditCard size={14} className="text-blue-400" />;
      default: return <HelpCircle size={14} className="text-slate-400" />;
    }
  };

  const totalMensal = useMemo(() => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    return expenses
      .filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d >= inicio && d <= fim;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  if (loading) return <div className="p-20 text-center text-red-500 font-black animate-pulse uppercase tracking-[0.4em]">Carregando Custos...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 italic font-black">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULÁRIO */}
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-red-500 border-b border-white/5 pb-4">
            <MinusCircle size={20} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Registrar Saída / Despesa</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase px-2">Descrição</label>
              <input 
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Aluguel, Luz..."
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black outline-none focus:border-red-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase px-2">Valor (R$)</label>
              <input 
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black outline-none focus:border-red-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase px-2">Categoria</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black outline-none focus:border-red-500/40 appearance-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a0b0e]">{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase px-2">Forma de Pagamento</label>
              <select 
                value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black outline-none focus:border-red-500/40 appearance-none"
              >
                {METHODS.map(m => <option key={m} value={m} className="bg-[#0a0b0e] uppercase">{m}</option>)}
              </select>
            </div>
          </div>
          <button 
            onClick={handleAddExpense} disabled={isAdding}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase text-xs"
          >
            {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Lançar Despesa
          </button>
        </div>

        {/* RESUMO TOTAL */}
        <div className="bg-red-600 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <ArrowDownCircle className="absolute -right-6 -bottom-6 w-40 h-40 text-black/10 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Gasto (Mês)</p>
            <h3 className="text-5xl font-black italic text-black tracking-tighter leading-none">
              <span className="text-2xl mr-1">R$</span>
              {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-[#0a0b0e]/50 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-8 py-6">Data</th>
              <th className="px-8 py-6">Descrição</th>
              <th className="px-8 py-6">Pagamento</th>
              <th className="px-8 py-6 text-right">Valor</th>
              <th className="px-8 py-6 text-right px-10">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map(exp => (
              <tr key={exp.id} className="group hover:bg-white/[0.02] transition-all font-black italic">
                <td className="px-8 py-5">
                  <span className="text-white text-xs">{format(new Date(exp.date + 'T00:00:00'), 'dd/MM/yy')}</span>
                </td>
                <td className="px-8 py-5">
                  <p className="text-white text-xs uppercase">{exp.description}</p>
                  <span className="text-[9px] text-slate-500 uppercase">{exp.category}</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                    {getPaymentIcon(exp.payment_method)}
                    <span className="text-[9px] text-slate-400 uppercase">{exp.payment_method}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="text-red-500 text-lg tabular-nums">- R$ {exp.amount.toFixed(2)}</span>
                </td>
                <td className="px-8 py-5 text-right px-10">
                  <button onClick={() => deleteExpense(exp.id)} className="p-3 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpensesModule;