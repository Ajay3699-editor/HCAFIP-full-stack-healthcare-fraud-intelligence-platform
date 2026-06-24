from sqlalchemy.orm import Session
from app.infrastructure.database.models import SchemeModel

class SchemeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, scheme_id: str) -> SchemeModel:
        return self.db.query(SchemeModel).filter(SchemeModel.scheme_id == scheme_id).first()

    def create(self, scheme: SchemeModel) -> SchemeModel:
        self.db.add(scheme)
        self.db.commit()
        self.db.refresh(scheme)
        return scheme

    def list_all(self) -> list[SchemeModel]:
        return self.db.query(SchemeModel).all()
