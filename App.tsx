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
import SubscriptionPage from './views/SubscriptionPage';

import Login from './views/Login';
import { MOCK_USER } from './constants';
import { supabase } from '@/lib/supabase';
import { User, LayoutDashboard, Calendar, Settings, Plus, ShieldCheck, LogOut } from 'lucide-react';

type ViewState = 'client' | 'admin' | 'booking' | 'profile' | 'my_appointments' | 'settings' | 'create_barbershop' | 'subscription_plans';

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

    // Lógica de Slug e Redirecionamento
    if (path && !reservedRoutes.includes(path)) {
      localStorage.setItem('last_visited_slug', path);
      setUrlSlug(path);
      // Não forçamos setView('client') aqui para não sobrescrever o redirecionamento do admin depois
    }
    else if (path === '' && localStorage.getItem('last_visited_slug')) {
      const savedSlug = localStorage.getItem('last_visited_slug');
      window.location.replace(`/${savedSlug}`);
      return;
    }
    else if (path === 'registrar') {
      setView('create_barbershop');
    }

    // Gerenciamento de Sessão Único
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session) {
        // Só buscamos o perfil se a sessão for nova ou se ainda não temos os dados
        const isNewSession = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        if (isNewSession) {
          fetchProfile(session, true, window.location.pathname.split('/')[1]);
        }
      } else {
        setLoading(false);
        hasRedirected.current = false;
        // Se não tem sessão e não tem slug, manda pro login/perfil
        if (!urlSlug && path === '') setView('profile');
      }
    });

    return () => subscription.unsubscribe();
  }, [urlSlug]); // Adicionado urlSlug como dependência para garantir consistência

  const fetchProfile = async (currentSession: any, allowRedirect: boolean, currentPath: string | null) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
        role, 
        full_name, 
        barbershop_id, 
        barbershops:barbershop_id(slug, subscription_status, trial_ends_at, expires_at)
      `)
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro na query do perfil:", error);
        throw error;
      }

      const normalizedCurrentPath = (currentPath || '').trim().toLowerCase();
      const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', ''];

      // 1. TRATAMENTO PARA NOVO USUÁRIO (Perfil inexistente)
      if (!profile) {
        console.warn("⏳ Perfil não encontrado, tentando novamente em 2s...");

        // Aguarda 2 segundos para a Trigger terminar
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('role, full_name, barbershop_id')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (!retryProfile) {
          // Se mesmo assim não achar, aí sim segue a lógica de novo usuário
          if (allowRedirect && !hasRedirected.current) {
            setView(normalizedCurrentPath === 'registrar' ? 'create_barbershop' : 'profile');
            hasRedirected.current = true;
          }
          return;
        }
        // Se achou no retry, continua o código usando o retryProfile...
      }

      // 2. DADOS DO PERFIL ENCONTRADOS
      const barbershopData = (profile as any).barbershops;
      const myBarbershopSlug = (barbershopData?.slug || '').trim().toLowerCase();

      setUserName(profile.full_name || currentSession.user.email.split('@')[0]);
      setBarbershopId(profile.barbershop_id);

      const isUserAdmin = profile.role === 'admin';

      if (isUserAdmin) {
        setIsAdmin(true);

        if (allowRedirect && !hasRedirected.current) {
          if (profile.barbershop_id) {
            setView('admin');
            // Sincroniza URL se o admin estiver no slug errado
            if (myBarbershopSlug && normalizedCurrentPath !== myBarbershopSlug) {
              window.history.pushState({}, '', `/${myBarbershopSlug}`);
              setUrlSlug(myBarbershopSlug);
            }
          } else {
            setView('create_barbershop');
          }
          hasRedirected.current = true;
        }
      } else {
        // --- LOGICA CORRIGIDA PARA CLIENTE (NÃO-ADMIN) ---
        setIsAdmin(false);

        if (allowRedirect && !hasRedirected.current) {
          // ✅ CORREÇÃO: Se existe um slug (na URL ou salvo), a prioridade é a Home do Cliente
          if (urlSlug || (normalizedCurrentPath !== '' && !reservedRoutes.includes(normalizedCurrentPath))) {
            setView('client');
          } else {
            // Só vai para o perfil se realmente não estivermos em nenhuma barbearia específica
            setView('profile');
          }
          hasRedirected.current = true;
        }
      }
    } catch (err) {
      console.error("❌ Erro fatal no fetchProfile:", err);
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
      // 1. Resetamos o controle de redirecionamento
      hasRedirected.current = false;

      // 2. Deslogamos do Supabase
      await supabase.auth.signOut();

      // 3. Limpamos APENAS os dados do usuário, mas MANTEMOS o urlSlug
      setBarbershopId(null);
      setIsAdmin(false);
      setUserName('');
      setSession(null);

      // 4. Lógica de permanência:
      // Se ele tem um slug (está em uma barbearia), ele volta para a 'client' (vitrine).
      // Se não tem slug, vai para a tela de login/perfil.
      if (urlSlug) {
        setView('client');
      } else {
        setView('profile');
      }

      // Opcional: Se quiser que a URL no navegador mude fisicamente para o slug:
      if (urlSlug && window.location.pathname !== `/${urlSlug}`) {
        window.history.pushState({}, '', `/${urlSlug}`);
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
      onLoginSuccess={() => {
        // Resetamos o controle de redirecionamento para o novo usuário que entrou
        hasRedirected.current = false;
        setLoading(true);
        // O onAuthStateChange ali em cima vai detectar o login e chamar o fetchProfile sozinho
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
          {view === 'subscription_plans' && <SubscriptionPage barbershopId={barbershopId!} userEmail={session?.user?.email} />}

          {view === 'client' && urlSlug && <ClientHome onStartBooking={() => navigateTo('booking')} />}

          {view === 'admin' && isAdmin && barbershopId && (<AdminDashboard barbershopId={barbershopId} userEmail={session?.user?.email} />)}

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
      </div>
    </BookingProvider>
  );
};

export default App;