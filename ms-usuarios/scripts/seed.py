import os

from faker import Faker
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import database
import models


TOTAL_USERS = int(os.getenv("SEED_TOTAL_USERS", "20000"))
BATCH_SIZE = 500
fake = Faker("es_ES")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed() -> None:
    models.Base.metadata.create_all(bind=database.engine)
    db: Session = database.SessionLocal()

    try:
        existing_users = db.query(models.User).count()
        if existing_users >= TOTAL_USERS:
            print(f"Seed omitido: ya existen {existing_users} usuarios.")
            return

        password_hash = pwd_context.hash("Password123!")
        users_to_create = []

        for index in range(existing_users, TOTAL_USERS):
            users_to_create.append(
                models.User(
                    nombre=fake.first_name(),
                    apellido=fake.last_name(),
                    email=f"seed.user.{index}@cloudeats.example",
                    telefono=fake.numerify(text="#########"),
                    password=password_hash,
                    direcciones=[
                        models.Direccion(calle_y_numero=fake.address())
                    ],
                )
            )

            if len(users_to_create) == BATCH_SIZE:
                db.add_all(users_to_create)
                db.commit()
                print(f"Usuarios insertados: {index + 1}/{TOTAL_USERS}")
                users_to_create = []

        if users_to_create:
            db.add_all(users_to_create)
            db.commit()
            print(f"Usuarios insertados: {TOTAL_USERS}/{TOTAL_USERS}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()