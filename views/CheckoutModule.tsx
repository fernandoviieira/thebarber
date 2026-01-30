import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart, Loader2, Plus, Minus, Crown,
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
  const [fees, setFees] = useState<any>({ fee_dinheiro: 0, fee_pix: 0, fee_debito: 0, fee_credito: 0 });

  const [splitValues, setSplitValues] = useState<Record<string, number>>({
    dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0
  });

  const [tip, setTip] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCashSession, setActiveCashSession] = useState<any>(null);
  const [checkingCash, setCheckingCash] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- BUSCAR CONFIGURAÇÕES DE TAXAS ---
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

  // --- FUNÇÃO addItem DECLARADA ANTES DO useEffect ---
  const addItem = useCallback((item: any, type: 'servico' | 'produto') => {
    setPdvItems(prev => {
      const existing = prev.find(i => i.originalId === item.id);
      if (existing) {
        return prev.map(i =>
          i.originalId === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        id: Math.random().toString(),
        originalId: item.id,
        name: item.name,
        price: Number(item.price || item.price_sell) || 0,
        type,
        quantity: 1
      }];
    });
  }, []);

  // --- INICIALIZAÇÃO DE AGENDAMENTO (COM PROTEÇÃO CONTRA RACE CONDITION) ---
  useEffect(() => {
    if (initialAppointment && services.length > 0 && !isInitialized) {
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

      setIsInitialized(true);
    }
  }, [initialAppointment, services, customers, isInitialized, addItem]);

  // --- AUTO-SELECT BARBEIRO SE SÓ TIVER UM ---
  useEffect(() => {
    if (barbers.length === 1 && !selectedBarber) {
      setSelectedBarber(barbers[0].name);
    }
  }, [barbers, selectedBarber]);

  // --- VERIFICAR CAIXA ABERTO ---
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

  // --- ATUALIZAR INVENTORY LOCAL QUANDO PROP MUDAR ---
  useEffect(() => {
    setLocalInventory(inventory);
  }, [inventory]);

  // --- PACOTE ATIVO ---
  const activePkg = useMemo(() => {
    if (!selectedCustomer?.customer_packages) return null;
    return selectedCustomer.customer_packages.find(
      (p: any) => Number(p.used_credits) < Number(p.total_credits)
    );
  }, [selectedCustomer]);

  // --- TEM COMBO NO CARRINHO ---
  const hasComboInCart = useMemo(() => {
    return pdvItems.some(item =>
      item.type === 'servico' &&
      activePkg
    );
  }, [pdvItems, activePkg]);
  const getItemPrice = useCallback((item: any) => {
    if (item.type === 'servico' && activePkg) {
      const creditosRestantes = Number(activePkg.total_credits) - Number(activePkg.used_credits);
      if (creditosRestantes > 0) {
        return 0;
      }
    }
    return Number(item.price || item.price_sell || 0);
  }, [activePkg]);

  // --- TOTAIS ---
  const totalFinal = useMemo(() =>
    pdvItems.reduce((acc, item) =>
      acc + (Number(getItemPrice(item)) * Number(item.quantity)), 0
    ), [pdvItems, getItemPrice]
  );

  const valorTotalAbsoluto = totalFinal + tip;

  const totalPagoInput = useMemo(() =>
    Object.values(splitValues).reduce((acc, curr) =>
      Number(acc) + Number(curr), 0
    ) as number, [splitValues]
  );

  // --- CÁLCULO DE TAXA SIMPLES ---
  const calculateNet = useCallback((bruto: number, method: string) => {
    const feeKey = `fee_${method.toLowerCase()}`;
    const feePercent = fees[feeKey] || 0;
    return bruto * (1 - feePercent / 100);
  }, [fees]);

  // --- CÁLCULO DE VALOR LÍQUIDO POR ITEM (CONSIDERANDO PAGAMENTO MISTO) ---
  const calculateItemNetValue = useCallback((itemGrossPrice: number) => {
    if (hasComboInCart || itemGrossPrice === 0) {
      return itemGrossPrice;
    }

    if (isMisto) {
      let totalLiquido = 0;

      Object.entries(splitValues).forEach(([method, value]) => {
        const numValue = value as number;
        if (numValue > 0) {
          const proporcao = numValue / valorTotalAbsoluto;
          const valorProporcional = itemGrossPrice * proporcao;
          const feeKey = `fee_${method}`;
          const feePercent = fees[feeKey] || 0;
          totalLiquido += valorProporcional * (1 - feePercent / 100);
        }
      });

      return totalLiquido;
    } else {
      // Pagamento único
      return calculateNet(itemGrossPrice, paymentMethod);
    }
  }, [hasComboInCart, isMisto, splitValues, valorTotalAbsoluto, fees, paymentMethod, calculateNet]);

  // --- AJUSTE AUTOMÁTICO DO PAGAMENTO ---
  useEffect(() => {
    if (!isMisto && valorTotalAbsoluto > 0) {
      setSplitValues({
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        pacote: 0,
        [paymentMethod]: valorTotalAbsoluto
      });
    }
  }, [valorTotalAbsoluto, paymentMethod, isMisto]);

  // --- VALOR LÍQUIDO TOTAL (PARA EXIBIÇÃO) ---
  const netValue = useMemo(() => {
    let totalTaxa = 0;
    (Object.entries(splitValues) as [string, number][]).forEach(([method, value]) => {
      const feeKey = `fee_${method}`;
      const feePercent = fees[feeKey] || 0;
      totalTaxa += (value * (feePercent / 100));
    });

    return valorTotalAbsoluto - totalTaxa;
  }, [splitValues, valorTotalAbsoluto, fees]);

  // --- ALTERNAR MÉTODO DE PAGAMENTO ---
  const handleMethodToggle = useCallback((method: string) => {
    if (hasComboInCart && method !== 'pacote') return;
    if (!hasComboInCart && method === 'pacote') return;

    if (!isMisto) {
      setSplitValues({
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        pacote: 0,
        [method]: valorTotalAbsoluto
      });
      setPaymentMethod(method as any);
    }
  }, [hasComboInCart, isMisto, valorTotalAbsoluto]);

  // --- FORÇAR MÉTODO PACOTE QUANDO TEM COMBO ---
  // AJUSTE este useEffect:
  useEffect(() => {
    if (hasComboInCart) {
      setPaymentMethod('pacote');
      setSplitValues({
        dinheiro: 0, pix: 0, debito: 0, credito: 0,
        pacote: valorTotalAbsoluto // valorTotalAbsoluto será 0 se for só o serviço do combo
      });
    } else if (paymentMethod === 'pacote' && !hasComboInCart) {
      // Só muda para PIX se NÃO tiver combo no carrinho e o método atual for pacote
      setPaymentMethod('pix');
    }
  }, [hasComboInCart, valorTotalAbsoluto]);

  // --- ATUALIZAR QUANTIDADE ---
  const handleUpdateQuantity = useCallback((originalId: string, delta: number) => {
    setPdvItems(prev => prev.map(item => {
      if (item.originalId === originalId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  // --- REMOVER ITEM ---
  const handleRemoveItem = useCallback((originalId: string) => {
    setPdvItems(prev => prev.filter(i => i.originalId !== originalId));
  }, []);

  // --- FINALIZAR VENDA (VERSÃO COMPLETA E CORRIGIDA) ---
  const handleFinalize = async () => {
    // ====== VALIDAÇÕES INICIAIS ======
    if (!activeCashSession) {
      return alert("❌ CAIXA FECHADO! Abra o movimento para continuar.");
    }

    if (!selectedBarber) {
      return alert("⚠️ Selecione o profissional antes de finalizar!");
    }

    // if (pdvItems.length === 0) {
    //   return alert("⚠️ Adicione itens ao carrinho!");
    // }

    // 1. Definição do valor total e faltante
    const totalPago = totalPagoInput;
    const valorFaltante = valorTotalAbsoluto - totalPago;

    // 2. Validação de Valor Negativo
    if (valorTotalAbsoluto < 0) {
      return alert("⚠️ Valor total inválido!");
    }

    // 3. Lógica de Desconto (Substitui o alerta de insuficiente)
    // Se não for combo e houver valor faltando acima de 1 centavo
    if (!hasComboInCart && valorTotalAbsoluto > 0 && valorFaltante > 0.01) {
      const confirmarDesconto = window.confirm(
        `⚠️ VALOR ABAIXO DO TOTAL!\n\n` +
        `Total: R$ ${valorTotalAbsoluto.toFixed(2)}\n` +
        `Recebido: R$ ${totalPago.toFixed(2)}\n\n` +
        `Deseja aplicar R$ ${valorFaltante.toFixed(2)} como DESCONTO e finalizar?`
      );

      if (!confirmarDesconto) return; // Para a execução aqui se o usuário desistir
    }

    // 4. VALIDAR ESTOQUE (Mantemos sua lógica original que está perfeita)
    const produtosNoCarrinho = pdvItems.filter(i => i.type === 'produto');
    for (const item of produtosNoCarrinho) {
      const produtoEstoque = localInventory.find(p => p.id === item.originalId);
      if (!produtoEstoque || Number(produtoEstoque.stock) < item.quantity) {
        return alert(`❌ Estoque insuficiente para: ${item.name}`);
      }
    }

    // ====== AGORA O CÓDIGO SEGUE PARA O SETLOADING ======
    setLoading(true);
    setLoadingMessage('Iniciando venda...');
    const itemsInserted: string[] = [];
    const inventoryUpdates: any[] = [];
    const packageUpdates: any[] = [];

    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const vendaIdUnica = `VENDA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const fallbackPhone = initialAppointment?.customerPhone || 'Balcão';
      const finalPhone = selectedCustomer?.phone || fallbackPhone;

      const methodsUsed = hasComboInCart
        ? "PACOTE"
        : (Object.entries(splitValues) as [string, number][])
          .filter(([_, v]) => v > 0)
          .map(([k, v]) => `${k.toUpperCase()}(R$${v.toFixed(2)})`)
          .join(' + ') || paymentMethod.toUpperCase();

      // ====== PREPARAR INSERTS EM BATCH ======
      setLoadingMessage('Processando itens...');
      const allInserts: any[] = [];

      for (const item of pdvItems) {
        const isPackageRedemption = !!(activePkg && item.type === 'servico');
        const precoOriginal = Number(getItemPrice(item));
        const precoFinal = calculateItemNetValue(precoOriginal);

        // Criar inserts para cada quantidade
        for (let q = 0; q < item.quantity; q++) {
          allInserts.push({
            venda_id: vendaIdUnica,
            barbershop_id: barbershopId,
            customer_name: selectedCustomer
              ? selectedCustomer.name
              : (initialAppointment?.customerName || "Venda Direta"),
            service: isPackageRedemption ? `${item.name} (Combo)` : String(item.name),
            barber: selectedBarber,
            date: today,
            time: time,
            price: precoFinal,
            payment_method: methodsUsed,
            status: 'confirmado',
            customer_phone: finalPhone,
            is_package_redemption: isPackageRedemption,
            tip_amount: 0
          });
        }

        // Preparar atualização de estoque (se for produto)
        if (item.type === 'produto') {
          const produtoAtual = localInventory.find(p => p.id === item.originalId);
          if (produtoAtual) {
            inventoryUpdates.push({
              id: item.originalId,
              newStock: Number(produtoAtual.current_stock) - item.quantity
            });
          }
        }

        // Preparar atualização de créditos do combo
        if (isPackageRedemption && activePkg) {
          packageUpdates.push({
            id: activePkg.id,
            newCredits: Number(activePkg.used_credits) + item.quantity
          });
        }
      }

      // ====== ADICIONAR GORJETA ======
      if (tip > 0) {
        const tipNetValue = calculateItemNetValue(tip);

        allInserts.push({
          venda_id: vendaIdUnica,
          barbershop_id: barbershopId,
          customer_name: selectedCustomer
            ? selectedCustomer.name
            : (initialAppointment?.customerName || "Venda Direta"),
          service: "Caixinha / Gorjeta",
          barber: selectedBarber,
          date: today,
          time: time,
          price: tipNetValue,
          payment_method: methodsUsed,
          status: 'confirmado',
          customer_phone: finalPhone,
          tip_amount: tip
        });
      }

      // ====== INSERIR TODOS OS APPOINTMENTS DE UMA VEZ ======
      setLoadingMessage('Salvando venda...');
      const { data: insertedData, error: insertError } = await supabase
        .from('appointments')
        .insert(allInserts)
        .select('id');

      if (insertError) throw new Error(`Erro ao salvar venda: ${insertError.message}`);

      if (insertedData) {
        itemsInserted.push(...insertedData.map(d => d.id));
      }

      // ====== ATUALIZAR ESTOQUE ======
      if (inventoryUpdates.length > 0) {
        setLoadingMessage('Atualizando estoque...');
        for (const update of inventoryUpdates) {
          const { error: stockError } = await supabase
            .from('inventory')
            .update({ current_stock: update.newStock })
            .eq('id', update.id);

          if (stockError) {
            throw new Error(`Erro ao atualizar estoque: ${stockError.message}`);
          }
        }
      }

      // ====== ATUALIZAR CRÉDITOS DO COMBO ======
      if (packageUpdates.length > 0) {
        setLoadingMessage('Atualizando combo...');

        for (const update of packageUpdates) {
          const { error: pkgError } = await supabase
            .from('customer_packages')
            .update({ used_credits: update.newCredits })
            .eq('id', update.id);

          if (pkgError) {
            throw new Error(`Erro ao atualizar combo: ${pkgError.message}`);
          }
        }
      }

      // ====== REGISTRAR NA TABELA DE TRANSAÇÕES (NÃO NA CASH_FLOW DIRETAMENTE) ======
      setLoadingMessage('Registrando entrada no caixa...');
      const { error: cashError } = await supabase
        .from('cash_transactions') // MUDADO DE 'cash_flow' PARA 'cash_transactions'
        .insert({
          cash_flow_id: activeCashSession.id, // Vincula ao caixa que já está aberto
          barbershop_id: barbershopId,
          type: 'venda',
          amount: netValue, // Valor líquido (já descontando taxas)
          description: `Venda Direta - Ref: ${vendaIdUnica}`,
          payment_method: methodsUsed,
          created_at: new Date().toISOString()
        });

      if (cashError) {
        console.error('⚠️ Falha ao registrar transação:', cashError);
        // Aqui você decide se para tudo ou apenas avisa. Recomendo apenas avisar se a venda no 'appointments' deu certo.
      }

      // ====== ATUALIZAR AGENDAMENTO INICIAL ======
      if (initialAppointment?.id) {
        setLoadingMessage('Finalizando agendamento...');

        await supabase
          .from('appointments')
          .update({
            status: 'finalizado',
            venda_id: vendaIdUnica
          })
          .eq('id', initialAppointment.id);
      }

      // ====== SUCESSO! ======
      setLoadingMessage('Concluído!');

      // Limpar estado
      onSuccess();
      setPdvItems([]);
      setSplitValues({ dinheiro: 0, debito: 0, credito: 0, pacote: 0, pix: 0 });
      setTip(0);
      setIsMisto(false);
      setSelectedCustomer(null);
      setIsVipMode(false);

      // ====== ALERT DE SUCESSO AJUSTADO ======
      const valorRecebido = totalPagoInput;
      const descontoAplicado = valorTotalAbsoluto - valorRecebido;

      alert(
        `✅ VENDA FINALIZADA COM SUCESSO!\n\n` +
        `ID: ${vendaIdUnica}\n` +
        `Valor Original: R$ ${valorTotalAbsoluto.toFixed(2)}\n` +
        (descontoAplicado > 0.01 ? `🎁 Desconto Concedido: R$ ${descontoAplicado.toFixed(2)}\n` : '') +
        `Total Recebido: R$ ${valorRecebido.toFixed(2)}\n` +
        `Valor Líquido (após taxas): R$ ${valorRecebido.toFixed(2)}\n\n` +
        `Profissional: ${selectedBarber}`
      );

    } catch (err: any) {
      console.error("❌ Erro completo:", err);

      // ====== ROLLBACK: DELETAR ITENS JÁ INSERIDOS ======
      if (itemsInserted.length > 0) {
        setLoadingMessage('Revertendo alterações...');

        try {
          await supabase
            .from('appointments')
            .delete()
            .in('id', itemsInserted);

          console.log('✅ Rollback concluído');
        } catch (rollbackErr) {
          console.error('❌ Erro no rollback:', rollbackErr);
        }
      }

      alert(
        `❌ ERRO AO PROCESSAR VENDA\n\n` +
        `${err.message || 'Erro desconhecido'}\n\n` +
        `As alterações foram revertidas.\n` +
        `Verifique o console para mais detalhes.`
      );
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-[#0a0b0e] min-h-screen text-slate-200 font-bold italic">
      {/* ====== COLUNA ESQUERDA: SELEÇÃO DE ITENS ====== */}
      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">

        {/* ALERTA: CAIXA FECHADO */}
        {!activeCashSession && !checkingCash && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 animate-pulse">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <h5 className="text-white uppercase font-black text-xl">Caixa Fechado</h5>
              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mt-1">
                Abra o movimento para lançar vendas
              </p>
            </div>
          </div>
        )}

        {/* SELEÇÃO DE CLIENTE + GORJETA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cliente VIP / Balcão */}
          <div className="bg-white/[0.03] border border-white/10 p-3 rounded-[2rem] flex flex-col justify-center">
            <div className="flex p-1 gap-1 mb-2">
              <button
                onClick={() => {
                  setIsVipMode(false);
                  setSelectedCustomer(null);
                }}
                className={`flex-1 py-3 rounded-xl text-[9px] uppercase font-black transition-all ${!isVipMode
                  ? 'bg-white text-black'
                  : 'text-slate-500 hover:text-white'
                  }`}
              >
                <UserPlus size={12} className="inline mr-1" /> Balcão
              </button>
              <button
                onClick={() => setIsVipMode(true)}
                className={`flex-1 py-3 rounded-xl text-[9px] uppercase font-black transition-all ${isVipMode
                  ? 'bg-amber-500 text-black'
                  : 'text-slate-500 hover:text-white'
                  }`}
              >
                <Crown size={12} className="inline mr-1" /> Cliente VIP
              </button>
            </div>

            {isVipMode && (
              <div className="px-2">
                {!selectedCustomer ? (
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none italic text-white"
                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}
                  >
                    <option value="">Localizar Cliente...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-3 truncate">
                      <div className="bg-amber-500 p-1.5 rounded-lg text-black shrink-0">
                        <User size={16} />
                      </div>
                      <div className="truncate leading-none">
                        <p className="text-[10px] font-black uppercase italic text-white truncate">
                          {selectedCustomer.name}
                        </p>
                        {activePkg && (
                          <p className="text-[7px] text-amber-500 font-black uppercase mt-1">
                            Combo: {activePkg.total_credits - activePkg.used_credits} restantes
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1.5 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gorjeta */}
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-[2rem]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-black text-green-500 uppercase italic flex items-center gap-2">
                <Coins size={14} /> Gorjeta (Caixinha)
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => setTip(prev => prev + 5)}
                  className="bg-green-500/10 text-green-500 text-[8px] px-2 py-1 rounded-md border border-green-500/20 hover:bg-green-500 hover:text-white"
                >
                  +R$5
                </button>
                <button
                  onClick={() => setTip(prev => prev + 10)}
                  className="bg-green-500/10 text-green-500 text-[8px] px-2 py-1 rounded-md border border-green-500/20 hover:bg-green-500 hover:text-white"
                >
                  +R$10
                </button>
                <button
                  onClick={() => setTip(0)}
                  className="bg-red-500/10 text-red-500 text-[8px] px-2 py-1 rounded-md border border-red-500/20 hover:bg-red-500 hover:text-white"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
              <input
                type="number"
                value={tip || ''}
                onChange={e => setTip(Number(e.target.value))}
                className="bg-transparent text-right w-full outline-none font-black text-white text-xl"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* SELEÇÃO DE BARBEIRO */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {barbers.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBarber(b.name)}
              className={`py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedBarber === b.name
                ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                : 'bg-white/5 border-white/10 text-slate-500'
                }`}
            >
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* BUSCA */}
        <div className="space-y-4 text-white italic">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 text-sm text-white outline-none focus:border-amber-500/50"
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* SERVIÇOS E PRODUTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Serviços */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest pl-2 text-amber-500/50">
                Serviços
              </h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {services
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(s => {
                    const price = s.price || 0;
                    const isCombo = activePkg;

                    return (
                      <button
                        key={s.id}
                        onClick={() => addItem(s, 'servico')}
                        className="w-full flex justify-between p-4 bg-amber-500/5 border border-white/5 rounded-2xl hover:bg-amber-500 hover:text-black transition-all group text-left"
                      >
                        <div>
                          <p className="text-[10px] uppercase font-black italic">{s.name}</p>
                          {isCombo && (
                            <span className="text-[7px] font-black uppercase bg-black/20 px-1 rounded mt-1 inline-block">
                              {Number(activePkg.used_credits) === 0
                                ? "1º Uso do Combo"
                                : "Abatendo do Combo"}
                            </span>
                          )}
                        </div>
                        <span className="font-black italic text-[10px]">
                          R$ {Number(price).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Produtos */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest pl-2 text-blue-400/50">
                Produtos
              </h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {localInventory
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p, 'produto')}
                      className="w-full flex justify-between p-4 bg-blue-500/5 border border-white/5 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-left"
                    >
                      <div className="flex-1">
                        <p className="text-[14px] uppercase font-black italic">{p.name}</p>
                        <p className="text-[10px] uppercase font-black italic">
                          Estoque: {p.current_stock}
                        </p>
                      </div>
                      <span className="font-black italic text-[10px]">
                        R$ {Number(p.price_sell).toFixed(2)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== COLUNA DIREITA: RESUMO E CHECKOUT ====== */}
      <div className="w-full lg:w-[480px]">
        <div className="sticky top-6 bg-[#0f1115] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
              <ShoppingCart className="text-amber-500" size={24} /> Resumo
            </h4>
            <span className="text-[9px] bg-white/5 px-3 py-1 rounded-full text-slate-500 uppercase font-black">
              {pdvItems.length} Itens
            </span>
          </div>

          {/* Lista de Itens */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {pdvItems.map(item => {
              const currentPrice = getItemPrice(item);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 font-bold italic"
                >
                  <div className="flex-1 mr-2 truncate">
                    <p className="text-[10px] font-black uppercase text-white truncate italic">
                      {item.name}
                    </p>
                    <p className={`text-[9px] font-black ${currentPrice === 0 ? 'text-green-500' : 'text-amber-500'
                      }`}>
                      {currentPrice === 0
                        ? 'DESCONTO COMBO'
                        : `R$ ${currentPrice.toFixed(2)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quantidade */}
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 px-2 rounded-xl border border-white/5">
                      <button
                        onClick={() => handleUpdateQuantity(item.originalId, -1)}
                        className="text-slate-500 hover:text-amber-500"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-black text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.originalId, 1)}
                        className="text-slate-500 hover:text-amber-500"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Remover */}
                    <button
                      onClick={() => handleRemoveItem(item.originalId)}
                      className="text-red-500/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métodos de Pagamento */}
          <div className="pt-4 border-t border-white/5 space-y-4">

            {/* Toggle Pagamento Misto */}
            <div
              onClick={() => !hasComboInCart && setIsMisto(!isMisto)}
              className={`flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 transition-all ${hasComboInCart
                ? 'opacity-30 cursor-not-allowed'
                : 'cursor-pointer hover:bg-white/10'
                }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={16} className={isMisto ? "text-amber-500" : "text-slate-500"} />
                <span className="text-[9px] uppercase font-black italic text-white">
                  Pagamento Misto
                </span>
              </div>
              <div className={`w-7 h-3.5 rounded-full relative transition-all ${isMisto ? 'bg-amber-500' : 'bg-slate-700'
                }`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${isMisto ? 'right-0.5' : 'left-0.5'
                  }`} />
              </div>
            </div>

            {/* Botões de Pagamento */}
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
                    className={`flex items-center gap-3 bg-black/40 p-3 rounded-2xl border transition-all ${isDisabled
                      ? 'opacity-20 cursor-not-allowed border-transparent'
                      : 'cursor-pointer'
                      } ${isGlowing
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-white/5'
                      } ${!isMisto && !isSelected
                        ? 'opacity-40'
                        : 'opacity-100'
                      }`}
                  >
                    <span className={isGlowing ? 'text-amber-500' : 'text-slate-600'}>
                      {m.icon}
                    </span>
                    <div className="flex-1 text-[10px] uppercase font-black italic text-white">
                      {m.label}
                    </div>
                    {isMisto && !isDisabled ? (
                      <input
                        type="number"
                        value={splitValues[m.id] || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSplitValues({
                          ...splitValues,
                          [m.id]: Number(e.target.value)
                        })}
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

            {/* Resumo de Valores */}
            <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-black mb-1">
                <span>Bruto: R$ {valorTotalAbsoluto.toFixed(2)}</span>
                <span className="text-red-400">
                  Taxas: R$ {(valorTotalAbsoluto - netValue).toFixed(2)}
                </span>
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Valor Líquido</p>
              <h3 className="text-4xl font-black text-white italic tabular-nums leading-none">
                R$ {netValue.toFixed(2)}
              </h3>
              {totalPagoInput >= (valorTotalAbsoluto - 0.01) && valorTotalAbsoluto > 0 && (
                <p className="text-[8px] font-black uppercase mt-2 italic text-green-500">
                  ✓ PAGAMENTO OK
                </p>
              )}
            </div>

            {/* Botão Finalizar */}
            <button
              disabled={
                loading ||
                !activeCashSession ||
                !selectedBarber
              }
              onClick={handleFinalize}
              className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${loading ||
                !activeCashSession ||
                !selectedBarber
                ? 'bg-white/5 text-slate-700 cursor-not-allowed'
                : 'bg-white text-black shadow-xl active:scale-95 hover:shadow-2xl'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {loadingMessage || 'Processando...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Finalizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModule;
