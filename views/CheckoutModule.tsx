import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart, Loader2, HeartHandshake, Plus, Minus, Crown,
  Search, User, Trash2, UserPlus, CheckCircle2, Banknote, QrCode,
  CreditCard, History, AlertTriangle, Layers, Zap
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
  const [isMisto, setIsMisto] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('pix');
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
    if (barbers.length === 1) setSelectedBarber(barbers[0].name);
  }, [barbers]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle();
      if (data) setFees(data);
    };
    fetchSettings();
  }, [barbershopId]);

  useEffect(() => { setLocalInventory(inventory); }, [inventory]);

  useEffect(() => {
    const checkCash = async () => {
      const { data } = await supabase.from('cash_flow').select('*').eq('barbershop_id', barbershopId).eq('status', 'open').maybeSingle();
      setActiveCashSession(data);
      setCheckingCash(false);
    };
    checkCash();
  }, [barbershopId]);

  const activePkg = useMemo(() => {
    if (!selectedCustomer?.customer_packages) return null;
    return selectedCustomer.customer_packages.find((p: any) => Number(p.used_credits) < Number(p.total_credits));
  }, [selectedCustomer]);

  const getItemPrice = (item: any) => {
    if (paymentMethod === 'pacote' && item.type === 'servico' && activePkg) {
      return Number(activePkg.used_credits) === 0 ? Number(activePkg.price_paid) : 0;
    }
    return Number(item.price || 0);
  };

  const totalFinal = pdvItems.reduce((acc, item) => acc + (Number(getItemPrice(item)) * Number(item.quantity)), 0);
  const valorTotalAbsoluto = totalFinal + tip;
  const totalPagoInput = Object.values(splitValues).reduce((acc, curr) =>
    Number(acc) + Number(curr), 0
  ) as number;
  const handleMethodToggle = (method: string) => {
    if (!isMisto) {
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0, [method]: valorTotalAbsoluto });
      setPaymentMethod(method as any);
    }
  };

  useEffect(() => {
    if (!isMisto) {
      const activeMethod = Object.keys(splitValues).find(key => splitValues[key] > 0) || 'pix';
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0, [activeMethod]: valorTotalAbsoluto });
    }
  }, [valorTotalAbsoluto, isMisto]);

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

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let totalGatewayFee = 0;
      (Object.entries(splitValues) as [string, number][]).forEach(([method, value]) => {
        const feePercent = Number(fees[`fee_${method}`]) || 0;
        totalGatewayFee += (Number(value) * (feePercent / 100));
      });

      const methodsUsed = (Object.entries(splitValues) as [string, number][])
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k.toUpperCase()}(${v.toFixed(2)})`)
        .join(' + ') || paymentMethod;

      let updatedInventory = [...localInventory];

      for (const item of pdvItems) {
        for (let q = 0; q < item.quantity; q++) {
          await supabase.from('appointments').insert([{
            barbershop_id: barbershopId,
            customer_name: isVipMode && selectedCustomer ? selectedCustomer.name : "Venda Direta",
            service: String(item.name),
            barber: selectedBarber,
            date: today,
            time: time,
            price: String(getItemPrice(item)),
            payment_method: methodsUsed,
            status: 'confirmado',
            customer_phone: selectedCustomer?.phone || 'Balcão',
            gateway_fee: totalGatewayFee / (pdvItems.length + (tip > 0 ? 1 : 0)),
            is_package_redemption: !!(paymentMethod === 'pacote' && item.type === 'servico'),
            tip_amount: 0
          }]);
        }

        if (item.type === 'produto') {
          const prodIndex = updatedInventory.findIndex(p => p.id === item.originalId);
          if (prodIndex !== -1) {
            const newStock = updatedInventory[prodIndex].current_stock - item.quantity;
            await supabase.from('inventory').update({ current_stock: newStock }).eq('id', item.originalId);
            updatedInventory[prodIndex] = { ...updatedInventory[prodIndex], current_stock: newStock };
          }
        }
      }

      if (tip > 0) {
        await supabase.from('appointments').insert([{
          barbershop_id: barbershopId,
          customer_name: isVipMode && selectedCustomer ? selectedCustomer.name : "Venda Direta",
          customer_phone: selectedCustomer?.phone || 'Balcão',
          service: "Caixinha (Gorjeta)",
          barber: selectedBarber,
          date: today,
          time: time,
          price: String(tip.toFixed(2)),
          payment_method: methodsUsed,
          status: 'confirmado',
          gateway_fee: 0,
          tip_amount: Number(tip),
          is_package_redemption: false
        }]);
      }

      setLocalInventory(updatedInventory);
      onSuccess();
      setPdvItems([]);
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0 });
      setTip(0);
      setIsMisto(false);
      alert("Venda finalizada com sucesso!");
    } catch (err) { console.error(err); } finally { setLoading(false); }
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

        {/* SEÇÃO DE TAXAS COMPACTA */}
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[1.5rem] mt-6">
          <div className="flex items-center justify-between mb-3 px-2">
            <h4 className="text-[10px] font-black text-slate-500 italic uppercase flex items-center gap-2">
              <History size={14} className="text-blue-500" /> Taxas da Maquininha (%)
            </h4>
            <button onClick={saveFees} className="text-blue-500 hover:text-white text-[9px] uppercase font-black transition-all">
              {loading ? <Loader2 className="animate-spin" size={10} /> : "[ Atualizar ]"}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Débito', key: 'fee_debito' },
              { label: 'Crédito', key: 'fee_credito' },
              { label: 'PIX', key: 'fee_pix' },
              { label: 'Dinheiro', key: 'fee_dinheiro' }
            ].map((f) => (
              <div key={f.key} className="bg-black/20 p-2 px-3 rounded-xl border border-white/5 flex items-center justify-between">
                <label className="text-[8px] font-black text-slate-600 uppercase italic">{f.label}</label>
                <div className="flex items-center gap-1">
                  <input type="number" value={fees[f.key] || 0} onChange={(e) => setFees({ ...fees, [f.key]: Number(e.target.value) })} className="bg-transparent text-white font-black text-xs outline-none w-8 text-right appearance-none" />
                  <span className="text-slate-700 text-[8px]">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CLIENTE E GORJETA */}
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
                  <select className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold outline-none italic text-white" onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}>
                    <option value="">Localizar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center justify-between bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-xl text-black"><User size={20} /></div>
                      <div className="leading-none text-white">
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

        {/* BARBEIROS */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {barbers.map(b => (
            <button key={b.id} onClick={() => setSelectedBarber(b.name)} className={`p-4 rounded-2xl border text-[10px] font-black uppercase transition-all ${selectedBarber === b.name ? 'bg-amber-500 text-black border-amber-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* BUSCA E CATÁLOGO COMPLETO */}
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
                  <button key={s.id} onClick={() => addItem(s, 'servico')} className="w-full flex justify-between p-5 bg-amber-500/5 border-l-4 border-l-amber-500 border-y border-r border-white/5 rounded-3xl hover:bg-amber-500 hover:text-black transition-all group">
                    <div className="text-left leading-none">
                      <p className="text-xs uppercase font-black italic">{s.name}</p>
                      <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-500/20 text-amber-500 mt-2 inline-block">Procedimento</span>
                    </div>
                    <span className="font-black italic text-xs text-amber-500 group-hover:text-black">R$ {Number(s.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] pl-4 text-blue-400/50">Produtos</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {localInventory.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => addItem(p, 'produto')} className="w-full flex justify-between p-5 bg-blue-500/5 border-l-4 border-l-blue-500 border-y border-r border-white/5 rounded-3xl hover:bg-blue-600 hover:text-white transition-all group">
                    <div className="text-left leading-none">
                      <p className="text-xs uppercase font-black italic">{p.name}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase mt-2 inline-block ${p.current_stock > 5 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>Estoque: {p.current_stock}</span>
                    </div>
                    <span className="font-black italic text-xs text-blue-400 group-hover:text-white">R$ {Number(p.price_sell).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA CHECKOUT LATERAL */}
      <div className="w-full lg:w-[550px]">
        <div className="sticky top-6 bg-[#0f1115] border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl">
          <h4 className="text-2xl font-black text-white italic uppercase flex items-center gap-4">
            <ShoppingCart className="text-amber-500" size={28} /> Checkout
          </h4>

          {/* ITENS NO CARRINHO */}
          <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            {pdvItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-3xl border border-white/5 font-bold italic">
                <div className="flex-1 mr-4 leading-tight">
                  <p className="text-xs font-black uppercase text-white truncate italic">{item.name}</p>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">R$ {Number(item.price).toFixed(2)}</p>
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
            {tip > 0 && (
              <div className="flex items-center justify-between p-5 bg-green-500/10 rounded-3xl border border-green-500/20 font-bold italic animate-in fade-in slide-in-from-right-2">
                <div className="flex items-center gap-3 text-green-500">
                  <HeartHandshake size={20} />
                  <div className="leading-none text-white">
                    <p className="text-xs font-black uppercase italic">Gorjeta</p>
                  </div>
                </div>
                <p className="text-xl font-black text-white italic">R$ {tip.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* PAGAMENTO */}
          <div className="pt-6 border-t border-white/5 space-y-6">
            <div onClick={() => setIsMisto(!isMisto)} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl cursor-pointer border border-white/5 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <Layers size={18} className={isMisto ? "text-amber-500" : "text-slate-500"} />
                <span className="text-[10px] uppercase font-black italic text-white">Habilitar Pagamento Misto</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-all ${isMisto ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isMisto ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'dinheiro', icon: <Banknote size={18} />, label: 'Dinheiro', fee: 'fee_dinheiro' },
                { id: 'pix', icon: <QrCode size={18} />, label: 'PIX', fee: 'fee_pix' },
                { id: 'debito', icon: <CreditCard size={18} />, label: 'Débito', fee: 'fee_debito' },
                { id: 'credito', icon: <CreditCard size={18} />, label: 'Crédito', fee: 'fee_credito' }
              ].map(m => (
                <div
                  key={m.id}
                  onClick={() => handleMethodToggle(m.id)}
                  className={`flex items-center gap-4 bg-black/40 p-4 rounded-3xl border transition-all cursor-pointer ${splitValues[m.id] > 0 ? 'border-amber-500' : 'border-white/5'} ${!isMisto && splitValues[m.id] === 0 ? 'opacity-50' : 'opacity-100'}`}
                >
                  <span className={splitValues[m.id] > 0 ? 'text-amber-500' : 'text-slate-600'}>{m.icon}</span>
                  <div className="flex-1 leading-none">
                    <p className="text-xs uppercase font-black italic text-white">{m.label}</p>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Taxa: {fees[m.fee] || 0}%</p>
                  </div>
                  <input
                    type="number"
                    disabled={!isMisto}
                    value={splitValues[m.id] || ''}
                    onChange={(e) => setSplitValues({ ...splitValues, [m.id]: Number(e.target.value) })}
                    className="bg-transparent text-right w-24 outline-none font-black text-white text-lg"
                    placeholder="0.00"
                  />
                  <Zap size={14} className={splitValues[m.id] > 0 ? "text-amber-500" : "text-slate-800"} />
                </div>
              ))}
            </div>

            {/* RESUMO DE VALORES */}
            <div className="text-center bg-black/40 py-8 rounded-[3rem] border border-white/5">
              <p className="text-xs font-black text-slate-500 uppercase mb-2 leading-none">Total Geral a Receber</p>
              <h3 className="text-6xl font-black text-white italic tabular-nums leading-none">R$ {valorTotalAbsoluto.toFixed(2)}</h3>

              {isMisto && Number(totalPagoInput) > 0 && (
                <p className={`text-[10px] font-black uppercase mt-4 italic tracking-widest ${Number(totalPagoInput) >= valorTotalAbsoluto ? 'text-green-500' : 'text-amber-500'}`}>
                  {Number(totalPagoInput) >= valorTotalAbsoluto ? 'PAGAMENTO OK' : `RESTANTE R$ ${(valorTotalAbsoluto - Number(totalPagoInput)).toFixed(2)}`}
                </p>
              )}
            </div>

            <button
              disabled={loading || !activeCashSession || valorTotalAbsoluto <= 0 || (isMisto && totalPagoInput < valorTotalAbsoluto)}
              onClick={handleFinalize}
              className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${loading || !activeCashSession || (isMisto && totalPagoInput < valorTotalAbsoluto) ? 'bg-white/5 text-slate-700 cursor-not-allowed' : 'bg-white text-black shadow-2xl hover:scale-[1.01]'}`}
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