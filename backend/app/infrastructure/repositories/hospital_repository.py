from sqlalchemy.orm import Session
from app.infrastructure.database.models import HospitalModel

class HospitalRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, hospital_id: str) -> HospitalModel:
        return self.db.query(HospitalModel).filter(HospitalModel.hospital_id == hospital_id).first()

    def create(self, hospital: HospitalModel) -> HospitalModel:
        self.db.add(hospital)
        self.db.commit()
        self.db.refresh(hospital)
        return hospital

    def list_all(self) -> list[HospitalModel]:
        return self.db.query(HospitalModel).all()
