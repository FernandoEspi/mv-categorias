const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const jwt = require('jsonwebtoken');

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
const SECRET_KEY = process.env.SECRET_KEY || "tu_secreto_super_seguro";

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Bearer token required" });
    }

    try {
      const payload = jwt.verify(token, SECRET_KEY);
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

function requireAuthenticated(req, res, next) {
  return requireRole(["cliente", "restaurante", "admin"])(req, res, next);
}

function canAccessOrder(user, order) {
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "cliente") {
    return String(user.user_id) === String(order.user_id);
  }
  return user.role === "restaurante"
    && String(user.restaurant_id || "") === String(order.restaurant_id);
}

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
app.get("/orders", requireRole(["admin"]), async (req, res) => {
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
app.get("/orders/:id", requireAuthenticated, async (req, res) => {
  try {
    const order = await pool.query(
      "SELECT * FROM orders WHERE id = $1",
      [req.params.id]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (!canAccessOrder(req.user, order.rows[0])) {
      return res.status(403).json({ error: "Insufficient permissions" });
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
app.get("/orders/user/:userId", requireAuthenticated, async (req, res) => {
  if (req.user.role !== "admin" && String(req.user.user_id) !== String(req.params.userId)) {
    return res.status(403).json({ error: "Only your own order history is available" });
  }
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

// Alias compatible con el agregador de Historial
app.get("/api/pedidos/usuario/:userId", requireAuthenticated, async (req, res) => {
  if (req.user.role !== "admin" && String(req.user.user_id) !== String(req.params.userId)) {
    return res.status(403).json({ error: "Only your own order history is available" });
  }
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
app.get("/orders/restaurant/:restaurantId", requireRole(["restaurante", "admin"]), async (req, res) => {
  if (req.user.role === "restaurante" && String(req.user.restaurant_id) !== String(req.params.restaurantId)) {
    return res.status(403).json({ error: "Restaurant access denied" });
  }
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
app.post("/orders", requireRole(["cliente", "admin"]), async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { user_id, restaurant_id, address, items } = req.body;
    if (!user_id || !restaurant_id || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "user_id, restaurant_id, address and items are required" });
    }
    if (req.user.role === "cliente" && String(req.user.user_id) !== String(user_id)) {
      return res.status(403).json({ error: "Cannot create an order for another user" });
    }

    // Consumir micro de Restaurantes para validar y traer precios
    let subtotal = 0;
    const enriched = [];
    for (const it of items) {
      const r = await fetch(`${RESTAURANTS_URL}/api/restaurantes/platos/${it.dish_id}`);
      if (!r.ok) {
        return res.status(r.status === 404 ? 404 : 502).json({ error: "Dish service unavailable or dish not found" });
      }
      const dish = await r.json();
      const price = Number(dish.precio);
      const quantity = Number(it.qty);
      if (!dish.nombre || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(502).json({ error: "Invalid dish data from catalog" });
      }
      subtotal += price * quantity;
      enriched.push({ dish_id: it.dish_id, name: dish.nombre, price, qty: quantity });
    }

    const delivery_fee = 5.0;
    const total = subtotal + delivery_fee;

    await client.query("BEGIN");
    transactionStarted = true;
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
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Cambiar estado de un pedido
app.put("/orders/:id", requireRole(["restaurante", "admin"]), async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["CREATED", "PAID", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }
    const current = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (!canAccessOrder(req.user, current.rows[0])) {
      return res.status(403).json({ error: "Restaurant access denied" });
    }
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
app.delete("/orders/:id", requireRole(["admin"]), async (req, res) => {
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
