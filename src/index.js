const express = require('express');
const cors = require('cors');
const db = require('./db');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');

const app = express();
app.use(cors());
app.use(express.json());

async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      capacity INTEGER DEFAULT 6,
      price_per_hour DECIMAL(10,2) DEFAULT 25.00,
      difficulty VARCHAR(20) DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      room_id INTEGER REFERENCES rooms(id),
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(100),
      booking_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'confirmed',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const existing = await db.query('SELECT COUNT(*) FROM rooms');
  if (existing.rows[0].count === '0') {
    await db.query(`
      INSERT INTO rooms (name, capacity, price_per_hour, difficulty) VALUES
      ('La Cripta del Faraón', 6, 28.00, 'hard'),
      ('El Laboratorio Secreto', 4, 25.00, 'medium'),
      ('La Mansión Maldita', 8, 32.00, 'hard'),
      ('El Escape del Tiempo', 5, 22.00, 'easy');

      INSERT INTO bookings (room_id, customer_name, customer_email, booking_date, start_time, end_time) VALUES
      (1, 'Carlos Martínez', 'carlos@email.com', CURRENT_DATE - 1, '10:00', '11:30'),
      (2, 'Ana García', 'ana@email.com', CURRENT_DATE - 1, '12:00', '13:00'),
      (1, 'Pedro Sánchez', 'pedro@email.com', CURRENT_DATE, '16:00', '17:30'),
      (3, 'Laura López', 'laura@email.com', CURRENT_DATE, '18:00', '19:30'),
      (4, 'Miguel Torres', 'miguel@email.com', CURRENT_DATE + 1, '11:00', '12:00'),
      (2, 'Sofía Ruiz', 'sofia@email.com', CURRENT_DATE + 1, '17:00', '18:30');
    `);
    console.log('Datos de ejemplo insertados');
  }

  console.log('Base de datos lista');
}

app.use('/rooms', roomRoutes);
app.use('/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AION API funcionando', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => app.listen(PORT, () => console.log(`AION API corriendo en puerto ${PORT}`)))
  .catch(err => { console.error('Error DB:', err); process.exit(1); });
