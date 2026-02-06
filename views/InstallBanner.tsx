import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      console.log('✅ App já instalado');
      return;
    }

    // 2. Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    const isAppleDevice = 
      /iphone|ipad|ipod/.test(userAgent) ||
      /iphone|ipad|ipod/.test(platform) ||
      (platform === 'macintel' && navigator.maxTouchPoints > 1);

    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|edgios/.test(userAgent);

    // 3. Verifica dismiss anterior
    const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
    const now = Date.now();
    const daysSinceDismiss = lastDismissed ? (now - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) : 999;
    
    // 4. Mostra banner no iOS se não foi fechado recentemente
    if (isAppleDevice && isSafari && daysSinceDismiss > 3) {
      console.log('🍎 iOS detectado - Exibindo banner');
      setIsIOS(true);
      setIsVisible(true);
    }

    // 5. Handler para Android/Desktop
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('📱 Android/Desktop - Prompt capturado');
      setDeferredPrompt(e);
      setIsIOS(false);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      console.log('✅ App instalado!');
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Erro ao instalar:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/98 backdrop-blur-xl border-t-4 border-amber-500 p-6 shadow-2xl z-[9999] animate-in slide-in-from-bottom-5 duration-500">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3.5 rounded-2xl shadow-xl flex-shrink-0">
                {isIOS ? (
                  <Share2 size={26} className="text-black" />
                ) : (
                  <Download size={26} className="text-black" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-black text-base uppercase tracking-wider mb-1">
                  {isIOS ? '📱 Adicionar à Tela Inicial' : 'Instalar Aplicativo'}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {isIOS ? 'Acesso rápido sem ocupar espaço' : 'Acesse direto da tela inicial'}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white transition-colors p-2 -mt-1 flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>

          {/* Conteúdo */}
          {isIOS ? (
            <div className="bg-black/60 rounded-2xl p-5 space-y-4 border-2 border-zinc-800">
              <div className="bg-blue-500/15 border-2 border-blue-500/40 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Share2 size={22} className="text-blue-400 flex-shrink-0" />
                  <span className="text-white font-bold text-base">Passo 1</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed pl-9">
                  Toque no ícone <strong className="text-blue-400">Compartilhar</strong> <Share2 size={14} className="inline mx-1" /> na barra inferior do Safari
                </p>
              </div>

              <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <PlusSquare size={22} className="text-amber-400 flex-shrink-0" />
                  <span className="text-white font-bold text-base">Passo 2</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed pl-9">
                  Role para baixo e toque em <strong className="text-amber-400">"Adicionar à Tela de Início"</strong> <PlusSquare size={14} className="inline mx-1" />
                </p>
              </div>

              <div className="bg-green-500/15 border-2 border-green-500/40 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl flex-shrink-0">✓</span>
                  <span className="text-white font-bold text-base">Passo 3</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed pl-9">
                  Confirme tocando em <strong className="text-green-400">"Adicionar"</strong> no canto superior direito
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Instalar Agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstallBanner;
