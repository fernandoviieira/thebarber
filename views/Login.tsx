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
  
  const [currentBarbershop, setCurrentBarbershop] = useState<{id: string, name: string} | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // --- FLUXO DE CADASTRO ---
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });

        if (signUpError) throw signUpError;
        const newUser = signUpData.user;

        if (newUser) {
          // Aguarda um pouco mais para a Trigger do Supabase criar o registro na tabela profiles
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Se existe uma barbearia na URL, o usuário é CLIENTE. 
          // Se a URL está limpa, ele é o ADMIN (Dono da plataforma)
          const userRole = currentBarbershop ? 'client' : 'admin';

          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: newUser.id, 
              barbershop_id: currentBarbershop?.id || null, 
              role: userRole, 
              full_name: name
            }, { onConflict: 'id' });

          if (profileError) throw profileError;
          
          if (userRole === 'admin') {
            alert('Conta de Administrador criada! Vamos configurar sua unidade.');
            onLoginSuccess(); 
          } else {
            alert('Cadastro realizado com sucesso! Agora você pode entrar.');
            setIsRegister(false);
          }
        }
      } else {
        // --- FLUXO DE LOGIN NORMAL ---
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        // Avisa ao App.tsx que o login deu certo. 
        // O App.tsx vai decidir se mostra a Home do Cliente ou o Dashboard baseado na URL.
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
            <h1 className="text-4xl font-serif font-bold italic text-white tracking-tighter uppercase">
              {currentBarbershop ? currentBarbershop.name : 'BARBEARIA PRO'}
            </h1>
            <p className="text-zinc-400 mt-4 font-medium uppercase text-xs tracking-widest">
              {isRegister ? 'Crie sua conta' : 'Acesse o sistema'}
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

            {error && <div className="text-red-400 text-xs text-center animate-pulse py-2">{error}</div>}

            <button type="submit" disabled={loading}
              className="group w-full bg-amber-500 text-zinc-950 font-black py-4 rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span className="uppercase tracking-widest">{isRegister ? 'Finalizar Cadastro' : 'Entrar Agora'}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-zinc-400 hover:text-white text-sm font-medium transition-all underline decoration-amber-500/30 underline-offset-4">
              {isRegister ? 'Já possui uma conta? Entrar' : 'Novo por aqui? Crie sua conta grátis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;