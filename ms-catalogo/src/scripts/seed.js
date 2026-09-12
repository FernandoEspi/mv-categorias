const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Restaurant = require('../models/Restaurant');
const connectDB = require('../config/db');

const seedDatabase = async () => {
  try {
    // 1. Conectar a la base de datos
    await connectDB();

    console.log('🧹 Limpiando la colección de restaurantes existente...');
    await Restaurant.deleteMany({});

    console.log('🚀 Iniciando la generación de +20,000 registros...');

    const restaurantes = [];
    const TOTAL_RESTAURANTES = 2000;
    const PLATOS_POR_RESTAURANTE = 10;
    const RESENAS_POR_RESTAURANTE = 3;

    // Distritos comunes para filtrar en la app
    const distritos = ['Miraflores', 'San Isidro', 'Surco', 'Barranco', 'La Molina', 'San Borja', 'Lima Cercado'];

    for (let i = 0; i < TOTAL_RESTAURANTES; i++) {
      // Generar 10 platos por restaurante (2,000 x 10 = 20,000 platos)
      const platos = Array.from({ length: PLATOS_POR_RESTAURANTE }, () => ({
        nombre: faker.food.dish(),
        precio: parseFloat(faker.commerce.price({ min: 15, max: 95, dec: 2 })),
        descripcion: faker.food.description()
      }));

      // Generar reseñas para el esquema anidado
      const reseñas = Array.from({ length: RESENAS_POR_RESTAURANTE }, () => ({
        usuarioId: faker.string.uuid(),
        comentario: faker.lorem.sentence(),
        calificacion: faker.number.int({ min: 1, max: 5 })
      }));

      restaurantes.push({
        nombre: `${faker.company.name()} ${faker.food.adjective()}`,
        distrito: distritos[Math.floor(Math.random() * distritos.length)],
        platos: platos,
        reseñas: reseñas
      });
    }

    // 2. Inserción masiva en MongoDB
    console.log('📦 Insertando datos en MongoDB...');
    await Restaurant.insertMany(restaurantes);

    console.log(`✅ ¡Proceso completado con éxito!`);
    console.log(`📊 Se registraron ${TOTAL_RESTAURANTES} restaurantes y ${TOTAL_RESTAURANTES * PLATOS_POR_RESTAURANTE} platos.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error.message);
    process.exit(1);
  }
};

seedDatabase();