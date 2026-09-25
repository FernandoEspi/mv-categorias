# CloudEats - Microservicio de Catálogo de Restaurantes

Este repositorio contiene el **Microservicio de Catálogo**, encargado de la gestión de restaurantes, menús (platos) y reseñas de la plataforma **CloudEats**. Forma parte de la arquitectura de microservicios desarrollada para el curso de Cloud Computing (UTEC).

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje:** Go (v1.22+)
* **Servidor HTTP:** `net/http`
* **Base de Datos:** MongoDB (NoSQL)
* **Driver:** MongoDB Go Driver
* **Documentación:** Swagger UI en `/docs` y OpenAPI en `/openapi.json`
* **Contenerización:** Docker
* **Inyección de Datos:** generador incluido en `cmd/seed`

---

## 📋 Estructura del Proyecto

```text
catalogo-service/
├── cmd/seed/main.go         # Seed de 20.000 documentos MongoDB
├── go.mod                   # Modulo Go y driver de MongoDB
├── main.go                  # API REST y conexiones a MongoDB
├── Dockerfile               # Imagen multi-stage de Go
└── README.md