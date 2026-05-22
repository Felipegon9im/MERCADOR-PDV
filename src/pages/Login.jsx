import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Lock, User, KeyRound, ShieldAlert } from 'lucide-react';

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
    // Focus password input
    document.getElementById('password')?.focus();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-brand-dark relative overflow-hidden select-none">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-pink-500/5 blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-lg p-8 z-10">
        {/* Logo header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-accent to-pink-500 flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-indigo-500/20 glow-indigo mb-4 animate-bounce">
            M
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">MercadoPDV</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Insira suas credenciais ou selecione um perfil</p>
        </div>

        {/* Login Glass Card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative">
          
          {/* Quick profiles selectors */}
          <div className="grid grid-cols-3 gap-3 mb-8">
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
                <span className="text-[11px] font-bold tracking-wide uppercase leading-tight">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-brand-border/40"></div>
            <span className="flex-shrink mx-4 text-gray-600 text-xs font-semibold uppercase">Ou digite suas credenciais</span>
            <div className="flex-grow border-t border-brand-border/40"></div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 mb-6 font-semibold animate-pulse">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
        </div>
      </div>
    </div>
  );
}
