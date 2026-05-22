import React, { useState } from 'react';
import api from '../services/api';
import { XMLParser } from 'fast-xml-parser';
import { 
  FileCode, 
  UploadCloud, 
  Check, 
  AlertTriangle, 
  User, 
  FileSpreadsheet, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';

export default function XMLImport() {
  const [dragActive, setDragActive] = useState(false);
  const [xmlData, setXmlData] = useState(null); // { fornecedor, nota, itens }
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMessage('');
    setSuccessMessage('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "text/xml" && !file.name.endsWith('.xml')) {
        setErrorMessage("Erro: Por favor, selecione apenas arquivos XML de Notas Fiscais (NF-e).");
        return;
      }
      parseXMLFile(file);
    }
  };

  const handleFileInput = (e) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (e.target.files && e.target.files[0]) {
      parseXMLFile(e.target.files[0]);
    }
  };

  const parseXMLFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target.result;
        
        // Initialize parser
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: ""
        });
        const result = parser.parse(xmlText);
        
        // Extract NFe data tree (handling nodes wrappers like nfeProc or raw NFe)
        let nfeNode = null;
        if (result.nfeProc && result.nfeProc.NFe) {
          nfeNode = result.nfeProc.NFe;
        } else if (result.NFe) {
          nfeNode = result.NFe;
        }

        if (!nfeNode || !nfeNode.infNFe) {
          throw new Error("Arquivo XML não compatível com o padrão de NF-e da Receita Federal (infNFe ausente).");
        }

        const infNFe = nfeNode.infNFe;
        
        // 1. Supplier (Emitente)
        const emit = infNFe.emit;
        const fornecedor = {
          nome: emit.xNome,
          cnpj: emit.CNPJ,
          email: emit.enderEmit?.email || '',
          telefone: emit.enderEmit?.fone || ''
        };

        // 2. Note Info (Ide)
        const ide = infNFe.ide;
        // Access key from Id attribute (Format: NFe43220904... removing 'NFe' prefix)
        let chaveAcesso = '';
        if (infNFe.Id) {
          chaveAcesso = infNFe.Id.replace('NFe', '');
        } else if (result.nfeProc && result.nfeProc.protNFe && result.nfeProc.protNFe.infProt) {
          chaveAcesso = result.nfeProc.protNFe.infProt.chNFe;
        }

        const nota = {
          numero_nota: String(ide.nNF),
          chave_acesso: chaveAcesso,
          data_emissao: ide.dhEmi || ide.dEmi,
          valor_total: parseFloat(infNFe.total?.ICMSTot?.vNF || 0)
        };

        // 3. Items list (Det)
        let det = infNFe.det;
        if (!det) {
          throw new Error("Nenhum item de produto encontrado nesta Nota Fiscal.");
        }
        
        // If single item, normalize to array
        if (!Array.isArray(det)) {
          det = [det];
        }

        const itens = det.map(d => {
          const prod = d.prod;
          // Barcode EAN fallback checks
          let barcode = prod.cEAN;
          if (!barcode || barcode === "SEM GTIN" || barcode === "SEM EAN" || String(barcode).trim() === '') {
            barcode = prod.cProd; // Use supplier internal code as local barcode
          }

          return {
            codigo_barras: String(barcode).trim(),
            nome: prod.xProd,
            ncm: prod.NCM,
            quantidade: parseFloat(prod.qCom),
            preco_custo: parseFloat(prod.vUnCom),
            total_item: parseFloat(prod.vProd)
          };
        });

        setXmlData({ fornecedor, nota, itens });
      } catch (err) {
        console.error(err);
        setErrorMessage("Erro ao processar arquivo XML: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!xmlData) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Import note, supplier and items. Update inventory. Operator ID 1 (Admin)
      await api.xml.importarNotaFiscal(xmlData, 1);
      setSuccessMessage(`Nota Fiscal #${xmlData.nota.numero_nota} importada e estoque atualizado com sucesso!`);
      setXmlData(null);
    } catch (err) {
      setErrorMessage("Erro de importação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
          <FileCode className="text-brand-accent h-7 w-7" />
          <span>Importação de Nota Fiscal (XML NF-e)</span>
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-1">Importe produtos e atualize seu estoque arrastando o XML emitido pelo fornecedor</p>
      </div>

      {errorMessage && (
        <div className="flex items-center space-x-2 text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-4 font-semibold">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center space-x-2 text-xs bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl p-4 font-semibold">
          <Check size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Drag & Drop File Zone */}
      {!xmlData ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`h-72 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all ${
            dragActive 
              ? 'border-brand-accent bg-brand-accent/5' 
              : 'border-brand-border bg-brand-card/30 hover:border-brand-border/80'
          }`}
        >
          <UploadCloud className="h-16 w-16 text-gray-500 mb-4 animate-pulse" />
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Arraste seu XML NF-e aqui</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">Ou clique no botão abaixo para buscar nos arquivos locais</p>
          
          <label className="mt-6 px-5 py-3 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-white font-bold text-xs uppercase cursor-pointer transition-colors shadow-lg shadow-indigo-500/20">
            <span>Selecionar XML</span>
            <input
              type="file"
              accept=".xml"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        /* XML Content Preview Screen */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Invoice Card */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* Supplier Info */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
                <User size={12} className="text-brand-accent" />
                <span>Fornecedor</span>
              </span>
              <div>
                <h4 className="text-sm font-bold text-white truncate">{xmlData.fornecedor.nome}</h4>
                <p className="text-xs text-gray-400 font-semibold mt-1">CNPJ: {xmlData.fornecedor.cnpj}</p>
                {xmlData.fornecedor.telefone && (
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tel: {xmlData.fornecedor.telefone}</p>
                )}
              </div>
            </div>

            {/* Note Info */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
                <FileSpreadsheet size={12} className="text-brand-accent" />
                <span>Dados da NF-e</span>
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Nota Fiscal: #{xmlData.nota.numero_nota}</h4>
                <p className="text-xs text-gray-400 font-semibold mt-1 truncate">Chave: {xmlData.nota.chave_acesso}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Emissão: {new Date(xmlData.nota.data_emissao).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Import actions */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">Valor da NF-e</span>
                <span className="text-lg font-black text-brand-success">R$ {xmlData.nota.valor_total.toFixed(2)}</span>
              </div>

              <div className="flex space-x-2.5">
                <button
                  onClick={() => setXmlData(null)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-border hover:bg-brand-border/85 text-gray-300 font-bold text-xs uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-brand-success hover:bg-emerald-500 text-white font-bold text-xs uppercase transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-1.5"
                >
                  {loading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <PlusCircle size={12} />
                  )}
                  <span>{loading ? 'Importando...' : 'Confirmar'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Note Items Table preview */}
          <div className="rounded-2xl border border-brand-border/50 bg-brand-card/30 overflow-hidden">
            <div className="p-4 border-b border-brand-border/50 font-extrabold text-xs uppercase tracking-widest text-white">
              Itens a Importar ({xmlData.itens.length})
            </div>
            
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-border/50 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-brand-card/50">
                  <th className="py-3.5 px-6">Produto</th>
                  <th className="py-3.5 px-3">Cód. Barras</th>
                  <th className="py-3.5 px-3 text-center">NCM</th>
                  <th className="py-3.5 px-3 text-center">Qtd Compra</th>
                  <th className="py-3.5 px-3 text-right">Preço Unitário</th>
                  <th className="py-3.5 px-6 text-right">Total Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {xmlData.itens.map((item, idx) => (
                  <tr key={idx} className="hover:bg-brand-border/10 text-xs font-semibold text-gray-300 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="text-white font-bold block">{item.nome}</span>
                    </td>
                    <td className="py-3.5 px-3 text-gray-500">{item.codigo_barras}</td>
                    <td className="py-3.5 px-3 text-center text-gray-400">{item.ncm}</td>
                    <td className="py-3.5 px-3 text-center text-white">{item.quantidade} un</td>
                    <td className="py-3.5 px-3 text-right">R$ {item.preco_custo.toFixed(2)}</td>
                    <td className="py-3.5 px-6 text-right text-brand-success">R$ {item.total_item.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
