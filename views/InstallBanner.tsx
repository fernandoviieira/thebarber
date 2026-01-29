import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e);
      setIsVisible(true); 
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); 
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-zinc-900 border border-amber-500/50 p-4 rounded-2xl shadow-2xl z-[999] animate-in slide-in-from-bottom-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Download size={20} className="text-black" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Instalar BarberPro</h3>
            <p className="text-zinc-400 text-xs">Acesse mais rápido da sua tela inicial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Instalar
          </button>
          <button onClick={() => setIsVisible(false)} className="text-zinc-500 p-1">
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallBanner;