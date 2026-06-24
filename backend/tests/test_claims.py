import sys
import os
from fastapi.testclient import TestClient

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def get_hosp_token():
    # Login as hosp_city
    response = client.post(
        "/api/auth/login",
        json={"username": "hosp_city", "password": "city123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

def test_claim_no_duplicate_surgery_rule_trigger():
    token = get_hosp_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Clean up prior claims for PAT-001 to prevent Rule 3/Rule 1/Rule 4 triggers from other test runs
    from app.infrastructure.database.connection import SessionLocal
    from app.infrastructure.database.models import ClaimModel, FraudAlertModel
    db = SessionLocal()
    try:
        db.query(FraudAlertModel).filter(FraudAlertModel.patient_id == "PAT-001").delete()
        db.query(ClaimModel).filter(ClaimModel.patient_id == "PAT-001").delete()
        db.commit()
    finally:
        db.close()

    # Submit a claim for PAT-001 for "Cataract Eye Surgery"
    # PAT-001's history contains MRI Brain Scan (20 days ago), which is in the 30-day window
    # But it does NOT contain Cataract Eye Surgery.
    # Therefore, Rule 2 should NOT trigger, and the claim should not be flagged under Rule 2.
    response = client.post(
        "/api/claims",
        json={
            "patient_id": "PAT-001",
            "scheme_id": "SCH-A",
            "amount": 500.0,
            "procedure": "Cataract Eye Surgery"
        },
        headers=headers
    )
    assert response.status_code == 201, f"Failed to submit claim: {response.text}"
    data = response.json()

    # Query fraud alerts from database for the created claim
    from app.infrastructure.database.connection import SessionLocal
    from app.infrastructure.database.models import FraudAlertModel
    db = SessionLocal()
    try:
        alert = db.query(FraudAlertModel).filter(FraudAlertModel.claim_id == data["claim_id"]).first()
        alert_reason = alert.reason if alert else "None"
    finally:
        db.close()

    # The claim should NOT be FLAGGED because there is no duplicate Cataract Eye Surgery in the last 30 days
    # Specifically, check if the status is APPROVED.
    assert data["status"] == "APPROVED", f"Expected APPROVED but got {data['status']}. ML Risk: {data['ml_risk_score']}%. Alert Reason: {alert_reason}"
