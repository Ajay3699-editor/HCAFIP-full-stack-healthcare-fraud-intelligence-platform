import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.infrastructure.database.connection import engine, SessionLocal
from app.infrastructure.database.models import (
    Base, UserModel, PatientModel, HospitalModel, SchemeModel, TreatmentModel, ClaimModel, FraudAlertModel
)
from app.api.security import hash_password
from app.api.auth_routes import router as auth_router
from app.api.patient_routes import router as patient_router
from app.api.treatment_routes import router as treatment_router
from app.api.claim_routes import router as claim_router
from app.api.fraud_routes import router as fraud_router
from app.api.dashboard_routes import router as dashboard_router

# Configure Python logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("health-benefit-platform")

app = FastAPI(
    title="Healthcare Claim Assurance & Fraud Intelligence Portal (HCAFIP)",
    description="Centralized API for verifying benefits, tracking treatment history, and detecting fraudulent claims.",
    version="1.0.0"
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Latency Measurement Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.6f}"
    logger.info(f"Latency log - {request.method} {request.url.path} finished in {process_time * 1000:.2f}ms")
    return response

# Include API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(patient_router, prefix="/api")
app.include_router(treatment_router, prefix="/api")
app.include_router(claim_router, prefix="/api")
app.include_router(fraud_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

@app.get("/health", tags=["Health Check"])
def health_check():
    """Phase 1 deliverable: Simple API health check."""
    return {"status": "running"}

def seed_db():
    """Seeds default schemes, hospitals, patients, users, treatments, and claims if empty."""
    db: Session = SessionLocal()
    try:
        # 1. Schemes
        if db.query(SchemeModel).count() == 0:
            logger.info("Seeding benefit schemes...")
            schemes = [
                SchemeModel(scheme_id="SCH-A", scheme_name="Standard Coverage (Standard Shield)", max_amount=5000.0, max_attempts=5),
                SchemeModel(scheme_id="SCH-B", scheme_name="Senior Citizens Benefit Plan", max_amount=15000.0, max_attempts=8),
                SchemeModel(scheme_id="SCH-C", scheme_name="Critical Care & Cardiac Shield", max_amount=50000.0, max_attempts=3),
            ]
            db.add_all(schemes)
            db.commit()

        # 2. Hospitals
        if db.query(HospitalModel).count() == 0:
            logger.info("Seeding hospitals...")
            hospitals = [
                HospitalModel(hospital_id="HOSP-001", name="City Central General Hospital", type="Public", location="Downtown Sector 4"),
                HospitalModel(hospital_id="HOSP-002", name="St. Jude Cardiac Institute", type="Private", location="Medical Center Blvd"),
                HospitalModel(hospital_id="HOSP-003", name="Metro Children's Specialty Care", type="Semi-Specialty", location="North Wing Avenue"),
            ]
            db.add_all(hospitals)
            db.commit()

        # 3. Patients
        if db.query(PatientModel).count() == 0:
            logger.info("Seeding patient registry...")
            patients = [
                PatientModel(patient_id="PAT-001", name="John Doe", age=35, gender="Male", health_id="HID-100200300"),
                PatientModel(patient_id="PAT-002", name="Jane Smith", age=68, gender="Female", health_id="HID-400500600"),
                PatientModel(patient_id="PAT-003", name="Bob Johnson", age=45, gender="Male", health_id="HID-700800900"),
                PatientModel(
                    patient_id="PAT-004", 
                    name="Alice Williams", 
                    age=65, 
                    gender="Female", 
                    health_id="HID-800900100", 
                    created_at=datetime(2020, 5, 15)
                ),
            ]
            db.add_all(patients)
            db.commit()

        # 4. Users (Authentication login credentials)
        if db.query(UserModel).count() == 0:
            logger.info("Seeding users login credentials...")
            users = [
                # Admin/Government
                UserModel(user_id=str(uuid.uuid4()), username="gov_admin", password_hash=hash_password("admin123"), role="Government"),
                # Investigator
                UserModel(user_id=str(uuid.uuid4()), username="investigator", password_hash=hash_password("intel123"), role="Investigator"),
                # Hospitals
                UserModel(user_id=str(uuid.uuid4()), username="hosp_city", password_hash=hash_password("city123"), role="Hospital", associated_id="HOSP-001"),
                UserModel(user_id=str(uuid.uuid4()), username="hosp_jude", password_hash=hash_password("jude123"), role="Hospital", associated_id="HOSP-002"),
                # Patients
                UserModel(user_id=str(uuid.uuid4()), username="patient_john", password_hash=hash_password("john123"), role="Patient", associated_id="PAT-001"),
                UserModel(user_id=str(uuid.uuid4()), username="patient_jane", password_hash=hash_password("jane123"), role="Patient", associated_id="PAT-002"),
                UserModel(user_id=str(uuid.uuid4()), username="patient_alice", password_hash=hash_password("alice123"), role="Patient", associated_id="PAT-004"),
            ]
            db.add_all(users)
            db.commit()

        # 5. Treatments (Medical History)
        if db.query(TreatmentModel).count() == 0:
            logger.info("Seeding initial treatment histories...")
            t1 = TreatmentModel(
                treatment_id="TRT-001",
                patient_id="PAT-001",
                hospital_id="HOSP-001",
                date=datetime.utcnow() - timedelta(days=45),
                procedure="General Consultation & Labs",
                cost=250.0
            )
            t2 = TreatmentModel(
                treatment_id="TRT-002",
                patient_id="PAT-001",
                hospital_id="HOSP-002",
                date=datetime.utcnow() - timedelta(days=20),
                procedure="MRI Brain Scan",
                cost=1200.0
            )
            # Patient 2 (Senior Citizen, multiple treatments, suspect duplicate surgery)
            t3 = TreatmentModel(
                treatment_id="TRT-003",
                patient_id="PAT-002",
                hospital_id="HOSP-001",
                date=datetime.utcnow() - timedelta(days=10),
                procedure="Cataract Eye Surgery",
                cost=3200.0
            )
            # Repeated Cataract surgery within 10 days (Suspicious surgery repeat!)
            t4 = TreatmentModel(
                treatment_id="TRT-004",
                patient_id="PAT-002",
                hospital_id="HOSP-002",
                date=datetime.utcnow() - timedelta(days=2),
                procedure="Cataract Eye Surgery",
                cost=3200.0
            )
            t5 = TreatmentModel(
                treatment_id="TRT-005",
                patient_id="PAT-004",
                hospital_id="HOSP-001",
                date=datetime(2020, 6, 12),
                procedure="Knee Joint Replacement",
                cost=4500.0
            )
            db.add_all([t1, t2, t3, t4, t5])
            db.commit()

        # 6. Claims & Fraud alerts
        if db.query(ClaimModel).count() == 0:
            logger.info("Seeding initial claim entries...")
            
            # Normal claims
            c1 = ClaimModel(
                claim_id="CLM-001",
                patient_id="PAT-001",
                scheme_id="SCH-A",
                hospital_id="HOSP-001",
                amount=250.0,
                procedure="General Consultation & Labs",
                status="APPROVED",
                ml_risk_score=12.5,
                fraud_checked=2,
                created_at=datetime.utcnow() - timedelta(days=45)
            )
            c2 = ClaimModel(
                claim_id="CLM-002",
                patient_id="PAT-001",
                scheme_id="SCH-A",
                hospital_id="HOSP-002",
                amount=1200.0,
                procedure="MRI Brain Scan",
                status="APPROVED",
                ml_risk_score=15.2,
                fraud_checked=2,
                created_at=datetime.utcnow() - timedelta(days=20)
            )
            
            # Flagged claim (Duplicate Cataract surgery)
            c3 = ClaimModel(
                claim_id="CLM-003",
                patient_id="PAT-002",
                scheme_id="SCH-B",
                hospital_id="HOSP-001",
                amount=3200.0,
                procedure="Cataract Eye Surgery",
                status="APPROVED",
                ml_risk_score=14.0,
                fraud_checked=2,
                created_at=datetime.utcnow() - timedelta(days=10)
            )
            # Second Cataract claim flagged
            c4 = ClaimModel(
                claim_id="CLM-004",
                patient_id="PAT-002",
                scheme_id="SCH-B",
                hospital_id="HOSP-002",
                amount=3200.0,
                procedure="Cataract Eye Surgery",
                status="FLAGGED",
                ml_risk_score=75.5,
                fraud_checked=2,
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            c5 = ClaimModel(
                claim_id="CLM-005",
                patient_id="PAT-004",
                scheme_id="SCH-B",
                hospital_id="HOSP-001",
                amount=4500.0,
                procedure="Knee Joint Replacement",
                status="APPROVED",
                ml_risk_score=8.5,
                fraud_checked=2,
                created_at=datetime(2020, 6, 12)
            )
            claims_to_add = [c1, c2, c3, c4, c5]
            alerts_to_add = []
            
            # Existing first alert for CLM-004
            alert = FraudAlertModel(
                alert_id="ALT-001",
                patient_id="PAT-002",
                claim_id="CLM-004",
                risk_score=75.5,
                reason="Rule 2 triggered: Patient underwent duplicate surgery 'Cataract Eye Surgery' within 30 days.",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            alerts_to_add.append(alert)
            
            # Seed 15 additional FLAGGED claims and alerts to show "16 fraud cases"
            flagged_procedures = [
                ("MRI Brain Scan", "Rule 2 triggered: Patient underwent duplicate surgery 'MRI Brain Scan' within 30 days."),
                ("Knee Joint Replacement", "Rule 4 triggered: Requested amount exceeds scheme limit."),
                ("Cataract Eye Surgery", "Rule 2 triggered: Patient underwent duplicate surgery 'Cataract Eye Surgery' within 30 days."),
                ("General Consultation & Labs", "Rule 3 triggered: Multiple claims submitted on the same date.")
            ]
            
            for i in range(1, 16):
                c_id = f"CLM-F{i:03d}"
                pat_id = f"PAT-00{1 if i % 2 == 0 else 2 if i % 3 == 0 else 4}"
                sch_id = "SCH-B" if i % 2 == 0 else "SCH-A"
                hosp_id = f"HOSP-00{1 if i % 3 == 0 else 2}"
                amt = 850.0 + (i * 150.0)
                proc, reason = flagged_procedures[i % len(flagged_procedures)]
                
                # Flagged Claim
                fc = ClaimModel(
                    claim_id=c_id,
                    patient_id=pat_id,
                    scheme_id=sch_id,
                    hospital_id=hosp_id,
                    amount=amt,
                    procedure=proc,
                    status="FLAGGED",
                    ml_risk_score=60.0 + (i * 2.0),
                    fraud_checked=2,
                    created_at=datetime.utcnow() - timedelta(days=3 + i)
                )
                claims_to_add.append(fc)
                
                # Fraud Alert
                fa = FraudAlertModel(
                    alert_id=f"ALT-F{i:03d}",
                    patient_id=pat_id,
                    claim_id=c_id,
                    risk_score=60.0 + (i * 2.0),
                    reason=reason,
                    created_at=datetime.utcnow() - timedelta(days=3 + i)
                )
                alerts_to_add.append(fa)
                
            db.add_all(claims_to_add)
            db.commit()
            
            db.add_all(alerts_to_add)
            db.commit()

        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during seeding database: {e}")
        db.rollback()
    finally:
        db.close()

# Initialize DB tables and seed data on startup
@app.on_event("startup")
def on_startup():
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    seed_db()
