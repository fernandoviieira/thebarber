import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart, Loader2, Plus, Minus, Crown,
  Search, User, Trash2, UserPlus, CheckCircle2, Banknote, QrCode,
  CreditCard, AlertTriangle, Layers, Zap, Coins, Package, Award
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
  const [localCustomers, setLocalCustomers] = useState<any[]>(customers);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isVipMode, setIsVipMode] = useState(false);
  const [isMisto, setIsMisto] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'pacote'>('pix');

  const [isSubscriber, setIsSubscriber] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(null);
  const [checkingSubscriber, setCheckingSubscriber] = useState(false);
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

  useEffect(() => {
    setLocalCustomers(customers || []);
  }, [customers]);

  useEffect(() => {
    setLocalInventory(inventory || []);
  }, [inventory]);

  const checkIfSubscriber = useCallback(async (customerId?: string, forcedPhone?: string) => {
    if ((!customerId && !forcedPhone) || !barbershopId) return;
    setCheckingSubscriber(true);

    try {
      let targetPhone = forcedPhone;
      if (customerId && customerId !== 'temp-id' && !targetPhone) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', customerId)
          .single();
        targetPhone = customerData?.phone;
      }

      if (!targetPhone || targetPhone === 'Balcão') {
        setIsSubscriber(false);
        setCheckingSubscriber(false);
        return;
      }

      const cleanPhone = targetPhone.replace(/\D/g, '');

      const { data, error: subError } = await supabase
        .from('club_subscriptions')
        .select(`
        id,
        status,
        plan:plan_id ( id, name, limit_services ),
        profile:customer_id ( phone ) 
      `)
        .eq('status', 'active')
        .eq('barbershop_id', barbershopId)
        .filter('profile.phone', 'ilike', `%${cleanPhone}%`)
        .maybeSingle();

      if (subError) throw subError;

      if (data) {
        const { data: usageData, error: usageError } = await supabase
          .from('club_usage_history')
          .select('id, used_at')
          .eq('subscription_id', data.id)
          .gte('used_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        const usedCount = usageData?.length || 0;
        const limit = data.plan?.limit_services || 999;

        setIsSubscriber(true);
        setActiveSubscription({
          id: data.id,
          planId: data.plan?.id,
          planName: data.plan?.name || 'Plano',
          limit: limit,
          usedCount: usedCount,
          remaining: Math.max(0, limit - usedCount)
        });
      } else {
        setIsSubscriber(false);
        setActiveSubscription(null);
      }
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      setIsSubscriber(false);
    } finally {
      setCheckingSubscriber(false);
    }
  }, [barbershopId]);

  useEffect(() => {
    if (selectedCustomer?.id) {
      checkIfSubscriber(selectedCustomer.id);
    } else {
      setIsSubscriber(false);
      setActiveSubscription(null);
    }
  }, [selectedCustomer, checkIfSubscriber]);

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
        setLocalCustomers(prev => {
          const exists = prev.some(c => c.id === data.id);
          if (!exists) return [data, ...prev];
          return prev.map(c => (c.id === data.id ? data : c));
        });

        await checkIfSubscriber(data.id);
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar cliente:', error);
    }
  }, [selectedCustomer?.id, checkIfSubscriber]);

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
      if (initialAppointment.customerPhone && initialAppointment.customerPhone !== 'Balcão') {
        checkIfSubscriber(undefined, initialAppointment.customerPhone);

        setSelectedCustomer({
          name: initialAppointment.customerName,
          phone: initialAppointment.customerPhone,
          id: 'temp-id'
        });
      }

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

  const activePkg = useMemo(() => {
    if (!selectedCustomer?.customer_packages) {
      return null;
    }

    const pkg = selectedCustomer.customer_packages.find(
      (p: any) => Number(p.used_credits) < Number(p.total_credits)
    );
    return pkg;
  }, [selectedCustomer]);

  const isItemInActivePackage = useCallback((itemName: string) => {
    if (!activePkg) return false;

    const pkgName = String(activePkg.package_name || activePkg.name || '').toLowerCase().trim();
    const serviceName = String(itemName || '').toLowerCase().trim();

    const match = pkgName === 'combo' || pkgName === 'pacote' || pkgName === 'plano' ||
      pkgName.includes(serviceName) || serviceName.includes(pkgName);
    return match;
  }, [activePkg]);

  const getItemPrice = useCallback((item: any) => {
    const baseService = services.find(s => s.id === item.originalId);
    const baseProduct = localInventory.find(p => p.id === item.originalId);

    const fallbackPrice = item.price !== undefined ? item.price : 0;
    const basePrice = Number(baseService?.price || baseProduct?.price_sell || fallbackPrice);


    if (item.type === 'produto') return basePrice;

    if (item.type === 'servico' && isSubscriber && activeSubscription) {
      if (activeSubscription.remaining > 0) {
        return 0;
      }
    }

    if (item.type === 'servico' && activePkg && isItemInActivePackage(item.name)) {
      const jaUsou = Number(activePkg.used_credits) || 0;
      if (jaUsou > 0) return 0;
      return Number(activePkg.price_paid) || 0;
    }

    return basePrice;
  }, [activePkg, services, localInventory, isItemInActivePackage, isSubscriber, activeSubscription]);

  const totalFinal = useMemo(() =>
    pdvItems.reduce((acc, item) =>
      acc + (Number(getItemPrice(item)) * Number(item.quantity)), 0
    ), [pdvItems, getItemPrice]
  );

  const valorTotalAbsoluto = totalFinal + tip;

  const totalPagoInput = useMemo(() => {
    if (!isMisto) {
      return valorTotalAbsoluto;
    }

    return Object.values(splitValues).reduce((acc, curr) =>
      Number(acc) + Number(curr), 0
    ) as number;
  }, [splitValues, isMisto, valorTotalAbsoluto]);

  const calculateNet = useCallback((bruto: number, method: string) => {
    const feeKey = `fee_${method.toLowerCase()}`;
    const feePercent = fees[feeKey] || 0;
    return bruto * (1 - feePercent / 100);
  }, [fees]);

  const descontoNominal = useMemo(() => {
    if (!isMisto) return 0;

    const recebido = totalPagoInput;
    const devido = valorTotalAbsoluto;
    return devido > recebido ? devido - recebido : 0;
  }, [totalPagoInput, valorTotalAbsoluto, isMisto]);

  const hasComboInCart = useMemo(() => {
    if (!activePkg || pdvItems.length === 0) return false;

    return pdvItems.some(item => {
      const isService = item.type === 'servico';
      const match = isItemInActivePackage(item.name);
      return isService && match;
    });
  }, [pdvItems, activePkg, isItemInActivePackage]);

  const hasSubscriberService = useMemo(() => {
    if (!isSubscriber || !activeSubscription || pdvItems.length === 0) return false;

    const hasService = pdvItems.some(item => item.type === 'servico');
    const hasCredits = activeSubscription.remaining > 0;

    return isSubscriber && hasService && hasCredits;
  }, [isSubscriber, activeSubscription, pdvItems]);

  useEffect(() => {
    if (isInitialized && valorTotalAbsoluto >= 0 && !isMisto) {
      const method = hasSubscriberService ? 'pacote' : (hasComboInCart ? 'pacote' : paymentMethod);

      setSplitValues({
        dinheiro: 0, pix: 0, debito: 0, credito: 0, pacote: 0,
        [method]: valorTotalAbsoluto
      });
    }
  }, [valorTotalAbsoluto, hasComboInCart, hasSubscriberService, isMisto, isInitialized, paymentMethod]);

  const checkSubscriptionByPhone = useCallback(async (phone: string) => {
    if (!phone || phone === 'Balcão' || !barbershopId) return;
    setCheckingSubscriber(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('club_subscriptions')
        .select(`
        id,
        status,
        plan:plan_id ( id, name, limit_services ),
        profile:customer_id ( phone ) 
      `)
        .eq('status', 'active')
        .eq('barbershop_id', barbershopId)
        .filter('profile.phone', 'ilike', `%${cleanPhone}%`)
        .maybeSingle();

      if (data) {
        setIsSubscriber(true);
        setActiveSubscription({ /* ... dados da sub ... */ });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingSubscriber(false);
    }
  }, [barbershopId]);

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
      const method = hasSubscriberService ? 'pacote' : (hasComboInCart ? 'pacote' : paymentMethod);
      const feeKey = `fee_${method}`;
      const feePercent = fees[feeKey] || 0;

      totalTaxas = valorTotalAbsoluto * (feePercent / 100);
      liquidoTotal = valorTotalAbsoluto - totalTaxas;
    }

    return { netValue: liquidoTotal, taxasCartao: totalTaxas };
  }, [splitValues, fees, isMisto, valorTotalAbsoluto, paymentMethod, hasComboInCart, hasSubscriberService]);

  const handleMethodToggle = useCallback((method: string) => {
    if ((hasComboInCart || hasSubscriberService) && method !== 'pacote') return;
    if (!hasComboInCart && !hasSubscriberService && method === 'pacote') return;

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
  }, [hasComboInCart, hasSubscriberService, isMisto, valorTotalAbsoluto]);

  useEffect(() => {
    if (hasComboInCart || hasSubscriberService) {
      setPaymentMethod('pacote');
      setSplitValues({
        dinheiro: 0, pix: 0, debito: 0, credito: 0,
        pacote: valorTotalAbsoluto
      });
    } else if (paymentMethod === 'pacote' && !hasComboInCart && !hasSubscriberService) {
      setPaymentMethod('pix');
    }
  }, [hasComboInCart, hasSubscriberService, valorTotalAbsoluto, paymentMethod]);

  useEffect(() => {
    if (!barbershopId) return;
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
              if (selectedCustomer?.id === payload.old.id) {
                setSelectedCustomer(null);
                setIsVipMode(false);
                setIsSubscriber(false);
                setActiveSubscription(null);
              }
              return current.filter(c => c.id !== payload.old.id);
            }

            return current;
          });

          if (payload.eventType === 'UPDATE' && selectedCustomer?.id === payload.new.id) {
            reloadSelectedCustomer();
          }
        }
      )
      .subscribe();

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
          const affectedCustomerId =
            payload.eventType === 'DELETE' ? payload.old?.customer_id : payload.new?.customer_id;

          if (selectedCustomer?.id && affectedCustomerId === selectedCustomer.id) {
            reloadSelectedCustomer();
          }
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel(`rt_subscriptions_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_subscriptions',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          if (selectedCustomer?.id) {
            checkIfSubscriber(selectedCustomer.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(packagesChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [barbershopId, fetchInventory, fetchCustomers, selectedCustomer?.id, reloadSelectedCustomer, checkIfSubscriber]);

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

    if (isMisto && !hasComboInCart && !hasSubscriberService && valorTotalAbsoluto > 0 && valorFaltante > 0.01) {
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

      const methodsUsed = hasSubscriberService
        ? "PLANO ASSINATURA"
        : (hasComboInCart
          ? "PACOTE"
          : (Object.entries(splitValues) as [string, number][])
            .filter(([_, v]) => v > 0)
            .map(([k, v]) => `${k.toUpperCase()}(R$${v.toFixed(2)})`)
            .join(' + ') || paymentMethod.toUpperCase());

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
        const isSubscriptionRedemption = !!(isSubscriber && item.type === 'servico' && activeSubscription && activeSubscription.remaining > 0);

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

        if (isSubscriptionRedemption && activeSubscription) {
          setLoadingMessage(`Registrando uso do plano ${activeSubscription.planName}...`);

          const { error: usageError } = await supabase
            .from('club_usage_history')
            .insert([{
              subscription_id: activeSubscription.id,
              appointment_id: initialAppointment?.id || null,
              used_at: new Date().toISOString()
            }]);

          if (usageError) {
            console.error('❌ Erro ao registrar uso da assinatura:', usageError);
            throw new Error('Erro ao registrar uso da assinatura');
          }
        }
      }

      const appointmentPayload: any = {
        venda_id: vendaIdUnica,
        barbershop_id: barbershopId,
        customer_name: selectedCustomer ? selectedCustomer.name : (initialAppointment?.customerName || "Venda Direta"),
        service: hasSubscriberService ? `${serviceResumo} (Plano Assinatura)` : (hasComboInCart ? `${serviceResumo} (Pacote)` : serviceResumo),
        barber: selectedBarber,
        barber_id: barberObj?.id || null,
        date: today,
        time: time,
        original_price: Number(valorTotalAbsoluto) || 0,
        price: Number(netValue) || 0,
        payment_method: methodsUsed,
        status: 'finalizado',
        customer_phone: finalPhone,
        is_package_redemption: !!(hasComboInCart || hasSubscriberService),
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

      if (hasSubscriberService && selectedCustomer) {
        await checkIfSubscriber(selectedCustomer.id);
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
      const descontoAplicado = isMisto ? (valorTotalAbsoluto - valorRecebido) : 0;

      const mensagemSucesso = hasSubscriberService
        ? `✅ VENDA FINALIZADA COM SUCESSO (PLANO ASSINATURA)!\n\n` +
        `ID: ${vendaIdUnica}\n` +
        `Cliente: ${selectedCustomer?.name}\n` +
        `Plano: ${activeSubscription?.planName}\n` +
        `Usos restantes: ${activeSubscription ? activeSubscription.remaining - 1 : 0}\n\n` +
        `Profissional: ${selectedBarber}\n` +
        `Resumo: ${serviceResumo}`
        : `✅ VENDA FINALIZADA COM SUCESSO!\n\n` +
        `ID: ${vendaIdUnica}\n` +
        `Bruto (Tabela): R$ ${valorTotalAbsoluto.toFixed(2)}\n` +
        (descontoAplicado > 0.01 ? `🎁 Desconto: R$ ${descontoAplicado.toFixed(2)}\n` : '') +
        `Recebido (Bruto): R$ ${valorRecebido.toFixed(2)}\n` +
        `Líquido (Caixa): R$ ${netValue.toFixed(2)}\n\n` +
        `Profissional: ${selectedBarber}\n` +
        `Resumo: ${serviceResumo}`;

      alert(mensagemSucesso);

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
                  setIsSubscriber(false);
                  setActiveSubscription(null);
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
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSubscriber ? 'bg-purple-500' : 'bg-amber-500'
                        }`}>
                        {isSubscriber ? (
                          <Award size={16} className="text-white" />
                        ) : (
                          <User size={16} className="text-black" />
                        )}
                      </div>
                      <div className="truncate leading-none">
                        <p className="text-[10px] font-black uppercase italic text-white truncate">
                          {selectedCustomer.name}
                        </p>
                        {checkingSubscriber && (
                          <p className="text-[7px] text-blue-400 font-black uppercase mt-1">
                            Verificando assinatura...
                          </p>
                        )}
                        {isSubscriber && activeSubscription && !checkingSubscriber && (
                          <p className="text-[7px] text-purple-400 font-black uppercase mt-1">
                            {activeSubscription.planName}: {activeSubscription.remaining} restantes
                          </p>
                        )}
                        {activePkg && !isSubscriber && (
                          <p className="text-[7px] text-amber-500 font-black uppercase mt-1">
                            Combo: {Number(activePkg.total_credits) - Number(activePkg.used_credits)} restantes
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsSubscriber(false);
                        setActiveSubscription(null);
                      }}
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
                    const isSubscriberService = isSubscriber && activeSubscription && activeSubscription.remaining > 0;

                    return (
                      <button
                        key={s.id}
                        onClick={() => addItem(s, 'servico')}
                        className={`w-full flex justify-between p-4 border border-white/5 rounded-2xl transition-all group text-left
                          ${isSubscriberService
                            ? 'bg-purple-500/10 hover:bg-purple-500 hover:text-white'
                            : 'bg-amber-500/5 hover:bg-amber-500 hover:text-black'
                          }`}
                      >
                        <div>
                          <p className="text-[10px] uppercase font-black italic">{s.name}</p>
                          {isSubscriberService && (
                            <span className="text-[7px] font-black uppercase bg-purple-500/30 px-1 rounded mt-1 inline-block text-purple-300">
                              GRÁTIS - ASSINANTE ({activeSubscription.remaining} restantes)
                            </span>
                          )}
                          {isCombo && !isSubscriberService && (
                            <span className="text-[7px] font-black uppercase bg-black/20 px-1 rounded mt-1 inline-block">
                              {Number(activePkg.used_credits) === 0
                                ? "1º Uso do Combo"
                                : "Abatendo do Combo"}
                            </span>
                          )}
                        </div>
                        <span className={`font-black italic text-[10px] ${isSubscriberService ? 'text-purple-400 line-through' : ''
                          }`}>
                          {isSubscriberService ? 'R$ 0,00' : `R$ ${Number(price).toFixed(2)}`}
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
              const showSubscriberTag = item.type === 'servico' && currentPrice === 0 && isSubscriber;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border font-bold italic
                    ${showSubscriberTag ? 'border-purple-500/30' : 'border-white/5'}`}
                >
                  <div className="flex-1 mr-2 truncate">
                    <p className="text-[10px] font-black uppercase text-white truncate italic">
                      {item.name}
                    </p>
                    <p className={`text-[9px] font-black ${showSubscriberTag ? 'text-purple-400' : (showComboTag ? 'text-green-500' : 'text-amber-500')
                      }`}>
                      {showSubscriberTag
                        ? 'GRÁTIS - ASSINANTE'
                        : showComboTag
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

          {/* Card informativo de assinante */}
          {isSubscriber && activeSubscription && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-purple-400" />
                <span className="text-[9px] font-black text-purple-400 uppercase">
                  Assinante Ativo - {activeSubscription.planName}
                </span>
              </div>
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>Usos no mês: {activeSubscription.usedCount}</span>
                <span>Restantes: {activeSubscription.remaining}</span>
              </div>
              {activeSubscription.remaining === 0 && (
                <p className="text-[8px] text-red-400 mt-2 text-center">
                  ⚠️ Limite de usos atingido! Serviços serão cobrados normalmente.
                </p>
              )}
            </div>
          )}

          {/* Métodos de Pagamento */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div
              onClick={() => !hasComboInCart && !hasSubscriberService && setIsMisto(!isMisto)}
              className={`flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 transition-all ${(hasComboInCart || hasSubscriberService)
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
                { id: 'pacote', icon: <Package size={16} />, label: 'Assinatura/Combo' }
              ].map(m => {
                const isSelected = paymentMethod === m.id;
                const isDisabled = (hasComboInCart || hasSubscriberService) ? (m.id !== 'pacote') : (m.id === 'pacote');
                const isGlowing = splitValues[m.id] > 0 || (isSelected && ((hasComboInCart || hasSubscriberService) || !isMisto));

                return (
                  <div
                    key={m.id}
                    onClick={() => handleMethodToggle(m.id as any)}
                    className={`flex items-center gap-3 bg-black/40 p-3 rounded-2xl border transition-all ${isDisabled
                      ? 'opacity-20 cursor-not-allowed border-transparent'
                      : 'cursor-pointer'
                      } ${isGlowing
                        ? m.id === 'pacote' && (hasSubscriberService || hasComboInCart)
                          ? 'border-purple-500 bg-purple-500/5'
                          : 'border-amber-500 bg-amber-500/5'
                        : 'border-white/5'
                      } ${!isMisto && !isSelected
                        ? 'opacity-40'
                        : 'opacity-100'
                      }`}
                  >
                    <span className={isGlowing
                      ? (m.id === 'pacote' && (hasSubscriberService || hasComboInCart) ? 'text-purple-500' : 'text-amber-500')
                      : 'text-slate-600'
                    }>
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
                      <Zap size={12} className={isGlowing
                        ? (m.id === 'pacote' && (hasSubscriberService || hasComboInCart) ? 'text-purple-500' : 'text-amber-500')
                        : 'text-slate-800'
                      } />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 space-y-2">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-black">
                <span>Preço de Tabela: R$ {valorTotalAbsoluto.toFixed(2)}</span>
                {isMisto && descontoNominal > 0.01 && (
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
              disabled={loading || !activeCashSession || !selectedBarber || checkingSubscriber}
              onClick={handleFinalize}
              className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${loading || !activeCashSession || !selectedBarber || checkingSubscriber
                ? 'bg-white/5 text-slate-700 cursor-not-allowed'
                : hasSubscriberService
                  ? 'bg-purple-500 text-white shadow-xl hover:bg-purple-600 active:scale-95'
                  : 'bg-white text-black shadow-xl active:scale-95 hover:shadow-2xl'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {loadingMessage || 'Processando...'}
                </>
              ) : checkingSubscriber ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Verificando assinatura...
                </>
              ) : (
                <>
                  {hasSubscriberService ? (
                    <>
                      <Award size={18} /> Finalizar com Plano
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Finalizar
                    </>
                  )}
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