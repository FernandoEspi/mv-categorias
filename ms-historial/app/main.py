import os
import asyncio
import httpx
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agregador Service API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URLs de los demas microservicios (variables de entorno)
MS1_URL = os.getenv("MS1_USUARIOS_URL", "http://localhost:3001")
MS2_URL = os.getenv("MS2_CATALOGO_URL", "http://localhost:3002")
MS3_URL = os.getenv("MS3_PEDIDOS_URL", "http://localhost:3003")

async def fetch_data(client: httpx.AsyncClient, url: str, fallback_data: dict):
    """Peticion HTTP asincrona con manejo de fallos/mocks"""
    try:
        response = await client.get(url, timeout=4.0)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Advertencia: No se pudo conectar a {url}. Usando Mock. Error: {e}")
    return fallback_data

@app.get("/health")
def health_check():
    return {"status": "UP"}

@app.get("/api/dashboard")
async def obtener_dashboard_usuario(user_id: str = Query(..., alias="userId")):
    """
    Orquestador: Consume MS1, MS2 y MS3 simultaneamente para armar el Dashboard del Usuario.
    """
    async with httpx.AsyncClient() as client:
        # Definicion de llamadas simultaneas
        task_user = fetch_data(
            client, 
            f"{MS1_URL}/api/usuarios/{user_id}",
            {"id": user_id, "nombre": "Usuario Demo", "email": "demo@cloudeats.com"}
        )
        
        task_fav = fetch_data(
            client, 
            f"{MS2_URL}/api/restaurantes/favorito/{user_id}",
            {"id": "rest-1", "nombre": "Bembos Test", "distrito": "Miraflores"}
        )
        
        task_orders = fetch_data(
            client, 
            f"{MS3_URL}/api/pedidos/usuario/{user_id}",
            [{"id": "ped-101", "total": 45.50, "fecha": "2026-03-01"}]
        )

        # Ejecucion concurrente de las 3 peticiones
        user_data, fav_restaurant, orders_history = await asyncio.gather(
            task_user, task_fav, task_orders
        )

    return {
        "usuario": user_data,
        "restauranteFavorito": fav_restaurant,
        "historialPedidos": orders_history
    }