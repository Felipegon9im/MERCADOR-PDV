// Safely calls Electron IPC APIs, providing console fallback for web browser testing/mocking
const api = {
  auth: {
    login: async (username, password) => {
      if (window.api) return window.api.auth.login(username, password);
      console.warn("Electron API not found. Mocking login in browser.");
      if (username === 'admin' && password === 'admin123') {
        return { id: 1, username: 'admin', role: 'admin', name: 'Admin Web Mock' };
      }
      return null;
    },
    getUsuarios: async () => {
      if (window.api) return window.api.auth.getUsuarios();
      return [{ id: 1, username: 'admin', role: 'admin', name: 'Admin Web Mock', active: 1 }];
    },
    salvarUsuario: async (user) => {
      if (window.api) return window.api.auth.salvarUsuario(user);
      return { id: user.id || 99 };
    },
    getLogs: async () => {
      if (window.api) return window.api.auth.getLogs();
      return [{ id: 1, usuario_id: 1, acao: 'MOCK_LOG', detalhes: 'Logs em modo web', data_acao: new Date().toISOString() }];
    },
    logAcao: async (usuarioId, acao, detalhes) => {
      if (window.api) return window.api.auth.logAcao(usuarioId, acao, detalhes);
      console.log(`[ACTION LOG] User: ${usuarioId}, Action: ${acao}, Details: ${detalhes}`);
      return { id: 1 };
    }
  },
  
  db: {
    getCategorias: async () => {
      if (window.api) return window.api.db.getCategorias();
      return [{ id: 1, nome: 'Mercearia' }, { id: 2, nome: 'Bebidas' }];
    },
    salvarCategoria: async (nome) => {
      if (window.api) return window.api.db.salvarCategoria(nome);
      return { id: 99, nome };
    },
    getProdutos: async () => {
      if (window.api) return window.api.db.getProdutos();
      return [
        { id: 1, codigo_barras: '7891000100101', nome: 'Coca-Cola Lata 350ml', categoria_id: 2, categoria_nome: 'Bebidas', preco_custo: 2.20, preco_venda: 4.50, estoque_atual: 48, estoque_minimo: 10 },
        { id: 2, codigo_barras: '7891000100102', nome: 'Cerveja Heineken Long Neck 330ml', categoria_id: 2, categoria_nome: 'Bebidas', preco_custo: 4.50, preco_venda: 8.90, estoque_atual: 24, estoque_minimo: 6 }
      ];
    },
    buscarProdutoPorCodigo: async (codigo) => {
      if (window.api) return window.api.db.buscarProdutoPorCodigo(codigo);
      const prods = [
        { id: 1, codigo_barras: '7891000100101', nome: 'Coca-Cola Lata 350ml', categoria_id: 2, categoria_nome: 'Bebidas', preco_custo: 2.20, preco_venda: 4.50, estoque_atual: 48, estoque_minimo: 10 },
        { id: 2, codigo_barras: '7891000100102', nome: 'Cerveja Heineken Long Neck 330ml', categoria_id: 2, categoria_nome: 'Bebidas', preco_custo: 4.50, preco_venda: 8.90, estoque_atual: 24, estoque_minimo: 6 }
      ];
      return prods.find(p => p.codigo_barras === codigo) || null;
    },
    salvarProduto: async (product, usuarioId) => {
      if (window.api) return window.api.db.salvarProduto(product, usuarioId);
      return { id: product.id || 99 };
    },
    ajustarEstoque: async (produtoId, quantidade, tipo, motivo, usuarioId) => {
      if (window.api) return window.api.db.ajustarEstoque(produtoId, quantidade, tipo, motivo, usuarioId);
      return { success: true, novoEstoque: 99 };
    },
    getMovimentacoesEstoque: async () => {
      if (window.api) return window.api.db.getMovimentacoesEstoque();
      return [];
    },
    excluirProduto: async (id, usuarioId) => {
      if (window.api) return window.api.db.excluirProduto(id, usuarioId);
      console.log(`[API MOCK] Excluindo produto: ${id} pelo usuário ${usuarioId}`);
      return { success: true };
    }
  },
  
  sales: {
    criarVenda: async (venda, itens, usuarioId) => {
      if (window.api) return window.api.sales.criarVenda(venda, itens, usuarioId);
      console.log("Criando venda mockada:", { venda, itens, usuarioId });
      return { id: Math.floor(Math.random() * 1000) };
    },
    getVendas: async () => {
      if (window.api) return window.api.sales.getVendas();
      return [];
    },
    getVendaDetalhes: async (vendaId) => {
      if (window.api) return window.api.sales.getVendaDetalhes(vendaId);
      return null;
    },
    getDashboardStats: async (periodo) => {
      if (window.api) return window.api.sales.getDashboardStats(periodo);
      return { faturamento: 1250.50, totalVendas: 18, ticketMedio: 69.47, lucro: 425.20, estoqueBaixo: 3, topProdutos: [] };
    },
    getGraficoVendas: async () => {
      if (window.api) return window.api.sales.getGraficoVendas();
      return { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'], data: [120, 190, 300, 500, 200, 300, 450] };
    }
  },
  
  xml: {
    importarNotaFiscal: async (xmlData, usuarioId) => {
      if (window.api) return window.api.xml.importarNotaFiscal(xmlData, usuarioId);
      return { id: 99 };
    },
    getFornecedores: async () => {
      if (window.api) return window.api.xml.getFornecedores();
      return [];
    },
    getNotasImportadas: async () => {
      if (window.api) return window.api.xml.getNotasImportadas();
      return [];
    }
  },

  balanca: {
    lerPeso: async (config) => {
      if (window.api) return window.api.balanca.lerPeso(config);
      
      // High-fidelity browser simulation
      const { pesoSimulado } = config || {};
      let peso = pesoSimulado !== undefined && pesoSimulado !== null ? parseFloat(pesoSimulado) : null;
      if (peso === null) {
        // Dynamic fluctuation in browser
        const base = 1.450;
        const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
        peso = parseFloat((base + fluctuation).toFixed(3));
        if (peso < 0) peso = 0;
      }
      return {
        sucesso: true,
        peso,
        simulado: true,
        porta: 'MOCK_NAVEGADOR',
        mensagem: 'Simulação de navegador ativa.'
      };
    }
  },

  print: {
    imprimirCupom: async (htmlContent) => {
      if (window.api) return window.api.print.imprimirCupom(htmlContent);
      console.log("Printing content in browser:", htmlContent);
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      return { success: true };
    }
  },
  
  backup: {
    exportarBanco: async () => {
      if (window.api) return window.api.backup.exportarBanco();
      alert("Recurso de backup disponível apenas no Desktop (Electron)");
      return { success: false, message: 'Não disponível no navegador' };
    },
    restaurarBanco: async () => {
      if (window.api) return window.api.backup.restaurarBanco();
      alert("Recurso de restauração disponível apenas no Desktop (Electron)");
      return { success: false, message: 'Não disponível no navegador' };
    }
  },
  
  licenca: {
    getMachineId: async () => {
      if (window.api && window.api.licenca) return window.api.licenca.getMachineId();
      console.warn("Electron License API not found. Mocking Machine ID in browser.");
      return 'MERCADOPDV-DEVELOPER-MOCK-UUID-12345';
    }
  }
};

export default api;
