import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ClientHome from './views/ClientHome';
import BookingFlow from './views/BookingFlow';
import { BookingProvider } from './views/BookingContext';
import AdminDashboard from './views/AdminDashboard';
import AdminSettings from './views/AdminSettings';
import CreateBarbershop from './views/CreateBarbershop';
import MyAppointments from './views/MyAppointments';
import InstallBanner from './views/InstallBanner';

import Login from './views/Login';
import { MOCK_USER } from './constants';
import { supabase } from '@/lib/supabase';
import { User, LayoutDashboard, Calendar, Settings, Plus, ShieldCheck, LogOut } from 'lucide-react';

type ViewState = 'client' | 'admin' | 'booking' | 'profile' | 'my_appointments' | 'settings' | 'create_barbershop';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('client');
  const [session, setSession] = useState<any>(null);
  const [userPhone, setUserPhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [urlSlug, setUrlSlug] = useState<string | null>(null);

  const hasRedirected = useRef(false);

  useEffect(() => {
    const path = window.location.pathname.split('/')[1];
    const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', ''];

    if (path && !reservedRoutes.includes(path)) {
      localStorage.setItem('last_visited_slug', path);
      setUrlSlug(path);
      setView('client');
    }
    else if (path === '' && localStorage.getItem('last_visited_slug')) {
      const savedSlug = localStorage.getItem('last_visited_slug');
      window.location.replace(`/${savedSlug}`);
      return;
    }
    else if (path === 'registrar') {
      setView('create_barbershop');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session, true, path);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const isNewLogin = _event === 'SIGNED_IN' || _event === 'INITIAL_SESSION';
        fetchProfile(session, isNewLogin, window.location.pathname.split('/')[1]);
      } else {
        setLoading(false);
        hasRedirected.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentSession: any, allowRedirect: boolean, currentPath: string | null) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name, barbershop_id, barbershops:barbershop_id(slug)')
        .eq('id', currentSession.user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const rawSlug = (profile as any).barbershops?.slug || '';
        const myBarbershopSlug = rawSlug.trim().toLowerCase();
        const normalizedCurrentPath = (currentPath || '').trim().toLowerCase();
        const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', ''];


        setUserName(profile.full_name || currentSession.user.email.split('@')[0]);
        setBarbershopId(profile.barbershop_id);

        const isUserAdmin = profile.role === 'admin';

        if (isUserAdmin) {
          setIsAdmin(true);

          const isOwnerOrGeneral = !normalizedCurrentPath ||
            normalizedCurrentPath === '' ||
            normalizedCurrentPath === 'admin' ||
            normalizedCurrentPath === 'registrar' ||
            normalizedCurrentPath === myBarbershopSlug;

          if (isOwnerOrGeneral) {
            if (allowRedirect && !hasRedirected.current) {
              const targetView = profile.barbershop_id ? 'admin' : 'create_barbershop';
              setView(targetView);
              hasRedirected.current = true;
            }
          } else {
            console.warn("⚠️ Admin tentando acessar unidade de terceiros como cliente.");
            setIsAdmin(false);
            if (allowRedirect && !hasRedirected.current) {
              setView('client');
              hasRedirected.current = true;
            }
          }
        } else {
          setIsAdmin(false);
          if (allowRedirect && !hasRedirected.current) {
            const isSlug = normalizedCurrentPath && !reservedRoutes.includes(normalizedCurrentPath);
            setView(isSlug ? 'client' : 'profile');
            hasRedirected.current = true;
          }
        }
      }
    } catch (err) {
      console.error("❌ Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (newView: ViewState) => {
    if (isAdmin && !barbershopId && newView !== 'create_barbershop') {
      setView('create_barbershop');
      return;
    }
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair?")) {
      hasRedirected.current = false;
      await supabase.auth.signOut();

      setBarbershopId(null);
      setIsAdmin(false);
      setUserName('');

      if (urlSlug) {
        setView('client');
      } else {
        setView('profile');
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-amber-500 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Barber Pro • Sincronizando</p>
    </div>
  );

  if (!session) return (
    <Login
      onLoginSuccess={async () => {
        hasRedirected.current = false;
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          setSession(newSession);
          fetchProfile(newSession, true, window.location.pathname.split('/')[1]);
        }
      }}
    />
  );

  return (
    <BookingProvider>
      <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-amber-500/30">

        {/* Banner de Instalação Proativo */}
        <InstallBanner />

        {view !== 'create_barbershop' && (
          <Header
            view={isAdmin ? 'admin' : 'client'}
            setView={(v) => navigateTo(v as ViewState)}
            onProfileClick={() => navigateTo('profile')}
            isAdmin={isAdmin}
          />
        )}

        <main className="flex-1">
          {view === 'client' && urlSlug && <ClientHome onStartBooking={() => navigateTo('booking')} />}

          {view === 'admin' && isAdmin && barbershopId && <AdminDashboard barbershopId={barbershopId} />}

          {view === 'create_barbershop' && isAdmin && <CreateBarbershop />}

          {view === 'settings' && isAdmin && barbershopId && (
            <AdminSettings barbershopId={barbershopId} />
          )}

          {view === 'booking' && (
            <BookingFlow
              onComplete={() => navigateTo('client')}
              onCancel={() => navigateTo('client')}
            />
          )}

          {view === 'my_appointments' && (
            <MyAppointments
              onBack={() => setView('profile')}
              customerName={userName}
              customerPhone={userPhone || session?.user?.phone || ""}
              userId={session?.user?.id || ""}
              isAdmin={isAdmin}
            />
          )}
          {view === 'profile' && (
            <div className="max-w-xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom duration-700 pb-32 text-center">
              <div className="flex flex-col items-center space-y-6 mb-12">
                <div className="relative group">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-1000"></div>
                  <img src={MOCK_USER.avatar} className="relative w-32 h-32 rounded-full border-4 border-black object-cover shadow-2xl" alt="Avatar" />
                  {isAdmin && (
                    <div className="absolute bottom-1 right-1 bg-amber-500 p-2.5 rounded-full border-4 border-black shadow-xl">
                      <ShieldCheck size={24} className="text-black" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">{userName}</h2>
                  <p className="text-zinc-500 font-mono text-xs tracking-widest">{session.user.email}</p>
                </div>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl text-left">
                  {isAdmin && barbershopId && (
                    <button onClick={() => navigateTo('admin')} className="w-full flex items-center justify-between p-7 hover:bg-zinc-800 transition-all border-b border-zinc-800 text-amber-500 group">
                      <div className="flex items-center gap-5">
                        <LayoutDashboard size={24} className="group-hover:rotate-6 transition-transform" />
                        <span className="font-black uppercase text-xs tracking-[0.2em]">Painel do Gestor</span>
                      </div>
                      <Plus size={18} className="text-zinc-700" />
                    </button>
                  )}

                  <button onClick={() => navigateTo('my_appointments')} className="w-full flex items-center justify-between p-7 hover:bg-zinc-800 transition-all border-b border-zinc-800 group">
                    <div className="flex items-center gap-5">
                      <Calendar size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase text-xs tracking-[0.2em]">{isAdmin ? 'Agenda da Unidade' : 'Meus Agendamentos'}</span>
                    </div>
                    <Plus size={18} className="text-zinc-700" />
                  </button>

                  {isAdmin && barbershopId && (
                    <button onClick={() => navigateTo('settings')} className="w-full flex items-center justify-between p-7 hover:bg-zinc-800 transition-all border-b border-zinc-800 group text-zinc-300">
                      <div className="flex items-center gap-5">
                        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="font-black uppercase text-xs tracking-[0.2em]">Configurações de Trabalho</span>
                      </div>
                      <Plus size={18} className="text-zinc-700" />
                    </button>
                  )}

                  <button onClick={handleLogout} className="w-full flex items-center gap-5 p-7 hover:bg-red-500/10 transition-all text-red-500 group">
                    <LogOut size={24} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-black uppercase text-xs tracking-[0.2em]">Sair da Plataforma</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-zinc-950/95 backdrop-blur-3xl border-t border-zinc-800/50 px-10 py-5 flex justify-between items-center z-50">
          {isAdmin ? (
            <button onClick={() => navigateTo('admin')} className={`p-4 rounded-2xl transition-all ${view === 'admin' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40' : 'bg-zinc-900 text-zinc-500'}`}>
              <LayoutDashboard size={26} strokeWidth={3} />
            </button>
          ) : (
            <button onClick={() => navigateTo('client')} className={`p-4 rounded-2xl ${view === 'client' ? 'text-amber-500' : 'text-zinc-500'}`}>
              <Calendar size={26} strokeWidth={2.5} />
            </button>
          )}

          {!isAdmin && (
            <button onClick={() => navigateTo('booking')} className="bg-amber-500 -mt-16 p-6 rounded-full shadow-2xl shadow-amber-500/60 text-black active:scale-90 transition-all border-[8px] border-black">
              <Plus size={32} strokeWidth={4} />
            </button>
          )}

          <button onClick={() => navigateTo('profile')} className={`p-4 rounded-2xl transition-all ${(view === 'profile' || view === 'my_appointments' || view === 'settings') ? 'text-amber-500' : 'text-zinc-500'}`}>
            <User size={26} strokeWidth={2.5} />
          </button>
        </nav>
      </div>
    </BookingProvider>
  );
};

export default App;