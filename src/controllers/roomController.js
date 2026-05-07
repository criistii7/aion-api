const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rooms ORDER BY id');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Sala no encontrada' });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        r.id, r.name, r.difficulty, r.price_per_hour,
        COUNT(b.id) AS total_reservas,
        ROUND(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600 * r.price_per_hour)::numeric, 2) AS ingresos_totales,
        ROUND(AVG(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600)::numeric, 2) AS horas_promedio
      FROM rooms r
      LEFT JOIN bookings b ON r.id = b.room_id AND b.status = 'confirmed'
      WHERE r.id = $1
      GROUP BY r.id
    `, [req.params.id]);
    res.json(result.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
};
