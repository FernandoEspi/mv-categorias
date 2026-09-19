# 🛒 Microservicio de Pedidos
 
Microservicio backend de gestión de pedidos desarrollado con **Node.js**, **Express**, **PostgreSQL** y **Docker Compose**. El proyecto permite crear, consultar, actualizar y eliminar pedidos de una plataforma de delivery, consumiendo el microservicio de Restaurantes para validar los platos y sus precios.
 
**Autor:** Luciano Matías Sánchez Goicochea
**Curso:** CS2032 Cloud Computing — UTEC 2026-2
 
---
 
## 🛠️ Tecnologías utilizadas
 
- **Node.js 20** — Runtime de JavaScript.
- **Express** — Framework web para Node.js.
- **PostgreSQL 16** — Base de datos relacional.
- **node-postgres (pg)** — Driver oficial para conectarse a PostgreSQL desde Node.
- **CORS** — Middleware para permitir peticiones desde otros orígenes.
- **@faker-js/faker** — Generación masiva de datos ficticios.
- **Docker + Docker Compose** — Orquestación de contenedores.
- **Adminer** — Interfaz web para administrar la base de datos.
---
 
## 📁 Estructura del proyecto
 
```
ms3-pedidos/
├── main.js                              # API REST completa (todo en un archivo)
├── seed.js                              # Inserción masiva de 20,000 pedidos
├── db.txt                               # Script SQL para inicialización
├── package.json                         # Dependencias npm
├── Dockerfile                           # Imagen base node:20-slim
├── docker-compose.yml                   # Compose del API (MV Desarrollo)
├── infra-db/
│   └── docker-compose.yml               # Compose de Postgres + Adminer (MV Base de Datos)
├── orders-api.yaml                      # Documentación OpenAPI 3.0
├── orders.postman_collection.json       # Colección Postman
├── plantilla_crear_mv_bd_orders.yaml    # CloudFormation: MV Base de Datos
├── plantilla_crear_mv_app.yaml          # CloudFormation: MV Desarrollo / Pruebas
└── README.md
```
 
---
 
## 🚀 Instalación y despliegue
 
### 1. Clonar el repositorio
 
```
git clone https://github.com/miguelespinozaa-ship-it/ProyectoParcial.git
cd ProyectoParcial/ms3-pedidos
```
 
### 2. Instalar dependencias
 
El archivo `package.json` incluye las siguientes dependencias:
 
```
express
cors
pg
@faker-js/faker
```
 
Para instalar localmente:
 
```
npm install
```
 
---
 
## 🐳 Ejecución con Docker Compose
 
El proyecto usa **Docker Compose** para orquestar los contenedores. Todos se auto-reinician gracias a `restart: unless-stopped`.
 
### Levantar el microservicio (MV Desarrollo)
 
Desde la carpeta `ms3-pedidos/`:
 
```
docker compose up -d --build
```
 
Este comando:
 
- Construye la imagen del microservicio de Pedidos con Node.js.
- Ejecuta el contenedor `orders-service_c` en segundo plano en el puerto 8000.
- Reinicia automáticamente el contenedor si la MV se apaga.
### Verificar los contenedores
 
```
docker compose ps
```
 
Deberías encontrar el servicio `orders-service_c` en estado `Up`.
 
### Ver los logs del microservicio
 
```
docker compose logs -f orders-service
```
 
Debe mostrar el mensaje:
 
```
orders-service running on port 8000
```
 
### Detener los contenedores
 
```
docker compose down
```
 
---
 
## 🗄️ Configuración de PostgreSQL
 
La base de datos y Adminer corren en una **MV Base de Datos** separada, orquestados con Docker Compose usando la red `red_bd`.
 
### Setup por única vez (crear red y volumen)
 
En la MV Base de Datos:
 
```
docker network create red_bd
docker volume create pg_orders_data
```
 
### Levantar Postgres + Adminer
 
Desde la carpeta `infra-db/`:
 
```
cd infra-db
docker compose up -d
```
 
Esto levanta:
 
- **`pg_orders_c`** — PostgreSQL 16 en el puerto 8004, persistiendo en el volumen `pg_orders_data`.
- **`adminer_c`** — Interfaz web de administración en el puerto 8080.
Acceso a Adminer: `http://<IP-DE-TU-VM-BD>:8080`
 
Credenciales para el login de Adminer:
 
- **Sistema**: PostgreSQL
- **Servidor**: `pg_orders_c`
- **Usuario**: `root`
- **Contraseña**: `utec`
- **Base de datos**: `bd_api_orders`
---
 
## 📡 Endpoints de la API
 
Una vez desplegada la aplicación, puedes acceder utilizando la IP pública de tu máquina virtual:
 
```
http://<IP-DE-TU-VM>:8000
```
 
Por ejemplo:
 
```
http://98.84.250.185:8000
```
 
Si ejecutas la aplicación localmente, puedes utilizar `localhost` en lugar de la IP pública.
 
### 🩺 Health Check
 
`GET /`
 
Verifica que el microservicio está activo. Es utilizado por el balanceador de carga (ALB) para el health check.
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "message": "Echo Test OK - Orders API"
}
```
 
### 📋 Listar todos los pedidos
 
`GET /orders`
 
Devuelve los últimos 100 pedidos ordenados del más nuevo al más viejo.
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "orders": [
    {
      "id": 20003,
      "user_id": "u0239",
      "restaurant_id": "r0089",
      "subtotal": "54.55",
      "delivery_fee": "5.00",
      "total": "59.55",
      "address": "360 Mill Road",
      "status": "CREATED",
      "created_at": "2026-09-11T05:53:24.227Z"
    }
  ]
}
```
 
### 🔍 Obtener un pedido por ID
 
`GET /orders/{id}`
 
Devuelve el pedido con sus items relacionados.
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "order": {
    "id": 1,
    "user_id": "u001",
    "restaurant_id": "r001",
    "total": "50.00",
    "status": "DELIVERED"
  },
  "items": [
    {
      "dish_id": "d001",
      "name": "Lomo Saltado",
      "price": "25.00",
      "qty": 1
    }
  ]
}
```
 
### 👤 Historial de un usuario
 
`GET /orders/user/{userId}`
 
Devuelve todos los pedidos hechos por un usuario específico.
 
### 🍽️ Pedidos de un restaurante
 
`GET /orders/restaurant/{restaurantId}`
 
Devuelve los pedidos recibidos por un restaurante.
 
### 🆕 Crear un pedido
 
`POST /orders`
 
Crea un nuevo pedido. Consume el microservicio de Restaurantes para validar cada `dish_id` y traer los precios.
 
**Headers**:
 
```
Content-Type: application/json
```
 
**Body**:
 
```
{
  "user_id": "u001",
  "restaurant_id": "r001",
  "address": "Av. Javier Prado 123, San Isidro",
  "items": [
    { "dish_id": "d001", "qty": 2 },
    { "dish_id": "d002", "qty": 1 }
  ]
}
```
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "message": "Order created successfully",
  "id": 20004,
  "total": 65
}
```
 
### 🔄 Actualizar estado del pedido
 
`PUT /orders/{id}`
 
Cambia el estado del pedido (CREATED → PAID → PREPARING → READY → EN_ROUTE → DELIVERED).
 
**Body**:
 
```
{
  "status": "DELIVERED"
}
```
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "message": "Order modified successfully"
}
```
 
### 🗑️ Eliminar un pedido
 
`DELETE /orders/{id}`
 
Elimina un pedido. Los items relacionados se borran automáticamente por CASCADE.
 
**Respuesta esperada** — HTTP 200 OK
 
```
{
  "message": "Order deleted successfully"
}
```
 
---
 
## 📚 Documentación de la API
 
La documentación de la API está disponible en formato **OpenAPI 3.0** (Swagger) en el archivo `orders-api.yaml` del repositorio.
 
Puedes visualizarla usando el contenedor oficial de Swagger UI:
 
```
docker run -d --restart unless-stopped -p 8080:8080 -e SWAGGER_JSON=/catalog/orders-api.yaml -v /home/ubuntu/catalog:/catalog swaggerapi/swagger-ui
```
 
También se incluye una colección de Postman lista para importar: `orders.postman_collection.json`.
 
---
 
## 📊 Base de datos
 
**2 tablas relacionadas** con Foreign Key (`orders` 1:N `order_items`).
 
### Tabla `orders`
 
Campo | Tipo | Descripción
--- | --- | ---
id | SERIAL PK | Identificador único del pedido
user_id | VARCHAR(50) | ID del usuario que hizo el pedido
restaurant_id | VARCHAR(50) | ID del restaurante
subtotal | DECIMAL(10,2) | Subtotal (sin delivery fee)
delivery_fee | DECIMAL(10,2) | Fee de entrega
total | DECIMAL(10,2) | Total (subtotal + delivery)
address | VARCHAR(255) | Dirección de entrega
status | VARCHAR(20) | Estado del pedido (CREATED, PAID, etc.)
created_at | TIMESTAMP | Fecha de creación
 
### Tabla `order_items`
 
Campo | Tipo | Descripción
--- | --- | ---
id | SERIAL PK | Identificador único del item
order_id | INT FK | Referencia a `orders.id` (ON DELETE CASCADE)
dish_id | VARCHAR(50) | ID del plato
name | VARCHAR(100) | Nombre del plato (snapshot)
price | DECIMAL(10,2) | Precio del plato (snapshot)
qty | INT | Cantidad
 
**Total de registros insertados**: 20,003 (3 iniciales + 20,000 ficticios generados con faker).
 
---
 
## 🔍 Comandos útiles
 
### Ver contenedores activos
 
```
docker compose ps
```
 
### Ver los logs en tiempo real
 
```
docker compose logs -f orders-service
```
 
### Insertar los 20,000 pedidos ficticios (una sola vez)
 
Desde MV Desarrollo, con el contenedor corriendo:
 
```
docker compose exec orders-service node seed.js
```
 
Espera 1-2 minutos hasta ver `insertados 20000/20000`.
 
### Reconstruir la imagen tras cambios en el código
 
```
docker compose up -d --build
```
 
Compose detecta los cambios en el `Dockerfile` o el código, reconstruye la imagen y reinicia el contenedor automáticamente.
 
### Detener todo
 
```
docker compose down
```
 
⚠️ **Nota**: Los datos de PostgreSQL están en el volumen `pg_orders_data`, por lo que no se pierden al reiniciar el contenedor. Solo se perderían con `docker volume rm pg_orders_data`.
 
---
 
## 🌐 Despliegue en AWS
 
El proyecto se despliega en dos instancias EC2 (Ubuntu 22.04):
 
- **MV Desarrollo**: Corre el microservicio `orders-service_c` en puerto 8000. Elastic IP: `98.84.250.185`.
- **MV Base de Datos**: Corre los contenedores de BD (`pg_orders_c` en 8004 y `adminer_c` en 8080). Elastic IP: `34.206.96.68`.
Asegúrate de que los siguientes puertos estén permitidos en las reglas de entrada (Inbound Rules) del Security Group:
 
- **MV Desarrollo**: puerto 22 (SSH) y 8000 (API).
- **MV Base de Datos**: puerto 22 (SSH), 8004 (PostgreSQL) y 8080 (Adminer).
Después podrás acceder a la API desde:
 
```
http://98.84.250.185:8000
```
 
Y al Adminer:
 
```
http://34.206.96.68:8080
```
 
---
 
## 🔐 Flujo de creación de un pedido
 
El flujo principal del microservicio es:
 
```
                 ┌──────────────┐
                 │    Cliente   │
                 └──────┬───────┘
                        │
                        ▼
                  POST /orders
                        │
                        ▼
                 ┌─────────────┐
                 │   Node.js   │
                 └──────┬──────┘
                        │
                        ▼
             ┌────────────────────┐
             │ Micro Restaurantes │ (validar dish_id + snapshot precios)
             └──────┬─────────────┘
                        │
                        ▼
                Calcular total
                        │
                        ▼
              BEGIN TRANSACTION
                        │
                        ▼
                 ┌─────────────┐
                 │ PostgreSQL  │  INSERT INTO orders
                 │             │  INSERT INTO order_items
                 └──────┬──────┘
                        │
                        ▼
                  COMMIT / ROLLBACK
                        │
                        ▼
             Devolver { id, total }
```
 
---
 
## 📌 Consideraciones
 
- Las direcciones IP de las máquinas virtuales son **Elastic IPs** para mantenerse fijas aunque el Learner Lab reinicie.
- La base de datos NO está expuesta directamente a Internet — el puerto 8004 solo permite tráfico desde el Security Group de la MV Desarrollo.
- Se usa `ON DELETE CASCADE` en la FK de `order_items` para mantener integridad referencial.
- Las queries SQL usan **parámetros preparados** (`$1`, `$2`) para prevenir inyecciones SQL.
- El endpoint `POST /orders` usa una **transacción SQL** (`BEGIN / COMMIT / ROLLBACK`) para garantizar atomicidad.
- El campo `status` sigue la máquina de estados: CREATED → PAID → ACCEPTED → PREPARING → READY → PICKED_UP → EN_ROUTE → DELIVERED (o CANCELLED en cualquier momento).
- Con Docker Compose y `restart: unless-stopped`, los contenedores se auto-recuperan si la MV se reinicia.
- Para producción se recomienda usar HTTPS y mover las credenciales de la BD a variables de entorno o AWS Secrets Manager.
---
 
## 👨‍💻 Autor
 
**Luciano Matías Sánchez Goicochea**
CS2032 Cloud Computing — UTEC 2026-2
 
