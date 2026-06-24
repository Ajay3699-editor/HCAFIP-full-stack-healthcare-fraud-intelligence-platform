from sqlalchemy.orm import Session
from app.infrastructure.database.models import ClaimModel, SchemeModel, PatientModel

class BenefitVerifier:
    def __init__(self, db: Session):
        self.db = db

    def verify_eligibility(self, patient_id: str, scheme_id: str) -> dict:
        """
        Checks whether a patient is eligible for a scheme and returns:
        - eligible: bool
        - remaining_attempts: int
        - remaining_coverage: float
        - reasons: list of strings (if not eligible)
        """
        reasons = []
        
        # Verify patient exists
        patient = self.db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
        if not patient:
            return {
                "eligible": False,
                "remaining_attempts": 0,
                "remaining_coverage": 0.0,
                "used_attempts": 0,
                "used_amount": 0.0,
                "reasons": ["Patient registry record not found."]
            }

        # Verify scheme exists
        scheme = self.db.query(SchemeModel).filter(SchemeModel.scheme_id == scheme_id).first()
        if not scheme:
            return {
                "eligible": False,
                "remaining_attempts": 0,
                "remaining_coverage": 0.0,
                "used_attempts": 0,
                "used_amount": 0.0,
                "reasons": ["Government scheme not found."]
            }

        # Query all claims for this patient under this scheme (excluding rejected claims)
        claims = self.db.query(ClaimModel).filter(
            ClaimModel.patient_id == patient_id,
            ClaimModel.scheme_id == scheme_id,
            ClaimModel.status != "REJECTED"
        ).all()

        used_attempts = len(claims)
        used_amount = sum(c.amount for c in claims)

        remaining_attempts = max(0, scheme.max_attempts - used_attempts)
        remaining_coverage = max(0.0, scheme.max_amount - used_amount)

        eligible = True
        if remaining_attempts <= 0:
            eligible = False
            reasons.append("Maximum claim attempts limit reached for this scheme.")
        if remaining_coverage <= 0:
            eligible = False
            reasons.append("Scheme financial coverage limit has been fully exhausted.")

        return {
            "eligible": eligible,
            "remaining_attempts": remaining_attempts,
            "remaining_coverage": remaining_coverage,
            "used_attempts": used_attempts,
            "used_amount": used_amount,
            "max_attempts": scheme.max_attempts,
            "max_amount": scheme.max_amount,
            "reasons": reasons
        }
