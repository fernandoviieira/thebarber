import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Clock, X, UserPlus, Star, 
  AlertCircle, DollarSign, Tag, Briefcase, Edit3, Percent 
} from 'lucide-react';

interface AdminSettingsProps {
  barbershopId: string | null;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ barbershopId }) => {
  const [activeTab, setActiveTab] = useState<'equipe' | 'servicos'>('equipe');
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingBarber, setIsAddingBarber] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);

  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);

  const [newBarber, setNewBarber] = useState({ 
    name: '', specialties: '', work_start: '09:00', work_end: '19:00', commission_rate: 0 
  });
  const [newService, setNewService] = useState({ name: '', price: '', duration: '30' });

  useEffect(() => {
    if (barbershopId) fetchData();
  }, [barbershopId]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchBarbers(), fetchServices()]);
    setLoading(false);
  }

  async function fetchBarbers() {
    const { data } = await supabase.from('barbers').select('*').eq('barbershop_id', barbershopId).order('created_at', { ascending: false });
    if (data) setBarbers(data);
  }

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').eq('barbershop_id', barbershopId).order('created_at', { ascending: false });
    if (data) setServices(data);
  }

  async function handleAddBarber() {
    if (!newBarber.name) return alert("Nome é obrigatório");
    const { error } = await supabase.from('barbers').insert([{
      name: newBarber.name,
      barbershop_id: barbershopId,
      specialties: newBarber.specialties.split(',').map(s => s.trim()),
      work_hours: `${newBarber.work_start} - ${newBarber.work_end}`,
      commission_rate: Number(newBarber.commission_rate),
      rating: 5.0,
      photo: `https://ui-avatars.com/api/?name=${newBarber.name}&background=f59e0b&color=000`
    }]);
    if (!error) {
      setIsAddingBarber(false);
      setNewBarber({ name: '', specialties: '', work_start: '09:00', work_end: '19:00', commission_rate: 0 });
      fetchBarbers();
    } else {
      console.error("Erro ao adicionar barbeiro:", error);
    }
  }

  async function handleUpdateBarber() {
    try {
      const specialtiesFormatted = typeof editingBarber.specialties === 'string' 
        ? editingBarber.specialties.split(',').map((s: any) => s.trim()) 
        : editingBarber.specialties;

      const payload = {
        name: editingBarber.name,
        specialties: specialtiesFormatted,
        work_hours: editingBarber.work_hours,
        commission_rate: Number(editingBarber.commission_rate)
      };

      const { data, error, status } = await supabase
        .from('barbers')
        .update(payload)
        .eq('id', editingBarber.id)
        .select(); // Força o retorno dos dados para conferência

      if (error) {
        console.error("ERRO SUPABASE:", error);
        throw error;
      }

      setEditingBarber(null);
      fetchBarbers();
      alert("Barbeiro atualizado com sucesso!");
    } catch (err: any) {
      console.error("ERRO CAPTURADO:", err);
      alert(`Erro ao atualizar: ${err.message || 'Erro desconhecido'}`);
    }
  }

  async function handleUpdateService() {
    try {
      const payload = {
        name: editingService.name,
        price: parseFloat(editingService.price),
        duration: editingService.duration.toString().includes('min') ? editingService.duration : `${editingService.duration} min`
      };

      const { data, error, status } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id)
        .select();

      if (error) {
        console.error("ERRO SUPABASE SERVIÇO:", error);
        throw error;
      }

      setEditingService(null);
      fetchServices();
      alert("Serviço atualizado!");
    } catch (err: any) {
      console.error("ERRO CAPTURADO SERVIÇO:", err);
      alert(`Erro ao atualizar serviço: ${err.message}`);
    }
  }

  // Funções de delete mantidas conforme anterior...
  async function deleteBarber(id: string) {
    if (window.confirm("Deseja realmente remover este barbeiro?")) {
      const { error } = await supabase.from('barbers').delete().eq('id', id);
      if (error) console.error(error);
      fetchBarbers();
    }
  }

  async function deleteService(id: string) {
    if (window.confirm("Remover este serviço?")) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) console.error(error);
      fetchServices();
    }
  }

  async function handleAddService() {
    if (!newService.name || !newService.price) return alert("Preencha o nome e o valor.");
    const { error } = await supabase.from('services').insert([{
      name: newService.name,
      price: parseFloat(newService.price),
      duration: `${newService.duration} min`,
      barbershop_id: barbershopId
    }]);
    if (!error) {
      setIsAddingService(false);
      setNewService({ name: '', price: '', duration: '30' });
      fetchServices();
    }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-400 font-sans pb-20 relative overflow-hidden">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-32 relative z-10">
        <div className="flex gap-4 mb-8 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 w-fit mx-auto md:mx-0">
          <button onClick={() => setActiveTab('equipe')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'equipe' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}>Equipe</button>
          <button onClick={() => setActiveTab('servicos')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'servicos' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}>Serviços</button>
        </div>

        {activeTab === 'equipe' ? (
          <section className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-amber-500 tracking-tight">Gestão da Equipe</h2>
                <p className="text-zinc-500 text-sm">Controle profissionais e suas comissões.</p>
              </div>
              <button onClick={() => setIsAddingBarber(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10">
                <UserPlus size={20} /> Novo Barbeiro
              </button>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-6">Barbeiro</th>
                    <th className="p-6 text-center">Comissão</th>
                    <th className="p-6">Jornada</th>
                    <th className="p-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {barbers.map(b => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors text-white">
                      <td className="p-6 font-bold">{b.name}</td>
                      <td className="p-6 text-center font-black text-amber-500">{b.commission_rate || 0}%</td>
                      <td className="p-6 text-zinc-400 text-sm">{b.work_hours}</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingBarber(b)} className="text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={20}/></button>
                          <button onClick={() => deleteBarber(b.id)} className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-amber-500 tracking-tight">Catálogo de Serviços</h2>
                <p className="text-zinc-500 text-sm">Defina o que você oferece aos clientes.</p>
              </div>
              <button onClick={() => setIsAddingService(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10">
                <Plus size={20} /> Novo Serviço
              </button>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-6">Serviço</th>
                    <th className="p-6">Duração</th>
                    <th className="p-6">Preço</th>
                    <th className="p-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {services.map(s => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors text-white">
                      <td className="p-6 font-bold">{s.name}</td>
                      <td className="p-6 text-zinc-400 text-sm">{s.duration}</td>
                      <td className="p-6 font-bold text-emerald-500">R$ {s.price.toFixed(2)}</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingService(s)} className="text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={20}/></button>
                          <button onClick={() => deleteService(s.id)} className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MODAIS */}
        {isAddingBarber && <BarberModal title="Novo Talento" data={newBarber} setData={setNewBarber} onSave={handleAddBarber} onClose={() => setIsAddingBarber(false)} />}
        {editingBarber && <BarberModal title="Editar Perfil" data={editingBarber} setData={setEditingBarber} onSave={handleUpdateBarber} onClose={() => setEditingBarber(null)} />}
        {isAddingService && <ServiceModal title="Novo Serviço" data={newService} setData={setNewService} onSave={handleAddService} onClose={() => setIsAddingService(false)} />}
        {editingService && <ServiceModal title="Editar Serviço" data={editingService} setData={setEditingService} onSave={handleUpdateService} onClose={() => setEditingService(null)} />}
      </div>
    </div>
  );
};

const BarberModal = ({ title, data, setData, onSave, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md relative shadow-3xl">
      <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
      <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3 text-white"><Briefcase className="text-amber-500" /> {title}</h3>
      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Nome Completo</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Comissão Padrão (%)</label>
          <div className="relative">
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 pr-12 text-amber-500 font-bold outline-none focus:border-amber-500" placeholder="0" value={data.commission_rate} onChange={e => setData({...data, commission_rate: e.target.value})} />
            <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Especialidades</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.specialties} onChange={e => setData({...data, specialties: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Jornada (Ex: 09:00 - 18:00)</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.work_hours || ""} onChange={e => setData({...data, work_hours: e.target.value})} />
        </div>
        <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl mt-4 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20">Salvar Alterações</button>
      </div>
    </div>
  </div>
);

const ServiceModal = ({ title, data, setData, onSave, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md relative shadow-3xl">
      <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
      <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3 text-white"><Tag className="text-amber-500" /> {title}</h3>
      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Nome do Serviço</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Valor (R$)</label>
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.price} onChange={e => setData({...data, price: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Duração</label>
            <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" value={data.duration} placeholder="Ex: 45 min" onChange={e => setData({...data, duration: e.target.value})} />
          </div>
        </div>
        <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl mt-4 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20">Salvar Alterações</button>
      </div>
    </div>
  </div>
);

export default AdminSettings;