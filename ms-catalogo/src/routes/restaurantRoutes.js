const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// GET /api/restaurantes - Listar todos los restaurantes
router.get('/', async (req, res) => {
  try {
    const restaurantes = await Restaurant.find();
    res.json(restaurantes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurantes/platos/:dishId - Endpoint clave para consumo interno (usado por Pedidos)
router.get('/platos/:dishId', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne(
      { "platos._id": req.params.dishId },
      { "platos.$": 1 }
    );
    
    if (!restaurant || !restaurant.platos.length) {
      return res.status(404).json({ message: "Plato no encontrado" });
    }
    
    const plato = restaurant.platos[0];
    res.json({ id: plato._id, nombre: plato.nombre, precio: plato.precio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/restaurantes - Crear un restaurante con sus platos y reseñas
router.post('/', async (req, res) => {
  try {
    const nuevoRestaurante = new Restaurant(req.body);
    const guardado = await nuevoRestaurante.save();
    res.status(201).json(guardado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;