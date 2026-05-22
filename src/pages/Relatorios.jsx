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
  DollarSign 
} from 'lucide-react';

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [selectedVenda, setSelectedVenda] = useState(null); // { venda, itens }
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const loadVendas = async () => {
    try {
      const data = await api.sales.getVendas();
      setVendas(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadVendas();
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

  const handleReprintReceipt = async (vendaDet) => {
    if (!vendaDet) return;
    const { venda, itens } = vendaDet;

    // Generate same receipt layout
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
            <span class="bold">${venda.forma_pagamento.toUpperCase()}</span>
          </div>
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

  // Filter Logic
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

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
          <BarChart3 className="text-brand-accent h-7 w-7" />
          <span>Histórico de Vendas</span>
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-1">Consulte transações financeiras, imprima segundas vias e audite o caixa</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Total bruto */}
        <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
          <div>
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">Subtotal Acumulado</span>
            <h4 className="text-xl font-black text-white mt-1.5">R$ {totalSubtotal.toFixed(2)}</h4>
          </div>
          <div className="h-9 w-9 rounded-xl bg-brand-border flex items-center justify-center text-gray-400">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Descontos */}
        <div className="glass-panel rounded-2xl p-5 flex justify-between items-center h-24">
          <div>
            <span className="text-[10px] text-brand-danger font-extrabold uppercase tracking-widest">Descontos Concedidos</span>
            <h4 className="text-xl font-black text-brand-danger mt-1.5">- R$ {totalDescontos.toFixed(2)}</h4>
          </div>
          <div className="h-9 w-9 rounded-xl bg-brand-danger/10 text-brand-danger flex items-center justify-center">
            <Tag size={16} />
          </div>
        </div>

        {/* Faturamento Líquido */}
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
        
        {/* Search */}
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

        {/* Payment filter */}
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
          </select>
        </div>

        {/* Counter */}
        <div className="col-span-1 flex items-center justify-end px-2 text-xs font-bold text-gray-500">
          Mostrando {filteredVendas.length} transações
        </div>

      </div>

      {/* Transaction list table */}
      <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden">
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
                    <span className="uppercase text-[10px] bg-brand-border/60 px-2 py-0.5 rounded border border-brand-border">
                      {v.forma_pagamento}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-brand-danger">R$ {v.desconto.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-brand-success font-black">R$ {v.total.toFixed(2)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleOpenDetails(v.id)}
                        className="p-2 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white rounded-lg transition-colors border border-brand-border/40"
                        title="Ver detalhes"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
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

      {/* ========================================================
          MODAL: DETALHES DE TRANSAÇÃO & REIMPRESSÃO
          ======================================================== */}
      {showDetailModal && selectedVenda && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90%] overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-brand-border/50 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 size={18} className="text-brand-accent" />
                <span>Transação #{selectedVenda.venda.id}</span>
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info Summary */}
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

            {/* Item list inside Modal */}
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

            {/* Actions footer */}
            <div className="flex space-x-3 pt-6 border-t border-brand-border/50 mt-5 shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Fechar
              </button>
              
              <button
                onClick={() => handleReprintReceipt(selectedVenda)}
                className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-1.5"
              >
                <Printer size={14} />
                <span>Reimprimir Cupom</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
