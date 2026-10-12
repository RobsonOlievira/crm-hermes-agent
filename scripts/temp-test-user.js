// Usuário temporário para testar o login em localhost. Uso: node scripts/temp-test-user.js create|delete
require('dotenv').config()
const fs = require('fs')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const EMAIL = 'teste-temporario-login@example.test'
const FILE = '.dev.test-login.json'

;(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  if (process.argv[2] === 'create') {
    const password = crypto.randomBytes(12).toString('base64url') + '!*&9'
    const { rows } = await pool.query('select "tenantId" from "User" where "tenantId" is not null limit 1')
    const id = 'tmp_' + crypto.randomBytes(8).toString('hex')
    await pool.query('delete from "User" where email = $1', [EMAIL])
    await pool.query(
      'insert into "User" (id, email, password, name, role, "tenantId", "createdAt", "updatedAt") values ($1,$2,$3,$4,$5,$6, now(), now())',
      [id, EMAIL, await bcrypt.hash(password, 10), 'Teste Temporario', 'MEMBER', rows[0].tenantId]
    )
    fs.writeFileSync(FILE, JSON.stringify({ email: EMAIL, password }, null, 2))
    console.log('criado:', EMAIL, '(senha salva em ' + FILE + ')')
  } else {
    const r = await pool.query('delete from "User" where email = $1', [EMAIL])
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE)
    console.log('removidos:', r.rowCount)
  }
  await pool.end()
})()
