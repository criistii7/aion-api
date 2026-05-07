const db = require('../db');

exports.ask = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Falta el campo question' });

    const [rooms, bookings, stats] = await Promise.all([
      db.query('SELECT * FROM rooms ORDER BY id'),
      db.query(`
        SELECT b.*, r.name AS room_name, r.price_per_hour
        FROM bookings b JOIN rooms r ON b.room_id = r.id
        ORDER BY b.booking_date DESC, b.start_time
      `),
      db.query(`
        SELECT
          COUNT(*) AS total_reservas,
          COUNT(DISTINCT customer_email) AS clientes_unicos,
          ROUND(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 * r.price_per_hour)::numeric, 2) AS ingresos_totales,
          ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::numeric, 2) AS horas_promedio_sesion
        FROM bookings b JOIN rooms r ON b.room_id = r.id
        WHERE b.status = 'confirmed'
      `)
    ]);

    const context = `Eres un analista de negocio experto para AION, una empresa de escape rooms. Tienes acceso a los datos reales de su base de datos. Responde en español, de forma concisa y útil. Usa negritas (**texto**) para destacar datos clave.

DATOS REALES DE LA BASE DE DATOS:

Salas:
${JSON.stringify(rooms.rows, null, 2)}

Reservas:
${JSON.stringify(bookings.rows, null, 2)}

Estadísticas globales:
${JSON.stringify(stats.rows[0], null, 2)}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: context }] },
          contents: [{ parts: [{ text: question }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      console.error('Gemini error:', JSON.stringify(geminiData));
      return res.status(500).json({ error: 'Gemini: ' + JSON.stringify(geminiData) });
    }

    res.json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
