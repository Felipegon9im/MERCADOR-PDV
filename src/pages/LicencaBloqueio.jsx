import React, { useState, useEffect } from 'react';
import { ShieldAlert, Copy, Check, Award, Lock, ExternalLink, QrCode, RefreshCw, CheckCircle2, User, Mail, FileText, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { validarLicencaLocal, salvarChaveLicenca, hmacSha256, SECRETO_LICENCA } from '../services/licenca';

export default function LicencaBloqueio({ currentLicenseStatus, machineId: passedMachineId }) {
  const [machineId, setMachineId] = useState(passedMachineId || '');
  const [chaveInput, setChaveInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(currentLicenseStatus?.motivo || '');
  const [loading, setLoading] = useState(false);

  // Asaas/PIX states
  const [activeTab, setActiveTab] = useState('pix'); // 'pix' ou 'manual'
  const [clientName, setClientName] = useState('');
  const [clientCpfCnpj, setClientCpfCnpj] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [pixQrCodeImage, setPixQrCodeImage] = useState('');
  const [pixPayload, setPixPayload] = useState('');
  const [activePaymentId, setActivePaymentId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

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

  // Polling para verificar o status do pagamento Pix
  useEffect(() => {
    let intervalId;
    if (activePaymentId) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.licenca.callAsaas('GET', `/payments/${activePaymentId}`);
          if (res.success && res.data) {
            const status = res.data.status;
            if (status === 'RECEIVED' || status === 'CONFIRMED') {
              clearInterval(intervalId);
              
              // Gerar licença local válida por 30 dias
              const expDate = new Date();
              expDate.setDate(expDate.getDate() + 30);
              const expDateStr = expDate.toISOString().split('T')[0];
              const message = `${machineId}|${expDateStr}`;
              const signature = hmacSha256(SECRETO_LICENCA, message);
              const licenseStr = btoa(`${machineId}|${expDateStr}|${signature}`);
              
              salvarChaveLicenca(licenseStr);
              setPaymentSuccess(true);
              setErrorMsg('');
              
              // Recarregar a tela após 3 segundos para liberar o PDV
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            }
          }
        } catch (err) {
          console.error("Erro ao consultar status da cobrança:", err);
        }
      }, 5000); // Consulta a cada 5 segundos
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activePaymentId, machineId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCpfCnpjChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 14);
    if (cleaned.length <= 11) {
      setClientCpfCnpj(cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
    } else {
      setClientCpfCnpj(cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"));
    }
  };

  const handleCancelPayment = () => {
    setActivePaymentId('');
    setPixQrCodeImage('');
    setPixPayload('');
    setErrorMsg('');
  };

  const handleGeneratePix = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientCpfCnpj.trim() || !clientEmail.trim()) {
      setErrorMsg('Por favor, preencha todos os campos do formulário.');
      return;
    }
    
    const cleanCpfCnpj = clientCpfCnpj.replace(/\D/g, '');
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      setErrorMsg('O CPF deve ter 11 dígitos e o CNPJ deve ter 14 dígitos.');
      return;
    }

    setIsGeneratingPix(true);
    setErrorMsg('');
    
    try {
      // 1. Criar Cliente no Asaas
      const customerRes = await api.licenca.callAsaas('POST', '/customers', {
        name: clientName.trim(),
        cpfCnpj: cleanCpfCnpj,
        email: clientEmail.trim()
      });

      if (!customerRes.success) {
        throw new Error(customerRes.error || 'Falha ao cadastrar cliente no Asaas.');
      }
      
      const customerId = customerRes.data.id;

      // 2. Criar Cobrança de PIX
      const today = new Date();
      today.setDate(today.getDate() + 1); // vencimento amanhã
      const dueDateStr = today.toISOString().split('T')[0];

      const paymentRes = await api.licenca.callAsaas('POST', '/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: 99.90,
        dueDate: dueDateStr,
        description: `Mensalidade MercadoPDV - ID Máquina: ${machineId}`,
        externalReference: machineId
      });

      if (!paymentRes.success) {
        throw new Error(paymentRes.error || 'Falha ao gerar cobrança no Asaas.');
      }

      const paymentId = paymentRes.data.id;

      // 3. Obter QR Code e Pix Copia e Cola
      const qrRes = await api.licenca.callAsaas('GET', `/payments/${paymentId}/pixQrCode`);

      if (!qrRes.success) {
        throw new Error(qrRes.error || 'Falha ao gerar QR Code do Pix.');
      }

      setPixQrCodeImage(qrRes.data.encodedImage);
      setPixPayload(qrRes.data.payload);
      setActivePaymentId(paymentId);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro de conexão com o gateway Asaas.');
    } finally {
      setIsGeneratingPix(false);
    }
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

          {/* Abas para alternar o método de ativação */}
          {!paymentSuccess && !pixQrCodeImage && (
            <div className="flex border-b border-brand-border/40 mb-6">
              <button
                onClick={() => { setActiveTab('pix'); setErrorMsg(''); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'pix'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                Ativação PIX (Automático)
              </button>
              <button
                onClick={() => { setActiveTab('manual'); setErrorMsg(''); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'manual'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                Chave Manual (Suporte)
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 mb-6 font-semibold animate-pulse">
              {errorMsg}
            </div>
          )}

          {paymentSuccess ? (
            /* Tela de sucesso ao aprovar pagamento */
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="h-16 w-16 bg-brand-success/10 text-brand-success border border-brand-success/20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-white">Pagamento Confirmado!</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Sua licença de assinatura de 30 dias foi ativada com sucesso no hardware desta máquina. Reiniciando o sistema...
              </p>
            </div>
          ) : pixQrCodeImage ? (
            /* QR Code do Pix gerado e aguardando pagamento */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold uppercase text-brand-accent tracking-wider flex items-center justify-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-brand-accent animate-ping"></span>
                  <span>Aguardando Pagamento PIX</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Escaneie o código abaixo com o app do seu banco para ativar a licença por mais 30 dias.
                </p>
              </div>

              {/* QR Code Image */}
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${pixQrCodeImage}`} 
                  alt="QR Code Pix"
                  className="w-48 h-48 rounded-2xl border border-brand-border bg-white p-2 shadow-lg shadow-indigo-500/5"
                />
              </div>

              {/* Pix Copia e Cola */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pix Copia e Cola</label>
                <div className="flex items-center justify-between bg-brand-dark border border-brand-border rounded-xl p-3">
                  <span className="font-mono text-[10px] text-gray-400 truncate pr-4 select-all">
                    {pixPayload}
                  </span>
                  <button
                    onClick={handleCopyPix}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20 text-xs font-bold text-brand-accent transition-colors shrink-0"
                    type="button"
                  >
                    {copiedPix ? (
                      <>
                        <Check size={14} className="text-brand-success" />
                        <span className="text-brand-success text-[10px]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="text-[10px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Polling Spinner */}
              <div className="flex items-center justify-center space-x-2.5 text-xs text-gray-500 font-semibold py-2">
                <RefreshCw size={14} className="animate-spin text-brand-accent" />
                <span>Buscando confirmação do Pix automaticamente...</span>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelPayment}
                className="w-full py-3 rounded-xl border border-brand-border text-gray-400 hover:text-white hover:border-gray-500 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
                type="button"
              >
                <ArrowLeft size={14} />
                <span>Voltar / Alterar Dados</span>
              </button>
            </div>
          ) : activeTab === 'pix' ? (
            /* Formulário de faturamento PIX */
            <form onSubmit={handleGeneratePix} className="space-y-5">
              <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 text-xs text-gray-400 space-y-1.5">
                <p className="font-bold text-white flex items-center space-x-1">
                  <span>⚡ Ativação Automática Imediata</span>
                </p>
                <p>
                  O valor da mensalidade é de <strong className="text-brand-success">R$ 99,90</strong>. Após o pagamento via PIX, sua máquina será liberada automaticamente em até 1 minuto.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome Completo / Razão Social</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPF ou CNPJ</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                        <FileText size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Somente números"
                        value={clientCpfCnpj}
                        onChange={(e) => handleCpfCnpjChange(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">E-mail</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        placeholder="Ex: joao@email.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGeneratingPix}
                className="w-full bg-brand-accent hover:bg-brand-accentHover text-white py-3.5 rounded-xl font-bold text-sm tracking-wide transition-colors shadow-lg shadow-indigo-500/20 glow-indigo flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPix ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Gerando PIX Cobrança...</span>
                  </>
                ) : (
                  <>
                    <QrCode size={16} />
                    <span>Gerar PIX para Ativação (R$ 99,90)</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Aba de Ativação Manual (Chave fornecida pelo suporte) */
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
          )}

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
