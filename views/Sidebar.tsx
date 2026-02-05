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
  X
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
  disabled = false
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3.5 lg:py-4 transition-all relative group min-h-[44px]
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      ${active ? 'text-amber-500 bg-amber-500/5' : 'text-slate-500 hover:text-slate-300'}
    `}
    aria-current={active ? 'page' : undefined}
  >
    {active && !disabled && (
      <div className="absolute left-0 w-1 h-6 lg:h-8 bg-amber-500 rounded-r-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
    )}
    <div className={`${active && !disabled ? 'scale-110' : disabled ? '' : 'group-hover:scale-110'} transition-transform flex-shrink-0`}>
      {icon}
    </div>
    <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.15em] lg:tracking-[0.2em] text-left">
      {label}
    </span>
    {disabled && (
      <Lock size={14} className="ml-auto text-red-400 flex-shrink-0" />
    )}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isBlocked,
  barbershopName,
  isOpen,
  onClose
}) => {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={onClose} 
        />
      )}

      <aside
        className={`
          fixed lg:relative
          w-64 lg:w-64
          h-full
          border-r border-white/5 bg-[#0a0b0e]
          flex flex-col
          z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 lg:p-8 mb-2 lg:mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-base lg:text-xl font-black text-white tracking-tighter italic uppercase truncate">
                {barbershopName || 'Barber'}
              </h1>
              <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] mt-1">
                SaaS Edition v1.0
              </p>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Fechar menu"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Menu principal">
          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')}
            disabled={false}
          />
          <SidebarItem
            icon={<Banknote size={18} />}
            label="Fluxo de Caixa"
            active={activeTab === 'caixa'}
            onClick={() => onTabChange('caixa')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<CalendarDays size={18} />}
            label="Agendamentos"
            active={activeTab === 'agendamentos'}
            onClick={() => onTabChange('agendamentos')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<ReceiptText size={18} />}
            label="Lançar Venda"
            active={activeTab === 'lancamento'}
            onClick={() => onTabChange('lancamento')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<DollarSign size={18} />}
            label="Comissões"
            active={activeTab === 'comissoes'}
            onClick={() => onTabChange('comissoes')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<Users size={18} />}
            label="Clientes"
            active={activeTab === 'clientes'}
            onClick={() => onTabChange('clientes')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<Package size={18} />}
            label="Estoque"
            active={activeTab === 'estoque'}
            onClick={() => onTabChange('estoque')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<MinusCircle size={18} />}
            label="Despesas"
            active={activeTab === 'despesas'}
            onClick={() => onTabChange('despesas')}
            disabled={isBlocked}
          />
          <SidebarItem
            icon={<History size={18} />}
            label="Histórico"
            active={activeTab === 'historico'}
            onClick={() => onTabChange('historico')}
            disabled={isBlocked}
          />

          <div className={`${isBlocked ? 'animate-pulse' : ''}`}>
            <SidebarItem
              icon={<ShieldCheck size={18} className={isBlocked ? "text-red-500" : "text-amber-500"} />}
              label={isBlocked ? "🔓 Renovar" : "Assinatura"}
              active={activeTab === 'billing'}
              onClick={() => onTabChange('billing')}
              disabled={false}
            />
          </div>

          <SidebarItem
            icon={<Settings size={18} />}
            label="Configurações"
            active={activeTab === 'config'}
            onClick={() => onTabChange('config')}
            disabled={isBlocked}
          />
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;