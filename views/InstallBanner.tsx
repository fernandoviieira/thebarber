import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Home, Info } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        window.location.protocol === 'file:';

      setIsStandalone(standalone);

      if (standalone) {
        return true;
      }
      return false;
    };

    if (checkStandalone()) return;

    // 2. Detecta iOS de forma mais precisa
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = navigator.platform.toLowerCase();
      const isAppleDevice =
        /iphone|ipad|ipod/.test(userAgent) ||
        /iphone|ipad|ipod/.test(platform) ||
        (platform === 'macintel' && navigator.maxTouchPoints > 1);

      const isSafari =
        /safari/.test(userAgent) &&
        !/chrome|crios|fxios|edgios/.test(userAgent) &&
        !/crios/.test(userAgent);

      const iOS = isAppleDevice && isSafari;
      setIsIOS(iOS);
      return iOS;
    };

    const iOSDetected = detectIOS();

    // 3. Verifica se já foi fechado recentemente
    const checkDismissed = () => {
      try {
        const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
        if (!lastDismissed) {
          return false;
        }

        const now = Date.now();
        const daysSinceDismiss = (now - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
        return daysSinceDismiss < 1;
      } catch (error) {
        console.error('❌ Erro ao verificar dismiss:', error);
        return false;
      }
    };

    const wasDismissedRecently = checkDismissed();

    // 4. Mostra o banner se não foi fechado recentemente
    if (!wasDismissedRecently) {
      if (iOSDetected) {
        setIsIOS(true);
        setIsVisible(true);
      }
    }

    // 5. Handler para Android/Desktop (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsIOS(false);

      if (!wasDismissedRecently) {
        setIsVisible(true);
      }
    };

    // 6. Handler para quando o app é instalado
    const handleAppInstalled = () => {
      setIsVisible(false);
      setShowIOSHelp(false);
    };

       // Adiciona os event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Timer para mostrar banner após alguns segundos (fallback)
    const showTimer = setTimeout(() => {
      if (!isStandalone && !isVisible && !wasDismissedRecently) {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(showTimer);
    };
  }, []); // ✅ REMOVIDO 'slug' das dependências

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
      console.error('❌ Erro ao instalar:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSHelp(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  const goToInstallForCurrentSlug = () => {
    // 1. Tenta pegar da URL atual
    const slug = window.location.pathname.split('/').filter(Boolean)[0];

    const reserved = ['admin', 'login', 'profile', 'settings', 'create_barbershop', 'my_appointments', 'registrar', 'install', ''];

    // 2. Se não for slug válido, tenta do localStorage
    if (!slug || reserved.includes(slug)) {
      const saved = localStorage.getItem('last_visited_slug');
      if (saved && !reserved.includes(saved)) {
        window.location.href = `/install/${saved}`;
        return;
      }
    } else {
      // 3. URL é uma slug válida - vai para instalação
      window.location.href = `/install/${slug}`;
      return;
    }

    // 4. Fallback: mostra instruções
    setShowIOSHelp(true);
    setIsVisible(false);
  };

  const handleCloseIOSHelp = () => {
    setShowIOSHelp(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  // Não mostra nada se já estiver instalado
  if (isStandalone) {
    return null;
  }

  // Botão flutuante para iOS
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

          {/* Tooltip */}
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
                <div className="space-y-4">
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Instalar Agora
                  </button>
                  <p className="text-zinc-500 text-xs text-center">
                    Instalação rápida e gratuita • Funciona offline
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Instruções para iOS */}
      {showIOSHelp && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[10000] animate-in fade-in duration-500">
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full">
              {/* Cabeçalho */}
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
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Instruções */}
              <div className="space-y-5">
                {/* Passo 1 */}
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Toque em Compartilhar</h3>
                      <p className="text-blue-300 text-sm">Ícone na barra inferior do Safari</p>
                    </div>
                  </div>
                  <div className="pl-14">
                    <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/30 p-3 rounded-lg">
                          <Share2 size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Toque no ícone</p>
                          <p className="text-zinc-400 text-xs">Barra de ações do Safari</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-2 border-amber-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-amber-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Encontre a Opção</h3>
                      <p className="text-amber-300 text-sm">Role até "Adicionar à Tela de Início"</p>
                    </div>
                  </div>
                  <div className="pl-14">
                    <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-500/30 p-3 rounded-lg">
                          <PlusSquare size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Adicionar à Tela de Início</p>
                          <p className="text-zinc-400 text-xs">Opção na lista de compartilhamento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Confirme</h3>
                      <p className="text-green-300 text-sm">Toque em "Adicionar" no canto superior</p>
                    </div>
                  </div>
                  <div className="pl-14">
                    <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/30 p-3 rounded-lg">
                          <span className="text-green-400 font-black text-lg">✓</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Toque em Adicionar</p>
                          <p className="text-zinc-400 text-xs">Confirmação final</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Fechar */}
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
