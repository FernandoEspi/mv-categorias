# CloudEats - Microservicio de Analítica

Este repositorio contiene el **Microservicio de Analítica**, encargado de ejecutar consultas SQL sobre el Data Lake montado en **AWS Athena** (alimentado por AWS Glue y S3) para generar reportes estadísticos consumidos por el Frontend web. Forma parte de la arquitectura de microservicios desarrollada para el curso de Cloud Computing (UTEC).

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje:** Python (v3.10+)
* **Framework Web:** FastAPI
* **SDK AWS:** Boto3 (Conexión directa con Athena/S3)
* **Servidor ASGI:** Uvicorn
* **Base de Datos / Motor SQL:** AWS Athena + AWS Glue
* **Documentación:** Swagger UI (Auto-generada)
* **Contenerización:** Docker

---

## 📋 Estructura del Proyecto

```text
analitica-service/
├── app/
│   ├── __init__.py      # Indicador de paquete Python
│   └── main.py          # Lógica de consultas SQL a Athena y FastAPI
├── Dockerfile           # Configuración para contenerización
├── requirements.txt     # Dependencias del proyecto
└── README.md