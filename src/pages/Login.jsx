import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Lock, User, KeyRound, ShieldAlert, Phone, CreditCard, WifiOff, Layers, BarChart3, ShoppingBag } from 'lucide-react';
import { loginBg } from '../assets/login_bg_premium';

const profiles = [
  { username: 'admin', label: 'Administrador', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10' },
  { username: 'gerente', label: 'Gerente', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-indigo-500/10' },
  { username: 'caixa', label: 'Operador Caixa', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' }
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    const success = await login(username, password);
    if (success) {
      const user = useAuthStore.getState().user;
      if (user.role === 'operador') {
        navigate('/pdv');
      } else {
        navigate('/admin');
      }
    }
  };

  const handleProfileSelect = (user) => {
    setUsername(user);
    document.getElementById('password')?.focus();
  };

  return (
    <div 
      className="h-screen w-screen flex flex-col lg:flex-row bg-brand-dark bg-cover bg-center relative select-none overflow-hidden"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Backdrop blur overlay (lighter blur on the right side to let isometric art shine) */}
      <div className="absolute inset-0 bg-brand-dark/25 pointer-events-none z-0"></div>

      {/* Left Sidebar Panel */}
      <div className="w-full lg:w-[460px] h-full flex flex-col justify-between p-8 bg-brand-dark/65 backdrop-blur-xl border-r border-white/10 relative z-20 overflow-y-auto shrink-0 shadow-2xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-6">
          <div className="flex items-center space-x-3 justify-center lg:justify-start">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-black text-white text-md shadow-lg shadow-indigo-500/20">
              PDV
            </div>
            <span className="text-2xl font-black tracking-tight text-white glow-text">MERCADOPDV</span>
          </div>
          <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mt-1">Inovação Comercial & Gestão</p>
        </div>

        {/* Login Form Panel (Glassmorphic integrated) */}
        <div className="my-auto py-4">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
            
            {/* Quick profiles selectors */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {profiles.map(p => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleProfileSelect(p.username)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 ${p.color}`}
                >
                  <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-1.5">
                    <User size={14} />
                  </div>
                  <span className="text-[9px] font-bold tracking-wide uppercase leading-tight">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="relative flex py-2 items-center mb-5">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-gray-500 text-[9px] font-bold uppercase tracking-wider">Credenciais</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 mb-5 font-semibold animate-pulse">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usuário</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
                    <User size={14} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    placeholder="Nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-brand-dark/80 border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-white placeholder-gray-600 outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    placeholder="Sua senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-dark/80 border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-white placeholder-gray-600 outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-accent hover:bg-brand-accentHover text-white py-3 rounded-xl font-bold text-xs tracking-wide transition-colors shadow-lg shadow-indigo-500/20 glow-indigo flex items-center justify-center space-x-2 disabled:opacity-50 mt-1"
              >
                <KeyRound size={14} />
                <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              </button>
            </form>

            {/* Test License Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  localStorage.removeItem('MERCADOPDV_LICENSE');
                  window.location.reload();
                }}
                className="text-[9px] text-gray-500 hover:text-brand-danger transition-colors font-bold uppercase tracking-wider underline cursor-pointer"
                type="button"
              >
                Excluir Licença (Testar PIX)
              </button>
            </div>
          </div>
        </div>

        {/* Resources Grid & G&G WhatsApp Footer */}
        <div className="mt-auto space-y-4 border-t border-white/10 pt-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recursos do Sistema</h3>
          
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1 text-xs text-white font-semibold">
                <WifiOff size={12} className="text-brand-accent" />
                <span className="text-[10.5px]">100% Offline</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug">Vendas garantidas sem internet.</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1 text-xs text-white font-semibold">
                <ShoppingBag size={12} className="text-brand-accent" />
                <span className="text-[10.5px]">PDV Agilizado</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug">Leitor de barras e atalhos rápidos.</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1 text-xs text-white font-semibold">
                <Layers size={12} className="text-brand-accent" />
                <span className="text-[10.5px]">Estoque Real</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug">Entradas e saídas em tempo real.</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1 text-xs text-white font-semibold">
                <BarChart3 size={12} className="text-brand-accent" />
                <span className="text-[10.5px]">Caixa & Fluxo</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug">Sangrias, suprimentos e relatórios.</p>
            </div>
          </div>
          
          {/* Support and Company branding */}
          <div className="border-t border-white/5 pt-3.5 flex flex-col space-y-2 text-[9px] text-gray-500">
            <div className="flex justify-between items-center text-gray-400">
              <span className="font-bold">Desenvolvido por: G&G Tecnologia</span>
              <span>CNPJ: 00.000.000/0001-00</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <a 
                href="https://wa.me/5548988628030" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold transition-all text-[9.5px] hover:scale-[1.02]"
              >
                <span>WhatsApp: (48) 98862-8030</span>
              </a>
              <div className="flex items-center space-x-1 px-2.5 py-2 rounded-lg bg-brand-success/10 border border-brand-success/20 text-brand-success font-bold text-[9.5px]">
                <CreditCard size={10} />
                <span>R$ 99,90/mês</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="flex-1 h-full hidden lg:block relative z-10 pointer-events-none"></div>
    </div>
  );
}
