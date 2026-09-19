// ==========================================================
// Seed masivo de 20,000 pedidos ficticios
// Cumple requisito del enunciado: minimo 20,000 registros
// Ejecutar: node seed.js (con la BD ya creada por db.txt)
// ==========================================================

const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

// Ajustar con la IP privada de la MV Bases de Datos
const pool = new Pool({
  host: process.env.DB_HOST || "REEMPLAZAR_IP_PRIVADA_MV_BD",
  port: 8004,
  user: "root",
  password: "utec",
  database: "bd_api_orders",
  max: 5
});

const STATUSES = [
  "CREATED", "PAID", "ACCEPTED", "PREPARING",
  "READY", "PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"
];

async function seed() {
  const N = 20000;
  const batch = 500;
  console.time("seed");

  for (let i = 0; i < N; i += batch) {
    const values = [];
    const params = [];
    let idx = 1;

    for (let j = 0; j < batch; j++) {
      const subtotal = +faker.finance.amount({ min: 10, max: 200, dec: 2 });
      const delivery_fee = 5;
      const total = subtotal + delivery_fee;
      const row = [
        `u${faker.number.int({ min: 1, max: 500 }).toString().padStart(4, '0')}`,
        `r${faker.number.int({ min: 1, max: 100 }).toString().padStart(4, '0')}`,
        subtotal,
        delivery_fee,
        total,
        faker.location.streetAddress(),
        faker.helpers.arrayElement(STATUSES)
      ];
      params.push(...row);
      values.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
    }

    const sql = `INSERT INTO orders (user_id, restaurant_id, subtotal, delivery_fee, total, address, status)
                 VALUES ${values.join(',')}`;
    await pool.query(sql, params);
    console.log(`  insertados ${i + batch}/${N}`);
  }

  console.timeEnd("seed");
  await pool.end();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
