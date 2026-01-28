import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingCart, Package, Loader2, HeartHandshake, Plus, Minus, Crown, 
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
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isVipMode, setIsVipMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('dinheiro');
  const [tip, setTip] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ESTADO PARA CONTROLE DE CAIXA
  const [activeCashSession, setActiveCashSession] = useState<any>(null);
  const [checkingCash, setCheckingCash] = useState(true);

  // VERIFICAÇÃO DE CAIXA ABERTO
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

  // AUTO-ADICIONAR SERVIÇO AO SELECIONAR PACOTE
  useEffect(() => {
    if (paymentMethod === 'pacote' && pdvItems.length === 0 && services.length > 0) {
      console.log(">>> [SARAH] Auto-adicionando serviço para desconto de pacote...");
      const defaultService = services.find(s => s.name.toLowerCase().includes('corte')) || services[0];
      addItem(defaultService, 'servico');
    }
  }, [paymentMethod]);

  const getItemPrice = (item: any) => {
    if (paymentMethod === 'pacote' && item.type === 'servico' && activePkg) {
      return Number(activePkg.used_credits) === 0 ? Number(activePkg.price_paid) : 0;
    }
    return Number(item.price || 0);
  };

  const totalFinal = pdvItems.reduce((acc, item) => 
    acc + (getItemPrice(item) * item.quantity), 0
  ) + tip;

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
    if (!activeCashSession) return alert("CAIXA FECHADO! Abra o caixa para realizar vendas.");
    if (!selectedBarber) return alert("Selecione o profissional!");
    if (paymentMethod === 'pacote' && !activePkg) return alert("Cliente não possui combo ativo!");
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      for (const item of pdvItems) {
        for (let q = 0; q < item.quantity; q++) {
          const finalPrice = getItemPrice(item);
          const isRedemption = paymentMethod === 'pacote' && item.type === 'servico' && Number(activePkg?.used_credits) > 0;

          const { error } = await supabase.from('appointments').insert([{
            barbershop_id: barbershopId,
            customer_name: isVipMode && selectedCustomer ? selectedCustomer.name : "Venda Direta",
            service: item.name,
            barber: selectedBarber,
            date: today,
            time: time,
            price: finalPrice,
            payment_method: paymentMethod,
            status: 'confirmado',
            customer_phone: selectedCustomer?.phone || 'Balcão',
            is_package_redemption: isRedemption,
            tip_amount: 0
          }]);
          if (error) throw error;
        }
        if (item.type === 'produto') {
          const prod = inventory.find(p => p.id === item.originalId);
          if (prod) await supabase.from('inventory').update({ current_stock: prod.current_stock - item.quantity }).eq('id', item.originalId);
        }
      }

      if (tip > 0) {
        await supabase.from('appointments').insert([{
          barbershop_id: barbershopId, service: "Caixinha", barber: selectedBarber, date: today, time: time,
          price: tip, payment_method: paymentMethod, status: 'confirmado', tip_amount: tip
        }]);
      }

      if (paymentMethod === 'pacote' && activePkg) {
        await supabase.from('customer_packages').update({ used_credits: Number(activePkg.used_credits) + 1 }).eq('id', activePkg.id);
      }
      onSuccess();
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-[#0a0b0e] min-h-screen text-slate-200 font-bold italic">
      
      <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2 pb-10">
        
        {/* ALERTA DE CAIXA FECHADO */}
        {!activeCashSession && !checkingCash && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <h5 className="text-white uppercase font-black tracking-tighter text-xl">Caixa Fechado</h5>
              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">Abra o movimento diário para liberar os lançamentos.</p>
            </div>
          </div>
        )}

        {/* IDENTIFICAÇÃO VIP / BALCÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/[0.03] border border-white/10 p-2 rounded-[2.5rem] flex flex-col">
            <div className="flex p-1 gap-1">
              <button 
                onClick={() => { setIsVipMode(false); setSelectedCustomer(null); setPaymentMethod('dinheiro'); }}
                className={`flex-1 py-4 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isVipMode ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                <UserPlus size={14}/> Balcão
              </button>
              <button 
                onClick={() => setIsVipMode(true)}
                className={`flex-1 py-4 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isVipMode ? 'bg-amber-500 text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                <Crown size={14}/> Cliente VIP
              </button>
            </div>

            <div className="p-4 pt-2 font-black">
              {isVipMode ? (
                !selectedCustomer ? (
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold outline-none appearance-none italic"
                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}
                  >
                    <option value="">Localizar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center justify-between bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-xl text-black shadow-lg"><User size={20}/></div>
                      <div className="leading-none">
                        <p className="text-xs font-black uppercase italic">{selectedCustomer.name}</p>
                        {activePkg && <p className="text-[9px] text-amber-500 font-bold mt-1 uppercase tracking-tighter italic">Saldo: {activePkg.total_credits - activePkg.used_credits} cortes</p>}
                      </div>
                    </div>
                    <button onClick={() => {setSelectedCustomer(null); setPaymentMethod('dinheiro');}} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                )
              ) : (
                <div className="py-4 text-center opacity-40 italic text-[10px] font-bold uppercase tracking-widest">Atendimento Direto</div>
              )}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-center">
            <label className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 block italic">Gorjeta (Caixinha)</label>
            <div className="flex items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
              <HeartHandshake className="text-green-500" size={24}/>
              <input type="number" value={tip || ''} onChange={e => setTip(Number(e.target.value))} className="bg-transparent text-white font-black text-3xl outline-none w-full tabular-nums" placeholder="0.00" />
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

        {/* CATÁLOGO */}
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input type="text" placeholder="Buscar no catálogo..." className="w-full bg-white/[0.03] border border-white/10 rounded-full py-5 pl-16 pr-8 text-white outline-none focus:border-amber-500/50" onChange={e => setSearchQuery(e.target.value)}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-bold italic">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] pl-4 italic leading-none">Serviços</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                  <button key={s.id} onClick={() => addItem(s, 'servico')} className="w-full flex justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-amber-500 hover:text-black transition-all">
                    <span className="text-xs uppercase font-black">{s.name}</span>
                    <span className="font-black">R$ {Number(s.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] pl-4 italic leading-none">Produtos</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {inventory.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => addItem(p, 'produto')} className="w-full flex justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-blue-500 hover:text-white transition-all">
                    <div className="text-left leading-none"><p className="text-xs uppercase font-black italic">{p.name}</p><p className="text-[8px] opacity-40 mt-1 uppercase font-black">Stock: {p.current_stock}</p></div>
                    <span className="font-black">R$ {Number(p.price_sell).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARRINHO (RESUMO) */}
      <div className="w-full lg:w-[420px]">
        <div className="sticky top-6 bg-[#0f1115] border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-2xl">
          <h4 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
             <ShoppingCart className="text-amber-500" size={24}/> Checkout
          </h4>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {pdvItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 font-bold italic animate-in fade-in slide-in-from-right-2">
                <div className="flex-1 mr-4">
                  <p className="text-[10px] font-black uppercase text-white truncate italic mb-1">{item.name}</p>
                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                    {getItemPrice(item) === 0 ? "ISENTO (COMBO)" : `R$ ${getItemPrice(item).toFixed(2)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5 transition-all">
                    <button onClick={() => handleUpdateQuantity(item.originalId, -1)} className="text-slate-500 hover:text-amber-500"><Minus size={12}/></button>
                    <span className="text-xs font-black tabular-nums text-white">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.originalId, 1)} className="text-slate-500 hover:text-amber-500"><Plus size={12}/></button>
                  </div>
                  <button onClick={() => setPdvItems(pdvItems.filter(i => i.originalId !== item.originalId))} className="text-red-500/20 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
            {tip > 0 && (
              <div className="flex justify-between items-center p-4 bg-green-500/5 border border-green-500/20 rounded-2xl italic">
                <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">Gorjeta</span>
                <span className="font-black text-green-500 text-lg">R$ {tip.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="grid grid-cols-5 gap-2">
              <PayBtn icon={<Banknote size={18}/>} active={paymentMethod === 'dinheiro'} onClick={() => setPaymentMethod('dinheiro')} />
              <PayBtn icon={<QrCode size={18}/>} active={paymentMethod === 'pix'} onClick={() => setPaymentMethod('pix')} />
              <PayBtn icon={<CreditCard size={18}/>} active={paymentMethod === 'debito'} onClick={() => setPaymentMethod('debito')} />
              <PayBtn icon={<CreditCard size={18}/>} active={paymentMethod === 'credito'} onClick={() => setPaymentMethod('credito')} />
              <button 
                disabled={!activePkg} 
                onClick={() => setPaymentMethod('pacote')} 
                className={`p-4 rounded-xl border transition-all ${paymentMethod === 'pacote' ? 'bg-amber-500 text-black border-amber-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 disabled:opacity-10'}`}
              >
                <History size={16}/>
              </button>
            </div>

            <div className="text-center bg-black/40 py-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 leading-none italic">Total Geral</p>
              <h3 className="text-6xl font-black text-white italic tabular-nums leading-none">R$ {totalFinal.toFixed(2)}</h3>
              {paymentMethod === 'pacote' && activePkg && (
                <p className="text-[9px] font-black text-green-500 uppercase mt-4 italic tracking-widest leading-none">
                  {Number(activePkg.used_credits) === 0 ? "COBRANDO ATIVAÇÃO DO COMBO" : "UTILIZANDO CRÉDITO COMBO"}
                </p>
              )}
            </div>

            <button 
              disabled={loading || !selectedBarber || (pdvItems.length === 0 && tip === 0) || !activeCashSession}
              onClick={handleFinalize}
              className={`w-full py-7 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-white/5 ${
                !activeCashSession 
                ? 'bg-red-500/20 text-red-500 border border-red-500/30 cursor-not-allowed' 
                : 'bg-white hover:bg-slate-200 text-black'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                !activeCashSession ? "Caixa Fechado" : <><CheckCircle2 size={18}/> Finalizar Lançamento</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayBtn = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-xl border flex items-center justify-center transition-all ${active ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20'}`}>
    {icon}
  </button>
);

export default CheckoutModule;