import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.infrastructure.database.models import ClaimModel, TreatmentModel, PatientModel, HospitalModel

MODEL_PATH = os.path.join(os.path.dirname(__file__), "fraud_classifier.joblib")

class MLService:
    def __init__(self):
        self.model = None
        self._load_or_train_initial()

    def _load_or_train_initial(self):
        """Loads the model if it exists, otherwise trains a new one with synthetic data."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception:
                pass
        
        # Train model with synthetic training data
        self.retrain_model()

    def retrain_model(self):
        """Generates synthetic dataset and trains the RandomForest model."""
        np.random.seed(42)
        n_samples = 1000

        # Features: claim_frequency (last 90d), hospital_count (last 90d), procedure_repetition, amount_claimed, age
        # Targets: 0 (Normal), 1 (Fraudulent)
        
        # Normal class
        normal_freq = np.random.poisson(lam=1.5, size=int(n_samples * 0.85)) + 1
        normal_hosp = np.random.poisson(lam=1.1, size=int(n_samples * 0.85)) + 1
        normal_hosp = np.minimum(normal_freq, normal_hosp) # hospital count cannot exceed claim count
        normal_proc_rep = np.random.poisson(lam=0.2, size=int(n_samples * 0.85))
        normal_amount = np.random.exponential(scale=1200.0, size=int(n_samples * 0.85)) + 100
        normal_age = np.random.normal(loc=42, scale=15, size=int(n_samples * 0.85))
        normal_age = np.clip(normal_age, 0, 95)
        
        # Fraud class (abusive behavior)
        fraud_freq = np.random.poisson(lam=6.0, size=int(n_samples * 0.15)) + 2
        fraud_hosp = np.random.poisson(lam=4.5, size=int(n_samples * 0.15)) + 1
        fraud_hosp = np.minimum(fraud_freq, fraud_hosp)
        fraud_proc_rep = np.random.poisson(lam=3.0, size=int(n_samples * 0.15)) + 1
        fraud_amount = np.random.exponential(scale=5000.0, size=int(n_samples * 0.15)) + 1000
        fraud_age = np.random.normal(loc=55, scale=12, size=int(n_samples * 0.15))
        fraud_age = np.clip(fraud_age, 0, 95)

        X_normal = np.column_stack((normal_freq, normal_hosp, normal_proc_rep, normal_amount, normal_age))
        X_fraud = np.column_stack((fraud_freq, fraud_hosp, fraud_proc_rep, fraud_amount, fraud_age))
        
        X = np.vstack((X_normal, X_fraud))
        y = np.array([0] * len(X_normal) + [1] * len(X_fraud))

        # Train Random Forest
        clf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8)
        clf.fit(X, y)
        
        # Save model
        joblib.dump(clf, MODEL_PATH)
        self.model = clf

    def extract_features(self, patient_id: str, hospital_id: str, procedure: str, amount: float, age: int, db: Session) -> np.ndarray:
        """Extracts claims frequency, hospital hops, procedure repeats for the patient from database records."""
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # 1. Claim frequency in last 90 days
        claim_freq = db.query(ClaimModel).filter(
            ClaimModel.patient_id == patient_id,
            ClaimModel.created_at >= ninety_days_ago,
            ClaimModel.status != "REJECTED"
        ).count()
        # Include current claim
        claim_freq += 1

        # 2. Distinct hospitals visited in claims & treatments last 90 days
        hosp_ids_claims = db.query(ClaimModel.hospital_id).filter(
            ClaimModel.patient_id == patient_id,
            ClaimModel.created_at >= ninety_days_ago,
            ClaimModel.status != "REJECTED"
        ).distinct()

        hosp_ids_treatments = db.query(TreatmentModel.hospital_id).filter(
            TreatmentModel.patient_id == patient_id,
            TreatmentModel.date >= ninety_days_ago
        ).distinct()

        hospitals_visited = set([h[0] for h in hosp_ids_claims.all()] + [t[0] for t in hosp_ids_treatments.all()] + [hospital_id])
        hosp_count = len(hospitals_visited)

        # 3. Procedure repetition: how many times has patient had this specific procedure?
        proc_clean = procedure.strip().lower()
        proc_repeats = db.query(TreatmentModel).filter(
            TreatmentModel.patient_id == patient_id,
            func.lower(TreatmentModel.procedure) == proc_clean
        ).count()

        features = np.array([[claim_freq, hosp_count, proc_repeats, amount, age]], dtype=float)
        return features

    def predict_risk(self, patient_id: str, hospital_id: str, procedure: str, amount: float, age: int, db: Session) -> float:
        """Predicts risk score (0-100) based on features."""
        if not self.model:
            return 10.0 # fallback default

        features = self.extract_features(patient_id, hospital_id, procedure, amount, age, db)
        
        # Predict probability of fraud (class 1)
        prob = self.model.predict_proba(features)[0][1]
        risk_score = float(prob * 100.0)
        return round(risk_score, 2)
