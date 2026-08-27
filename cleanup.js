#!/usr/bin/env node
/**
 * Script de limpeza — remove dependências da plataforma original
 * Rode: node cleanup.js
 */
const fs = require('fs')
const path = require('path')

const root = __dirname
let changes = []

function log(msg) { changes.push(msg); console.log('  ✅ ' + msg) }
function warn(msg) { console.log('  ⚠️  ' + msg) }

console.log('\n🔧 Limpando código para uso independente...\n')

// 1. Remover script externo do layout.tsx
const layoutPath = path.join(root, 'app/layout.tsx')
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, 'utf8')
  const before = layout
  layout = layout.replace(/\s*<script\s+src="https:\/\/apps\.abacus\.ai[^"]*"[^/]*\/>/g, '')
  if (layout !== before) {
    fs.writeFileSync(layoutPath, layout)
    log('layout.tsx: removido script externo da plataforma')
  }
}

// 2. Limpar next.config.js — remover bloco __abacus_error_reporter e simplificar
const configPath = path.join(root, 'next.config.js')
if (fs.existsSync(configPath)) {
  let config = fs.readFileSync(configPath, 'utf8')
  const simpleConfig = `const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
`
  fs.writeFileSync(configPath, simpleConfig)
  log('next.config.js: simplificado (removido código da plataforma)')
}

// 3. Remover usuário oculto do seed.ts
const seedPath = path.join(root, 'scripts/seed.ts')
if (fs.existsSync(seedPath)) {
  let seed = fs.readFileSync(seedPath, 'utf8')
  const before = seed
  seed = seed.replace(/\s*\{\s*id:\s*'user-hidden-admin'[^}]*\},?/g, '')
  if (seed !== before) {
    fs.writeFileSync(seedPath, seed)
    log('seed.ts: removido usuário oculto da plataforma')
  }
}

// 4. Remover arquivo .abacus.donotdelete
const abacusFile = path.join(root, '.abacus.donotdelete')
if (fs.existsSync(abacusFile)) {
  fs.unlinkSync(abacusFile)
  log('.abacus.donotdelete: removido')
}

// 5. Remover symlinks (node_modules, yarn.lock, package.json)
for (const f of ['node_modules', 'yarn.lock', 'package.json']) {
  const fp = path.join(root, f)
  try {
    const stat = fs.lstatSync(fp)
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(fp)
      log(`${f}: symlink removido (rode "yarn install" para recriar)`)
    }
  } catch (e) {}
}

// 6. Verificar se package.json existe (se era symlink, precisa copiar o real)
const pkgPath = path.join(root, 'package.json')
if (!fs.existsSync(pkgPath)) {
  // Tentar copiar do caminho original do symlink
  const origPkg = '/opt/hostedapp/node/root/app/package.json'
  if (fs.existsSync(origPkg)) {
    fs.copyFileSync(origPkg, pkgPath)
    log('package.json: copiado arquivo real (era symlink)')
  } else {
    warn('package.json não encontrado — você vai precisar criá-lo manualmente')
  }
}

// 7. Garantir .env.example existe
const envExample = path.join(root, '.env.example')
if (!fs.existsSync(envExample)) {
  warn('.env.example não encontrado — crie manualmente conforme o GUIA_SETUP_INDEPENDENTE.md')
}

console.log(`\n🎉 Limpeza concluída! ${changes.length} alteração(ões).`)
console.log('\nPróximos passos:')
console.log('  1. cp .env.example .env')
console.log('  2. Preencha DATABASE_URL e NEXTAUTH_SECRET no .env')
console.log('  3. yarn install')
console.log('  4. yarn prisma db push && yarn prisma generate')
console.log('  5. yarn tsx scripts/seed.ts  (opcional, dados demo)')
console.log('  6. yarn dev')
console.log('')
