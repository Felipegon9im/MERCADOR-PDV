import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Lock, User, KeyRound, ShieldAlert, Phone, Building2, CreditCard, HelpCircle } from 'lucide-react';

const profiles = [
  { username: 'admin', label: 'Administrador', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10' },
  { username: 'gerente', label: 'Gerente', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' },
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
    <div className="h-screen w-screen flex bg-brand-dark relative overflow-hidden select-none">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-danger/5 blur-[150px] pointer-events-none"></div>

      {/* LEFT COLUMN: G&G Tecnologia Info Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-brand-border/40 relative z-10 bg-brand-dark/40 backdrop-blur-sm">
        {/* Brand header */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/10">
            G
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">G&G Tecnologia</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Inovação Comercial</p>
          </div>
        </div>

        {/* SVG Flow illustration / Info */}
        <div className="space-y-8 my-auto">
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-white leading-tight">Gestão Inteligente de Caixa</h2>
            <p className="text-sm text-gray-400 max-w-md">
              Controle de vendas, estoque integrado, fluxo de movimentação diária e fechamento cego de caixa 100% offline.
            </p>
          </div>

          {/* SVG Cash Flow Graphic */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-brand-card/30">
            <svg className="w-full h-48 text-indigo-500/20" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Grid lines */}
              <line x1="30" y1="160" x2="370" y2="160" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
              <line x1="30" y1="120" x2="370" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30" y1="80" x2="370" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30" y1="40" x2="370" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Chart Line with Gradients */}
              <path 
                d="M 30 140 C 90 120, 120 70, 180 85 C 240 100, 270 40, 320 45 L 370 20" 
                stroke="url(#paint0_linear_chart)" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />
              
              {/* Chart area fill */}
              <path 
                d="M 30 140 C 90 120, 120 70, 180 85 C 240 100, 270 40, 320 45 L 370 20 L 370 160 L 30 160 Z" 
                fill="url(#paint1_linear_chart_fill)" 
              />

              {/* Glowing Data Point */}
              <circle cx="180" cy="85" r="5" fill="#6366F1" className="animate-pulse" />
              <circle cx="320" cy="45" r="5" fill="#10B981" />
              <circle cx="370" cy="20" r="6" fill="#EF4444" />

              {/* Legend labels */}
              <text x="30" y="180" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif" fontWeight="600">SEG</text>
              <text x="110" y="180" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif" fontWeight="600">TER</text>
              <text x="190" y="180" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif" fontWeight="600">QUA</text>
              <text x="270" y="180" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif" fontWeight="600">QUI</text>
              <text x="350" y="180" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif" fontWeight="600">SEX</text>

              {/* Floating register overlay box */}
              <g transform="translate(130, 25)" className="animate-pulse">
                <rect width="32" height="22" rx="5" fill="rgba(99, 102, 241, 0.1)" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
                <line x1="6" y1="12" x2="26" y2="12" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
                <circle cx="16" cy="17" r="2" fill="rgba(99, 102, 241, 0.6)" />
              </g>

              {/* Definitions */}
              <defs>
                <linearGradient id="paint0_linear_chart" x1="30" y1="20" x2="370" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366F1" />
                  <stop offset="0.5" stopColor="#EC4899" />
                  <stop offset="1" stopColor="#10B981" />
                </linearGradient>
                <linearGradient id="paint1_linear_chart_fill" x1="200" y1="20" x2="200" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(99, 102, 241, 0.08)" />
                  <stop offset="1" stopColor="rgba(99, 102, 241, 0)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Support & Billing Details Footer */}
        <div className="grid grid-cols-2 gap-6 text-xs border-t border-brand-border/40 pt-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Phone size={12} className="text-brand-accent" />
              <span>Suporte Técnico</span>
            </span>
            <p className="text-gray-300 font-bold">(81) 99999-9999</p>
            <p className="text-gray-500 text-[10px] font-semibold">Segunda a Sábado — 8h às 18h</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 size={12} className="text-brand-accent" />
              <span>G&G Tecnologia</span>
            </span>
            <p className="text-gray-300 font-semibold text-[11px]">CNPJ: 00.000.000/0001-00</p>
            <p className="text-brand-success font-bold text-[11px] flex items-center space-x-1">
              <CreditCard size={11} />
              <span>PIX Mensalidade: R$ 99,90</span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Login Card Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 relative">
        <div className="w-full max-w-md">
          {/* Logo header (only visible on small screens since left panel is hidden) */}
          <div className="flex flex-col items-center justify-center mb-6 text-center lg:hidden">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/10 mb-2">
              G
            </div>
            <h2 className="text-xl font-extrabold text-white">G&G Tecnologia</h2>
            <p className="text-xs text-gray-400 mt-0.5">MercadoPDV — Solução Comercial</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">Entrar no Sistema</h2>
            <p className="text-xs text-gray-400 font-semibold mt-1">Selecione um perfil ou digite suas credenciais</p>
          </div>

          {/* Login Glass Card */}
          <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative">
            
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
              <div className="flex-grow border-t border-brand-border/40"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Credenciais de Acesso</span>
              <div className="flex-grow border-t border-brand-border/40"></div>
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
                    className="w-full bg-brand-dark border border-brand-border/80 focus:border-brand-accent rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-white placeholder-gray-600 outline-none transition-colors"
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
                    className="w-full bg-brand-dark border border-brand-border/80 focus:border-brand-accent rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-white placeholder-gray-600 outline-none transition-colors"
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

            {/* Offline notice */}
            <p className="text-[10px] text-center text-gray-600 font-semibold uppercase mt-6 tracking-widest">
              Acesso local criptografado e 100% offline
            </p>

            {/* Botão de Teste de Licença */}
            <div className="mt-4 text-center">
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
        </div>
      </div>
    </div>
  );
}
