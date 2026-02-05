import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Lógica para Chrome/Android/Windows (Baseado em evento)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsIOS(false); // Garante que não é modo iOS
      setIsVisible(true);
    };

    // 2. Lógica REAL para Safari/iOS (Baseado em UserAgent e Standalone)
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent;

      // Detecção mais precisa de iPhone/iPad
      const isIOS = /iPhone|iPad|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad Pro se passa por Mac

      // Verifica se o App JÁ ESTÁ instalado
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      // IMPORTANTE: Só mostrar se for iOS e NÃO estiver instalado
      if (isIOS && !isStandalone) {
        setIsIOS(true);
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    detectIOS();

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 bg-zinc-900 border border-amber-500/40 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] animate-in slide-in-from-bottom-10 backdrop-blur-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl">
              {isIOS ? (
                <PlusSquare size={20} className="text-black" />
              ) : (
                <Download size={20} className="text-black" />
              )}
            </div>
            <div>
              <h3 className="text-white font-black text-[11px] uppercase italic tracking-wider">
                {isIOS ? 'Instalar no iPhone' : 'Instalar BarberPro'}
              </h3>
              <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-tight">
                {isIOS ? 'Siga as etapas abaixo' : 'Acesse pela sua tela inicial'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-zinc-600 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {isIOS ? (
          /* Tutorial Manual para Safari */
          <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-white/5">
            <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-300">
              <div className="bg-zinc-800 p-1.5 rounded-lg text-blue-400">
                <Share size={14} />
              </div>
              <span>1. Toque em <span className="text-blue-400 font-bold">Compartilhar</span> na barra inferior.</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-300">
              <div className="bg-zinc-800 p-1.5 rounded-lg text-white">
                <PlusSquare size={14} />
              </div>
              <span>2. Selecione <span className="text-white font-bold">"Adicionar à Tela de Início"</span>.</span>
            </div>
          </div>
        ) : (
          /* Botão Direto para Chrome/Android */
          <button
            onClick={handleInstall}
            className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            Instalar Agora
          </button>
        )}
      </div>
    </div>
  );
}

export default InstallBanner;