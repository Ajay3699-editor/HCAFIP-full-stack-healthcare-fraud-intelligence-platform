from sqlalchemy.orm import Session
from app.infrastructure.database.models import TreatmentModel

class TreatmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, treatment_id: str) -> TreatmentModel:
        return self.db.query(TreatmentModel).filter(TreatmentModel.treatment_id == treatment_id).first()

    def get_by_patient_id(self, patient_id: str) -> list[TreatmentModel]:
        return self.db.query(TreatmentModel).filter(TreatmentModel.patient_id == patient_id).order_by(TreatmentModel.date.desc()).all()

    def create(self, treatment: TreatmentModel) -> TreatmentModel:
        self.db.add(treatment)
        self.db.commit()
        self.db.refresh(treatment)
        return treatment

    def list_all(self) -> list[TreatmentModel]:
        return self.db.query(TreatmentModel).all()
