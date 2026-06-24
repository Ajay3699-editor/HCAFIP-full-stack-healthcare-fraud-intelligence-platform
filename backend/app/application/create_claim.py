from sqlalchemy.orm import Session
from app.infrastructure.database.models import ClaimModel, PatientModel, SchemeModel
from app.infrastructure.repositories.claim_repository import ClaimRepository
from app.infrastructure.repositories.patient_repository import PatientRepository
from app.infrastructure.repositories.scheme_repository import SchemeRepository
from app.application.detect_fraud import FraudDetector
from app.application.verify_benefit import BenefitVerifier
from app.infrastructure.external_services.ml_service import MLService
import uuid
from datetime import datetime

class ClaimProcessor:
    def __init__(self, db: Session, ml_service: MLService):
        self.db = db
        self.claim_repo = ClaimRepository(db)
        self.patient_repo = PatientRepository(db)
        self.scheme_repo = SchemeRepository(db)
        self.fraud_detector = FraudDetector(db)
        self.benefit_verifier = BenefitVerifier(db)
        self.ml_service = ml_service

    def process_claim(self, patient_id: str, scheme_id: str, hospital_id: str, amount: float, procedure: str) -> ClaimModel:
        """
        Processes claim:
        1. Verifies patient eligibility
        2. Calculates rule-based fraud alerts
        3. Invokes ML risk analyzer
        4. Saves and persists claim with status (FLAGGED or APPROVED) and score
        """
        # Load Patient and Scheme
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} does not exist.")

        scheme = self.scheme_repo.get_by_id(scheme_id)
        if not scheme:
            raise ValueError(f"Scheme with ID {scheme_id} does not exist.")

        claim_id = str(uuid.uuid4())

        # 1. Run eligibility verification
        eligibility = self.benefit_verifier.verify_eligibility(patient_id, scheme_id)
        
        # 2. Run rule-based fraud detection
        rule_results = self.fraud_detector.check_claims(patient_id, scheme_id, amount, procedure=procedure, current_claim_id=claim_id)
        reasons = rule_results["reasons"]

        # If not eligible according to verifier, append that as a fraud rule reason
        if not eligibility["eligible"]:
            reasons.extend(eligibility["reasons"])
            rule_results["is_flagged"] = True

        # 3. Run ML risk scorer
        ml_risk_score = self.ml_service.predict_risk(
            patient_id=patient_id,
            hospital_id=hospital_id,
            procedure=procedure,
            amount=amount,
            age=patient.age,
            db=self.db
        )

        # Determine status
        # If rules engine flags it OR ML risk is high, set status to FLAGGED. Else APPROVED
        is_flagged = rule_results["is_flagged"] or ml_risk_score >= 50.0
        status = "FLAGGED" if is_flagged else "APPROVED"

        # Create database record
        new_claim = ClaimModel(
            claim_id=claim_id,
            patient_id=patient_id,
            scheme_id=scheme_id,
            hospital_id=hospital_id,
            amount=amount,
            procedure=procedure,
            status=status,
            ml_risk_score=ml_risk_score,
            fraud_checked=2,  # Rules + ML checked
            created_at=datetime.utcnow()
        )

        saved_claim = self.claim_repo.create(new_claim)

        # 4. If flagged, save a FraudAlert record
        if is_flagged:
            if not reasons:
                reasons = [f"ML Fraud Detector flagged claim with high risk score: {ml_risk_score}%"]
            self.fraud_detector.generate_and_save_alert(
                patient_id=patient_id,
                claim_id=claim_id,
                risk_score=max(rule_results["risk_score"], ml_risk_score),
                reasons=reasons
            )

        return saved_claim
