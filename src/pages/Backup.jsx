import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Database, 
  UserPlus, 
  ShieldAlert, 
  RefreshCcw, 
  Settings, 
  FileSpreadsheet, 
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

export default function Backup() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // User form states
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: null,
    username: '',
    name: '',
    password: '',
    role: 'operador',
    active: 1
  });

  const loadData = async () => {
    try {
      const logsData = await api.auth.getLogs();
      setLogs(logsData);

      const usersData = await api.auth.getUsuarios();
      setUsers(usersData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportBackup = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.backup.exportarBanco();
      if (res.success) {
        setSuccessMsg(res.message);
      } else if (res.message !== 'Operação cancelada') {
        setErrorMsg(res.message);
      }
    } catch (e) {
      setErrorMsg("Erro ao realizar backup: " + e.message);
    } finally {
      setLoading(false);
      loadData();
    }
  };

  const handleRestoreBackup = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.backup.restaurarBanco();
      if (res.success) {
        setSuccessMsg(res.message);
      } else if (res.message !== 'Operação cancelada') {
        setErrorMsg(res.message);
      }
    } catch (e) {
      setErrorMsg("Erro ao restaurar backup: " + e.message);
    } finally {
      setLoading(false);
      loadData();
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!currentUser.username || !currentUser.name) return;

    try {
      await api.auth.salvarUsuario(currentUser);
      setShowUserModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao salvar usuário: " + err.message);
    }
  };

  const openNewUserModal = () => {
    setCurrentUser({
      id: null,
      username: '',
      name: '',
      password: '',
      role: 'operador',
      active: 1
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (usr) => {
    setCurrentUser({
      id: usr.id,
      username: usr.username,
      name: usr.name,
      password: '', // blank by default for security, only typed if changing
      role: usr.role,
      active: usr.active
    });
    setShowUserModal(true);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white leading-tight flex items-center space-x-3">
          <Database className="text-brand-accent h-7 w-7" />
          <span>Configuração e Backup do Sistema</span>
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-1">Gerencie cópias de segurança do banco de dados, usuários locais e audite logs de ações</p>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 text-xs bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl p-4 font-semibold">
          <CheckCircle size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2 text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-4 font-semibold">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        
        {/* Backup export panel */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between h-56">
          <div>
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
              <Database size={12} className="text-brand-accent" />
              <span>Cópia de Segurança SQLite</span>
            </span>
            <p className="text-xs text-gray-400 font-medium mt-3 leading-relaxed">
              Exporte todos os cadastros, estoque, vendas e fornecedores em um único arquivo compactado. Armazene em pendrive ou nuvem.
            </p>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={loading}
            className="w-full py-3 bg-brand-accent hover:bg-brand-accentHover text-white font-bold text-xs uppercase rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            {loading ? 'Processando...' : 'Exportar Cópia (.db)'}
          </button>
        </div>

        {/* Backup restore panel */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between h-56">
          <div>
            <span className="text-[10px] text-brand-warning font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
              <RefreshCcw size={12} className="text-brand-warning" />
              <span>Restaurar Banco de Dados</span>
            </span>
            <p className="text-xs text-gray-400 font-medium mt-3 leading-relaxed">
              Substitua o banco de dados atual por uma cópia de segurança importada do Windows. Requer reinicialização do sistema.
            </p>
          </div>
          <button
            onClick={handleRestoreBackup}
            disabled={loading}
            className="w-full py-3 bg-brand-card hover:bg-brand-border text-gray-300 font-bold text-xs uppercase rounded-xl transition-colors border border-brand-border"
          >
            {loading ? 'Processando...' : 'Restaurar Cópia (.db)'}
          </button>
        </div>

        {/* Global info card */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between h-56">
          <div>
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
              <Settings size={12} className="text-brand-success" />
              <span>Status Operacional</span>
            </span>
            
            <div className="space-y-2 mt-4 text-xs font-semibold text-gray-300">
              <div className="flex justify-between">
                <span>Versão PDV:</span>
                <span className="text-white">v1.0.0 (Windows)</span>
              </div>
              <div className="flex justify-between">
                <span>Servidor local:</span>
                <span className="text-brand-success">Ativo (SQLite3)</span>
              </div>
              <div className="flex justify-between">
                <span>Total Operadores:</span>
                <span className="text-white">{users.length} cadastrados</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center border-t border-brand-border/40 pt-3">
            Modo 100% Offline-First
          </div>
        </div>

      </div>

      {/* User management and log auditing */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* User directory management */}
        <div className="col-span-1 glass-panel rounded-3xl p-6 border border-white/5 flex flex-col min-h-[380px] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
              <UserPlus size={12} className="text-brand-accent" />
              <span>Operadores do Sistema</span>
            </span>
            
            <button
              onClick={openNewUserModal}
              className="p-1 bg-brand-accent/20 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent/30 rounded-lg transition-all"
              title="Cadastrar usuário"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {users.map(usr => (
              <button
                key={usr.id}
                onClick={() => openEditUserModal(usr)}
                className="w-full flex justify-between items-center bg-brand-dark/40 border border-brand-border/30 rounded-xl p-3 hover:bg-brand-border/20 transition-all text-left"
              >
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{usr.name}</h4>
                  <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider">@{usr.username}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block leading-none">
                    {usr.role}
                  </span>
                  <span className={`text-[8px] font-bold uppercase mt-1 inline-block ${usr.active === 1 ? 'text-brand-success' : 'text-brand-danger'}`}>
                    {usr.active === 1 ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Audit actions list */}
        <div className="col-span-2 glass-panel rounded-3xl p-6 border border-white/5 flex flex-col min-h-[380px] overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
              <FileSpreadsheet size={12} className="text-brand-success" />
              <span>Logs de Ações e Auditoria</span>
            </span>
            <button
              onClick={loadData}
              className="p-1 bg-brand-border hover:bg-brand-border/80 text-gray-400 rounded-lg transition-colors border border-brand-border"
              title="Recarregar logs"
            >
              <RefreshCcw size={12} />
            </button>
          </div>

          {/* Logs audit timeline */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
            {logs.length > 0 ? (
              logs.map(log => (
                <div key={log.id} className="flex justify-between items-start bg-brand-dark/30 border border-brand-border/20 rounded-xl p-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black uppercase bg-brand-border/60 text-white px-2 py-0.5 rounded border border-brand-border">
                        {log.acao}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        Por: {log.usuario_nome || 'Sistema'}
                      </span>
                    </div>
                    <p className="text-gray-300 font-medium">{log.detalhes}</p>
                  </div>
                  <span className="text-[9px] text-gray-500 shrink-0 font-bold">
                    {new Date(log.data_acao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-gray-500 font-semibold py-12">
                Nenhum log registrado.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================
          MODAL: CADASTRAR/EDITAR USUÁRIO
          ======================================================== */}
      {showUserModal && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center z-40 select-none">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus size={18} className="text-brand-accent" />
                <span>{currentUser.id ? 'Editar Usuário' : 'Novo Usuário'}</span>
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              
              {/* Full name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={currentUser.name}
                  onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Login (Username)</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: joao.silva"
                    value={currentUser.username}
                    onChange={(e) => setCurrentUser({...currentUser, username: e.target.value})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  />
                </div>

                {/* Role select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Nível de Acesso</label>
                  <select
                    value={currentUser.role}
                    onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-gray-300 outline-none"
                  >
                    <option value="operador">Operador Caixa</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  {currentUser.id ? 'Alterar Senha (Deixe em branco para manter)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  placeholder="Digite a senha..."
                  value={currentUser.password}
                  onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-xl py-3 px-4 text-xs font-semibold text-white outline-none"
                  required={!currentUser.id}
                />
              </div>

              {/* Active Switch */}
              {currentUser.id && (
                <div className="flex justify-between items-center bg-brand-dark/40 border border-brand-border/40 p-3 rounded-xl mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Status da Conta</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setCurrentUser({...currentUser, active: 1})}
                      className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                        currentUser.active === 1
                          ? 'bg-brand-success/15 border border-brand-success/30 text-brand-success'
                          : 'bg-brand-border text-gray-500'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentUser({...currentUser, active: 0})}
                      className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                        currentUser.active === 0
                          ? 'bg-brand-danger/15 border border-brand-danger/30 text-brand-danger'
                          : 'bg-brand-border text-gray-500'
                      }`}
                    >
                      Inativo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 bg-brand-border hover:bg-brand-border/80 text-gray-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-accent hover:bg-brand-accentHover text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Salvar Usuário
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
