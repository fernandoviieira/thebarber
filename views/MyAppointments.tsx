import React from 'react';
import { useBooking } from './BookingContext';
import { Calendar, Clock, MapPin, ChevronLeft, User, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

interface MyAppointmentsProps {
  onBack: () => void;
  customerName: string;
  userId: string;
  isAdmin: boolean; // Adicionado aqui
}

const MyAppointments: React.FC<MyAppointmentsProps> = ({ onBack, customerName, userId, isAdmin }) => {
  const { appointments, loading, deleteAppointment } = useBooking();

  // FILTRO AGORA USA O PAPEL (ROLE) REAL
  const myAppointments = appointments.filter(app => {
    // Se o sistema confirmou que você é Admin no App.tsx, mostra tudo
    if (isAdmin) {
      return true;
    }

    // Para clientes comuns, filtra pelo ID único
    return app.user_id === userId;
  });

  const handleCancel = async (id: string) => {
    await deleteAppointment(id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-amber-500">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-bold">Buscando agendamentos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-serif font-bold">
          {isAdmin ? "Agenda Administrador" : "Meus Agendamentos"}
        </h2>
      </div>

      {myAppointments.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
          <Calendar className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-500">Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAppointments.map((app) => (
            <div key={app.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                    app.status === 'confirmado' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {app.status}
                  </span>
                  <h4 className="text-lg font-bold mt-2">{app.service}</h4>
                  
                  {/* Se for Admin, mostra o nome do cliente no card */}
                  {isAdmin && (
                    <p className="text-xs text-amber-500 font-medium mt-1 uppercase italic">
                      Cliente: {app.customerName}
                    </p>
                  )}
                </div>
                
                {/* Admin pode apagar qualquer um. Cliente só apaga se não estiver confirmado */}
                {(isAdmin || app.status !== 'confirmado') ? (
                  <button 
                    onClick={() => handleCancel(app.id)}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                ) : (
                   <div className="p-2 text-zinc-700">
                     <CheckCircle2 size={20} className="text-emerald-500/30" />
                   </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Calendar size={16} className="text-amber-500" />
                  <span>{new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Clock size={16} className="text-amber-500" />
                  <span>{app.time}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <User size={16} className="text-amber-500" />
                  <span>{app.barber}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <MapPin size={16} className="text-amber-500" />
                  <span>Unidade Centro</span>
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