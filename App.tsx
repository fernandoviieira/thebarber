import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ClientHome from './views/ClientHome';
import BookingFlow from './views/BookingFlow';
import { BookingProvider, useBooking } from './views/BookingContext';
import AdminDashboard from './views/AdminDashboard';
import AdminSettings from './views/AdminSettings';
import CreateBarbershop from './views/CreateBarbershop';
import MyAppointments from './views/MyAppointments';
import InstallBanner from './views/InstallBanner';
import SubscriptionPage from './views/SubscriptionPage';
import CustomersModule from './views/CustomersModule';
import CommissionsModule from './views/CommissionsModule';
import InventoryModule from './views/InventoryModule';
import AdminCalendarView from './views/AdminCalendarView';
import CashFlowModule from './views/CashFlowModule';
import CheckoutModule from './views/CheckoutModule';
import SalesHistoryModule from './views/SalesHistoryModule';
import ExpensesModule from './views/ExpensesModule';
import ResetPassword from './views/ResetPassword';
import Sidebar from './views/Sidebar';
import Login from './views/Login';
import { MOCK_USER } from './constants';
import { supabase } from '@/lib/supabase';
import { Calendar, Settings, Plus, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';

type ViewState = 'client' | 'admin' | 'booking' | 'profile' | 'my_appointments' | 'settings' | 'create_barbershop' | 'subscription_plans' | 'reset_password';

type AdminTab =
  | 'dashboard'
  | 'agendamentos'
  | 'lancamento'
  | 'clientes'
  | 'estoque'
  | 'config'
  | 'comissoes'
  | 'historico'
  | 'caixa'
  | 'despesas'
  | 'billing';

const AppContent: React.FC = () => {
  const { appointments, fetchAppointments, deleteAppointment, addAppointment, updateStatus } = useBooking();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [dbSubscriptionStatus, setDbSubscriptionStatus] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('client');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('dashboard');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [urlSlug, setUrlSlug] = useState<string | null>(null);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [barbershopName, setBarbershopName] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingCheckoutApp, setPendingCheckoutApp] = useState<any | null>(null);

  // Estados de Dados Centralizados
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [barbershopSlug, setBarbershopSlug] = useState<string | null>(null);

  const hasRedirected = useRef(false);
  const previousSlug = useRef<string | null>(null);
  const isResetPasswordRoute = useRef(false);

  // VERIFICAÇÃO INICIAL DA ROTA DE RESET
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('reset-password')) {
      isResetPasswordRoute.current = true;
      setView('reset_password');
      setLoading(false);
    }
  }, []);

  // Busca de dados globais quando o barbershopId for definido
  useEffect(() => {
    const fetchAllAdminData = async () => {
      if (!barbershopId || !isAdmin || isResetPasswordRoute.current) return;

      try {
        if (fetchAppointments) await fetchAppointments(barbershopId);

        const [barbersRes, servicesRes, inventoryRes, customersRes, settingsRes, shopRes, expensesRes] = await Promise.all([
          supabase.from('barbers').select('*').eq('barbershop_id', barbershopId),
          supabase.from('services').select('*').eq('barbershop_id', barbershopId),
          supabase.from('inventory').select('*').eq('barbershop_id', barbershopId).gt('current_stock', 0),
          supabase.from('customers').select('*, customer_packages(*)').eq('barbershop_id', barbershopId).order('name'),
          supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershopId).maybeSingle(),
          supabase.from('barbershops').select('name, subscription_status, expires_at, trial_ends_at, current_plan, slug').eq('id', barbershopId).single(),
          supabase.from('expenses').select('*').eq('barbershop_id', barbershopId)
        ]);

        if (barbersRes.data) setBarbers(barbersRes.data);
        if (servicesRes.data) setServices(servicesRes.data);
        if (inventoryRes.data) setInventory(inventoryRes.data);
        if (customersRes.data) setCustomers(customersRes.data);
        if (shopRes.data) {
          setBarbershopSlug(shopRes.data.slug);
        }
      } catch (err) {
        console.error("Erro ao carregar dados administrativos:", err);
      }
    };

    fetchAllAdminData();
  }, [barbershopId, isAdmin]);

  // Efeito para detectar mudança de slug e forçar recarregamento
  useEffect(() => {
    if (isResetPasswordRoute.current) return;

    const pathSlug = window.location.pathname.split('/')[1];
    const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', 'reset-password', ''];

    if (isAdmin && barbershopSlug && pathSlug && !reservedRoutes.includes(pathSlug)) {
      if (pathSlug !== barbershopSlug) {
        localStorage.setItem('last_visited_slug', pathSlug);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  }, [isAdmin, barbershopSlug]);

  // Efeito para detectar mudança de URL via navegação
  useEffect(() => {
    if (isResetPasswordRoute.current) return;

    const handleLocationChange = () => {
      const pathSlug = window.location.pathname.split('/')[1];
      const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', 'reset-password', ''];

      if (isAdmin && barbershopSlug && pathSlug && !reservedRoutes.includes(pathSlug)) {
        if (pathSlug !== barbershopSlug && previousSlug.current !== pathSlug) {
          previousSlug.current = pathSlug;
          setTimeout(() => {
            window.location.reload();
          }, 150);
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, [isAdmin, barbershopSlug]);

  useEffect(() => {
    // SE FOR ROTA DE RESET, NÃO EXECUTA NADA
    if (isResetPasswordRoute.current) {
      return;
    }

    // --- 1. LÓGICA DE ROTEAMENTO E SLUG ---
    const path = window.location.pathname.split('/')[1];
    const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', 'reset-password', ''];

    // Se o usuário está em uma slug de barbearia, salva no localStorage e atualiza o estado
    if (path && !reservedRoutes.includes(path)) {
      localStorage.setItem('last_visited_slug', path);
      if (urlSlug !== path) setUrlSlug(path);
    }
    // Se está na home vazia, tenta redirecionar para a última barbearia visitada
    else if (path === '' && localStorage.getItem('last_visited_slug')) {
      const savedSlug = localStorage.getItem('last_visited_slug');
      window.location.replace(`/${savedSlug}`);
      return;
    }
    else if (path === 'registrar') {
      setView('create_barbershop');
    }

    if (urlSlug) {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        const baseApi = "https://api.contafacilpro.com.br";
        const newManifestHref = `${baseApi}/api/manifest/${urlSlug}?v=${Date.now()}`;

        if (manifestLink.href !== newManifestHref) {
          manifestLink.setAttribute('crossorigin', 'anonymous');
          manifestLink.href = newManifestHref;
        }
      }
    }

    // --- 3. LÓGICA DE AUTENTICAÇÃO (SUPABASE) ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      // 🛡️ Se está na rota de reset, mantém a view de reset
      if (isResetPasswordRoute.current || window.location.pathname.includes('reset-password')) {
        setView('reset_password');
        setLoading(false);
        return;
      }

      if (session) {
        const isNewSession = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        if (isNewSession) {
          fetchProfile(session, true, window.location.pathname.split('/')[1]);
        }
      } else {
        setLoading(false);
        hasRedirected.current = false;
        if (!urlSlug && (path === '' || path === 'profile')) setView('profile');
      }
    });

    return () => subscription.unsubscribe();
  }, [urlSlug, barbershopName]);

  const fetchProfile = async (currentSession: any, allowRedirect: boolean, currentPath: string | null) => {
    try {
      // 🛡️ Se for rota de reset, não busca perfil
      if (isResetPasswordRoute.current || window.location.pathname.includes('reset-password')) {
        setView('reset_password');
        setLoading(false);
        return;
      }

      // 1. Busca inicial do perfil
      let { data: profile, error } = await supabase
        .from('profiles')
        .select(`
        role, 
        full_name, 
        barbershop_id, 
        barbershops:barbershop_id(name, slug, subscription_status, trial_ends_at, expires_at, current_plan)
      `)
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) throw error;

      const normalizedCurrentPath = (currentPath || '').trim().toLowerCase();
      const reservedRoutes = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', 'reset-password', ''];
      const isRegistrarRoute = normalizedCurrentPath === 'registrar';


      if (profile?.barbershop_id) {
        const { data: barbershopData } = await supabase
          .from('barbershops')
          .select('name, slug, subscription_status, trial_ends_at, expires_at, current_plan')
          .eq('id', profile.barbershop_id)
          .single();

        if (barbershopData) {
          setBarbershopName(barbershopData.name || '');
          setBarbershopSlug(barbershopData.slug);
          setDbSubscriptionStatus(barbershopData.subscription_status);
          setExpiresAt(barbershopData.expires_at);
          setCurrentPlan(barbershopData.current_plan);

          const now = new Date();
          const isTrialActive = barbershopData.trial_ends_at ? new Date(barbershopData.trial_ends_at) > now : false;
          const isSubscriptionActive =
            barbershopData.subscription_status === 'active' &&
            barbershopData.expires_at &&
            new Date(barbershopData.expires_at) > now;
          setIsBlocked(!isTrialActive && !isSubscriptionActive);

          if (normalizedCurrentPath && !reservedRoutes.includes(normalizedCurrentPath) && normalizedCurrentPath !== barbershopData.slug) {            
            window.history.pushState({}, '', `/${barbershopData.slug}`);
            setUrlSlug(barbershopData.slug);
            
            if (profile.role === 'admin') {
              setView('admin');
            } else {
              setView('client');
            }
            
            setLoading(false);
            return;
          }
          
          if (!normalizedCurrentPath || reservedRoutes.includes(normalizedCurrentPath)) {
            setUrlSlug(barbershopData.slug);
          }
        }
      }

      if (profile && !profile.barbershop_id) {
        if (isRegistrarRoute && profile.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', currentSession.user.id);

          profile.role = 'admin';
        }
        // CASO B: Usuário em uma barbearia específica sem vínculo (APENAS SE NÃO TIVER BARBEARIA)
        else if (normalizedCurrentPath && !reservedRoutes.includes(normalizedCurrentPath)) {
          const { data: bData } = await supabase
            .from('barbershops')
            .select('id, name, slug, subscription_status, trial_ends_at, expires_at, current_plan')
            .eq('slug', normalizedCurrentPath)
            .maybeSingle();

          if (bData) {
            await supabase
              .from('profiles')
              .update({ barbershop_id: bData.id, role: 'client' })
              .eq('id', currentSession.user.id);

            profile.barbershop_id = bData.id;
            profile.role = 'client';
            (profile as any).barbershops = bData;
          }
        }
      }
      // ========== FIM DA NOVA LÓGICA ==========

      if (!profile) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('role, full_name, barbershop_id')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (!retryProfile) {
          if (allowRedirect && !hasRedirected.current) {
            setView(isRegistrarRoute ? 'create_barbershop' : 'profile');
            hasRedirected.current = true;
          }
          return;
        }
        profile = retryProfile;
      }

      const barbershopData = (profile as any).barbershops;
      const myBarbershopSlug = (barbershopData?.slug || '').trim().toLowerCase();
      const shopName = barbershopData?.name || '';

      setUserName(profile.full_name || currentSession.user.email.split('@')[0]);
      setBarbershopId(profile.barbershop_id);
      setBarbershopName(shopName);
      setBarbershopSlug(myBarbershopSlug);

      if (barbershopData) {
        setDbSubscriptionStatus(barbershopData.subscription_status);
        setExpiresAt(barbershopData.expires_at);
        setCurrentPlan(barbershopData.current_plan);
        const now = new Date();
        const isTrialActive = barbershopData.trial_ends_at ? new Date(barbershopData.trial_ends_at) > now : false;
        const isSubscriptionActive =
          barbershopData.subscription_status === 'active' &&
          barbershopData.expires_at &&
          new Date(barbershopData.expires_at) > now;

        setIsBlocked(!isTrialActive && !isSubscriptionActive);
      }

      const isUserAdmin = profile.role === 'admin';

      if (isUserAdmin) {
        setIsAdmin(true);
        if (allowRedirect && !hasRedirected.current) {
          if (profile.barbershop_id) {
            setView('admin');

            const pathSlug = window.location.pathname.split('/')[1];
            if (pathSlug && pathSlug !== myBarbershopSlug) {
              setTimeout(() => {
                window.location.reload();
              }, 200);
            }

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
        setIsAdmin(false);
        if (allowRedirect && !hasRedirected.current) {
          if (urlSlug || (normalizedCurrentPath !== '' && !reservedRoutes.includes(normalizedCurrentPath))) {
            setView('client');
          } else {
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

  const handleAdminTabChange = (tab: AdminTab) => {
    if (isBlocked && tab !== 'billing' && tab !== 'dashboard') {
      alert('🔒 Sistema bloqueado. Renove sua licença para continuar.');
      return;
    }
    setAdminActiveTab(tab);
    setAdminSidebarOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair?")) {
      hasRedirected.current = false;
      isResetPasswordRoute.current = false;
      await supabase.auth.signOut();
      setBarbershopId(null);
      setIsAdmin(false);
      setUserName('');
      setSession(null);
      setBarbershopSlug(null);

      if (urlSlug) setView('client'); else setView('profile');
      if (urlSlug && window.location.pathname !== `/${urlSlug}`) {
        window.history.pushState({}, '', `/${urlSlug}`);
      }
    }
  };

  const handleFinalizeFromCalendar = (appointment: any) => {
    setPendingCheckoutApp(appointment);
    setAdminActiveTab('lancamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-500 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">
          Barber Pro • Sincronizando
        </p>
      </div>
    );
  }

  if (!session && !isResetPasswordRoute.current) {
    return (
      <Login onLoginSuccess={() => { hasRedirected.current = false; setLoading(true); }} />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-amber-500/30">
      <InstallBanner />

      {view !== 'create_barbershop' && view !== 'reset_password' && (
        <Header
          view={isAdmin ? 'admin' : 'client'}
          setView={(v) => navigateTo(v as ViewState)}
          onProfileClick={() => navigateTo('profile')}
          isAdmin={isAdmin}
          showMenuButton={view === 'admin'}
          onMenuClick={() => setAdminSidebarOpen(true)}
        />
      )}

      <main className="flex-1">
        {view === 'reset_password' && (
          <ResetPassword onBack={() => {
            isResetPasswordRoute.current = false;
            if (session) {
              setView('profile');
            } else {
              window.location.href = '/';
            }
          }} />
        )}

        {view === 'subscription_plans' && (
          <SubscriptionPage
            barbershopId={barbershopId!}
            userEmail={session?.user?.email}
            subscriptionStatus={dbSubscriptionStatus}
            expiresAt={expiresAt}
            currentPlan={currentPlan}
          />
        )}

        {view === 'client' && urlSlug && (
          <ClientHome onStartBooking={() => navigateTo('booking')} />
        )}

        {view === 'admin' && isAdmin && barbershopId && (
          <div className="flex min-h-screen bg-[#0f1115] overflow-hidden">
            <Sidebar
              activeTab={adminActiveTab}
              onTabChange={handleAdminTabChange}
              isBlocked={isBlocked}
              barbershopName={barbershopName}
              isOpen={adminSidebarOpen}
              onClose={() => setAdminSidebarOpen(false)}
            />

            <div className="flex-1 overflow-y-auto">
              {adminActiveTab === 'dashboard' && <AdminDashboard barbershopId={barbershopId} />}
              {adminActiveTab === 'caixa' && <CashFlowModule barbershopId={barbershopId} appointments={appointments} />}
              {adminActiveTab === 'agendamentos' && (
                <AdminCalendarView
                  barbershopId={barbershopId}
                  barbers={barbers}
                  services={services}
                  onSave={addAppointment}
                  onUpdate={updateStatus}
                  onDelete={deleteAppointment}
                  onFinalize={handleFinalizeFromCalendar}
                  appointments={appointments?.filter((app: any) => app.status !== 'cancelado')}
                />
              )}
              {adminActiveTab === 'lancamento' && (
                <CheckoutModule
                  barbershopId={barbershopId}
                  barbers={barbers}
                  services={services}
                  inventory={inventory}
                  customers={customers}
                  initialAppointment={pendingCheckoutApp}
                  onSuccess={() => {
                    setAdminActiveTab('dashboard');
                    setPendingCheckoutApp(null);
                    if (fetchAppointments) fetchAppointments(barbershopId);
                  }}
                />
              )}
              {adminActiveTab === 'comissoes' && <CommissionsModule barbershopId={barbershopId} />}
              {adminActiveTab === 'clientes' && <CustomersModule barbershopId={barbershopId} />}
              {adminActiveTab === 'estoque' && <InventoryModule barbershopId={barbershopId} />}
              {adminActiveTab === 'despesas' && <ExpensesModule barbershopId={barbershopId} />}
              {adminActiveTab === 'historico' && (
                <SalesHistoryModule
                  barbershopId={barbershopId}
                  appointments={appointments}
                  servicesList={services}
                  productsList={inventory}
                  barbers={barbers}
                  onDelete={async (id: string) => {
                    if (confirm('Deseja estornar esta venda?')) {
                      await deleteAppointment(id);
                      if (fetchAppointments) fetchAppointments(barbershopId);
                    }
                  }}
                />
              )}
              {adminActiveTab === 'billing' && (
                <SubscriptionPage
                  barbershopId={barbershopId!}
                  userEmail={session?.user?.email}
                  subscriptionStatus={dbSubscriptionStatus}
                  expiresAt={expiresAt}
                  currentPlan={currentPlan}
                />
              )}
              {adminActiveTab === 'config' && <AdminSettings barbershopId={barbershopId} />}
            </div>
          </div>
        )}

        {view === 'create_barbershop' && isAdmin && <CreateBarbershop />}
        {view === 'settings' && isAdmin && barbershopId && <AdminSettings barbershopId={barbershopId} />}
        {view === 'booking' && <BookingFlow onComplete={() => navigateTo('client')} onCancel={() => navigateTo('client')} />}
        {view === 'my_appointments' && (
          <MyAppointments 
            onBack={() => setView('profile')}
            customerName={userName}
            customerPhone={session?.user?.phone || ""}
            userId={session?.user?.id || ""}
            isAdmin={isAdmin}
            barbershopId={barbershopId} 
          />
        )}

        {view === 'profile' && (
          <div className="max-w-xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom duration-700 pb-32 text-center">
            <div className="flex flex-col items-center space-y-6 mb-12">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-1000" />
                <img src={MOCK_USER.avatar} className="relative w-32 h-32 rounded-full border-4 border-black object-cover shadow-2xl" alt="Avatar" />
                {isAdmin && (
                  <div className="absolute bottom-1 right-1 bg-amber-500 p-2.5 rounded-full border-4 border-black shadow-xl">
                    <ShieldCheck size={24} className="text-black" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">{userName}</h2>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">{session?.user?.email}</p>
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
  );
};

const App: React.FC = () => {
  return (
    <BookingProvider>
      <AppContent />
    </BookingProvider>
  );
};

export default App;