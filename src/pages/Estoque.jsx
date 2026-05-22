import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Sliders, 
  Check, 
  X, 
  AlertOctagon, 
  FolderPlus, 
  History,
  Trash2,
  DollarSign,
  TrendingUp,
  Layers
} from 'lucide-react';

export default function Estoque() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals visibility
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Form states
  const [currentProduct, setCurrentProduct] = useState({
    id: null,
    codigo_barras: '',
    nome: '',
    categoria_id: '',
    preco_custo: 0,
    preco_venda: 0,
    estoque_atual: 0,
    estoque_minimo: 5,
    unidade: 'UN'
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    produtoId: null,
    produtoNome: '',
    quantidade: '',
    tipo: 'entrada', // entrada, saida, ajuste
    motivo: ''
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = async () => {
    try {
      const prods = await api.db.getProdutos();
      setProducts(prods);

      const cats = await api.db.getCategorias();
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate profit margin helper
  const calculateMargin = (cost, sale) => {
    const c = parseFloat(cost) || 0;
    const s = parseFloat(sale) || 0;
    if (c <= 0) return 0;
    return ((s - c) / c) * 100;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!currentProduct.nome || !currentProduct.categoria_id) return;

    try {
      await api.db.salvarProduto(currentProduct, 1);
      setShowProductModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao salvar produto: " + err.message);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await api.db.salvarCategoria(newCategoryName.trim());
      setNewCategoryName('');
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao salvar categoria: " + err.message);
    }
  };

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    const qty = parseFloat(stockAdjustment.quantidade);
    if (isNaN(qty) || !stockAdjustment.produtoId) return;

    try {
      await api.db.ajustarEstoque(
        stockAdjustment.produtoId,
        qty,
        stockAdjustment.tipo,
        stockAdjustment.motivo || 'Ajuste manual administrativo',
        1
      );
      setShowStockModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao ajustar estoque: " + err.message);
    }
  };

  const confirmDeleteProduct = (prod) => {
    setProductToDelete(prod);
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await api.db.excluirProduto(productToDelete.id, 1);
      if (res.success) {
        setShowDeleteModal(false);
        setProductToDelete(null);
        loadData();
      } else {
        alert("Erro ao excluir produto: " + res.message);
      }
    } catch (err) {
      alert("Erro ao excluir produto: " + err.message);
    }
  };

  const openNewProductModal = () => {
    setCurrentProduct({
      id: null,
      codigo_barras: '',
      nome: '',
      categoria_id: categories[0]?.id || '',
      preco_custo: 0,
      preco_venda: 0,
      estoque_atual: 0,
      estoque_minimo: 5,
      unidade: 'UN'
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (prod) => {
    setCurrentProduct({
      id: prod.id,
      codigo_barras: prod.codigo_barras,
      nome: prod.nome,
      categoria_id: prod.categoria_id,
      preco_custo: prod.preco_custo,
      preco_venda: prod.preco_venda,
      estoque_atual: prod.estoque_atual,
      estoque_minimo: prod.estoque_minimo,
      unidade: prod.unidade || 'UN'
    });
    setShowProductModal(true);
  };

  const openStockModal = (prod) => {
    setStockAdjustment({
      produtoId: prod.id,
      produtoNome: prod.nome,
      quantidade: '',
      tipo: 'entrada',
      motivo: ''
    });
    setShowStockModal(true);
  };

  // Filter products by name, barcode or category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.codigo_barras && p.codigo_barras.includes(searchTerm));
    const matchesCategory = selectedCategory === '' || p.categoria_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Calculate global stock metrics
  const totalProdutos = filteredProducts.length;
  const totalEstoqueUN = filteredProducts.filter(p => (p.unidade || 'UN') === 'UN').reduce((sum, p) => sum + (p.estoque_atual || 0), 0);
  const totalEstoqueKG = filteredProducts.filter(p => p.unidade === 'KG').reduce((sum, p) => sum + (p.estoque_atual || 0), 0);

  const custoTotal = filteredProducts.reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_custo || 0)), 0);
  const vendaTotal = filteredProducts.reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_venda || 0)), 0);
  const lucroTotal = vendaTotal - custoTotal;
  const margemMedia = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

  return (
    <div className="space-y-8 select-none">
      
      {/* Upper header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
            <Package className="text-brand-accent h-7 w-7" />
            <span>Controle de Estoque</span>
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Gerencie produtos, categorias e movimentações de inventário</p>
        </div>

        {/* Top actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-border/60 hover:bg-brand-border text-gray-300 font-bold text-xs uppercase transition-colors border border-brand-border/80"
          >
            <FolderPlus size={14} />
            <span>Nova Categoria</span>
          </button>
          
          <button
            onClick={openNewProductModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-white font-bold text-xs uppercase transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={14} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Dashboard de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card 1: Total de Produtos */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total de Produtos</span>
            <span className="text-xl font-extrabold text-white mt-1 block">
              {totalProdutos} <span className="text-xs text-gray-500 font-semibold">itens</span>
            </span>
          </div>
        </div>

        {/* Card 2: Quantidade Física */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl">
            <Layers size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Estoque Físico</span>
            <span className="text-sm font-bold text-white mt-0.5 block truncate">
              {totalEstoqueUN.toFixed(0)} un
            </span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block truncate">
              {totalEstoqueKG.toFixed(3)} kg
            </span>
          </div>
        </div>

        {/* Card 3: Custo Total */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Custo de Inventário</span>
            <span className="text-xl font-extrabold text-white mt-1 block">
              R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 4: Valor de Venda Previsto e Lucro */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-brand-warning/10 border border-brand-warning/20 text-brand-warning rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Valor de Venda</span>
            <span className="text-xl font-extrabold text-brand-success mt-0.5 block truncate">
              R$ {vendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-purple-400 font-bold block truncate mt-0.5" title="Margem média estimada">
              Lucro: R$ {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({margemMedia.toFixed(0)}%)
            </span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar row */}
      <div className="grid grid-cols-4 gap-4 bg-brand-card/40 border border-brand-border/50 rounded-2xl p-4">
        
        {/* Search */}
        <div className="col-span-2 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por código de barras ou nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white outline-none transition-colors"
          />
        </div>

        {/* Category select */}
        <div className="col-span-1">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-brand-dark border border-brand-border/60 focus:border-brand-accent rounded-xl py-2.5 px-4 text-xs font-semibold text-gray-300 outline-none transition-colors"
          >
            <option value="">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>

        {/* Quick summary status */}
        <div className="col-span-1 flex items-center justify-end px-2 text-xs font-bold text-gray-500">
          Mostrando {filteredProducts.length} produtos
        </div>

      </div>

      {/* Products Directory Table */}
      <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
              <th className="py-4 px-6">Produto</th>
              <th className="py-4 px-3">Cód. Barras</th>
              <th className="py-4 px-3">Categoria</th>
              <th className="py-4 px-3 text-right">P. Custo</th>
              <th className="py-4 px-3 text-right">P. Venda</th>
              <th className="py-4 px-3 text-right">Margem</th>
              <th className="py-4 px-3 text-center">Estoque Atual</th>
              <th className="py-4 px-3 text-center">Estoque Mín</th>
              <th className="py-4 px-6 text-center w-36">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/30">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(prod => {
                const isCritical = prod.estoque_atual <= prod.estoque_minimo;
                const margin = calculateMargin(prod.preco_custo, prod.preco_venda);
                return (
                  <tr key={prod.id} className="hover:bg-brand-border/10 text-xs font-semibold text-gray-300 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        {isCritical && (
                          <AlertOctagon size={16} className="text-brand-danger shrink-0" title="Estoque abaixo do mínimo!" />
                        )}
                        <span className="text-white font-bold">{prod.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-gray-500">{prod.codigo_barras || 'Sem código'}</td>
                    <td className="py-4 px-3 text-gray-400">{prod.categoria_nome || 'Mercearia'}</td>
                    <td className="py-4 px-3 text-right">R$ {prod.preco_custo.toFixed(2)}</td>
                    <td className="py-4 px-3 text-right text-brand-success">R$ {prod.preco_venda.toFixed(2)}</td>
                    <td className="py-4 px-3 text-right text-purple-400">{margin.toFixed(0)}%</td>
                    <td className="py-4 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        isCritical 
                          ? 'bg-brand-danger/10 border border-brand-danger/20 text-brand-danger' 
                          : 'bg-brand-border/50 border border-brand-border text-gray-300'
                      }`}>
                        {prod.unidade === 'KG' ? prod.estoque_atual.toFixed(3) : prod.estoque_atual.toFixed(0)} {prod.unidade?.toLowerCase() || 'un'}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center text-gray-500">{prod.unidade === 'KG' ? prod.estoque_minimo.toFixed(3) : prod.estoque_minimo.toFixed(0)} {prod.unidade?.toLowerCase() || 'un'}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center items-center space-x-2">
                        
                        {/* Adjust Stock */}
                        <button
                          onClick={() => openStockModal(prod)}
                          className="p-2 bg-brand-border hover:bg-brand-border/80 text-gray-300 hover:text-white rounded-lg transition-colors border border-brand-border/40"
                          title="Ajustar estoque"
                        >
                          <Sliders size={14} />
                        </button>

                        {/* Edit registry */}
                        <button
                          onClick={() => openEditProductModal(prod)}
                          className="p-2 bg-brand-accent/15 border border-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent rounded-lg transition-colors"
                          title="Editar cadastro"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete registry */}
                        <button
                          onClick={() => confirmDeleteProduct(prod)}
                          className="p-2 bg-brand-danger/15 border border-brand-danger/20 hover:bg-brand-danger/30 text-brand-danger rounded-lg transition-colors"
                          title="Excluir produto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="text-center py-12 text-gray-500 text-xs font-semibold">
                  Nenhum produto cadastrado que atenda os filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL: NOVO/EDITAR PRODUTO
          ======================================================== */}
      {showProductModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package size={18} className="text-brand-accent" />
                <span>{currentProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome do Produto</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Arroz Tio João Tipo 1 5kg"
                  value={currentProduct.nome}
                  onChange={(e) => setCurrentProduct({...currentProduct, nome: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Barcode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    placeholder="Ex: 7891234567890"
                    value={currentProduct.codigo_barras}
                    onChange={(e) => setCurrentProduct({...currentProduct, codigo_barras: e.target.value})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
                  <select
                    required
                    value={currentProduct.categoria_id}
                    onChange={(e) => setCurrentProduct({...currentProduct, categoria_id: parseInt(e.target.value)})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Cost price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Preço Custo (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={currentProduct.preco_custo || ''}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value) || 0;
                      let sale = currentProduct.preco_venda;
                      if (!currentProduct.id && cost > 0) {
                        const savedSettings = localStorage.getItem('pdv_settings');
                        let defaultMargin = 30;
                        if (savedSettings) {
                          try {
                            const parsed = JSON.parse(savedSettings);
                            if (parsed.margemLucroPadrao) {
                              defaultMargin = parseFloat(parsed.margemLucroPadrao);
                            }
                          } catch (err) {}
                        }
                        sale = cost * (1 + defaultMargin / 100);
                      }
                      setCurrentProduct({...currentProduct, preco_custo: cost, preco_venda: parseFloat(sale.toFixed(2)) || 0});
                    }}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  />
                </div>

                {/* Sale price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Preço Venda (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={currentProduct.preco_venda || ''}
                    onChange={(e) => setCurrentProduct({...currentProduct, preco_venda: parseFloat(e.target.value) || 0})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  />
                </div>

                {/* Profit Margin Info */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="p-3 bg-brand-dark/40 border border-brand-border rounded-xl text-center">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none">Lucro (Margem)</span>
                    <span className="text-sm font-black text-purple-400">
                      {calculateMargin(currentProduct.preco_custo, currentProduct.preco_venda).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Initial Stock (Only on new product) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Estoque Atual</label>
                  <input
                    disabled={!!currentProduct.id}
                    required
                    type="number"
                    step="0.001"
                    placeholder="Ex: 10"
                    value={currentProduct.estoque_atual}
                    onChange={(e) => setCurrentProduct({...currentProduct, estoque_atual: parseFloat(e.target.value) || 0})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none disabled:opacity-40"
                  />
                  <div className="text-[10px] text-gray-500 font-bold mt-1.5 flex justify-between items-center px-1">
                    <span>Valor Custo Total:</span>
                    <span className="text-purple-400 font-extrabold text-xs">
                      R$ {((currentProduct.estoque_atual || 0) * (currentProduct.preco_custo || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Min stock */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Estoque Mínimo</label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    placeholder="Ex: 5"
                    value={currentProduct.estoque_minimo}
                    onChange={(e) => setCurrentProduct({...currentProduct, estoque_minimo: parseFloat(e.target.value) || 0})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  />
                </div>

                {/* Unidade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Unidade</label>
                  <select
                    value={currentProduct.unidade || 'UN'}
                    onChange={(e) => setCurrentProduct({...currentProduct, unidade: e.target.value})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="KG">KG (Quilo)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3.5 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Salvar Produto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: AJUSTE DE ESTOQUE
          ======================================================== */}
      {showStockModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders size={18} className="text-brand-accent" />
                <span>Movimentar Inventário</span>
              </h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Produto</span>
                <p className="text-sm font-bold text-white mt-0.5">{stockAdjustment.produtoNome}</p>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Operação</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({...stockAdjustment, tipo: 'entrada'})}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      stockAdjustment.tipo === 'entrada'
                        ? 'border-brand-success bg-brand-success/15 text-brand-success'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({...stockAdjustment, tipo: 'saida'})}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      stockAdjustment.tipo === 'saida'
                        ? 'border-brand-danger bg-brand-danger/15 text-brand-danger'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    Saída (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({...stockAdjustment, tipo: 'ajuste'})}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      stockAdjustment.tipo === 'ajuste'
                        ? 'border-brand-warning bg-brand-warning/15 text-brand-warning'
                        : 'border-brand-border bg-brand-dark/40 text-gray-400 hover:bg-brand-border/20'
                    }`}
                  >
                    Ajustar (=)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Quantidade de Ajuste</label>
                <input
                  required
                  autoFocus
                  type="number"
                  placeholder="Digite a quantidade..."
                  value={stockAdjustment.quantidade}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, quantidade: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Motivo / Observação</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Correção de inventário, Descarte, etc."
                  value={stockAdjustment.motivo}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, motivo: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20 animate-pulse"
                >
                  Confirmar Ajuste
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: NOVA CATEGORIA
          ======================================================== */}
      {showCategoryModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderPlus size={18} className="text-brand-accent" />
                <span>Nova Categoria</span>
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome da Categoria</label>
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="Ex: Padaria, Fiambreria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Criar Categoria
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRMAR EXCLUSÃO DE PRODUTO
          ======================================================== */}
      {showDeleteModal && productToDelete && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertOctagon size={18} className="text-brand-danger" />
                <span>Excluir Produto</span>
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProductToDelete(null);
                }}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-2xl">
                <span className="text-[10px] text-brand-danger font-bold uppercase tracking-wider block mb-1">Aviso de Perigo</span>
                <p className="text-xs text-gray-300 font-semibold leading-relaxed">
                  Você está prestes a excluir o produto <strong className="text-white font-bold">{productToDelete.nome}</strong>. Esta ação removerá o produto do estoque permanentemente.
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-semibold italic">
                  * O histórico de vendas anterior será preservado com a indicação 'Produto Excluído'.
                </p>
              </div>

              <div className="space-y-1.5 p-3 bg-brand-dark/40 border border-brand-border rounded-xl">
                <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none mb-1">Detalhes do Produto</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Cód. Barras:</span>
                    <span className="text-white font-bold ml-1 block">{productToDelete.codigo_barras || 'Sem código'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Estoque Atual:</span>
                    <span className="text-white font-bold ml-1 block">
                      {productToDelete.unidade === 'KG' ? productToDelete.estoque_atual.toFixed(3) : productToDelete.estoque_atual.toFixed(0)} {productToDelete.unidade?.toLowerCase() || 'un'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="flex-1 bg-brand-danger hover:bg-brand-danger/80 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
