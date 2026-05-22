import React, { useState, useEffect, useRef } from 'react';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { generatePixPayload, generatePixQrCode } from '../services/pix';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  HelpCircle, 
  Tags, 
  Eraser, 
  X, 
  Check, 
  CreditCard, 
  QrCode,
  Scale
} from 'lucide-react';

// Synthetic sound generator
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
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16); // E5
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("AudioContext failed:", e);
  }
}

export default function PDV() {
  const { user } = useAuthStore();
  const { items, discount, addItem, removeItem, updateQty, setDiscount, clearCart, getTotals } = useCartStore();
  
  // Totals calculations
  const { subtotal, total } = getTotals();

  // Search States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Checkout states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro'); // dinheiro, pix, debito, credito
  const [cashPaid, setCashPaid] = useState('');
  const [change, setChange] = useState(0);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState('');
  const [pixSettings, setPixSettings] = useState({
    chavePix: '12345678909',
    beneficiario: 'CONVENIENCIA OFF',
    cidade: 'SAO PAULO'
  });

  // Discount states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState('');

  // Info Display (Supermarket style header showing last item)
  const [lastScannedItem, setLastScannedItem] = useState(null);

  // Helper modals
  const [showHelpModal, setShowHelpModal] = useState(false);

  const barcodeInputRef = useRef(null);

  // Balança de Checkout integration states
  const [scaleConfig, setScaleConfig] = useState({ balancaAtiva: false, balancaPorta: 'SIMULACAO', balancaProtocolo: 'Toledo', balancaPesoSimulado: '1.500' });
  const [showWeighingModal, setShowWeighingModal] = useState(false);
  const [cardSettings, setCardSettings] = useState({ taxaMaquinaCredito: '0', repassarTaxaCredito: false });

  // Load dynamic settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pdv_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPixSettings({
          chavePix: parsed.chavePix || '12345678909',
          beneficiario: parsed.beneficiario || 'CONVENIENCIA OFF',
          cidade: parsed.cidade || 'SAO PAULO'
        });
        setScaleConfig({
          balancaAtiva: parsed.balancaAtiva !== undefined ? parsed.balancaAtiva : false,
          balancaPorta: parsed.balancaPorta || 'SIMULACAO',
          balancaProtocolo: parsed.balancaProtocolo || 'Toledo',
          balancaPesoSimulado: parsed.balancaPesoSimulado || '1.500'
        });
        setCardSettings({
          taxaMaquinaCredito: parsed.taxaMaquinaCredito !== undefined ? parsed.taxaMaquinaCredito : '0',
          repassarTaxaCredito: parsed.repassarTaxaCredito !== undefined ? parsed.repassarTaxaCredito : false
        });
      } catch (e) {
        console.error("Erro ao carregar configurações do PIX e Balança", e);
      }
    }
  }, [showPaymentModal, showWeighingModal]);
  const [weighingProduct, setWeighingProduct] = useState(null);
  const [scaleWeight, setScaleWeight] = useState(0);
  const [manualWeightInput, setManualWeightInput] = useState('');
  const [scaleStatus, setScaleStatus] = useState('lendo'); // lendo, estabilizado, erro

  // Polling scale weight when weighing modal is active
  useEffect(() => {
    let interval;
    if (showWeighingModal && scaleConfig.balancaAtiva && scaleStatus === 'lendo') {
      const fetchWeight = async () => {
        try {
          const res = await api.balanca.lerPeso({
            ativa: scaleConfig.balancaAtiva,
            porta: scaleConfig.balancaPorta,
            protocolo: scaleConfig.balancaProtocolo,
            pesoSimulado: scaleConfig.balancaPesoSimulado
          });
          if (res.sucesso) {
            setScaleWeight(res.peso);
          } else {
            console.error("Erro na leitura da balança:", res.mensagem);
            setScaleStatus('erro');
          }
        } catch (err) {
          console.error("Erro ao ler peso da balança:", err);
          setScaleStatus('erro');
        }
      };
      
      fetchWeight(); // immediate read
      interval = setInterval(fetchWeight, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showWeighingModal, scaleConfig, scaleStatus]);

  const handleConfirmWeighing = () => {
    if (!weighingProduct) return;
    
    let finalWeight = 0;
    if (manualWeightInput) {
      finalWeight = parseFloat(manualWeightInput);
    } else {
      finalWeight = scaleWeight;
    }
    
    if (isNaN(finalWeight) || finalWeight <= 0) {
      playBeep('error');
      alert("Por favor, informe um peso válido maior que zero.");
      return;
    }
    
    addItem(weighingProduct, finalWeight);
    setLastScannedItem({ ...weighingProduct, qty: finalWeight });
    playBeep('success');
    
    // Reset states
    setShowWeighingModal(false);
    setWeighingProduct(null);
    setScaleWeight(0);
    setManualWeightInput('');
    setScaleStatus('lendo');
    focusBarcode();
  };
  
  const handleCancelWeighing = () => {
    setShowWeighingModal(false);
    setWeighingProduct(null);
    setScaleWeight(0);
    setManualWeightInput('');
    setScaleStatus('lendo');
    focusBarcode();
  };

  // Load all products for search autocompletion
  const fetchProducts = async () => {
    try {
      const data = await api.db.getProdutos();
      setAllProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    focusBarcode();
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent browser defaults for functional keys
      if (['F1', 'F2', 'F3', 'F4', 'F5', 'F12'].includes(e.key)) {
        e.preventDefault();
      }

      if (showWeighingModal) {
        if (e.key === 'F2') {
          if (scaleConfig.balancaAtiva) {
            setScaleStatus(prev => prev === 'lendo' ? 'estabilizado' : 'lendo');
            playBeep('success');
          }
        } else if (e.key === 'Enter') {
          handleConfirmWeighing();
        } else if (e.key === 'Escape') {
          handleCancelWeighing();
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          setShowHelpModal(prev => !prev);
          break;
        case 'F3':
          if (!showPaymentModal) {
            setShowDiscountModal(prev => !prev);
          }
          break;
        case 'F4':
          if (items.length > 0) {
            triggerCheckout();
          } else {
            playBeep('error');
          }
          break;
        case 'F5':
          if (!showPaymentModal && !showDiscountModal) {
            if (confirm("Deseja realmente limpar a venda atual?")) {
              clearCart();
              setLastScannedItem(null);
              playBeep('error');
            }
          }
          break;
        case 'F12':
          if (showPaymentModal) {
            handleFinalizeSale();
          }
          break;
        case 'Escape':
          setShowHelpModal(false);
          setShowDiscountModal(false);
          setShowPaymentModal(false);
          focusBarcode();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, showPaymentModal, showDiscountModal, showWeighingModal, scaleWeight, scaleStatus, weighingProduct, manualWeightInput, scaleConfig, paymentMethod, cashPaid, total, discountValue, cardSettings]);

  // Handle cash paid change calculation
  useEffect(() => {
    if (paymentMethod === 'dinheiro' && cashPaid) {
      const paid = parseFloat(cashPaid);
      if (!isNaN(paid)) {
        setChange(Math.max(0, paid - total));
      } else {
        setChange(0);
      }
    } else {
      setChange(0);
    }
  }, [cashPaid, total, paymentMethod]);

  // Handle PIX QR Code generation
  useEffect(() => {
    if (paymentMethod === 'pix') {
      generatePix();
    }
  }, [paymentMethod, total]);

  const generatePix = async () => {
    try {
      // Simulate/Generate PIX payloads using custom settings
      const payload = generatePixPayload({
        chave: pixSettings.chavePix,
        valor: total,
        beneficiario: pixSettings.beneficiario,
        cidade: pixSettings.cidade,
        txid: 'PDV' + Math.floor(1000 + Math.random() * 9000)
      });
      const dataUrl = await generatePixQrCode(payload);
      setPixQrCodeUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  const focusBarcode = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();

    // Check if it is a dynamic scale printed EAN-13 barcode starting with '2'
    if (barcode.length === 13 && barcode.startsWith('2')) {
      const plu = barcode.substring(1, 6);
      const flag = barcode.substring(6, 7);
      const valDigits = barcode.substring(7, 12);
      
      const cleanPlu = plu;
      const intPlu = parseInt(plu, 10).toString();
      
      // Look up in allProducts
      let prod = allProducts.find(p => p.codigo_barras === cleanPlu || p.codigo_barras === intPlu);
      if (!prod) {
        prod = allProducts.find(p => p.id === parseInt(plu, 10));
      }
      
      if (prod) {
        if (prod.unidade === 'KG') {
          let computedWeight = 0;
          if (flag === '2' || flag === '9') {
            // Value is price in cents
            const totalPrice = parseFloat(valDigits) / 100;
            if (prod.preco_venda > 0) {
              computedWeight = parseFloat((totalPrice / prod.preco_venda).toFixed(3));
            }
          } else {
            // Value is weight in grams
            computedWeight = parseFloat(valDigits) / 1000;
          }
          
          if (computedWeight > 0) {
            addItem(prod, computedWeight);
            setLastScannedItem({ ...prod, qty: computedWeight });
            playBeep('success');
            setBarcodeInput('');
            setShowSearchDropdown(false);
            focusBarcode();
            return;
          } else {
            playBeep('error');
            alert("Código de barras de balança com peso ou valor inválido.");
            focusBarcode();
            return;
          }
        } else {
          // Product is UN, parse quantity or default to 1
          let qty = 1;
          if (flag === '2' || flag === '9') {
            const totalPrice = parseFloat(valDigits) / 100;
            if (prod.preco_venda > 0) {
              qty = Math.round(totalPrice / prod.preco_venda);
            }
          } else {
            qty = parseInt(valDigits, 10);
          }
          addItem(prod, qty);
          setLastScannedItem({ ...prod, qty });
          playBeep('success');
          setBarcodeInput('');
          setShowSearchDropdown(false);
          focusBarcode();
          return;
        }
      } else {
        playBeep('error');
        alert(`Produto de balança (PLU: ${intPlu}) não foi encontrado.`);
        focusBarcode();
        return;
      }
    }

    // Standard barcode or code lookup
    const prod = await api.db.buscarProdutoPorCodigo(barcode);
    if (prod) {
      if (prod.unidade === 'KG') {
        setWeighingProduct(prod);
        setShowWeighingModal(true);
        setScaleWeight(0);
        setScaleStatus('lendo');
        setManualWeightInput('');
        playBeep('success');
      } else {
        addItem(prod, 1);
        setLastScannedItem({ ...prod, qty: 1 });
        playBeep('success');
      }
      setBarcodeInput('');
      setShowSearchDropdown(false);
    } else {
      // Try searching by name in all products list
      const matched = allProducts.find(p => p.nome.toLowerCase() === barcode.toLowerCase());
      if (matched) {
        if (matched.unidade === 'KG') {
          setWeighingProduct(matched);
          setShowWeighingModal(true);
          setScaleWeight(0);
          setScaleStatus('lendo');
          setManualWeightInput('');
          playBeep('success');
        } else {
          addItem(matched, 1);
          setLastScannedItem({ ...matched, qty: 1 });
          playBeep('success');
        }
        setBarcodeInput('');
        setShowSearchDropdown(false);
      } else {
        playBeep('error');
        alert("Produto não cadastrado ou código inválido.");
      }
    }
    focusBarcode();
  };

  const handleProductSearchType = (e) => {
    const val = e.target.value;
    setBarcodeInput(val);
    
    if (val.length >= 2) {
      const results = allProducts.filter(p => 
        p.nome.toLowerCase().includes(val.toLowerCase()) || 
        p.codigo_barras.includes(val)
      );
      setProductSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setShowSearchDropdown(false);
    }
  };

  const handleSelectSearchProduct = (prod) => {
    if (prod.unidade === 'KG') {
      setWeighingProduct(prod);
      setShowWeighingModal(true);
      setScaleWeight(0);
      setScaleStatus('lendo');
      setManualWeightInput('');
      playBeep('success');
    } else {
      addItem(prod, 1);
      setLastScannedItem({ ...prod, qty: 1 });
      playBeep('success');
    }
    setBarcodeInput('');
    setShowSearchDropdown(false);
    focusBarcode();
  };

  const triggerCheckout = () => {
    setCashPaid('');
    setChange(0);
    setPaymentMethod('dinheiro');
    setShowPaymentModal(true);
  };

  const handleApplyDiscount = () => {
    const disc = parseFloat(discountValue);
    if (!isNaN(disc)) {
      setDiscount(disc);
    } else {
      setDiscount(0);
    }
    setShowDiscountModal(false);
    focusBarcode();
  };

  const handleFinalizeSale = async () => {
    if (items.length === 0) return;

    const cardFeePct = parseFloat(cardSettings.taxaMaquinaCredito) || 0;
    const isCredit = paymentMethod === 'credito';
    const cardFeeVal = isCredit ? parseFloat((total * (cardFeePct / 100)).toFixed(2)) : 0;
    const saleFinalTotal = isCredit && cardSettings.repassarTaxaCredito ? (total + cardFeeVal) : total;

    const venda = {
      total: saleFinalTotal,
      desconto: discount,
      subtotal,
      forma_pagamento: paymentMethod,
      troco: paymentMethod === 'dinheiro' ? change : 0,
      pago: paymentMethod === 'dinheiro' ? parseFloat(cashPaid || saleFinalTotal) : saleFinalTotal
    };

    const itemsPayload = items.map(item => ({
      produto_id: item.product.id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario
    }));

    try {
      const res = await api.sales.criarVenda(venda, itemsPayload, user.id);
      
      // Chime and Confetti WOW
      playBeep('chime');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366F1', '#10B981', '#F59E0B']
      });

      // Assemble Receipt printing layout
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
              <span class="bold">CUPOM NAO FISCAL</span><br/>
              <span>Venda #${res.id} - ${new Date().toLocaleString('pt-BR')}</span>
            </div>
            <div class="divider"></div>
            
            <div class="bold row">
              <span>Item (Qtd x V.Unit)</span>
              <span>Total</span>
            </div>
            <div class="divider"></div>
            
            ${items.map(item => `
              <div class="item-row">
                <div>${item.product.nome.toUpperCase()}</div>
                <div class="row">
                  <span>&nbsp;&nbsp;${item.product.unidade === 'KG' ? item.quantidade.toFixed(3) : item.quantidade} ${item.product.unidade || 'UN'} x R$ ${item.preco_unitario.toFixed(2)}</span>
                  <span>R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
            
            <div class="divider"></div>
            <div class="row">
              <span>Subtotal:</span>
              <span>R$ ${subtotal.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Desconto:</span>
              <span>R$ ${discount.toFixed(2)}</span>
            </div>
            ${isCredit && cardFeePct > 0 ? (
              cardSettings.repassarTaxaCredito ? `
                <div class="row">
                  <span>Acresc. Cartao (${cardFeePct}%):</span>
                  <span>+ R$ ${cardFeeVal.toFixed(2)}</span>
                </div>
              ` : `
                <div class="row" style="color: #555; font-style: italic;">
                  <span>Taxa Cartao (${cardFeePct}%):</span>
                  <span>R$ ${cardFeeVal.toFixed(2)} (absorvida)</span>
                </div>
              `
            ) : ''}
            <div class="row bold" style="font-size:12px;">
              <span>TOTAL PAGAR:</span>
              <span>R$ ${saleFinalTotal.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="row">
              <span>F. Pagamento:</span>
              <span class="bold">${paymentMethod.toUpperCase()}</span>
            </div>
            ${paymentMethod === 'dinheiro' ? `
              <div class="row">
                <span>Valor Pago:</span>
                <span>R$ ${parseFloat(cashPaid || saleFinalTotal).toFixed(2)}</span>
              </div>
              <div class="row">
                <span>Troco:</span>
                <span>R$ ${change.toFixed(2)}</span>
              </div>
            ` : ''}
            
            <div class="divider"></div>
            <div class="text-center" style="margin-top:10px;">
              <span class="bold">Obrigado pela preferencia!</span><br/>
              <span>Operador: ${user.name}</span>
            </div>
          </body>
        </html>
      `;

      // Trigger automatic background printing via Electron
      await api.print.imprimirCupom(printHtml);

      // Cleanup
      clearCart();
      setLastScannedItem(null);
      setShowPaymentModal(false);
      fetchProducts(); // Refresh stocks locally
      focusBarcode();
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar venda: " + e.message);
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left panel: Barcode reading and Scanned items table */}
      <section className="flex-1 flex flex-col h-full bg-brand-dark/40 p-4 border-r border-brand-border/60">
        
        {/* Upper Supermarket display showing last added product */}
        <div className="h-28 rounded-2xl bg-brand-card/90 border border-brand-border p-4 flex justify-between items-center mb-4 shrink-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-brand-accent"></div>
          {lastScannedItem ? (
            <>
              <div>
                <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">Último Item Scaneado</span>
                <h3 className="text-xl font-bold text-white leading-tight mt-0.5 truncate max-w-lg">{lastScannedItem.nome}</h3>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  EAN: {lastScannedItem.codigo_barras} | Qtd: {lastScannedItem.unidade === 'KG' ? lastScannedItem.qty.toFixed(3) : lastScannedItem.qty} {lastScannedItem.unidade || 'UN'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-bold uppercase block leading-none">Preço Unitário</span>
                <span className="text-3xl font-extrabold text-brand-success">R$ {lastScannedItem.preco_venda.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3 text-gray-500">
              <Search className="h-8 w-8 text-brand-border animate-pulse" />
              <div>
                <h3 className="text-md font-bold">Frente de Caixa Pronta</h3>
                <p className="text-xs font-semibold">Passe um produto no scanner ou digite o nome</p>
              </div>
            </div>
          )}
        </div>

        {/* Barcode Search bar with autocomplete */}
        <div className="relative mb-4 shrink-0">
          <form onSubmit={handleBarcodeSubmit}>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <Search size={18} />
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Escaneie o código de barras ou digite o nome do produto..."
                value={barcodeInput}
                onChange={handleProductSearchType}
                className="w-full bg-brand-card border border-brand-border focus:border-brand-accent rounded-2xl py-4 pl-12 pr-6 text-sm font-semibold text-white placeholder-gray-500 outline-none transition-colors shadow-inner"
              />
            </div>
          </form>

          {/* Autocomplete Dropdown list */}
          {showSearchDropdown && productSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-brand-card border border-brand-border shadow-2xl z-30 max-h-60 overflow-y-auto p-2 space-y-1">
              {productSearchResults.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => handleSelectSearchProduct(prod)}
                  className="w-full flex items-center justify-between p-3 hover:bg-brand-border/40 rounded-xl text-left transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{prod.nome}</p>
                    <span className="text-[10px] text-gray-500 font-semibold">EAN: {prod.codigo_barras}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-brand-success">R$ {prod.preco_venda.toFixed(2)}</p>
                    <span className="text-[10px] text-gray-400 font-medium">Estoque: {prod.estoque_atual} un</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shopping Cart Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-brand-card/30 border border-brand-border/50">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8">
              <span className="text-5xl mb-3">🛒</span>
              <h4 className="text-sm font-bold uppercase tracking-wider">Carrinho Vazio</h4>
              <p className="text-xs text-gray-500 font-medium mt-1">Nenhum produto foi adicionado ainda</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-12 text-center">Item</th>
                  <th className="py-4 px-2">Cód. Barras</th>
                  <th className="py-4 px-2">Produto</th>
                  <th className="py-4 px-2 text-center w-36">Quantidade</th>
                  <th className="py-4 px-2 text-right">V. Unitário</th>
                  <th className="py-4 px-2 text-right">Total</th>
                  <th className="py-4 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {items.map((item, idx) => (
                  <tr key={item.product.id} className="hover:bg-brand-border/10 text-sm font-semibold text-gray-300 transition-colors">
                    <td className="py-4 px-6 text-center text-xs text-gray-500 font-bold">{idx + 1}</td>
                    <td className="py-4 px-2 text-xs text-gray-500 font-medium">{item.product.codigo_barras}</td>
                    <td className="py-4 px-2 text-white truncate max-w-[200px]">{item.product.nome}</td>
                    <td className="py-4 px-2">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            const step = item.product.unidade === 'KG' ? 0.1 : 1;
                            updateQty(item.product.id, parseFloat((item.quantidade - step).toFixed(3)));
                          }}
                          className="h-7 w-7 rounded-lg bg-brand-border/40 hover:bg-brand-border text-gray-300 flex items-center justify-center hover:text-white transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-16 text-center text-sm font-bold text-white">
                          {item.product.unidade === 'KG' ? item.quantidade.toFixed(3) : item.quantidade}
                          <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">{item.product.unidade || 'UN'}</span>
                        </span>
                        <button
                          onClick={() => {
                            const step = item.product.unidade === 'KG' ? 0.1 : 1;
                            updateQty(item.product.id, parseFloat((item.quantidade + step).toFixed(3)));
                          }}
                          className="h-7 w-7 rounded-lg bg-brand-border/40 hover:bg-brand-border text-gray-300 flex items-center justify-center hover:text-white transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">R$ {item.preco_unitario.toFixed(2)}</td>
                    <td className="py-4 px-2 text-right text-white">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          removeItem(item.product.id);
                          playBeep('error');
                        }}
                        className="text-gray-500 hover:text-brand-danger transition-colors p-1 hover:bg-brand-danger/10 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Right panel: Totals Summary & Controls */}
      <aside className="w-[380px] bg-brand-card p-6 flex flex-col justify-between shrink-0 shadow-2xl relative z-10">
        
        {/* Totals Box */}
        <div className="space-y-5">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-brand-accent">Resumo da Venda</h2>
          
          <div className="bg-brand-dark/40 border border-brand-border/80 rounded-2xl p-5 space-y-4 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-bold uppercase">Subtotal</span>
              <span className="text-lg font-bold text-white">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-brand-danger">
              <span className="text-xs font-bold uppercase flex items-center space-x-1">
                <span>Desconto</span>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="p-1 hover:bg-brand-danger/10 rounded"
                  title="Configurar desconto (F3)"
                >
                  <Tags size={12} />
                </button>
              </span>
              <span className="text-lg font-bold">- R$ {discount.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-brand-border/60 pt-4 flex justify-between items-end">
              <span className="text-xs text-gray-400 font-bold uppercase pb-1.5">Total a Pagar</span>
              <span className="text-4xl font-black text-brand-success tracking-tight">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Central keypad action buttons */}
        <div className="space-y-3.5 my-6">
          <button
            onClick={() => setShowDiscountModal(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-brand-border/30 hover:bg-brand-border text-white transition-all font-bold text-sm border border-brand-border/40"
          >
            <div className="flex items-center space-x-3">
              <Tags size={16} className="text-brand-accent" />
              <span>Desconto</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-brand-dark/80 text-[10px] text-gray-400 font-semibold border border-brand-border/50">F3</kbd>
          </button>

          <button
            onClick={triggerCheckout}
            disabled={items.length === 0}
            className="w-full flex items-center justify-between px-5 py-5 rounded-2xl bg-brand-success hover:bg-emerald-500 text-white transition-all font-bold text-base shadow-lg shadow-emerald-500/10 glow-emerald disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <DollarSign size={18} />
              <span>Pagar / Receber</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-emerald-700 text-[10px] text-emerald-100 font-semibold border border-emerald-500">F4</kbd>
          </button>

          <button
            onClick={() => {
              if (confirm("Limpar carrinho atual?")) {
                clearCart();
                setLastScannedItem(null);
                playBeep('error');
              }
            }}
            disabled={items.length === 0}
            className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger transition-all font-semibold text-xs border border-brand-danger/20 disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <Eraser size={14} />
              <span>Limpar Venda</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-brand-dark text-[9px] text-brand-danger/60 font-semibold border border-brand-border/50">F5</kbd>
          </button>
        </div>

        {/* Shortcuts list Footer */}
        <div className="border-t border-brand-border/50 pt-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Atalhos Operacionais</span>
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <HelpCircle size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-gray-400">
            <div className="flex justify-between items-center bg-brand-dark/40 px-3 py-1.5 rounded-lg border border-brand-border/30">
              <span>Ajuda</span>
              <kbd className="px-1.5 py-0.5 bg-brand-card rounded text-gray-500 border border-brand-border">F1</kbd>
            </div>
            <div className="flex justify-between items-center bg-brand-dark/40 px-3 py-1.5 rounded-lg border border-brand-border/30">
              <span>Desconto</span>
              <kbd className="px-1.5 py-0.5 bg-brand-card rounded text-gray-500 border border-brand-border">F3</kbd>
            </div>
            <div className="flex justify-between items-center bg-brand-dark/40 px-3 py-1.5 rounded-lg border border-brand-border/30">
              <span>Checkout</span>
              <kbd className="px-1.5 py-0.5 bg-brand-card rounded text-gray-500 border border-brand-border">F4</kbd>
            </div>
            <div className="flex justify-between items-center bg-brand-dark/40 px-3 py-1.5 rounded-lg border border-brand-border/30">
              <span>Limpar</span>
              <kbd className="px-1.5 py-0.5 bg-brand-card rounded text-gray-500 border border-brand-border">F5</kbd>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MODAL: DESCONTO (F3)
          ======================================================== */}
      {showDiscountModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Tags size={18} className="text-brand-accent" />
                <span>Aplicar Desconto</span>
              </h3>
              <button
                onClick={() => { setShowDiscountModal(false); focusBarcode(); }}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Valor do Desconto (R$)</label>
                <input
                  autoFocus
                  type="number"
                  placeholder="0,00"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-sm font-bold text-white outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => { setShowDiscountModal(false); focusBarcode(); }}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyDiscount}
                  className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PAGAMENTO (F4)
          ======================================================== */}
      {showPaymentModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-2xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl flex animate-in zoom-in-95 duration-150">
            
            {/* Left: Payments selection */}
            <div className="flex-1 pr-6 border-r border-brand-border/50 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-6">Forma de Pagamento</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      paymentMethod === 'dinheiro'
                        ? 'border-brand-accent bg-brand-accent/10 text-white'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    <DollarSign size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase">Dinheiro</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-brand-accent bg-brand-accent/10 text-white'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    <QrCode size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase">PIX QR Code</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('debito')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      paymentMethod === 'debito'
                        ? 'border-brand-accent bg-brand-accent/10 text-white'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    <CreditCard size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase">Cartão Débito</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('credito')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      paymentMethod === 'credito'
                        ? 'border-brand-accent bg-brand-accent/10 text-white'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    <CreditCard size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase">Cartão Crédito</span>
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => { setShowPaymentModal(false); focusBarcode(); }}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs transition-colors"
                >
                  Voltar ao Caixa (Esc)
                </button>
                <button
                  onClick={handleFinalizeSale}
                  className="flex-1 bg-brand-success hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2"
                >
                  <Check size={14} />
                  <span>Finalizar (F12)</span>
                </button>
              </div>
            </div>

            {/* Right: Dynamic Payment Inputs & Change Calculations */}
            <div className="w-[240px] pl-6 flex flex-col justify-between">
              
              <div className="space-y-6">
                {(() => {
                  const cardFeePct = parseFloat(cardSettings.taxaMaquinaCredito) || 0;
                  const isCredit = paymentMethod === 'credito';
                  const cardFeeVal = isCredit ? parseFloat((total * (cardFeePct / 100)).toFixed(2)) : 0;
                  const finalTotal = isCredit && cardSettings.repassarTaxaCredito ? (total + cardFeeVal) : total;
                  
                  return (
                    <>
                      {isCredit && cardFeePct > 0 ? (
                        <>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Original</span>
                            <span className="text-lg font-bold text-gray-400 line-through">R$ {total.toFixed(2)}</span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-brand-dark/40 border border-brand-border/60 space-y-1.5 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-gray-400 uppercase">Taxa Máquina ({cardFeePct}%)</span>
                              <span className={cardSettings.repassarTaxaCredito ? 'text-brand-accent' : 'text-brand-danger'}>
                                {cardSettings.repassarTaxaCredito ? '+' : '-'} R$ {cardFeeVal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="text-gray-500 font-bold uppercase">Operação</span>
                              <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                cardSettings.repassarTaxaCredito 
                                  ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/20' 
                                  : 'bg-brand-danger/20 text-brand-danger border border-brand-danger/20'
                              }`}>
                                {cardSettings.repassarTaxaCredito ? 'Repassar' : 'Absorvida'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total a Pagar</span>
                            <span className="text-3xl font-black text-brand-success tracking-tight">R$ {finalTotal.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase block">Total a Pagar</span>
                          <span className="text-3xl font-black text-brand-success tracking-tight">R$ {total.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Dinheiro option: Input amount received */}
                      {paymentMethod === 'dinheiro' && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Recebido</label>
                            <input
                              autoFocus
                              type="number"
                              placeholder="R$ 0,00"
                              value={cashPaid}
                              onChange={(e) => setCashPaid(e.target.value)}
                              className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-sm font-bold text-white outline-none"
                            />
                          </div>

                          <div className="p-4 rounded-xl bg-brand-dark/40 border border-brand-border/60">
                            <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none">Troco</span>
                            <span className="text-2xl font-black text-brand-warning">R$ {change.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* PIX Option: Displays QR Code */}
                      {paymentMethod === 'pix' && (
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-gray-200">
                          {pixQrCodeUrl ? (
                            <img src={pixQrCodeUrl} alt="PIX QR Code" className="w-40 h-40 shrink-0" />
                          ) : (
                            <div className="w-40 h-40 flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg text-xs font-semibold">
                              Gerando QR Code...
                            </div>
                          )}
                          <span className="text-[9px] text-gray-800 font-bold mt-2 uppercase tracking-wide">Pague com PIX estático</span>
                        </div>
                      )}

                      {/* Debit & Credit Option */}
                      {(paymentMethod === 'debito' || paymentMethod === 'credito') && (
                        <div className="p-4 rounded-xl bg-brand-dark/40 border border-brand-border/60 text-center flex flex-col items-center justify-center space-y-2 py-8">
                          <CreditCard className="h-8 w-8 text-brand-accent animate-pulse" />
                          <p className="text-xs text-gray-400 font-bold leading-normal">
                            Insira ou aproxime o cartão na maquininha do estabelecimento.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="text-center text-[10px] text-gray-500 font-semibold uppercase leading-none pb-1">
                Pressione F12 para imprimir
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: AJUDA (F1)
          ======================================================= */}
      {showHelpModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <HelpCircle size={18} className="text-brand-accent" />
                <span>Atalhos Teclado - Frente de Caixa</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-sm font-semibold text-gray-300">
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Abrir Guia de Ajuda</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">F1</kbd>
              </div>
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Adicionar Desconto</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">F3</kbd>
              </div>
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Abrir Checkout / Receber</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">F4</kbd>
              </div>
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Limpar Venda Atual</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">F5</kbd>
              </div>
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Finalizar Pagamento</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">F12</kbd>
              </div>
              <div className="flex justify-between items-center bg-brand-dark/40 p-3 rounded-xl border border-brand-border/40">
                <span>Fechar qualquer tela</span>
                <kbd className="px-2.5 py-1 bg-brand-card rounded text-brand-accent border border-brand-border font-bold">ESC</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-brand-border hover:bg-brand-border/80 text-white font-bold py-3.5 rounded-xl text-xs mt-6 transition-colors"
            >
              Fechar Guia
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PESAGEM DA BALANÇA
          ======================================================== */}
      {showWeighingModal && weighingProduct && (
        <div className="absolute inset-0 bg-brand-dark/85 backdrop-blur-md flex items-center justify-center z-50 select-none">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 relative overflow-hidden">
            {/* Decorative Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl"></div>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-brand-success/10 rounded-2xl text-brand-success border border-brand-success/20">
                  <Scale className={`h-6 w-6 ${scaleStatus === 'lendo' && scaleConfig.balancaAtiva ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <span className="text-[10px] text-brand-success font-extrabold uppercase tracking-widest">Pesagem Automática</span>
                  <h3 className="text-lg font-bold text-white leading-tight">{weighingProduct.nome}</h3>
                </div>
              </div>
              <button
                onClick={handleCancelWeighing}
                className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-brand-border/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Neon Green Weight Indicator Display */}
            <div className="bg-brand-dark/60 border border-brand-border rounded-2xl p-6 mb-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              <div className="absolute top-3 left-4 flex items-center space-x-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  !scaleConfig.balancaAtiva
                    ? 'bg-gray-600'
                    : scaleStatus === 'lendo'
                    ? 'bg-brand-success animate-ping'
                    : scaleStatus === 'estabilizado'
                    ? 'bg-brand-success'
                    : 'bg-brand-danger animate-pulse'
                }`}></span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  {!scaleConfig.balancaAtiva 
                    ? 'Balança Desativada' 
                    : scaleStatus === 'lendo' 
                    ? 'Pesando...' 
                    : scaleStatus === 'estabilizado' 
                    ? 'Peso Estabilizado' 
                    : 'Erro na Balança'}
                </span>
              </div>
              
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Peso Atual</div>
              <div className="flex items-baseline space-x-2 text-emerald-400 font-mono">
                <span className="text-6xl font-black tracking-tighter drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  {manualWeightInput 
                    ? parseFloat(manualWeightInput || '0').toFixed(3) 
                    : scaleWeight.toFixed(3)}
                </span>
                <span className="text-xl font-bold uppercase text-emerald-400/80">KG</span>
              </div>

              {/* Price calculations preview */}
              <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-brand-border/40 text-center">
                <div>
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block">Preço por KG</span>
                  <span className="text-sm font-bold text-white">R$ {weighingProduct.preco_venda.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block">Valor Total</span>
                  <span className="text-sm font-bold text-brand-success">
                    R$ {((manualWeightInput ? parseFloat(manualWeightInput || '0') : scaleWeight) * weighingProduct.preco_venda).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Override Input */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Digitação Manual do Peso (KG)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.000"
                  value={manualWeightInput}
                  onChange={(e) => setManualWeightInput(e.target.value)}
                  className="w-full bg-brand-dark/40 border border-brand-border focus:border-brand-accent rounded-xl py-3.5 pl-4 pr-12 text-sm font-bold text-white outline-none transition-colors shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmWeighing();
                    }
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 uppercase">KG</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Insira o peso manualmente se a balança estiver desligada ou instável.</p>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleCancelWeighing}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Cancelar (Esc)
              </button>
              
              {scaleConfig.balancaAtiva && (
                <button
                  onClick={() => setScaleStatus(prev => prev === 'lendo' ? 'estabilizado' : 'lendo')}
                  className={`flex-1 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all border ${
                    scaleStatus === 'estabilizado'
                      ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/30 hover:bg-brand-warning/20'
                      : 'bg-brand-accent/10 text-brand-accent border-brand-accent/30 hover:bg-brand-accent/20'
                  }`}
                >
                  {scaleStatus === 'estabilizado' ? 'Retomar Leitura (F2)' : 'Estabilizar Peso (F2)'}
                </button>
              )}

              <button
                onClick={handleConfirmWeighing}
                className="flex-1 bg-brand-success hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 glow-emerald"
              >
                Confirmar (Enter)
              </button>
            </div>
            
            {/* Active Port Info Banner */}
            {scaleConfig.balancaAtiva && (
              <div className="mt-4 pt-3 border-t border-brand-border/20 text-center">
                <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">
                  Conectado na Porta: <span className="text-brand-accent">{scaleConfig.balancaPorta}</span> | Protocolo: <span className="text-brand-accent">{scaleConfig.balancaProtocolo}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
