import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import confetti from 'canvas-confetti';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  FileText, 
  DollarSign, 
  CreditCard, 
  X, 
  Check, 
  Printer, 
  TrendingUp, 
  HelpCircle,
  TrendingDown,
  UserCheck
} from 'lucide-react';

function playBeep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'chime') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("AudioContext failed:", e);
  }
}

export default function Clientes() {
  const { user } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  
  // Client Form state
  const [clientForm, setClientForm] = useState({
    id: null,
    nome: '',
    telefone: '',
    cpf: '',
    limite_credito: '',
    saldo_devedor: 0
  });

  // Ledger Extrato state
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [extratoData, setExtratoData] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro'); // dinheiro, pix, debito, credito

  const fetchClientes = async () => {
    try {
      const data = await api.db.getClientes();
      setClientes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleOpenRegister = () => {
    setClientForm({
      id: null,
      nome: '',
      telefone: '',
      cpf: '',
      limite_credito: '',
      saldo_devedor: 0
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (c) => {
    setClientForm({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone || '',
      cpf: c.cpf || '',
      limite_credito: c.limite_credito > 0 ? c.limite_credito.toString() : '',
      saldo_devedor: c.saldo_devedor || 0
    });
    setShowFormModal(true);
  };

  const handleSaveCliente = async (e) => {
    e.preventDefault();
    if (!clientForm.nome.trim()) return;

    try {
      const payload = {
        id: clientForm.id,
        nome: clientForm.nome,
        telefone: clientForm.telefone,
        cpf: clientForm.cpf,
        limite_credito: parseFloat(clientForm.limite_credito) || 0,
        saldo_devedor: clientForm.saldo_devedor
      };
      
      await api.db.salvarCliente(payload);
      playBeep('success');
      setShowFormModal(false);
      fetchClientes();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    }
  };

  const handleOpenExtrato = async (cliente) => {
    try {
      const res = await api.db.getClienteExtrato(cliente.id);
      if (res) {
        setSelectedCliente(res.cliente);
        setExtratoData(res.extrato);
        setPaymentAmount('');
        setPaymentMethod('dinheiro');
        setShowExtratoModal(true);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar extrato do cliente.");
    }
  };

  const handleLancarPagamento = async (e) => {
    e.preventDefault();
    if (!selectedCliente) return;

    const valor = parseFloat(paymentAmount);
    if (isNaN(valor) || valor <= 0) {
      playBeep('error');
      alert("Por favor, informe um valor de pagamento válido maior que zero.");
      return;
    }

    if (valor > selectedCliente.saldo_devedor) {
      if (!confirm(`O valor pago (R$ ${valor.toFixed(2)}) é maior que a dívida atual (R$ ${selectedCliente.saldo_devedor.toFixed(2)}). Deseja registrar mesmo assim?`)) {
        return;
      }
    }

    try {
      const res = await api.db.lancarPagamentoCliente(
        selectedCliente.id,
        valor,
        paymentMethod,
        user.id
      );

      if (res.success) {
        // Success WOW
        playBeep('chime');
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#A78BFA', '#10B981', '#F59E0B']
        });

        // Print receipt automatically
        const printHtml = `
          <html>
            <head>
              <style>
                body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 10px; color: black; }
                .text-center { text-align: center; }
                .divider { border-top: 1px dashed black; margin: 5px 0; }
                .row { display: flex; justify-content: space-between; }
                .bold { font-weight: bold; }
                .margin-top { margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="text-center">
                <span class="bold">MERCADO & CONVENIENCIA</span><br/>
                <span>Rua do Mercado, 123 - Centro</span><br/>
                <div class="divider"></div>
                <span class="bold">COMPROVANTE DE PAGAMENTO</span><br/>
                <span>Recebido em ${new Date().toLocaleString('pt-BR')}</span>
              </div>
              <div class="divider"></div>
              
              <div class="row">
                <span>Cliente:</span>
                <span class="bold">${selectedCliente.nome.toUpperCase()}</span>
              </div>
              <div class="row">
                <span>CPF:</span>
                <span>${selectedCliente.cpf || 'Nao informado'}</span>
              </div>
              <div class="divider"></div>
              
              <div class="row bold" style="font-size:12px;">
                <span>VALOR RECEBIDO:</span>
                <span>R$ ${valor.toFixed(2)}</span>
              </div>
              <div class="row">
                <span>Forma de Pago:</span>
                <span class="bold">${paymentMethod.toUpperCase()}</span>
              </div>
              
              <div class="divider"></div>
              <div class="row">
                <span>Divida Anterior:</span>
                <span>R$ ${selectedCliente.saldo_devedor.toFixed(2)}</span>
              </div>
              <div class="row bold">
                <span>Saldo Devedor Restante:</span>
                <span>R$ ${res.novoSaldo.toFixed(2)}</span>
              </div>
              
              <div class="divider"></div>
              <div class="text-center margin-top">
                <span class="bold">Obrigado! Obrigado pelo pagamento.</span><br/>
                <span>Operador: ${user.name}</span>
              </div>
            </body>
          </html>
        `;
        
        await api.print.imprimirCupom(printHtml);

        // Refresh modal extrato data
        const refresh = await api.db.getClienteExtrato(selectedCliente.id);
        if (refresh) {
          setSelectedCliente(refresh.cliente);
          setExtratoData(refresh.extrato);
          setPaymentAmount('');
        }

        // Refresh main list
        fetchClientes();
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar pagamento.");
    }
  };

  const handlePrintExtrato = async () => {
    if (!selectedCliente) return;

    const printHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 10px; margin: 0; padding: 10px; color: black; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed black; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .item-row { margin-bottom: 3px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <span class="bold">MERCADO & CONVENIENCIA</span><br/>
            <span>Extrato de Conta de Fiado</span><br/>
            <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div class="divider"></div>
          
          <div class="row">
            <span>Cliente:</span>
            <span class="bold">${selectedCliente.nome.toUpperCase()}</span>
          </div>
          <div class="row">
            <span>Telefone:</span>
            <span>${selectedCliente.telefone || 'Nao cadastrado'}</span>
          </div>
          <div class="row">
            <span>Divida Atual:</span>
            <span class="bold">R$ ${selectedCliente.saldo_devedor.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          
          <div class="bold row">
            <span>Data / Operacao</span>
            <span>Valor</span>
          </div>
          <div class="divider"></div>
          
          ${extratoData.map(e => `
            <div class="item-row">
              <span>${new Date(e.data).toLocaleDateString('pt-BR')} - ${e.descricao}</span>
              <span class="bold">${e.tipo === 'compra' ? '-' : '+'} R$ ${e.valor.toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          <div class="row bold" style="font-size: 11px;">
            <span>SALDO DEVEDOR PENDENTE:</span>
            <span>R$ ${selectedCliente.saldo_devedor.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          
          <div class="text-center" style="margin-top:10px;">
            <span>Mantenha sua conta em dia!</span>
          </div>
        </body>
      </html>
    `;

    try {
      await api.print.imprimirCupom(printHtml);
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar impressão do extrato.");
    }
  };

  // Metrics
  const totalContasAReceber = clientes.reduce((acc, c) => acc + (c.saldo_devedor || 0), 0);
  const totalLimiteConcedido = clientes.reduce((acc, c) => acc + (c.limite_credito || 0), 0);
  const limiteUtilizadoPct = totalLimiteConcedido > 0 ? (totalContasAReceber / totalLimiteConcedido) * 100 : 0;

  // Filter
  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf && c.cpf.includes(searchTerm)) ||
    (c.telefone && c.telefone.includes(searchTerm))
  );

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
            <Users className="text-brand-accent h-7 w-7" />
            <span>Clientes & Controle de Fiado</span>
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">
            Gerencie limites de fiado, consulte extratos bancários de compras e dê baixa em pagamentos de débitos pendentes
          </p>
        </div>
        <button
          onClick={handleOpenRegister}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-brand-accent hover:bg-brand-accentHover text-white transition-all font-bold text-xs shadow-lg shadow-indigo-500/20"
        >
          <UserPlus size={16} />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Total Contas a Receber */}
        <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
          <div>
            <span className="text-[10px] text-brand-warning font-extrabold uppercase tracking-widest">Total a Receber (Rua)</span>
            <h4 className="text-xl font-black text-brand-warning mt-1.5">R$ {totalContasAReceber.toFixed(2)}</h4>
          </div>
          <div className="h-9 w-9 rounded-xl bg-brand-warning/10 text-brand-warning flex items-center justify-center">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Total de Clientes */}
        <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
          <div>
            <span className="text-[10px] text-brand-success font-extrabold uppercase tracking-widest">Clientes Cadastrados</span>
            <h4 className="text-xl font-black text-brand-success mt-1.5">{clientes.length} ativos</h4>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-brand-success flex items-center justify-center">
            <UserCheck size={16} />
          </div>
        </div>

        {/* Utilização de Crédito */}
        <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
          <div>
            <span className="text-[10px] text-brand-accent font-extrabold uppercase tracking-widest">Crédito Utilizado</span>
            <h4 className="text-xl font-black text-brand-accent mt-1.5">
              {limiteUtilizadoPct.toFixed(1)}% <span className="text-xs text-gray-500 font-semibold font-sans">de R$ {totalLimiteConcedido.toFixed(0)}</span>
            </h4>
          </div>
          <div className="h-9 w-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>

      </div>

      {/* Filter and Search */}
      <div className="flex bg-brand-card/40 border border-brand-border/50 rounded-2xl p-4 relative items-center justify-between">
        <div className="relative w-96">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-colors"
          />
        </div>
        <span className="text-xs font-bold text-gray-500">
          Encontrados {filteredClientes.length} clientes
        </span>
      </div>

      {/* Customers List Table */}
      <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
              <th className="py-4 px-6 text-center w-16">ID</th>
              <th className="py-4 px-4">Nome Cliente</th>
              <th className="py-4 px-4">Contato (Telefone)</th>
              <th className="py-4 px-4">CPF</th>
              <th className="py-4 px-4 text-right">Limite de Crédito</th>
              <th className="py-4 px-4 text-right">Saldo Devedor</th>
              <th className="py-4 px-6 text-center w-60">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/30">
            {filteredClientes.length > 0 ? (
              filteredClientes.map(c => {
                const isDebt = (c.saldo_devedor || 0) > 0;
                return (
                  <tr key={c.id} className="hover:bg-brand-border/10 text-xs font-semibold text-gray-300 transition-colors">
                    <td className="py-4 px-6 text-center text-gray-500 font-bold">#{c.id}</td>
                    <td className="py-4 px-4 text-white font-bold text-sm">{c.nome}</td>
                    <td className="py-4 px-4 text-gray-400">
                      {c.telefone ? (
                        <span className="flex items-center space-x-1">
                          <Phone size={12} className="text-gray-500" />
                          <span>{c.telefone}</span>
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium">Nenhum</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-400">{c.cpf || <span className="text-gray-600 font-medium">Nenhum</span>}</td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {c.limite_credito > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-brand-border/40 text-xs font-bold">
                          R$ {c.limite_credito.toFixed(2)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-brand-success text-xs font-bold uppercase">
                          Ilimitado
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isDebt ? (
                        <span className="text-brand-warning font-black text-sm">
                          R$ {c.saldo_devedor.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-brand-success font-bold text-xs uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Sem Dívida
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="px-3 py-2 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white rounded-xl transition-colors border border-brand-border/40 font-bold text-[10px] uppercase"
                        >
                          Editar
                        </button>
                        
                        <button
                          onClick={() => handleOpenExtrato(c)}
                          className="px-3.5 py-2 bg-gradient-to-tr from-brand-accent to-pink-500 hover:opacity-90 text-white rounded-xl transition-all font-bold text-[10px] uppercase shadow-lg shadow-indigo-500/10 flex items-center space-x-1.5"
                        >
                          <FileText size={10} />
                          <span>Extrato & Receber</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-500 text-xs font-semibold">
                  Nenhum cliente correspondente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL: CADASTRO / EDIÇÃO DE CLIENTE
          ======================================================== */}
      {showFormModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <form onSubmit={handleSaveCliente} className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users size={18} className="text-brand-accent" />
                <span>{clientForm.id ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nome Completo *</label>
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="Nome do cliente"
                  value={clientForm.nome}
                  onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone / Whatsapp</label>
                  <input
                    type="text"
                    placeholder="(81) 98888-7777"
                    value={clientForm.telefone}
                    onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                    className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={clientForm.cpf}
                    onChange={(e) => setClientForm({ ...clientForm, cpf: e.target.value })}
                    className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Limite de Fiado (R$) - Deixe zerado se sem limite</label>
                <input
                  type="number"
                  placeholder="Ex: 500.00 (opcional)"
                  value={clientForm.limite_credito}
                  onChange={(e) => setClientForm({ ...clientForm, limite_credito: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2"
              >
                <Check size={14} />
                <span>Salvar Cadastro</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: EXTRATO COMPLETO & LANÇAR RECEBIMENTO DE PENDÊNCIA
          ======================================================== */}
      {showExtratoModal && selectedCliente && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-4xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl flex animate-in zoom-in-95 duration-150 max-h-[85%] overflow-hidden">
            
            {/* Left: Ledger consolidated logs */}
            <div className="flex-1 pr-8 border-r border-brand-border/50 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col overflow-hidden h-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">Histórico da Conta</span>
                    <h3 className="text-lg font-black text-white leading-tight">{selectedCliente.nome}</h3>
                    <p className="text-[10px] text-gray-500 font-medium">CPF: {selectedCliente.cpf || 'Não cadastrado'} | Fone: {selectedCliente.telefone || 'Não cadastrado'}</p>
                  </div>
                  <button
                    onClick={handlePrintExtrato}
                    className="flex items-center space-x-1.5 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-brand-border/40 font-bold text-[10px] transition-colors"
                    title="Imprimir Extrato Completo"
                  >
                    <Printer size={12} />
                    <span>Imprimir Extrato</span>
                  </button>
                </div>

                {/* Extrato ledger logs */}
                <div className="flex-1 overflow-y-auto rounded-2xl bg-brand-dark/40 border border-brand-border/60 p-2 space-y-1.5">
                  {extratoData.length > 0 ? (
                    extratoData.map((e, index) => {
                      const isPurchase = e.tipo === 'compra';
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3.5 hover:bg-brand-border/20 rounded-xl transition-all duration-150 border border-brand-border/20 bg-brand-card/20"
                        >
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold block">
                              {new Date(e.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs text-white font-bold leading-snug">{e.descricao}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-black block ${isPurchase ? 'text-brand-danger' : 'text-brand-success'}`}>
                              {isPurchase ? '-' : '+'} R$ {e.valor.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">
                              {isPurchase ? 'Débito' : 'Abatimento'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8">
                      <span className="text-4xl mb-2">📜</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Extrato em Branco</h4>
                      <p className="text-[10px] text-gray-500 font-medium mt-1">Este cliente não possui histórico de compras ou pagamentos.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => { setShowExtratoModal(false); setSelectedCliente(null); }}
                  className="w-full bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Voltar para Clientes (Esc)
                </button>
              </div>
            </div>

            {/* Right: Balance Receivables Panel */}
            <div className="w-[300px] pl-8 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-6">Dar Baixa em Dívida</h3>
                
                {/* Account card */}
                <div className="p-4 rounded-2xl bg-brand-dark/40 border border-brand-border/60 space-y-4 shadow-inner mb-6">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block leading-none mb-1">Dívida Total</span>
                    <span className="text-3xl font-black text-brand-warning">R$ {selectedCliente.saldo_devedor.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-brand-border/40 text-gray-400">
                    <span>Limite: R$ {selectedCliente.limite_credito > 0 ? selectedCliente.limite_credito.toFixed(2) : 'Ilimitado'}</span>
                    <span>Disponível: R$ {selectedCliente.limite_credito > 0 ? Math.max(0, selectedCliente.limite_credito - selectedCliente.saldo_devedor).toFixed(2) : 'Ilimitado'}</span>
                  </div>
                </div>

                {/* Form to submit payment */}
                {selectedCliente.saldo_devedor > 0 ? (
                  <form onSubmit={handleLancarPagamento} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Recebido (R$)</label>
                      <input
                        autoFocus
                        required
                        type="number"
                        step="0.01"
                        placeholder="Digite o valor a abater..."
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Forma de Recebimento</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'dinheiro', label: 'Dinheiro' },
                          { id: 'pix', label: 'PIX' },
                          { id: 'debito', label: 'Débito' },
                          { id: 'credito', label: 'Crédito' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id)}
                            className={`py-2.5 rounded-xl border text-[10px] font-black uppercase text-center transition-all ${
                              paymentMethod === m.id
                                ? 'border-brand-accent bg-brand-accent/10 text-white'
                                : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-brand-success hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2 mt-4"
                    >
                      <Check size={14} />
                      <span>Registrar Recebimento</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center justify-center py-10 space-y-2.5 animate-in fade-in duration-200">
                    <UserCheck className="h-9 w-9 text-brand-success" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Conta Sem Pendências</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1">Este cliente está totalmente em dia com suas contas!</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-[9px] text-gray-500 font-semibold uppercase leading-none pb-1 mt-6">
                Pagamentos imprimem comprovante automático
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
