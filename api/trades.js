import pkg from 'pg';
const { Pool } = pkg;
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'tradelog_secret_2024';

function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No autorizado');
  return jwt.verify(token, JWT_SECRET);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = getUser(req);

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY date DESC', [user.userId]);
      return res.json(result.rows);
    }

    if (req.method === 'POST') {
      const { date, asset, tf, type, entry, sl, tp, pnl_r, pnl_usd, risk_pct, setup, market, notes, image, emotion, followed_rules, error } = req.body;
      const result = await pool.query(
        `INSERT INTO trades (user_id, date, asset, tf, type, entry, sl, tp, pnl_r, pnl_usd, risk_pct, setup, market, notes, image, emotion, followed_rules, error)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [user.userId, date, asset, tf, type, entry, sl, tp, pnl_r||0, pnl_usd||0, risk_pct||1, setup, market, notes, image, emotion||7, followed_rules, error||'Sin error']
      );
      return res.json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { date, asset, tf, type, entry, sl, tp, pnl_r, pnl_usd, risk_pct, setup, market, notes, image, emotion, followed_rules, error } = req.body;
      const result = await pool.query(
        `UPDATE trades SET date=$1, asset=$2, tf=$3, type=$4, entry=$5, sl=$6, tp=$7, pnl_r=$8, pnl_usd=$9, risk_pct=$10, setup=$11, market=$12, notes=$13, image=$14, emotion=$15, followed_rules=$16, error=$17
         WHERE id=$18 AND user_id=$19 RETURNING *`,
        [date, asset, tf, type, entry, sl, tp, pnl_r||0, pnl_usd||0, risk_pct||1, setup, market, notes, image, emotion||7, followed_rules, error||'Sin error', id, user.userId]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [id, user.userId]);
      return res.json({ ok: true });
    }

  } catch (e) {
    return res.status(e.message === 'No autorizado' ? 401 : 500).json({ error: e.message });
  }
}
