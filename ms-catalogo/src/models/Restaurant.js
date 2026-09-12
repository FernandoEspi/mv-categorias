const mongoose = require('mongoose');

const DishSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  descripcion: String
});

const ReviewSchema = new mongoose.Schema({
  usuarioId: String,
  comentario: String,
  calificacion: Number
});

const RestaurantSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  distrito: { type: String, required: true },
  platos: [DishSchema],
  reseñas: [ReviewSchema]
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);