from sqlalchemy.orm import Session
from app.infrastructure.database.models import UserModel

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_username(self, username: str) -> UserModel:
        return self.db.query(UserModel).filter(UserModel.username == username).first()

    def get_by_id(self, user_id: str) -> UserModel:
        return self.db.query(UserModel).filter(UserModel.user_id == user_id).first()

    def create(self, user: UserModel) -> UserModel:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
