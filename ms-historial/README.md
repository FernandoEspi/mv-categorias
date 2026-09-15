# CloudEats - Microservicio Agregador / Historial

Este repositorio contiene el **Microservicio Agregador**, un orquestador encargado de unificar los datos del perfil del usuario, su restaurante favorito y su historial de pedidos en una sola respuesta JSON para el *Dashboard* del Frontend. Forma parte de la arquitectura de microservicios desarrollada para el curso de Cloud Computing (UTEC).

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje:** Python (v3.10+)
* **Framework Web:** FastAPI
* **Cliente HTTP Asíncrono:** HTTPX
* **Servidor ASGI:** Uvicorn
* **Base de Datos:** *Sin Base de Datos* (Orquestador en memoria)
* **Documentación:** Swagger UI (Auto-generada)
* **Contenerización:** Docker

---

## 📋 Estructura del Proyecto

```text
agregador-service/
├── app/
│   ├── __init__.py      # Indicador de paquete Python
│   └── main.py          # Lógica del orquestador y rutas FastAPI
├── Dockerfile           # Configuración para contenerización
├── requirements.txt     # Dependencias del proyecto
└── README.md