const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(express.json());

// CORS abierto (estilo del profe: origins = ['*'])
app.use(cors({ origin: '*' }));

// ===== Configuracion de conexion a base de datos =====
// IPv4 privada de "MV Bases de Datos"
const host_name = process.env.DB_HOST || "REEMPLAZAR_IP_PRIVADA_MV_BD";
const port_number = process.env.DB_PORT || 5432;
const user_name = process.env.DB_USER || "postgres";
const password_db = process.env.DB_PASSWORD || "utec";
const database_name = process.env.DB_NAME || "bd_api_orders";

const pool = new Pool({
  host: host_name,
  port: port_number,
  user: user_name,
  password: password_db,
  database: database_name,
  max: 10
});

// URL del micro de Restaurantes (compañero)
const RESTAURANTS_URL = process.env.RESTAURANTS_URL || "http://localhost:3002";

const swaggerDocument = yaml.load(
  fs.readFileSync(path.join(__dirname, 'orders-api.yaml'), 'utf8')
);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/openapi.json', (req, res) => res.json(swaggerDocument));

// ===== Endpoints =====

// Echo test para health check del balanceador de carga
app.get("/", (req, res) => {
  res.json({ message: "Echo Test OK - Orders API" });
});

// Obtener todos los pedidos
app.get("/orders", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC LIMIT 100"
    );
    res.json({ orders: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtener un pedido por id (con sus items)
app.get("/orders/:id", async (req, res) => {
  try {
    const order = await pool.query(
      "SELECT * FROM orders WHERE id = $1",
      [req.params.id]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    const items = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [req.params.id]
    );
    res.json({ order: order.rows[0], items: items.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Historial de pedidos de un usuario
app.get("/orders/user/:userId", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC",
      [req.params.userId]
    );
    res.json({ orders: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Pedidos de un restaurante
app.get("/orders/restaurant/:restaurantId", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM orders WHERE restaurant_id = $1 ORDER BY id DESC LIMIT 50",
      [req.params.restaurantId]
    );
    res.json({ orders: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear un pedido (consume el micro de Restaurantes)
app.post("/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, restaurant_id, address, items } = req.body;

    // Consumir micro de Restaurantes para validar y traer precios
    let subtotal = 0;
    const enriched = [];
    for (const it of items) {
      try {
        const r = await fetch(`${RESTAURANTS_URL}/api/restaurantes/platos/${it.dish_id}`);
        if (!r.ok) {
          throw new Error(`Restaurant service returned ${r.status}`);
        }
        const dish = await r.json();
        subtotal += Number(dish.precio) * it.qty;
        enriched.push({
          dish_id: it.dish_id,
          name: dish.nombre || "unknown",
          price: dish.precio || 0,
          qty: it.qty
        });
      } catch (err) {
        // Si el micro de Restaurantes no responde, seguimos con datos mock
        enriched.push({
          dish_id: it.dish_id,
          name: it.name || "unknown",
          price: it.price || 10,
          qty: it.qty
        });
        subtotal += (it.price || 10) * it.qty;
      }
    }

    const delivery_fee = 5.0;
    const total = subtotal + delivery_fee;

    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, subtotal, delivery_fee, total, address, status)
       VALUES ($1,$2,$3,$4,$5,$6,'CREATED') RETURNING id`,
      [user_id, restaurant_id, subtotal, delivery_fee, total, address]
    );
    const orderId = r.rows[0].id;

    for (const it of enriched) {
      await client.query(
        `INSERT INTO order_items (order_id, dish_id, name, price, qty)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.dish_id, it.name, it.price, it.qty]
      );
    }
    await client.query("COMMIT");

    res.json({ message: "Order created successfully", id: orderId, total });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Cambiar estado de un pedido
app.put("/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2",
      [status, req.params.id]
    );
    res.json({ message: "Order modified successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar un pedido
app.delete("/orders/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM orders WHERE id = $1", [req.params.id]);
    res.json({ message: "Order deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(8000, () => {
  console.log("orders-service running on port 8000");
});
