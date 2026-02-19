import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users, Plus, Search, Phone, CreditCard,
  History, Calendar, Loader2, X, CheckCircle2, Trash2, Edit3, Save, PackagePlus, UserMinus, MessageCircle, Cake
} from 'lucide-react';

const CustomersModule = ({ barbershopId }: { barbershopId: string | null }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [barbershopSlug, setBarbershopSlug] = useState<string>('');

  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any | null>(null);
  const [packageForm, setPackageForm] = useState({ packageName: '', total_credits: '4', price_paid: '' });

  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [tempCredits, setTempCredits] = useState<number>(0);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', birth_date: '', hasPackage: false, packageName: '', total_credits: '4', price_paid: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (barbershopId) {
        fetchCustomers();
        const { data } = await supabase
          .from('barbershops')
          .select('slug')
          .eq('id', barbershopId)
          .single();

        if (data?.slug) setBarbershopSlug(data.slug);
      }
    };
    initialize();
  }, [barbershopId]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, customer_packages(*)')
      .eq('barbershop_id', barbershopId)
      .order('name');
    if (data) setCustomers(data);
    setLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert([{
        name: newCustomer.name,
        phone: newCustomer.phone || 'Sem Telefone',
        birth_date: newCustomer.birth_date || null,
        barbershop_id: barbershopId
      }])
      .select()
      .single();

    if (custError) {
      alert("Erro ao cadastrar cliente: " + custError.message);
      return;
    }

    if (customer && newCustomer.hasPackage) {
      await supabase.from('customer_packages').insert([{
        customer_id: customer.id,
        barbershop_id: barbershopId,
        package_name: newCustomer.packageName,
        total_credits: Number(newCustomer.total_credits),
        price_paid: Number(newCustomer.price_paid),
        used_credits: 0
      }]);
    }

    setIsModalOpen(false);
    setNewCustomer({ name: '', phone: '', birth_date: '', hasPackage: false, packageName: '', total_credits: '4', price_paid: '' });
    fetchCustomers();
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const { error } = await supabase
      .from('customers')
      .update({
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        birth_date: editingCustomer.birth_date || null
      })
      .eq('id', editingCustomer.id);

    if (error) {
      alert("Erro ao atualizar cliente: " + error.message);
    } else {
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (confirm(`ATENÇÃO: Deseja realmente excluir o cliente "${customerName}"? Isso apagará todos os pacotes vinculados.`)) {
      await supabase.from('customer_packages').delete().eq('customer_id', customerId);
      const { error } = await supabase.from('customers').delete().eq('id', customerId);

      if (!error) {
        fetchCustomers();
      } else {
        alert("Erro ao excluir cliente. Verifique se ele possui agendamentos no histórico.");
      }
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer) return;

    const { error } = await supabase.from('customer_packages').insert([{
      customer_id: targetCustomer.id,
      barbershop_id: barbershopId,
      package_name: packageForm.packageName,
      total_credits: Number(packageForm.total_credits),
      price_paid: Number(packageForm.price_paid),
      used_credits: 0
    }]);

    if (error) {
      alert("Erro ao adicionar pacote: " + error.message);
    } else {
      setIsAddPackageModalOpen(false);
      setPackageForm({ packageName: '', total_credits: '4', price_paid: '' });
      fetchCustomers();
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (confirm("Tem certeza que deseja excluir este pacote?")) {
      await supabase.from('customer_packages').delete().eq('id', packageId);
      fetchCustomers();
    }
  };

  const handleUpdateCredits = async (packageId: string) => {
    await supabase.from('customer_packages').update({ total_credits: tempCredits }).eq('id', packageId);
    setEditingPkgId(null);
    fetchCustomers();
  };

  const isBirthdayToday = (birthDate: string | null) => {
    if (!birthDate) return false;
    const today = new Date();
    const birth = new Date(birthDate + 'T00:00:00');
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
  };

  const sendBirthdayMessage = (customerName: string, phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const bookingLink = `https://thebarber-delta.vercel.app/${barbershopSlug}`;

    const text = `🎉🎂 *Feliz Aniversário, ${customerName}!* 🎂🎉
                  Que este dia seja repleto de alegrias, saúde e muitas realizações! 
                  Para comemorar, que tal dar aquele trato no visual?
                  Agende aqui: ${bookingLink}
                  Um grande abraço da equipe! 💈✨`;

    const params = new URLSearchParams({
      phone: `55${cleanPhone}`,
      text: text
    });

    window.open(`https://api.whatsapp.com/send?${params.toString()}`, '_blank');
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const birthdayCustomers = customers.filter(c => isBirthdayToday(c.birth_date));

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-white/5 pb-6 md:pb-8">
        <div className="space-y-2 md:space-y-3">
          <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase leading-none tracking-tighter">
            Gestão de <span className="text-amber-500">Clientes</span>
          </h2>
          <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-widest">
            Fidelização e controle de pacotes mensais
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all shadow-lg active:scale-95 w-full md:w-auto"
        >
          <Plus size={16} strokeWidth={4} className="md:w-[18px] md:h-[18px]" /> Novo Cliente
        </button>
      </header>

      {/* ALERTA DE ANIVERSARIANTES DO DIA */}
      {birthdayCustomers.length > 0 && (
        <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 border border-pink-500/30 rounded-2xl md:rounded-3xl p-5 md:p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <Cake className="text-pink-500" size={24} />
            <h3 className="text-lg md:text-xl font-black text-white uppercase italic">
              🎉 Aniversariantes do Dia!
            </h3>
          </div>
          <div className="space-y-3">
            {birthdayCustomers.map(customer => (
              <div key={customer.id} className="bg-black/30 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-sm md:text-base">{customer.name}</p>
                  <p className="text-slate-400 text-xs">{customer.phone}</p>
                </div>
                <button
                  onClick={() => sendBirthdayMessage(customer.name, customer.phone)}
                  className="bg-green-500 hover:bg-green-400 active:bg-green-400 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all active:scale-95"
                >
                  <MessageCircle size={16} /> Enviar Parabéns
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative group max-w-full md:max-w-xl">
        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/5 rounded-xl md:rounded-2xl py-4 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 text-sm md:text-base text-white font-bold outline-none focus:border-amber-500/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12 md:p-20">
          <Loader2 className="animate-spin text-amber-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {filtered.map(c => (
            <div key={c.id} className="bg-slate-900/40 border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-5 backdrop-blur-md hover:border-amber-500/30 transition-all flex flex-col h-full group relative overflow-hidden">

              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex gap-2">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Users size={18} className="md:w-5 md:h-5" />
                  </div>
                  <button
                    onClick={() => {
                      setEditingCustomer(c);
                      setIsEditModalOpen(true);
                    }}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-500/5 hover:bg-blue-500/20 active:bg-blue-500/20 flex items-center justify-center text-blue-500/40 hover:text-blue-500 active:text-blue-500 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 shrink-0"
                    title="Editar Cliente"
                  >
                    <Edit3 size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c.id, c.name)}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 active:bg-red-500/20 flex items-center justify-center text-red-500/40 hover:text-red-500 active:text-red-500 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 shrink-0"
                    title="Excluir Cliente"
                  >
                    <UserMinus size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {isBirthdayToday(c.birth_date) && (
                    <button
                      onClick={() => sendBirthdayMessage(c.name, c.phone)}
                      className="bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white active:bg-pink-500 active:text-white px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase border border-pink-500/20 transition-all flex items-center gap-1 whitespace-nowrap animate-bounce"
                      title="Enviar mensagem de aniversário"
                    >
                      <Cake size={8} className="md:w-[9px] md:h-[9px]" /> Aniversário
                    </button>
                  )}
                  {c.customer_packages?.some((p: any) => p.used_credits < p.total_credits) ? (
                    <div className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase border border-green-500/20 whitespace-nowrap">
                      Pacote Ativo
                    </div>
                  ) : (
                    <button
                      onClick={() => { setTargetCustomer(c); setIsAddPackageModalOpen(true); }}
                      className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black active:bg-amber-500 active:text-black px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase border border-amber-500/20 transition-all flex items-center gap-1 whitespace-nowrap"
                    >
                      <PackagePlus size={8} className="md:w-[9px] md:h-[9px]" /> Novo Pacote
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-base md:text-lg font-black text-white uppercase italic tracking-tighter mb-1 break-words">
                  {c.name}
                </h4>
                <div className="mb-3 md:mb-4 space-y-0.5">
                  <p className="text-slate-500 text-[10px] md:text-[11px] font-bold flex items-center gap-1.5">
                    <Phone size={10} className="text-amber-500 shrink-0 md:w-[11px] md:h-[11px]" />
                    <span className="break-all">{c.phone}</span>
                  </p>

                  {c.birth_date && (
                    <p className="text-amber-500/80 text-[9px] font-black uppercase italic flex items-center gap-1.5">
                      <span className={isBirthdayToday(c.birth_date) ? "animate-bounce" : ""}>🎂</span>
                      <span>Aniversário: {new Date(c.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  {c.customer_packages?.map((pkg: any) => (
                    <div key={pkg.id} className="bg-black/30 rounded-xl md:rounded-2xl p-3 md:p-3.5 border border-white/5 space-y-2 md:space-y-2.5 shadow-inner">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate flex-1">
                          {pkg.package_name}
                        </p>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => { setEditingPkgId(pkg.id); setTempCredits(pkg.total_credits) }}
                            className="text-slate-600 hover:text-amber-500 active:text-amber-500 transition-colors p-0.5"
                          >
                            <Edit3 size={12} className="md:w-[13px] md:h-[13px]" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="text-slate-600 hover:text-red-500 active:text-red-500 transition-colors p-0.5"
                          >
                            <Trash2 size={12} className="md:w-[13px] md:h-[13px]" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 md:gap-1.5">
                        {[...Array(Number(editingPkgId === pkg.id ? tempCredits : pkg.total_credits))].map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 md:h-2.5 flex-1 min-w-[16px] md:min-w-[18px] rounded-full ${i < pkg.used_credits
                              ? 'bg-slate-800'
                              : 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center px-0.5">
                        <span className="text-[7px] md:text-[8px] font-black text-amber-500/50 uppercase italic">
                          Restam {pkg.total_credits - pkg.used_credits}
                        </span>
                      </div>
                      {editingPkgId === pkg.id && (
                        <div className="flex items-center justify-between bg-white/5 p-1.5 rounded-lg mt-1.5 animate-in slide-in-from-top-2">
                          <input
                            type="number"
                            value={tempCredits}
                            onChange={(e) => setTempCredits(Number(e.target.value))}
                            className="bg-transparent text-amber-500 font-black text-[10px] w-10 outline-none px-1.5"
                          />
                          <button
                            onClick={() => handleUpdateCredits(pkg.id)}
                            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-400 text-black px-2.5 py-0.5 rounded-lg text-[7px] font-black uppercase transition-all active:scale-95"
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PARA EDITAR CLIENTE */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 md:pb-6 mb-6 md:mb-8">
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
                Editar <span className="text-blue-500">Cliente</span>
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} className="md:w-8 md:h-8" />
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nome Completo</label>
                  <input
                    required
                    placeholder="Ex: João Silva"
                    value={editingCustomer.name}
                    onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">WhatsApp</label>
                  <input
                    required
                    placeholder="(00) 00000-0000"
                    value={editingCustomer.phone}
                    onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black text-blue-500 uppercase ml-2 italic">Data de Aniversário (Opcional)</label>
                  <input
                    type="date"
                    value={editingCustomer.birth_date || ''}
                    onChange={e => setEditingCustomer({ ...editingCustomer, birth_date: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-blue-500 appearance-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-400 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={18} className="md:w-5 md:h-5" /> Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR PACOTE A CLIENTE EXISTENTE */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 md:pb-6 mb-6 md:mb-8">
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
                Vender <span className="text-amber-500">Pacote</span>
              </h3>
              <button
                onClick={() => setIsAddPackageModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} className="md:w-8 md:h-8" />
              </button>
            </div>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-5 md:mb-6 uppercase tracking-widest text-center">
              Cliente: <span className="text-white">{targetCustomer?.name}</span>
            </p>
            <form onSubmit={handleAddPackage} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">
                  Nome do Pacote
                </label>
                <input
                  required
                  value={packageForm.packageName}
                  onChange={e => setPackageForm({ ...packageForm, packageName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm md:text-base text-white font-bold outline-none focus:border-amber-500"
                  placeholder="Ex: Combo 4 Cortes"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    value={packageForm.total_credits}
                    onChange={e => setPackageForm({ ...packageForm, total_credits: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm md:text-base text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={packageForm.price_paid}
                    onChange={e => setPackageForm({ ...packageForm, price_paid: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm md:text-base text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-400 text-black py-5 md:py-7 rounded-2xl md:rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-[0.2em] md:tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 md:gap-3"
              >
                <CheckCircle2 size={18} className="md:w-5 md:h-5" /> Ativar Pacote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 md:pb-6 mb-6 md:mb-8">
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
                Novo <span className="text-amber-500">Cliente</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} className="md:w-8 md:h-8" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nome Completo</label>
                  <input
                    required
                    placeholder="Ex: João Silva"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">WhatsApp</label>
                  <input
                    required
                    placeholder="(00) 00000-0000"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black text-amber-500 uppercase ml-2 italic">Data de Aniversário (Opcional)</label>
                  <input
                    type="date"
                    value={newCustomer.birth_date}
                    onChange={e => setNewCustomer({ ...newCustomer, birth_date: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white font-bold outline-none focus:border-amber-500 appearance-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-5 md:p-6 rounded-2xl md:rounded-3xl">
                <label className="text-xs md:text-sm font-black text-white uppercase italic flex-1">
                  Adicionar pacote agora?
                </label>
                <input
                  type="checkbox"
                  checked={newCustomer.hasPackage}
                  onChange={e => setNewCustomer({ ...newCustomer, hasPackage: e.target.checked })}
                  className="w-5 h-5 md:w-6 md:h-6 accent-amber-500"
                />
              </div>
              {newCustomer.hasPackage && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <input
                    placeholder="Nome do Pacote"
                    value={newCustomer.packageName}
                    onChange={e => setNewCustomer({ ...newCustomer, packageName: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3.5 md:p-4 text-xs md:text-sm text-white font-bold outline-none focus:border-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="number"
                      placeholder="Cortes"
                      value={newCustomer.total_credits}
                      onChange={e => setNewCustomer({ ...newCustomer, total_credits: e.target.value })}
                      className="bg-slate-950 border border-white/10 rounded-xl p-3.5 md:p-4 text-xs md:text-sm text-white font-bold outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Valor R$"
                      value={newCustomer.price_paid}
                      onChange={e => setNewCustomer({ ...newCustomer, price_paid: e.target.value })}
                      className="bg-slate-950 border border-white/10 rounded-xl p-3.5 md:p-4 text-xs md:text-sm text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-400 text-black py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-widest transition-all shadow-xl active:scale-95"
              >
                Cadastrar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersModule;
