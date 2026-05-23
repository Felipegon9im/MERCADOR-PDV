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
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState({
    id: null,
    nome: '',
    controle_estoque: 0,
    estoque_atual: 0,
    preco_custo: 0
  });
  const [selectedCategoryYield, setSelectedCategoryYield] = useState(null);
  const [movements, setMovements] = useState([]);

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
    unidade: 'UN',
    tipo_produto: 'UNIDADE'
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    produtoId: null,
    categoriaId: null,
    produtoNome: '',
    quantidade: '',
    tipo: 'entrada', // entrada, saida, ajuste
    motivo: ''
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryControleEstoque, setNewCategoryControleEstoque] = useState(0);
  const [newCategoryEstoqueAtual, setNewCategoryEstoqueAtual] = useState('');
  const [newCategoryPrecoCusto, setNewCategoryPrecoCusto] = useState('');

  const loadData = async () => {
    try {
      const prods = await api.db.getProdutos();
      setProducts(prods);

      const cats = await api.db.getCategorias();
      setCategories(cats);

      const movs = await api.db.getMovimentacoesEstoque();
      setMovements(movs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Enforce Açougue rules on product modal (lock to KG, 0 stock) when category changes
  useEffect(() => {
    if (currentProduct.categoria_id) {
      const selectedCat = categories.find(c => c.id === currentProduct.categoria_id);
      if (selectedCat && selectedCat.controle_estoque === 1) {
        setCurrentProduct(prev => {
          if (prev.tipo_produto !== 'KG' || prev.unidade !== 'KG' || prev.estoque_atual !== 0) {
            return {
              ...prev,
              tipo_produto: 'KG',
              unidade: 'KG',
              estoque_atual: 0
            };
          }
          return prev;
        });
      }
    }
  }, [currentProduct.categoria_id, categories]);

  // Calculate profit margin helper
  const calculateMargin = (cost, sale) => {
    const c = parseFloat(cost) || 0;
    const s = parseFloat(sale) || 0;
    if (c <= 0) return 0;
    return ((s - c) / c) * 100;
  };

  // Calculate total stock cost value per category
  const getCategoryStockValue = (categoryId) => {
    return products
      .filter(p => p.categoria_id === categoryId)
      .reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_custo || 0)), 0);
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
      await api.db.salvarCategoria({
        nome: newCategoryName.trim(),
        controle_estoque: newCategoryControleEstoque,
        estoque_atual: parseFloat(newCategoryEstoqueAtual) || 0,
        preco_custo: parseFloat(newCategoryPrecoCusto) || 0
      });
      setNewCategoryName('');
      setNewCategoryControleEstoque(0);
      setNewCategoryEstoqueAtual('');
      setNewCategoryPrecoCusto('');
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao salvar categoria: " + err.message);
    }
  };

  const handleSaveEditCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory.nome.trim()) return;

    try {
      await api.db.salvarCategoria({
        id: editingCategory.id,
        nome: editingCategory.nome.trim(),
        controle_estoque: editingCategory.controle_estoque,
        estoque_atual: parseFloat(editingCategory.estoque_atual) || 0,
        preco_custo: parseFloat(editingCategory.preco_custo) || 0
      });
      setShowEditCategoryModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao editar categoria: " + err.message);
    }
  };

  const openCategoryStockModal = (cat) => {
    setStockAdjustment({
      produtoId: null,
      categoriaId: cat.id,
      produtoNome: `LOTE/BRUTO: ${cat.nome}`,
      quantidade: '',
      tipo: 'entrada',
      motivo: ''
    });
    setShowStockModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCategory({
      id: cat.id,
      nome: cat.nome,
      controle_estoque: cat.controle_estoque || 0,
      estoque_atual: cat.estoque_atual || 0,
      preco_custo: cat.preco_custo || 0
    });
    setShowEditCategoryModal(true);
  };

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    const qty = parseFloat(stockAdjustment.quantidade);
    if (isNaN(qty)) return;

    try {
      if (stockAdjustment.categoriaId) {
        await api.db.ajustarEstoqueCategoria(
          stockAdjustment.categoriaId,
          qty,
          stockAdjustment.tipo,
          stockAdjustment.motivo || 'Ajuste manual de categoria',
          1
        );
      } else {
        if (!stockAdjustment.produtoId) return;
        await api.db.ajustarEstoque(
          stockAdjustment.produtoId,
          qty,
          stockAdjustment.tipo,
          stockAdjustment.motivo || 'Ajuste manual administrativo',
          1
        );
      }
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
      unidade: 'UN',
      tipo_produto: 'UNIDADE'
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
      unidade: prod.unidade || 'UN',
      tipo_produto: prod.tipo_produto || (prod.unidade === 'KG' ? 'KG' : 'UNIDADE')
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

  // Calculate global stock metrics without double counting shared category stock
  const totalProdutos = filteredProducts.length;
  
  const totalEstoqueUN = filteredProducts
    .filter(p => (p.tipo_produto || 'UNIDADE') === 'UNIDADE')
    .reduce((sum, p) => sum + (p.estoque_atual || 0), 0);
    
  const standardKgProducts = filteredProducts.filter(p => p.tipo_produto === 'KG' && p.controle_estoque_categoria !== 1);
  const standardKgStock = standardKgProducts.reduce((sum, p) => sum + (p.estoque_atual || 0), 0);
  
  const sharedCategoryIds = [...new Set(filteredProducts.filter(p => p.controle_estoque_categoria === 1).map(p => p.categoria_id))];
  const sharedKgStock = sharedCategoryIds.reduce((sum, catId) => {
    const cat = categories.find(c => c.id === catId);
    return sum + (cat ? (cat.estoque_atual || 0) : 0);
  }, 0);
  
  const totalEstoqueKG = standardKgStock + sharedKgStock;

  const standardCusto = filteredProducts
    .filter(p => p.controle_estoque_categoria !== 1)
    .reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_custo || 0)), 0);
    
  const sharedCusto = sharedCategoryIds.reduce((sum, catId) => {
    const cat = categories.find(c => c.id === catId);
    return sum + (cat ? ((cat.estoque_atual || 0) * (cat.preco_custo || 0)) : 0);
  }, 0);
  
  const custoTotal = standardCusto + sharedCusto;

  const standardVenda = filteredProducts
    .filter(p => p.controle_estoque_categoria !== 1)
    .reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_venda || 0)), 0);
    
  const sharedVenda = sharedCategoryIds.reduce((sum, catId) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return sum;
    const catProds = filteredProducts.filter(p => p.categoria_id === catId);
    if (catProds.length === 0) return sum;
    const avgPrice = catProds.reduce((s, p) => s + (p.preco_venda || 0), 0) / catProds.length;
    return sum + ((cat.estoque_atual || 0) * avgPrice);
  }, 0);
  
  const vendaTotal = standardVenda + sharedVenda;
  const lucroTotal = vendaTotal - custoTotal;
  const margemMedia = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

  // Calculate yield/rendimento for butcher categories
  const calculateCategoryYield = (categoryId) => {
    let totalEntradas = 0;
    let totalVendido = 0;
    let totalPerdas = 0;
    let faturamento = 0;

    movements.forEach(m => {
      let isCat = false;
      let prod = null;
      if (m.categoria_id === categoryId) {
        isCat = true;
      } else if (m.produto_id) {
        prod = products.find(p => p.id === m.produto_id);
        if (prod && prod.categoria_id === categoryId) {
          isCat = true;
        }
      }

      if (isCat) {
        if (m.tipo === 'entrada') {
          totalEntradas += Math.abs(m.quantidade);
        } else if (m.tipo === 'saida') {
          const qty = Math.abs(m.quantidade);
          if (m.motivo && m.motivo.startsWith('Venda')) {
            totalVendido += qty;
            const price = prod ? prod.preco_venda : (products.find(p => p.categoria_id === categoryId)?.preco_venda || 0);
            faturamento += qty * price;
          } else {
            totalPerdas += qty;
          }
        }
      }
    });

    const rendimento = totalEntradas > 0 ? (totalVendido / totalEntradas) * 100 : 0;
    return {
      totalEntradas,
      totalVendido,
      totalPerdas,
      rendimento,
      faturamento
    };
  };

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
            onClick={() => setShowManageCategoriesModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-border/60 hover:bg-brand-border text-gray-300 font-bold text-xs uppercase transition-colors border border-brand-border/80"
          >
            <Sliders size={14} className="text-purple-400" />
            <span>Gerenciar Categorias</span>
          </button>

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
            {categories.map(cat => {
              const value = getCategoryStockValue(cat.id);
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.nome} (R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </option>
              );
            })}
          </select>
        </div>

        {/* Quick summary status */}
        <div className="col-span-1 flex items-center justify-end px-2 text-xs font-bold text-gray-500">
          Mostrando {filteredProducts.length} produtos
        </div>

      </div>

      {/* Category Quick Stats & Filter Badges */}
      <div className="flex flex-wrap gap-2.5 animate-in fade-in duration-200">
        <button
          onClick={() => setSelectedCategory('')}
          className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
            selectedCategory === ''
              ? 'bg-brand-accent/20 border-brand-accent text-white shadow-lg shadow-indigo-500/10'
              : 'bg-brand-card/40 border-brand-border/50 text-gray-400 hover:bg-brand-border/10 hover:text-gray-300'
          }`}
        >
          <span>📦 Todas as Categorias</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${selectedCategory === '' ? 'bg-brand-accent/30 text-white' : 'bg-brand-border text-gray-400'}`}>
            R$ {products.reduce((sum, p) => sum + ((p.estoque_atual || 0) * (p.preco_custo || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>

        {categories.map(cat => {
          const val = getCategoryStockValue(cat.id);
          const isSelected = selectedCategory === cat.id.toString();
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id.toString())}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? 'bg-brand-accent/20 border-brand-accent text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-brand-card/40 border-brand-border/50 text-gray-400 hover:bg-brand-border/10 hover:text-gray-300'
              }`}
            >
              <span>📁 {cat.nome}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${isSelected ? 'bg-brand-accent/30 text-white' : 'bg-brand-border text-gray-400'}`}>
                R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>
          );
        })}
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
                      {prod.controle_estoque_categoria === 1 ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-400" title="Estoque compartilhado com o peso bruto da categoria">
                          {prod.estoque_atual.toFixed(3)} kg (Lote)
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          isCritical 
                            ? 'bg-brand-danger/10 border border-brand-danger/20 text-brand-danger' 
                            : 'bg-brand-border/50 border border-brand-border text-gray-300'
                        }`}>
                          {prod.tipo_produto === 'KG' || prod.unidade === 'KG' ? prod.estoque_atual.toFixed(3) : prod.estoque_atual.toFixed(0)} {(prod.unidade || 'UN').toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center text-gray-500">{prod.tipo_produto === 'KG' || prod.unidade === 'KG' ? prod.estoque_minimo.toFixed(3) : prod.estoque_minimo.toFixed(0)} {(prod.unidade || 'UN').toLowerCase()}</td>
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

              {(() => {
                const selectedCat = categories.find(c => c.id === currentProduct.categoria_id);
                const isAcougueCategory = selectedCat && selectedCat.controle_estoque === 1;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Tipo de Produto */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Produto</label>
                        <select
                          disabled={isAcougueCategory}
                          value={currentProduct.tipo_produto || 'UNIDADE'}
                          onChange={(e) => {
                            const type = e.target.value;
                            const unit = type === 'KG' ? 'KG' : 'UN';
                            setCurrentProduct({...currentProduct, tipo_produto: type, unidade: unit});
                          }}
                          className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none disabled:opacity-50"
                        >
                          <option value="UNIDADE">UNIDADE (Mercado Comum)</option>
                          <option value="KG">KG (Açougue / Frios)</option>
                        </select>
                      </div>

                      {/* Estoque Inicial */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">
                          Estoque Inicial ({currentProduct.unidade || 'UN'})
                        </label>
                        <input
                          disabled={!!currentProduct.id || isAcougueCategory}
                          required={!isAcougueCategory}
                          type="number"
                          step="0.001"
                          placeholder={isAcougueCategory ? "Não necessário" : "Ex: 0"}
                          value={isAcougueCategory ? 0 : currentProduct.estoque_atual}
                          onChange={(e) => {
                            if (!isAcougueCategory) {
                              setCurrentProduct({...currentProduct, estoque_atual: parseFloat(e.target.value) || 0});
                            }
                          }}
                          className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none disabled:opacity-40"
                        />
                      </div>

                      {/* Estoque Mínimo */}
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
                    </div>

                    <div className="text-[10px] text-gray-500 font-bold mt-1 bg-brand-dark/30 border border-brand-border/40 p-2.5 rounded-xl flex justify-between items-center">
                      <span>
                        {isAcougueCategory 
                          ? "🥩 Estoque centralizado por peso bruto: produto cadastrado na categoria de açougue. Não necessita estoque individual."
                          : currentProduct.tipo_produto === 'KG' 
                            ? "⚖️ Peso variável: dê entrada no peso total. O preço de venda refere-se ao quilo." 
                            : "📦 Unidade de estoque fixo. O preço de venda refere-se à unidade inteira."}
                      </span>
                      <span className="text-purple-400 font-extrabold text-xs">
                        {isAcougueCategory 
                          ? "Estoque da Categoria"
                          : `Custo Total: R$ ${((currentProduct.estoque_atual || 0) * (currentProduct.preco_custo || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  </>
                );
              })()}

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
                  step="0.001"
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

              {/* Toggle Controle Estoque */}
              <div className="p-3 bg-brand-dark/30 border border-brand-border/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estoque por Peso Bruto (Açougue)</span>
                  <span className="text-[10px] text-gray-500 font-semibold block leading-tight mt-0.5">Controla o estoque centralizado na categoria</span>
                </div>
                <input
                  type="checkbox"
                  checked={newCategoryControleEstoque === 1}
                  onChange={(e) => setNewCategoryControleEstoque(e.target.checked ? 1 : 0)}
                  className="h-4 w-4 text-brand-accent focus:ring-0 rounded border-brand-border bg-brand-dark"
                />
              </div>

              {newCategoryControleEstoque === 1 && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-3 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Peso Bruto Inicial (KG)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={newCategoryEstoqueAtual}
                      onChange={(e) => setNewCategoryEstoqueAtual(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Preço de Custo (R$/KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newCategoryPrecoCusto}
                      onChange={(e) => setNewCategoryPrecoCusto(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                    />
                  </div>
                </div>
              )}

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

      {/* ========================================================
          MODAL: GERENCIAR CATEGORIAS & RENDIMENTOS
          ======================================================== */}
      {showManageCategoriesModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-4xl bg-brand-card border border-brand-border rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders size={18} className="text-brand-accent" />
                <span>Administração e Rendimento de Categorias</span>
              </h3>
              <button
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setSelectedCategoryYield(null);
                }}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Rendimento Card Toggle Area */}
            {selectedCategoryYield && (
              <div className="p-5 bg-brand-dark/50 border border-brand-border rounded-2xl mb-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-purple-400 uppercase flex items-center space-x-2">
                    <span>📊 Rendimento e Rendimento do Corte:</span>
                    <span className="text-white font-black">{categories.find(c => c.id === selectedCategoryYield)?.nome}</span>
                  </h4>
                  <button 
                    onClick={() => setSelectedCategoryYield(null)}
                    className="text-[10px] text-gray-400 hover:text-white font-bold uppercase"
                  >
                    Fechar Relatório
                  </button>
                </div>
                
                {(() => {
                  const yld = calculateCategoryYield(selectedCategoryYield);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3.5 bg-brand-dark/40 border border-brand-border rounded-xl">
                          <span className="text-[9px] text-gray-500 font-bold block uppercase leading-none mb-1.5">Peso Recebido (Entrada Lote)</span>
                          <span className="text-sm font-black text-white">{yld.totalEntradas.toFixed(3)} kg</span>
                        </div>
                        <div className="p-3.5 bg-brand-dark/40 border border-brand-border rounded-xl">
                          <span className="text-[9px] text-gray-500 font-bold block uppercase leading-none mb-1.5">Peso Comercializado</span>
                          <span className="text-sm font-black text-brand-success">{yld.totalVendido.toFixed(3)} kg</span>
                        </div>
                        <div className="p-3.5 bg-brand-dark/40 border border-brand-border rounded-xl">
                          <span className="text-[9px] text-gray-500 font-bold block uppercase leading-none mb-1.5">Descartes (Ossos/Gordura/Quebra)</span>
                          <span className="text-sm font-black text-brand-danger">{yld.totalPerdas.toFixed(3)} kg</span>
                        </div>
                        <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col justify-center">
                          <span className="text-[9px] text-purple-400 font-bold block uppercase leading-none mb-1.5">Aproveitamento Real</span>
                          <span className="text-base font-black text-purple-300">{yld.rendimento.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-brand-dark/60 border border-brand-border rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold block uppercase leading-none mb-1">Previsão de Faturamento</span>
                          <span className="text-xs text-gray-400 font-semibold">Baseado nas vendas dos subcortes vinculados</span>
                        </div>
                        <span className="text-lg font-black text-brand-success">
                          R$ {yld.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Últimas Movimentações */}
                      <div className="mt-4 border-t border-brand-border/30 pt-4">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">📜 Histórico de Últimas Movimentações do Lote</span>
                        
                        {(() => {
                          const catMovements = movements.filter(m => {
                            if (m.categoria_id === selectedCategoryYield) return true;
                            if (m.produto_id) {
                              const prod = products.find(p => p.id === m.produto_id);
                              return prod && prod.categoria_id === selectedCategoryYield;
                            }
                            return false;
                          });

                          if (catMovements.length === 0) {
                            return (
                              <p className="text-center py-4 text-xs text-gray-500 font-semibold italic">Nenhuma movimentação registrada para esta categoria.</p>
                            );
                          }

                          return (
                            <div className="max-h-48 overflow-y-auto border border-brand-border/40 bg-brand-dark/30 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-brand-border/50 text-[9px] text-gray-500 font-bold uppercase bg-brand-card/50">
                                    <th className="py-2.5 px-4">Data / Hora</th>
                                    <th className="py-2.5 px-4">Operação</th>
                                    <th className="py-2.5 px-4 text-right">Qtd</th>
                                    <th className="py-2.5 px-4">Motivo / Produto</th>
                                    <th className="py-2.5 px-4">Operador</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/20 font-semibold text-gray-300">
                                  {catMovements.slice(0, 15).map(m => {
                                    const formattedDate = m.data_movimentacao 
                                      ? new Date(m.data_movimentacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                      : 'Sem data';
                                    
                                    const isPositive = m.tipo === 'entrada';
                                    const isAdjustment = m.tipo === 'ajuste';
                                    const prefix = isPositive ? '+' : isAdjustment ? '=' : '';
                                    const colorClass = isPositive ? 'text-brand-success' : isAdjustment ? 'text-brand-warning' : 'text-brand-danger';

                                    return (
                                      <tr key={m.id} className="hover:bg-brand-border/10">
                                        <td className="py-2 px-4 text-[11px] text-gray-400">{formattedDate}</td>
                                        <td className="py-2 px-4 uppercase text-[10px]">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            isPositive ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 
                                            isAdjustment ? 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20' : 
                                            'bg-brand-danger/10 text-brand-danger border border-brand-danger/20'
                                          }`}>
                                            {m.tipo}
                                          </span>
                                        </td>
                                        <td className={`py-2 px-4 text-right font-black ${colorClass}`}>
                                          {prefix}{Math.abs(m.quantidade).toFixed(3)} kg
                                        </td>
                                        <td className="py-2 px-4 text-gray-400 max-w-[200px] truncate" title={m.motivo || m.produto_nome}>
                                          {m.produto_nome && m.produto_nome !== 'Produto Excluído' ? `${m.produto_nome} (${m.motivo || 'Venda'})` : m.motivo || 'Ajuste'}
                                        </td>
                                        <td className="py-2 px-4 text-gray-500 text-[11px]">{m.usuario_nome || 'Sistema'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="overflow-y-auto flex-1 pr-1 border border-brand-border/40 bg-brand-dark/20 rounded-2xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
                    <th className="py-3 px-4">Nome da Categoria</th>
                    <th className="py-3 px-3">Modelo Estoque</th>
                    <th className="py-3 px-3 text-right">Preço Custo Lote</th>
                    <th className="py-3 px-3 text-center">Peso Bruto Atual</th>
                    <th className="py-3 px-3 text-center">Última Mov.</th>
                    <th className="py-3 px-4 text-center w-60">Ações de Gerenciamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/20">
                  {categories.map(cat => {
                    const isShared = cat.controle_estoque === 1;

                    // Calculate latest stock movement date/time for this category
                    const catMovements = movements.filter(m => {
                      if (m.categoria_id === cat.id) return true;
                      if (m.produto_id) {
                        const prod = products.find(p => p.id === m.produto_id);
                        return prod && prod.categoria_id === cat.id;
                      }
                      return false;
                    });
                    const lastMov = catMovements.length > 0 ? catMovements[0] : null;
                    const lastMovDate = lastMov && lastMov.data_movimentacao
                      ? new Date(lastMov.data_movimentacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'Sem registro';

                    return (
                      <tr key={cat.id} className="hover:bg-brand-border/5 font-semibold text-gray-300">
                        <td className="py-3 px-4 text-white font-bold">{cat.nome}</td>
                        <td className="py-3 px-3">
                          {isShared ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                              ⚖️ Peso Bruto (Açougue)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-brand-border text-gray-400 text-[10px] font-bold">
                              📦 Padrão (Unidades/Itens)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isShared ? `R$ ${(cat.preco_custo || 0).toFixed(2)}/kg` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-center text-white font-black">
                          {isShared ? `${(cat.estoque_atual || 0).toFixed(3)} kg` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] text-gray-400">
                          {lastMovDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center items-center space-x-2">
                            {/* Rendimento (Analytics) */}
                            {isShared && (
                              <button
                                onClick={() => setSelectedCategoryYield(cat.id)}
                                className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1"
                              >
                                <span>📊 Rendimento</span>
                              </button>
                            )}

                            {/* Entrada/Descarte */}
                            {isShared && (
                              <button
                                onClick={() => openCategoryStockModal(cat)}
                                className="px-2.5 py-1.5 bg-brand-success/10 hover:bg-brand-success/20 text-brand-success rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1"
                              >
                                <span>⚖️ Movimentar</span>
                              </button>
                            )}

                            {/* Editar */}
                            <button
                              onClick={() => openEditCategoryModal(cat)}
                              className="px-2.5 py-1.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded-lg text-[10px] font-bold transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-brand-border/40">
              <button
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setSelectedCategoryYield(null);
                }}
                className="px-6 py-2.5 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold rounded-xl text-xs transition-colors"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDITAR DETALHES DE CATEGORIA (PESO BRUTO)
          ======================================================== */}
      {showEditCategoryModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-50 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 size={18} className="text-brand-accent" />
                <span>Configurar Categoria</span>
              </h3>
              <button
                onClick={() => setShowEditCategoryModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome da Categoria</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Açougue Bovino"
                  value={editingCategory.nome}
                  onChange={(e) => setEditingCategory({...editingCategory, nome: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              {/* Toggle Controle Estoque */}
              <div className="p-3 bg-brand-dark/30 border border-brand-border/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estoque por Peso Bruto</span>
                  <span className="text-[10px] text-gray-500 font-semibold block leading-tight mt-0.5">Ativa o Modo Açougue com estoque centralizado</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingCategory.controle_estoque === 1}
                  onChange={(e) => setEditingCategory({...editingCategory, controle_estoque: e.target.checked ? 1 : 0})}
                  className="h-4 w-4 text-brand-accent focus:ring-0 rounded border-brand-border bg-brand-dark"
                />
              </div>

              {editingCategory.controle_estoque === 1 && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-3 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Peso Bruto Atual (KG)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={editingCategory.estoque_atual}
                      onChange={(e) => setEditingCategory({...editingCategory, estoque_atual: e.target.value})}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Preço de Custo (R$/KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingCategory.preco_custo}
                      onChange={(e) => setEditingCategory({...editingCategory, preco_custo: e.target.value})}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-brand-accent hover:from-purple-500 hover:to-brand-accentHover text-white font-black py-3 rounded-xl text-xs transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/20 border border-purple-400/30"
                >
                  Atualizar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
