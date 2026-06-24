from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.models import ClaimModel, UserModel, SchemeModel, PatientModel, HospitalModel
from app.infrastructure.repositories.claim_repository import ClaimRepository
from app.infrastructure.repositories.hospital_repository import HospitalRepository
from app.application.verify_benefit import BenefitVerifier
from app.application.create_claim import ClaimProcessor
from app.infrastructure.external_services.ml_service import MLService
from app.infrastructure.external_services.ocr_service import OCRService
from app.api.security import require_role, get_current_user

router = APIRouter(prefix="/claims", tags=["Claims Engine"])

# Singletons for services
ml_service = MLService()
ocr_service = OCRService()

class BenefitVerifySchema(BaseModel):
    patient_id: str
    scheme_id: str

class ClaimCreateSchema(BaseModel):
    patient_id: str
    scheme_id: str
    amount: float = Field(..., gt=0.0)
    procedure: str = Field(..., min_length=2, max_length=255)

class ClaimResponseSchema(BaseModel):
    claim_id: str
    patient_id: str
    patient_name: str | None = None
    scheme_id: str
    scheme_name: str | None = None
    hospital_id: str
    hospital_name: str | None = None
    amount: float
    procedure: str | None = None
    status: str
    ml_risk_score: float
    created_at: datetime

    class Config:
        from_attributes = True

class OCRResponseSchema(BaseModel):
    patient_name: str
    procedure: str
    cost: float
    method: str

@router.post("/verify")
def verify_benefits(
    data: BenefitVerifySchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Hospital", "Government"]))
):
    verifier = BenefitVerifier(db)
    return verifier.verify_eligibility(data.patient_id, data.scheme_id)

@router.post("", response_model=ClaimResponseSchema, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_data: ClaimCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Hospital"]))
):
    # Resolve Hospital ID from hospital user
    hospital_id = current_user.associated_id
    if not hospital_id:
        # Fallback to first hospital if testing
        hospital_repo = HospitalRepository(db)
        hospitals = hospital_repo.list_all()
        if hospitals:
            hospital_id = hospitals[0].hospital_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hospital account has no associated Hospital registry record."
            )

    processor = ClaimProcessor(db, ml_service)
    try:
        claim = processor.process_claim(
            patient_id=claim_data.patient_id,
            scheme_id=claim_data.scheme_id,
            hospital_id=hospital_id,
            amount=claim_data.amount,
            procedure=claim_data.procedure
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Decorate response
    patient = db.query(PatientModel).filter(PatientModel.patient_id == claim.patient_id).first()
    scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == claim.scheme_id).first()
    hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == claim.hospital_id).first()

    resp = ClaimResponseSchema.model_validate(claim)
    resp.patient_name = patient.name if patient else None
    resp.scheme_name = scheme.scheme_name if scheme else None
    resp.hospital_name = hospital.name if hospital else None
    
    return resp

@router.post("/upload-bill", response_model=OCRResponseSchema)
async def upload_bill(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_role(["Hospital"]))
):
    try:
        content = await file.read()
        extracted_info = ocr_service.extract_medical_info(content, file.filename)
        return extracted_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )

@router.get("/list", response_model=list[ClaimResponseSchema])
def list_all_claims(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Government", "Investigator"]))
):
    claim_repo = ClaimRepository(db)
    claims = claim_repo.list_all()
    
    response_list = []
    for c in claims:
        patient = db.query(PatientModel).filter(PatientModel.patient_id == c.patient_id).first()
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == c.scheme_id).first()
        hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == c.hospital_id).first()
        
        resp = ClaimResponseSchema.model_validate(c)
        resp.patient_name = patient.name if patient else None
        resp.scheme_name = scheme.scheme_name if scheme else None
        resp.hospital_name = hospital.name if hospital else None
        response_list.append(resp)
        
    return response_list

@router.get("/patient/{patient_id}", response_model=list[ClaimResponseSchema])
def get_claims_by_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role == "Patient" and current_user.associated_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view claims for this patient ID."
        )
        
    claim_repo = ClaimRepository(db)
    claims = claim_repo.get_by_patient_id(patient_id)
    
    response_list = []
    for c in claims:
        patient = db.query(PatientModel).filter(PatientModel.patient_id == c.patient_id).first()
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == c.scheme_id).first()
        hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == c.hospital_id).first()
        
        resp = ClaimResponseSchema.model_validate(c)
        resp.patient_name = patient.name if patient else None
        resp.scheme_name = scheme.scheme_name if scheme else None
        resp.hospital_name = hospital.name if hospital else None
        response_list.append(resp)
        
    return response_list

@router.get("/hospital/{hospital_id}", response_model=list[ClaimResponseSchema])
def get_claims_by_hospital(
    hospital_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Hospital", "Government", "Investigator"]))
):
    if current_user.role == "Hospital" and current_user.associated_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view claims for this hospital ID."
        )

    claim_repo = ClaimRepository(db)
    claims = claim_repo.get_by_hospital_id(hospital_id)
    
    response_list = []
    for c in claims:
        patient = db.query(PatientModel).filter(PatientModel.patient_id == c.patient_id).first()
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == c.scheme_id).first()
        hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == c.hospital_id).first()
        
        resp = ClaimResponseSchema.model_validate(c)
        resp.patient_name = patient.name if patient else None
        resp.scheme_name = scheme.scheme_name if scheme else None
        resp.hospital_name = hospital.name if hospital else None
        response_list.append(resp)
        
    return response_list

@router.get("/{claim_id}", response_model=ClaimResponseSchema)
def get_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    claim_repo = ClaimRepository(db)
    claim = claim_repo.get_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        
    if current_user.role == "Patient" and current_user.associated_id != claim.patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role == "Hospital" and current_user.associated_id != claim.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    patient = db.query(PatientModel).filter(PatientModel.patient_id == claim.patient_id).first()
    scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == claim.scheme_id).first()
    hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == claim.hospital_id).first()

    resp = ClaimResponseSchema.model_validate(claim)
    resp.patient_name = patient.name if patient else None
    resp.scheme_name = scheme.scheme_name if scheme else None
    resp.hospital_name = hospital.name if hospital else None
    return resp

@router.post("/{claim_id}/approve", response_model=ClaimResponseSchema)
def approve_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Government", "Investigator"]))
):
    claim_repo = ClaimRepository(db)
    claim = claim_repo.get_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        
    updated = claim_repo.update_status(claim_id, "APPROVED")
    
    patient = db.query(PatientModel).filter(PatientModel.patient_id == updated.patient_id).first()
    scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == updated.scheme_id).first()
    hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == updated.hospital_id).first()

    resp = ClaimResponseSchema.model_validate(updated)
    resp.patient_name = patient.name if patient else None
    resp.scheme_name = scheme.scheme_name if scheme else None
    resp.hospital_name = hospital.name if hospital else None
    return resp

@router.post("/{claim_id}/reject", response_model=ClaimResponseSchema)
def reject_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Government", "Investigator"]))
):
    claim_repo = ClaimRepository(db)
    claim = claim_repo.get_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        
    updated = claim_repo.update_status(claim_id, "REJECTED")
    
    patient = db.query(PatientModel).filter(PatientModel.patient_id == updated.patient_id).first()
    scheme = db.query(SchemeModel).filter(SchemeModel.scheme_id == updated.scheme_id).first()
    hospital = db.query(HospitalModel).filter(HospitalModel.hospital_id == updated.hospital_id).first()

    resp = ClaimResponseSchema.model_validate(updated)
    resp.patient_name = patient.name if patient else None
    resp.scheme_name = scheme.scheme_name if scheme else None
    resp.hospital_name = hospital.name if hospital else None
    return resp
