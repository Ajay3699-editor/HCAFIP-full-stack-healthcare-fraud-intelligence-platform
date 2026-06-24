from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.models import UserModel, PatientModel
from app.infrastructure.repositories.user_repository import UserRepository
from app.api.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: str = Field(..., description="Patient, Hospital, Government, Investigator")
    associated_id: str | None = Field(default=None, description="Linked patient_id or hospital_id if applicable")
    patient_name: str | None = None
    patient_age: int | None = None
    patient_gender: str | None = None
    patient_health_id: str | None = None

class UserLoginSchema(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    associated_id: str | None

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegisterSchema, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    
    # Check if role is valid
    if user_data.role not in ["Patient", "Hospital", "Government", "Investigator"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be Patient, Hospital, Government, or Investigator"
        )
        
    # Check if username exists
    existing_user = user_repo.get_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    associated_id = user_data.associated_id

    # If it is a Patient, ignore input associated_id and map/create via patient_health_id
    if user_data.role == "Patient":
        if not user_data.patient_health_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Government Health ID (Healthcard) is required for Patient registration."
            )
        
        # Check if patient with health_id already exists in the registry
        existing_patient = db.query(PatientModel).filter(PatientModel.health_id == user_data.patient_health_id).first()
        if existing_patient:
            # Check if this patient registry record is already linked to a user account
            existing_user_link = db.query(UserModel).filter(UserModel.associated_id == existing_patient.patient_id).first()
            if existing_user_link:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A user account is already linked to Health ID {user_data.patient_health_id}."
                )
            associated_id = existing_patient.patient_id
        else:
            # Auto-create new Patient profile with sequential PAT-xxx ID
            patient_count = db.query(PatientModel).count()
            while True:
                new_patient_id = f"PAT-{patient_count + 1:03d}"
                if not db.query(PatientModel).filter(PatientModel.patient_id == new_patient_id).first():
                    break
                patient_count += 1
                
            new_patient = PatientModel(
                patient_id=new_patient_id,
                name=user_data.patient_name or user_data.username,
                age=user_data.patient_age if user_data.patient_age is not None else 30,
                gender=user_data.patient_gender or "Male",
                health_id=user_data.patient_health_id
            )
            db.add(new_patient)
            db.commit()
            associated_id = new_patient_id

    # Create new user
    new_user = UserModel(
        user_id=str(uuid.uuid4()),
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        associated_id=associated_id
    )
    
    user_repo.create(new_user)
    
    # Generate token
    token_payload = {
        "sub": new_user.username,
        "role": new_user.role,
        "associated_id": new_user.associated_id
    }
    token = create_access_token(data=token_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": new_user.username,
        "role": new_user.role,
        "associated_id": new_user.associated_id
    }

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLoginSchema, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(user_data.username)
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    # Generate token
    token_payload = {
        "sub": user.username,
        "role": user.role,
        "associated_id": user.associated_id
    }
    token = create_access_token(data=token_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "associated_id": user.associated_id
    }

# Swagger-compatible login endpoint for FastAPI /docs OAuth2 Flow
@router.post("/oauth2-login")
def oauth2_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    token_payload = {
        "sub": user.username,
        "role": user.role,
        "associated_id": user.associated_id
    }
    token = create_access_token(data=token_payload)
    
    return {"access_token": token, "token_type": "bearer"}
