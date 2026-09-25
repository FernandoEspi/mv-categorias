from typing import Literal

from pydantic import BaseModel, EmailStr

Role = Literal["cliente", "restaurante", "admin"]

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
    role: Role
    restaurant_id: str | None = None

    class Config:
        from_attributes = True