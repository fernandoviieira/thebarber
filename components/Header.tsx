import React, { useState, useEffect } from 'react';
import { Scissors, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  view: 'client' | 'admin';
  setView: (view: 'client' | 'admin') => void;
  onProfileClick: () => void;
  isAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ setView, onProfileClick, isAdmin }) => {
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    async function fetchShopData() {
      // 1. Pega o slug da URL (ex: /barbeariaruivo)
      const pathSegments = window.location.pathname.split('/');
      const slug = pathSegments[1];

      // 2. Filtra rotas que não são de clientes
      if (slug && !['admin', 'login', 'profile', ''].includes(slug)) {
        try {
          const { data, error } = await supabase
            .from('barbershops')
            .select('name')
            .eq('slug', slug)
            .single();

          if (error) throw error;

          if (data && data.name) {
            // Pega o nome real do banco e coloca em caixa alta
            setShopName(data.name.toUpperCase());
          }
        } catch (err) {
          console.error("Erro ao buscar barbearia pelo slug:", err);
          setShopName("BARBEARIA"); // Nome genérico apenas se o banco falhar
        }
      } else {
        setShopName("PAINEL DE GESTÃO");
      }
    }

    fetchShopData();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Identidade visual baseada no Cliente (Slug) */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setView(isAdmin ? 'admin' : 'client')}
        >
          <div className="bg-amber-500 p-2 rounded-lg transition-transform group-hover:scale-110">
            <Scissors size={20} className="text-zinc-950" />
          </div>
          
          <h1 className="font-serif text-lg md:text-2xl font-black text-white tracking-tighter uppercase">
            {shopName || "CARREGANDO..."}
          </h1>
        </div>

        <nav className="flex items-center gap-4">
          <button 
            onClick={onProfileClick}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:border-amber-500 transition-all active:scale-95"
          >
            <User size={18} className="text-amber-500" />
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