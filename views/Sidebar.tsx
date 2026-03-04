import React from 'react';
import {
  Users,
  DollarSign,
  Package,
  LayoutDashboard,
  Settings,
  ReceiptText,
  CalendarDays,
  Banknote,
  History,
  MinusCircle,
  ShieldCheck,
  Lock,
  X,
  Ticket,
  Scissors,
  Sparkles,
  Crown,
  ChevronRight,
  Star,
  Award
} from 'lucide-react';

type ActiveTab =
  | 'dashboard'
  | 'agendamentos'
  | 'lancamento'
  | 'clientes'
  | 'estoque'
  | 'config'
  | 'comissoes'
  | 'historico'
  | 'caixa'
  | 'despesas'
  | 'club'
  | 'billing';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isBlocked: boolean;
  barbershopName: string;
  isOpen: boolean;
  onClose: () => void;
}

const SidebarItem = ({
  icon,
  label,
  active,
  onClick,
  disabled = false,
  badge,
  highlight = false,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  highlight?: boolean;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg
      transition-all duration-200 relative group min-h-[36px]
      ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
      ${
        active
          ? 'bg-gradient-to-r from-amber-500/15 to-amber-600/5 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]'
          : disabled
          ? 'text-slate-600'
          : highlight
          ? 'text-amber-300 hover:bg-white/5'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
      }
    `}
    style={{ width: 'calc(100% - 16px)' }}
    aria-current={active ? 'page' : undefined}
  >
    {/* Glow ativo */}
    {active && !disabled && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full shadow-[0_0_12px_3px_rgba(245,158,11,0.6)]" />
    )}

    {/* Ícone */}
    <span
      className={`
        flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
        ${
          active
            ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            : disabled
            ? 'text-slate-600'
            : highlight
            ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/15'
            : 'text-slate-500 group-hover:text-slate-200 group-hover:bg-white/8'
        }
      `}
    >
      {icon}
    </span>

    {/* Label */}
    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-left flex-1 truncate">
      {label}
    </span>

    {/* Badge / Lock / Chevron */}
    {badge && !disabled && (
      <span className="ml-auto text-[8px] font-black uppercase tracking-wide bg-amber-500 text-black px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
    {disabled && (
      <Lock size={10} className="ml-auto text-slate-600 flex-shrink-0" />
    )}
    {active && !disabled && (
      <ChevronRight size={11} className="ml-auto text-amber-500/60 flex-shrink-0" />
    )}
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-5 pt-3 pb-1">
    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-700">
      {children}
    </span>
  </div>
);

const Divider = () => (
  <div className="mx-4 my-1.5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
);

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isBlocked,
  barbershopName,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative
          w-[230px] lg:w-[230px]
          h-full
          flex flex-col
          z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0c0d11 0%, #09090d 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >

        {/* ──────────── HEADER / LOGO ──────────── */}
        <div className="relative px-4 pt-4 pb-3">
          {/* Brilho sutil atrás do logo */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)'
            }}
          />

          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 min-w-0">
              {/* Ícone da barbearia */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.1) 100%)',
                    boxShadow: '0 0 20px rgba(245,158,11,0.15), inset 0 0 0 1px rgba(245,158,11,0.2)',
                  }}
                >
                  <Scissors size={14} className="text-amber-400" />
                </div>
                {/* Dot verde de online */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0c0d11] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              </div>

              <div className="min-w-0">
                <h1 className="text-[13px] font-black text-white tracking-tight italic uppercase truncate leading-none">
                  {barbershopName || 'Barber'}
                </h1>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-white/8 rounded-lg transition-colors flex-shrink-0 ml-2 text-slate-500 hover:text-slate-300"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Linha separadora do header */}
        <div className="mx-4 h-px mb-1"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), rgba(255,255,255,0.05), transparent)'
          }}
        />

        {/* ──────────── NAVEGAÇÃO ──────────── */}
        <nav
          className="flex-1 overflow-y-auto pb-2 space-y-0.5"
          role="navigation"
          aria-label="Menu principal"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* VISÃO GERAL */}
          <SectionLabel>Visão Geral</SectionLabel>

          <SidebarItem
            icon={<LayoutDashboard size={14} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')}
          />
          <SidebarItem
            icon={<Banknote size={14} />}
            label="Fluxo de Caixa"
            active={activeTab === 'caixa'}
            onClick={() => onTabChange('caixa')}
            disabled={isBlocked}
          />

          <Divider />

          {/* OPERAÇÕES */}
          <SectionLabel>Operações</SectionLabel>

          <SidebarItem
            icon={<CalendarDays size={14} />}
            label="Agendamentos"
            active={activeTab === 'agendamentos'}
            onClick={() => onTabChange('agendamentos')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<ReceiptText size={14} />}
            label="Lançar Venda"
            active={activeTab === 'lancamento'}
            onClick={() => onTabChange('lancamento')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<DollarSign size={14} />}
            label="Comissões"
            active={activeTab === 'comissoes'}
            onClick={() => onTabChange('comissoes')}
            disabled={isBlocked}
          />

          <Divider />

          {/* GESTÃO */}
          <SectionLabel>Gestão</SectionLabel>

          <SidebarItem
            icon={<Users size={14} />}
            label="Clientes"
            active={activeTab === 'clientes'}
            onClick={() => onTabChange('clientes')}
            disabled={isBlocked}
          />

          {/* Destaque para o Clube de Assinantes */}
          <div className="px-2 my-1.5">
            <button
              onClick={() => onTabChange('club')}
              disabled={isBlocked}
              className={`
                w-full relative overflow-hidden rounded-lg p-2.5 text-left
                transition-all duration-300 group
                ${activeTab === 'club' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 ring-1 ring-amber-500/20' 
                  : 'bg-gradient-to-r from-amber-950/30 to-amber-900/15 border border-amber-800/20 hover:border-amber-700/30 hover:bg-amber-900/20'
                }
                ${isBlocked ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Efeito de brilho pulsante */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 animate-[shimmer_2s_infinite]" />
              
              <div className="flex items-center gap-2.5 relative">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${activeTab === 'club' 
                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                    : 'bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-lg'
                  }
                `}>
                  <Award size={16} className={activeTab === 'club' ? 'text-black' : 'text-black'} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`
                      text-[11px] font-black uppercase tracking-[0.15em]
                      ${activeTab === 'club' ? 'text-amber-400' : 'text-amber-400'}
                    `}>
                      Clube do Assinante
                    </span>
                    <span className="bg-amber-500 text-black text-[7px] font-black px-1 py-0.5 rounded-full uppercase tracking-wider">
                      Destaque
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} className="fill-amber-500 text-amber-500" />
                    ))}
                    <span className="text-[7px] text-slate-600 ml-1 font-medium">
                      Benefícios exclusivos
                    </span>
                  </div>
                </div>

                {/* Badge de "Novo" animado */}
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-black"></span>
                  </span>
                </div>
              </div>
            </button>
          </div>

          <SidebarItem
            icon={<Package size={14} />}
            label="Estoque"
            active={activeTab === 'estoque'}
            onClick={() => onTabChange('estoque')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<MinusCircle size={14} />}
            label="Despesas"
            active={activeTab === 'despesas'}
            onClick={() => onTabChange('despesas')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<History size={14} />}
            label="Histórico"
            active={activeTab === 'historico'}
            onClick={() => onTabChange('historico')}
            disabled={isBlocked}
          />

          <Divider />

          {/* SISTEMA */}
          <SectionLabel>Sistema</SectionLabel>

          {/* Card PRO / Renovar mais compacto */}
          <div className="px-2 mx-0 mb-1">
            <button
              onClick={() => onTabChange('billing')}
              className={`
                w-full relative overflow-hidden rounded-lg px-3 py-2 text-left
                transition-all duration-300 group
                ${
                  isBlocked
                    ? 'bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-800/30 hover:border-red-700/40'
                    : 'bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-800/25 hover:border-amber-700/40'
                }
                ${activeTab === 'billing' ? 'ring-1 ring-amber-500/30' : ''}
              `}
            >
              {/* Brilho animado no hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: isBlocked
                    ? 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, transparent 60%)'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 60%)'
                }}
              />

              <div className="flex items-center gap-2 relative">
                <div className={`
                  w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isBlocked
                    ? 'bg-red-500/15 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                    : 'bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.2)]'}
                `}>
                  {isBlocked
                    ? <ShieldCheck size={12} className="text-red-400" />
                    : <Crown size={12} className="text-amber-400" />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none
                    ${isBlocked ? 'text-red-400' : 'text-amber-400'}`
                  }>
                    {isBlocked ? '🔓 Renovar Agora' : 'Versão PRO'}
                  </p>
                  <p className="text-[7px] text-slate-600 mt-0.5 font-medium">
                    {isBlocked ? 'Acesso bloqueado' : 'Plano ativo'}
                  </p>
                </div>
                {isBlocked && (
                  <div className="ml-auto w-1 h-1 bg-red-500 rounded-full animate-pulse flex-shrink-0 shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
                )}
              </div>
            </button>
          </div>

          <SidebarItem
            icon={<Settings size={14} />}
            label="Configurações"
            active={activeTab === 'config'}
            onClick={() => onTabChange('config')}
            disabled={isBlocked}
            compact
          />
        </nav>

        {/* ──────────── FOOTER ──────────── */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
              <Scissors size={8} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[6px] text-slate-700 font-bold uppercase tracking-[0.2em] leading-none">
                Powered by
              </p>
              <p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.15em] mt-0.5">
                BarberOS · 2025
              </p>
            </div>
          </div>
        </div>
      </aside>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;