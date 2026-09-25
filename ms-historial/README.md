# CloudEats - Microservicio Agregador / Historial

Este repositorio contiene el **Microservicio Agregador**, un orquestador encargado de unificar los datos del perfil del usuario, su restaurante favorito y su historial de pedidos en una sola respuesta JSON para el *Dashboard* del Frontend. Forma parte de la arquitectura de microservicios desarrollada para el curso de Cloud Computing (UTEC).

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje:** Go (v1.22+)
* **Servidor HTTP:** `net/http` de la biblioteca estándar
* **Cliente HTTP:** `net/http` con peticiones concurrentes
* **Base de Datos:** *Sin Base de Datos* (Orquestador en memoria)
* **Documentación:** OpenAPI JSON en `/openapi.json`
* **Contenerización:** Docker

---

## 📋 Estructura del Proyecto

```text
agregador-service/
├── main.go              # Logica del orquestador y rutas HTTP
├── go.mod               # Módulo y versión de Go
├── Dockerfile           # Imagen multi-stage de Go
└── README.md