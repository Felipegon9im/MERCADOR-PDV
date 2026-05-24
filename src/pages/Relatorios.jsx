import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, 
  Search, 
  Eye, 
  Printer, 
  X, 
  Calendar, 
  TrendingUp, 
  Tag, 
  DollarSign,
  Clock
} from 'lucide-react';

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [selectedVenda, setSelectedVenda] = useState(null); // { venda, itens }
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Cash Register Sessions Audit states
  const [activeTab, setActiveTab] = useState('vendas'); // 'vendas' or 'caixas'
  const [caixaSessoes, setCaixaSessoes] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null); // detailed closure report
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');

  const loadVendas = async () => {
    try {
      const data = await api.sales.getVendas();
      setVendas(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCaixas = async () => {
    try {
      const data = await api.caixa.getHistoricoCaixas();
      setCaixaSessoes(data);
    } catch (e) {
      console.error("Erro ao carregar caixas:", e);
    }
  };

  useEffect(() => {
    loadVendas();
    loadCaixas();
  }, []);

  const handleOpenDetails = async (vendaId) => {
    try {
      const details = await api.sales.getVendaDetalhes(vendaId);
      if (details) {
        setSelectedVenda(details);
        setShowDetailModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenSessionDetails = async (sessionId) => {
    try {
      const rel = await api.caixa.getRelatorioFechamento(sessionId);
      if (rel) {
        setSelectedSession(rel);
        setShowSessionModal(true);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar detalhes do caixa: " + e.message);
    }
  };

  const handleReprintReceipt = async (vendaDet) => {
    if (!vendaDet) return;
    const { venda, itens } = vendaDet;

    const printHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 10px; color: black; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed black; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .item-row { margin-bottom: 3px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <span class="bold">MERCADO & CONVENIENCIA</span><br/>
            <span>Rua do Mercado, 123 - Centro</span><br/>
            <span>CNPJ: 12.345.678/0001-99</span><br/>
            <div class="divider"></div>
            <span class="bold">SEGUNDA VIA - CUPOM NAO FISCAL</span><br/>
            <span>Venda #${venda.id} - ${new Date(venda.data_venda).toLocaleString('pt-BR')}</span>
          </div>
          <div class="divider"></div>
          
          <div class="bold row">
            <span>Item (Qtd x V.Unit)</span>
            <span>Total</span>
          </div>
          <div class="divider"></div>
          
          ${itens.map(item => `
            <div class="item-row">
              <div>${item.produto_nome.toUpperCase()}</div>
              <div class="row">
                <span>&nbsp;&nbsp;${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}</span>
                <span>R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          <div class="row">
            <span>Subtotal:</span>
            <span>R$ ${venda.subtotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Desconto:</span>
            <span>R$ ${venda.desconto.toFixed(2)}</span>
          </div>
          <div class="row bold" style="font-size:12px;">
            <span>TOTAL PAGAR:</span>
            <span>R$ ${venda.total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>F. Pagamento:</span>
            <span class="bold">${venda.forma_pagamento === 'fiado' ? 'FIADO (A PRAZO)' : venda.forma_pagamento.toUpperCase()}</span>
          </div>
          ${venda.forma_pagamento === 'fiado' && venda.cliente_nome ? `
            <div class="row">
              <span>Cliente:</span>
              <span class="bold">${venda.cliente_nome.toUpperCase()}</span>
            </div>
          ` : ''}
          ${venda.forma_pagamento === 'dinheiro' ? `
            <div class="row">
              <span>Valor Pago:</span>
              <span>R$ ${venda.pago.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Troco:</span>
              <span>R$ ${venda.troco.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="divider"></div>
          <div class="text-center" style="margin-top:10px;">
            <span class="bold">Reimpressao de Cupom</span><br/>
            <span>Operador: ${venda.usuario_nome}</span>
          </div>
        </body>
      </html>
    `;

    try {
      await api.print.imprimirCupom(printHtml);
    } catch (e) {
      console.error(e);
      alert("Erro ao disparar impressão");
    }
  };

  const handleReprintClosure = async (rel) => {
    if (!rel) return;
    const { sessao, vendas: vSums, movimentacoes } = rel;
    
    const movsHtml = movimentacoes && movimentacoes.length > 0
      ? movimentacoes.map(m => `
        <div class="row">
          <span>&nbsp;&nbsp;${m.tipo.toUpperCase()} (${m.motivo}):</span>
          <span>${m.tipo === 'sangria' ? '-' : '+'} R$ ${m.valor.toFixed(2)}</span>
        </div>
      `).join('')
      : '<div>&nbsp;&nbsp;Nenhuma movimentação realizada.</div>';
      
    const diff = (sessao.valor_fechamento_dinheiro !== null ? sessao.valor_fechamento_dinheiro : 0) - (sessao.valor_fechamento_calculado !== null ? sessao.valor_fechamento_calculado : 0);
    const diffMsg = sessao.status === 'aberto' 
      ? 'Turno em Andamento'
      : diff === 0 
      ? "Correto" 
      : diff > 0 
      ? `Sobra de R$ ${diff.toFixed(2)}` 
      : `Quebra de R$ ${Math.abs(diff).toFixed(2)}`;
    
    const closureHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 10px; color: black; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed black; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .section-title { font-weight: bold; margin-top: 8px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <span class="bold">MERCADO & CONVENIENCIA</span><br/>
            <div class="divider"></div>
            <span class="bold">SEGUNDA VIA - COMPROVANTE FECHAMENTO</span><br/>
            <span>Caixa #${sessao.id} - ${new Date(sessao.data_fechamento || Date.now()).toLocaleString('pt-BR')}</span>
          </div>
          <div class="divider"></div>
          
          <div class="row">
            <span>Operador:</span>
            <span class="bold">${sessao.operador_nome.toUpperCase()}</span>
          </div>
          <div class="row">
            <span>Abertura:</span>
            <span>${new Date(sessao.data_abertura).toLocaleString('pt-BR')}</span>
          </div>
          <div class="row">
            <span>Fechamento:</span>
            <span>${sessao.data_fechamento ? new Date(sessao.data_fechamento).toLocaleString('pt-BR') : 'ABERTO (EM ANDAMENTO)'}</span>
          </div>
          
          <div class="divider"></div>
          <div class="section-title">Resumo Financeiro</div>
          <div class="divider"></div>
          <div class="row">
            <span>Fundo de Troco Inicial:</span>
            <span>R$ ${sessao.valor_abertura.toFixed(2)}</span>
          </div>
          ${sessao.diferenca_abertura && sessao.diferenca_abertura !== 0 ? `
            <div class="row" style="font-size: 10px; color: ${sessao.diferenca_abertura > 0 ? 'green' : 'red'}; font-weight: bold;">
              <span>&nbsp;&nbsp;Divergencia Abertura:</span>
              <span>${sessao.diferenca_abertura > 0 ? '+' : ''} R$ ${sessao.diferenca_abertura.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="row">
            <span>Vendas Dinheiro:</span>
            <span>R$ ${vSums.dinheiro.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Vendas PIX:</span>
            <span>R$ ${vSums.pix.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Vendas Débito:</span>
            <span>R$ ${vSums.debito.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Vendas Crédito:</span>
            <span>R$ ${vSums.credito.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Vendas Fiado (Prazo):</span>
            <span>R$ ${vSums.fiado.toFixed(2)}</span>
          </div>
          <div class="row bold">
            <span>Total Faturado:</span>
            <span>R$ ${vSums.total.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="section-title">Movimentações de Dinheiro</div>
          <div class="divider"></div>
          ${movsHtml}
          
          <div class="divider"></div>
          <div class="section-title">Conciliação de Caixa</div>
          <div class="divider"></div>
          <div class="row">
            <span>Dinheiro Esperado:</span>
            <span class="bold">R$ ${(sessao.valor_fechamento_calculado !== null ? sessao.valor_fechamento_calculado : 0).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Dinheiro Contado:</span>
            <span class="bold">R$ ${(sessao.valor_fechamento_dinheiro !== null ? sessao.valor_fechamento_dinheiro : 0).toFixed(2)}</span>
          </div>
          <div class="row bold" style="font-size: 12px;">
            <span>Diferença:</span>
            <span>${diffMsg}</span>
          </div>
          
          <div class="divider"></div>
          <div class="text-center" style="margin-top:20px;">
            <span>Assinatura do Operador:</span><br/><br/>
            <span>_______________________________</span><br/>
            <span class="bold">${sessao.operador_nome.toUpperCase()}</span>
          </div>
        </body>
      </html>
    `;
    
    try {
      await api.print.imprimirCupom(closureHtml);
      alert("Comprovante de fechamento enviado para a impressora!");
    } catch (e) {
      console.error(e);
      alert("Erro ao imprimir cupom: " + e.message);
    }
  };

  // Filter Logic - Vendas
  const filteredVendas = vendas.filter(v => {
    const matchesSearch = v.id.toString().includes(searchTerm) || 
                          v.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === '' || v.forma_pagamento === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  // Calculate totals for filtered list
  const totalFaturamento = filteredVendas.reduce((acc, v) => acc + v.total, 0);
  const totalDescontos = filteredVendas.reduce((acc, v) => acc + v.desconto, 0);
  const totalSubtotal = filteredVendas.reduce((acc, v) => acc + v.subtotal, 0);

  // Filter Logic - Caixas
  const filteredCaixas = caixaSessoes.filter(c => {
    return c.id.toString().includes(sessionSearchTerm) || 
           c.operador_nome.toLowerCase().includes(sessionSearchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
            <BarChart3 className="text-brand-accent h-7 w-7" />
            <span>Auditoria e Relatórios</span>
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Consulte transações financeiras, turnos de operadores e fluxo de caixa.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-brand-border/40 pb-px shrink-0">
        <button
          onClick={() => setActiveTab('vendas')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'vendas'
              ? 'border-brand-accent text-white bg-brand-accent/5'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Transações / Vendas
        </button>
        <button
          onClick={() => { setActiveTab('caixas'); loadCaixas(); }}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'caixas'
              ? 'border-brand-accent text-white bg-brand-accent/5'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Auditoria de Caixas (Turnos)
        </button>
      </div>

      {/* ========================================================
          TAB 1: VENDAS REALIZADAS
          ======================================================== */}
      {activeTab === 'vendas' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">Subtotal Acumulado</span>
                <h4 className="text-xl font-black text-white mt-1.5">R$ {totalSubtotal.toFixed(2)}</h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-brand-border flex items-center justify-center text-gray-400">
                <DollarSign size={16} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-brand-danger font-extrabold uppercase tracking-widest">Descontos Concedidos</span>
                <h4 className="text-xl font-black text-brand-danger mt-1.5">- R$ {totalDescontos.toFixed(2)}</h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-brand-danger/10 text-brand-danger flex items-center justify-center">
                <Tag size={16} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-brand-success font-extrabold uppercase tracking-widest">Faturamento Líquido</span>
                <h4 className="text-xl font-black text-brand-success mt-1.5">R$ {totalFaturamento.toFixed(2)}</h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-brand-success flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* Filters card */}
          <div className="grid grid-cols-4 gap-4 bg-brand-card/40 border border-brand-border/50 rounded-2xl p-4">
            <div className="col-span-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por ID da Venda ou Nome do Operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-colors"
              />
            </div>

            <div className="col-span-1">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 px-4 text-xs font-semibold text-gray-300 outline-none transition-colors"
              >
                <option value="">Formas de Pagamento (Todas)</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">PIX QR Code</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="fiado">Fiado (A Prazo)</option>
              </select>
            </div>

            <div className="col-span-1 flex items-center justify-end px-2 text-xs font-bold text-gray-500">
              Mostrando {filteredVendas.length} transações
            </div>
          </div>

          {/* Transaction list table */}
          <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden animate-in slide-in-from-bottom-3 duration-250">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
                  <th className="py-4 px-6 text-center w-20">Venda ID</th>
                  <th className="py-4 px-4">Operador</th>
                  <th className="py-4 px-4">Data / Hora</th>
                  <th className="py-4 px-4">Forma Pagamento</th>
                  <th className="py-4 px-4 text-right">Desconto</th>
                  <th className="py-4 px-4 text-right">Valor Líquido</th>
                  <th className="py-4 px-6 text-center w-28">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filteredVendas.length > 0 ? (
                  filteredVendas.map(v => (
                    <tr key={v.id} className="hover:bg-brand-border/10 text-xs font-semibold text-gray-300 transition-colors">
                      <td className="py-4 px-6 text-center text-gray-500 font-bold">#{v.id}</td>
                      <td className="py-4 px-4 text-white font-bold">{v.usuario_nome}</td>
                      <td className="py-4 px-4 text-gray-400">
                        {new Date(v.data_venda).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`uppercase text-[10px] px-2 py-0.5 rounded border ${
                          v.forma_pagamento === 'fiado' 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                            : 'bg-brand-border/60 text-gray-300 border-brand-border'
                        }`}>
                          {v.forma_pagamento === 'fiado' ? `Fiado: ${v.cliente_nome || 'Cliente'}` : v.forma_pagamento}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-brand-danger">R$ {v.desconto.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-brand-success font-black">R$ {v.total.toFixed(2)}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleOpenDetails(v.id)}
                          className="p-2 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white rounded-lg transition-colors border border-brand-border/40 cursor-pointer"
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-500 text-xs font-semibold">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: AUDITORIA DE CAIXAS
          ======================================================== */}
      {activeTab === 'caixas' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">Sessões Registradas</span>
                <h4 className="text-xl font-black text-white mt-1.5">{caixaSessoes.length} Turnos</h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-brand-border flex items-center justify-center text-gray-400">
                <Clock size={16} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-brand-success font-extrabold uppercase tracking-widest">Caixas Ativos</span>
                <h4 className="text-xl font-black text-brand-success mt-1.5">
                  {caixaSessoes.filter(c => c.status === 'aberto').length} Operando
                </h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-brand-success flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
              <div>
                <span className="text-[10px] text-brand-warning font-extrabold uppercase tracking-widest">Conformidade Geral</span>
                <h4 className="text-xl font-black text-brand-warning mt-1.5">
                  {caixaSessoes.filter(c => c.status === 'fechado' && ((c.valor_fechamento_dinheiro || 0) - (c.valor_fechamento_calculado || 0)) !== 0).length} Divergentes
                </h4>
              </div>
              <div className="h-9 w-9 rounded-xl bg-brand-warning/10 text-brand-warning flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
          </div>

          {/* Filters Card */}
          <div className="grid grid-cols-4 gap-4 bg-brand-card/40 border border-brand-border/50 rounded-2xl p-4">
            <div className="col-span-3 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por ID do Caixa ou Nome do Operador..."
                value={sessionSearchTerm}
                onChange={(e) => setSessionSearchTerm(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-colors"
              />
            </div>

            <div className="col-span-1 flex items-center justify-end px-2 text-xs font-bold text-gray-500">
              Mostrando {filteredCaixas.length} sessões
            </div>
          </div>

          {/* Sessoes List Table */}
          <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden animate-in slide-in-from-bottom-3 duration-250">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
                  <th className="py-4 px-6 text-center w-20">Caixa ID</th>
                  <th className="py-4 px-4">Operador</th>
                  <th className="py-4 px-4">Abertura</th>
                  <th className="py-4 px-4">Fechamento</th>
                  <th className="py-4 px-4 text-right">Troco Inicial</th>
                  <th className="py-4 px-4 text-right">Dif. Abertura</th>
                  <th className="py-4 px-4 text-right">Dinheiro Esperado</th>
                  <th className="py-4 px-4 text-right">Contado Gaveta</th>
                  <th className="py-4 px-4 text-right">Dif. Fechamento</th>
                  <th className="py-4 px-6 text-center w-28">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filteredCaixas.length > 0 ? (
                  filteredCaixas.map(c => {
                    const diff = c.status === 'aberto' 
                      ? null 
                      : (c.valor_fechamento_dinheiro || 0) - (c.valor_fechamento_calculado || 0);

                    return (
                      <tr key={c.id} className="hover:bg-brand-border/10 text-xs font-semibold text-gray-300 transition-colors">
                        <td className="py-4 px-6 text-center text-gray-500 font-bold">#{c.id}</td>
                        <td className="py-4 px-4 text-white font-bold">{c.operador_nome}</td>
                        <td className="py-4 px-4 text-gray-400">
                          {new Date(c.data_abertura).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-4">
                          {c.status === 'aberto' ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-brand-success border border-brand-success/20 rounded uppercase text-[9px] font-black animate-pulse">
                              Aberto / Ativo
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {new Date(c.data_fechamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-white">R$ {c.valor_abertura.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right font-black">
                          {c.diferenca_abertura === undefined || c.diferenca_abertura === null || c.diferenca_abertura === 0 ? (
                            <span className="text-gray-500 font-normal">R$ 0,00</span>
                          ) : c.diferenca_abertura > 0 ? (
                            <span className="text-brand-success">+ R$ {c.diferenca_abertura.toFixed(2)}</span>
                          ) : (
                            <span className="text-brand-danger">- R$ {Math.abs(c.diferenca_abertura).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-400">
                          {c.status === 'aberto' ? '---' : `R$ ${c.valor_fechamento_calculado.toFixed(2)}`}
                        </td>
                        <td className="py-4 px-4 text-right text-white font-bold">
                          {c.status === 'aberto' ? '---' : `R$ ${c.valor_fechamento_dinheiro.toFixed(2)}`}
                        </td>
                        <td className="py-4 px-4 text-right font-black">
                          {c.status === 'aberto' ? (
                            <span className="text-gray-500 font-normal">---</span>
                          ) : diff === 0 ? (
                            <span className="text-brand-success">R$ 0,00</span>
                          ) : diff > 0 ? (
                            <span className="text-brand-success">+ R$ {diff.toFixed(2)}</span>
                          ) : (
                            <span className="text-brand-danger">- R$ {Math.abs(diff).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleOpenSessionDetails(c.id)}
                            className="p-2 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white rounded-lg transition-colors border border-brand-border/40 cursor-pointer"
                            title="Ver Relatório de Fechamento"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-500 text-xs font-semibold">
                      Nenhuma sessão de caixa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DETALHES DE TRANSAÇÃO & REIMPRESSÃO (Vendas)
          ======================================================== */}
      {showDetailModal && selectedVenda && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90%] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-brand-border/50 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 size={18} className="text-brand-accent" />
                <span>Transação #{selectedVenda.venda.id}</span>
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-5 bg-brand-dark/30 border border-brand-border/40 rounded-xl p-4 shrink-0 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Operador</span>
                <p className="font-bold text-white mt-0.5">{selectedVenda.venda.usuario_nome}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Data / Hora</span>
                <p className="font-bold text-white mt-0.5">{new Date(selectedVenda.venda.data_venda).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Forma Pagamento</span>
                <p className="font-bold text-brand-accent uppercase mt-0.5">{selectedVenda.venda.forma_pagamento}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Total Líquido</span>
                <p className="font-bold text-brand-success mt-0.5">R$ {selectedVenda.venda.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Itens Vendidos</span>
              {selectedVenda.itens.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-brand-dark/20 border border-brand-border/20 rounded-xl p-3 text-xs font-semibold">
                  <div>
                    <h5 className="text-white font-bold">{item.produto_nome}</h5>
                    <span className="text-[9px] text-gray-500">Cód: {item.codigo_barras}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{item.quantidade} un x R$ {item.preco_unitario.toFixed(2)}</p>
                    <span className="text-[10px] text-brand-success font-bold">R$ {item.total_item.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 pt-6 border-t border-brand-border/50 mt-5 shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
              
              <button
                onClick={() => handleReprintReceipt(selectedVenda)}
                className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Reimprimir Cupom</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DETALHES DE SESSÃO / CONCILIAÇÃO (Caixas)
          ======================================================== */}
      {showSessionModal && selectedSession && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90%] overflow-hidden relative">
            <div className="flex justify-between items-center pb-4 border-b border-brand-border/50 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock size={18} className="text-brand-accent" />
                <span>Caixa Turno #{selectedSession.sessao.id}</span>
              </h3>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 my-5 space-y-6">
              {/* Header Info Grid */}
              <div className="grid grid-cols-3 gap-4 bg-brand-dark/30 border border-brand-border/40 rounded-xl p-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block leading-none mb-1">Operador</span>
                  <span className="text-white text-sm font-bold uppercase">{selectedSession.sessao.operador_nome}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block leading-none mb-1">Abertura</span>
                  <span className="text-white">{new Date(selectedSession.sessao.data_abertura).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block leading-none mb-1">Fechamento</span>
                  <span className="text-white">
                    {selectedSession.sessao.data_fechamento 
                      ? new Date(selectedSession.sessao.data_fechamento).toLocaleString('pt-BR') 
                      : 'ABERTO (EM ANDAMENTO)'
                    }
                  </span>
                </div>
              </div>

              {/* Finance Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-dark/20 border border-brand-border/30 rounded-2xl p-4 space-y-2 text-xs font-semibold text-gray-300">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Fluxo de Caixa Físico</span>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Fundo de Troco Inicial:</span>
                    <span className="text-white">R$ {selectedSession.sessao.valor_abertura.toFixed(2)}</span>
                  </div>
                  {selectedSession.sessao.diferenca_abertura !== undefined && selectedSession.sessao.diferenca_abertura !== null && selectedSession.sessao.diferenca_abertura !== 0 && (
                    <div className="flex justify-between items-center py-0.5 text-xs">
                      <span>Divergência na Abertura:</span>
                      <span className={selectedSession.sessao.diferenca_abertura > 0 ? "text-brand-success font-black" : "text-brand-danger font-black"}>
                        {selectedSession.sessao.diferenca_abertura > 0 ? '+' : ''} R$ {selectedSession.sessao.diferenca_abertura.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-0.5">
                    <span>Vendas em Dinheiro:</span>
                    <span className="text-white">R$ {selectedSession.vendas.dinheiro.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Suprimentos (+):</span>
                    <span className="text-brand-success">
                      R$ {selectedSession.movimentacoes.filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + m.valor, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-brand-border/20 pb-2">
                    <span>Sangrias (-):</span>
                    <span className="text-brand-danger">
                      R$ {selectedSession.movimentacoes.filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + m.valor, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-black text-sm text-brand-accent">
                    <span>Esperado na Gaveta:</span>
                    <span>R$ {(selectedSession.sessao.valor_fechamento_calculado !== null ? selectedSession.sessao.valor_fechamento_calculado : 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-brand-dark/20 border border-brand-border/30 rounded-2xl p-4 space-y-2 text-xs font-semibold text-gray-300">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Outras Formas de Pagamento</span>
                  <div className="flex justify-between items-center py-0.5">
                    <span>PIX QR Code:</span>
                    <span className="text-white">R$ {selectedSession.vendas.pix.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Cartão Débito:</span>
                    <span className="text-white">R$ {selectedSession.vendas.debito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Cartão Crédito:</span>
                    <span className="text-white">R$ {selectedSession.vendas.credito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-brand-border/20 pb-2">
                    <span>Fiado / A Prazo:</span>
                    <span className="text-brand-warning">R$ {selectedSession.vendas.fiado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-black text-sm text-white">
                    <span>Total Faturado Turno:</span>
                    <span>R$ {selectedSession.vendas.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Conciliation results if closed */}
              {selectedSession.sessao.status === 'fechado' && (
                <div className="p-4 bg-brand-dark/30 border border-brand-border/40 rounded-2xl flex justify-between items-center text-xs font-bold">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block leading-none mb-1">Resultado Financeiro Final</span>
                    <div className="flex items-center space-x-2 text-white">
                      <span>Esperado: <span className="text-brand-accent">R$ {selectedSession.sessao.valor_fechamento_calculado.toFixed(2)}</span></span>
                      <span className="text-gray-600">|</span>
                      <span>Contado: <span className="text-white">R$ {selectedSession.sessao.valor_fechamento_dinheiro.toFixed(2)}</span></span>
                    </div>
                  </div>
                  {(() => {
                    const diff = selectedSession.sessao.valor_fechamento_dinheiro - selectedSession.sessao.valor_fechamento_calculado;
                    return (
                      <div className={`py-2 px-4 rounded-xl border uppercase tracking-wider text-[10px] font-black ${
                        diff === 0 
                          ? 'bg-brand-success/15 border-brand-success/30 text-brand-success' 
                          : diff > 0 
                          ? 'bg-brand-success/25 border-brand-success/50 text-brand-success' 
                          : 'bg-brand-danger/15 border-brand-danger/30 text-brand-danger'
                      }`}>
                        {diff === 0 
                          ? '✅ Caixa Correto' 
                          : diff > 0 
                          ? `🌟 Sobra de R$ ${diff.toFixed(2)}` 
                          : `⚠️ Quebra de R$ ${Math.abs(diff).toFixed(2)}`
                        }
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Cash movements breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Registros de Suprimento / Sangria</span>
                {selectedSession.movimentacoes && selectedSession.movimentacoes.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedSession.movimentacoes.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-brand-dark/20 border border-brand-border/20 rounded-xl p-3 text-xs font-semibold">
                        <div>
                          <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                            m.tipo === 'suprimento' ? 'bg-emerald-500/20 text-brand-success' : 'bg-red-500/20 text-brand-danger'
                          }`}>
                            {m.tipo}
                          </span>
                          <span className="text-white ml-2">{m.motivo}</span>
                        </div>
                        <span className={`font-black ${m.tipo === 'suprimento' ? 'text-brand-success' : 'text-brand-danger'}`}>
                          {m.tipo === 'suprimento' ? '+' : '-'} R$ {m.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic p-3 bg-brand-dark/10 rounded-xl text-center">Nenhuma movimentação manual lançada neste caixa.</p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t border-brand-border/50 shrink-0">
              <button
                onClick={() => setShowSessionModal(false)}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar Painel
              </button>
              
              <button
                onClick={() => handleReprintClosure(selectedSession)}
                className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Reimprimir Comprovante</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
