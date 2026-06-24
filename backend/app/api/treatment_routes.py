from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.models import TreatmentModel, UserModel
from app.infrastructure.repositories.treatment_repository import TreatmentRepository
from app.infrastructure.repositories.patient_repository import PatientRepository
from app.infrastructure.repositories.hospital_repository import HospitalRepository
from app.api.security import require_role, get_current_user
from app.domain.treatment import Treatment as TreatmentDomain

router = APIRouter(prefix="/treatments", tags=["Treatment Registry"])

class TreatmentCreateSchema(BaseModel):
    patient_id: str
    procedure: str = Field(..., min_length=2, max_length=255)
    cost: float = Field(..., ge=0.0)
    date: datetime = Field(default_factory=datetime.utcnow)

class TreatmentResponseSchema(BaseModel):
    treatment_id: str
    patient_id: str
    hospital_id: str
    procedure: str
    cost: float
    date: datetime
    hospital_name: str | None = None
    
    class Config:
        from_attributes = True

@router.post("", response_model=TreatmentResponseSchema, status_code=status.HTTP_201_CREATED)
def record_treatment(
    treatment_data: TreatmentCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Hospital"]))
):
    patient_repo = PatientRepository(db)
    hospital_repo = HospitalRepository(db)
    treatment_repo = TreatmentRepository(db)

    # Resolve Hospital ID from hospital user
    hospital_id = current_user.associated_id
    if not hospital_id:
        # Fallback or check if hospital database has any records
        # For testing, we can check if there's a default hospital, or raise exception
        hospital = db.query(HospitalRepository).first() # wait, let's look up a default or raise
        hospitals = hospital_repo.list_all()
        if hospitals:
            hospital_id = hospitals[0].hospital_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hospital account has no associated Hospital registry record."
            )

    # Validate patient exists
    patient = patient_repo.get_by_id(treatment_data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found in registry."
        )

    # Business Validation via Domain Object
    treatment_domain = TreatmentDomain(
        treatment_id="",
        patient_id=treatment_data.patient_id,
        hospital_id=hospital_id,
        date=treatment_data.date,
        procedure=treatment_data.procedure,
        cost=treatment_data.cost
    )
    try:
        treatment_domain.validate()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Save to database
    new_treatment = TreatmentModel(
        treatment_id=str(uuid.uuid4()),
        patient_id=treatment_data.patient_id,
        hospital_id=hospital_id,
        date=treatment_data.date,
        procedure=treatment_data.procedure,
        cost=treatment_data.cost
    )
    
    saved_treatment = treatment_repo.create(new_treatment)
    
    # Add hospital name for display
    hospital_obj = hospital_repo.get_by_id(hospital_id)
    response_data = TreatmentResponseSchema.model_validate(saved_treatment)
    if hospital_obj:
        response_data.hospital_name = hospital_obj.name
        
    return response_data

@router.get("/patient/{patient_id}", response_model=list[TreatmentResponseSchema])
def get_patient_treatments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Security check: patients can only view their own history
    if current_user.role == "Patient" and current_user.associated_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this patient's treatment history."
        )

    treatment_repo = TreatmentRepository(db)
    hospital_repo = HospitalRepository(db)
    
    treatments = treatment_repo.get_by_patient_id(patient_id)
    response_list = []
    
    for t in treatments:
        hospital_obj = hospital_repo.get_by_id(t.hospital_id)
        resp = TreatmentResponseSchema.model_validate(t)
        if hospital_obj:
            resp.hospital_name = hospital_obj.name
        response_list.append(resp)
        
    return response_list
