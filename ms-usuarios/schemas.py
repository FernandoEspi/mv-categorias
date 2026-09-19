from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    telefono: str
    password: str
    direccion: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: EmailStr
    telefono: str

    class Config:
        from_attributes = True