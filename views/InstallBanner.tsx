import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Home, Info } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [browser, setBrowser] = useState<'chrome' | 'safari' | 'edge' | 'firefox' | 'other'>('other');

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
    // 4. INICIALIZAÇÃO
    // ==========================================================
    detectBrowser();
    const standalone = checkStandalone();
    const iOSDetected = detectIOS();

    if (standalone) {
      console.log('📱 App já instalado');
      return;
    }

    // ==========================================================
    // 5. EVENTO DE INSTALAÇÃO (ANDROID/DESKTOP) - CORRIGIDO
    // ==========================================================
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('📱 Evento beforeinstallprompt disparado!', e);
      
      // Verifica se o evento tem o método prompt
      if (e.prompt && typeof e.prompt === 'function') {
        console.log('✅ Evento válido com método prompt');
        setDeferredPrompt(e);
      } else {
        console.log('⚠️ Evento sem método prompt, criando fallback');
        // Cria um objeto compatível
        setDeferredPrompt({
          prompt: async () => {
            console.log('📱 Fallback: abrindo instruções manuais');
            showManualInstructions();
          },
          userChoice: new Promise(resolve => {
            resolve({ outcome: 'accepted' });
          })
        });
      }
      
      setIsIOS(false);
      setIsVisible(true);
    };

    // ==========================================================
    // 6. MOSTRAR BANNER APÓS 3 SEGUNDOS
    // ==========================================================
    const showTimer = setTimeout(() => {
      if (!standalone && !isVisible) {
        console.log('📱 Mostrando banner (fallback)');
        setIsVisible(true);
      }
    }, 3000);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(showTimer);
    };
  }, []);

  // ==========================================================
  // 7. INSTRUÇÕES MANUAIS POR NAVEGADOR
  // ==========================================================
  const showManualInstructions = () => {
    let message = '';
    let url = '';
    
    switch(browser) {
      case 'chrome':
        message = 'No Chrome, clique nos três pontinhos (⋮) e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".';
        url = 'https://support.google.com/chrome/answer/9658361';
        break;
      case 'edge':
        message = 'No Edge, clique nos três pontinhos (⋯) e selecione "Aplicativos" > "Instalar este site como um aplicativo".';
        url = 'https://support.microsoft.com/pt-br/microsoft-edge/instalar-gerenciar-e-desinstalar-aplicativos-no-microsoft-edge';
        break;
      case 'firefox':
        message = 'No Firefox, clique no menu (☰) e selecione "Instalar Aplicativo".';
        url = 'https://support.mozilla.org/pt-BR/kb/instalar-firefox-android';
        break;
      case 'safari':
        message = 'No Safari, clique no ícone Compartilhar (📤) e depois em "Adicionar à Tela de Início".';
        url = 'https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a7/ios';
        break;
      default:
        message = 'Clique no menu do seu navegador e procure por "Instalar aplicativo" ou "Adicionar à tela inicial".';
        url = 'https://web.dev/learn/pwa/installation';
    }
    
    if (confirm(`${message}\n\nDeseja abrir o tutorial oficial?`)) {
      window.open(url, '_blank');
    }
  };

  // ==========================================================
  // 8. INSTALAÇÃO PARA ANDROID/DESKTOP
  // ==========================================================
  const handleInstallClick = async () => {
    if (deferredPrompt && deferredPrompt.prompt) {
      try {
        console.log('📱 Tentando instalação nativa...');
        await deferredPrompt.prompt();
        
        if (deferredPrompt.userChoice) {
          const { outcome } = await deferredPrompt.userChoice;
          console.log('📱 Resultado da instalação:', outcome);
          
          if (outcome === 'accepted') {
            setIsVisible(false);
            setDeferredPrompt(null);
            localStorage.removeItem('pwa_banner_dismissed');
          }
        } else {
          // Fallback se não tiver userChoice
          console.log('📱 Instalação concluída (assumindo sucesso)');
          setIsVisible(false);
          setDeferredPrompt(null);
          localStorage.removeItem('pwa_banner_dismissed');
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
            <p className="text-zinc-300 text-xs">Toque para ver como instalar na tela inicial</p>
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
                      {isIOS 
                        ? 'Acesso rápido direto da tela inicial' 
                        : deferredPrompt 
                          ? 'Clique no botão para instalar' 
                          : `Navegador: ${browser} • Toque para instruções`}
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
                    {deferredPrompt ? 'Instalar Agora' : 'Como instalar'}
                  </button>
                  <p className="text-zinc-500 text-xs text-center">
                    {deferredPrompt 
                      ? 'Instalação rápida • Funciona offline' 
                      : `Clique para ver instruções para ${browser}`}
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
                {/* Passos para iOS aqui... (manter igual) */}
                
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