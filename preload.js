const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Authentication & Session
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    getUsuarios: () => ipcRenderer.invoke('auth:getUsuarios'),
    salvarUsuario: (user) => ipcRenderer.invoke('auth:salvarUsuario', user),
    getLogs: () => ipcRenderer.invoke('auth:getLogs'),
    logAcao: (usuarioId, acao, detalhes) => ipcRenderer.invoke('auth:logAcao', usuarioId, acao, detalhes)
  },
  
  // Categories & Products & Stock
  db: {
    getCategorias: () => ipcRenderer.invoke('db:getCategorias'),
    salvarCategoria: (nome) => ipcRenderer.invoke('db:salvarCategoria', nome),
    getProdutos: () => ipcRenderer.invoke('db:getProdutos'),
    buscarProdutoPorCodigo: (codigo) => ipcRenderer.invoke('db:buscarProdutoPorCodigo', codigo),
    salvarProduto: (product, usuarioId) => ipcRenderer.invoke('db:salvarProduto', product, usuarioId),
    ajustarEstoque: (produtoId, quantidade, tipo, motivo, usuarioId) => 
      ipcRenderer.invoke('db:ajustarEstoque', produtoId, quantidade, tipo, motivo, usuarioId),
    getMovimentacoesEstoque: () => ipcRenderer.invoke('db:getMovimentacoesEstoque'),
    excluirProduto: (id, usuarioId) => ipcRenderer.invoke('db:excluirProduto', id, usuarioId)
  },
  
  // Sales & Dashboard
  sales: {
    criarVenda: (venda, itens, usuarioId) => ipcRenderer.invoke('sales:criarVenda', venda, itens, usuarioId),
    getVendas: () => ipcRenderer.invoke('sales:getVendas'),
    getVendaDetalhes: (vendaId) => ipcRenderer.invoke('sales:getVendaDetalhes', vendaId),
    getDashboardStats: (periodo) => ipcRenderer.invoke('sales:getDashboardStats', periodo),
    getGraficoVendas: () => ipcRenderer.invoke('sales:getGraficoVendas')
  },
  
  // XML & Suppliers
  xml: {
    importarNotaFiscal: (xmlData, usuarioId) => ipcRenderer.invoke('xml:importarNotaFiscal', xmlData, usuarioId),
    getFornecedores: () => ipcRenderer.invoke('xml:getFornecedores'),
    getNotasImportadas: () => ipcRenderer.invoke('xml:getNotasImportadas')
  },

  // Scale (Balança)
  balanca: {
    lerPeso: (config) => ipcRenderer.invoke('balanca:lerPeso', config)
  },

  // Printing & Backups
  print: {
    imprimirCupom: (htmlContent) => ipcRenderer.invoke('print:imprimirCupom', htmlContent)
  },
  backup: {
    exportarBanco: () => ipcRenderer.invoke('backup:exportar'),
    restaurarBanco: () => ipcRenderer.invoke('backup:restaurar')
  },
  
  // Módulo de Atualizações (GitHub)
  updater: {
    getDetails: () => ipcRenderer.invoke('updater:getDetails'),
    execGitPull: () => ipcRenderer.invoke('updater:execGitPull'),
    downloadAndInstall: (onlineVersion) => ipcRenderer.invoke('updater:downloadAndInstall', onlineVersion),
    onDownloadProgress: (callback) => {
      const subscription = (event, percent) => callback(percent);
      ipcRenderer.on('updater:downloadProgress', subscription);
      return () => {
        ipcRenderer.removeListener('updater:downloadProgress', subscription);
      };
    }
  }
});
