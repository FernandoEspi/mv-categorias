import os

import database
import models


ALLOWED_ROLES = {"cliente", "restaurante", "admin"}


def set_role() -> None:
    email = os.environ["USER_EMAIL"]
    role = os.environ["USER_ROLE"]
    restaurant_id = os.getenv("RESTAURANT_ID")
    if role not in ALLOWED_ROLES:
        raise ValueError(f"Rol invalido. Usa uno de: {sorted(ALLOWED_ROLES)}")
    if role == "restaurante" and not restaurant_id:
        raise ValueError("RESTAURANT_ID es obligatorio para el rol restaurante")

    db = database.SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise RuntimeError("El usuario debe registrarse primero")
        user.role = role
        user.restaurant_id = restaurant_id if role == "restaurante" else None
        db.commit()
        print(f"Rol configurado: {email} -> {role}")
    finally:
        db.close()


if __name__ == "__main__":
    set_role()