from sqlalchemy.orm import Session
from app.infrastructure.database.models import FraudAlertModel

class FraudRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, alert_id: str) -> FraudAlertModel:
        return self.db.query(FraudAlertModel).filter(FraudAlertModel.alert_id == alert_id).first()

    def get_by_patient_id(self, patient_id: str) -> list[FraudAlertModel]:
        return self.db.query(FraudAlertModel).filter(FraudAlertModel.patient_id == patient_id).order_by(FraudAlertModel.created_at.desc()).all()

    def create(self, alert: FraudAlertModel) -> FraudAlertModel:
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def list_all(self) -> list[FraudAlertModel]:
        return self.db.query(FraudAlertModel).order_by(FraudAlertModel.created_at.desc()).all()
