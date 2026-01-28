import React, { useState, useEffect } from 'react';
import { Plus, X, User, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, startOfWeek, format, isSameDay, addWeeks, subWeeks, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarProps {
  barbers: any[];
  appointments: any[];
  services: any[];
  barbershopId: string;
  selectedDate?: Date;
  onSave: (newAppointment: any) => Promise<void>;
  onDelete: (appointmentId: string) => Promise<void>;
  onUpdate: (appointmentId: string, updates: any) => Promise<void>;
}

const AdminCalendarView: React.FC<CalendarProps> = ({ 
  barbers = [], 
  appointments = [], 
  services = [], 
  barbershopId, 
  selectedDate, 
  onSave, 
  onDelete, 
  onUpdate 
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
  const [selectedBarberForWeek, setSelectedBarberForWeek] = useState<string>(barbers[0]?.name || '');
  const [newBooking, setNewBooking] = useState({
    customerName: '', barber: '', time: '', service: '', price: 0, date: ''
  });

  // GERAÇÃO DE SLOTS DE 15 EM 15 MINUTOS
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min of ['00', '15', '30', '45']) {
      if (hour === 20 && min !== '00') break;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${min}`);
    }
  }

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  useEffect(() => {
    if (barbers.length > 0 && !selectedBarberForWeek) {
      setSelectedBarberForWeek(barbers[0].name);
    }
  }, [barbers]);

  useEffect(() => {
    if (selectedDate) setCurrentDate(selectedDate);
  }, [selectedDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateNext = () => setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
  const navigatePrev = () => setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subWeeks(currentDate, 1));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingAppId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, barberName: string, slotTime: string, targetDate: string) => {
    e.preventDefault();
    if (!draggingAppId) return;
    setLoading(true);
    try {
      await onUpdate(draggingAppId, { barber: barberName, time: slotTime, date: targetDate });
    } catch (error) {
      alert("Erro ao mover.");
    } finally {
      setLoading(false);
      setDraggingAppId(null);
    }
  };

  const handleOpenModal = (barber: string, time: string, date: string) => {
    setNewBooking({ ...newBooking, barber, time, date, customerName: '', service: '', price: 0 });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir este agendamento?")) {
      setLoading(true);
      await onDelete(id);
      setLoading(false);
      setSelectedApp(null);
    }
  };

  const handleFinalizeEncaixe = async () => {
    if (!newBooking.customerName || !newBooking.service) return alert("Preencha tudo!");
    setLoading(true);
    try {
      await onSave({ ...newBooking, barbershop_id: barbershopId, status: 'confirmado', customerPhone: 'Balcão' });
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (!barbers || barbers.length === 0) return null;

  return (
    <div className="relative space-y-6 italic font-black">
      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0b0e] border border-white/5 rounded-[2rem] p-4 gap-4">
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'day' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}>Dia</button>
          <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}>Semana</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={navigatePrev} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors"><ChevronLeft /></button>
          <div className="text-center">
            <h4 className="text-white font-black uppercase italic tracking-tighter">
              {viewMode === 'day' ? format(currentDate, "dd 'de' MMMM", { locale: ptBR }) : `Semana de ${format(weekStart, "dd/MM")}`}
            </h4>
            {viewMode === 'week' && (
              <select value={selectedBarberForWeek} onChange={(e) => setSelectedBarberForWeek(e.target.value)} className="bg-transparent text-amber-500 text-[9px] uppercase border-none focus:ring-0 cursor-pointer outline-none">
                {barbers.map(b => <option key={b.id} value={b.name} className="bg-[#0a0b0e]">{b.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={navigateNext} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors"><ChevronRight /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase">Hoje</button>
      </div>

      {/* GRID */}
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[3rem] p-6 shadow-2xl overflow-x-auto custom-scrollbar relative">
        {loading && <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[150] flex items-center justify-center rounded-[3rem]"><Loader2 className="animate-spin text-amber-500" size={40} /></div>}

        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-8 sticky top-0 bg-[#0a0b0e] pb-4 border-b border-white/5 z-20">
            <div className="flex items-center justify-center text-slate-600 font-black text-[10px] uppercase italic">Horário</div>
            {(viewMode === 'day' ? barbers : weekDays).map((item, idx) => (
              <div key={idx} className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-amber-500 font-black uppercase italic text-xs">{viewMode === 'day' ? item.name : format(item, 'eee dd/MM', { locale: ptBR })}</p>
              </div>
            ))}
          </div>

          {timeSlots.map(slot => (
            <div key={slot} className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-2 min-h-[60px]">
              <div className="flex items-center justify-center font-mono text-[10px] font-bold text-slate-600 border-r border-white/5">{slot}</div>
              
              {(viewMode === 'day' ? barbers : weekDays).map((colItem, idx) => {
                const targetDate = viewMode === 'day' ? format(currentDate, 'yyyy-MM-dd') : format(colItem as Date, 'yyyy-MM-dd');
                const barberName = viewMode === 'day' ? colItem.name : selectedBarberForWeek;
                
                const slotApps = appointments.filter(a => {
                  const matchDate = a.date === targetDate;
                  const matchBarber = a.barber?.trim().toLowerCase() === barberName?.trim().toLowerCase();
                  if (!matchDate || !matchBarber || a.status === 'cancelado') return false;

                  const appMin = timeToMinutes(a.time);
                  const slotMin = timeToMinutes(slot);
                  // Agora a janela é de 15 minutos
                  return appMin >= slotMin && appMin < slotMin + 15;
                });

                return (
                  <div 
                    key={idx} 
                    className="relative bg-white/[0.01] rounded-xl p-0.5 flex flex-col gap-1 min-h-[60px] border border-white/[0.02]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, barberName, slot, targetDate)}
                  >
                    {slotApps.length > 0 ? (
                      slotApps.map(app => (
                        <div 
                          key={app.id}
                          draggable 
                          onDragStart={(e) => handleDragStart(e, app.id)} 
                          onClick={() => setSelectedApp(app)} 
                          className={`flex-1 text-black rounded-lg p-2 shadow-md flex flex-col justify-center cursor-move hover:brightness-110 transition-all ${app.status === 'pendente' ? 'bg-amber-500/40 border border-dashed border-amber-600' : 'bg-amber-500'}`}
                        >
                          <div className="flex justify-between items-center leading-none mb-0.5">
                            <span className="bg-black/20 px-1 rounded text-[7px] font-bold">{app.time}</span>
                            {app.status === 'pendente' && <Clock size={8} />}
                          </div>
                          <p className="font-black text-[9px] uppercase truncate leading-tight">{app.customerName}</p>
                          <p className="text-[7px] font-bold opacity-70 uppercase truncate leading-none">{app.service}</p>
                        </div>
                      ))
                    ) : (
                      <button onClick={() => handleOpenModal(barberName, slot, targetDate)} className="absolute inset-0 flex items-center justify-center group opacity-0 hover:opacity-100 transition-opacity">
                        <Plus size={14} className="text-amber-500/50" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL GESTÃO */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
              <div className="flex justify-center mb-6"><div className="bg-amber-500/10 p-5 rounded-full text-amber-500"><User size={40}/></div></div>
              <h4 className="text-2xl font-black text-white uppercase italic mb-2">{selectedApp.customerName}</h4>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">{selectedApp.service} - {selectedApp.date} às {selectedApp.time}</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setSelectedApp(null)} className="bg-white/5 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Voltar</button>
                 <button onClick={() => handleDelete(selectedApp.id)} className="bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Excluir</button>
              </div>
          </div>
        </div>
      )}

      {/* MODAL ENCAIXE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl font-black italic">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white italic uppercase">Novo <span className="text-amber-500">Agendamento</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
            <div className="space-y-6 leading-none">
              <input className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold italic outline-none" placeholder="Nome do Cliente" value={newBooking.customerName} onChange={e => setNewBooking({...newBooking, customerName: e.target.value})} />
              <select className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold italic outline-none" onChange={e => { const s = services.find(sv => sv.name === e.target.value); setNewBooking({...newBooking, service: e.target.value, price: s?.price || 0}); }}>
                <option value="">Selecione o serviço</option>
                {services.map(s => <option key={s.id} value={s.name}>{s.name} - R$ {s.price}</option>)}
              </select>
              <button onClick={handleFinalizeEncaixe} disabled={loading} className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-amber-400 transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarView;