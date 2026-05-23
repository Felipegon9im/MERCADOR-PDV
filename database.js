const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Determine database path
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
} catch (err) {
  console.error("Failed to load better-sqlite3, initializing fallback JSON database", err);
  // Fallback DB using JSON to guarantee stability if native SQLite fails
  db = initJsonDbFallback(dbPath);
}

// Password hashing utility (SHA-256 with salt)
function hashPassword(password, salt = 'pdv_salt_key') {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Initialize SQLite Schema
if (typeof db.exec === 'function') {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'gerente', 'operador')) NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      controle_estoque INTEGER DEFAULT 0,
      estoque_atual REAL DEFAULT 0,
      preco_custo REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_barras TEXT UNIQUE,
      nome TEXT NOT NULL,
      categoria_id INTEGER,
      preco_custo REAL DEFAULT 0,
      preco_venda REAL DEFAULT 0,
      estoque_atual REAL DEFAULT 0,
      estoque_minimo REAL DEFAULT 0,
      unidade TEXT DEFAULT 'UN',
      tipo_produto TEXT CHECK(tipo_produto IN ('KG', 'UNIDADE')) DEFAULT 'UNIDADE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      total REAL NOT NULL,
      desconto REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      forma_pagamento TEXT CHECK(forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito')) NOT NULL,
      troco REAL DEFAULT 0,
      pago REAL DEFAULT 0,
      data_venda TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS itens_venda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER,
      produto_id INTEGER,
      quantidade REAL NOT NULL,
      preco_unitario REAL NOT NULL,
      total_item REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER,
      categoria_id INTEGER,
      quantidade REAL NOT NULL,
      tipo TEXT CHECK(tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
      motivo TEXT,
      usuario_id INTEGER,
      data_movimentacao TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cnpj TEXT UNIQUE NOT NULL,
      email TEXT,
      telefone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notas_entrada (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fornecedor_id INTEGER,
      numero_nota TEXT UNIQUE NOT NULL,
      chave_acesso TEXT,
      data_emissao TEXT,
      valor_total REAL NOT NULL,
      data_importacao TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
    );

    CREATE TABLE IF NOT EXISTS notas_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_entrada_id INTEGER,
      produto_id INTEGER,
      quantidade REAL NOT NULL,
      preco_custo REAL NOT NULL,
      FOREIGN KEY (nota_entrada_id) REFERENCES notas_entrada(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS logs_acoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      detalhes TEXT,
      data_acao TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  // Auto-migration (Autocura) for existing SQLite databases to add the unidade column
  try {
    db.exec("ALTER TABLE produtos ADD COLUMN unidade TEXT DEFAULT 'UN';");
  } catch (err) {
    // Column already exists or table doesn't exist yet, ignore
  }

  // Auto-migration for existing SQLite databases to add the tipo_produto column
  try {
    db.exec("ALTER TABLE produtos ADD COLUMN tipo_produto TEXT DEFAULT 'UNIDADE';");
  } catch (err) {
    // Column already exists or table doesn't exist yet, ignore
  }

  // Auto-migration for existing SQLite databases to add category-level inventory columns
  try {
    db.exec("ALTER TABLE categorias ADD COLUMN controle_estoque INTEGER DEFAULT 0;");
  } catch (err) {}
  try {
    db.exec("ALTER TABLE categorias ADD COLUMN estoque_atual REAL DEFAULT 0;");
  } catch (err) {}
  try {
    db.exec("ALTER TABLE categorias ADD COLUMN preco_custo REAL DEFAULT 0;");
  } catch (err) {}

  // Auto-migration for existing SQLite databases to add category_id to movements
  try {
    db.exec("ALTER TABLE estoque_movimentacoes ADD COLUMN categoria_id INTEGER;");
  } catch (err) {}

  // Auto-migration for existing SQLite databases to support client credit sales (Fiado)
  try {
    const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='vendas'").get()?.sql || "";
    if (tableSql && !tableSql.includes("'fiado'")) {
      console.log("Migrating 'vendas' table to support 'fiado' payment method...");
      db.exec(`
        BEGIN TRANSACTION;
        ALTER TABLE vendas RENAME TO vendas_old;
        CREATE TABLE vendas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER,
          total REAL NOT NULL,
          desconto REAL DEFAULT 0,
          subtotal REAL NOT NULL,
          forma_pagamento TEXT CHECK(forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito', 'fiado')) NOT NULL,
          troco REAL DEFAULT 0,
          pago REAL DEFAULT 0,
          data_venda TEXT DEFAULT CURRENT_TIMESTAMP,
          cliente_id INTEGER,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );
        INSERT INTO vendas (id, usuario_id, total, desconto, subtotal, forma_pagamento, troco, pago, data_venda, cliente_id)
        SELECT id, usuario_id, total, desconto, subtotal, forma_pagamento, troco, pago, data_venda, NULL FROM vendas_old;
        DROP TABLE vendas_old;
        COMMIT;
      `);
      console.log("Vendas table successfully migrated.");
    }
  } catch (err) {
    console.error("Failed to migrate 'vendas' table:", err);
    try { db.exec("ROLLBACK;"); } catch(e) {}
  }

  // Create clientes and cliente_pagamentos tables if they don't exist
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        cpf TEXT,
        limite_credito REAL DEFAULT 0,
        saldo_devedor REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cliente_pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        valor REAL NOT NULL,
        forma_pagamento TEXT CHECK(forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito')) NOT NULL,
        usuario_id INTEGER,
        data_pagamento TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `);
  } catch (err) {
    console.error("Failed to create client-related tables:", err);
  }

  // Seed default data if empty
  const userCount = db.prepare('SELECT count(*) as count FROM usuarios').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO usuarios (username, password, role, name) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', hashPassword('admin123'), 'admin', 'Administrador');
    insertUser.run('gerente', hashPassword('gerente123'), 'gerente', 'Gerente Geral');
    insertUser.run('caixa', hashPassword('caixa123'), 'operador', 'Operador Caixa');

    db.exec(`
      INSERT INTO categorias (nome) VALUES ('Mercearia');
      INSERT INTO categorias (nome) VALUES ('Bebidas');
      INSERT INTO categorias (nome) VALUES ('Frios e Laticínios');
      INSERT INTO categorias (nome) VALUES ('Higiene e Limpeza');
      INSERT INTO categorias (nome) VALUES ('Hortifruti');
    `);

    const insertProd = db.prepare('INSERT INTO produtos (codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, tipo_produto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertProd.run('7891000100101', 'Coca-Cola Lata 350ml', 2, 2.20, 4.50, 48, 10, 'UN', 'UNIDADE');
    insertProd.run('7891000100102', 'Cerveja Heineken Long Neck 330ml', 2, 4.50, 8.90, 24, 6, 'UN', 'UNIDADE');
    insertProd.run('7892000200201', 'Arroz Tio João Tipo 1 5kg', 1, 18.90, 29.90, 15, 5, 'UN', 'UNIDADE');
    insertProd.run('7892000200202', 'Feijão Carioca Kicaldo 1kg', 1, 5.20, 8.50, 20, 5, 'UN', 'UNIDADE');
    insertProd.run('7893000300301', 'Leite Integral Piracanjuba 1L', 3, 3.80, 5.49, 30, 8, 'UN', 'UNIDADE');
    insertProd.run('7893000300302', 'Alcatra Bovina Premium (KG)', 5, 29.50, 45.90, 18.5, 5, 'KG', 'KG');
    insertProd.run('7894000400401', 'Contra Filé Grill (KG)', 5, 34.00, 52.90, 12.0, 4, 'KG', 'KG');
    insertProd.run('7894000400402', 'Peito de Frango Resfriado (KG)', 5, 12.50, 18.90, 25.0, 6, 'KG', 'KG');
    insertProd.run('7895000500501', 'Biscoito Recheado Negresco 140g', 1, 1.80, 3.20, 25, 5, 'UN', 'UNIDADE');

    // Initial logs
    db.prepare('INSERT INTO logs_acoes (usuario_id, acao, detalhes) VALUES (?, ?, ?)').run(1, 'SISTEMA_INICIADO', 'Banco de dados inicializado com dados padrão');
  }
}

// Fallback JSON DB Implementation in case better-sqlite3 fails
function initJsonDbFallback(dbPath) {
  const jsonPath = dbPath.replace('.db', '.json');
  console.log("Creating/loading JSON fallback DB at: ", jsonPath);
  let data = {
    usuarios: [],
    categorias: [],
    produtos: [],
    vendas: [],
    itens_venda: [],
    estoque_movimentacoes: [],
    fornecedores: [],
    notas_entrada: [],
    notas_itens: [],
    logs_acoes: []
  };

  const save = () => {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  };

  if (fs.existsSync(jsonPath)) {
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // Autocura migration for JSON fallback products and categories:
      let migrated = false;
      if (Array.isArray(data.produtos)) {
        data.produtos.forEach(p => {
          if (!p.unidade) {
            p.unidade = 'UN';
            migrated = true;
          }
          if (!p.tipo_produto) {
            p.tipo_produto = p.unidade === 'KG' ? 'KG' : 'UNIDADE';
            migrated = true;
          }
        });
      }
      if (Array.isArray(data.categorias)) {
        data.categorias.forEach(c => {
          if (c.controle_estoque === undefined) {
            c.controle_estoque = 0;
            migrated = true;
          }
          if (c.estoque_atual === undefined) {
            c.estoque_atual = 0;
            migrated = true;
          }
          if (c.preco_custo === undefined) {
            c.preco_custo = 0;
            migrated = true;
          }
        });
      }
      if (Array.isArray(data.estoque_movimentacoes)) {
        data.estoque_movimentacoes.forEach(m => {
          if (m.categoria_id === undefined) {
            m.categoria_id = null;
            migrated = true;
          }
        });
      }
      if (!Array.isArray(data.clientes)) {
        data.clientes = [];
        migrated = true;
      }
      if (!Array.isArray(data.cliente_pagamentos)) {
        data.cliente_pagamentos = [];
        migrated = true;
      }
      if (migrated) save();
    } catch (e) {
      console.error("Corrupted JSON DB, recreating", e);
      save();
    }
  } else {
    // Seed JSON fallback
    const hash = (pass) => crypto.pbkdf2Sync(pass, 'pdv_salt_key', 1000, 64, 'sha512').toString('hex');
    data.clientes = [];
    data.cliente_pagamentos = [];
    data.usuarios.push(
      { id: 1, username: 'admin', password: hash('admin123'), role: 'admin', name: 'Administrador', active: 1, created_at: new Date().toISOString() },
      { id: 2, username: 'gerente', password: hash('gerente123'), role: 'gerente', name: 'Gerente Geral', active: 1, created_at: new Date().toISOString() },
      { id: 3, username: 'caixa', password: hash('caixa123'), role: 'operador', name: 'Operador Caixa', active: 1, created_at: new Date().toISOString() }
    );
    data.categorias.push(
      { id: 1, nome: 'Mercearia', created_at: new Date().toISOString() },
      { id: 2, nome: 'Bebidas', created_at: new Date().toISOString() },
      { id: 3, nome: 'Frios e Laticínios', created_at: new Date().toISOString() },
      { id: 4, nome: 'Higiene e Limpeza', created_at: new Date().toISOString() },
      { id: 5, nome: 'Hortifruti', created_at: new Date().toISOString() }
    );
    data.produtos.push(
      { id: 1, codigo_barras: '7891000100101', nome: 'Coca-Cola Lata 350ml', categoria_id: 2, preco_custo: 2.20, preco_venda: 4.50, estoque_atual: 48, estoque_minimo: 10, unidade: 'UN', tipo_produto: 'UNIDADE', created_at: new Date().toISOString() },
      { id: 2, codigo_barras: '7891000100102', nome: 'Cerveja Heineken Long Neck 330ml', categoria_id: 2, preco_custo: 4.50, preco_venda: 8.90, estoque_atual: 24, estoque_minimo: 6, unidade: 'UN', tipo_produto: 'UNIDADE', created_at: new Date().toISOString() },
      { id: 3, codigo_barras: '7892000200201', nome: 'Arroz Tio João Tipo 1 5kg', categoria_id: 1, preco_custo: 18.90, preco_venda: 29.90, estoque_atual: 15, estoque_minimo: 5, unidade: 'UN', tipo_produto: 'UNIDADE', created_at: new Date().toISOString() },
      { id: 4, codigo_barras: '7892000200202', nome: 'Feijão Carioca Kicaldo 1kg', categoria_id: 1, preco_custo: 5.20, preco_venda: 8.50, estoque_atual: 20, estoque_minimo: 5, unidade: 'UN', tipo_produto: 'UNIDADE', created_at: new Date().toISOString() },
      { id: 5, codigo_barras: '7893000300302', nome: 'Alcatra Bovina Premium (KG)', categoria_id: 5, preco_custo: 29.50, preco_venda: 45.90, estoque_atual: 18.5, estoque_minimo: 5, unidade: 'KG', tipo_produto: 'KG', created_at: new Date().toISOString() }
    );
    data.logs_acoes.push({
      id: 1, usuario_id: 1, acao: 'SISTEMA_INICIADO', detalhes: 'Banco JSON Fallback criado', data_acao: new Date().toISOString()
    });
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    isJson: true,
    exec: (sql) => {},
    prepare: (sql) => {
      // Mock SQLite API dynamically so IPC handlers work without modification
      if (sql.includes('SELECT count(*)')) {
        return { get: () => ({ count: data.usuarios.length }) };
      }
      return { run: () => {}, get: () => null, all: () => [] };
    },
    // We will hook the fallback operations directly in the database service
    _data: data,
    _save: save
  };
}

// IPC Handlers implementation bridging to the DB
const dbService = {
  // DB path for backup purposes
  getDbPath: () => dbPath,

  // Logging
  logAcao: (usuarioId, acao, detalhes) => {
    if (db.isJson) {
      const log = { id: db._data.logs_acoes.length + 1, usuario_id: usuarioId, acao, detalhes, data_acao: new Date().toISOString() };
      db._data.logs_acoes.push(log);
      db._save();
      return log;
    }
    const stmt = db.prepare('INSERT INTO logs_acoes (usuario_id, acao, detalhes) VALUES (?, ?, ?)');
    const result = stmt.run(usuarioId, acao, detalhes);
    return { id: result.lastInsertRowid };
  },

  getLogs: () => {
    if (db.isJson) return [...db._data.logs_acoes].reverse();
    return db.prepare('SELECT l.*, u.name as usuario_nome FROM logs_acoes l LEFT JOIN usuarios u ON l.usuario_id = u.id ORDER BY l.id DESC LIMIT 100').all();
  },

  // Auth / Users
  login: (username, password) => {
    const hashed = hashPassword(password);
    if (db.isJson) {
      const user = db._data.usuarios.find(u => u.username === username && u.password === hashed && u.active === 1);
      if (user) {
        const { password, ...userWithoutPass } = user;
        dbService.logAcao(user.id, 'LOGIN', `Usuário ${username} logado com sucesso`);
        return userWithoutPass;
      }
      return null;
    }
    const stmt = db.prepare('SELECT * FROM usuarios WHERE username = ? AND password = ? AND active = 1');
    const user = stmt.get(username, hashed);
    if (user) {
      const { password, ...userWithoutPass } = user;
      dbService.logAcao(user.id, 'LOGIN', `Usuário ${username} logado com sucesso`);
      return userWithoutPass;
    }
    return null;
  },

  getUsuarios: () => {
    if (db.isJson) return db._data.usuarios.map(({ password, ...u }) => u);
    return db.prepare('SELECT id, username, role, name, active, created_at FROM usuarios').all();
  },

  salvarUsuario: (user) => {
    const { id, username, password, role, name, active } = user;
    if (db.isJson) {
      if (id) {
        const idx = db._data.usuarios.findIndex(u => u.id === id);
        if (idx !== -1) {
          db._data.usuarios[idx].username = username;
          db._data.usuarios[idx].role = role;
          db._data.usuarios[idx].name = name;
          db._data.usuarios[idx].active = active;
          if (password) db._data.usuarios[idx].password = hashPassword(password);
          db._save();
          return { id };
        }
      } else {
        const newId = db._data.usuarios.length ? Math.max(...db._data.usuarios.map(u => u.id)) + 1 : 1;
        db._data.usuarios.push({
          id: newId, username, password: hashPassword(password || '123456'), role, name, active: 1, created_at: new Date().toISOString()
        });
        db._save();
        return { id: newId };
      }
    }

    if (id) {
      if (password) {
        const stmt = db.prepare('UPDATE usuarios SET username = ?, password = ?, role = ?, name = ?, active = ? WHERE id = ?');
        stmt.run(username, hashPassword(password), role, name, active, id);
      } else {
        const stmt = db.prepare('UPDATE usuarios SET username = ?, role = ?, name = ?, active = ? WHERE id = ?');
        stmt.run(username, role, name, active, id);
      }
      return { id };
    } else {
      const stmt = db.prepare('INSERT INTO usuarios (username, password, role, name, active) VALUES (?, ?, ?, ?, 1)');
      const result = stmt.run(username, hashPassword(password || '123456'), role, name);
      return { id: result.lastInsertRowid };
    }
  },

  // Categories
  getCategorias: () => {
    if (db.isJson) return db._data.categorias;
    return db.prepare('SELECT * FROM categorias ORDER BY nome ASC').all();
  },

  salvarCategoria: (catData) => {
    const data = typeof catData === 'string' ? { nome: catData } : catData;
    const { id, nome, controle_estoque, estoque_atual, preco_custo } = data;

    if (db.isJson) {
      if (id) {
        const idx = db._data.categorias.findIndex(c => c.id === id);
        if (idx !== -1) {
          db._data.categorias[idx].nome = nome;
          db._data.categorias[idx].controle_estoque = controle_estoque || 0;
          db._data.categorias[idx].estoque_atual = estoque_atual || 0;
          db._data.categorias[idx].preco_custo = preco_custo || 0;
          db._save();
          return { id };
        }
      } else {
        const exists = db._data.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase());
        if (exists) return exists;
        const newId = db._data.categorias.length ? Math.max(...db._data.categorias.map(c => c.id)) + 1 : 1;
        const cat = { 
          id: newId, 
          nome, 
          controle_estoque: controle_estoque || 0, 
          estoque_atual: estoque_atual || 0, 
          preco_custo: preco_custo || 0, 
          created_at: new Date().toISOString() 
        };
        db._data.categorias.push(cat);
        db._save();
        return cat;
      }
    }

    if (id) {
      const stmt = db.prepare('UPDATE categorias SET nome = ?, controle_estoque = ?, estoque_atual = ?, preco_custo = ? WHERE id = ?');
      stmt.run(nome, controle_estoque || 0, estoque_atual || 0, preco_custo || 0, id);
      return { id };
    } else {
      const checkStmt = db.prepare('SELECT * FROM categorias WHERE nome = ?');
      const existing = checkStmt.get(nome);
      if (existing) return existing;

      const stmt = db.prepare('INSERT INTO categorias (nome, controle_estoque, estoque_atual, preco_custo) VALUES (?, ?, ?, ?)');
      const result = stmt.run(nome, controle_estoque || 0, estoque_atual || 0, preco_custo || 0);
      return { id: result.lastInsertRowid, nome };
    }
  },

  ajustarEstoqueCategoria: (categoriaId, quantidade, tipo, motivo, usuarioId) => {
    if (db.isJson) {
      const idx = db._data.categorias.findIndex(c => c.id === categoriaId);
      if (idx !== -1) {
        const c = db._data.categorias[idx];
        const oldStock = c.estoque_atual || 0;
        let newStock = oldStock;
        let qtyMov = quantidade;

        if (tipo === 'entrada') {
          newStock += quantidade;
        } else if (tipo === 'saida') {
          newStock -= quantidade;
        } else if (tipo === 'ajuste') {
          qtyMov = quantidade - oldStock;
          newStock = quantidade;
        }

        db._data.categorias[idx].estoque_atual = newStock;
        
        db._data.estoque_movimentacoes.push({
          id: db._data.estoque_movimentacoes.length + 1,
          produto_id: null,
          categoria_id: categoriaId,
          quantidade: qtyMov,
          tipo,
          motivo,
          usuario_id: usuarioId,
          data_movimentacao: new Date().toISOString()
        });
        db._save();
        return { success: true, novoEstoque: newStock };
      }
      return { success: false };
    }

    const c = db.prepare('SELECT estoque_atual FROM categorias WHERE id = ?').get(categoriaId);
    if (!c) return { success: false };

    const oldStock = c.estoque_atual || 0;
    let newStock = oldStock;
    let qtyMov = quantidade;

    if (tipo === 'entrada') {
      newStock += quantidade;
    } else if (tipo === 'saida') {
      newStock -= quantidade;
    } else if (tipo === 'ajuste') {
      qtyMov = quantidade - oldStock;
      newStock = quantidade;
    }

    db.prepare('UPDATE categorias SET estoque_atual = ? WHERE id = ?').run(newStock, categoriaId);
    db.prepare('INSERT INTO estoque_movimentacoes (produto_id, categoria_id, quantidade, tipo, motivo, usuario_id) VALUES (NULL, ?, ?, ?, ?, ?)')
      .run(categoriaId, qtyMov, tipo, motivo, usuarioId);

    return { success: true, novoEstoque: newStock };
  },

  // Products
  getProdutos: () => {
    if (db.isJson) {
      return db._data.produtos.map(p => {
        const cat = db._data.categorias.find(c => c.id === p.categoria_id);
        let estoque_atual = p.estoque_atual;
        if (cat && cat.controle_estoque === 1) {
          estoque_atual = cat.estoque_atual || 0;
        }
        return { 
          ...p, 
          categoria_nome: cat ? cat.nome : '', 
          estoque_atual,
          controle_estoque_categoria: cat && cat.controle_estoque === 1 ? 1 : 0
        };
      });
    }
    return db.prepare(`
      SELECT p.*, c.nome as categoria_nome, c.controle_estoque as cat_controle_estoque, c.estoque_atual as cat_estoque_atual
      FROM produtos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.nome ASC
    `).all().map(p => {
      if (p.cat_controle_estoque === 1) {
        p.estoque_atual = p.cat_estoque_atual || 0;
        p.controle_estoque_categoria = 1;
      } else {
        p.controle_estoque_categoria = 0;
      }
      return p;
    });
  },

  buscarProdutoPorCodigo: (codigo) => {
    if (db.isJson) {
      const p = db._data.produtos.find(p => p.codigo_barras === codigo);
      if (p) {
        const cat = db._data.categorias.find(c => c.id === p.categoria_id);
        let estoque_atual = p.estoque_atual;
        if (cat && cat.controle_estoque === 1) {
          estoque_atual = cat.estoque_atual || 0;
        }
        return { 
          ...p, 
          categoria_nome: cat ? cat.nome : '', 
          estoque_atual,
          controle_estoque_categoria: cat && cat.controle_estoque === 1 ? 1 : 0
        };
      }
      return null;
    }
    const p = db.prepare(`
      SELECT p.*, c.nome as categoria_nome, c.controle_estoque as cat_controle_estoque, c.estoque_atual as cat_estoque_atual
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.codigo_barras = ?
    `).get(codigo);
    
    if (p) {
      if (p.cat_controle_estoque === 1) {
        p.estoque_atual = p.cat_estoque_atual || 0;
        p.controle_estoque_categoria = 1;
      } else {
        p.controle_estoque_categoria = 0;
      }
      return p;
    }
    return null;
  },

  salvarProduto: (product, usuarioId = 1) => {
    const { id, codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, tipo_produto } = product;
    if (db.isJson) {
      if (id) {
        const idx = db._data.produtos.findIndex(p => p.id === id);
        if (idx !== -1) {
          const oldStock = db._data.produtos[idx].estoque_atual;
          db._data.produtos[idx] = { ...db._data.produtos[idx], codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade: unidade || 'UN', tipo_produto: tipo_produto || 'UNIDADE' };
          db._save();
          // Log inventory adjustment
          if (oldStock !== estoque_atual) {
            const diff = estoque_atual - oldStock;
            db._data.estoque_movimentacoes.push({
              id: db._data.estoque_movimentacoes.length + 1,
              produto_id: id,
              quantidade: diff,
              tipo: 'ajuste',
              motivo: 'Ajuste manual de cadastro',
              usuario_id: usuarioId,
              data_movimentacao: new Date().toISOString()
            });
            db._save();
          }
          return { id };
        }
      } else {
        const newId = db._data.produtos.length ? Math.max(...db._data.produtos.map(p => p.id)) + 1 : 1;
        db._data.produtos.push({
          id: newId, codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade: unidade || 'UN', tipo_produto: tipo_produto || 'UNIDADE', created_at: new Date().toISOString()
        });
        // Log movement
        db._data.estoque_movimentacoes.push({
          id: db._data.estoque_movimentacoes.length + 1,
          produto_id: newId,
          quantidade: estoque_atual,
          tipo: 'entrada',
          motivo: 'Cadastro inicial de produto',
          usuario_id: usuarioId,
          data_movimentacao: new Date().toISOString()
        });
        db._save();
        return { id: newId };
      }
    }

    if (id) {
      const oldProd = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(id);
      const stmt = db.prepare('UPDATE produtos SET codigo_barras = ?, nome = ?, categoria_id = ?, preco_custo = ?, preco_venda = ?, estoque_atual = ?, estoque_minimo = ?, unidade = ?, tipo_produto = ? WHERE id = ?');
      stmt.run(codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade || 'UN', tipo_produto || 'UNIDADE', id);

      if (oldProd && oldProd.estoque_atual !== estoque_atual) {
        const diff = estoque_atual - oldProd.estoque_atual;
        db.prepare('INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)')
          .run(id, diff, 'ajuste', 'Ajuste manual de cadastro', usuarioId);
      }
      return { id };
    } else {
      const stmt = db.prepare('INSERT INTO produtos (codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, tipo_produto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const result = stmt.run(codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade || 'UN', tipo_produto || 'UNIDADE');
      const newId = result.lastInsertRowid;

      db.prepare('INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)')
        .run(newId, estoque_atual, 'entrada', 'Cadastro inicial de produto', usuarioId);
      return { id: newId };
    }
  },

  ajustarEstoque: (produtoId, quantidade, tipo, motivo, usuarioId) => {
    if (db.isJson) {
      const idx = db._data.produtos.findIndex(p => p.id === produtoId);
      if (idx !== -1) {
        const p = db._data.produtos[idx];
        const cat = db._data.categorias.find(c => c.id === p.categoria_id);
        
        if (cat && cat.controle_estoque === 1) {
          const catIdx = db._data.categorias.findIndex(c => c.id === cat.id);
          const oldCatStock = cat.estoque_atual || 0;
          let newCatStock = oldCatStock;
          let qtyMov = quantidade;

          if (tipo === 'entrada') {
            newCatStock += quantidade;
          } else if (tipo === 'saida') {
            newCatStock -= quantidade;
          } else if (tipo === 'ajuste') {
            qtyMov = quantidade - oldCatStock;
            newCatStock = quantidade;
          }

          db._data.categorias[catIdx].estoque_atual = newCatStock;
          
          db._data.estoque_movimentacoes.push({
            id: db._data.estoque_movimentacoes.length + 1,
            produto_id: produtoId,
            categoria_id: cat.id,
            quantidade: qtyMov,
            tipo,
            motivo: motivo || 'Ajuste de estoque de categoria',
            usuario_id: usuarioId,
            data_movimentacao: new Date().toISOString()
          });
          db._save();
          return { success: true, novoEstoque: newCatStock };
        }

        const newStock = tipo === 'entrada' ? p.estoque_atual + quantidade : tipo === 'saida' ? p.estoque_atual - quantidade : quantidade;
        db._data.produtos[idx].estoque_atual = newStock;
        
        db._data.estoque_movimentacoes.push({
          id: db._data.estoque_movimentacoes.length + 1,
          produto_id: produtoId,
          quantidade: tipo === 'ajuste' ? (quantidade - p.estoque_atual) : quantidade,
          tipo,
          motivo,
          usuario_id: usuarioId,
          data_movimentacao: new Date().toISOString()
        });
        db._save();
        return { success: true, novoEstoque: newStock };
      }
      return { success: false };
    }

    const prod = db.prepare('SELECT p.*, c.controle_estoque as cat_controle, c.estoque_atual as cat_estoque FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?').get(produtoId);
    if (!prod) return { success: false };

    if (prod.cat_controle === 1) {
      const catId = prod.categoria_id;
      const oldCatStock = prod.cat_estoque || 0;
      let newCatStock = oldCatStock;
      let qtyMov = quantidade;

      if (tipo === 'entrada') {
        newCatStock += quantidade;
      } else if (tipo === 'saida') {
        newCatStock -= quantidade;
      } else if (tipo === 'ajuste') {
        qtyMov = quantidade - oldCatStock;
        newCatStock = quantidade;
      }

      db.prepare('UPDATE categorias SET estoque_atual = ? WHERE id = ?').run(newCatStock, catId);
      db.prepare('INSERT INTO estoque_movimentacoes (produto_id, categoria_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(produtoId, catId, qtyMov, tipo, motivo, usuarioId);

      return { success: true, novoEstoque: newCatStock };
    }

    let novoEstoque = prod.estoque_atual;
    let qtyMov = quantidade;

    if (tipo === 'entrada') {
      novoEstoque += quantidade;
    } else if (tipo === 'saida') {
      novoEstoque -= quantidade;
    } else if (tipo === 'ajuste') {
      qtyMov = quantidade - prod.estoque_atual;
      novoEstoque = quantidade;
    }

    db.prepare('UPDATE produtos SET estoque_atual = ? WHERE id = ?').run(novoEstoque, produtoId);
    db.prepare('INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)')
      .run(produtoId, qtyMov, tipo, motivo, usuarioId);

    return { success: true, novoEstoque };
  },

  getMovimentacoesEstoque: () => {
    if (db.isJson) {
      return db._data.estoque_movimentacoes.map(m => {
        const prod = m.produto_id ? db._data.produtos.find(p => p.id === m.produto_id) : null;
        const cat = m.categoria_id ? db._data.categorias.find(c => c.id === m.categoria_id) : null;
        const user = db._data.usuarios.find(u => u.id === m.usuario_id);
        
        let label = 'Produto Excluído';
        if (prod) {
          label = prod.nome;
        } else if (cat) {
          label = `LOTE/BRUTO: ${cat.nome}`;
        }
        
        return {
          ...m,
          produto_nome: label,
          codigo_barras: prod ? prod.codigo_barras : '',
          usuario_nome: user ? user.name : 'Sistema'
        };
      }).reverse();
    }
    return db.prepare(`
      SELECT m.*, p.nome as produto_nome, p.codigo_barras, c.nome as categoria_nome, u.name as usuario_nome
      FROM estoque_movimentacoes m
      LEFT JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.id DESC
      LIMIT 150
    `).all().map(m => {
      let label = m.produto_nome || 'Produto Excluído';
      if (!m.produto_id && m.categoria_nome) {
        label = `LOTE/BRUTO: ${m.categoria_nome}`;
      }
      m.produto_nome = label;
      return m;
    });
  },

  criarVenda: (venda, itens, usuarioId) => {
    if (db.isJson) {
      const vendaId = db._data.vendas.length ? Math.max(...db._data.vendas.map(v => v.id)) + 1 : 1;
      const dataVenda = new Date().toISOString();
      const novaVenda = {
        id: vendaId,
        usuario_id: usuarioId,
        total: venda.total,
        desconto: venda.desconto,
        subtotal: venda.subtotal,
        forma_pagamento: venda.forma_pagamento,
        troco: venda.troco || 0,
        pago: venda.pago || 0,
        data_venda: dataVenda,
        cliente_id: venda.cliente_id || null
      };
      db._data.vendas.push(novaVenda);

      // Update customer debt if payment method is 'fiado'
      if (venda.forma_pagamento === 'fiado' && venda.cliente_id) {
        if (!db._data.clientes) db._data.clientes = [];
        const cIdx = db._data.clientes.findIndex(c => c.id === venda.cliente_id);
        if (cIdx !== -1) {
          db._data.clientes[cIdx].saldo_devedor = parseFloat(((db._data.clientes[cIdx].saldo_devedor || 0) + venda.total).toFixed(2));
        }
      }

      itens.forEach(item => {
        const itemId = db._data.itens_venda.length ? Math.max(...db._data.itens_venda.map(i => i.id)) + 1 : 1;
        db._data.itens_venda.push({
          id: itemId,
          venda_id: vendaId,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          total_item: item.quantidade * item.preco_unitario
        });

        // Deduct stock
        const pIdx = db._data.produtos.findIndex(p => p.id === item.produto_id);
        if (pIdx !== -1) {
          const p = db._data.produtos[pIdx];
          const cat = db._data.categorias.find(c => c.id === p.categoria_id);
          if (cat && cat.controle_estoque === 1) {
            const catIdx = db._data.categorias.findIndex(c => c.id === cat.id);
            db._data.categorias[catIdx].estoque_atual -= item.quantidade;
            
            db._data.estoque_movimentacoes.push({
              id: db._data.estoque_movimentacoes.length + 1,
              produto_id: item.produto_id,
              categoria_id: cat.id,
              quantidade: -item.quantidade,
              tipo: 'saida',
              motivo: `Venda #${vendaId}`,
              usuario_id: usuarioId,
              data_movimentacao: dataVenda
            });
          } else {
            p.estoque_atual -= item.quantidade;
            db._data.estoque_movimentacoes.push({
              id: db._data.estoque_movimentacoes.length + 1,
              produto_id: item.produto_id,
              quantidade: -item.quantidade,
              tipo: 'saida',
              motivo: `Venda #${vendaId}`,
              usuario_id: usuarioId,
              data_movimentacao: dataVenda
            });
          }
        }
      });

      db._save();
      dbService.logAcao(usuarioId, 'VENDA_CRIADA', `Venda #${vendaId} finalizada. Total: R$ ${venda.total.toFixed(2)}`);
      return { id: vendaId };
    }

    // SQLite Transaction
    const transaction = db.transaction(() => {
      const stmtVenda = db.prepare(`
        INSERT INTO vendas (usuario_id, total, desconto, subtotal, forma_pagamento, troco, pago, cliente_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmtVenda.run(
          usuarioId,
          venda.total,
          venda.desconto,
          venda.subtotal,
          venda.forma_pagamento,
          venda.troco || 0,
          venda.pago || 0,
          venda.cliente_id || null
      );
      const vendaId = result.lastInsertRowid;

      // Update customer debt if payment method is 'fiado'
      if (venda.forma_pagamento === 'fiado' && venda.cliente_id) {
        db.prepare('UPDATE clientes SET saldo_devedor = saldo_devedor + ? WHERE id = ?')
          .run(venda.total, venda.cliente_id);
      }

      const stmtItem = db.prepare(`
        INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, total_item)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const stmtCheckCat = db.prepare(`
        SELECT p.categoria_id, c.controle_estoque 
        FROM produtos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id 
        WHERE p.id = ?
      `);

      const stmtUpdateEstoque = db.prepare(`
        UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
      `);

      const stmtUpdateCatEstoque = db.prepare(`
        UPDATE categorias SET estoque_atual = estoque_atual - ? WHERE id = ?
      `);

      const stmtMov = db.prepare(`
        INSERT INTO estoque_movimentacoes (produto_id, categoria_id, quantidade, tipo, motivo, usuario_id)
        VALUES (?, ?, ?, 'saida', ?, ?)
      `);

      for (const item of itens) {
        stmtItem.run(vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.quantidade * item.preco_unitario);
        
        const info = stmtCheckCat.get(item.produto_id);
        if (info && info.controle_estoque === 1) {
          stmtUpdateCatEstoque.run(item.quantidade, info.categoria_id);
          stmtMov.run(item.produto_id, info.categoria_id, -item.quantidade, `Venda #${vendaId}`, usuarioId);
        } else {
          stmtUpdateEstoque.run(item.quantidade, item.produto_id);
          stmtMov.run(item.produto_id, null, -item.quantidade, `Venda #${vendaId}`, usuarioId);
        }
      }

      return vendaId;
    });

    const vId = transaction();
    dbService.logAcao(usuarioId, 'VENDA_CRIADA', `Venda #${vId} finalizada. Total: R$ ${venda.total.toFixed(2)}`);
    return { id: vId };
  },

  getVendas: () => {
    if (db.isJson) {
      return db._data.vendas.map(v => {
        const u = db._data.usuarios.find(u => u.id === v.usuario_id);
        const c = v.cliente_id && db._data.clientes ? db._data.clientes.find(c => c.id === v.cliente_id) : null;
        return { ...v, usuario_nome: u ? u.name : 'Desconhecido', cliente_nome: c ? c.nome : null };
      }).reverse();
    }
    return db.prepare(`
      SELECT v.*, u.name as usuario_nome, c.nome as cliente_nome
      FROM vendas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.id DESC
    `).all();
  },

  getVendaDetalhes: (vendaId) => {
    if (db.isJson) {
      const venda = db._data.vendas.find(v => v.id === vendaId);
      if (!venda) return null;
      const u = db._data.usuarios.find(u => u.id === venda.usuario_id);
      const c = venda.cliente_id && db._data.clientes ? db._data.clientes.find(c => c.id === venda.cliente_id) : null;
      const itens = db._data.itens_venda
        .filter(iv => iv.venda_id === vendaId)
        .map(iv => {
          const prod = db._data.produtos.find(p => p.id === iv.produto_id);
          return {
            ...iv,
            produto_nome: prod ? prod.nome : 'Produto Excluído',
            codigo_barras: prod ? prod.codigo_barras : ''
          };
        });
      return {
        venda: { ...venda, usuario_nome: u ? u.name : 'Desconhecido', cliente_nome: c ? c.nome : null },
        itens
      };
    }

    const venda = db.prepare(`
      SELECT v.*, u.name as usuario_nome, c.nome as cliente_nome 
      FROM vendas v 
      LEFT JOIN usuarios u ON v.usuario_id = u.id 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      WHERE v.id = ?
    `).get(vendaId);
    if (!venda) return null;

    const itens = db.prepare(`
      SELECT iv.*, p.nome as produto_nome, p.codigo_barras
      FROM itens_venda iv
      LEFT JOIN produtos p ON iv.produto_id = p.id
      WHERE iv.venda_id = ?
    `).all(vendaId);

    return { venda, itens };
  },

  // Suppliers & XML Imports
  getFornecedores: () => {
    if (db.isJson) return db._data.fornecedores;
    return db.prepare('SELECT * FROM fornecedores ORDER BY nome ASC').all();
  },

  salvarFornecedor: (fornecedor) => {
    const { nome, cnpj, email, telefone } = fornecedor;
    if (db.isJson) {
      const exists = db._data.fornecedores.find(f => f.cnpj === cnpj);
      if (exists) {
        exists.nome = nome;
        exists.email = email;
        exists.telefone = telefone;
        db._save();
        return exists;
      }
      const newId = db._data.fornecedores.length ? Math.max(...db._data.fornecedores.map(f => f.id)) + 1 : 1;
      const f = { id: newId, nome, cnpj, email, telefone, created_at: new Date().toISOString() };
      db._data.fornecedores.push(f);
      db._save();
      return f;
    }

    const check = db.prepare('SELECT * FROM fornecedores WHERE cnpj = ?').get(cnpj);
    if (check) {
      db.prepare('UPDATE fornecedores SET nome = ?, email = ?, telefone = ? WHERE id = ?').run(nome, email, telefone, check.id);
      return { id: check.id, nome, cnpj, email, telefone };
    }

    const stmt = db.prepare('INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES (?, ?, ?, ?)');
    const result = stmt.run(nome, cnpj, email, telefone);
    return { id: result.lastInsertRowid, nome, cnpj, email, telefone };
  },

  importarNotaFiscal: (xmlData, usuarioId) => {
    const { fornecedor, nota, itens } = xmlData;

    if (db.isJson) {
      const fornObj = dbService.salvarFornecedor(fornecedor);
      
      // Check duplicated note
      const noteExists = db._data.notas_entrada.find(n => n.numero_nota === nota.numero_nota && n.fornecedor_id === fornObj.id);
      if (noteExists) {
        throw new Error(`Esta nota fiscal #${nota.numero_nota} deste fornecedor já foi importada anteriormente.`);
      }

      const notaId = db._data.notas_entrada.length ? Math.max(...db._data.notas_entrada.map(n => n.id)) + 1 : 1;
      const novaNota = {
        id: notaId,
        fornecedor_id: fornObj.id,
        numero_nota: nota.numero_nota,
        chave_acesso: nota.chave_acesso,
        data_emissao: nota.data_emissao,
        valor_total: nota.valor_total,
        data_importacao: new Date().toISOString()
      };
      db._data.notas_entrada.push(novaNota);

      itens.forEach(item => {
        // Find or create product
        let prod = db._data.produtos.find(p => p.codigo_barras === item.codigo_barras);
        if (!prod) {
          const newPId = db._data.produtos.length ? Math.max(...db._data.produtos.map(p => p.id)) + 1 : 1;
          prod = {
            id: newPId,
            codigo_barras: item.codigo_barras,
            nome: item.nome,
            categoria_id: 1, // Default Mercearia
            preco_custo: item.preco_custo,
            preco_venda: parseFloat((item.preco_custo * 1.50).toFixed(2)), // Margem padrão 50%
            estoque_atual: 0,
            estoque_minimo: 5,
            unidade: 'UN',
            tipo_produto: 'UNIDADE',
            created_at: new Date().toISOString()
          };
          db._data.produtos.push(prod);
        } else {
          // Update cost price
          prod.preco_custo = item.preco_custo;
        }

        // Add item to note
        const nItemId = db._data.notas_itens.length ? Math.max(...db._data.notas_itens.map(ni => ni.id)) + 1 : 1;
        db._data.notas_itens.push({
          id: nItemId,
          nota_entrada_id: notaId,
          produto_id: prod.id,
          quantidade: item.quantidade,
          preco_custo: item.preco_custo
        });

        // Update product stock
        prod.estoque_atual += item.quantidade;

        // Stock movement log
        db._data.estoque_movimentacoes.push({
          id: db._data.estoque_movimentacoes.length + 1,
          produto_id: prod.id,
          quantidade: item.quantidade,
          tipo: 'entrada',
          motivo: `Importação XML Nota #${nota.numero_nota}`,
          usuario_id: usuarioId,
          data_movimentacao: new Date().toISOString()
        });
      });

      db._save();
      dbService.logAcao(usuarioId, 'XML_IMPORTADO', `Nota Fiscal #${nota.numero_nota} importada. Total: R$ ${nota.valor_total.toFixed(2)}`);
      return { id: notaId };
    }

    // SQLite transaction for safety
    const transaction = db.transaction(() => {
      const fornObj = dbService.salvarFornecedor(fornecedor);

      const checkNote = db.prepare('SELECT * FROM notas_entrada WHERE numero_nota = ? AND fornecedor_id = ?').get(nota.numero_nota, fornObj.id);
      if (checkNote) {
        throw new Error(`Esta nota fiscal #${nota.numero_nota} deste fornecedor já foi importada anteriormente.`);
      }

      const stmtNota = db.prepare(`
        INSERT INTO notas_entrada (fornecedor_id, numero_nota, chave_acesso, data_emissao, valor_total)
        VALUES (?, ?, ?, ?, ?)
      `);
      const resultNota = stmtNota.run(fornObj.id, nota.numero_nota, nota.chave_acesso, nota.data_emissao, nota.valor_total);
      const notaId = resultNota.lastInsertRowid;

      const stmtItemNota = db.prepare(`
        INSERT INTO notas_itens (nota_entrada_id, produto_id, quantidade, preco_custo)
        VALUES (?, ?, ?, ?)
      `);

      const stmtUpdateEstoque = db.prepare(`
        UPDATE produtos SET estoque_atual = estoque_atual + ?, preco_custo = ? WHERE id = ?
      `);

      const stmtMov = db.prepare(`
        INSERT INTO estoque_movimentacoes (produto_id, quantidade, tipo, motivo, usuario_id)
        VALUES (?, ?, 'entrada', ?, ?)
      `);

      for (const item of itens) {
        // Find or create product
        let prod = db.prepare('SELECT * FROM produtos WHERE codigo_barras = ?').get(item.codigo_barras);
        let prodId;
        if (!prod) {
          const stmtNewProd = db.prepare(`
            INSERT INTO produtos (codigo_barras, nome, categoria_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, tipo_produto)
            VALUES (?, ?, 1, ?, ?, 0, 5, 'UN', 'UNIDADE')
          `);
          const resNew = stmtNewProd.run(item.codigo_barras, item.nome, item.preco_custo, parseFloat((item.preco_custo * 1.5).toFixed(2)));
          prodId = resNew.lastInsertRowid;
        } else {
          prodId = prod.id;
        }

        // Write note item
        stmtItemNota.run(notaId, prodId, item.quantidade, item.preco_custo);

        // Update product stock and cost
        stmtUpdateEstoque.run(item.quantidade, item.preco_custo, prodId);

        // Log movement
        stmtMov.run(prodId, item.quantidade, `Importação XML Nota #${nota.numero_nota}`, usuarioId);
      }

      return notaId;
    });

    try {
      const nId = transaction();
      dbService.logAcao(usuarioId, 'XML_IMPORTADO', `Nota Fiscal #${nota.numero_nota} importada. Total: R$ ${nota.valor_total.toFixed(2)}`);
      return { id: nId };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  getNotasImportadas: () => {
    if (db.isJson) {
      return db._data.notas_entrada.map(n => {
        const forn = db._data.fornecedores.find(f => f.id === n.fornecedor_id);
        return { ...n, fornecedor_nome: forn ? forn.nome : 'Desconhecido' };
      }).reverse();
    }
    return db.prepare(`
      SELECT n.*, f.nome as fornecedor_nome
      FROM notas_entrada n
      LEFT JOIN fornecedores f ON n.fornecedor_id = f.id
      ORDER BY n.id DESC
    `).all();
  },

  // Dashboard Stats
  getDashboardStats: (periodo = 'hoje') => {
    // Determine SQL dates
    let dateFilter = "strftime('%Y-%m-%d', data_venda) = strftime('%Y-%m-%d', 'now', 'localtime')";
    if (periodo === 'mes') {
      dateFilter = "strftime('%Y-%m', data_venda) = strftime('%Y-%m', 'now', 'localtime')";
    }

    if (db.isJson) {
      // Manual Javascript calculations for fallback JSON DB
      const todayStr = new Date().toISOString().substring(0, 10);
      const thisMonthStr = new Date().toISOString().substring(0, 7);
      
      const filteredSales = db._data.vendas.filter(v => {
        const vDate = v.data_venda.substring(0, 10);
        return periodo === 'mes' ? vDate.startsWith(thisMonthStr) : vDate === todayStr;
      });

      let faturamento = 0;
      let ticketMedio = 0;
      let totalVendas = filteredSales.length;
      let totalItensVendidos = 0;
      let lucro = 0;

      filteredSales.forEach(v => {
        faturamento += v.total;
        
        // Calculate items and costs
        const vItens = db._data.itens_venda.filter(iv => iv.venda_id === v.id);
        vItens.forEach(iv => {
          totalItensVendidos += iv.quantidade;
          const p = db._data.produtos.find(prod => prod.id === iv.produto_id);
          if (p) {
            const custoItem = iv.quantidade * p.preco_custo;
            lucro += (iv.total_item - custoItem);
          }
        });
      });

      // Subtract discounts from profit
      const totalDesconto = filteredSales.reduce((acc, v) => acc + v.desconto, 0);
      lucro = Math.max(0, lucro - totalDesconto);

      ticketMedio = totalVendas ? (faturamento / totalVendas) : 0;

      // Top selling products
      const prodSales = {};
      filteredSales.forEach(v => {
        const vItens = db._data.itens_venda.filter(iv => iv.venda_id === v.id);
        vItens.forEach(iv => {
          if (!prodSales[iv.produto_id]) {
            const p = db._data.produtos.find(prod => prod.id === iv.produto_id);
            prodSales[iv.produto_id] = { nome: p ? p.nome : 'Excluído', quantidade: 0, total: 0 };
          }
          prodSales[iv.produto_id].quantidade += iv.quantidade;
          prodSales[iv.produto_id].total += iv.total_item;
        });
      });

      const topProdutos = Object.values(prodSales)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      // Low stock count
      const estoqueBaixo = db._data.produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;

      return {
        faturamento,
        totalVendas,
        ticketMedio,
        lucro,
        estoqueBaixo,
        totalItensVendidos,
        topProdutos
      };
    }

    try {
      const faturamentoRow = db.prepare(`SELECT SUM(total) as sum, COUNT(id) as count FROM vendas WHERE ${dateFilter}`).get();
      const faturamento = faturamentoRow.sum || 0;
      const totalVendas = faturamentoRow.count || 0;
      const ticketMedio = totalVendas ? (faturamento / totalVendas) : 0;

      // Calculate total cost and discounts to compute real profit
      const profitRow = db.prepare(`
        SELECT SUM(iv.total_item - (iv.quantidade * p.preco_custo)) as raw_profit
        FROM itens_venda iv
        JOIN vendas v ON iv.venda_id = v.id
        JOIN produtos p ON iv.produto_id = p.id
        WHERE ${dateFilter.replace('data_venda', 'v.data_venda')}
      `).get();

      const discountsRow = db.prepare(`SELECT SUM(desconto) as sum FROM vendas WHERE ${dateFilter}`).get();
      const totalDesconto = discountsRow.sum || 0;
      const lucro = Math.max(0, (profitRow.raw_profit || 0) - totalDesconto);

      // Low stock alert
      const lowStockRow = db.prepare('SELECT COUNT(id) as count FROM produtos WHERE estoque_atual <= estoque_minimo').get();
      const estoqueBaixo = lowStockRow.count || 0;

      // Top selling products
      const topProdutos = db.prepare(`
        SELECT p.nome, SUM(iv.quantidade) as quantidade, SUM(iv.total_item) as total
        FROM itens_venda iv
        JOIN produtos p ON iv.produto_id = p.id
        JOIN vendas v ON iv.venda_id = v.id
        WHERE ${dateFilter.replace('data_venda', 'v.data_venda')}
        GROUP BY iv.produto_id
        ORDER BY quantidade DESC
        LIMIT 5
      `).all();

      return {
        faturamento,
        totalVendas,
        ticketMedio,
        lucro,
        estoqueBaixo,
        topProdutos
      };
    } catch (e) {
      console.error(e);
      return { faturamento: 0, totalVendas: 0, ticketMedio: 0, lucro: 0, estoqueBaixo: 0, topProdutos: [] };
    }
  },

  getGraficoVendas: () => {
    // Retorna vendas dos últimos 7 dias
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().substring(0, 10));
    }

    if (db.isJson) {
      const labels = dates.map(d => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}`;
      });
      const data = dates.map(dateStr => {
        const daySales = db._data.vendas.filter(v => v.data_venda.startsWith(dateStr));
        return daySales.reduce((acc, v) => acc + v.total, 0);
      });
      return { labels, data };
    }

    const labels = [];
    const data = [];

    dates.forEach(dateStr => {
      const parts = dateStr.split('-');
      labels.push(`${parts[2]}/${parts[1]}`);

      const row = db.prepare("SELECT SUM(total) as sum FROM vendas WHERE strftime('%Y-%m-%d', data_venda) = ?").get(dateStr);
      data.push(row.sum || 0);
    });

    return { labels, data };
  },

  excluirProduto: (id, usuarioId = 1) => {
    if (db.isJson) {
      const idx = db._data.produtos.findIndex(p => p.id === id);
      if (idx !== -1) {
        const prod = db._data.produtos[idx];
        db._data.produtos.splice(idx, 1);
        // Also clean up stock movements
        db._data.estoque_movimentacoes = db._data.estoque_movimentacoes.filter(m => m.produto_id !== id);
        db._save();
        dbService.logAcao(usuarioId, 'PRODUTO_EXCLUIDO', `Produto ${prod.nome} (ID: ${id}) excluído com sucesso`);
        return { success: true };
      }
      return { success: false, message: 'Produto não encontrado' };
    }

    try {
      const prod = db.prepare('SELECT nome FROM produtos WHERE id = ?').get(id);
      if (!prod) return { success: false, message: 'Produto não encontrado' };

      const transaction = db.transaction(() => {
        // Delete stock movements
        db.prepare('DELETE FROM estoque_movimentacoes WHERE produto_id = ?').run(id);
        // Delete invoice items
        db.prepare('DELETE FROM notas_itens WHERE produto_id = ?').run(id);
        // Delete from products
        db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
      });

      transaction();
      dbService.logAcao(usuarioId, 'PRODUTO_EXCLUIDO', `Produto ${prod.nome} (ID: ${id}) excluído com sucesso`);
      return { success: true };
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      return { success: false, message: err.message };
    }
  },

  // CLIENTS & FIADO
  getClientes: () => {
    if (db.isJson) {
      return db._data.clientes || [];
    }
    return db.prepare('SELECT * FROM clientes ORDER BY nome ASC').all();
  },

  salvarCliente: (cliente) => {
    const { id, nome, telefone, cpf, limite_credito, saldo_devedor } = cliente;
    if (db.isJson) {
      if (!db._data.clientes) db._data.clientes = [];
      if (id) {
        const idx = db._data.clientes.findIndex(c => c.id === id);
        if (idx !== -1) {
          db._data.clientes[idx] = {
            ...db._data.clientes[idx],
            nome,
            telefone,
            cpf,
            limite_credito: parseFloat(limite_credito || 0),
            saldo_devedor: parseFloat(saldo_devedor !== undefined ? saldo_devedor : db._data.clientes[idx].saldo_devedor || 0)
          };
          db._save();
          return { id };
        }
      } else {
        const newId = db._data.clientes.length ? Math.max(...db._data.clientes.map(c => c.id)) + 1 : 1;
        const newC = {
          id: newId,
          nome,
          telefone,
          cpf,
          limite_credito: parseFloat(limite_credito || 0),
          saldo_devedor: parseFloat(saldo_devedor || 0),
          created_at: new Date().toISOString()
        };
        db._data.clientes.push(newC);
        db._save();
        return newC;
      }
    }

    if (id) {
      const stmt = db.prepare('UPDATE clientes SET nome = ?, telefone = ?, cpf = ?, limite_credito = ?, saldo_devedor = ? WHERE id = ?');
      stmt.run(nome, telefone, cpf, parseFloat(limite_credito || 0), parseFloat(saldo_devedor || 0), id);
      return { id };
    } else {
      const stmt = db.prepare('INSERT INTO clientes (nome, telefone, cpf, limite_credito, saldo_devedor) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(nome, telefone, cpf, parseFloat(limite_credito || 0), parseFloat(saldo_devedor || 0));
      return { id: result.lastInsertRowid, nome, telefone, cpf, limite_credito, saldo_devedor };
    }
  },

  lancarPagamentoCliente: (clienteId, valor, formaPagamento, usuarioId = 1) => {
    const valorNum = parseFloat(valor);
    if (db.isJson) {
      if (!db._data.cliente_pagamentos) db._data.cliente_pagamentos = [];
      
      const cIdx = db._data.clientes.findIndex(c => c.id === clienteId);
      if (cIdx === -1) throw new Error("Cliente não encontrado");

      // Update debt
      db._data.clientes[cIdx].saldo_devedor = parseFloat((db._data.clientes[cIdx].saldo_devedor - valorNum).toFixed(2));

      // Record payment
      const pId = db._data.cliente_pagamentos.length ? Math.max(...db._data.cliente_pagamentos.map(p => p.id)) + 1 : 1;
      const dataP = new Date().toISOString();
      db._data.cliente_pagamentos.push({
        id: pId,
        cliente_id: clienteId,
        valor: valorNum,
        forma_pagamento: formaPagamento,
        usuario_id: usuarioId,
        data_pagamento: dataP
      });

      db._save();
      dbService.logAcao(usuarioId, 'PAGAMENTO_CLIENTE', `Recebimento de fiado do cliente #${clienteId}. Valor: R$ ${valorNum.toFixed(2)}`);
      return { success: true, novoSaldo: db._data.clientes[cIdx].saldo_devedor };
    }

    const transaction = db.transaction(() => {
      // Get current debt
      const c = db.prepare('SELECT saldo_devedor FROM clientes WHERE id = ?').get(clienteId);
      if (!c) throw new Error("Cliente não encontrado");

      const novoSaldo = parseFloat((c.saldo_devedor - valorNum).toFixed(2));

      // Update customer debt
      db.prepare('UPDATE clientes SET saldo_devedor = ? WHERE id = ?').run(novoSaldo, clienteId);

      // Record payment
      db.prepare('INSERT INTO cliente_pagamentos (cliente_id, valor, forma_pagamento, usuario_id) VALUES (?, ?, ?, ?)')
        .run(clienteId, valorNum, formaPagamento, usuarioId);

      return novoSaldo;
    });

    const novoSaldo = transaction();
    dbService.logAcao(usuarioId, 'PAGAMENTO_CLIENTE', `Recebimento de fiado do cliente #${clienteId}. Valor: R$ ${valorNum.toFixed(2)}`);
    return { success: true, novoSaldo };
  },

  getClientePagamentos: (clienteId) => {
    if (db.isJson) {
      if (!db._data.cliente_pagamentos) return [];
      return db._data.cliente_pagamentos
        .filter(p => p.cliente_id === clienteId)
        .map(p => {
          const u = db._data.usuarios.find(user => user.id === p.usuario_id);
          return { ...p, usuario_nome: u ? u.name : 'Desconhecido' };
        }).reverse();
    }
    return db.prepare(`
      SELECT p.*, u.name as usuario_nome
      FROM cliente_pagamentos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.cliente_id = ?
      ORDER BY p.id DESC
    `).all(clienteId);
  },

  getClienteExtrato: (clienteId) => {
    let extrato = [];

    if (db.isJson) {
      const cliente = db._data.clientes.find(c => c.id === clienteId);
      if (!cliente) return null;

      // Purchases
      const compras = db._data.vendas
        .filter(v => v.cliente_id === clienteId && v.forma_pagamento === 'fiado')
        .map(v => ({
          tipo: 'compra',
          id: v.id,
          valor: v.total,
          data: v.data_venda,
          descricao: `Compra #${v.id}`
        }));

      // Payments
      const pagamentos = (db._data.cliente_pagamentos || [])
        .filter(p => p.cliente_id === clienteId)
        .map(p => ({
          tipo: 'pagamento',
          id: p.id,
          valor: p.valor,
          data: p.data_pagamento,
          descricao: `Pagamento (${p.forma_pagamento.toUpperCase()})`
        }));

      extrato = [...compras, ...pagamentos].sort((a, b) => new Date(b.data) - new Date(a.data));
      return { cliente, extrato };
    }

    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
    if (!cliente) return null;

    const compras = db.prepare(`
      SELECT 'compra' as tipo, id, total as valor, data_venda as data, 'Compra #' || id as descricao
      FROM vendas
      WHERE cliente_id = ? AND forma_pagamento = 'fiado'
    `).all(clienteId);

    const pagamentos = db.prepare(`
      SELECT 'pagamento' as tipo, id, valor, data_pagamento as data, 'Pagamento (' || upper(forma_pagamento) || ')' as descricao
      FROM cliente_pagamentos
      WHERE cliente_id = ?
    `).all(clienteId);

    extrato = [...compras, ...pagamentos].sort((a, b) => new Date(b.data) - new Date(a.data));
    return { cliente, extrato };
  }
};

module.exports = dbService;
