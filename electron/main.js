const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

// Evita o crash "GPU process isn't usable" (exit 0xC0000022 = ACCESS_DENIED)
// em máquinas Windows onde o sandbox do processo de GPU é bloqueado.
// no-sandbox resolve o acesso negado; disableHardwareAcceleration usa
// renderização por software. Seguro aqui: o app carrega só o próprio
// servidor local (localhost), não conteúdo web arbitrário.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')

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
  const standaloneDir = path.join(process.resourcesPath, 'standalone')
  const serverScript = path.join(standaloneDir, 'server.js')

  // Copia static e public para dentro do standalone se ainda não existirem
  const fs = require('fs')
  const staticSrc = path.join(process.resourcesPath, 'static')
  const staticDest = path.join(standaloneDir, '.next', 'static')
  const publicSrc = path.join(process.resourcesPath, 'public')
  const publicDest = path.join(standaloneDir, 'public')

  if (!fs.existsSync(staticDest)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true })
  }
  if (!fs.existsSync(publicDest)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true })
  }

  serverProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      // Sem isto o executável do Electron abriria outra cópia do app em vez de rodar o server.js
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: standaloneDir,
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

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(createWindow)
}

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
