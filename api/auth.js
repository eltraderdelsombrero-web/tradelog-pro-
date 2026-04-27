import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'tradelog_secret_2024';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      balance NUMERIC DEFAULT 10000,
      risk_pct NUMERIC DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMPTZ,
      asset VARCHAR(50),
      tf VARCHAR(10),
      type VARCHAR(10),
      entry NUMERIC,
      sl NUMERIC,
      tp NUMERIC,
      pnl_r NUMERIC DEFAULT 0,
      pnl_usd NUMERIC DEFAULT 0,
      risk_pct NUMERIC DEFAULT 1,
      setup VARCHAR(100),
      market VARCHAR(100),
      notes TEXT,
      image TEXT,
      emotion INTEGER DEFAULT 7,
      followed_rules BOOLEAN DEFAULT true,
      error VARCHAR(100) DEFAULT 'Sin error',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

initDB().catch(console.error);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  if (action === 'register') {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email y contrasena requeridos' });
      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name', [email, hash, name]);
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user });
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ error: 'Este email ya esta registrado' });
      return res.status(500).json({ error: e.message });
    }
  }

  if (action === 'login') {
    try {
      const { email, password } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (!result.rows.length) return res.status(401).json({ error: 'Email o contrasena incorrectos' });
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Email o contrasena incorrectos' });
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name, balance: user.balance, risk_pct: user.risk_pct } });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (action === 'me') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No autorizado' });
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await pool.query('SELECT id, email, name, balance, risk_pct FROM users WHERE id = $1', [decoded.userId]);
      if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(401).json({ error: 'Token invalido' });
    }
  }

  if (action === 'settings') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET);
      const { balance, risk_pct } = req.body;
      await pool.query('UPDATE users SET balance = $1, risk_pct = $2 WHERE id = $3', [balance, risk_pct, decoded.userId]);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(404).json({ error: 'Accion no encontrada' });
}
