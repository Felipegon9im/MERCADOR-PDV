import React, { useState, useEffect } from 'react';
import { Settings, QrCode, Save, Building2, MapPin, Percent, CheckCircle2, Printer, ShieldAlert, FolderHeart, Scale, Award, Lock, ShieldCheck, Copy, Check } from 'lucide-react';
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

  useEffect(() => {
    const saved = localStorage.getItem('pdv_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
        </div>

        {/* Balança de Checkout Section */}
        <div className="bg-brand-card/40 border border-brand-border/50 rounded-3xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-brand-border/50">
            <Scale className="text-brand-accent h-5 w-5" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Balança de Checkout</h3>
              <p className="text-xs text-gray-500 font-semibold">Integre balanças seriais (COM/USB) para pesagem automática na Frente de Caixa</p>
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

            {/* Porta Serial */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Porta COM (Serial)</label>
              <select
                disabled={!settings.balancaAtiva}
                value={settings.balancaPorta}
                onChange={(e) => setSettings({ ...settings, balancaPorta: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none transition-all"
              >
                <option value="SIMULACAO">SIMULAÇÃO (Sem Cabo)</option>
                <option value="COM1">Porta COM1</option>
                <option value="COM2">Porta COM2</option>
                <option value="COM3">Porta COM3</option>
                <option value="COM4">Porta COM4</option>
                <option value="COM5">Porta COM5</option>
                <option value="COM6">Porta COM6</option>
                <option value="COM7">Porta COM7</option>
                <option value="COM8">Porta COM8</option>
              </select>
              <p className="text-[10px] text-gray-500 font-medium">Porta onde o cabo da balança está conectado.</p>
            </div>

            {/* Protocolo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Protocolo</label>
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
              <p className="text-[10px] text-gray-500 font-medium">Protocolo de comunicação da balança.</p>
            </div>

            {/* Peso Simulado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Peso Simulado (KG)</label>
              <input
                disabled={!settings.balancaAtiva || settings.balancaPorta !== 'SIMULACAO'}
                type="number"
                step="0.001"
                min="0.000"
                max="30.000"
                placeholder="Ex: 1.500"
                value={settings.balancaPesoSimulado}
                onChange={(e) => setSettings({ ...settings, balancaPesoSimulado: e.target.value })}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-all shadow-inner"
              />
              <p className="text-[10px] text-gray-500 font-medium">Para testes rápidos de venda sem balança física.</p>
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
