import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Lock, User, KeyRound, ShieldAlert, Phone, Building2, CreditCard, WifiOff, Layers, BarChart3, ShoppingBag } from 'lucide-react';
import { loginBg } from '../assets/login_bg_premium';

const profiles = [
  { username: 'admin', label: 'Administrador', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10' },
  { username: 'gerente', label: 'Gerente', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' },
  { username: 'caixa', label: 'Operador Caixa', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' }
];

const systemFeatures = [
  {
    icon: <WifiOff size={16} />,
    title: 'Operação Offline',
    desc: 'Venda sem interrupções. Toda a base de dados é salva localmente e funciona sem internet.'
  },
  {
    icon: <ShoppingBag size={16} />,
    title: 'PDV Agilizado',
    desc: 'Vendas rápidas com leitor de código de barras, balança acoplada e atalhos de teclado.'
  },
  {
    icon: <Layers size={16} />,
    title: 'Estoque Integrado',
    desc: 'Controle em tempo real de entradas, saídas, grade de produtos e alertas de estoque crítico.'
  },
  {
    icon: <BarChart3 size={16} />,
    title: 'Fluxo & Fechamento',
    desc: 'Relatórios diários, controle de sangria/suprimento e fechamento de caixa cego por operador.'
  }
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
      className="min-h-screen w-screen flex flex-col items-center justify-between py-8 px-6 bg-brand-dark bg-cover bg-center relative select-none overflow-y-auto"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-brand-dark/65 backdrop-blur-[4px] pointer-events-none"></div>

      {/* Spacer / Flex helper */}
      <div className="hidden lg:block h-4"></div>

      {/* Main glassmorphism card */}
      <div className="w-full max-w-md relative z-10 p-4 my-auto">
        
        {/* Brand header */}
        <div className="flex flex-col items-center justify-center mb-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
            PDV
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white glow-text">MERCADOPDV</h1>
          <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mt-1">Inovação Comercial & Gestão</p>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative bg-brand-card/40 backdrop-blur-md">
          
          {/* Quick profiles selectors */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {profiles.map(p => (
              <button
                key={p.username}
                type="button"
                onClick={() => handleProfileSelect(p.username)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${p.color}`}
              >
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                  <User size={16} />
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase leading-tight">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-wider">Credenciais</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 mb-6 font-semibold animate-pulse">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuário</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  id="username"
                  type="text"
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-brand-dark/80 border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-white placeholder-gray-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Sua senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-dark/80 border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-white placeholder-gray-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-accent hover:bg-brand-accentHover text-white py-3.5 rounded-xl font-bold text-sm tracking-wide transition-colors shadow-lg shadow-indigo-500/20 glow-indigo flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <KeyRound size={16} />
              <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>

          {/* Test License Button */}
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                localStorage.removeItem('MERCADOPDV_LICENSE');
                window.location.reload();
              }}
              className="text-[10px] text-gray-500 hover:text-brand-danger transition-colors font-bold uppercase tracking-wider underline cursor-pointer"
              type="button"
            >
              Excluir Licença (Testar PIX)
            </button>
          </div>
        </div>

        {/* Brand Footer Info */}
        <div className="mt-5 text-center text-[10px] text-gray-500 space-y-1.5 bg-brand-dark/30 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
          <div className="flex justify-center items-center space-x-2 text-gray-400 font-bold uppercase tracking-wider">
            <span>Desenvolvido por: G&G Tecnologia</span>
            <span>•</span>
            <span>CNPJ: 00.000.000/0001-00</span>
          </div>
          <div className="flex justify-center items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Phone size={10} className="text-brand-accent" />
              <span className="font-semibold text-gray-400">Suporte: (81) 99999-9999</span>
            </span>
            <span>|</span>
            <span className="flex items-center space-x-1 text-brand-success font-bold">
              <CreditCard size={10} />
              <span>Mensalidade: R$ 99,90</span>
            </span>
          </div>
        </div>
      </div>

      {/* System Features list at the bottom of the page */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 mt-6 lg:mt-2">
        {systemFeatures.map((f, idx) => (
          <div key={idx} className="glass-panel p-4 rounded-2xl border border-white/5 bg-brand-card/20 backdrop-blur-md flex items-start space-x-3 hover:scale-102 hover:border-brand-accent/20 transition-all duration-300">
            <div className="p-2 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent shrink-0">
              {f.icon}
            </div>
            <div>
              <h3 className="text-[10.5px] font-bold text-white uppercase tracking-wider">{f.title}</h3>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
