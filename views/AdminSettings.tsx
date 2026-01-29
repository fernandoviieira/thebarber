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

  // Configuração inicial padrão para novos barbeiros
  const initialWorkDays = {
    "1": { active: true, start: '09:00', end: '19:00' },
    "2": { active: true, start: '09:00', end: '19:00' },
    "3": { active: true, start: '09:00', end: '19:00' },
    "4": { active: true, start: '09:00', end: '19:00' },
    "5": { active: true, start: '09:00', end: '19:00' },
    "6": { active: true, start: '09:00', end: '19:00' },
    "0": { active: false, start: '09:00', end: '19:00' },
  };

  const [newBarber, setNewBarber] = useState({
    name: '',
    specialties: '',
    commission_rate: 0,
    work_days: initialWorkDays
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

    const payload = {
      name: newBarber.name,
      barbershop_id: barbershopId,
      specialties: newBarber.specialties ? newBarber.specialties.split(',').map(s => s.trim()) : [],
      work_days: newBarber.work_days, // Objeto JSONB
      commission_rate: Number(newBarber.commission_rate),
      rating: 5.0,
      photo: `https://ui-avatars.com/api/?name=${newBarber.name}&background=f59e0b&color=000`
    };

    const { error } = await supabase.from('barbers').insert([payload]);

    if (!error) {
      setIsAddingBarber(false);
      setNewBarber({ name: '', specialties: '', commission_rate: 0, work_days: initialWorkDays });
      fetchBarbers();
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
        commission_rate: Number(editingBarber.commission_rate),
        work_days: editingBarber.work_days // Envia a escala atualizada
      };

      const { error } = await supabase
        .from('barbers')
        .update(payload)
        .eq('id', editingBarber.id);

      if (error) throw error;

      setEditingBarber(null);
      fetchBarbers();
      alert("Barbeiro e escala atualizados!");
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    }
  }

  async function handleUpdateService() {
    try {
      const payload = {
        name: editingService.name,
        price: parseFloat(editingService.price),
        duration: editingService.duration.toString().includes('min') ? editingService.duration : `${editingService.duration} min`
      };
      const { error } = await supabase.from('services').update(payload).eq('id', editingService.id);
      if (error) throw error;
      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  }

  async function deleteBarber(id: string) {
    if (window.confirm("Deseja realmente remover este barbeiro?")) {
      await supabase.from('barbers').delete().eq('id', id);
      fetchBarbers();
    }
  }

  async function deleteService(id: string) {
    if (window.confirm("Remover este serviço?")) {
      await supabase.from('services').delete().eq('id', id);
      fetchServices();
    }
  }

  async function handleAddService() {
    if (!newService.name || !newService.price) return alert("Preencha tudo.");
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

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-400 font-sans pb-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32 relative z-10">
        
        {/* TABS */}
        <div className="flex gap-4 mb-8 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 w-fit mx-auto md:mx-0">
          <button onClick={() => setActiveTab('equipe')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'equipe' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}>Equipe</button>
          <button onClick={() => setActiveTab('servicos')} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'servicos' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}>Serviços</button>
        </div>

        {activeTab === 'equipe' ? (
          <section className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-black text-amber-500 tracking-tight italic uppercase">Gestão da Equipe</h2>
                <p className="text-zinc-500 text-sm font-bold uppercase italic tracking-widest">Escalas e Comissões</p>
              </div>
              <button onClick={() => setIsAddingBarber(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 uppercase italic text-xs">
                <UserPlus size={20} /> Novo Barbeiro
              </button>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-6">Barbeiro</th>
                    <th className="p-6 text-center">Comissão</th>
                    <th className="p-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {barbers.map(b => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors text-white">
                      <td className="p-6 font-bold uppercase italic">{b.name}</td>
                      <td className="p-6 text-center font-black text-amber-500">{b.commission_rate || 0}%</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingBarber(b)} className="text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={20} /></button>
                          <button onClick={() => deleteBarber(b.id)} className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
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
                <h2 className="text-3xl font-black text-amber-500 tracking-tight italic uppercase">Catálogo</h2>
                <p className="text-zinc-500 text-sm font-bold uppercase italic tracking-widest">Serviços e Valores</p>
              </div>
              <button onClick={() => setIsAddingService(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 uppercase italic text-xs">
                <Plus size={20} /> Novo Serviço
              </button>
            </div>
            {/* ... Tabela de serviços (mesma lógica) ... */}
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
                      <td className="p-6 font-bold uppercase italic">{s.name}</td>
                      <td className="p-6 text-zinc-400 text-sm font-bold uppercase">{s.duration}</td>
                      <td className="p-6 font-bold text-emerald-500 italic">R$ {s.price.toFixed(2)}</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingService(s)} className="text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={20} /></button>
                          <button onClick={() => deleteService(s.id)} className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
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

const BarberModal = ({ title, data, setData, onSave, onClose }: any) => {
  const daysOfWeek = [
    { id: "1", label: 'Segunda-feira' },
    { id: "2", label: 'Terça-feira' },
    { id: "3", label: 'Quarta-feira' },
    { id: "4", label: 'Quinta-feira' },
    { id: "5", label: 'Sexta-feira' },
    { id: "6", label: 'Sábado' },
    { id: "0", label: 'Domingo' },
  ];

  const updateDayConfig = (dayId: string, key: string, value: any) => {
    const updatedWorkDays = {
      ...data.work_days,
      [dayId]: { ...data.work_days[dayId], [key]: value }
    };
    setData({ ...data, work_days: updatedWorkDays });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-2xl relative shadow-3xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
        <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-white italic uppercase tracking-tighter">
          <Briefcase className="text-amber-500" /> {title}
        </h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome</label>
              <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500 font-bold italic" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Comissão (%)</label>
              <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-amber-500 font-black outline-none focus:border-amber-500 italic" value={data.commission_rate} onChange={e => setData({...data, commission_rate: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-amber-500 text-[11px] font-black uppercase tracking-[0.2em] mb-4 italic">Escala Semanal Individual</h4>
            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const config = data.work_days?.[day.id] || { active: false, start: '09:00', end: '19:00' };
                return (
                  <div key={day.id} className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border transition-all ${config.active ? 'bg-zinc-800/50 border-amber-500/20 shadow-lg' : 'bg-black/20 border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3 w-full md:w-48">
                      <button onClick={() => updateDayConfig(day.id, 'active', !config.active)} className={`w-10 h-6 rounded-full relative transition-colors ${config.active ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.active ? 'left-5' : 'left-1'}`} />
                      </button>
                      <span className={`text-[11px] font-black uppercase italic ${config.active ? 'text-white' : 'text-zinc-600'}`}>{day.label}</span>
                    </div>
                    {config.active ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-xl px-3 py-2 flex-1"><Clock size={14} className="text-amber-500" />
                          <input type="time" className="bg-transparent text-white text-xs font-black outline-none w-full" value={config.start} onChange={(e) => updateDayConfig(day.id, 'start', e.target.value)} />
                        </div>
                        <span className="text-zinc-600 font-black text-[10px] uppercase italic">Até</span>
                        <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-xl px-3 py-2 flex-1"><Clock size={14} className="text-amber-500" />
                          <input type="time" className="bg-transparent text-white text-xs font-black outline-none w-full" value={config.end} onChange={(e) => updateDayConfig(day.id, 'end', e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-[10px] font-black uppercase text-zinc-700 italic tracking-widest">Folga Programada</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-5 rounded-3xl mt-4 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 uppercase italic tracking-widest text-xs">Confirmar Configurações</button>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ title, data, setData, onSave, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md relative shadow-3xl">
      <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
      <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-white italic uppercase tracking-tighter"><Tag className="text-amber-500" /> {title}</h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Serviço</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-500" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Valor</label>
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-emerald-500 font-black italic outline-none focus:border-amber-500" value={data.price} onChange={e => setData({...data, price: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Minutos</label>
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-500" value={data.duration.replace(/\D/g, '')} onChange={e => setData({...data, duration: e.target.value})} />
          </div>
        </div>
        <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-5 rounded-3xl mt-4 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 uppercase italic tracking-widest text-xs">Salvar Alterações</button>
      </div>
    </div>
  </div>
);

export default AdminSettings;