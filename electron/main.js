const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

const isDev = !app.isPackaged
const PORT = 3001
const BASE_URL = `http://localhost:${PORT}`

let mainWindow
let serverProcess

// Aguarda o servidor Next.js estar pronto
function waitForServer(timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      http
        .get(BASE_URL, (res) => {
          if (res.statusCode < 500) resolve()
          else setTimeout(check, 500)
        })
        .on('error', () => {
          if (Date.now() - start > timeout) reject(new Error('Servidor não respondeu em 60s'))
          else setTimeout(check, 500)
        })
    }
    check()
  })
}

// Em produção, inicia o servidor standalone do Next.js
function startProductionServer() {
  const serverScript = path.join(process.resourcesPath, 'app', 'server.js')
  serverProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: path.join(process.resourcesPath, 'app'),
    stdio: 'ignore',
  })
  serverProcess.on('error', (err) => console.error('Erro no servidor:', err))
  return waitForServer()
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'CRM Hermes Agent',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    backgroundColor: '#0f172a',
  })

  // Só mostra a janela quando estiver pronta (evita flash branco)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Links externos abrem no browser do sistema, não dentro do app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  if (isDev) {
    // Dev: conecta direto ao next dev (já deve estar rodando)
    await waitForServer().catch(() => {
      console.log('Servidor dev não encontrado em localhost:' + PORT)
    })
  } else {
    await startProductionServer()
  }

  mainWindow.loadURL(BASE_URL)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
