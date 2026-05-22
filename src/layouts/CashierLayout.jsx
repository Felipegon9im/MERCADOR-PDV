import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { LogOut, Home, Monitor, Clock, ShieldCheck } from 'lucide-react';

export default function CashierLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-brand-dark flex flex-col overflow-hidden text-gray-200">
      {/* Top Navbar */}
      <header className="h-14 border-b border-brand-border bg-brand-card px-6 flex items-center justify-between select-none shrink-0 z-10">
        {/* Left Brand info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-bold text-white shadow-md glow-indigo text-xs">
              M
            </div>
            <span className="font-extrabold text-sm tracking-wide text-white">MercadoPDV</span>
          </div>
          <div className="h-4 w-px bg-brand-border"></div>
          <div className="flex items-center space-x-2 bg-brand-dark px-2.5 py-1 rounded-lg border border-brand-border/40">
            <Monitor size={12} className="text-brand-accent" />
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Caixa Livre</span>
          </div>
        </div>

        {/* Center Clock / Quick stats */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400">
          <Clock size={14} className="text-brand-accent" />
          <span>{time.toLocaleTimeString('pt-BR')}</span>
          <span className="text-gray-600 px-1">•</span>
          <span>{time.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>

        {/* Right Session options */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-none">{user.name}</p>
              <span className="text-[9px] font-bold text-brand-success uppercase tracking-wider">{user.role}</span>
            </div>
            <div className="h-7 w-7 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
          </div>

          <div className="h-4 w-px bg-brand-border"></div>

          {/* Go to Admin retaguarda (if admin or gerente) */}
          {(user.role === 'admin' || user.role === 'gerente') && (
            <Link
              to="/admin"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white transition-colors text-xs font-semibold"
              title="Voltar para Administração"
            >
              <Home size={14} />
              <span>Retaguarda</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger transition-colors text-xs font-semibold border border-brand-danger/20"
            title="Fechar Caixa / Sair"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main operational area */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
