const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dbService = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: true, // We keep the standard OS border, or we can make a custom border
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Bind IPC Handles
  
  // Auth
  ipcMain.handle('auth:login', async (event, username, password) => {
    return dbService.login(username, password);
  });
  
  ipcMain.handle('auth:getUsuarios', async () => {
    return dbService.getUsuarios();
  });
  
  ipcMain.handle('auth:salvarUsuario', async (event, user) => {
    return dbService.salvarUsuario(user);
  });
  
  ipcMain.handle('auth:getLogs', async () => {
    return dbService.getLogs();
  });

  ipcMain.handle('auth:logAcao', async (event, usuarioId, acao, detalhes) => {
    return dbService.logAcao(usuarioId, acao, detalhes);
  });

  // DB / Stock
  ipcMain.handle('db:getCategorias', async () => {
    return dbService.getCategorias();
  });
  
  ipcMain.handle('db:salvarCategoria', async (event, nome) => {
    return dbService.salvarCategoria(nome);
  });
  
  ipcMain.handle('db:getProdutos', async () => {
    return dbService.getProdutos();
  });
  
  ipcMain.handle('db:buscarProdutoPorCodigo', async (event, codigo) => {
    return dbService.buscarProdutoPorCodigo(codigo);
  });
  
  ipcMain.handle('db:salvarProduto', async (event, product, usuarioId) => {
    return dbService.salvarProduto(product, usuarioId);
  });
  
  ipcMain.handle('db:ajustarEstoque', async (event, produtoId, quantidade, tipo, motivo, usuarioId) => {
    return dbService.ajustarEstoque(produtoId, quantidade, tipo, motivo, usuarioId);
  });

  ipcMain.handle('db:getMovimentacoesEstoque', async () => {
    return dbService.getMovimentacoesEstoque();
  });

  ipcMain.handle('db:excluirProduto', async (event, id, usuarioId) => {
    return dbService.excluirProduto(id, usuarioId);
  });

  // Sales
  ipcMain.handle('sales:criarVenda', async (event, venda, itens, usuarioId) => {
    return dbService.criarVenda(venda, itens, usuarioId);
  });
  
  ipcMain.handle('sales:getVendas', async () => {
    return dbService.getVendas();
  });
  
  ipcMain.handle('sales:getVendaDetalhes', async (event, vendaId) => {
    return dbService.getVendaDetalhes(vendaId);
  });
  
  ipcMain.handle('sales:getDashboardStats', async (event, periodo) => {
    return dbService.getDashboardStats(periodo);
  });
  
  ipcMain.handle('sales:getGraficoVendas', async () => {
    return dbService.getGraficoVendas();
  });

  // XML
  ipcMain.handle('xml:importarNotaFiscal', async (event, xmlData, usuarioId) => {
    return dbService.importarNotaFiscal(xmlData, usuarioId);
  });
  
  ipcMain.handle('xml:getFornecedores', async () => {
    return dbService.getFornecedores();
  });
  
  ipcMain.handle('xml:getNotasImportadas', async () => {
    return dbService.getNotasImportadas();
  });

  // Scale integration (Balança)
  ipcMain.handle('balanca:lerPeso', async (event, config) => {
    const { ativa, porta, protocolo, pesoSimulado } = config || {};
    
    if (!ativa || porta === 'SIMULACAO') {
      // Simulate physical scale
      // Let's generate a slightly fluctuating weight between 0.100 and 3.000
      let weight = pesoSimulado !== undefined && pesoSimulado !== null ? parseFloat(pesoSimulado) : null;
      if (weight === null) {
        // Return a semi-random weight for demonstration
        const base = 1.450;
        const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
        weight = parseFloat((base + fluctuation).toFixed(3));
        if (weight < 0) weight = 0;
      }
      return {
        sucesso: true,
        peso: weight,
        simulado: true,
        porta: 'SIMULAÇÃO',
        mensagem: 'Modo simulação ativo.'
      };
    }

    // Physical Scale logic with serialport
    let SerialPort;
    try {
      // Dynamic import to avoid crash if serialport not installed or not compiled
      const serialport = require('serialport');
      SerialPort = serialport.SerialPort;
    } catch (err) {
      console.warn("Serialport module is not available, falling back to simulation.", err.message);
      // Fallback weight
      const base = 1.450;
      const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
      const weight = parseFloat((base + fluctuation).toFixed(3));
      return {
        sucesso: true,
        peso: weight,
        simulado: true,
        porta: `${porta} (Simulada - Erro de Dependência)`,
        mensagem: 'Módulo serialport indisponível. Executando em modo simulação.'
      };
    }

    return new Promise((resolve) => {
      let port;
      let timeoutId;
      let resolved = false;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        if (port && port.isOpen) {
          port.close((closeErr) => {
            if (closeErr) console.error("Error closing serial port:", closeErr);
          });
        }
        resolve(result);
      };

      try {
        port = new SerialPort({
          path: porta,
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          autoOpen: false
        });

        // Timeout fallback after 1.5 seconds
        timeoutId = setTimeout(() => {
          // If it timed out, return simulation weight or zero
          const base = 1.450;
          const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
          const weight = parseFloat((base + fluctuation).toFixed(3));
          finish({
            sucesso: true,
            peso: weight,
            simulado: true,
            porta: `${porta} (Simulada - Timeout)`,
            mensagem: 'Balança não respondeu no tempo limite. Retornando peso simulado.'
          });
        }, 1500);

        port.open((err) => {
          if (err) {
            console.error(`Error opening port ${porta}:`, err.message);
            const base = 1.450;
            const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
            const weight = parseFloat((base + fluctuation).toFixed(3));
            finish({
              sucesso: true,
              peso: weight,
              simulado: true,
              porta: `${porta} (Simulada - Falha de Conexão)`,
              mensagem: `Não foi possível abrir a porta ${porta}. Usando simulação.`
            });
            return;
          }

          // Buffer for incoming data
          let dataBuffer = Buffer.alloc(0);

          port.on('data', (chunk) => {
            dataBuffer = Buffer.concat([dataBuffer, chunk]);
            
            // Try parsing the buffer
            const parsedWeight = parseSerialWeight(dataBuffer, protocolo);
            if (parsedWeight !== null) {
              finish({
                sucesso: true,
                peso: parsedWeight,
                simulado: false,
                porta: porta,
                mensagem: 'Peso lido com sucesso da balança física.'
              });
            }
          });

          // Send ENQ command (0x05) to trigger reading (demand mode)
          // Toledo Prix3 and Filizola standard trigger is 0x05 (ENQ)
          port.write(Buffer.from([0x05]), (writeErr) => {
            if (writeErr) {
              console.error("Error writing to serial port:", writeErr.message);
            }
          });
        });

        port.on('error', (portErr) => {
          console.error("Serial port error event:", portErr.message);
          const base = 1.450;
          const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
          const weight = parseFloat((base + fluctuation).toFixed(3));
          finish({
            sucesso: true,
            peso: weight,
            simulado: true,
            porta: `${porta} (Simulada - Erro de Comunicação)`,
            mensagem: `Erro na porta serial: ${portErr.message}. Usando simulação.`
          });
        });

      } catch (err) {
        console.error("Failed to execute serial port routine:", err.message);
        const base = 1.450;
        const fluctuation = parseFloat((Math.sin(Date.now() / 800) * 0.25).toFixed(3));
        const weight = parseFloat((base + fluctuation).toFixed(3));
        finish({
          sucesso: true,
          peso: weight,
          simulado: true,
          porta: `${porta} (Simulada - Exceção)`,
          mensagem: `Exceção ao ler balança: ${err.message}. Usando simulação.`
        });
      }
    });
  });

  function parseSerialWeight(dataBuffer, protocol) {
    // Toledo/Filizola typical string: [STX]01234[ETX] (0x02 + 5 digits + 0x03)
    const stxIdx = dataBuffer.indexOf(0x02);
    const etxIdx = dataBuffer.indexOf(0x03, stxIdx);
    
    if (stxIdx !== -1 && etxIdx !== -1 && etxIdx > stxIdx) {
      const weightStr = dataBuffer.slice(stxIdx + 1, etxIdx).toString('ascii').replace(/[^0-9]/g, '');
      if (weightStr.length >= 5) {
        // e.g. 01250 -> 1.250 kg
        const weightVal = parseFloat(weightStr) / 1000;
        return weightVal;
      }
    }
    
    // Urano pop protocol / continuous mode fallback: look for 5-digit number
    const match = dataBuffer.toString('ascii').match(/\d{5}/);
    if (match) {
      return parseFloat(match[0]) / 1000;
    }
    
    return null;
  }

  // Printing
  ipcMain.handle('print:imprimirCupom', async (event, htmlContent) => {
    // Create a temporary hidden window to render and print the coupon HTML
    let workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Load the HTML content directly
    workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    workerWindow.webContents.on('did-finish-load', () => {
      // Trigger print to default system printer
      workerWindow.webContents.print({
        silent: false, // Set to true for auto/silent printing, false to select printer
        printBackground: true,
        deviceName: ''
      }, (success, errorType) => {
        if (!success) console.log("Print failed:", errorType);
        workerWindow.close();
        workerWindow = null;
      });
    });

    return { success: true };
  });

  // Backup & Restore
  ipcMain.handle('backup:exportar', async () => {
    const dbFilePath = dbService.getDbPath();
    const isJson = !fs.existsSync(dbFilePath) && fs.existsSync(dbFilePath.replace('.db', '.json'));
    const sourcePath = isJson ? dbFilePath.replace('.db', '.json') : dbFilePath;
    const extension = isJson ? 'json' : 'db';

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Cópia de Segurança',
      defaultPath: `pdv_backup_${new Date().toISOString().slice(0,10)}.${extension}`,
      filters: [{ name: 'Backup Files', extensions: [extension] }]
    });

    if (filePath) {
      try {
        fs.copyFileSync(sourcePath, filePath);
        return { success: true, message: `Backup salvo com sucesso em: ${filePath}` };
      } catch (err) {
        return { success: false, message: `Erro ao exportar backup: ${err.message}` };
      }
    }
    return { success: false, message: 'Operação cancelada' };
  });

  ipcMain.handle('backup:restaurar', async () => {
    const dbFilePath = dbService.getDbPath();
    const isJson = !fs.existsSync(dbFilePath) && fs.existsSync(dbFilePath.replace('.db', '.json'));
    const destPath = isJson ? dbFilePath.replace('.db', '.json') : dbFilePath;
    const extension = isJson ? 'json' : 'db';

    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar Cópia de Segurança para Restaurar',
      filters: [{ name: 'Backup Files', extensions: [extension] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const selectedPath = filePaths[0];
      try {
        // Stop DB operations (better-sqlite3 makes this tricky, but copying over will take effect on app reload)
        fs.copyFileSync(selectedPath, destPath);
        return { success: true, message: 'Banco de dados restaurado. Por favor, reinicie a aplicação para aplicar as alterações.' };
      } catch (err) {
        return { success: false, message: `Erro ao restaurar backup: ${err.message}` };
      }
    }
    return { success: false, message: 'Operação cancelada' };
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
