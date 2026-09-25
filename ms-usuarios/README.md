# 🔐 Microservicio de Autenticación

Microservicio backend de autenticación desarrollado con **FastAPI**, **MySQL** y **Docker**.
El proyecto permite registrar usuarios e iniciar sesión mediante **JWT (JSON Web Tokens)**.

## 🛠️ Tecnologías utilizadas

* **FastAPI** — Framework web para Python.
* **MySQL 8.0** — Base de datos relacional.
* **SQLAlchemy** — ORM para interactuar con la base de datos.
* **Passlib + Bcrypt** — Hash seguro de contraseñas.
* **PyJWT** — Generación y validación de tokens JWT.
* **Docker** — Contenerización de la aplicación.
* **Docker Compose** — Orquestación de los servicios.
* **Uvicorn** — Servidor ASGI para FastAPI.

---

## 📁 Estructura del proyecto

```text
ms1-login/
├── main.py
├── models.py
├── schemas.py
├── database.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

# 🚀 Instalación y despliegue

## 1. Clonar el repositorio

```bash
git clone <URL-DE-TU-REPOSITORIO>
cd ms1-login
```

---

## 2. Configurar las dependencias

El archivo `requirements.txt` debe contener las dependencias necesarias:

```text
fastapi
uvicorn
sqlalchemy
pymysql
cryptography
passlib[bcrypt]
bcrypt==4.0.1
PyJWT
pydantic[email]
```

> **Nota:** Se utiliza `bcrypt==4.0.1` para mantener compatibilidad con `passlib`.

---

# 🐳 Ejecución con Docker Compose

Una vez dentro del proyecto, ejecuta:

```bash
docker compose up --build -d
```

Este comando:

* Construye la imagen de FastAPI.
* Descarga y configura MySQL 8.0.
* Crea los contenedores.
* Ejecuta los servicios en segundo plano.

### Verificar los contenedores

```bash
docker compose ps
```

Deberías encontrar los servicios de la aplicación y MySQL en estado:

```text
Up
```

También puedes revisar todos los contenedores:

```bash
docker ps
```

---

# 🗄️ Configuración de MySQL

Si necesitas crear MySQL manualmente fuera de Docker Compose, puedes utilizar:

```bash
docker network create red_bd
```

Luego:

```bash
docker run -d --rm \
  --name mysql_c \
  --network red_bd \
  -e MYSQL_ROOT_PASSWORD=utec \
  -p 8005:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0
```

### ⚠️ Importante

El error:

```text
docker: 'docker run' requires at least 1 argument
-v: command not found
```

ocurre porque Bash interpretó el `-v` como un comando separado.

❌ Incorrecto:

```bash
docker run ... -p 8005:3306
-v mysql_data:/var/lib/mysql mysql:8.0
```

✅ Correcto:

```bash
docker run -d --rm \
  --name mysql_c \
  --network red_bd \
  -e MYSQL_ROOT_PASSWORD=utec \
  -p 8005:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0
```

También puedes escribirlo todo en una sola línea:

```bash
docker run -d --rm --name mysql_c --network red_bd -e MYSQL_ROOT_PASSWORD=utec -p 8005:3306 -v mysql_data:/var/lib/mysql mysql:8.0
```

---

# 📡 Endpoints de la API

Una vez desplegada la aplicación, puedes acceder utilizando la IP pública de tu máquina virtual:

```text
http://<IP-DE-TU-VM>:8000
```

Por ejemplo:

```text
http://35.172.181.195:8000
```

> Si ejecutas la aplicación localmente, puedes utilizar `localhost` en lugar de la IP pública.

---

## 👤 Registro de usuario

### `POST /register`

Registra un nuevo usuario.

**URL:**

```text
http://<IP-DE-TU-VM>:8000/register
```

**Headers:**

```text
Content-Type: application/json
```

**Body:**

```json
{
  "nombre": "Carlos",
  "apellido": "Pérez",
  "email": "carlos@example.com",
  "telefono": "+51987654321",
  "password": "mi_password_segura",
  "direccion": "Av. Principal 123, Lima"
}
```

### Respuesta esperada

**HTTP 201 Created**

```json
{
  "message": "Usuario registrado exitosamente"
}
```

---

# 🔑 Inicio de sesión

### `POST /login`

Permite iniciar sesión utilizando las credenciales registradas.

**URL:**

```text
http://<IP-DE-TU-VM>:8000/login
```

**Headers:**

```text
Content-Type: application/json
```

**Body:**

```json
{
  "email": "carlos@example.com",
  "password": "mi_password_segura"
}
```

### Respuesta esperada

**HTTP 200 OK**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer"
}
```

El `access_token` corresponde al JWT generado después de una autenticación exitosa.

---

# 📚 Documentación de la API

FastAPI proporciona automáticamente documentación interactiva mediante Swagger UI.

Puedes acceder desde:

```text
http://<IP-DE-TU-VM>:8000/docs
```

Por ejemplo:

```text
http://35.172.181.195:8000/docs
```

Desde Swagger puedes:

* Visualizar los endpoints.
* Probar `POST /register`.
* Probar `POST /login`.
* Revisar los esquemas de las peticiones.
* Revisar las respuestas de la API.

---

# 🔍 Comandos útiles

## Seed masivo de datos

El seed inserta 20.000 usuarios y una direccion relacionada por usuario. Es idempotente: si ya existe esa cantidad, no vuelve a insertar registros.

```bash
docker exec ms-usuarios python scripts/seed.py
```

La contrasena de prueba para los usuarios generados es `Password123!`.

## Roles

Los usuarios nuevos se registran siempre con el rol `cliente`. El endpoint `GET /usuarios` requiere un JWT cuyo rol sea `admin`. El rol `restaurante` permite administrar pedidos desde `ms-pedidos`.

En despliegue, configura `SECRET_KEY` como una variable de entorno fuerte y diferente por ambiente.

Para convertir un usuario existente en administrador, registralo primero y ejecuta:

```bash
docker exec -e ADMIN_EMAIL='admin@example.com' \
  -e ADMIN_PASSWORD='cambia-esta-clave' \
  ms-usuarios python scripts/create_admin.py
```

El login devuelve el rol dentro del JWT. Envia el token para consultar el endpoint protegido:

```text
Authorization: Bearer <access_token>
```

Para asignar un rol a un usuario existente:

```bash
docker exec \
  -e USER_EMAIL='restaurante@example.com' \
  -e USER_ROLE='restaurante' \
  -e RESTAURANT_ID='rest-001' \
  proy-cloud-usuarios-1 \
  python scripts/set_role.py
```

## Ver contenedores activos

```bash
docker ps
```

## Ver todos los contenedores

```bash
docker ps -a
```

## Ver el estado de Docker Compose

```bash
docker compose ps
```

## Ver logs de los servicios

```bash
docker compose logs
```

## Ver logs de la API en tiempo real

```bash
docker compose logs -f api
```

> Si el servicio tiene otro nombre en tu `docker-compose.yml`, reemplaza `api` por el nombre correspondiente.

## Detener los servicios

```bash
docker compose down
```

## Detener los servicios y eliminar los volúmenes

```bash
docker compose down -v
```

> ⚠️ `docker compose down -v` elimina los volúmenes asociados, por lo que los datos almacenados en MySQL pueden perderse.

## Reconstruir los contenedores

```bash
docker compose up --build -d
```

---

# 🌐 Despliegue en AWS

Si el proyecto se ejecuta en una instancia de AWS, debes asegurarte de que el puerto **8000** esté permitido en las reglas de entrada (*Inbound Rules*) del Security Group.

Necesitarás permitir:

```text
TCP
Port: 8000
```

Después podrás acceder a la API desde:

```text
http://<IP-PÚBLICA-DE-TU-INSTANCIA>:8000
```

Y a Swagger:

```text
http://<IP-PÚBLICA-DE-TU-INSTANCIA>:8000/docs
```

---

# 🔐 Flujo de autenticación

El flujo principal del microservicio es:

```text
                 ┌──────────────┐
                 │    Cliente   │
                 └──────┬───────┘
                        │
                        ▼
                POST /register
                        │
                        ▼
                 ┌─────────────┐
                 │   FastAPI   │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │    MySQL    │
                 └─────────────┘


                 ┌──────────────┐
                 │    Cliente   │
                 └──────┬───────┘
                        │
                        ▼
                  POST /login
                        │
                        ▼
                 ┌─────────────┐
                 │   FastAPI   │
                 └──────┬──────┘
                        │
                        ▼
                  Validar usuario
                        │
                        ▼
                  Generar JWT
                        │
                        ▼
                 Access Token
```

---

# 📌 Consideraciones

* Las contraseñas no deben almacenarse en texto plano.
* Utiliza variables de entorno para credenciales sensibles.
* No publiques claves secretas JWT dentro del código fuente.
* En producción, utiliza HTTPS.
* No expongas directamente el puerto de MySQL a Internet si no es necesario.
* Para producción, utiliza credenciales diferentes a las utilizadas durante las pruebas.

---

## 👨‍💻 Autor

**Miguel Adrián Espinoza Arnero**

Proyecto académico — Microservicio de Autenticación
FastAPI + MySQL + Docker
