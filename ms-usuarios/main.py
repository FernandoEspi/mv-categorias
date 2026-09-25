import os

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from passlib.context import CryptContext
import jwt
import models, schemas, database
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "MS1 Usuarios OK"}

@app.get("/health")
def health_check():
    return {"status": "UP"}

models.Base.metadata.create_all(bind=database.engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "tu_secreto_super_seguro"
ALGORITHM = "HS256"
SECRET_KEY = os.getenv("SECRET_KEY", SECRET_KEY)
security = HTTPBearer()


def ensure_role_column():
    with database.engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        if "role" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN role "
                    "VARCHAR(20) NOT NULL DEFAULT 'cliente'"
                )
            )
        if "restaurant_id" not in columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN restaurant_id VARCHAR(50)")
            )


ensure_role_column()

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = get_password_hash(user.password)
    
    new_user = models.User(
        nombre=user.nombre,
        apellido=user.apellido,
        email=user.email,
        telefono=user.telefono,
        password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Guardar en la segunda tabla (Relacionada)
    nueva_direccion = models.Direccion(
        calle_y_numero=user.direccion,
        user_id=new_user.id
    )
    db.add(nueva_direccion)
    db.commit()
    
    return {"message": "Usuario y dirección registrados exitosamente"}

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = jwt.encode(
        {
            "sub": db_user.email,
            "user_id": db_user.id,
            "role": db_user.role,
            "restaurant_id": db_user.restaurant_id,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer"}


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except jwt.PyJWTError as error:
        raise HTTPException(status_code=401, detail="Token invalido") from error

    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return payload


@app.get("/usuarios", response_model=List[schemas.UserResponse])
def get_usuarios(
    db: Session = Depends(database.get_db),
    _admin=Depends(require_admin),
):
    return db.query(models.User).all()

@app.get("/api/usuarios/{user_id}", response_model=schemas.UserResponse, include_in_schema=False)
@app.get("/usuarios/{user_id}", response_model=schemas.UserResponse)
def get_usuario_by_id(user_id: int, db: Session = Depends(database.get_db)):
    usuario = db.query(models.User).filter(models.User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario