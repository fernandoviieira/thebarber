import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, Clock, X, UserPlus,
  DollarSign, Tag, Briefcase, Edit3,
  Power, AlertTriangle, Save, Loader2,
  ChevronDown, Menu
} from 'lucide-react';

interface AdminSettingsProps {
  barbershopId: string | null;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ barbershopId }) => {
  const [activeTab, setActiveTab] = useState<'equipe' | 'servicos' | 'unidade'>('equipe');
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingBarber, setIsAddingBarber] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const initialWorkDays = {
    "1": { active: true, start: '09:00', end: '19:00' },
    "2": { active: true, start: '09:00', end: '19:00' },
    "3": { active: true, start: '09:00', end: '19:00' },
    "4": { active: true, start: '09:00', end: '19:00' },
    "5": { active: true, start: '09:00', end: '19:00' },
    "6": { active: true, start: '09:00', end: '19:00' },
    "0": { active: false, start: '09:00', end: '19:00' },
  };

  const [newBarber, setNewBarber] = useState({ name: '', specialties: '', commission_rate: 0, work_days: initialWorkDays });
  const [newService, setNewService] = useState({ name: '', price: '', duration: '30' });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (barbershopId) fetchData();
  }, [barbershopId]);

  async function fetchData() {
    setLoading(true);
    const [barbersRes, servicesRes, settingsRes] = await Promise.all([
      supabase.from('barbers').select('*').eq('barbershop_id', barbershopId).order('name'),
      supabase.from('services').select('*').eq('barbershop_id', barbershopId).order('name'),
      supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle()
    ]);

    if (barbersRes.data) setBarbers(barbersRes.data);
    if (servicesRes.data) setServices(servicesRes.data);

    if (settingsRes.data) {
      setSettings(settingsRes.data);
    } else {
      setSettings({
        is_closed: false,
        opening_time: '08:00',
        closing_time: '20:00',
        fee_dinheiro: 0,
        fee_pix: 0,
        fee_debito: 1.99,
        fee_credito: 4.99
      });
    }
    setLoading(false);
  }

  async function saveGlobalSettings() {
    setIsSaving(true);
    const { error } = await supabase
      .from('barbershop_settings')
      .upsert({
        barbershop_id: barbershopId,
        is_closed: settings.is_closed,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        fee_dinheiro: parseFloat(settings.fee_dinheiro) || 0,
        fee_pix: parseFloat(settings.fee_pix) || 0,
        fee_debito: parseFloat(settings.fee_debito) || 0,
        fee_credito: parseFloat(settings.fee_credito) || 0
      });

    if (!error) alert("Configurações da unidade e taxas atualizadas!");
    setIsSaving(false);
  }

  async function fetchBarbers() {
    const { data } = await supabase.from('barbers').select('*').eq('barbershop_id', barbershopId);
    if (data) setBarbers(data);
  }

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').eq('barbershop_id', barbershopId);
    if (data) setServices(data);
  }

  async function handleAddBarber() {
    const payload = { ...newBarber, barbershop_id: barbershopId, specialties: [], rating: 5, photo: `https://ui-avatars.com/api/?name=${newBarber.name}&background=f59e0b` };
    await supabase.from('barbers').insert([payload]);
    setIsAddingBarber(false);
    fetchBarbers();
  }

  async function handleUpdateBarber() {
    await supabase.from('barbers').update(editingBarber).eq('id', editingBarber.id);
    setEditingBarber(null);
    fetchBarbers();
  }

  async function handleAddService() {
    const { error } = await supabase.from('services').insert([{ name: newService.name, price: parseFloat(newService.price), duration: `${newService.duration} min`, barbershop_id: barbershopId }]);
    if (!error) { setIsAddingService(false); setNewService({ name: '', price: '', duration: '30' }); fetchServices(); }
  }

  async function handleUpdateService() {
    const payload = {
      name: editingService.name,
      price: parseFloat(editingService.price),
      duration: editingService.duration.toString().includes('min') ? editingService.duration : `${editingService.duration} min`
    };
    await supabase.from('services').update(payload).eq('id', editingService.id);
    setEditingService(null);
    fetchServices();
  }

  async function deleteBarber(id: string) {
    if (confirm("Remover barbeiro?")) { await supabase.from('barbers').delete().eq('id', id); fetchBarbers(); }
  }

  async function deleteService(id: string) {
    if (confirm("Remover serviço?")) { await supabase.from('services').delete().eq('id', id); fetchServices(); }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#08080a] text-amber-500 font-black uppercase tracking-[0.5em] animate-pulse text-xs md:text-base">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-400 pb-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8">

        {/* TABS - Mobile: Dropdown, Desktop: Buttons */}
        {isMobile ? (
          <div className="mb-6">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-black uppercase text-xs outline-none"
            >
              <option value="equipe">👥 Equipe</option>
              <option value="servicos">💼 Serviços</option>
              <option value="unidade">⚙️ Unidade</option>
            </select>
          </div>
        ) : (
          <div className="flex gap-2 mb-12 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 w-full md:w-fit mx-auto md:mx-0 backdrop-blur-md">
            <TabBtn active={activeTab === 'equipe'} label="Equipe" onClick={() => setActiveTab('equipe')} />
            <TabBtn active={activeTab === 'servicos'} label="Serviços" onClick={() => setActiveTab('servicos')} />
            <TabBtn active={activeTab === 'unidade'} label="Unidade" onClick={() => setActiveTab('unidade')} />
          </div>
        )}

        {/* EQUIPE */}
        {activeTab === 'equipe' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HeaderSection
              title="Gestão de Equipe"
              subtitle="Membros e Comissões"
              actionLabel={isMobile ? "Novo" : "Novo Barbeiro"}
              onAction={() => setIsAddingBarber(true)}
              icon={<UserPlus size={isMobile ? 16 : 18} />}
              isMobile={isMobile}
            />

            {isMobile ? (
              <div className="space-y-3">
                {barbers.map(b => (
                  <div key={b.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedBarber(expandedBarber === b.id ? null : b.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-black uppercase text-sm italic">{b.name}</h4>
                        <p className="text-amber-500 text-xs font-bold mt-1">Comissão: {b.commission_rate}%</p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-zinc-500 transition-transform ${expandedBarber === b.id ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expandedBarber === b.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-2">
                        <button
                          onClick={() => setEditingBarber(b)}
                          className="w-full bg-amber-500/10 text-amber-500 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                        <button
                          onClick={() => deleteBarber(b.id)}
                          className="w-full bg-red-500/10 text-red-500 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left text-xs uppercase font-black tracking-widest">
                  <thead className="bg-zinc-950/50 text-zinc-600">
                    <tr><th className="p-6">Nome</th><th className="p-6 text-center">Comissão</th><th className="p-6 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {barbers.map(b => (
                      <tr key={b.id} className="text-white hover:bg-white/5 transition-colors">
                        <td className="p-6 italic font-black">{b.name}</td>
                        <td className="p-6 text-center text-amber-500">{b.commission_rate}%</td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-4">
                            <button onClick={() => setEditingBarber(b)} className="hover:text-amber-500 transition-colors"><Edit3 size={18} /></button>
                            <button onClick={() => deleteBarber(b.id)} className="hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* SERVIÇOS */}
        {activeTab === 'servicos' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HeaderSection
              title="Catálogo de Serviços"
              subtitle="Menu e Valores"
              actionLabel={isMobile ? "Novo" : "Novo Serviço"}
              onAction={() => setIsAddingService(true)}
              icon={<Plus size={isMobile ? 16 : 18} />}
              isMobile={isMobile}
            />

            {isMobile ? (
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedService(expandedService === s.id ? null : s.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-black uppercase text-sm italic">{s.name}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-emerald-500 text-xs font-bold">R$ {s.price?.toFixed(2)}</span>
                          <span className="text-zinc-500 text-xs">•</span>
                          <span className="text-zinc-500 text-xs italic">{s.duration}</span>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-zinc-500 transition-transform ${expandedService === s.id ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expandedService === s.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-2">
                        <button
                          onClick={() => setEditingService(s)}
                          className="w-full bg-amber-500/10 text-amber-500 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                        <button
                          onClick={() => deleteService(s.id)}
                          className="w-full bg-red-500/10 text-red-500 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left text-xs uppercase font-black tracking-widest">
                  <thead className="bg-zinc-950/50 text-zinc-600">
                    <tr><th className="p-6">Serviço</th><th className="p-6">Duração</th><th className="p-6">Preço</th><th className="p-6 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {services.map(s => (
                      <tr key={s.id} className="text-white hover:bg-white/5 transition-colors">
                        <td className="p-6 italic font-black">{s.name}</td>
                        <td className="p-6 text-zinc-500 italic">{s.duration}</td>
                        <td className="p-6 text-emerald-500 italic">R$ {s.price?.toFixed(2)}</td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-4">
                            <button onClick={() => setEditingService(s)} className="hover:text-amber-500 transition-colors"><Edit3 size={18} /></button>
                            <button onClick={() => deleteService(s.id)} className="hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* UNIDADE */}
        {activeTab === 'unidade' && settings && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
                Configuração <span className="text-amber-500">Global</span>
              </h2>
              <p className="text-zinc-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">
                Controle total do estabelecimento
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              {/* HORÁRIOS */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-8 text-amber-500">
                  <Clock size={isMobile ? 16 : 20} />
                  <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest italic text-white">
                    Horário de Funcionamento
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  <TimeInput label="Abertura" value={settings.opening_time} onChange={val => setSettings({ ...settings, opening_time: val })} isMobile={isMobile} />
                  <TimeInput label="Fechamento" value={settings.closing_time} onChange={val => setSettings({ ...settings, closing_time: val })} isMobile={isMobile} />
                </div>
              </div>

              {/* TAXAS DE MÁQUINA */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-8 text-amber-500">
                  <DollarSign size={isMobile ? 16 : 20} />
                  <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest italic text-white">
                    Taxas Operacionais (%)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <FeeInput label="Pix" value={settings.fee_pix} onChange={val => setSettings({ ...settings, fee_pix: val })} isMobile={isMobile} />
                  <FeeInput label="Débito" value={settings.fee_debito} onChange={val => setSettings({ ...settings, fee_debito: val })} isMobile={isMobile} />
                  <FeeInput label="Crédito" value={settings.fee_credito} onChange={val => setSettings({ ...settings, fee_credito: val })} isMobile={isMobile} />
                  <FeeInput label="Dinheiro" value={settings.fee_dinheiro} onChange={val => setSettings({ ...settings, fee_dinheiro: val })} isMobile={isMobile} />
                </div>
              </div>

              {/* FECHAMENTO DE EMERGÊNCIA */}
              <div className={`p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all duration-500 ${settings.is_closed ? 'bg-red-500 border-red-400 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 md:gap-4 flex-1">
                    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${settings.is_closed ? 'bg-black/20 text-white' : 'bg-red-500/10 text-red-500'}`}>
                      <Power size={isMobile ? 18 : 24} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-xs md:text-sm font-black uppercase italic tracking-tighter ${settings.is_closed ? 'text-white' : 'text-zinc-200'}`}>
                        {settings.is_closed ? 'LOJA FECHADA' : 'EMERGÊNCIA'}
                      </h4>
                      <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-wider mt-1 ${settings.is_closed ? 'text-white/60' : 'text-zinc-500'} hidden md:block`}>
                        Travar agendamentos online
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, is_closed: !settings.is_closed })}
                    className={`w-12 md:w-14 h-7 md:h-8 rounded-full relative transition-all flex-shrink-0 ${settings.is_closed ? 'bg-white' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-5 md:w-6 h-5 md:h-6 rounded-full transition-all ${settings.is_closed ? 'left-6 md:left-7 bg-red-500 shadow-lg' : 'left-1 bg-zinc-400'}`} />
                  </button>
                </div>

                {settings.is_closed && (
                  <div className="mt-4 md:mt-6 p-3 md:p-4 bg-black/20 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 text-white border border-white/10 animate-pulse">
                    <AlertTriangle size={isMobile ? 14 : 18} />
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest italic">
                      Agendamentos bloqueados
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={saveGlobalSettings}
                disabled={isSaving}
                className="w-full bg-amber-500 text-black font-black py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] mt-4 flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-widest text-[10px] md:text-xs"
              >
                {isSaving ? <Loader2 className="animate-spin" size={isMobile ? 16 : 20} /> : <><Save size={isMobile ? 16 : 20} /> Salvar Configurações</>}
              </button>
            </div>
          </section>
        )}

        {/* MODAIS */}
        {isAddingBarber && <BarberModal title="Novo Talento" data={newBarber} setData={setNewBarber} onSave={handleAddBarber} onClose={() => setIsAddingBarber(false)} isMobile={isMobile} />}
        {editingBarber && <BarberModal title="Editar Perfil" data={editingBarber} setData={setEditingBarber} onSave={handleUpdateBarber} onClose={() => setEditingBarber(null)} isMobile={isMobile} />}
        {isAddingService && <ServiceModal title="Novo Serviço" data={newService} setData={setNewService} onSave={handleAddService} onClose={() => setIsAddingService(false)} isMobile={isMobile} />}
        {editingService && <ServiceModal title="Editar Serviço" data={editingService} setData={setEditingService} onSave={handleUpdateService} onClose={() => setEditingService(null)} isMobile={isMobile} />}
      </div>
    </div>
  );
};

const TabBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`px-6 md:px-10 py-3 md:py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] transition-all duration-300 ${active ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'text-zinc-600 hover:text-white'}`}>
    {label}
  </button>
);

const HeaderSection = ({ title, subtitle, actionLabel, onAction, icon, isMobile }: any) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-10">
    <div className="space-y-1">
      <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter">{title}</h2>
      <p className="text-zinc-600 text-[9px] md:text-[10px] font-bold uppercase italic tracking-[0.3em]">{subtitle}</p>
    </div>
    <button onClick={onAction} className="w-full md:w-auto group bg-amber-500 hover:bg-amber-400 text-black px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 md:gap-3 transition-all shadow-xl shadow-amber-500/10 uppercase italic text-[9px] md:text-[10px] tracking-widest">
      {icon} {actionLabel}
    </button>
  </div>
);

const TimeInput = ({ label, value, onChange, isMobile }: any) => (
  <div className="space-y-2">
    <label className="text-[7px] md:text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">{label}</label>
    <div className="bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
      <Clock size={isMobile ? 14 : 16} className="text-amber-500" />
      <input type="time" className="bg-transparent text-white text-xs md:text-sm font-black italic outline-none w-full" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  </div>
);

const FeeInput = ({ label, value, onChange, isMobile }: any) => (
  <div className="space-y-2">
    <label className="text-[7px] md:text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-2">{label}</label>
    <div className="bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-2 md:p-3 flex items-center gap-2">
      <span className="text-amber-500 font-black text-[9px] md:text-[10px]">%</span>
      <input type="number" step="0.01" className="bg-transparent text-white font-black italic outline-none w-full text-[10px] md:text-xs" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  </div>
);

const BarberModal = ({ title, data, setData, onSave, onClose, isMobile }: any) => {
  const daysOfWeek = [
    { id: "1", label: 'Segunda' }, { id: "2", label: 'Terça' }, { id: "3", label: 'Quarta' },
    { id: "4", label: 'Quinta' }, { id: "5", label: 'Sexta' }, { id: "6", label: 'Sábado' }, { id: "0", label: 'Domingo' },
  ];

  const updateDayConfig = (dayId: string, key: string, value: any) => {
    const updatedWorkDays = {
      ...data.work_days,
      [dayId]: { ...data.work_days[dayId], [key]: value }
    };
    setData({ ...data, work_days: updatedWorkDays });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="bg-[#0d0f14] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-[3rem] w-full max-w-2xl relative shadow-3xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        <button onClick={onClose} className="absolute top-5 md:top-8 right-5 md:right-8 text-zinc-500 hover:text-white transition-colors">
          <X size={isMobile ? 20 : 24} />
        </button>
        <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-2 md:gap-3 text-white italic uppercase tracking-tighter">
          <Briefcase size={isMobile ? 18 : 24} className="text-amber-500" /> {title}
        </h3>
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome</label>
              <input type="text" className="w-full bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-white text-sm outline-none focus:border-amber-500 font-bold italic" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Comissão (%)</label>
              <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-amber-500 text-sm font-black outline-none focus:border-amber-500 italic" value={data.commission_rate} onChange={e => setData({ ...data, commission_rate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-amber-500 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-3 md:mb-4 italic">Escala Semanal</h4>
            <div className="space-y-2 md:space-y-3">
              {daysOfWeek.map((day) => {
                const config = data.work_days?.[day.id] || { active: false, start: '09:00', end: '19:00' };
                return (
                  <div key={day.id} className={`flex flex-col gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${config.active ? 'bg-zinc-800/50 border-amber-500/20 shadow-lg' : 'bg-black/20 border-zinc-800 opacity-40'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={() => updateDayConfig(day.id, 'active', !config.active)} className={`w-10 h-6 rounded-full relative transition-colors ${config.active ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.active ? 'left-5' : 'left-1'}`} />
                        </button>
                        <span className={`text-[10px] md:text-[11px] font-black uppercase italic ${config.active ? 'text-white' : 'text-zinc-600'}`}>{day.label}</span>
                      </div>
                    </div>
                    {config.active && (
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-lg md:rounded-xl px-2 md:px-3 py-2 flex-1">
                          <Clock size={isMobile ? 12 : 14} className="text-amber-500" />
                          <input type="time" className="bg-transparent text-white text-[10px] md:text-xs font-black outline-none w-full" value={config.start} onChange={(e) => updateDayConfig(day.id, 'start', e.target.value)} />
                        </div>
                        <span className="text-zinc-600 font-black text-[9px] md:text-[10px] uppercase italic">até</span>
                        <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-lg md:rounded-xl px-2 md:px-3 py-2 flex-1">
                          <Clock size={isMobile ? 12 : 14} className="text-amber-500" />
                          <input type="time" className="bg-transparent text-white text-[10px] md:text-xs font-black outline-none w-full" value={config.end} onChange={(e) => updateDayConfig(day.id, 'end', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-4 md:py-5 rounded-2xl md:rounded-3xl mt-4 hover:bg-amber-400 transition-all uppercase italic tracking-widest text-[10px] md:text-xs">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ title, data, setData, onSave, onClose, isMobile }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
    <div className="bg-[#0d0f14] border border-white/10 p-6 md:p-10 rounded-2xl md:rounded-[3rem] w-full max-w-md relative shadow-3xl">
      <button onClick={onClose} className="absolute top-6 md:top-8 right-6 md:right-8 text-zinc-500 hover:text-white transition-colors">
        <X size={isMobile ? 20 : 24} />
      </button>
      <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-2 md:gap-3 text-white italic uppercase tracking-tighter">
        <Tag size={isMobile ? 18 : 24} className="text-amber-500" /> {title}
      </h3>
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Serviço</label>
          <input type="text" className="w-full bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-white text-sm font-bold italic outline-none focus:border-amber-500" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Valor</label>
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-emerald-500 text-sm font-black italic outline-none focus:border-amber-500" value={data.price} onChange={e => setData({ ...data, price: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Minutos</label>
            <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-white text-sm font-bold italic outline-none focus:border-amber-500" value={data.duration?.toString().replace(/\D/g, '')} onChange={e => setData({ ...data, duration: e.target.value })} />
          </div>
        </div>
        <button onClick={onSave} className="w-full bg-amber-500 text-black font-black py-4 md:py-5 rounded-2xl md:rounded-3xl mt-4 hover:bg-amber-400 transition-all uppercase italic tracking-widest text-[10px] md:text-xs">Salvar</button>
      </div>
    </div>
  </div>
);

export default AdminSettings;
