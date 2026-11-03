/**
 * Ajusta o Prisma Client gerado para rodar no Cloudflare Workers.
 *
 * Com `engineType = "client"`, o cliente gerado carrega o query compiler com:
 *   fs.readFileSync(<dir>/query_compiler_bg.wasm)
 * No workerd esse arquivo não existe no sistema de arquivos virtual, então o
 * Worker quebra com ENOENT. Trocamos a leitura por um import do .wasm, que o
 * bundler do Wrangler transforma em módulo WebAssembly e inclui no bundle.
 *
 * Rode este script APÓS `prisma generate` e ANTES de empacotar o Worker.
 * O build do desktop (npm run build) regenera o cliente e desfaz o patch,
 * então o app Electron continua usando a leitura por fs normalmente.
 */
const fs = require('fs')
const path = require('path')

const targets = [
  path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma', 'client', 'index.js'),
].filter((file) => fs.existsSync(file))

if (targets.length === 0) {
  console.error('[prisma-workerd] .next/standalone não encontrado — rode `npm run build` antes.')
  process.exit(1)
}

const pattern =
  /getQueryCompilerWasmModule: async \(\) => \{\s*const queryCompilerWasmFilePath = require\('path'\)\.join\(config\.dirname, 'query_compiler_bg\.wasm'\)\s*const queryCompilerWasmFileBytes = require\('fs'\)\.readFileSync\(queryCompilerWasmFilePath\)\s*return new WebAssembly\.Module\(queryCompilerWasmFileBytes\)\s*\}/

const replacement = `getQueryCompilerWasmModule: async () => {
        const wasmModule = await import('./query_compiler_bg.wasm')
        return wasmModule.default ?? wasmModule
      }`

let changed = 0
for (const file of targets) {
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes("await import('./query_compiler_bg.wasm')")) {
    console.log(`[prisma-workerd] ja aplicado: ${file}`)
    continue
  }
  if (!pattern.test(source)) {
    console.error(`[prisma-workerd] padrao nao encontrado em ${file} — revise o script`)
    process.exit(1)
  }
  fs.writeFileSync(file, source.replace(pattern, replacement))
  changed++
  console.log(`[prisma-workerd] patch aplicado: ${file}`)
}

if (changed === 0 && targets.length === 0) {
  console.error('[prisma-workerd] nenhum client gerado encontrado')
  process.exit(1)
}
