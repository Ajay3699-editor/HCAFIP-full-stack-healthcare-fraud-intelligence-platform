from sqlalchemy.orm import Session
from app.infrastructure.database.models import ClaimModel

class ClaimRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, claim_id: str) -> ClaimModel:
        return self.db.query(ClaimModel).filter(ClaimModel.claim_id == claim_id).first()

    def get_by_patient_id(self, patient_id: str) -> list[ClaimModel]:
        return self.db.query(ClaimModel).filter(ClaimModel.patient_id == patient_id).order_by(ClaimModel.created_at.desc()).all()

    def get_by_hospital_id(self, hospital_id: str) -> list[ClaimModel]:
        return self.db.query(ClaimModel).filter(ClaimModel.hospital_id == hospital_id).order_by(ClaimModel.created_at.desc()).all()

    def create(self, claim: ClaimModel) -> ClaimModel:
        self.db.add(claim)
        self.db.commit()
        self.db.refresh(claim)
        return claim

    def update_status(self, claim_id: str, status: str, risk_score: float = None) -> ClaimModel:
        claim = self.get_by_id(claim_id)
        if claim:
            claim.status = status
            if risk_score is not None:
                claim.ml_risk_score = risk_score
            self.db.commit()
            self.db.refresh(claim)
        return claim

    def list_all(self) -> list[ClaimModel]:
        return self.db.query(ClaimModel).order_by(ClaimModel.created_at.desc()).all()
