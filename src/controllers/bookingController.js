const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const { date, room_id } = req.query;
    let query = `
      SELECT b.*, r.name AS room_name, r.price_per_hour
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (date) { params.push(date); query += ` AND b.booking_date = $${params.length}`; }
    if (room_id) { params.push(room_id); query += ` AND b.room_id = $${params.length}`; }
    query += ' ORDER BY b.booking_date DESC, b.start_time';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(DISTINCT customer_email) AS clientes_unicos,
        ROUND(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 * r.price_per_hour)::numeric, 2) AS ingresos_totales,
        ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::numeric, 2) AS horas_promedio_sesion
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.status = 'confirmed'
    `);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { room_id, customer_name, customer_email, booking_date, start_time, end_time } = req.body;
    const result = await db.query(
      `INSERT INTO bookings (room_id, customer_name, customer_email, booking_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [room_id, customer_name, customer_email, booking_date, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
