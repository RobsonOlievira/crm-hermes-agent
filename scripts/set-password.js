// Redefine a senha de um usuário do CRM. Uso: node scripts/set-password.js email@exemplo.com
require('dotenv').config()
const readline = require('readline')
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const email = (process.argv[2] || '').toLowerCase()
if (!email) {
  console.error('Informe o email: node scripts/set-password.js email@exemplo.com')
  process.exit(1)
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    process.stdout.write(question)
    rl._writeToOutput = () => {}
    rl.question('', (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

;(async () => {
  const first = await askHidden('Nova senha: ')
  const second = await askHidden('Repita a senha: ')
  if (!first || first !== second) {
    console.error('As senhas não conferem. Nada foi alterado.')
    process.exit(1)
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  const hash = await bcrypt.hash(first, 10)
  const res = await pool.query('update "User" set password = $1, "updatedAt" = now() where email = $2', [hash, email])
  await pool.end()
  console.log(res.rowCount === 1 ? `Senha atualizada para ${email}.` : `Nenhum usuário com o email ${email}.`)
})()
