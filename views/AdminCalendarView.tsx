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
  
  const [newBooking, setNewBooking] = useState({
    customerName: '', barber: '', time: '', service: '', price: 0, date: ''
  });

  // Sincroniza o calendário interno quando o filtro do Dashboard mudar
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  // Constantes de tempo e dias calculadas baseadas no currentDate atual
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (!barbers || barbers.length === 0) {
    return (
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[3rem] p-20 flex items-center justify-center">
        <p className="text-amber-500 font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">
          Carregando Profissionais...
        </p>
      </div>
    );
  }

  const navigateNext = () => setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
  const navigatePrev = () => setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subWeeks(currentDate, 1));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingAppId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, barberName: string, slotTime: string, targetDate: string) => {
    e.preventDefault();
    if (!draggingAppId) return;

    const isOccupied = appointments.some(a => 
      a.time === slotTime && a.barber === barberName && a.date === targetDate && a.status !== 'cancelado'
    );
    if (isOccupied) return alert("Este horário já está ocupado!");

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
    const appointmentData = {
      ...newBooking,
      barbershop_id: barbershopId,
      status: 'confirmado', 
      customerPhone: 'Balcão'
    };
    try {
      await onSave(appointmentData);
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* CONTROLES DE VISÃO E NAVEGAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0b0e] border border-white/5 rounded-[2rem] p-4 gap-4">
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'day' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Dia
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={navigatePrev} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors"><ChevronLeft /></button>
          <div className="text-center">
            <h4 className="text-white font-black uppercase italic tracking-tighter">
              {viewMode === 'day' ? format(currentDate, "dd 'de' MMMM", { locale: ptBR }) : `Semana de ${format(weekStart, "dd/MM")}`}
            </h4>
          </div>
          <button onClick={navigateNext} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors"><ChevronRight /></button>
        </div>

        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase">Hoje</button>
      </div>

      {/* GRID DO CALENDÁRIO */}
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[3rem] p-6 shadow-2xl overflow-x-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[150] flex items-center justify-center rounded-[3rem]">
            <Loader2 className="animate-spin text-amber-500" size={40} />
          </div>
        )}

        <div className="min-w-[1000px]">
          {/* HEADER DO GRID */}
          <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-8 sticky top-0 bg-[#0a0b0e] pb-4 border-b border-white/5 z-20">
            <div className="flex items-center justify-center text-slate-600 font-black text-[10px] uppercase italic">Horário</div>
            {viewMode === 'day' ? (
              barbers.map(barber => (
                <div key={barber.id} className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-amber-500 font-black uppercase italic text-xs">{barber.name}</p>
                </div>
              ))
            ) : (
              weekDays.map(day => (
                <div key={day.toString()} className={`text-center p-4 rounded-2xl border ${isSameDay(day, new Date()) ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/10'}`}>
                  <p className="text-slate-500 font-black uppercase text-[9px]">{format(day, 'eee', { locale: ptBR })}</p>
                  <p className="text-white font-bold text-sm">{format(day, 'dd/MM')}</p>
                </div>
              ))
            )}
          </div>

          {/* SLOTS DE TEMPO */}
          {timeSlots.map(slot => (
            <div key={slot} className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-4 items-center">
              <div className="text-center font-mono text-xs font-bold text-slate-500 border-r border-white/5">{slot}</div>
              {(viewMode === 'day' ? barbers : weekDays).map((colItem) => {
                const targetDate = viewMode === 'day' ? format(currentDate, 'yyyy-MM-dd') : format(colItem as Date, 'yyyy-MM-dd');
                const barberName = viewMode === 'day' ? colItem.name : barbers[0]?.name;
                
                const app = appointments.find(a => 
                  a.time === slot && 
                  a.date === targetDate && 
                  (viewMode === 'day' ? a.barber?.trim() === barberName?.trim() : true) &&
                  a.status !== 'cancelado'
                );

                return (
                  <div 
                    key={slot + (viewMode === 'day' ? colItem.id : colItem.toString())} 
                    className="h-20 relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, barberName, slot, targetDate)}
                  >
                    {app && app.status ? (
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => setSelectedApp(app)}
                        className={`absolute inset-0 text-black rounded-[1.2rem] p-3 shadow-lg flex flex-col justify-between cursor-move hover:scale-[1.02] transition-all z-10 ${
                          app.status === 'pendente' 
                            ? 'bg-amber-500/40 border-2 border-dashed border-amber-600/50 animate-pulse' 
                            : 'bg-amber-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                            <p className="font-black text-[10px] uppercase truncate italic">{app.customerName}</p>
                            {app.status === 'pendente' && <Clock size={10} className="text-amber-800" />}
                        </div>
                        <span className="text-[8px] font-bold opacity-70 uppercase truncate">
                            {viewMode === 'week' ? app.barber : app.service}
                        </span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleOpenModal(barberName, slot, targetDate)}
                        className="absolute inset-0 border border-dashed border-white/10 rounded-[1.2rem] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all flex items-center justify-center group"
                      >
                        <Plus size={16} className="text-slate-800 group-hover:text-amber-500 transition-colors" />
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
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white italic uppercase">Novo <span className="text-amber-500">Agendamento</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] font-bold text-amber-500 uppercase flex justify-between">
                <span>{newBooking.barber}</span>
                <span>{newBooking.date} às {newBooking.time}</span>
              </div>
              <input 
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold"
                placeholder="Nome do Cliente"
                value={newBooking.customerName}
                onChange={e => setNewBooking({...newBooking, customerName: e.target.value})}
              />
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold"
                onChange={e => {
                  const s = services.find(sv => sv.name === e.target.value);
                  setNewBooking({...newBooking, service: e.target.value, price: s?.price || 0});
                }}
              >
                <option value="">Selecione o serviço</option>
                {services.map(s => <option key={s.id} value={s.name}>{s.name} - R$ {s.price}</option>)}
              </select>
              <button 
                onClick={handleFinalizeEncaixe}
                disabled={loading}
                className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase text-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarView;