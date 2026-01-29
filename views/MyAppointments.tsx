import React, { useEffect } from 'react';
import { useBooking } from './BookingContext';
import { Calendar, Clock, MapPin, ChevronLeft, User, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

interface MyAppointmentsProps {
  onBack: () => void;
  customerName: string;
  customerPhone: string;
  userId: string;
  isAdmin: boolean;
}

const MyAppointments: React.FC<MyAppointmentsProps> = ({ onBack, customerName, customerPhone, userId, isAdmin }) => {
  const { appointments, loading, deleteAppointment } = useBooking();

  const myAppointments = appointments.filter(app => {
    if (isAdmin) return true;
      const matchUserId = userId && app.user_id === userId;
      const cleanAppPhone = app.customerPhone?.replace(/\D/g, "");
      const cleanUserPhone = customerPhone?.replace(/\D/g, "");
      const matchPhone = cleanUserPhone && cleanAppPhone && cleanAppPhone === cleanUserPhone;
      const isMatch = matchUserId || matchPhone;
    return isMatch;
  });

  const handleCancel = async (id: string) => {
    if (window.confirm("Deseja realmente cancelar este agendamento?")) {
      await deleteAppointment(id);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-amber-500 bg-[#08080a] min-h-screen">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase italic tracking-widest text-xs">Sincronizando Agenda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-in slide-in-from-right duration-300 pb-20 min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-3 bg-zinc-900 border border-zinc-800 text-amber-500 rounded-2xl hover:bg-zinc-800 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
            {isAdmin ? "Agenda Geral" : "Meus Agendamentos"}
          </h2>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
            {myAppointments.length} agendamento(s) encontrado(s)
          </p>
        </div>
      </div>

      {myAppointments.length === 0 ? (
        <div className="text-center py-24 bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-800/50 backdrop-blur-sm">
          <Calendar className="mx-auto text-zinc-800 mb-6" size={64} />
          <p className="text-zinc-500 font-bold uppercase italic text-sm mb-2">Nenhum compromisso encontrado.</p>
          <p className="text-zinc-700 text-[10px] uppercase font-bold tracking-tighter">
            Verifique se o telefone no seu perfil é: {customerPhone || 'Não informado'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {myAppointments.map((app) => (
            <div key={app.id} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden transition-all hover:border-amber-500/30">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />

              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest italic border ${app.status === 'confirmado'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {app.status}
                  </span>
                  <h4 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">
                    {app.service}
                  </h4>
                </div>

                {(isAdmin || app.status !== 'confirmado') ? (
                  <button
                    onClick={() => handleCancel(app.id)}
                    className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg"
                  >
                    <Trash2 size={24} />
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-5 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-amber-500" />
                  <span className="text-xs font-black text-zinc-300 uppercase italic">
                    {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-amber-500" />
                  <span className="text-xs font-black text-zinc-300 uppercase italic">
                    {app.time}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User size={18} className="text-amber-500" />
                  <span className="text-xs font-black text-zinc-300 uppercase italic truncate">
                    {app.barber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-amber-500" />
                  <span className="text-xs font-black text-zinc-300 uppercase italic">
                    Matriz Centro
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;