require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const restaurantRoutes = require('./src/routes/restaurantRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de MongoDB (cambia la URI por la tuya o usa variable de entorno)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cloudeats_catalogo';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas de la API
app.use('/api/restaurantes', restaurantRoutes);

// Documentación básica Swagger UI
const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Catálogo Service API', version: '1.0.0' },
  paths: {
    '/api/restaurantes': {
      get: { summary: 'Obtener todos los restaurantes', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Crear un nuevo restaurante', responses: { '201': { description: 'Creado' } } }
    },
    '/api/restaurantes/platos/{dishId}': {
      get: { 
        summary: 'Obtener precio de un plato (Consumo Interno)',
        parameters: [{ name: 'dishId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'No encontrado' } }
      }
    }
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Microservicio de Catálogo corriendo en el puerto ${PORT}`);
  console.log(`Documentación Swagger disponible en http://localhost:${PORT}/docs`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});