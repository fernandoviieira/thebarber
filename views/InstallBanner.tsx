import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Home, Info, Globe } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [browser, setBrowser] = useState<'chrome' | 'safari' | 'edge' | 'firefox' | 'other'>('other');
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    // ==========================================================
    // 1. DETECÇÃO DO NAVEGADOR
    // ==========================================================
    const detectBrowser = () => {
      const ua = navigator.userAgent.toLowerCase();

      if (ua.indexOf('chrome') > -1 && ua.indexOf('edg') === -1) {
        setBrowser('chrome');
        return 'chrome';
      }
      if (ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1) {
        setBrowser('safari');
        return 'safari';
      }
      if (ua.indexOf('edg') > -1) {
        setBrowser('edge');
        return 'edge';
      }
      if (ua.indexOf('firefox') > -1) {
        setBrowser('firefox');
        return 'firefox';
      }
      setBrowser('other');
      return 'other';
    };

    // ==========================================================
    // 2. DETECÇÃO DE MODO STANDALONE
    // ==========================================================
    const checkStandalone = () => {
      const iOSStandalone = (window.navigator as any).standalone === true;
      const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const desktopStandalone = window.matchMedia('(display-mode: window-controls-overlay)').matches;

      const standalone = iOSStandalone || displayModeStandalone || desktopStandalone;

      console.log('📱 Modo standalone:', {
        iOS: iOSStandalone,
        displayMode: displayModeStandalone,
        desktop: desktopStandalone,
        final: standalone
      });

      setIsStandalone(standalone);
      return standalone;
    };

    // ==========================================================
    // 3. DETECÇÃO DE iOS
    // ==========================================================
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

      const iOS = isIOSDevice || isIPadOS;
      setIsIOS(iOS);
      return iOS;
    };

    // ==========================================================
    // 4. VERIFICA SE O PWA É INSTALÁVEL
    // ==========================================================
    const checkInstallable = () => {
      const supportsPWA = 'serviceWorker' in navigator; // sem BeforeInstallPromptEvent
      setInstallable(supportsPWA);
      return supportsPWA;
    };

    // ==========================================================
    // 5. INICIALIZAÇÃO
    // ==========================================================
    detectBrowser();
    const standalone = checkStandalone();
    const iOSDetected = detectIOS();
    const pwaSupported = checkInstallable();

    if (standalone) {
      console.log('📱 App já instalado');
      return;
    }

    // ==========================================================
    // 6. EVENTO DE INSTALAÇÃO (ANDROID/DESKTOP) - VERSÃO FINAL
    // ==========================================================
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('📱 beforeinstallprompt disparado!', e);
      console.log('✅ Evento beforeinstallprompt capturado e guardado!'); // Adicione este log

      // ✅ Removido o check isTrusted - estava bloqueando evento real
      setDeferredPrompt(e);
      setInstallable(true);
      setIsVisible(true);
    };

    // ==========================================================
    // 7. VERIFICAÇÃO DE INSTALAÇÃO VIA MENU DO NAVEGADOR
    // ==========================================================
    const checkBrowserInstallCapability = () => {
      // Chrome/Edge: tem suporte nativo
      if (browser === 'chrome' || browser === 'edge') {
        // Se não recebeu o evento após 5 segundos, pode ser porque já está instalado
        // ou o navegador não quer disparar
        setTimeout(() => {
          if (!deferredPrompt && !standalone) {
            console.log('📱 Navegador com suporte mas sem evento - mostrando instruções');
            setInstallable(false);
            setIsVisible(true);
          }
        }, 5000);
      }
    };

    // ==========================================================
    // 8. MOSTRAR BANNER APÓS 3 SEGUNDOS (FALLBACK)
    // ==========================================================
    const showTimer = setTimeout(() => {
      if (!standalone && !isVisible) {
        console.log('📱 Mostrando banner (fallback)');
        setIsVisible(true);
      }
    }, 3000);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkBrowserInstallCapability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(showTimer);
    };
  }, []);

  // ==========================================================
  // 9. INSTRUÇÕES MANUAIS POR NAVEGADOR
  // ==========================================================
  const showManualInstructions = () => {
    let message = '';
    let url = '';

    switch (browser) {
      case 'chrome':
        message = 'No Chrome, você pode instalar o app de duas formas:\n\n1. Clique nos três pontinhos (⋮) no canto superior direito\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"\n\nOu use o atalho:';
        url = 'https://support.google.com/chrome/answer/9658361';
        break;
      case 'edge':
        message = 'No Edge, você pode instalar o app de duas formas:\n\n1. Clique nos três pontinhos (⋯) no canto superior direito\n2. Vá em "Aplicativos" > "Instalar este site como um aplicativo"';
        url = 'https://support.microsoft.com/pt-br/microsoft-edge/instalar-gerenciar-e-desinstalar-aplicativos-no-microsoft-edge';
        break;
      case 'firefox':
        message = 'No Firefox, a instalação de PWA tem suporte limitado.\n\nClique no menu (☰) e selecione "Instalar Aplicativo" se disponível.';
        url = 'https://support.mozilla.org/pt-BR/kb/instalar-firefox-android';
        break;
      case 'safari':
        message = 'No Safari do iPhone/iPad:\n\n1. Toque no ícone Compartilhar (📤)\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Confirme em "Adicionar"';
        url = 'https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a7/ios';
        break;
      default:
        message = 'Seu navegador pode não suportar instalação de PWAs.\n\nTente usar Chrome ou Edge para melhor experiência.';
        url = 'https://web.dev/learn/pwa/installation';
    }

    if (confirm(`${message}\n\nDeseja abrir o tutorial oficial?`)) {
      window.open(url, '_blank');
    }
  };

  // ==========================================================
  // 10. INSTALAÇÃO PARA ANDROID/DESKTOP
  // ==========================================================
  const handleInstallClick = async () => {
    if (deferredPrompt && deferredPrompt.prompt) {
      try {
        console.log('📱 Tentando instalação nativa...');
        await deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log('📱 Resultado da instalação:', outcome);

        if (outcome === 'accepted') {
          setIsVisible(false);
          setDeferredPrompt(null);
          localStorage.removeItem('pwa_banner_dismissed');
        } else {
          // Usuário recusou, mostra instruções alternativas
          showManualInstructions();
        }
      } catch (error) {
        console.error('❌ Erro na instalação nativa:', error);
        showManualInstructions();
      }
    } else {
      console.log('📱 Sem suporte nativo, mostrando instruções');
      showManualInstructions();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSHelp(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  const goToInstallForCurrentSlug = () => {
    setShowIOSHelp(true);
    setIsVisible(false);
  };

  const handleCloseIOSHelp = () => {
    setShowIOSHelp(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  const showIOSFloatingButton = isIOS && !showIOSHelp && !isStandalone;

  // Determina a mensagem baseada no navegador
  const getButtonText = () => {
    if (deferredPrompt) return 'Instalar Agora';
    if (isIOS) return 'Como instalar no iOS';
    if (browser === 'chrome' || browser === 'edge') return 'Instalar via Menu do Navegador';
    return 'Como instalar';
  };

  const getDescription = () => {
    if (deferredPrompt) return 'Clique para instalar o app';
    if (isIOS) return 'Siga as instruções para iOS';
    if (browser === 'chrome' || browser === 'edge') return 'Use o menu do navegador para instalar';
    return `Instruções para ${browser}`;
  };

  return (
    <>
      {/* Botão Flutuante para iOS */}
      {showIOSFloatingButton && (
        <button
          onClick={goToInstallForCurrentSlug}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-500/40 z-[9998] animate-in slide-in-from-right-5 duration-500 flex items-center justify-center group transition-all active:scale-95"
          aria-label="Como instalar no iPhone/iPad"
          style={{
            width: '60px',
            height: '60px'
          }}
        >
          <div className="relative">
            <Home size={24} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              !
            </div>
          </div>
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <Info size={14} className="text-blue-400" />
              <span className="font-bold text-sm">Adicionar ao iPhone</span>
            </div>
            <p className="text-zinc-300 text-xs">Toque para ver instruções</p>
          </div>
        </button>
      )}

      {/* Banner Principal */}
      {isVisible && (
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
                      {getDescription()}
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
                      Toque no ícone <strong className="text-blue-400">Compartilhar</strong> na barra inferior
                    </p>
                  </div>
                  <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <PlusSquare size={22} className="text-amber-400 flex-shrink-0" />
                      <span className="text-white font-bold text-base">Passo 2</span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed pl-9">
                      Role e toque em <strong className="text-amber-400">"Adicionar à Tela de Início"</strong>
                    </p>
                  </div>
                  <div className="bg-green-500/15 border-2 border-green-500/40 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl flex-shrink-0">✓</span>
                      <span className="text-white font-bold text-base">Passo 3</span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed pl-9">
                      Confirme em <strong className="text-green-400">"Adicionar"</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    {getButtonText()}
                  </button>
                  <p className="text-zinc-500 text-xs text-center">
                    {deferredPrompt
                      ? 'Instalação rápida • Funciona offline'
                      : `Clique para ver instruções detalhadas para ${browser}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Instruções para iOS */}
      {showIOSHelp && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[10000] animate-in fade-in duration-500 overflow-y-auto">
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl">
                    <Home size={28} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-white font-black text-2xl uppercase tracking-tight">
                      Adicionar ao iPhone
                    </h1>
                    <p className="text-zinc-400 text-sm">Instruções passo a passo</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseIOSHelp}
                  className="text-zinc-500 hover:text-white p-3 rounded-full hover:bg-white/5 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">1</div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Toque em Compartilhar</h3>
                      <p className="text-blue-300 text-sm">Ícone na barra inferior</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-2 border-amber-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-amber-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">2</div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Adicionar à Tela de Início</h3>
                      <p className="text-amber-300 text-sm">Role e toque na opção</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">3</div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Confirme</h3>
                      <p className="text-green-300 text-sm">Toque em "Adicionar"</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseIOSHelp}
                  className="w-full bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white py-4 rounded-2xl font-bold text-base uppercase tracking-wider border-2 border-zinc-700 active:scale-[0.98] transition-all duration-200 mt-6"
                >
                  Entendi, obrigado!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallBanner;