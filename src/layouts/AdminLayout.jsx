import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { 
  LayoutDashboard, 
  Package, 
  FileCode, 
  BarChart3, 
  Database, 
  LogOut, 
  ShoppingBag,
  User,
  Settings
} from 'lucide-react';

const menuItems = [
  { path: '/admin', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gerente'] },
  { path: '/admin/estoque', name: 'Estoque', icon: Package, roles: ['admin', 'gerente'] },
  { path: '/admin/xml', name: 'Importar XML', icon: FileCode, roles: ['admin', 'gerente'] },
  { path: '/admin/relatorios', name: 'Relatórios', icon: BarChart3, roles: ['admin', 'gerente'] },
  { path: '/admin/backup', name: 'Sistema & Backup', icon: Database, roles: ['admin'] },
  { path: '/admin/config', name: 'Configurações', icon: Settings, roles: ['admin', 'gerente'] },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-border bg-brand-card flex flex-col justify-between z-10">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-brand-border flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-bold text-white shadow-lg glow-indigo">
              M
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">MercadoPDV</h1>
              <span className="text-xs text-gray-500 font-medium">Painel Retaguarda</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems
              .filter(item => item.roles.includes(user.role))
              .map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-accent text-white shadow-lg shadow-indigo-500/20'
                        : 'text-gray-400 hover:bg-brand-border/40 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* User profile & exit */}
        <div className="p-4 border-t border-brand-border space-y-3">
          {/* Quick link to PDV */}
          <Link
            to="/pdv"
            className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-500/10"
          >
            <ShoppingBag size={16} />
            <span>Frente de Caixa (PDV)</span>
          </Link>

          <div className="flex items-center justify-between p-2 rounded-xl bg-brand-border/20">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-brand-border flex items-center justify-center text-gray-300">
                <User size={18} />
              </div>
              <div className="truncate w-28">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-brand-accent uppercase tracking-wider font-semibold">{user.role}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-brand-danger rounded-lg hover:bg-brand-danger/10 transition-colors"
              title="Sair do Sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-brand-dark">
        {/* Header bar */}
        <header className="h-16 border-b border-brand-border flex items-center justify-between px-8 bg-brand-card/50 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <span className="h-2 w-2 rounded-full bg-brand-success animate-pulse"></span>
            <span className="text-xs text-gray-400 font-medium">Terminal offline-first ativo</span>
          </div>
          <div className="text-sm font-semibold text-gray-300">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page children container */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
