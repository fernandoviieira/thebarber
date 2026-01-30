import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart, Loader2, HeartHandshake, Plus, Minus, Crown,
  Search, User, Trash2, UserPlus, CheckCircle2, Banknote, QrCode,
  CreditCard, AlertTriangle, Layers, Zap, Coins, Package
} from 'lucide-react';

interface CheckoutProps {
  barbershopId: string;
  barbers: any[];
  services: any[];
  inventory: any[];
  customers: any[];
  machineFees: any;
  onSuccess: () => void;
  initialAppointment?: any | null; 
}

const CheckoutModule: React.FC<CheckoutProps> = ({
  barbershopId, barbers, services, inventory, customers, onSuccess, initialAppointment
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
    if (initialAppointment && services.length > 0) {
      setPdvItems([]);
      if (initialAppointment.barber) {
        setSelectedBarber(initialAppointment.barber);
      }
      if (initialAppointment.customerName) {
        const foundCustomer = customers.find(c => 
          c.name.toLowerCase() === initialAppointment.customerName.toLowerCase() ||
          c.phone === initialAppointment.customerPhone
        );
        
        if (foundCustomer) {
          setIsVipMode(true);
          setSelectedCustomer(foundCustomer);
        } else {
          setIsVipMode(false);
        }
      }

      const serviceObj = services.find(s => 
        s.name.toLowerCase() === initialAppointment.service.toLowerCase()
      );

      if (serviceObj) {
        addItem(serviceObj, 'servico');
      } else {
        setPdvItems([{
          id: `temp-${Date.now()}`,
          originalId: initialAppointment.id,
          name: initialAppointment.service,
          price: Number(initialAppointment.price) || 0,
          type: 'servico',
          quantity: 1
        }]);
      }
      
      const valorInicial = Number(initialAppointment.price) || 0;
      setSplitValues(prev => ({ ...prev, pix: valorInicial }));
    }
  }, [initialAppointment, services]); 

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle();
      if (data) setFees(data);
    };
    fetchSettings();
  }, [barbershopId]);

  useEffect(() => {
    if (barbers.length === 1 && !selectedBarber) setSelectedBarber(barbers[0].name);
  }, [barbers]);

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

  const hasComboInCart = useMemo(() => {
    return pdvItems.some(item => item.type === 'servico' && activePkg);
  }, [pdvItems, activePkg]);

  const getItemPrice = (item: any) => {
    if (item.type === 'servico' && activePkg) {
      const alreadyUsed = Number(activePkg.used_credits) || 0;
      return alreadyUsed === 0 ? Number(activePkg.price_paid) : 0;
    }
    return Number(item.price || item.price_sell || 0);
  };

  const totalFinal = pdvItems.reduce((acc, item) => acc + (Number(getItemPrice(item)) * Number(item.quantity)), 0);
  const valorTotalAbsoluto = totalFinal + tip;
  const totalPagoInput = Object.values(splitValues).reduce((acc, curr) => Number(acc) + Number(curr), 0) as number;

  const handleMethodToggle = (method: string) => {
    if (hasComboInCart && method !== 'pacote') return;
    if (!hasComboInCart && method === 'pacote') return;

    if (!isMisto) {
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0, [method]: valorTotalAbsoluto });
      setPaymentMethod(method as any);
    }
  };

  useEffect(() => {
    if (hasComboInCart) {
      setPaymentMethod('pacote');
      setSplitValues({ dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: valorTotalAbsoluto });
    } else if (paymentMethod === 'pacote') {
      setPaymentMethod('pix');
      setSplitValues({ dinheiro: 0, debito: 0, credito: 0, pacote: 0, pix: valorTotalAbsoluto });
    }
  }, [hasComboInCart, valorTotalAbsoluto]);

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

  const handleFinalize = async () => {
    if (!activeCashSession) return alert("CAIXA FECHADO!");
    if (!selectedBarber) return alert("Selecione o profissional!");
    
    const canFinalize = hasComboInCart || (totalPagoInput >= valorTotalAbsoluto);
    if (valorTotalAbsoluto > 0 && !canFinalize) return alert("O valor pago é menor que o total!");

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const vendaIdUnica = `VENDA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const methodsUsed = hasComboInCart ? "PACOTE" : (Object.entries(splitValues) as [string, number][])
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k.toUpperCase()}(${v.toFixed(2)})`)
        .join(' + ') || paymentMethod.toUpperCase();

      for (const item of pdvItems) {
        for (let q = 0; q < item.quantity; q++) {
          const isPackageRedemption = !!(activePkg && item.type === 'servico');

          const { error } = await supabase.from('appointments').insert([{
            venda_id: vendaIdUnica,
            barbershop_id: barbershopId,
            customer_name: selectedCustomer ? selectedCustomer.name : (initialAppointment?.customerName || "Venda Direta"),
            service: isPackageRedemption ? `${item.name} (Combo)` : String(item.name),
            barber: selectedBarber,
            date: today,
            time: time,
            price: String(getItemPrice(item)),
            payment_method: methodsUsed,
            status: 'confirmado',
            customer_phone: selectedCustomer?.phone || initialAppointment?.customerPhone || 'Balcão',
            is_package_redemption: isPackageRedemption,
            tip_amount: 0
          }]);

          if (error) throw error;
        }
      }

      if (initialAppointment?.id) {
        await supabase.from('appointments')
          .update({ 
            status: 'finalizado', 
            venda_id: vendaIdUnica
          })
          .eq('id', initialAppointment.id);
      }

      if (tip > 0) {
        await supabase.from('appointments').insert([{
          venda_id: vendaIdUnica,
          barbershop_id: barbershopId,
          customer_name: selectedCustomer ? selectedCustomer.name : (initialAppointment?.customerName || "Venda Direta"),
          service: "Caixinha (Gorjeta)",
          barber: selectedBarber,
          date: today,
          time: time,
          price: String(tip.toFixed(2)),
          payment_method: methodsUsed,
          status: 'confirmado',
          tip_amount: Number(tip)
        }]);
      }

      onSuccess();
      setPdvItems([]);
      setSplitValues({ dinheiro: 0, debito: 0, credito: 0, pacote: 0, pix: 0 });
      setTip(0);
      setIsMisto(false);
      alert("Venda finalizada com sucesso!");
    } catch (err: any) { 
      alert(`Erro ao salvar: ${err.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-[#0a0b0e] min-h-screen text-slate-200 font-bold italic">
      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
        
        {!activeCashSession && !checkingCash && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 animate-pulse">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <h5 className="text-white uppercase font-black text-xl">Caixa Fechado</h5>
              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mt-1">Abra o movimento para lançar.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/10 p-3 rounded-[2rem] flex flex-col justify-center">
            <div className="flex p-1 gap-1 mb-2">
              <button onClick={() => { setIsVipMode(false); setSelectedCustomer(null); }} className={`flex-1 py-3 rounded-xl text-[9px] uppercase font-black transition-all ${!isVipMode ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                <UserPlus size={12} className="inline mr-1" /> Balcão
              </button>
              <button onClick={() => setIsVipMode(true)} className={`flex-1 py-3 rounded-xl text-[9px] uppercase font-black transition-all ${isVipMode ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                <Crown size={12} className="inline mr-1" /> Cliente VIP
              </button>
            </div>
            {isVipMode && (
              <div className="px-2">
                {!selectedCustomer ? (
                  <select className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none italic text-white" onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}>
                    <option value="">Localizar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-3 truncate">
                      <div className="bg-amber-500 p-1.5 rounded-lg text-black shrink-0"><User size={16} /></div>
                      <div className="truncate leading-none">
                        <p className="text-[10px] font-black uppercase italic text-white truncate">{selectedCustomer.name}</p>
                        {activePkg && (
                          <p className="text-[7px] text-amber-500 font-black uppercase mt-1">Combo: {activePkg.total_credits - activePkg.used_credits} restantes</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="p-1.5 text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-[2rem]">
            <div className="flex items-center justify-between mb-2">
               <label className="text-[9px] font-black text-green-500 uppercase italic flex items-center gap-2">
                <Coins size={14}/> Gorjeta (Caixinha)
               </label>
               <div className="flex gap-1">
                  <button onClick={() => setTip(prev => prev + 5)} className="bg-green-500/10 text-green-500 text-[8px] px-2 py-1 rounded-md border border-green-500/20 hover:bg-green-500 hover:text-white">+R$5</button>
                  <button onClick={() => setTip(prev => prev + 10)} className="bg-green-500/10 text-green-500 text-[8px] px-2 py-1 rounded-md border border-green-500/20 hover:bg-green-500 hover:text-white">+R$10</button>
                  <button onClick={() => setTip(0)} className="bg-red-500/10 text-red-500 text-[8px] px-2 py-1 rounded-md border border-red-500/20 hover:bg-red-500 hover:text-white">Limpar</button>
               </div>
            </div>
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
              <input type="number" value={tip || ''} onChange={e => setTip(Number(e.target.value))} className="bg-transparent text-right w-full outline-none font-black text-white text-xl" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {barbers.map(b => (
            <button key={b.id} onClick={() => setSelectedBarber(b.name)} className={`py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedBarber === b.name ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="space-y-4 text-white italic">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="Pesquisar..." className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 text-sm text-white outline-none focus:border-amber-500/50" onChange={e => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest pl-2 text-amber-500/50">Serviços</h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => {
                  const price = getItemPrice(s);
                  const isCombo = activePkg && s.type === 'servico';
                  return (
                    <button key={s.id} onClick={() => addItem(s, 'servico')} className="w-full flex justify-between p-4 bg-amber-500/5 border border-white/5 rounded-2xl hover:bg-amber-500 hover:text-black transition-all group text-left">
                      <div>
                        <p className="text-[10px] uppercase font-black italic">{s.name}</p>
                        {isCombo && (
                          <span className="text-[7px] font-black uppercase bg-black/20 px-1 rounded mt-1 inline-block">
                            {Number(activePkg.used_credits) === 0 ? "1º Uso do Combo" : "Abatendo do Combo"}
                          </span>
                        )}
                      </div>
                      <span className="font-black italic text-[10px]">R$ {price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest pl-2 text-blue-400/50">Produtos</h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {localInventory.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => addItem(p, 'produto')} className="w-full flex justify-between p-4 bg-blue-500/5 border border-white/5 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-left">
                    <p className="text-[10px] uppercase font-black italic">{p.name}</p>
                    <span className="font-black italic text-[10px]">R$ {Number(p.price_sell).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[480px]">
        <div className="sticky top-6 bg-[#0f1115] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
              <ShoppingCart className="text-amber-500" size={24} /> Resumo
            </h4>
            <span className="text-[9px] bg-white/5 px-3 py-1 rounded-full text-slate-500 uppercase font-black">
              {pdvItems.length} Itens
            </span>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {pdvItems.map(item => {
               const currentPrice = getItemPrice(item);
               return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 font-bold italic">
                  <div className="flex-1 mr-2 truncate">
                    <p className="text-[10px] font-black uppercase text-white truncate italic">{item.name}</p>
                    <p className={`text-[9px] font-black ${currentPrice === 0 ? 'text-green-500' : 'text-amber-500'}`}>
                      {currentPrice === 0 ? 'DESCONTO COMBO' : `R$ ${currentPrice.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 px-2 rounded-xl border border-white/5">
                      <button onClick={() => handleUpdateQuantity(item.originalId, -1)} className="text-slate-500 hover:text-amber-500"><Minus size={12} /></button>
                      <span className="text-xs font-black text-white">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.originalId, 1)} className="text-slate-500 hover:text-amber-500"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => setPdvItems(pdvItems.filter(i => i.originalId !== item.originalId))} className="text-red-500/20 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <div onClick={() => !hasComboInCart && setIsMisto(!isMisto)} className={`flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 transition-all ${hasComboInCart ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}`}>
              <div className="flex items-center gap-3">
                <Layers size={16} className={isMisto ? "text-amber-500" : "text-slate-500"} />
                <span className="text-[9px] uppercase font-black italic text-white">Pagamento Misto</span>
              </div>
              <div className={`w-7 h-3.5 rounded-full relative transition-all ${isMisto ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${isMisto ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'dinheiro', icon: <Banknote size={16} />, label: 'Dinheiro' },
                { id: 'pix', icon: <QrCode size={16} />, label: 'PIX' },
                { id: 'debito', icon: <CreditCard size={16} />, label: 'Débito' },
                { id: 'credito', icon: <CreditCard size={16} />, label: 'Crédito' },
                { id: 'pacote', icon: <Package size={16} />, label: 'Combo/Pacote' }
              ].map(m => {
                const isSelected = paymentMethod === m.id;
                const isDisabled = hasComboInCart ? (m.id !== 'pacote') : (m.id === 'pacote');
                const isGlowing = splitValues[m.id] > 0 || (isSelected && (hasComboInCart || !isMisto));

                return (
                  <div
                    key={m.id}
                    onClick={() => handleMethodToggle(m.id as any)}
                    className={`flex items-center gap-3 bg-black/40 p-3 rounded-2xl border transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed border-transparent' : 'cursor-pointer'} ${isGlowing ? 'border-amber-500 bg-amber-500/5' : 'border-white/5'} ${!isMisto && !isSelected ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <span className={isGlowing ? 'text-amber-500' : 'text-slate-600'}>{m.icon}</span>
                    <div className="flex-1 text-[10px] uppercase font-black italic text-white">{m.label}</div>
                    {isMisto && !isDisabled ? (
                      <input
                        type="number"
                        value={splitValues[m.id] || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.id]: Number(e.target.value) })}
                        className="bg-transparent text-right w-20 outline-none font-black text-white text-sm"
                        placeholder="0.00"
                      />
                    ) : (
                      <Zap size={12} className={isGlowing ? "text-amber-500" : "text-slate-800"} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center bg-black/60 py-6 rounded-[2rem] border border-white/5 shadow-inner">
              <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Final</p>
              <h3 className="text-4xl font-black text-white italic tabular-nums leading-none">R$ {valorTotalAbsoluto.toFixed(2)}</h3>
              {((Number(totalPagoInput) >= valorTotalAbsoluto && valorTotalAbsoluto > 0) || (hasComboInCart && valorTotalAbsoluto >= 0)) && (
                <p className="text-[8px] font-black uppercase mt-2 italic text-green-500">PAGAMENTO OK</p>
              )}
            </div>

            <button
              disabled={loading || !activeCashSession || (valorTotalAbsoluto > 0 && !hasComboInCart && totalPagoInput < valorTotalAbsoluto)}
              onClick={handleFinalize}
              className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${loading || !activeCashSession || (valorTotalAbsoluto > 0 && !hasComboInCart && totalPagoInput < valorTotalAbsoluto) ? 'bg-white/5 text-slate-700 cursor-not-allowed' : 'bg-white text-black shadow-xl active:scale-95'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Finalizar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModule;