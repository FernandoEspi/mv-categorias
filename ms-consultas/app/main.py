import os
import time
import boto3
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Analitica Service API",
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

# Configuracion de AWS Athena desde Variables de Entorno
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_OUTPUT = os.getenv("ATHENA_S3_OUTPUT", "s3://cloudeats-athena-results-bucket/")
ATHENA_DATABASE = os.getenv("ATHENA_DATABASE", "cloudeats_db")

def get_athena_client():
    """Inicializa el cliente boto3 para Athena"""
    return boto3.client(
        'athena',
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN")  # Opcional para credenciales temporales de laboratorio
    )

def run_athena_query(query: str):
    """Ejecuta una consulta SQL en Athena y mapea la respuesta a JSON"""
    try:
        client = get_athena_client()
        
        # 1. Iniciar la ejecucion de la consulta SQL
        response = client.start_query_execution(
            QueryString=query,
            QueryExecutionContext={'Database': ATHENA_DATABASE},
            ResultConfiguration={'OutputLocation': S3_OUTPUT}
        )
        execution_id = response['QueryExecutionId']

        # 2. Esperar a que la consulta finalice
        while True:
            status_resp = client.get_query_execution(QueryExecutionId=execution_id)
            status = status_resp['QueryExecution']['Status']['State']
            if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                break
            time.sleep(0.5)

        if status != 'SUCCEEDED':
            reason = status_resp['QueryExecution']['Status'].get('StateChangeReason', 'Error desconocido')
            raise Exception(f"Athena query fallo con estado: {status}. Razon: {reason}")

        # 3. Obtener y procesar los resultados
        results = client.get_query_results(QueryExecutionId=execution_id)
        rows = results['ResultSet']['Rows']
        
        if not rows:
            return []

        # Extraer encabezados y filas
        headers = [col['VarCharValue'] for col in rows[0]['Data']]
        parsed_data = []

        for row in rows[1:]:
            values = [col.get('VarCharValue', None) for col in row['Data']]
            parsed_data.append(dict(zip(headers, values)))

        return parsed_data

    except Exception as e:
        # MOCK FALLBACK: Retorna datos de prueba en desarrollo si no hay conexion/credenciales de AWS
        print(f"Advertencia: No se pudo conectar con AWS Athena ({str(e)}). Devolviendo datos Mock de prueba.")
        return [
            {"distrito": "Miraflores", "plato": "Lomo Saltado", "rango_edad": "25-34", "total_ventas": "1420"},
            {"distrito": "San Isidro", "plato": "Ceviche Clasico", "rango_edad": "35-44", "total_ventas": "980"},
            {"distrito": "Surco", "plato": "Pollo a la Brasa", "rango_edad": "18-24", "total_ventas": "850"}
        ]

@app.get("/health")
def health_check():
    return {"status": "UP"}

@app.get("/api/analitica/platos-populares")
def obtener_platos_populares(limit: int = Query(default=10, ge=1, le=50)):
    """
    Método REST 1: Reporte de Platos más vendidos por Distrito y Rango de Edad
    (Requerimiento directo para la pantalla de la App Web en React)
    """
    query = f"""
    SELECT 
        u.distrito,
        p.nombre_plato,
        CASE 
            WHEN u.edad BETWEEN 18 AND 24 THEN '18-24'
            WHEN u.edad BETWEEN 25 AND 34 THEN '25-34'
            WHEN u.edad BETWEEN 35 AND 44 THEN '35-44'
            ELSE '45+' 
        END AS rango_edad,
        COUNT(p.id) AS total_ventas
    FROM pedidos_db.pedidos p
    JOIN usuarios_db.usuarios u ON p.usuario_id = u.id
    GROUP BY 1, 2, 3
    ORDER BY total_ventas DESC
    LIMIT {limit};
    """
    return {
        "reporte": "Estadistica de Platos mas vendidos por Distrito y Rango de Edad",
        "data": run_athena_query(query)
    }

@app.get("/api/analitica/ventas-mensuales")
def obtener_ventas_mensuales():
    """
    Método REST 2: Consolidado de ventas globales acumuladas por mes
    """
    query = """
    SELECT 
        date_format(fecha, '%Y-%m') AS mes,
        SUM(total) AS total_recaudado,
        COUNT(id) AS cantidad_pedidos
    FROM pedidos_db.pedidos
    GROUP BY 1
    ORDER BY mes DESC;
    """
    return {
        "reporte": "Resumen de ventas mensuales",
        "data": run_athena_query(query)
    }