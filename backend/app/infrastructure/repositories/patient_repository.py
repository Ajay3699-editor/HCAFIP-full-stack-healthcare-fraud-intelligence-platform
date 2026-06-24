from sqlalchemy.orm import Session
from app.infrastructure.database.models import PatientModel

class PatientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, patient_id: str) -> PatientModel:
        return self.db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()

    def get_by_health_id(self, health_id: str) -> PatientModel:
        return self.db.query(PatientModel).filter(PatientModel.health_id == health_id).first()

    def create(self, patient: PatientModel) -> PatientModel:
        self.db.add(patient)
        self.db.commit()
        self.db.refresh(patient)
        return patient

    def list_all(self) -> list[PatientModel]:
        return self.db.query(PatientModel).all()
