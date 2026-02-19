import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, Lock, CheckCircle, AlertCircle, Home, Eye, EyeOff, AlertTriangle, LogOut } from 'lucide-react';

interface ResetPasswordProps {
  onBack: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [lastSlug, setLastSlug] = useState<string | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);

  useEffect(() => {
    const savedSlug = localStorage.getItem('last_visited_slug');
    setLastSlug(savedSlug);
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isRecoverySession = session?.user?.aud === 'authenticated' &&
        session?.user?.email_confirmed_at;

      setHasValidSession(!!session || isRecoverySession);
    };

    checkSession();
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    if (errorCode === 'otp_expired') {
      setMessage({
        type: 'error',
        text: '🔗 Este link de recuperação expirou. Solicite um novo link para redefinir sua senha.'
      });
    } else if (errorDescription) {
      setMessage({
        type: 'error',
        text: `❌ ${errorDescription.replace(/\+/g, ' ')}`
      });
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '✅ Senha atualizada com sucesso! Redirecionando para o login...'
      });

      await supabase.auth.signOut();

      setTimeout(() => {
        if (lastSlug) {
          window.location.href = `/${lastSlug}`;
        } else {
          window.location.href = '/';
        }
      }, 2000);

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao atualizar senha'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (newPassword || confirmPassword) {
      setShowExitWarning(true);
    } else {
      executeBackToLogin();
    }
  };

  const executeBackToLogin = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');

    if (lastSlug) {
      window.location.href = `/${lastSlug}`;
    } else {
      window.location.href = '/';
    }
  };

  const handleResendReset = async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const email = hashParams.get('email') || prompt('Digite seu email para receber um novo link:');

    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '📧 Novo link enviado! Verifique sua caixa de entrada.'
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao enviar novo link'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToHome = () => {
    if (newPassword || confirmPassword) {
      setShowExitWarning(true);
    } else {
      executeBackToLogin();
    }
  };

  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
              Link Expirado
            </h2>
            <p className="text-zinc-400 text-sm">
              Este link de recuperação de senha é inválido ou expirou.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleResendReset}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black py-5 px-6 rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Mail size={20} />
              {loading ? 'ENVIANDO...' : 'SOLICITAR NOVO LINK'}
            </button>

            <button
              onClick={executeBackToLogin}
              className="w-full bg-zinc-800 text-white font-black py-5 px-6 rounded-2xl hover:bg-zinc-700 transition-all duration-300 flex items-center justify-center gap-3 group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              VOLTAR PARA O LOGIN
            </button>

            {lastSlug && (
              <div className="text-center pt-4">
                <button
                  onClick={executeBackToLogin}
                  className="text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Home size={14} />
                  IR PARA PÁGINA INICIAL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Lock size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
            Redefinir Senha
          </h2>
          <p className="text-zinc-400 text-sm">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-2 ml-2">
              NOVA SENHA
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-black border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder-zinc-700 focus:border-amber-500 focus:outline-none transition-all duration-300 pr-14"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-2 ml-2">
              CONFIRMAR SENHA
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder-zinc-700 focus:border-amber-500 focus:outline-none transition-all duration-300 pr-14"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-5 rounded-2xl flex items-start gap-3 ${message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                : message.type === 'warning'
                  ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                  : 'bg-red-500/10 border border-red-500/20 text-red-500'
              }`}>
              {message.type === 'success' ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : message.type === 'warning' ? (
                <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black py-5 px-6 rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'ATUALIZANDO...' : 'ATUALIZAR SENHA'}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full bg-zinc-800 text-white font-black py-5 px-6 rounded-2xl hover:bg-zinc-700 transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            VOLTAR PARA O LOGIN
          </button>

          {lastSlug && (
            <div className="text-center pt-4">
              <button
                onClick={handleGoToHome}
                className="text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <Home size={14} />
                IR PARA PÁGINA INICIAL
              </button>
            </div>
          )}
        </form>

        {/* Modal de Confirmação */}
        {showExitWarning && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
                  <AlertTriangle size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-2">
                  SENHA NÃO ALTERADA
                </h3>
                <p className="text-zinc-400 text-sm">
                  Você ainda não alterou sua senha. Se sair agora, continuará com a senha antiga.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black py-4 px-6 rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300"
                >
                  CONTINUAR EDITANDO
                </button>

                <button
                  onClick={executeBackToLogin}
                  className="w-full bg-zinc-800 text-white font-black py-4 px-6 rounded-2xl hover:bg-zinc-700 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  SAIR PARA O LOGIN
                </button>

                <button
                  onClick={() => setShowExitWarning(false)}
                  className="w-full text-zinc-600 hover:text-zinc-400 text-sm font-medium py-2 transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;