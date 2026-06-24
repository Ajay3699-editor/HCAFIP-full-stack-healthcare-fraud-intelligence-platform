from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"
    
    user_id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # Patient, Hospital, Government, Investigator
    associated_id = Column(String(50), nullable=True)  # link to patient_id or hospital_id
    created_at = Column(DateTime, default=datetime.utcnow)

class PatientModel(Base):
    __tablename__ = "patients"
    
    patient_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    health_id = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    treatments = relationship("TreatmentModel", back_populates="patient", cascade="all, delete-orphan")
    claims = relationship("ClaimModel", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("FraudAlertModel", back_populates="patient", cascade="all, delete-orphan")

class HospitalModel(Base):
    __tablename__ = "hospitals"
    
    hospital_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # Public, Private, Semi-Specialty, etc.
    location = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    treatments = relationship("TreatmentModel", back_populates="hospital", cascade="all, delete-orphan")
    claims = relationship("ClaimModel", back_populates="hospital", cascade="all, delete-orphan")

class SchemeModel(Base):
    __tablename__ = "schemes"
    
    scheme_id = Column(String(50), primary_key=True)
    scheme_name = Column(String(100), nullable=False)
    max_amount = Column(Float, nullable=False)
    max_attempts = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    claims = relationship("ClaimModel", back_populates="scheme", cascade="all, delete-orphan")

class TreatmentModel(Base):
    __tablename__ = "treatments"
    
    treatment_id = Column(String(50), primary_key=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False)
    hospital_id = Column(String(50), ForeignKey("hospitals.hospital_id"), nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    procedure = Column(String(255), nullable=False)
    cost = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientModel", back_populates="treatments")
    hospital = relationship("HospitalModel", back_populates="treatments")

class ClaimModel(Base):
    __tablename__ = "claims"
    
    claim_id = Column(String(50), primary_key=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False)
    scheme_id = Column(String(50), ForeignKey("schemes.scheme_id"), nullable=False)
    hospital_id = Column(String(50), ForeignKey("hospitals.hospital_id"), nullable=False)
    amount = Column(Float, nullable=False)
    procedure = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, FLAGGED
    ml_risk_score = Column(Float, default=0.0)
    fraud_checked = Column(Integer, default=0) # 0 = not checked, 1 = rules checked, 2 = all checked
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientModel", back_populates="claims")
    scheme = relationship("SchemeModel", back_populates="claims")
    hospital = relationship("HospitalModel", back_populates="claims")
    alerts = relationship("FraudAlertModel", back_populates="claim", cascade="all, delete-orphan")

class FraudAlertModel(Base):
    __tablename__ = "fraud_alerts"
    
    alert_id = Column(String(50), primary_key=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False)
    claim_id = Column(String(50), ForeignKey("claims.claim_id"), nullable=True)
    risk_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientModel", back_populates="alerts")
    claim = relationship("ClaimModel", back_populates="alerts")
