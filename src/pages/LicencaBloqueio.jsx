import React, { useState, useEffect } from 'react';
import { ShieldAlert, Copy, Check, Award, Lock, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { validarLicencaLocal, salvarChaveLicenca } from '../services/licenca';

export default function LicencaBloqueio({ currentLicenseStatus, machineId: passedMachineId }) {
  const [machineId, setMachineId] = useState(passedMachineId || '');
  const [chaveInput, setChaveInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(currentLicenseStatus?.motivo || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!machineId) {
      setLoading(true);
      api.licenca.getMachineId()
        .then(id => {
          setMachineId(id);
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao obter Machine ID:", err);
          setMachineId("MERCADOPDV-UNKNOWN-HWID");
          setLoading(false);
        });
    }
  }, [machineId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = (e) => {
    e.preventDefault();
    if (!chaveInput.trim()) {
      setErrorMsg('Por favor, cole um código de licença.');
      return;
    }

    const resultado = validarLicencaLocal(chaveInput.trim(), machineId);
    if (resultado.valida) {
      salvarChaveLicenca(chaveInput.trim());
      setErrorMsg('');
      // Show success micro-animation or just reload to start the app
      window.location.reload();
    } else {
      setErrorMsg(resultado.motivo);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-dark text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-accent mb-4"></div>
        <p className="text-sm text-gray-400 font-semibold tracking-wide">Autenticando hardware da máquina...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-brand-dark relative overflow-hidden select-none">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-danger/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent/5 blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-xl p-6 z-10">
        {/* Logo header */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-danger to-brand-accent flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-red-500/10 glow-red mb-4">
            <Lock size={28} className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">MercadoPDV</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Controle de Ativação e Licenciamento Comercial</p>
        </div>

        {/* Lock Glass Card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative">
          
          <div className="flex items-center space-x-3 text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-2xl p-4 mb-6">
            <ShieldAlert size={24} className="shrink-0 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider">Acesso Bloqueado</h4>
              <p className="text-xs font-medium text-red-300 mt-0.5">
                {currentLicenseStatus?.expiraEm 
                  ? `Sua assinatura expirou em ${currentLicenseStatus.expiraEm.split('-').reverse().join('/')}.` 
                  : 'Nenhuma chave de licença ativa foi encontrada neste dispositivo.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Machine ID container */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificador Único desta Máquina (ID de Hardware)</label>
              <div className="flex items-center justify-between bg-brand-dark border border-brand-border/60 hover:border-brand-border rounded-xl p-4 transition-all duration-200">
                <span className="font-mono text-xs text-indigo-300 font-bold tracking-wider select-text truncate pr-4">
                  {machineId}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors shrink-0"
                  type="button"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-brand-success" />
                      <span className="text-brand-success text-[11px]">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="text-[11px]">Copiar ID</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 font-semibold italic">
                * Envie este ID ao suporte para gerar uma nova licença válida de mensalidade.
              </p>
            </div>

            {errorMsg && !copied && (
              <div className="text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 font-semibold animate-pulse">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              {/* License Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inserir Chave de Licença</label>
                <textarea
                  placeholder="Cole aqui a chave de ativação enviada pelo suporte..."
                  value={chaveInput}
                  onChange={(e) => setChaveInput(e.target.value)}
                  className="w-full h-24 bg-brand-dark border border-brand-border/80 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-mono text-white placeholder-gray-600 outline-none transition-colors resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-brand-accent hover:bg-brand-accentHover text-white py-3.5 rounded-xl font-bold text-sm tracking-wide transition-colors shadow-lg shadow-indigo-500/20 glow-indigo flex items-center justify-center space-x-2"
              >
                <Award size={16} />
                <span>Ativar MercadoPDV</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-border/40 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-600">
            <span>Suporte Comercial</span>
            <a 
              href="https://wa.me/5581999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-brand-accent transition-colors"
            >
              <span>Falar no WhatsApp</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
