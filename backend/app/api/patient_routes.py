from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.models import PatientModel, UserModel
from app.infrastructure.repositories.patient_repository import PatientRepository
from app.api.security import require_role, get_current_user
from app.domain.patient import Patient as PatientDomain

router = APIRouter(prefix="/patients", tags=["Patient Registry"])

class PatientCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=120)
    gender: str = Field(..., description="Male, Female, or Other")
    health_id: str = Field(..., description="Unique Patient Government Health ID")

class PatientResponseSchema(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    health_id: str
    created_at: datetime | None = None
    
    class Config:
        from_attributes = True

@router.post("", response_model=PatientResponseSchema, status_code=status.HTTP_201_CREATED)
def register_patient(
    patient_data: PatientCreateSchema,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(["Hospital", "Government"]))
):
    patient_repo = PatientRepository(db)
    
    # Check if health_id already exists
    existing = patient_repo.get_by_health_id(patient_data.health_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with Health ID {patient_data.health_id} is already registered."
        )

    # Business Validation via Domain Object
    patient_domain = PatientDomain(
        patient_id="",
        name=patient_data.name,
        age=patient_data.age,
        gender=patient_data.gender,
        health_id=patient_data.health_id
    )
    try:
        patient_domain.validate()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Save Patient to database with sequential PAT-xxx ID
    patient_count = db.query(PatientModel).count()
    while True:
        new_patient_id = f"PAT-{patient_count + 1:03d}"
        if not db.query(PatientModel).filter(PatientModel.patient_id == new_patient_id).first():
            break
        patient_count += 1

    new_patient = PatientModel(
        patient_id=new_patient_id,
        name=patient_data.name,
        age=patient_data.age,
        gender=patient_data.gender,
        health_id=patient_data.health_id
    )
    
    saved_patient = patient_repo.create(new_patient)
    return saved_patient

@router.get("/list", response_model=list[PatientResponseSchema])
def list_patients(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    patient_repo = PatientRepository(db)
    return patient_repo.list_all()

@router.get("/{patient_id}", response_model=PatientResponseSchema)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    patient_repo = PatientRepository(db)
    patient = patient_repo.get_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return patient

@router.get("/by-health-id/{health_id}", response_model=PatientResponseSchema)
def get_patient_by_health_id(
    health_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    patient_repo = PatientRepository(db)
    patient = patient_repo.get_by_health_id(health_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient with that Health ID not found"
        )
    return patient
