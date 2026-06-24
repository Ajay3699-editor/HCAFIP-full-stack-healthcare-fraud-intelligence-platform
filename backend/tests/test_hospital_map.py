import sys
import os
from fastapi.testclient import TestClient

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def get_gov_token():
    response = client.post(
        "/api/auth/login",
        json={"username": "gov_admin", "password": "admin123"}
    )
    assert response.status_code == 200, "Login failed for gov_admin"
    data = response.json()
    return data["access_token"]

def test_hospital_map_endpoint():
    token = get_gov_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/dashboard/hospital-map", headers=headers)
    assert response.status_code == 200, "Failed to get hospital map data"
    data = response.json()
    
    # Check that data is a list and contains elements
    assert isinstance(data, list)
    assert len(data) > 0, "No hospital records returned in map list"
    
    # Validate structure of each hospital record
    expected_keys = [
        "hospital_id", "name", "type", "location", 
        "latitude", "longitude", "total_claims", 
        "approved_amount", "flagged_claims", 
        "blocked_amount", "average_risk_score"
    ]
    
    for hosp in data:
        for key in expected_keys:
            assert key in hosp, f"Expected key '{key}' missing from hospital map record"
        
        # Verify coordinates are floats and valid
        assert isinstance(hosp["latitude"], float)
        assert isinstance(hosp["longitude"], float)
        assert 20.0 < hosp["latitude"] < 35.0, "Latitude should be within sensible bounds for India center"
        assert 70.0 < hosp["longitude"] < 85.0, "Longitude should be within sensible bounds for India center"
        
        # Verify types
        assert isinstance(hosp["total_claims"], int)
        assert isinstance(hosp["flagged_claims"], int)
        assert isinstance(hosp["approved_amount"], (int, float))
        assert isinstance(hosp["blocked_amount"], (int, float))
        assert isinstance(hosp["average_risk_score"], (int, float))

def test_hospital_map_unauthorized():
    # Attempting to query without token should return 401
    response = client.get("/api/dashboard/hospital-map")
    assert response.status_code == 401
