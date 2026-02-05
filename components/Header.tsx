import React, { useState, useEffect } from 'react';
import { Scissors, User, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  view: 'client' | 'admin';
  setView: (view: 'client' | 'admin') => void;
  onProfileClick: () => void;
  isAdmin: boolean;
  // ✅ NOVO: Props para controlar menu hambúrguer
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  setView, 
  onProfileClick, 
  isAdmin,
  showMenuButton = false,
  onMenuClick
}) => {
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    async function fetchShopData() {
      const pathSegments = window.location.pathname.split('/');
      const slug = pathSegments[1];

      if (slug && !['admin', 'login', 'profile', ''].includes(slug)) {
        try {
          const { data, error } = await supabase
            .from('barbershops')
            .select('name')
            .eq('slug', slug)
            .single();

          if (error) throw error;

          if (data && data.name) {
            setShopName(data.name.toUpperCase());
          }
        } catch (err) {
          console.error("Erro ao buscar barbearia pelo slug:", err);
          setShopName("BARBEARIA");
        }
      } else {
        setShopName("PAINEL DE GESTÃO");
      }
    }

    fetchShopData();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        
        {/* ✅ NOVO: Botão de Menu Hambúrguer (só aparece quando showMenuButton === true) */}
        {showMenuButton && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-3 bg-amber-500 text-black rounded-xl shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-amber-600 min-w-[44px] min-h-[44px] flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={22} strokeWidth={3} />
          </button>
        )}

        {/* Logo e Nome da Barbearia */}
        <div 
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0" 
          onClick={() => setView(isAdmin ? 'admin' : 'client')}
        >
          <div className="bg-amber-500 p-2 rounded-lg transition-transform group-hover:scale-110 flex-shrink-0">
            <Scissors size={20} className="text-zinc-950" />
          </div>
          
          <h1 className="font-serif text-lg md:text-2xl font-black text-white tracking-tighter uppercase truncate">
            {shopName || "CARREGANDO..."}
          </h1>
        </div>

        {/* Botão de Perfil */}
        <nav className="flex items-center gap-4 flex-shrink-0">
          <button 
            onClick={onProfileClick}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:border-amber-500 transition-all active:scale-95 min-h-[40px]"
          >
            <User size={18} className="text-amber-500 flex-shrink-0" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {isAdmin ? 'Admin' : 'Perfil'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
