import React, { useState, useEffect } from 'react';
import { Lock, Mail, Scissors, User, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentBarbershop, setCurrentBarbershop] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    async function getBarbershopFromUrl() {
      const path = window.location.pathname.split('/')[1];
      const reserved = ['login', 'admin', 'profile', 'create_barbershop', 'settings', 'my_appointments'];

      if (path && path.trim() !== '' && !reserved.includes(path)) {
        try {
          const { data } = await supabase
            .from('barbershops')
            .select('id, name')
            .eq('slug', path)
            .maybeSingle();

          if (data) setCurrentBarbershop(data);
        } catch (err) {
          console.error("Erro ao identificar unidade:", err);
        }
      } else {
        setCurrentBarbershop(null);
      }
    }
    getBarbershopFromUrl();
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const isRegistrarPath = window.location.pathname.includes('/registrar');
                console.log('isRegistrarPath', isRegistrarPath)


      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          // ✅ ADICIONE ISSO PARA O GOOGLE TAMBÉM:
          data: {
            role: isRegistrarPath ? 'admin' : 'customer',
            barbershop_id: currentBarbershop?.id || null
          }
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com Google.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // 1. Criar o usuário no Supabase Auth
        // Passamos o full_name no metadata para a Trigger do Banco ler e criar o perfil
        // ✅ LOGICA DE DETECÇÃO DE ROTA
        const isRegistrarPath = window.location.pathname.includes('/registrar');

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              // Se estiver no /registrar, vira admin. Caso contrário, cliente.
              role: isRegistrarPath ? 'admin' : 'customer',
              // Se estiver em uma barbearia específica (ex: /barbearia-do-ze), vincula o cliente
              barbershop_id: currentBarbershop?.id || null
            }
          }
        });

        if (signUpError) throw signUpError;

        // Se o usuário foi criado, a Trigger no Postgres já criou o perfil em profiles.
        // O erro 403 acontecia porque você tentava fazer o trabalho da Trigger via API.

        const newUser = signUpData.user;
        if (newUser) {
          if (!currentBarbershop) {
            alert('Conta de Administrador criada! Vamos configurar sua unidade.');
            // No login de admin (SaaS), o login costuma ser automático após registro em algumas configs
            // Caso peça confirmação de e-mail, avise o usuário aqui.
            onLoginSuccess();
          } else {
            alert('Cadastro realizado com sucesso! Agora você pode entrar.');
            setIsRegister(false);
          }
        }
      } else {
        // 2. Login simples
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro na operação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop')` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-amber-900/20 z-10" />
      </div>

      <div className="relative z-20 w-full max-w-md px-6">
        <div className="bg-zinc-950/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 rounded-2xl bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-6 transform -rotate-12">
              <Scissors className="text-zinc-950" size={32} />
            </div>
            <h1 className="text-4xl font-serif font-bold italic text-white tracking-tighter uppercase leading-tight">
              {currentBarbershop ? currentBarbershop.name : 'CONTAFÁCIL PRO'}
            </h1>
            <p className="text-zinc-400 mt-4 font-medium uppercase text-[10px] tracking-[0.3em]">
              {isRegister ? 'Crie sua conta mestre' : 'Acesse seu painel'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {isRegister && (
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="Nome Completo" />
                </div>
              )}

              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="E-mail" />
              </div>

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="Sua Senha" />
              </div>
            </div>

            {error && <div className="text-red-400 text-xs text-center animate-pulse py-2 font-bold">{error}</div>}

            <button type="submit" disabled={loading}
              className="group w-full bg-amber-500 text-zinc-950 font-black py-4 rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-xl shadow-amber-500/20">
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span className="uppercase tracking-widest text-xs">{isRegister ? 'Finalizar Cadastro' : 'Entrar Agora'}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
              <span className="bg-zinc-950/20 backdrop-blur-md px-4 text-zinc-500">Ou continuar com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l2.85 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="uppercase tracking-widest text-[10px]">Entrar com Google</span>
          </button>

          <div className="mt-8 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-zinc-400 hover:text-white text-xs font-bold transition-all underline decoration-amber-500/30 underline-offset-4 uppercase tracking-widest">
              {isRegister ? 'Já possui uma conta? Login' : 'Novo por aqui? Criar conta grátis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;