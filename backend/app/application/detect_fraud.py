from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.infrastructure.database.models import ClaimModel, TreatmentModel, SchemeModel, PatientModel, FraudAlertModel
import uuid

class FraudDetector:
    def __init__(self, db: Session):
        self.db = db

    def check_claims(self, patient_id: str, scheme_id: str, current_amount: float, procedure: str = None, current_claim_id: str = None) -> dict:
        """
        Executes the 4 deterministic fraud rules:
        Rule 1: Used Attempts > Allowed
        Rule 2: Same Surgery Repeated (within 30 days)
        Rule 3: Multiple Claims Same Date
        Rule 4: Coverage Exhausted
        """
        reasons = []
        risk_score = 0.0

        # Load Scheme details
        scheme = self.db.query(SchemeModel).filter(SchemeModel.scheme_id == scheme_id).first()
        if not scheme:
            return {"risk_score": 0.0, "reasons": ["Invalid Scheme"], "is_flagged": True}

        # Retrieve prior claims (excluding current one if update)
        query = self.db.query(ClaimModel).filter(
            ClaimModel.patient_id == patient_id,
            ClaimModel.scheme_id == scheme_id,
            ClaimModel.status != "REJECTED"
        )
        if current_claim_id:
            query = query.filter(ClaimModel.claim_id != current_claim_id)
        prior_claims = query.all()

        # Retrieve prior treatments for surgery repeats
        prior_treatments = self.db.query(TreatmentModel).filter(
            TreatmentModel.patient_id == patient_id
        ).all()

        # --- RULE 1: Used Attempts > Allowed ---
        used_attempts = len(prior_claims)
        if used_attempts >= scheme.max_attempts:
            reasons.append(f"Rule 1 triggered: Used attempts ({used_attempts}) equals or exceeds maximum allowed ({scheme.max_attempts}) for scheme {scheme.scheme_name}.")
            risk_score += 35.0

        # --- RULE 4: Coverage Exhausted ---
        total_claimed_amount = sum(c.amount for c in prior_claims)
        if total_claimed_amount + current_amount > scheme.max_amount:
            reasons.append(f"Rule 4 triggered: Requested amount (${current_amount:.2f}) plus prior claims (${total_claimed_amount:.2f}) exceeds scheme limit (${scheme.max_amount:.2f}).")
            risk_score += 25.0

        # --- RULE 3: Multiple Claims Same Date ---
        today = datetime.utcnow().date()
        claims_today = [c for c in prior_claims if c.created_at.date() == today]
        if len(claims_today) > 0:
            reasons.append(f"Rule 3 triggered: Multiple claims submitted on the same date ({today}).")
            risk_score += 20.0

        # --- RULE 2: Same Surgery Repeated (within 30 days) ---
        # Look for identical procedures in treatments within the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_treatments = [t for t in prior_treatments if t.date >= thirty_days_ago]
        
        current_proc = procedure.strip().lower() if procedure else None
        procedures_seen = {}
        for t in recent_treatments:
            proc = t.procedure.strip().lower()
            procedures_seen[proc] = procedures_seen.get(proc, 0) + 1
            
            # Check if this treatment matches the current procedure, OR if there's an existing duplicate in treatment history
            is_match_current = (current_proc is not None and proc == current_proc)
            is_duplicate_history = (procedures_seen[proc] >= 2)
            
            if is_match_current or is_duplicate_history:
                reasons.append(f"Rule 2 triggered: Patient underwent duplicate surgery '{t.procedure}' within 30 days (on {t.date.strftime('%Y-%m-%d')}).")
                risk_score += 30.0
                break # trigger once

        # Cap the risk score at 100%
        risk_score = min(risk_score, 100.0)
        is_flagged = len(reasons) > 0 or risk_score >= 50.0

        return {
            "risk_score": risk_score,
            "reasons": reasons,
            "is_flagged": is_flagged
        }

    def generate_and_save_alert(self, patient_id: str, claim_id: str, risk_score: float, reasons: list[str]) -> FraudAlertModel:
        if not reasons:
            return None
        
        reason_text = " | ".join(reasons)
        alert = FraudAlertModel(
            alert_id=str(uuid.uuid4()),
            patient_id=patient_id,
            claim_id=claim_id,
            risk_score=risk_score,
            reason=reason_text,
            created_at=datetime.utcnow()
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert
