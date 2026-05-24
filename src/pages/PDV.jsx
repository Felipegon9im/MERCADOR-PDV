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
  Scale,
  User
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

  // Cash Register Session states
  const [activeSession, setActiveSession] = useState(null);
  const [alertModal, setAlertModal] = useState(null); // { title, message, type: 'error'|'success', onConfirm }
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [lastClosure, setLastClosure] = useState(null);

  const showAlert = (message, type = 'error', title = 'Aviso', onConfirm = null) => {
    playBeep(type === 'success' ? 'chime' : 'error');
    setAlertModal({ title, message, type, onConfirm });
  };

  const showConfirm = (message, onConfirm) => {
    playBeep('chime');
    setConfirmModal({ message, onConfirm });
  };

  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  
  // Suprimento / Sangria states
  const [showMovModal, setShowMovModal] = useState(false);
  const [movType, setMovType] = useState('suprimento'); // suprimento or sangria
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  
  // Closure states
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureCalculated, setClosureCalculated] = useState(0);
  const [closureCounted, setClosureCounted] = useState('');
  const [closureRelatorio, setClosureRelatorio] = useState(null);

  // Search States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Checkout states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro'); // dinheiro, pix, debito, credito, fiado
  const [cashPaid, setCashPaid] = useState('');
  const [change, setChange] = useState(0);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState('');
  const [pixSettings, setPixSettings] = useState({
    chavePix: '12345678909',
    beneficiario: 'CONVENIENCIA OFF',
    cidade: 'SAO PAULO'
  });

  // Clients states for Venda Fiada
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearchText, setClientSearchText] = useState('');

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
      showAlert("Por favor, informe um peso válido maior que zero.");
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
  // Cash register session check on mount
  const checkSession = async () => {
    try {
      const active = await api.caixa.getSessaoAtiva(user.id);
      if (active) {
        setActiveSession(active);
        setShowOpeningModal(false);
      } else {
        setActiveSession(null);
        setShowOpeningModal(true);
        try {
          const last = await api.caixa.getUltimoFechamento();
          setLastClosure(last);
          if (last && last.valor_fechamento_dinheiro !== null) {
            setOpeningFloat(last.valor_fechamento_dinheiro.toString());
          }
        } catch (e) {
          console.error("Erro ao buscar último fechamento:", e);
        }
      }
    } catch (err) {
      console.error("Erro ao verificar sessão ativa de caixa:", err);
      setShowOpeningModal(true); // Bloqueia por segurança
    }
  };

  const handleOpenCaixa = async (e) => {
    if (e) e.preventDefault();
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) {
      playBeep('error');
      showAlert("Por favor, insira um valor inicial de troco válido (R$ 0,00 ou maior).");
      return;
    }
    try {
      await api.caixa.abrirCaixa(user.id, float);
      playBeep('chime');
      const active = await api.caixa.getSessaoAtiva(user.id);
      setActiveSession(active);
      setShowOpeningModal(false);
      setOpeningFloat('');
      focusBarcode();
    } catch (err) {
      console.error("Erro ao abrir caixa:", err);
      showAlert("Erro ao realizar abertura de caixa: " + err.message);
    }
  };

  const handleLancarMovimentacao = async (e) => {
    if (e) e.preventDefault();
    const val = parseFloat(movAmount);
    if (isNaN(val) || val <= 0) {
      playBeep('error');
      showAlert("Por favor, insira um valor de movimentação válido e maior que zero.");
      return;
    }
    if (!movReason.trim()) {
      playBeep('error');
      showAlert("Por favor, insira o motivo desta movimentação.");
      return;
    }
    
    if (movType === 'sangria') {
      try {
        const resExp = await api.caixa.getValoresEsperadosCaixa(activeSession.id);
        if (resExp && val > resExp.total_esperado) {
          playBeep('error');
          showAlert(`Valor de sangria (R$ ${val.toFixed(2)}) é maior do que o valor total esperado em dinheiro no caixa (R$ ${resExp.total_esperado.toFixed(2)})!`);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    try {
      await api.caixa.lancarMovimentacaoCaixa(activeSession.id, movType, val, movReason.trim(), user.id);
      playBeep('success');
      setShowMovModal(false);
      setMovAmount('');
      setMovReason('');
      focusBarcode();
    } catch (err) {
      console.error("Erro ao lançar movimentação:", err);
      showAlert("Erro ao registrar movimentação de caixa: " + err.message);
    }
  };

  const handleOpenClosure = async () => {
    if (!activeSession) return;
    try {
      const rel = await api.caixa.getRelatorioFechamento(activeSession.id);
      const expected = await api.caixa.getValoresEsperadosCaixa(activeSession.id);
      setClosureRelatorio(rel);
      setClosureCalculated(expected ? expected.total_esperado : 0);
      setClosureCounted('');
      setShowClosureModal(true);
      playBeep('success');
    } catch (err) {
      console.error("Erro ao carregar dados de fechamento:", err);
      showAlert("Erro ao carregar dados para o fechamento: " + err.message);
    }
  };

  const handleConfirmClosure = async () => {
    const counted = parseFloat(closureCounted);
    if (isNaN(counted) || counted < 0) {
      playBeep('error');
      showAlert("Por favor, insira o valor físico contado na gaveta.");
      return;
    }
    
    try {
      await api.caixa.fecharCaixa(activeSession.id, counted, closureCalculated, user.id);
      playBeep('chime');
      
      const movsHtml = closureRelatorio.movimentacoes && closureRelatorio.movimentacoes.length > 0
        ? closureRelatorio.movimentacoes.map(m => `
          <div class="row">
            <span>&nbsp;&nbsp;${m.tipo.toUpperCase()} (${m.motivo}):</span>
            <span>${m.tipo === 'sangria' ? '-' : '+'} R$ ${m.valor.toFixed(2)}</span>
          </div>
        `).join('')
        : '<div>&nbsp;&nbsp;Nenhuma movimentação realizada.</div>';
        
      const diff = counted - closureCalculated;
      const diffMsg = diff === 0 ? "Correto" : diff > 0 ? `Sobra de R$ ${diff.toFixed(2)}` : `Quebra de R$ ${Math.abs(diff).toFixed(2)}`;
      
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
              <span class="bold">COMPROVANTE DE FECHAMENTO</span><br/>
              <span>Caixa #${activeSession.id} - ${new Date().toLocaleString('pt-BR')}</span>
            </div>
            <div class="divider"></div>
            
            <div class="row">
              <span>Operador:</span>
              <span class="bold">${user.name.toUpperCase()}</span>
            </div>
            <div class="row">
              <span>Abertura:</span>
              <span>${new Date(activeSession.data_abertura).toLocaleString('pt-BR')}</span>
            </div>
            <div class="row">
              <span>Fechamento:</span>
              <span>${new Date().toLocaleString('pt-BR')}</span>
            </div>
            
            <div class="divider"></div>
            <div class="section-title">Resumo Financeiro</div>
            <div class="divider"></div>
            <div class="row">
              <span>Fundo de Troco Inicial:</span>
              <span>R$ ${closureRelatorio.sessao.valor_abertura.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Vendas Dinheiro:</span>
              <span>R$ ${closureRelatorio.vendas.dinheiro.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Vendas PIX:</span>
              <span>R$ ${closureRelatorio.vendas.pix.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Vendas Débito:</span>
              <span>R$ ${closureRelatorio.vendas.debito.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Vendas Crédito:</span>
              <span>R$ ${closureRelatorio.vendas.credito.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Vendas Fiado (Prazo):</span>
              <span>R$ ${closureRelatorio.vendas.fiado.toFixed(2)}</span>
            </div>
            <div class="row bold">
              <span>Total Faturado:</span>
              <span>R$ ${closureRelatorio.vendas.total.toFixed(2)}</span>
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
              <span class="bold">R$ ${closureCalculated.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Dinheiro Contado:</span>
              <span class="bold">R$ ${counted.toFixed(2)}</span>
            </div>
            <div class="row bold" style="font-size: 12px;">
              <span>Diferença:</span>
              <span>${diffMsg}</span>
            </div>
            
            <div class="divider"></div>
            <div class="text-center" style="margin-top:20px;">
              <span>Assinatura do Operador:</span><br/><br/>
              <span>_______________________________</span><br/>
              <span class="bold">${user.name.toUpperCase()}</span>
            </div>
          </body>
        </html>
      `;
      
      await api.print.imprimirCupom(closureHtml);
      
      showAlert("Caixa fechado com sucesso!\n\nO comprovante foi enviado para a impressora.\nO sistema retornará para a tela de login.", "success", "Sucesso", async () => {
        const { logout } = useAuthStore.getState();
        await logout();
        window.location.reload();
      });
    } catch (err) {
      console.error("Erro ao fechar caixa:", err);
      showAlert("Erro ao finalizar fechamento: " + err.message);
    }
  };

  // Load all products and clients
  const fetchProducts = async () => {
    try {
      const data = await api.db.getProdutos();
      setAllProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.db.getClientes();
      setClients(data);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    }
  };

  useEffect(() => {
    checkSession();
    fetchProducts();
    fetchClients();
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
            showConfirm("Deseja realmente limpar a venda atual?", () => {
              clearCart();
              setLastScannedItem(null);
              playBeep('error');
            });
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
      const plu6 = barcode.substring(1, 7);
      const plu5 = barcode.substring(1, 6);
      const flag = barcode.substring(6, 7);
      const valDigits = barcode.substring(7, 12);
      
      const intPlu6 = parseInt(plu6, 10).toString();
      const intPlu5 = parseInt(plu5, 10).toString();
      
      // Look up in allProducts using 6-digit PLU and 5-digit PLU
      let prod = allProducts.find(p => 
        p.codigo_barras === plu6 || p.codigo_barras === intPlu6 ||
        p.codigo_barras === plu5 || p.codigo_barras === intPlu5 ||
        p.id === parseInt(plu6, 10) || p.id === parseInt(plu5, 10)
      );
      
      if (prod) {
        const isKg = prod.tipo_produto === 'KG' || prod.unidade === 'KG';
        if (isKg) {
          let computedWeight = 0;
          if (flag === '0' || flag === '2' || flag === '9') {
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
            showAlert("Código de barras de balança com peso ou valor inválido.");
            focusBarcode();
            return;
          }
        } else {
          // Product is UN, parse quantity or default to 1
          let qty = 1;
          if (flag === '0' || flag === '2' || flag === '9') {
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
        showAlert(`Produto de balança (PLU: ${intPlu6} / ${intPlu5}) não foi encontrado.`);
        focusBarcode();
        return;
      }
    }

    // Standard barcode or code lookup
    const prod = await api.db.buscarProdutoPorCodigo(barcode);
    if (prod) {
      const isKg = prod.tipo_produto === 'KG' || prod.unidade === 'KG';
      if (isKg) {
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
        const isKg = matched.tipo_produto === 'KG' || matched.unidade === 'KG';
        if (isKg) {
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
        focusBarcode();
      } else {
        playBeep('error');
        showAlert("Produto não cadastrado ou código inválido.");
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
    const isKg = prod.tipo_produto === 'KG' || prod.unidade === 'KG';
    if (isKg) {
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
    setSelectedClientId('');
    setSelectedClient(null);
    setClientSearchText('');
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

    if (paymentMethod === 'fiado') {
      if (!selectedClientId) {
        playBeep('error');
        showAlert("Por favor, selecione um cliente para realizar a venda fiada.");
        return;
      }
      const client = clients.find(c => c.id === parseInt(selectedClientId, 10));
      if (client) {
        const totalComDebito = (client.saldo_devedor || 0) + total;
        if (client.limite_credito > 0 && totalComDebito > client.limite_credito) {
          playBeep('error');
          showAlert(`Esta venda ultrapassa o limite de crédito do cliente ${client.nome}!\n\nLimite: R$ ${client.limite_credito.toFixed(2)}\nSaldo Devedor Atual: R$ ${(client.saldo_devedor || 0).toFixed(2)}\nValor da Venda: R$ ${total.toFixed(2)}\nTotal Acumulado: R$ ${totalComDebito.toFixed(2)}`);
          return;
        }
      }
    }

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
      pago: paymentMethod === 'dinheiro' ? parseFloat(cashPaid || saleFinalTotal) : saleFinalTotal,
      cliente_id: paymentMethod === 'fiado' && selectedClientId ? parseInt(selectedClientId, 10) : null
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
                  <span>&nbsp;&nbsp;${item.product.tipo_produto === 'KG' || item.product.unidade === 'KG' ? item.quantidade.toFixed(3) : item.quantidade} ${(item.product.unidade || 'UN')} x R$ ${item.preco_unitario.toFixed(2)}</span>
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
              <span class="bold">${paymentMethod === 'fiado' ? 'FIADO (A PRAZO)' : paymentMethod.toUpperCase()}</span>
            </div>
            ${paymentMethod === 'fiado' && selectedClientId ? (() => {
              const client = clients.find(c => c.id === parseInt(selectedClientId, 10));
              return client ? `
                <div class="row">
                  <span>Cliente:</span>
                  <span class="bold">${client.nome.toUpperCase()}</span>
                </div>
                <div class="row">
                  <span>Divida Acumulada:</span>
                  <span class="bold">R$ ${((client.saldo_devedor || 0) + saleFinalTotal).toFixed(2)}</span>
                </div>
              ` : '';
            })() : ''}
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
      showAlert("Erro ao finalizar venda: " + e.message);
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
                  EAN: {lastScannedItem.codigo_barras} | Qtd: {lastScannedItem.tipo_produto === 'KG' || lastScannedItem.unidade === 'KG' ? lastScannedItem.qty.toFixed(3) : lastScannedItem.qty} {lastScannedItem.unidade || 'UN'}
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
                            const isKg = item.product.tipo_produto === 'KG' || item.product.unidade === 'KG';
                            const step = isKg ? 0.100 : 1;
                            updateQty(item.product.id, parseFloat((item.quantidade - step).toFixed(3)));
                          }}
                          className="h-7 w-7 rounded-lg bg-brand-border/40 hover:bg-brand-border text-gray-300 flex items-center justify-center hover:text-white transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-16 text-center text-sm font-bold text-white">
                          {item.product.tipo_produto === 'KG' || item.product.unidade === 'KG' ? item.quantidade.toFixed(3) : item.quantidade}
                          <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">{item.product.unidade || 'UN'}</span>
                        </span>
                        <button
                          onClick={() => {
                            const isKg = item.product.tipo_produto === 'KG' || item.product.unidade === 'KG';
                            const step = isKg ? 0.100 : 1;
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
              showConfirm("Limpar carrinho atual?", () => {
                clearCart();
                setLastScannedItem(null);
                playBeep('error');
              });
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

        {/* Controle de Fluxo de Caixa */}
        {activeSession && (
          <div className="border-t border-brand-border/50 pt-5 space-y-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Fluxo de Caixa (Turno #{activeSession.id})</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMovType('suprimento'); setShowMovModal(true); }}
                className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl bg-brand-border/20 hover:bg-brand-border/40 text-white font-bold text-xs border border-brand-border/30 transition-all cursor-pointer"
              >
                <span>📥 Suprimento</span>
              </button>
              <button
                onClick={() => { setMovType('sangria'); setShowMovModal(true); }}
                className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl bg-brand-border/20 hover:bg-brand-border/40 text-white font-bold text-xs border border-brand-border/30 transition-all cursor-pointer"
              >
                <span>📤 Sangria</span>
              </button>
            </div>
            <button
              onClick={handleOpenClosure}
              className="w-full flex items-center justify-center space-x-2 px-3 py-3.5 rounded-xl bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger font-black text-xs border border-brand-danger/30 transition-all uppercase tracking-wider cursor-pointer"
            >
              <span>🏁 Fechar Caixa (Fim de Turno)</span>
            </button>
          </div>
        )}

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

                  <button
                    onClick={() => setPaymentMethod('fiado')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all col-span-2 ${
                      paymentMethod === 'fiado'
                        ? 'border-brand-accent bg-brand-accent/10 text-white'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <User size={18} className={paymentMethod === 'fiado' ? 'text-brand-accent' : 'text-gray-400'} />
                      <span className="text-xs font-bold uppercase">Venda Fiada / Prazo</span>
                    </div>
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

                      {/* Fiado (Prazo) option: Select client and show balance info */}
                      {paymentMethod === 'fiado' && (
                        <div className="space-y-4 text-left">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block">Selecionar Cliente</label>
                            
                            <select
                              value={selectedClientId}
                              onChange={(e) => {
                                const cId = e.target.value;
                                setSelectedClientId(cId);
                                if (cId) {
                                  const cObj = clients.find(c => c.id === parseInt(cId, 10));
                                  setSelectedClient(cObj);
                                } else {
                                  setSelectedClient(null);
                                }
                              }}
                              className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-3 text-xs font-bold text-white outline-none"
                            >
                              <option value="">-- Selecione o Cliente --</option>
                              {clients.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.nome} {c.cpf ? `(${c.cpf})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedClient && (
                            <div className="p-4 rounded-xl bg-brand-dark/40 border border-brand-border/60 space-y-2 animate-in fade-in duration-200 text-xs font-semibold text-left">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 uppercase text-[9px] font-bold">Saldo Devedor:</span>
                                <span className="text-brand-warning font-black">R$ {(selectedClient.saldo_devedor || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 uppercase text-[9px] font-bold">Limite de Crédito:</span>
                                <span className="text-white font-bold">
                                  {selectedClient.limite_credito > 0 
                                    ? `R$ ${selectedClient.limite_credito.toFixed(2)}` 
                                    : 'Sem Limite'
                                  }
                                </span>
                              </div>
                              <div className="border-t border-brand-border/40 pt-2 flex justify-between items-center">
                                <span className="text-gray-500 uppercase text-[9px] font-bold">Limite Disponível:</span>
                                <span className={`font-black ${
                                  (selectedClient.limite_credito > 0 && (selectedClient.limite_credito - (selectedClient.saldo_devedor || 0) - total) < 0)
                                    ? 'text-brand-danger font-black animate-pulse'
                                    : 'text-brand-success font-black'
                                  }`}>
                                  {selectedClient.limite_credito > 0 
                                    ? `R$ ${Math.max(0, selectedClient.limite_credito - (selectedClient.saldo_devedor || 0)).toFixed(2)}` 
                                    : 'Ilimitado'
                                  }
                                </span>
                              </div>

                              {selectedClient.limite_credito > 0 && (selectedClient.limite_credito - (selectedClient.saldo_devedor || 0) - total) < 0 && (
                                <div className="text-[10px] text-brand-danger font-black text-center mt-1 border-t border-brand-danger/20 pt-1.5 leading-tight">
                                  VALOR DA VENDA EXCEDE O LIMITE DISPONÍVEL!
                                </div>
                              )}
                            </div>
                          )}

                          {clients.length === 0 && (
                            <div className="text-[10px] text-brand-warning font-bold text-center leading-normal p-2 bg-brand-warning/10 border border-brand-warning/20 rounded-xl">
                              Nenhum cliente cadastrado no sistema. Cadastre clientes no painel administrativo retaguarda.
                            </div>
                          )}
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
            <div className="space-y-2 mb-6 text-left">
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

      {/* ========================================================
          MODAL: ABERTURA DE CAIXA (FORÇADA SE SEM SESSÃO)
          ======================================================== */}
      {showOpeningModal && (
        <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-md flex items-center justify-center z-50 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Decorative Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/15 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <div className="h-16 w-16 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-2xl flex items-center justify-center mb-6">
              <DollarSign size={32} />
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">Abertura de Caixa</h3>
            <p className="text-xs text-gray-400 text-center mb-6 max-w-xs font-semibold leading-relaxed">
              Olá, <span className="text-brand-accent">{user?.name}</span>! Para iniciar as vendas do dia, informe o valor de troco disponível na gaveta do caixa.
            </p>

            {lastClosure && (
              <div className="w-full bg-brand-dark/50 border border-brand-border/60 rounded-2xl p-4 mb-4 text-left animate-in fade-in duration-200">
                <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">📥 ÚLTIMO FECHAMENTO OPERACIONAL</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <div className="text-gray-400">Operador:</div>
                  <div className="text-white text-right font-bold truncate">{lastClosure.operador_nome.toUpperCase()}</div>
                  
                  <div className="text-gray-400">Data/Hora:</div>
                  <div className="text-white text-right">{new Date(lastClosure.data_fechamento).toLocaleString('pt-BR')}</div>
                  
                  <div className="text-gray-400">Troco deixado (gaveta):</div>
                  <div className="text-brand-success text-right font-black">R$ {lastClosure.valor_fechamento_dinheiro.toFixed(2)}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleOpenCaixa} className="w-full space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fundo de Troco Inicial (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-gray-500">R$</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-2xl py-4 pl-12 pr-4 text-lg font-black text-white outline-none transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { logout } = useAuthStore.getState();
                    await logout();
                    window.location.reload();
                  }}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Sair do Sistema
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-success hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 glow-emerald cursor-pointer"
                >
                  Iniciar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MOVIMENTAÇÃO DE CAIXA (SUPRIMENTO / SANGRIA)
          ======================================================== */}
      {showMovModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <DollarSign size={18} className="text-brand-accent" />
                <span>{movType === 'suprimento' ? 'Lançar Suprimento (Entrada)' : 'Lançar Sangria (Retirada)'}</span>
              </h3>
              <button
                onClick={() => { setShowMovModal(false); focusBarcode(); }}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLancarMovimentacao} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">R$</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Justificativa / Motivo</label>
                <textarea
                  placeholder={movType === 'suprimento' ? "Ex: Troco para moedas" : "Ex: Sangria de segurança (acumulado)"}
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  rows="3"
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowMovModal(false); focusBarcode(); }}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors text-white cursor-pointer ${
                    movType === 'suprimento' 
                      ? 'bg-brand-success hover:bg-emerald-500 shadow-lg shadow-emerald-500/10' 
                      : 'bg-brand-danger hover:bg-red-500 shadow-lg shadow-red-500/10'
                  }`}
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FECHAMENTO DE CAIXA
          ======================================================== */}
      {showClosureModal && closureRelatorio && (
        <div className="absolute inset-0 bg-brand-dark/85 backdrop-blur-md flex items-center justify-center z-50 select-none">
          <div className="w-full max-w-2xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl flex animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto relative overflow-hidden">
            {/* Decorative Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-danger/10 rounded-full blur-3xl"></div>
            
            <div className="flex-1 pr-6 border-r border-brand-border/50 space-y-6">
              <div>
                <span className="text-[10px] text-brand-accent font-extrabold uppercase tracking-widest block mb-1">Encerramento de Turno</span>
                <h3 className="text-lg font-bold text-white leading-tight">Resumo Operacional de Caixa</h3>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none mb-1">Abertura / Fundo Troco</span>
                  <span className="text-base font-black text-white">R$ {closureRelatorio.sessao.valor_abertura.toFixed(2)}</span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none mb-1">Vendas Dinheiro</span>
                  <span className="text-base font-black text-white">R$ {closureRelatorio.vendas.dinheiro.toFixed(2)}</span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none mb-1">Suprimentos (+)</span>
                  <span className="text-base font-black text-brand-success">R$ {(closureRelatorio.movimentacoes || []).filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + m.valor, 0).toFixed(2)}</span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none mb-1">Sangrias (-)</span>
                  <span className="text-base font-black text-brand-danger">R$ {(closureRelatorio.movimentacoes || []).filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + m.valor, 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods breakdown */}
              <div className="space-y-2 bg-brand-dark/20 border border-brand-border/30 rounded-2xl p-4 text-xs font-semibold text-gray-300">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Outros Meios (Sem Efeito em Dinheiro Gaveta)</span>
                <div className="flex justify-between items-center py-1">
                  <span>PIX:</span>
                  <span className="text-white">R$ {closureRelatorio.vendas.pix.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Cartão Débito:</span>
                  <span className="text-white">R$ {closureRelatorio.vendas.debito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Cartão Crédito:</span>
                  <span className="text-white">R$ {closureRelatorio.vendas.credito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-brand-border/20 pt-2">
                  <span>Fiado (A Prazo):</span>
                  <span className="text-brand-warning">R$ {closureRelatorio.vendas.fiado.toFixed(2)}</span>
                </div>
              </div>

              {/* Expected Total */}
              <div className="p-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-bold text-brand-accent uppercase tracking-widest block leading-none mb-1">Dinheiro Esperado na Gaveta</span>
                  <span className="text-[10px] text-gray-400 font-medium">Fórmula: Inicial + Vendas Dinheiro + Suprimentos - Sangrias</span>
                </div>
                <span className="text-2xl font-black text-brand-accent">R$ {closureCalculated.toFixed(2)}</span>
              </div>
            </div>

            {/* Right side: counting input and reconciliation */}
            <div className="w-[280px] pl-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Conciliação</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Conte as cédulas e moedas físicas na gaveta e digite abaixo.</p>
                </div>

                {/* Input for counted cash */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dinheiro Físico Contado (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-gray-500">R$</span>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={closureCounted}
                      onChange={(e) => setClosureCounted(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-2xl py-4 pl-12 pr-4 text-xl font-black text-white outline-none transition-colors shadow-inner"
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmClosure()}
                    />
                  </div>
                </div>

                {/* Live Reconciliation Calculations */}
                {(() => {
                  const countedVal = parseFloat(closureCounted || '0');
                  const diff = countedVal - closureCalculated;
                  
                  return (
                    <div className="p-4 rounded-2xl bg-brand-dark/40 border border-brand-border/60 space-y-3">
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block leading-none">Resultado da Conciliação</span>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-gray-400">Diferença de Caixa:</span>
                        <span className={`font-black text-sm ${
                          diff === 0 
                            ? 'text-brand-success' 
                            : diff > 0 
                            ? 'text-brand-success' 
                            : 'text-brand-danger'
                        }`}>
                          {diff === 0 
                            ? 'R$ 0,00' 
                            : diff > 0 
                            ? `+ R$ ${diff.toFixed(2)}` 
                            : `- R$ ${Math.abs(diff).toFixed(2)}`
                          }
                        </span>
                      </div>
                      
                      {/* Badge status */}
                      <div className={`py-2 px-3 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider text-center leading-none ${
                        diff === 0
                          ? 'bg-brand-success/15 border-brand-success/30 text-brand-success'
                          : diff > 0
                          ? 'bg-brand-success/20 border-brand-success/40 text-brand-success animate-pulse'
                          : 'bg-brand-danger/15 border-brand-danger/30 text-brand-danger animate-pulse'
                      }`}>
                        {diff === 0 
                          ? '✅ CAIXA CORRETO' 
                          : diff > 0 
                          ? '🌟 SOBRA DE CAIXA' 
                          : '⚠️ QUEBRA DE CAIXA (FALTA)'
                        }
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-8">
                <button
                  onClick={() => { setShowClosureModal(false); focusBarcode(); }}
                  className="w-full bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Voltar ao Caixa (Esc)
                </button>
                <button
                  onClick={handleConfirmClosure}
                  className="w-full bg-brand-danger hover:bg-red-500 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-500/10 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <X size={14} />
                  <span>Fechar Caixa e Imprimir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ALERT CUSTOM MODAL (NO-BLOCKING)
          ======================================================== */}
      {alertModal && (
        <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md flex items-center justify-center z-50 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl"></div>
            
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${
              alertModal.type === 'success' 
                ? 'bg-brand-success/10 border border-brand-success/20 text-brand-success' 
                : 'bg-brand-danger/10 border border-brand-danger/20 text-brand-danger'
            }`}>
              {alertModal.type === 'success' ? <Check size={24} /> : <X size={24} />}
            </div>

            <h3 className="text-md font-bold text-white text-center mb-2">{alertModal.title || 'Alerta'}</h3>
            <p className="text-xs text-gray-400 text-center mb-6 max-w-xs font-semibold leading-relaxed whitespace-pre-line">
              {alertModal.message}
            </p>

            <button
              onClick={() => {
                const onConf = alertModal.onConfirm;
                setAlertModal(null);
                if (onConf) onConf();
                focusBarcode();
              }}
              className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM CUSTOM MODAL (NO-BLOCKING)
          ======================================================== */}
      {confirmModal && (
        <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-sm flex items-center justify-center z-50 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="h-12 w-12 bg-brand-warning/10 border border-brand-warning/20 text-brand-warning rounded-xl flex items-center justify-center mb-4">
              <HelpCircle size={24} />
            </div>

            <h3 className="text-md font-bold text-white text-center mb-2">Confirmação</h3>
            <p className="text-xs text-gray-400 text-center mb-6 max-w-xs font-semibold leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex space-x-3 w-full">
              <button
                onClick={() => { setConfirmModal(null); focusBarcode(); }}
                className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Não
              </button>
              <button
                onClick={() => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal(null);
                  if (onConf) onConf();
                  focusBarcode();
                }}
                className="flex-1 bg-brand-danger hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-red-500/10"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
