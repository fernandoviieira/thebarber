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

  // ✅ NOVO: clientes em estado local para refletir realtime sem F5
  const [localCustomers, setLocalCustomers] = useState<any[]>(customers);

  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isVipMode, setIsVipMode] = useState(false);
  const [isMisto, setIsMisto] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('pix');

  const [fees, setFees] = useState<any>({
    fee_dinheiro: 0, fee_pix: 0, fee_debito: 0, fee_credito: 0
  });

  const [splitValues, setSplitValues] = useState<Record<string, number>>({
    dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0
  });

  const [tip, setTip] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCashSession, setActiveCashSession] = useState<any>(null);
  const [checkingCash, setCheckingCash] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ Mantém localCustomers sincronizado com prop (primeiro load / mudanças externas)
  useEffect(() => {
    setLocalCustomers(customers || []);
  }, [customers]);

  // ✅ Mantém localInventory sincronizado com prop (primeiro load / mudanças externas)
  useEffect(() => {
    setLocalInventory(inventory || []);
  }, [inventory]);

  // ✅ NOVO: Função para recarregar dados do cliente selecionado (inclui pacotes)
  const reloadSelectedCustomer = useCallback(async () => {
    if (!selectedCustomer?.id) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_packages (*)`)
        .eq('id', selectedCustomer.id)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedCustomer(data);

        // ✅ também atualiza na lista local para refletir mudanças (nome, telefone etc.)
        setLocalCustomers(prev => {
          const exists = prev.some(c => c.id === data.id);
          if (!exists) return [data, ...prev];
          return prev.map(c => (c.id === data.id ? data : c));
        });

        console.log('✅ Cliente atualizado com sucesso:', data);
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar cliente:', error);
    }
  }, [selectedCustomer?.id]);

  const fetchInventory = useCallback(async () => {
    if (!barbershopId) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('barbershop_id', barbershopId);

      if (error) throw error;
      if (data) setLocalInventory(data);
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
    } finally {
      setLoadingData(false);
    }
  }, [barbershopId]);

  // ✅ NOVO: buscar clientes do barbershop (caso queira garantir que o realtime sempre tenha base correta)
  const fetchCustomers = useCallback(async () => {
    if (!barbershopId) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_packages (*)`)
        .eq('barbershop_id', barbershopId)
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setLocalCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }, [barbershopId]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('barbershop_settings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();
      if (data) setFees(data);
    };
    if (barbershopId) fetchSettings();
  }, [barbershopId]);

  const addItem = useCallback((item: any, type: 'servico' | 'produto') => {
    setPdvItems(prev => {
      const existing = prev.find(i => i.originalId === item.id);
      if (existing) {
        return prev.map(i =>
          i.originalId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: Math.random().toString(),
        originalId: item.id,
        name: item.name,
        type,
        quantity: 1
      }];
    });
  }, []);

  useEffect(() => {
    if (initialAppointment && services.length > 0 && !isInitialized) {
      setPdvItems([]);

      if (initialAppointment.barber) setSelectedBarber(initialAppointment.barber);

      const serviceObj = services.find(s =>
        s.name.toLowerCase() === String(initialAppointment.service || '').toLowerCase()
      );

      if (serviceObj) {
        addItem(serviceObj, 'servico');
      } else {
        setPdvItems([{
          id: `temp-${Date.now()}`,
          originalId: initialAppointment.id,
          name: initialAppointment.service,
          type: 'servico',
          quantity: 1,
          price: Number(initialAppointment.price)
        }]);
      }

      setIsInitialized(true);
    }
  }, [initialAppointment, services, isInitialized, addItem]);

  useEffect(() => {
    if (barbers.length === 1 && !selectedBarber) {
      setSelectedBarber(barbers[0].name);
    }
  }, [barbers, selectedBarber]);

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
    if (barbershopId) checkCash();
  }, [barbershopId]);

  // ✅ Pacote ativo do cliente (primeiro pacote com créditos restantes)
  const activePkg = useMemo(() => {
    if (!selectedCustomer?.customer_packages) return null;
    const pkg = selectedCustomer.customer_packages.find(
      (p: any) => Number(p.used_credits) < Number(p.total_credits)
    );
    return pkg;
  }, [selectedCustomer]);

  const isItemInActivePackage = useCallback((itemName: string) => {
    if (!activePkg) return false;
    const pkgName = String(activePkg.package_name || activePkg.name || '').toLowerCase().trim();
    const serviceName = String(itemName || '').toLowerCase().trim();

    // combos genéricos
    if (pkgName === 'combo' || pkgName === 'pacote' || pkgName === 'plano') return true;

    return pkgName.includes(serviceName) || serviceName.includes(pkgName);
  }, [activePkg]);

  const getItemPrice = useCallback((item: any) => {
    const baseService = services.find(s => s.id === item.originalId);
    const baseProduct = localInventory.find(p => p.id === item.originalId);

    const fallbackPrice = item.price !== undefined ? item.price : 0;
    const basePrice = Number(baseService?.price || baseProduct?.price_sell || fallbackPrice);

    if (item.type === 'produto') return basePrice;

    // ✅ REGRA DO COMBO:
    // 1º uso (used_credits == 0): cobra price_paid
    // demais usos: isento (0)
    if (item.type === 'servico' && activePkg && isItemInActivePackage(item.name)) {
      const jaUsou = Number(activePkg.used_credits) || 0;
      if (jaUsou > 0) return 0;
      return Number(activePkg.price_paid) || 0;
    }

    return basePrice;
  }, [activePkg, services, localInventory, isItemInActivePackage]);

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

  const calculateNet = useCallback((bruto: number, method: string) => {
    const feeKey = `fee_${method.toLowerCase()}`;
    const feePercent = fees[feeKey] || 0;
    return bruto * (1 - feePercent / 100);
  }, [fees]);

  const descontoNominal = useMemo(() => {
    const recebido = totalPagoInput;
    const devido = valorTotalAbsoluto;
    return devido > recebido ? devido - recebido : 0;
  }, [totalPagoInput, valorTotalAbsoluto]);

  const hasComboInCart = useMemo(() => {
    if (!activePkg || pdvItems.length === 0) return false;

    return pdvItems.some(item => {
      const isService = item.type === 'servico';
      const match = isItemInActivePackage(item.name);
      return isService && match;
    });
  }, [pdvItems, activePkg, isItemInActivePackage]);

  useEffect(() => {
    if (isInitialized && valorTotalAbsoluto >= 0 && !isMisto) {
      const method = hasComboInCart ? 'pacote' : paymentMethod;
      setSplitValues({
        dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0,
        [method]: valorTotalAbsoluto
      });
    }
  }, [valorTotalAbsoluto, hasComboInCart, isMisto, isInitialized, paymentMethod]);

  const { netValue, taxasCartao } = useMemo(() => {
    let liquidoTotal = 0;
    let totalTaxas = 0;

    if (isMisto) {
      (Object.entries(splitValues) as [string, number][]).forEach(([method, value]) => {
        if (value <= 0) return;
        const feeKey = `fee_${method}`;
        const feePercent = fees[feeKey] || 0;
        const valorTaxa = value * (feePercent / 100);
        totalTaxas += valorTaxa;
        liquidoTotal += (value - valorTaxa);
      });
    } else {
      const method = hasComboInCart ? 'pacote' : paymentMethod;
      const feeKey = `fee_${method}`;
      const feePercent = fees[feeKey] || 0;

      totalTaxas = valorTotalAbsoluto * (feePercent / 100);
      liquidoTotal = valorTotalAbsoluto - totalTaxas;
    }

    return { netValue: liquidoTotal, taxasCartao: totalTaxas };
  }, [splitValues, fees, isMisto, valorTotalAbsoluto, paymentMethod, hasComboInCart]);

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

  useEffect(() => {
    if (hasComboInCart) {
      setPaymentMethod('pacote');
      setSplitValues({
        dinheiro: 0, pix: 0, debito: 0, credito: 0,
        pacote: valorTotalAbsoluto
      });
    } else if (paymentMethod === 'pacote' && !hasComboInCart) {
      setPaymentMethod('pix');
    }
  }, [hasComboInCart, valorTotalAbsoluto, paymentMethod]);

  // =========================================================
  // ✅ REALTIME: INVENTORY + CUSTOMERS + CUSTOMER_PACKAGES
  // =========================================================
  useEffect(() => {
    if (!barbershopId) return;

    // base inicial (garante que o checkout já comece correto)
    fetchInventory();
    fetchCustomers();

    const inventoryChannel = supabase
      .channel(`rt_inventory_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('🔄 Realtime inventory:', payload);

          setLocalInventory((current) => {
            if (payload.eventType === 'INSERT') {
              const exists = current.find(i => i.id === payload.new.id);
              if (exists) return current;
              return [...current, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              return current.map(item => item.id === payload.new.id ? payload.new : item);
            }
            if (payload.eventType === 'DELETE') {
              return current.filter(item => item.id !== payload.old.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    // ✅ NOVO: Realtime customers para aparecer cliente novo sem F5
    const customersChannel = supabase
      .channel(`rt_customers_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('🔄 Realtime customers:', payload);

          setLocalCustomers((current) => {
            if (payload.eventType === 'INSERT') {
              const exists = current.some(c => c.id === payload.new.id);
              if (exists) return current;
              return [payload.new, ...current].sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
              );
            }

            if (payload.eventType === 'UPDATE') {
              const updated = current.map(c => (c.id === payload.new.id ? payload.new : c));
              return updated.sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
              );
            }

            if (payload.eventType === 'DELETE') {
              // se deletar o cliente que está selecionado, limpa seleção
              if (selectedCustomer?.id === payload.old.id) {
                setSelectedCustomer(null);
                setIsVipMode(false);
              }
              return current.filter(c => c.id !== payload.old.id);
            }

            return current;
          });

          // Se o cliente selecionado foi alterado, recarrega completo (inclui pacotes)
          if (payload.eventType === 'UPDATE' && selectedCustomer?.id === payload.new.id) {
            reloadSelectedCustomer();
          }
        }
      )
      .subscribe();

    // ✅ NOVO: Realtime customer_packages (INSERT/UPDATE/DELETE)
    // Isso resolve "novo combo" sem F5 (ex: inseriu pacote para o cliente)
    const packagesChannel = supabase
      .channel(`rt_customer_packages_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_packages',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('🔄 Realtime customer_packages:', payload);

          // Se afetar o cliente selecionado, recarrega para refletir combo/créditos na hora
          const affectedCustomerId =
            payload.eventType === 'DELETE' ? payload.old?.customer_id : payload.new?.customer_id;

          if (selectedCustomer?.id && affectedCustomerId === selectedCustomer.id) {
            reloadSelectedCustomer();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(packagesChannel);
    };
  }, [barbershopId, fetchInventory, fetchCustomers, selectedCustomer?.id, reloadSelectedCustomer]);

  // ✅ Listener adicional: quando há cliente selecionado, escuta eventos dele (insert/update/delete)
  // Isso ajuda mesmo que você não tenha barbershop_id no pacote (ou se o filtro do barbershop falhar)
  useEffect(() => {
    if (!selectedCustomer?.id) return;

    const channel = supabase
      .channel(`rt_customer_packages_customer_${selectedCustomer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_packages',
          filter: `customer_id=eq.${selectedCustomer.id}`
        },
        (payload) => {
          console.log('🔄 Pacotes do cliente em tempo real:', payload);
          reloadSelectedCustomer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomer?.id, reloadSelectedCustomer]);

  const handleUpdateQuantity = useCallback((originalId: string, delta: number) => {
    setPdvItems(prev => prev.map(item => {
      if (item.originalId === originalId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const handleRemoveItem = useCallback((originalId: string) => {
    setPdvItems(prev => prev.filter(i => i.originalId !== originalId));
  }, []);

  const handleFinalize = async () => {
    if (!activeCashSession) {
      return alert("❌ CAIXA FECHADO! Abra o movimento para continuar.");
    }

    if (!selectedBarber) {
      return alert("⚠️ Selecione o profissional antes de finalizar!");
    }

    const totalPago = totalPagoInput;
    const valorFaltante = valorTotalAbsoluto - totalPago;

    if (valorTotalAbsoluto < 0) {
      return alert("⚠️ Valor total inválido!");
    }

    if (!hasComboInCart && valorTotalAbsoluto > 0 && valorFaltante > 0.01) {
      const confirmarDesconto = window.confirm(
        `⚠️ VALOR ABAIXO DO TOTAL!\n\n` +
        `Total: R$ ${valorTotalAbsoluto.toFixed(2)}\n` +
        `Recebido: R$ ${totalPago.toFixed(2)}\n\n` +
        `Deseja aplicar R$ ${valorFaltante.toFixed(2)} como DESCONTO e finalizar?`
      );

      if (!confirmarDesconto) return;
    }

    const produtosNoCarrinho = pdvItems.filter(i => i.type === 'produto');
    for (const item of produtosNoCarrinho) {
      const produtoEstoque = localInventory.find(p => p.id === item.originalId);
      if (!produtoEstoque || Number(produtoEstoque.current_stock) < item.quantity) {
        return alert(`❌ Estoque insuficiente para: ${item.name}`);
      }
    }

    setLoading(true);
    setLoadingMessage('Iniciando venda...');

    const inventoryUpdates: any[] = [];
    const packageUpdates: any[] = [];

    try {
      const now = new Date();
      const today = initialAppointment?.date || now.toLocaleDateString('en-CA');
      const time = initialAppointment?.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const vendaIdUnica = `VENDA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const fallbackPhone = initialAppointment?.customerPhone || 'Balcão';
      const finalPhone = selectedCustomer?.phone || fallbackPhone;

      const methodsUsed = hasComboInCart
        ? "PACOTE"
        : (Object.entries(splitValues) as [string, number][])
          .filter(([_, v]) => v > 0)
          .map(([k, v]) => `${k.toUpperCase()}(R$${v.toFixed(2)})`)
          .join(' + ') || paymentMethod.toUpperCase();

      const barberObj = barbers.find(b => b.name === selectedBarber);

      const serviceParts: string[] = [];
      const pdvServices = pdvItems.filter(i => i.type === 'servico');
      const pdvProducts = pdvItems.filter(i => i.type === 'produto');

      pdvServices.forEach(s => {
        const qty = Number(s.quantity) || 1;
        serviceParts.push(qty > 1 ? `${s.name} x${qty}` : `${s.name}`);
      });

      pdvProducts.forEach(p => {
        const qty = Number(p.quantity) || 1;
        serviceParts.push(qty > 1 ? `(Produto) ${p.name} x${qty}` : `(Produto) ${p.name}`);
      });

      if (tip > 0) serviceParts.push(`Gorjeta R$ ${Number(tip).toFixed(2)}`);

      const serviceResumo = serviceParts.length > 0 ? serviceParts.join(' + ') : 'Venda Direta';

      for (const item of pdvItems) {
        const isPackageRedemption = !!(activePkg && item.type === 'servico' && isItemInActivePackage(item.name));

        if (item.type === 'produto') {
          const produtoAtual = localInventory.find(p => p.id === item.originalId);
          if (produtoAtual) {
            inventoryUpdates.push({
              id: item.originalId,
              newStock: Number(produtoAtual.current_stock) - item.quantity
            });
          }
        }

        if (isPackageRedemption && activePkg) {
          packageUpdates.push({
            id: activePkg.id,
            newCredits: Number(activePkg.used_credits) + item.quantity
          });
        }
      }

      const appointmentPayload: any = {
        venda_id: vendaIdUnica,
        barbershop_id: barbershopId,
        customer_name: selectedCustomer ? selectedCustomer.name : (initialAppointment?.customerName || "Venda Direta"),
        service: hasComboInCart ? `${serviceResumo} (Pacote)` : serviceResumo,
        barber: selectedBarber,
        barber_id: barberObj?.id || null,
        date: today,
        time: time,
        original_price: Number(valorTotalAbsoluto) || 0,
        price: Number(netValue) || 0,
        payment_method: methodsUsed,
        status: 'finalizado',
        customer_phone: finalPhone,
        is_package_redemption: !!hasComboInCart,
        tip_amount: tip || 0
      };

      setLoadingMessage('Salvando venda...');

      if (initialAppointment?.id) {
        const { error: updateErr } = await supabase
          .from('appointments')
          .update(appointmentPayload)
          .eq('id', initialAppointment.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('appointments')
          .insert(appointmentPayload);

        if (insertErr) throw insertErr;
      }

      if (inventoryUpdates.length > 0) {
        setLoadingMessage('Atualizando estoque...');
        for (const update of inventoryUpdates) {
          const { error: stockError } = await supabase
            .from('inventory')
            .update({ current_stock: update.newStock })
            .eq('id', update.id);

          if (stockError) throw new Error(`Erro ao atualizar estoque: ${stockError.message}`);
        }
      }

      if (packageUpdates.length > 0) {
        setLoadingMessage('Atualizando combo...');
        for (const update of packageUpdates) {
          const { error: pkgError } = await supabase
            .from('customer_packages')
            .update({ used_credits: update.newCredits })
            .eq('id', update.id);

          if (pkgError) throw new Error(`Erro ao atualizar combo: ${pkgError.message}`);
        }

        setLoadingMessage('Atualizando dados do cliente...');
        await reloadSelectedCustomer();
      }

      setLoadingMessage('Registrando entrada no caixa...');
      const { error: cashError } = await supabase
        .from('cash_transactions')
        .insert({
          cash_flow_id: activeCashSession.id,
          barbershop_id: barbershopId,
          type: 'venda',
          amount: netValue,
          description: `Venda - Ref: ${vendaIdUnica}`,
          payment_method: methodsUsed,
          created_at: new Date().toISOString()
        });

      if (cashError) console.error('⚠️ Falha ao registrar transação:', cashError);

      setLoadingMessage('Concluído!');

      onSuccess();
      setPdvItems([]);
      setSplitValues({ dinheiro: 0, debito: 0, credito: 0, pacote: 0, pix: 0 });
      setTip(0);
      setIsMisto(false);

      const valorRecebido = totalPagoInput;
      const descontoAplicado = valorTotalAbsoluto - valorRecebido;

      alert(
        `✅ VENDA FINALIZADA COM SUCESSO!\n\n` +
        `ID: ${vendaIdUnica}\n` +
        `Bruto (Tabela): R$ ${valorTotalAbsoluto.toFixed(2)}\n` +
        (descontoAplicado > 0.01 ? `🎁 Desconto: R$ ${descontoAplicado.toFixed(2)}\n` : '') +
        `Recebido (Bruto): R$ ${valorRecebido.toFixed(2)}\n` +
        `Líquido (Caixa): R$ ${netValue.toFixed(2)}\n\n` +
        `Profissional: ${selectedBarber}\n` +
        `Resumo: ${serviceResumo}\n`
      );

    } catch (err: any) {
      console.error("❌ Erro completo:", err);

      alert(
        `❌ ERRO AO PROCESSAR VENDA\n\n` +
        `${err.message || 'Erro desconhecido'}\n\n` +
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
                    onChange={(e) => {
                      const customer = localCustomers.find(c => c.id === e.target.value);
                      setSelectedCustomer(customer || null);
                    }}
                    value={''}
                  >
                    <option value="">Localizar Cliente...</option>
                    {localCustomers.map(c => (
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
                            Combo: {Number(activePkg.total_credits) - Number(activePkg.used_credits)} restantes
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
                    const isCombo = activePkg && isItemInActivePackage(s.name);

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
              const showComboTag = item.type === 'servico' && currentPrice === 0 && activePkg;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 font-bold italic"
                >
                  <div className="flex-1 mr-2 truncate">
                    <p className="text-[10px] font-black uppercase text-white truncate italic">
                      {item.name}
                    </p>
                    <p className={`text-[9px] font-black ${showComboTag ? 'text-green-500' : 'text-amber-500'
                      }`}>
                      {showComboTag
                        ? 'DESCONTO COMBO'
                        : `R$ ${currentPrice.toFixed(2)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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

            <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 space-y-2">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-black">
                <span>Preço de Tabela: R$ {valorTotalAbsoluto.toFixed(2)}</span>
                {descontoNominal > 0.01 && (
                  <span className="text-amber-500">
                    Desconto: - R$ {descontoNominal.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-black border-t border-white/5 pt-2">
                <span>Recebido (Bruto): R$ {totalPagoInput.toFixed(2)}</span>
                <span className="text-red-400">
                  Taxas Cartão: - R$ {taxasCartao.toFixed(2)}
                </span>
              </div>

              <div className="pt-2">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Valor Líquido (Caixa)</p>
                <h3 className="text-4xl font-black text-white italic tabular-nums leading-none">
                  R$ {netValue.toFixed(2)}
                </h3>
              </div>
            </div>

            <button
              disabled={loading || !activeCashSession || !selectedBarber}
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