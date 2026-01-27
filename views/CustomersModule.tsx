import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Plus, Search, Phone, CreditCard, 
  History, Calendar, Loader2, X, CheckCircle2, Trash2, Edit3, Save, PackagePlus, UserMinus 
} from 'lucide-react';

const CustomersModule = ({ barbershopId }: { barbershopId: string | null }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any | null>(null);
  const [packageForm, setPackageForm] = useState({ packageName: '', total_credits: '4', price_paid: '' });

  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [tempCredits, setTempCredits] = useState<number>(0);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', hasPackage: false, packageName: '', total_credits: '4', price_paid: '' });

  useEffect(() => {
    if (barbershopId) fetchCustomers();
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
    const { data: customer } = await supabase
      .from('customers')
      .insert([{ name: newCustomer.name, phone: newCustomer.phone, barbershop_id: barbershopId }])
      .select()
      .single();

    if (customer && newCustomer.hasPackage) {
      await supabase.from('customer_packages').insert([{
        customer_id: customer.id,
        barbershop_id: barbershopId,
        package_name: newCustomer.packageName,
        total_credits: Number(newCustomer.total_credits),
        price_paid: Number(newCustomer.price_paid)
      }]);
    }
    setIsModalOpen(false);
    setNewCustomer({ name: '', phone: '', hasPackage: false, packageName: '', total_credits: '4', price_paid: '' });
    fetchCustomers();
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (confirm(`ATENÇÃO: Deseja realmente excluir o cliente "${customerName}"? Isso apagará todos os pacotes e histórico vinculados a ele.`)) {
      await supabase.from('customer_packages').delete().eq('customer_id', customerId);
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      
      if (!error) {
        fetchCustomers();
      } else {
        alert("Erro ao excluir cliente. Verifique se ele possui agendamentos vinculados.");
      }
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer) return;

    await supabase.from('customer_packages').insert([{
      customer_id: targetCustomer.id,
      barbershop_id: barbershopId,
      package_name: packageForm.packageName,
      total_credits: Number(packageForm.total_credits),
      price_paid: Number(packageForm.price_paid)
    }]);

    setIsAddPackageModalOpen(false);
    setPackageForm({ packageName: '', total_credits: '4', price_paid: '' });
    fetchCustomers();
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

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h2 className="text-5xl font-black text-white italic uppercase leading-none">Gestão de <span className="text-amber-500">Clientes</span></h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Fidelização e controle de pacotes mensais</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all shadow-lg">
          <Plus size={18} strokeWidth={4} /> Novo Cliente
        </button>
      </header>

      <div className="relative group max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-bold outline-none focus:border-amber-500/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => (
          <div key={c.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md hover:border-amber-500/30 transition-all flex flex-col h-full group relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Users size={24} />
                </div>
                {/* BOTÃO EXCLUIR CLIENTE */}
                <button 
                  onClick={() => handleDeleteCustomer(c.id, c.name)}
                  className="w-12 h-12 rounded-2xl bg-red-500/5 hover:bg-red-500/20 flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  title="Excluir Cliente"
                >
                  <UserMinus size={20} />
                </button>
              </div>

              <div className="flex flex-col items-end gap-2">
                {c.customer_packages?.some((p: any) => p.used_credits < p.total_credits) ? (
                  <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-green-500/20">Pacote Ativo</div>
                ) : (
                  <button 
                    onClick={() => { setTargetCustomer(c); setIsAddPackageModalOpen(true); }}
                    className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black px-3 py-1 rounded-full text-[8px] font-black uppercase border border-amber-500/20 transition-all flex items-center gap-1"
                  >
                    <PackagePlus size={10} /> Novo Pacote
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{c.name}</h4>
              <p className="text-slate-500 text-xs font-bold mb-6 flex items-center gap-2"><Phone size={12} className="text-amber-500"/>{c.phone}</p>

              <div className="space-y-3">
                {c.customer_packages?.map((pkg: any) => (
                  <div key={pkg.id} className="bg-black/30 rounded-3xl p-5 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pkg.package_name}</p>
                       <div className="flex gap-2">
                          <button onClick={() => {setEditingPkgId(pkg.id); setTempCredits(pkg.total_credits)}} className="text-slate-600 hover:text-amber-500 transition-colors"><Edit3 size={14}/></button>
                          <button onClick={() => handleDeletePackage(pkg.id)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                       </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {[...Array(Number(editingPkgId === pkg.id ? tempCredits : pkg.total_credits))].map((_, i) => (
                        <div key={i} className={`h-3 flex-1 min-w-[20px] rounded-full ${i < pkg.used_credits ? 'bg-slate-800' : 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]'}`} />
                      ))}
                    </div>
                    {editingPkgId === pkg.id && (
                      <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                        <input type="number" value={tempCredits} onChange={(e) => setTempCredits(Number(e.target.value))} className="bg-transparent text-amber-500 font-black text-xs w-12 outline-none" />
                        <button onClick={() => handleUpdateCredits(pkg.id)} className="bg-amber-500 text-black px-3 py-1 rounded-lg text-[8px] font-black uppercase">Salvar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PARA ADICIONAR PACOTE A CLIENTE EXISTENTE */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Vender <span className="text-amber-500">Pacote</span></h3>
              <button onClick={() => setIsAddPackageModalOpen(false)} className="text-slate-500 hover:text-white"><X size={32} /></button>
            </div>
            <p className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-widest text-center">Cliente: <span className="text-white">{targetCustomer?.name}</span></p>
            <form onSubmit={handleAddPackage} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome do Pacote</label>
                <input required value={packageForm.packageName} onChange={e => setPackageForm({...packageForm, packageName: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500" placeholder="Ex: Combo 4 Cortes" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Quantidade</label>
                  <input type="number" value={packageForm.total_credits} onChange={e => setPackageForm({...packageForm, total_credits: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Valor Total (R$)</label>
                  <input type="number" value={packageForm.price_paid} onChange={e => setPackageForm({...packageForm, price_paid: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold" />
                </div>
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black py-7 rounded-[2rem] font-black uppercase text-sm tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <CheckCircle2 size={20} /> Ativar Pacote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Novo <span className="text-amber-500">Cliente</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={32} /></button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <input required placeholder="Nome" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none" />
                <input required placeholder="WhatsApp" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none" />
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-6 rounded-3xl">
                <label className="text-xs font-black text-white uppercase italic flex-1">Adicionar pacote agora?</label>
                <input type="checkbox" checked={newCustomer.hasPackage} onChange={e => setNewCustomer({...newCustomer, hasPackage: e.target.checked})} className="w-6 h-6 accent-amber-500" />
              </div>
              {newCustomer.hasPackage && (
                <div className="space-y-4 animate-in fade-in">
                  <input placeholder="Nome do Pacote" value={newCustomer.packageName} onChange={e => setNewCustomer({...newCustomer, packageName: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-xs font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Cortes" value={newCustomer.total_credits} onChange={e => setNewCustomer({...newCustomer, total_credits: e.target.value})} className="bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-xs font-bold" />
                    <input type="number" placeholder="Valor R$" value={newCustomer.price_paid} onChange={e => setNewCustomer({...newCustomer, price_paid: e.target.value})} className="bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-xs font-bold" />
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-amber-500 text-black py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all">Cadastrar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersModule;