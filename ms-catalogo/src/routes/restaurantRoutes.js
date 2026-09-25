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

// Obtiene el restaurante asociado a una reseña del usuario
router.get('/favorito/:userId', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne(
      { 'reseñas.usuarioId': req.params.userId },
      { nombre: 1, distrito: 1, reseñas: 1 }
    );

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurante favorito no encontrado' });
    }

    const review = restaurant.reseñas.find(
      (item) => item.usuarioId === req.params.userId
    );

    res.json({
      id: restaurant._id,
      nombre: restaurant.nombre,
      distrito: restaurant.distrito,
      calificacion: review?.calificacion
    });
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