from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=False)
    password = Column(String(255), nullable=False)
    
    # Relacion 1-a-N con Direccion
    direcciones = relationship("Direccion", back_populates="user", cascade="all, delete-orphan")

class Direccion(Base):
    __tablename__ = "direcciones"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    calle_y_numero = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    user = relationship("User", back_populates="direcciones")