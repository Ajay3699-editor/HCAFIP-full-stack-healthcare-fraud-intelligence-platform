from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.models import FraudAlertModel, UserModel, PatientModel
from app.infrastructure.repositories.fraud_repository import FraudRepository
from app.infrastructure.external_services.gemini_service import GeminiService
from app.api.security import require_role

router = APIRouter(prefix="/fraud", tags=["Fraud Intelligence"])

# Initialize Gemini Service
gemini_service = GeminiService()

class FraudAlertResponseSchema(BaseModel):
    alert_id: str
    patient_id: str
    patient_name: str | None = None
    claim_id: str | None = None
    risk_score: float
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExplainResponseSchema(BaseModel):
    claim_id: str
    explanation: str

@router.get("/alerts", response_model=list[FraudAlertResponseSchema])
def list_fraud_alerts(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Investigator", "Government"]))
):
    fraud_repo = FraudRepository(db)
    alerts = fraud_repo.list_all()
    
    response_list = []
    for a in alerts:
        patient = db.query(PatientModel).filter(PatientModel.patient_id == a.patient_id).first()
        
        resp = FraudAlertResponseSchema.model_validate(a)
        resp.patient_name = patient.name if patient else "Unknown"
        response_list.append(resp)
        
    return response_list

@router.get("/alerts/patient/{patient_id}", response_model=list[FraudAlertResponseSchema])
def list_patient_fraud_alerts(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Investigator", "Government", "Hospital"]))
):
    # Verify access permission if Hospital
    if current_user.role == "Hospital" and current_user.associated_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    fraud_repo = FraudRepository(db)
    alerts = fraud_repo.get_by_patient_id(patient_id)
    
    response_list = []
    for a in alerts:
        patient = db.query(PatientModel).filter(PatientModel.patient_id == a.patient_id).first()
        resp = FraudAlertResponseSchema.model_validate(a)
        resp.patient_name = patient.name if patient else "Unknown"
        response_list.append(resp)
        
    return response_list

@router.get("/claim/{claim_id}/explain", response_model=ExplainResponseSchema)
def explain_flagged_claim(
    claim_id: str,
    query: Optional[str] = Query(None, description="Custom question for the AI assistant"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Investigator", "Government"]))
):
    explanation = gemini_service.explain_flagged_claim(claim_id, db, query)
    return {
        "claim_id": claim_id,
        "explanation": explanation
    }
