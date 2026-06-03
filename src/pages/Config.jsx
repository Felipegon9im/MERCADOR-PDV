import React, { useState, useEffect } from 'react';
import { Settings, QrCode, Save, Building2, MapPin, Percent, CheckCircle2, Printer, ShieldAlert, FolderHeart, Scale, Award, Lock, ShieldCheck, Copy, Check, Upload, Trash2, Image } from 'lucide-react';
import useLicenseStore from '../store/useLicenseStore';
import { validarLicencaLocal, salvarChaveLicenca } from '../services/licenca';

export default function Config() {
  const { licenseStatus, verificarLicenca, machineId } = useLicenseStore();
  const [chaveInput, setChaveInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [licErrorMsg, setLicErrorMsg] = useState('');
  const [licSuccessMsg, setLicSuccessMsg] = useState('');

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivateLicense = (e) => {
    e.preventDefault();
    if (!chaveInput.trim()) {
      setLicErrorMsg('Por favor, cole uma chave de licença.');
      setLicSuccessMsg('');
      return;
    }

    const resultado = validarLicencaLocal(chaveInput.trim(), machineId);
    if (resultado.valida) {
      salvarChaveLicenca(chaveInput.trim());
      setLicErrorMsg('');
      setLicSuccessMsg('Licença ativada e renovada com sucesso!');
      setChaveInput('');
      verificarLicenca(); // Atualiza a store global
      setTimeout(() => setLicSuccessMsg(''), 5000);
    } else {
      setLicErrorMsg(resultado.motivo);
      setLicSuccessMsg('');
    }
  };
  const [settings, setSettings] = useState({
    chavePix: '',
    beneficiario: '',
    cidade: '',
    margemLucroPadrao: '30',
    larguraPapel: '80mm',
    cabecalhoNome: '',
    cabecalhoTelefone: '',
    cabecalhoEndereco: '',
    rodapeMensagem: '',
    logoBase64: '',
    backupFolder: '',
    backupAoFechar: false,
    balancaAtiva: false,
    balancaPorta: 'SIMULACAO',
    balancaProtocolo: 'Toledo',
    balancaPesoSimulado: '1.500',
    taxaMaquinaCredito: '0',
    repassarTaxaCredito: false
  });
  const [showToast, setShowToast] = useState(false);
  const [tipoConexao, setTipoConexao] = useState('SIMULACAO');

  useEffect(() => {
    const saved = localStorage.getItem('pdv_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const porta = parsed.balancaPorta || 'SIMULACAO';
        let conexao = 'SIMULACAO';
        if (porta.startsWith('COM')) {
          conexao = 'SERIAL';
        } else if (porta !== 'SIMULACAO' && (porta.includes('.') || porta.includes(':') || porta.toLowerCase().startsWith('tcp:'))) {
          conexao = 'REDE';
        }
        setTipoConexao(conexao);

        setSettings({
          chavePix: parsed.chavePix || '',
          beneficiario: parsed.beneficiario || '',
          cidade: parsed.cidade || '',
          margemLucroPadrao: parsed.margemLucroPadrao || '30',
          larguraPapel: parsed.larguraPapel || '80mm',
          cabecalhoNome: parsed.cabecalhoNome || '',
          cabecalhoTelefone: parsed.cabecalhoTelefone || '',
          cabecalhoEndereco: parsed.cabecalhoEndereco || '',
          rodapeMensagem: parsed.rodapeMensagem || '',
          logoBase64: parsed.logoBase64 || '',
          backupFolder: parsed.backupFolder || '',
          backupAoFechar: parsed.backupAoFechar || false,
          balancaAtiva: parsed.balancaAtiva !== undefined ? parsed.balancaAtiva : false,
          balancaPorta: parsed.balancaPorta || 'SIMULACAO',
          balancaProtocolo: parsed.balancaProtocolo || 'Toledo',
          balancaPesoSimulado: parsed.balancaPesoSimulado !== undefined ? parsed.balancaPesoSimulado : '1.500',
          taxaMaquinaCredito: parsed.taxaMaquinaCredito !== undefined ? parsed.taxaMaquinaCredito : '0',
          repassarTaxaCredito: parsed.repassarTaxaCredito !== undefined ? parsed.repassarTaxaCredito : false
        });
      } catch (e) {
        console.error("Erro ao carregar configurações", e);
      }
    }
  }, []);

  const handleTipoConexaoChange = (tipo) => {
    setTipoConexao(tipo);
    if (tipo === 'SIMULACAO') {
      setSettings(prev => ({ ...prev, balancaPorta: 'SIMULACAO' }));
    } else if (tipo === 'SERIAL') {
      const defaultPort = settings.balancaPorta.startsWith('COM') ? settings.balancaPorta : 'COM1';
      setSettings(prev => ({ ...prev, balancaPorta: defaultPort }));
    } else if (tipo === 'REDE') {
      const hasNetFormat = settings.balancaPorta && (settings.balancaPorta.includes('.') || settings.balancaPorta.includes(':'));
      const defaultIp = hasNetFormat && settings.balancaPorta !== 'SIMULACAO' && !settings.balancaPorta.startsWith('COM')
        ? settings.balancaPorta
        : '192.168.1.250:1001';
      setSettings(prev => ({ ...prev, balancaPorta: defaultIp }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("A imagem é muito grande. Por favor, selecione uma imagem menor que 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, logoBase64: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logoBase64: '' }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('pdv_settings', JSON.stringify(settings));
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 select-none max-w-4xl pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 flex items-center space-x-2 bg-brand-success text-white py-3 px-5 rounded-2xl shadow-lg border border-emerald-400/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
            <Settings className="text-brand-accent h-7 w-7" />
            <span>Configurações do Sistema</span>
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Gerencie chaves de pagamento, cabeçalhos de cupom, margens de lucro e automações</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* PIX Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <QrCode className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Configuração de Pagamento PIX</h3>
              <p className="text-xs text-gray-500 font-semibold">Gere QR Codes estáticos dinamicamente nas vendas no caixa</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PIX Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Chave PIX</label>
              <input
                required
                type="text"
                placeholder="CNPJ, CPF, Email ou Celular"
                value={settings.chavePix}
                onChange={(e) => setSettings({ ...settings, chavePix: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Chave para receber os pagamentos.</p>
            </div>

            {/* Beneficiário Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center space-x-1.5">
                <Building2 size={12} className="text-gray-500" />
                <span>Nome do Beneficiário</span>
              </label>
              <input
                required
                type="text"
                placeholder="Ex: MERCADO DA ESQUINA"
                maxLength={25}
                value={settings.beneficiario}
                onChange={(e) => setSettings({ ...settings, beneficiario: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Nome do titular da conta (máx 25 carac.).</p>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center space-x-1.5">
                <MapPin size={12} className="text-gray-500" />
                <span>Cidade do Beneficiário</span>
              </label>
              <input
                required
                type="text"
                placeholder="Ex: SAO PAULO"
                maxLength={15}
                value={settings.cidade}
                onChange={(e) => setSettings({ ...settings, cidade: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Cidade da conta (máx 15 carac.).</p>
            </div>
          </div>
        </div>

        {/* Impressão Térmica Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <Printer className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Impressão do Cupom Não Fiscal</h3>
              <p className="text-xs text-gray-500 font-semibold">Defina o tamanho do papel e os dados impressos no cabeçalho/rodapé</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Largura da Bobina */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Largura do Papel (Bobina)</label>
              <select
                value={settings.larguraPapel}
                onChange={(e) => setSettings({ ...settings, larguraPapel: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none transition-all"
              >
                <option value="80mm">80mm (Padrão Largo)</option>
                <option value="58mm">58mm (Padrão Estreito)</option>
              </select>
              <p className="text-[10px] text-gray-500 font-medium">Otimiza o espaçamento do texto do cupom.</p>
            </div>

            {/* Cabeçalho Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Nome do Estabelecimento</label>
              <input
                type="text"
                placeholder="Ex: MERCADO DA ESQUINA"
                value={settings.cabecalhoNome}
                onChange={(e) => setSettings({ ...settings, cabecalhoNome: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all"
              />
              <p className="text-[10px] text-gray-500 font-medium">Deixe em branco para usar o padrão.</p>
            </div>

            {/* Cabeçalho Telefone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Telefone de Contato</label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-9999"
                value={settings.cabecalhoTelefone}
                onChange={(e) => setSettings({ ...settings, cabecalhoTelefone: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Endereço */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Endereço Completo</label>
              <input
                type="text"
                placeholder="Ex: Rua das Flores, 123 - Centro"
                value={settings.cabecalhoEndereco}
                onChange={(e) => setSettings({ ...settings, cabecalhoEndereco: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all"
              />
            </div>

            {/* Rodapé Mensagem */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Mensagem de Rodapé</label>
              <input
                type="text"
                placeholder="Ex: Obrigado pela preferência, volte sempre!"
                value={settings.rodapeMensagem}
                onChange={(e) => setSettings({ ...settings, rodapeMensagem: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Logotipo da Empresa */}
          <div className="space-y-2 pt-4 border-t border-brand-border/40 mt-4">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center space-x-1.5">
              <Image size={12} className="text-gray-500" />
              <span>Logotipo da Empresa (Cupom Térmico)</span>
            </label>
            <div className="flex items-center space-x-4 bg-brand-dark/50 p-4 rounded-2xl border border-brand-border/40">
              {settings.logoBase64 ? (
                <div className="relative group shrink-0">
                  <img 
                    src={settings.logoBase64} 
                    alt="Logo Preview" 
                    className="h-16 w-32 object-contain bg-white rounded-xl p-1 border border-brand-border"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-brand-danger text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md flex items-center justify-center"
                    title="Remover logotipo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-32 border border-dashed border-brand-border rounded-xl flex items-center justify-center text-gray-600 shrink-0">
                  <Image size={24} />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer bg-brand-border/60 hover:bg-brand-border hover:text-white text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-brand-border/40 transition-all flex items-center space-x-1.5">
                    <Upload size={12} />
                    <span>Selecionar Imagem</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">Recomendado: imagem horizontal com fundo branco ou transparente, formato PNG/JPG (máx. 1MB).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balança de Checkout Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <Scale className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Balança de Checkout & Integração Wi-Fi</h3>
              <p className="text-xs text-gray-500 font-semibold">Integre balanças seriais (COM/USB) ou balanças de rede sem fio (Wi-Fi/Ethernet TCP) na Frente de Caixa</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Ativar Balança */}
            <div className="space-y-1.5 flex flex-col justify-end pb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="balancaAtiva"
                  checked={settings.balancaAtiva}
                  onChange={(e) => setSettings({ ...settings, balancaAtiva: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-border bg-brand-dark text-brand-accent focus:ring-brand-accent focus:ring-opacity-25"
                />
                <label htmlFor="balancaAtiva" className="text-xs font-bold text-gray-300 uppercase cursor-pointer select-none">
                  Ativar Balança
                </label>
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Habilita leitura de peso no PDV.</p>
            </div>

            {/* Tipo de Conexão */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Conexão</label>
              <select
                disabled={!settings.balancaAtiva}
                value={tipoConexao}
                onChange={(e) => handleTipoConexaoChange(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none transition-all"
              >
                <option value="SIMULACAO">Simulação de Peso (Sem Cabo)</option>
                <option value="SERIAL">Cabo Serial Físico (Porta COM)</option>
                <option value="REDE">Rede Sem Fio Wi-Fi / Ethernet (TCP/IP)</option>
              </select>
              <p className="text-[10px] text-gray-500 font-medium">Modo de comunicação da balança.</p>
            </div>

            {/* Porta COM ou IP/Porta */}
            {tipoConexao === 'SERIAL' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Porta COM (Serial)</label>
                <select
                  disabled={!settings.balancaAtiva}
                  value={settings.balancaPorta}
                  onChange={(e) => setSettings({ ...settings, balancaPorta: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none transition-all"
                >
                  <option value="COM1">Porta COM1</option>
                  <option value="COM2">Porta COM2</option>
                  <option value="COM3">Porta COM3</option>
                  <option value="COM4">Porta COM4</option>
                  <option value="COM5">Porta COM5</option>
                  <option value="COM6">Porta COM6</option>
                  <option value="COM7">Porta COM7</option>
                  <option value="COM8">Porta COM8</option>
                </select>
                <p className="text-[10px] text-gray-500 font-medium">Porta onde a balança serial está conectada.</p>
              </div>
            ) : tipoConexao === 'REDE' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Endereço IP e Porta (TCP/IP)</label>
                <input
                  disabled={!settings.balancaAtiva}
                  type="text"
                  placeholder="Ex: 192.168.1.250:1001"
                  value={settings.balancaPorta}
                  onChange={(e) => setSettings({ ...settings, balancaPorta: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
                />
                <p className="text-[10px] text-gray-500 font-medium">IP e Porta do conversor/balança Wi-Fi.</p>
              </div>
            ) : (
              <div className="space-y-1.5 opacity-40">
                <label className="text-xs font-bold text-gray-400 uppercase">Porta / Endereço</label>
                <input
                  disabled
                  type="text"
                  value="SIMULAÇÃO ATIVA"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-gray-500 outline-none cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-500 font-medium">Nenhuma conexão física necessária.</p>
              </div>
            )}

            {/* Protocolo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Protocolo (Checkout)</label>
              <select
                disabled={!settings.balancaAtiva}
                value={settings.balancaProtocolo}
                onChange={(e) => setSettings({ ...settings, balancaProtocolo: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none transition-all"
              >
                <option value="Toledo">Toledo (Prix 3 / Prisma)</option>
                <option value="Filizola">Filizola (BP / Platina)</option>
                <option value="Urano">Urano (POP / POP-S)</option>
              </select>
              <p className="text-[10px] text-gray-500 font-medium">Protocolo de pesagem de checkout.</p>
            </div>
          </div>

          {/* Peso Simulado e Guia Toledo */}
          {settings.balancaAtiva && tipoConexao === 'SIMULACAO' && (
            <div className="pt-2 max-w-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Peso Simulado (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.000"
                  max="30.000"
                  placeholder="Ex: 1.500"
                  value={settings.balancaPesoSimulado}
                  onChange={(e) => setSettings({ ...settings, balancaPesoSimulado: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
                />
                <p className="text-[10px] text-gray-500 font-medium">Para testes rápidos de venda sem balança física.</p>
              </div>
            </div>
          )}

          {/* Guia Avançado de Balanças Wi-Fi Toledo Prix (Cenários A & B) */}
          <div className="border-t border-brand-border/40 pt-6">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse" />
              <span>Guia de Integração Wi-Fi Toledo Prix (Cenários A & B)</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cenário A */}
              <div className="bg-brand-dark/30 border border-brand-border/20 rounded-2xl p-5 space-y-3 relative hover:border-brand-accent/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg">Cenário A</span>
                  <QrCode size={16} className="text-indigo-400" />
                </div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Balança de Etiquetas (Prix 4/5/6)</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                  A pesagem ocorre **fora do caixa** (ex: Padaria, Açougue). A balança gera uma etiqueta com código de barras EAN-13 iniciando com o dígito <strong className="text-indigo-300">2</strong> contendo o PLU e o peso ou valor total do item.
                </p>
                <div className="text-[10px] text-gray-500 font-semibold space-y-2.5 bg-brand-dark/40 p-4 rounded-xl border border-white/5">
                  <p className="text-white/80 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="h-1 w-1 bg-indigo-400 rounded-full" />
                    <span>Como configurar no MercadoPDV:</span>
                  </p>
                  <p>1. Cadastre o produto por peso (KG) usando como código de barras apenas o número do **PLU** (ex: se o PLU na balança for <strong className="text-indigo-300">5</strong> ou <strong className="text-indigo-300">000005</strong>, cadastre no sistema como <strong className="text-indigo-300">5</strong>).</p>
                  <p>2. Ao bipar a etiqueta impressa pela Prix no caixa, o sistema decodifica o peso/valor e lança o item automaticamente.</p>
                </div>
              </div>

              {/* Cenário B */}
              <div className="bg-brand-dark/30 border border-brand-border/20 rounded-2xl p-5 space-y-3 relative hover:border-brand-accent/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg">Cenário B</span>
                  <Scale size={16} className="text-emerald-400" />
                </div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Balança de Checkout (Prix 3 / Rede TCP)</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                  O produto é pesado **no próprio caixa**. Ao lançar o item KG no PDV, o sistema consulta a balança física em tempo real através da rede local Wi-Fi ou cabo TCP.
                </p>
                <div className="text-[10px] text-gray-500 font-semibold space-y-2.5 bg-brand-dark/40 p-4 rounded-xl border border-white/5">
                  <p className="text-white/80 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="h-1 w-1 bg-emerald-400 rounded-full" />
                    <span>Como configurar no MercadoPDV:</span>
                  </p>
                  <p>1. Marque <strong className="text-emerald-300">Ativar Balança</strong> acima.</p>
                  <p>2. Selecione <strong className="text-emerald-300">Rede Sem Fio Wi-Fi / Ethernet</strong> e insira o IP e Porta do conversor serial-rede da Prix (ex: <strong className="text-emerald-300">192.168.1.250:1001</strong>).</p>
                  <p>3. O sistema requisitará o peso automaticamente nos itens de balança no caixa.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PDV / Inventory Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <Percent className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Regras de Preços & Margens</h3>
              <p className="text-xs text-gray-500 font-semibold">Defina o comportamento operacional e regras automáticas de precificação</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Default Markup */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Margem de Lucro Padrão (%)</label>
              <input
                required
                type="number"
                min="0"
                max="1000"
                placeholder="Ex: 30"
                value={settings.margemLucroPadrao}
                onChange={(e) => setSettings({ ...settings, margemLucroPadrao: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Usada para auto-calcular o preço de venda no cadastro de produtos.</p>
            </div>

            {/* Taxa da Máquina (Crédito) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Taxa da Máquina (Crédito %)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 2.99"
                value={settings.taxaMaquinaCredito}
                onChange={(e) => setSettings({ ...settings, taxaMaquinaCredito: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Percentual cobrado pela maquininha na venda a crédito.</p>
            </div>

            {/* Repassar Taxa de Crédito */}
            <div className="space-y-1.5 flex flex-col justify-end pb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="repassarTaxaCredito"
                  checked={settings.repassarTaxaCredito}
                  onChange={(e) => setSettings({ ...settings, repassarTaxaCredito: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-border bg-brand-dark text-brand-accent focus:ring-brand-accent focus:ring-opacity-25"
                />
                <label htmlFor="repassarTaxaCredito" className="text-xs font-bold text-gray-300 uppercase cursor-pointer select-none">
                  Repassar Taxa ao Cliente
                </label>
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Soma a taxa ao valor total do cliente ao selecionar Crédito.</p>
            </div>
          </div>
        </div>

        {/* Backups Automáticos Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <FolderHeart className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Backups Locais Automáticos</h3>
              <p className="text-xs text-gray-500 font-semibold">Sincronize ou salve cópias de segurança do banco em pastas de nuvem ou HDs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup folder path */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Caminho da Pasta de Backup</label>
              <input
                type="text"
                placeholder="Ex: C:\Users\Nome\Google Drive\BackupsPDV"
                value={settings.backupFolder}
                onChange={(e) => setSettings({ ...settings, backupFolder: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all"
              />
              <p className="text-[10px] text-gray-500 font-medium">Caminho completo da pasta. Recomenda-se usar pastas do Google Drive ou Dropbox.</p>
            </div>

            {/* Checkbox backup ao fechar */}
            <div className="flex items-center space-x-3 h-full pt-6">
              <input
                type="checkbox"
                id="backupAoFechar"
                checked={settings.backupAoFechar}
                onChange={(e) => setSettings({ ...settings, backupAoFechar: e.target.checked })}
                className="h-4 w-4 rounded border-brand-border bg-brand-dark text-brand-accent focus:ring-brand-accent focus:ring-opacity-25"
              />
              <label htmlFor="backupAoFechar" className="text-xs font-bold text-gray-300 uppercase cursor-pointer">
                Realizar backup automático ao finalizar vendas
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-white font-bold text-xs uppercase transition-all shadow-lg shadow-indigo-500/20 glow-indigo"
          >
            <Save size={14} />
            <span>Salvar Configurações</span>
          </button>
        </div>

      </form>

      {/* Licenciamento do Sistema Section */}
      <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 mt-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
          <Lock className="text-brand-accent h-5 w-5 animate-pulse" />
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Licenciamento & Assinatura Comercial</h3>
            <p className="text-xs text-gray-500 font-semibold">Consulte o status da licença de uso do terminal, ID de hardware ou ative chaves de renovação</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Status & ID Column */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificador Único deste Terminal (ID de Hardware)</label>
              <div className="flex items-center justify-between bg-brand-dark border border-brand-border rounded-xl p-3.5 transition-all">
                <span className="font-mono text-xs text-indigo-300 font-bold tracking-wider select-text truncate pr-4">
                  {machineId}
                </span>
                <button
                  onClick={handleCopyMachineId}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors shrink-0"
                  type="button"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-brand-success" />
                      <span className="text-brand-success text-[10px]">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="text-[10px]">Copiar ID</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 font-medium italic">
                * Envie este código ID ao suporte para gerar uma nova licença válida.
              </p>
            </div>

            {/* License Status Card */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status da Assinatura</label>
              <div className={`p-4 rounded-xl border flex items-center space-x-4 ${
                licenseStatus.valida 
                  ? licenseStatus.diasRestantes <= 5 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger'
              }`}>
                <div className={`p-2.5 rounded-lg ${
                  licenseStatus.valida 
                    ? licenseStatus.diasRestantes <= 5 ? 'bg-amber-500/25' : 'bg-emerald-500/25' 
                    : 'bg-brand-danger/25'
                }`}>
                  {licenseStatus.valida ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">
                    {licenseStatus.valida 
                      ? licenseStatus.diasRestantes <= 5 ? 'Assinatura Expirando Brevemente' : 'Assinatura Ativa & Válida' 
                      : 'Assinatura Bloqueada'}
                  </h4>
                  <p className="text-xs font-medium opacity-80 mt-1">
                    {licenseStatus.valida
                      ? `Acesso liberado até ${licenseStatus.expiraEm.split('-').reverse().join('/')} (${licenseStatus.diasRestantes} dias restantes).`
                      : 'Nenhuma chave de licença ativa ou válida foi encontrada.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Renewal / Key Activation Column */}
          <div className="space-y-4">
            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Renovar Assinatura (Inserir Nova Chave)</label>
                <textarea
                  placeholder="Cole aqui a nova chave de ativação gerada pelo suporte..."
                  value={chaveInput}
                  onChange={(e) => setChaveInput(e.target.value)}
                  className="w-full h-24 bg-brand-dark border border-brand-border/80 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-mono text-white placeholder-gray-600 outline-none transition-colors resize-none"
                  required
                />
              </div>

              {licErrorMsg && (
                <div className="text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-3 font-semibold animate-pulse">
                  {licErrorMsg}
                </div>
              )}

              {licSuccessMsg && (
                <div className="text-xs bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl p-3 font-semibold">
                  {licSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-brand-accent hover:bg-brand-accentHover text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/10 flex items-center justify-center space-x-2"
              >
                <Award size={14} />
                <span>Validar e Ativar Licença</span>
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
