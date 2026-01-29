import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart, Loader2, HeartHandshake, Plus, Minus, Crown,
  Search, User, Trash2, UserPlus, CheckCircle2, Banknote, QrCode, CreditCard, History, AlertTriangle
} from 'lucide-react';

interface CheckoutProps {
  barbershopId: string;
  barbers: any[];
  services: any[];
  inventory: any[];
  customers: any[];
  machineFees: any;
  onSuccess: () => void;
}

const CheckoutModule: React.FC<CheckoutProps> = ({
  barbershopId, barbers, services, inventory, customers, machineFees, onSuccess
}) => {
  const [pdvItems, setPdvItems] = useState<any[]>([]);
  const [localInventory, setLocalInventory] = useState<any[]>(inventory);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isVipMode, setIsVipMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('dinheiro');
  const [fees, setFees] = useState<any>({ fee_debito: 0, fee_credito: 0, fee_pix: 0, fee_dinheiro: 0 });

  const [splitValues, setSplitValues] = useState<Record<string, number>>({
    dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0
  });

  const [tip, setTip] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCashSession, setActiveCashSession] = useState<any>(null);
  const [checkingCash, setCheckingCash] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('barbershop_settings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();
      if (data) setFees(data);
    };
    fetchSettings();
  }, [barbershopId]);

  useEffect(() => { setLocalInventory(inventory); }, [inventory]);

  useEffect(() => {
    const checkCash = async () => {
      const { data } = await supabase
        .from('cash_flow')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'open')
        .maybeSingle();
      setActiveCashSession(data);
      setCheckingCash(false);
    };
    checkCash();
  }, [barbershopId]);

  const activePkg = useMemo(() => {
    if (!selectedCustomer?.customer_packages) return null;
    return selectedCustomer.customer_packages.find((p: any) =>
      Number(p.used_credits) < Number(p.total_credits)
    );
  }, [selectedCustomer]);

  const getItemPrice = (item: any) => {
    if (paymentMethod === 'pacote' && item.type === 'servico' && activePkg) {
      return Number(activePkg.used_credits) === 0 ? Number(activePkg.price_paid) : 0;
    }
    return Number(item.price || 0);
  };

  // VALOR BRUTO (SOMENTE ITENS)
  const totalFinal = pdvItems.reduce((acc, item) =>
    acc + (Number(getItemPrice(item)) * Number(item.quantity)), 0
  );

  // SOMA DOS INPUTS DE PAGAMENTO
  const totalPagoInput = Object.values(splitValues).reduce((acc, curr) =>
    Number(acc) + Number(curr), 0
  ) as number;

  const addItem = (item: any, type: 'servico' | 'produto') => {
    setPdvItems(prev => {
      const existing = prev.find(i => i.originalId === item.id);
      if (existing) return prev.map(i => i.originalId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        id: Math.random().toString(),
        originalId: item.id,
        name: item.name,
        price: Number(item.price || item.price_sell) || 0,
        type,
        quantity: 1
      }];
    });
  };

  const handleUpdateQuantity = (originalId: string, delta: number) => {
    setPdvItems(prev => prev.map(item => {
      if (item.originalId === originalId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const saveFees = async () => {
    setLoading(true);
    try {
      await supabase.from('barbershop_settings').upsert({
        barbershop_id: barbershopId,
        fee_debito: fees.fee_debito,
        fee_credito: fees.fee_credito,
        fee_pix: fees.fee_pix,
        fee_dinheiro: fees.fee_dinheiro,
      }, { onConflict: 'barbershop_id' });
      alert("Taxas atualizadas!");
    } catch (err) { alert("Erro ao salvar taxas."); } finally { setLoading(false); }
  };

  const handleFinalize = async () => {
    if (!activeCashSession) return alert("CAIXA FECHADO!");
    if (!selectedBarber) return alert("Selecione o profissional!");

    if (totalPagoInput < totalFinal && paymentMethod !== 'pacote') {
      const confirm = window.confirm(`O valor informado (R$ ${totalPagoInput.toFixed(2)}) é menor que o total. Deseja finalizar?`);
      if (!confirm) return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const methodsUsed = (Object.entries(splitValues) as [string, number][])
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k.toUpperCase()}(${v.toFixed(2)})`)
        .join(' + ') || paymentMethod;

      // Criamos uma cópia do inventário atual para atualizar o estado no final
      let updatedInventory = [...localInventory];

      for (const item of pdvItems) {
        // Lógica de Appointments
        for (let q = 0; q < item.quantity; q++) {
          await supabase.from('appointments').insert([{
            barbershop_id: barbershopId,
            customer_name: isVipMode && selectedCustomer ? selectedCustomer.name : "Venda Direta",
            service: item.name,
            barber: selectedBarber,
            date: today,
            time: time,
            price: getItemPrice(item),
            payment_method: methodsUsed,
            status: 'confirmado',
            customer_phone: selectedCustomer?.phone || 'Balcão',
            is_package_redemption: paymentMethod === 'pacote' && item.type === 'servico',
            tip_amount: 0
          }]);
        }

        // Lógica de Estoque
        if (item.type === 'produto') {
          const prodIndex = updatedInventory.findIndex(p => p.id === item.originalId);
          if (prodIndex !== -1) {
            const newStock = updatedInventory[prodIndex].current_stock - item.quantity;

            // Atualiza no Banco
            await supabase
              .from('inventory')
              .update({ current_stock: newStock })
              .eq('id', item.originalId);

            // Atualiza na nossa cópia local
            updatedInventory[prodIndex] = {
              ...updatedInventory[prodIndex],
              current_stock: newStock
            };
          }
        }
      }

      // Gorjeta
      if (tip > 0) {
        await supabase.from('appointments').insert([{
          barbershop_id: barbershopId, service: "Caixinha", barber: selectedBarber, date: today, time: time,
          price: tip, payment_method: methodsUsed, status: 'confirmado', tip_amount: tip
        }]);
      }

      // Sincroniza o estado local com os novos valores de estoque
      setLocalInventory(updatedInventory);

      // Finalização
      onSuccess(); // Aqui o pai deve atualizar os dados globais se necessário
      setPdvItems([]);
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0 });
      setTip(0);

      alert("Venda finalizada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };
  const inputClassName = "bg-transparent text-right w-full outline-none font-black text-white text-lg appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-[#0a0b0e] min-h-screen text-slate-200 font-bold italic">
      <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {!activeCashSession && !checkingCash && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 animate-pulse">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <h5 className="text-white uppercase font-black text-xl">Caixa Fechado</h5>
              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mt-1">Abra o movimento para lançar.</p>
            </div>
          </div>
        )}

        {/* ... Seção de Barbeiros, Taxas e Catálogo permanecem iguais ... */}
        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] space-y-6 mt-10">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
              <History className="text-blue-500" size={24} /> Configurar Taxas (%)
            </h4>
            <button onClick={saveFees} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-[10px] uppercase font-black transition-all">
              {loading ? <Loader2 className="animate-spin" size={14} /> : "Salvar Taxas"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Débito', key: 'fee_debito' },
              { label: 'Crédito', key: 'fee_credito' },
              { label: 'PIX', key: 'fee_pix' },
              { label: 'Dinheiro', key: 'fee_dinheiro' }
            ].map((f) => (
              <div key={f.key} className="bg-black/40 p-4 rounded-3xl border border-white/5">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={fees[f.key] || 0} onChange={(e) => setFees({ ...fees, [f.key]: Number(e.target.value) })} className="bg-transparent text-white font-black text-xl outline-none w-full appearance-none" />
                  <span className="text-slate-600 font-black">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/[0.03] border border-white/10 p-2 rounded-[2.5rem] flex flex-col">
            <div className="flex p-1 gap-1">
              <button onClick={() => { setIsVipMode(false); setSelectedCustomer(null); }} className={`flex-1 py-4 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all ${!isVipMode ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                <UserPlus size={14} className="inline mr-1" /> Balcão
              </button>
              <button onClick={() => setIsVipMode(true)} className={`flex-1 py-4 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all ${isVipMode ? 'bg-amber-500 text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                <Crown size={14} className="inline mr-1" /> Cliente VIP
              </button>
            </div>
            <div className="p-4 pt-2 font-black">
              {isVipMode ? (
                !selectedCustomer ? (
                  <select className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold outline-none italic" onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}>
                    <option value="">Localizar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center justify-between bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-xl text-black"><User size={20} /></div>
                      <div className="leading-none">
                        <p className="text-xs font-black uppercase italic">{selectedCustomer.name}</p>
                        {activePkg && <p className="text-[9px] text-amber-500 font-bold mt-1 uppercase italic">Saldo: {activePkg.total_credits - activePkg.used_credits} cortes</p>}
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                )
              ) : <div className="py-4 text-center opacity-40 italic text-[10px] font-bold uppercase tracking-widest leading-none">Atendimento Direto</div>}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-center">
            <label className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 block italic">Gorjeta (Caixinha)</label>
            <div className="flex items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
              <HeartHandshake className="text-green-500" size={24} />
              <input type="number" value={tip || ''} onChange={e => setTip(Number(e.target.value))} className={inputClassName.replace("text-lg", "text-3xl")} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {barbers.map(b => (
            <button key={b.id} onClick={() => setSelectedBarber(b.name)} className={`p-4 rounded-2xl border text-[10px] font-black uppercase transition-all ${selectedBarber === b.name ? 'bg-amber-500 text-black border-amber-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="space-y-6 text-white italic">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input type="text" placeholder="Buscar no catálogo..." className="w-full bg-white/[0.03] border border-white/10 rounded-full py-5 pl-16 text-white outline-none focus:border-amber-500/50" onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-bold italic">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] pl-4 text-amber-500/50">Serviços</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                  <button
                    key={s.id}
                    onClick={() => addItem(s, 'servico')}
                    className="w-full flex justify-between p-5 bg-amber-500/5 border-l-4 border-l-amber-500 border-y border-r border-white/5 rounded-3xl hover:bg-amber-500 hover:text-black transition-all leading-none group"
                  >
                    <div className="text-left">
                      <p className="text-xs uppercase font-black italic group-hover:text-black transition-colors">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-500/20 text-amber-500 group-hover:bg-black/20 group-hover:text-black">
                          Procedimento
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                      <span className="font-black italic text-xs text-amber-500 group-hover:text-black">
                        R$ {Number(s.price).toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] pl-4 text-blue-400/50">Produtos</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {localInventory.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p, 'produto')}
                    className="w-full flex justify-between p-5 bg-blue-500/5 border-l-4 border-l-blue-500 border-y border-r border-white/5 rounded-3xl hover:bg-blue-600 hover:text-white transition-all leading-none group"
                  >
                    <div className="text-left">
                      <p className="text-xs uppercase font-black italic group-hover:text-white transition-colors">{p.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${p.current_stock > 5 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                          Estoque: {p.current_stock}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                      <span className="font-black italic text-xs text-blue-400 group-hover:text-white">
                        R$ {Number(p.price_sell).toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA CHECKOUT */}
      <div className="w-full lg:w-[550px]">
        <div className="sticky top-6 bg-[#0f1115] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl">
          <h4 className="text-2xl font-black text-white italic uppercase flex items-center gap-4">
            <ShoppingCart className="text-amber-500" size={28} /> Checkout
          </h4>

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {pdvItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-3xl border border-white/5 font-bold italic">
                <div className="flex-1 mr-4 leading-tight">
                  <p className="text-xs font-black uppercase text-white truncate italic">{item.name}</p>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{getItemPrice(item) === 0 ? "ISENTO (COMBO)" : `R$ ${getItemPrice(item).toFixed(2)}`}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-black/40 p-2 px-3 rounded-2xl border border-white/5">
                    <button onClick={() => handleUpdateQuantity(item.originalId, -1)} className="text-slate-500 hover:text-amber-500"><Minus size={14} /></button>
                    <span className="text-sm font-black tabular-nums text-white">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.originalId, 1)} className="text-slate-500 hover:text-amber-500"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => setPdvItems(pdvItems.filter(i => i.originalId !== item.originalId))} className="text-red-500/20 hover:text-red-500 p-1 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {/* GORJETA NO CARRINHO */}
            {tip > 0 && (
              <div className="flex items-center justify-between p-5 bg-green-500/10 rounded-3xl border border-green-500/20 font-bold italic animate-in fade-in slide-in-from-right-2">
                <div className="flex items-center gap-3 text-green-500">
                  <HeartHandshake size={20} />
                  <div className="leading-none">
                    <p className="text-xs font-black uppercase italic">Gorjeta / Caixinha</p>
                    <p className="text-[9px] uppercase font-bold mt-1 tracking-widest">Valor do Cliente</p>
                  </div>
                </div>
                <p className="text-xl font-black text-white italic">R$ {tip.toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="space-y-5 pt-6 border-t border-white/5">
            <p className="text-xs uppercase font-black text-slate-500 text-center tracking-[0.2em]">Recebimento Misto</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'dinheiro', icon: <Banknote size={18} />, label: 'Dinheiro', feeKey: 'fee_dinheiro' },
                { id: 'pix', icon: <QrCode size={18} />, label: 'PIX', feeKey: 'fee_pix' },
                { id: 'debito', icon: <CreditCard size={18} />, label: 'Débito', feeKey: 'fee_debito' },
                { id: 'credito', icon: <CreditCard size={18} />, label: 'Crédito', feeKey: 'fee_credito' }
              ].map(m => (
                <div key={m.id} className="flex items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 group hover:border-amber-500/30 transition-all">
                  <span className={`${splitValues[m.id] > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{m.icon}</span>
                  <div className="flex flex-col flex-1 leading-none">
                    <span className="text-[14px] uppercase font-black text-white italic">{m.label}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Taxa: {fees[m.feeKey] || 0}%</span>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="0.00"
                      className={`${inputClassName} text-right text-xl`}
                      value={splitValues[m.id] || ''}
                      onChange={(e) => {
                        setPaymentMethod(m.id as any);
                        setSplitValues({ ...splitValues, [m.id]: Number(e.target.value) });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center bg-black/40 py-8 rounded-[3rem] border border-white/5">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 italic leading-none">Total Geral Bruto</p>
              <h3 className="text-6xl font-black text-white italic tabular-nums leading-none">R$ {totalFinal.toFixed(2)}</h3>
              {totalPagoInput > 0 && (
                <p className={`text-[10px] font-black uppercase mt-4 italic tracking-widest ${totalPagoInput >= totalFinal ? 'text-green-500' : 'text-amber-500'}`}>
                  {/* AJUSTE: O cálculo de "RESTANTE" agora só considera o valor dos ITENS */}
                  {totalPagoInput >= totalFinal ? 'PAGAMENTO OK' : `RESTANTE R$ ${(totalFinal - totalPagoInput).toFixed(2)}`}
                </p>
              )}
            </div>

            <button
              disabled={loading || totalPagoInput <= 0 || !activeCashSession}
              onClick={handleFinalize}
              className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${!activeCashSession || totalPagoInput <= 0
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-white text-black shadow-2xl hover:bg-slate-100 hover:scale-[1.01]'
                }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={22} /> Finalizar Lançamento</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModule;