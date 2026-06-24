import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.infrastructure.database.models import ClaimModel, PatientModel, SchemeModel, FraudAlertModel, TreatmentModel

load_dotenv()

try:
    from google import genai
    from google.genai import types
    HAS_GEMINI_SDK = True
except ImportError:
    HAS_GEMINI_SDK = False

class GeminiService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.gemini_key and HAS_GEMINI_SDK:
            try:
                self.client = genai.Client(api_key=self.gemini_key)
            except Exception as e:
                print(f"Failed to initialize Gemini Client in gemini_service: {e}")

    def explain_flagged_claim(self, claim_id: str, db: Session, user_query: str = None) -> str:
        """
        Gathers claim details, patient history, and fraud alerts, and asks Gemini to
        explain why this claim was flagged as suspicious, or answer a specific investigator query.
        """
        # 1. Fetch Claim and associated data
        claim = db.query(ClaimModel).filter(ClaimModel.claim_id == claim_id).first()
        if not claim:
            return "Error: Claim not found."

        patient = db.query(PatientModel).filter(PatientModel.patient_id == claim.patient_id).first()
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == claim.scheme_id).first()
        alerts = db.query(FraudAlertModel).filter(FraudAlertModel.claim_id == claim_id).all()
        
        # Patient's treatment history
        treatments = db.query(TreatmentModel).filter(TreatmentModel.patient_id == claim.patient_id).all()
        
        # Compile patient summary
        patient_name = patient.name if patient else "Unknown"
        patient_age = patient.age if patient else "Unknown"
        patient_gender = patient.gender if patient else "Unknown"
        scheme_name = scheme.scheme_name if scheme else "Unknown"
        max_amount = scheme.max_amount if scheme else 0.0
        max_attempts = scheme.max_attempts if scheme else 0
        
        alert_reasons = [a.reason for a in alerts]
        alerts_text = "\n".join([f"- [Risk Score: {a.risk_score}%] {a.reason}" for a in alerts])
        if not alerts_text:
            alerts_text = "No rule-based alerts triggered. Flagged by ML Classifier."

        # Compile prior claims
        prior_claims = db.query(ClaimModel).filter(
            ClaimModel.patient_id == claim.patient_id,
            ClaimModel.claim_id != claim_id
        ).all()
        
        prior_claims_text = "\n".join([
            f"- Claim ID: {c.claim_id[:8]}... | Date: {c.created_at.strftime('%Y-%m-%d')} | Amount: ${c.amount:.2f} | Status: {c.status}"
            for c in prior_claims
        ])
        if not prior_claims_text:
            prior_claims_text = "No prior claims."

        # Compile prior treatments
        prior_treatments_text = "\n".join([
            f"- Date: {t.date.strftime('%Y-%m-%d')} | Hospital ID: {t.hospital_id} | Procedure: {t.procedure} | Cost: ${t.cost:.2f}"
            for t in treatments
        ])
        if not prior_treatments_text:
            prior_treatments_text = "No treatment history."

        # 2. Build the LLM Context & Prompt
        prompt = (
            f"You are a Senior Healthcare Fraud Investigator Assistant for the Government Health Portal.\n"
            f"Please analyze the following flagged claim case and provide an expert breakdown.\n\n"
            f"CASE UNDER REVIEW:\n"
            f"- Claim ID: {claim.claim_id}\n"
            f"- Patient Name: {patient_name} (Age: {patient_age}, Gender: {patient_gender})\n"
            f"- Claimed Amount: ${claim.amount:.2f}\n"
            f"- Scheme: {scheme_name} (Limits: Max Amount: ${max_amount:.2f}, Max Attempts: {max_attempts})\n"
            f"- ML Risk Score: {claim.ml_risk_score}%\n"
            f"- Triggered Rules / Alerts:\n{alerts_text}\n\n"
            f"PATIENT SYSTEM HISTORY:\n"
            f"Prior Claims:\n{prior_claims_text}\n\n"
            f"Treatment Records:\n{prior_treatments_text}\n\n"
        )

        if user_query:
            prompt += f"INVESTIGATOR QUESTION: {user_query}\n\n"
        else:
            prompt += (
                "Please write a concise 3-paragraph summary answering the following:\n"
                "1. Why was this claim flagged? (Identify which specific limits or behavioral patterns were breached)\n"
                "2. What is the evidence? (Summarize claims dates, hospital hops, and repeated procedures)\n"
                "3. Recommendation: Should the investigator Approve, Reject, or Audit this claim?\n"
            )

        # 3. Call Gemini if client is initialized
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[prompt]
                )
                return response.text.strip()
            except Exception as e:
                print(f"Gemini API query failed, using offline fallback: {e}")

        # 4. Offline Fallback Logic
        fallback_response = (
            f"### [OFFLINE REPORT] Fraud Investigation for Claim {claim.claim_id[:8]}...\n\n"
            f"**1. Flag Reason:**\n"
            f"This claim was flagged due to a cumulative risk score of **{claim.ml_risk_score}%** and the following rule triggers:\n"
            f"{alerts_text}\n\n"
            f"**2. Analysis of Patient History:**\n"
            f"- The patient {patient_name} submitted a claim of ${claim.amount:.2f} under '{scheme_name}'.\n"
            f"- The patient has {len(prior_claims)} prior claims on record totaling ${sum(c.amount for c in prior_claims):.2f}.\n"
            f"- The patient has {len(treatments)} recorded treatments. "
        )

        if len(prior_claims) > max_attempts:
            fallback_response += f"This exceeds the maximum allowed attempts ({max_attempts}) for this scheme. "
        
        # Check for multiple claims same day
        today_dates = [c.created_at.date() for c in prior_claims + [claim]]
        if len(today_dates) != len(set(today_dates)):
            fallback_response += "Multiple claims were detected on the same date, representing suspicious overlapping entries. "

        fallback_response += (
            f"\n\n**3. Recommendation:**\n"
            f"Based on rule violations and historical overlap across multiple facilities, we recommend **AUDIT** or **REJECTION** of this claim. "
            f"Request physical clinical documentation from the hospital to verify the treatment occurred."
        )
        return fallback_response
