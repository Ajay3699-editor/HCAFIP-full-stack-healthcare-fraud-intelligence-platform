import sys
import os
from fastapi.testclient import TestClient

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def get_gov_token():
    # Attempt login as gov_admin
    response = client.post(
        "/api/auth/login",
        json={"username": "gov_admin", "password": "admin123"}
    )
    assert response.status_code == 200, "Login failed for gov_admin"
    data = response.json()
    return data["access_token"]

def test_dashboard_summary():
    token = get_gov_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/dashboard/summary", headers=headers)
    assert response.status_code == 200, "Failed to get dashboard summary"
    data = response.json()
    
    # Assert fields are present
    expected_fields = [
        "total_claims", "approved_claims", "rejected_claims", 
        "flagged_claims", "total_amount_claimed", 
        "total_amount_approved", "average_risk_score", "total_fraud_alerts"
    ]
    for field in expected_fields:
        assert field in data, f"{field} missing from summary response"
    
    # Assert type constraints
    assert isinstance(data["total_claims"], int)
    assert isinstance(data["total_amount_approved"], float)

def test_dashboard_analytics():
    token = get_gov_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/dashboard/analytics", headers=headers)
    assert response.status_code == 200, "Failed to get dashboard analytics"
    data = response.json()
    
    # Assert new analytics fields are present
    expected_fields = [
        "claims_by_month", "scheme_usage", "hospital_utilization", 
        "fraud_trends", "monthly_spending", "patient_growth", "fraud_analysis"
    ]
    for field in expected_fields:
        assert field in data, f"{field} missing from analytics response"
        
    # Check monthly spending list structure
    monthly_spending = data["monthly_spending"]
    assert isinstance(monthly_spending, list)
    if len(monthly_spending) > 0:
        item = monthly_spending[0]
        assert "month" in item
        assert "amount" in item
        
    # Check patient growth structure
    patient_growth = data["patient_growth"]
    assert isinstance(patient_growth, list)
    if len(patient_growth) > 0:
        item = patient_growth[0]
        assert "year" in item
        assert "count" in item
        
    # Check fraud analysis structure
    fraud_analysis = data["fraud_analysis"]
    assert "total_alerts" in fraud_analysis
    assert "total_blocked_amount" in fraud_analysis
    assert "risk_distribution" in fraud_analysis
    assert "fraud_rules" in fraud_analysis
    
    risk_distribution = fraud_analysis["risk_distribution"]
    assert isinstance(risk_distribution, list)
    for category in risk_distribution:
        assert "category" in category
        assert "count" in category
