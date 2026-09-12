# CloudEats - Microservicio de Catálogo de Restaurantes

Este repositorio contiene el **Microservicio de Catálogo**, encargado de la gestión de restaurantes, menús (platos) y reseñas de la plataforma **CloudEats**. Forma parte de la arquitectura de microservicios desarrollada para el curso de Cloud Computing (UTEC).

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje / Entorno:** Node.js (v18+)
* **Framework Web:** Express.js
* **Base de Datos:** MongoDB (NoSQL)
* **ORM / ODM:** Mongoose
* **Documentación:** Swagger UI (`swagger-ui-express`)
* **Contenerización:** Docker
* **Inyección de Datos:** Faker.js (`@faker-js/faker`)

---

## 📋 Estructura del Proyecto

```text
catalogo-service/
├── src/
│   ├── config/
│   │   └── db.js            # Conexión a MongoDB
│   ├── models/
│   │   └── Restaurant.js    # Esquema Mongoose con subdocumentos (platos/reseñas)
│   ├── routes/
│   │   └── restaurantRoutes.js # Endpoints REST de la API
│   └── scripts/
│       └── seed.js          # Script de inyección masiva de datos (+20,000 registros)
├── Dockerfile               # Configuración para contenerización
├── package.json             # Dependencias del proyecto
├── server.js                # Punto de entrada de la aplicación
└── README.md