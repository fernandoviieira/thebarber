import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado (modo standalone)
    const checkStandalone = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInStandaloneMode(standalone);
      return standalone;
    };

    // Se já está instalado, não mostra o banner
    if (checkStandalone()) {
      setIsVisible(false);
      return;
    }

    // Detecta iOS de forma mais precisa
    const detectIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = (navigator as any).userAgentData?.platform || navigator.platform;
      
      // Detecção melhorada para iOS
      const isIOSDevice = 
        /iphone|ipad|ipod/.test(userAgent) ||
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPad moderno
        /iphone|ipad|ipod/.test(platform.toLowerCase());

      // Verifica se é Safari (não Chrome ou outro navegador no iOS)
      const isSafari = 
        /safari/.test(userAgent) && 
        !/chrome|crios|fxios|edgios/.test(userAgent);

      return { isIOSDevice, isSafari };
    };

    // Handler para Android/Chrome/Edge
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('📱 Evento beforeinstallprompt capturado');
      setDeferredPrompt(e);
      setIsIOS(false);
      setIsVisible(true);
    };

    // Verifica se já mostrou o banner recentemente
    const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
    const now = Date.now();
    
    if (lastDismissed && (now - parseInt(lastDismissed)) < 7 * 24 * 60 * 60 * 1000) {
      // Não mostra se foi fechado há menos de 7 dias
      console.log('⏰ Banner foi fechado recentemente, aguardando...');
      return;
    }

    // Configuração do iOS
    const { isIOSDevice, isSafari } = detectIOSDevice();
    
    if (isIOSDevice && isSafari) {
      console.log('🍎 Dispositivo iOS detectado com Safari');
      setIsIOS(true);
      setIsVisible(true);
    }

    // Listener para Android/Desktop
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listener para detectar quando o app é instalado
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA instalado com sucesso');
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ Prompt de instalação não disponível');
      return;
    }

    try {
      console.log('🚀 Iniciando instalação...');
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`👤 Escolha do usuário: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('❌ Erro ao instalar:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Salva timestamp do dismiss
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  // Não renderiza se não for visível ou já estiver instalado
  if (!isVisible || isInStandaloneMode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-amber-500/30 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[9999] animate-in slide-in-from-bottom-5 duration-500">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-2xl shadow-lg flex-shrink-0">
                {isIOS ? (
                  <Share2 size={24} className="text-black" />
                ) : (
                  <Download size={24} className="text-black" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-1">
                  {isIOS ? 'Adicionar à Tela Inicial' : 'Instalar Aplicativo'}
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {isIOS 
                    ? 'Acesso rápido sem ocupar espaço' 
                    : 'Acesse direto da sua tela inicial'}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white transition-colors p-2 -mt-1 -mr-1 flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo */}
          {isIOS ? (
            /* Tutorial para iOS/Safari */
            <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-zinc-800/50">
              <div className="flex items-start gap-3 text-xs text-zinc-300">
                <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 flex-shrink-0 mt-0.5">
                  <Share2 size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 pt-0.5">
                  <span className="block leading-relaxed">
                    <strong className="text-blue-400 font-bold">1.</strong> Toque no botão <strong className="text-blue-400">Compartilhar</strong> <Share2 size={14} className="inline mx-1" /> na barra do Safari
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-zinc-300">
                <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex-shrink-0 mt-0.5">
                  <PlusSquare size={16} className="text-amber-400" />
                </div>
                <div className="flex-1 pt-0.5">
                  <span className="block leading-relaxed">
                    <strong className="text-amber-400 font-bold">2.</strong> Role e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong> <PlusSquare size={14} className="inline mx-1" />
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-zinc-300">
                <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20 flex-shrink-0 mt-0.5">
                  <span className="text-green-400 font-bold text-sm">✓</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <span className="block leading-relaxed">
                    <strong className="text-green-400 font-bold">3.</strong> Confirme tocando em <strong className="text-white">"Adicionar"</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Botão para Android/Chrome/Edge */
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Instalar Agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstallBanner;
