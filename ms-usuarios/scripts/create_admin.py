import os

from passlib.context import CryptContext

import database
import models


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin() -> None:
    email = os.environ["ADMIN_EMAIL"]
    password = os.environ["ADMIN_PASSWORD"]
    db = database.SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise RuntimeError(
                "El usuario debe registrarse primero antes de convertirlo en admin"
            )
        user.role = "admin"
        user.password = pwd_context.hash(password)
        db.commit()
        print(f"Administrador configurado: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()