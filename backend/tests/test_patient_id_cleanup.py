import sys
import os
import uuid
from fastapi.testclient import TestClient

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.infrastructure.database.connection import SessionLocal
from app.infrastructure.database.models import PatientModel, UserModel

client = TestClient(app)

def test_sequential_patient_id_generation_from_patient_route():
    # Login as gov_admin to get token
    login_response = client.post(
        "/api/auth/login",
        json={"username": "gov_admin", "password": "admin123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Register a new patient via /patients
    health_id = f"HID-{uuid.uuid4().hex[:9].upper()}"
    response = client.post(
        "/api/patients",
        json={
            "name": "Sequential Test Patient",
            "age": 30,
            "gender": "Male",
            "health_id": health_id
        },
        headers=headers
    )
    assert response.status_code == 201
    data = response.json()
    
    # Assert patient_id starts with PAT- and is sequential
    assert data["patient_id"].startswith("PAT-")
    assert len(data["patient_id"]) == 7  # e.g., PAT-005 or PAT-006

    # Clean up
    db = SessionLocal()
    try:
        db.query(PatientModel).filter(PatientModel.patient_id == data["patient_id"]).delete()
        db.commit()
    finally:
        db.close()


def test_user_registration_auto_links_existing_patient_by_health_id():
    # We use a seeded patient: Bob Johnson, PAT-003, health_id = HID-700800900
    # Bob Johnson currently has no associated user in UserModel (only john, jane, alice have users in seeding)
    db = SessionLocal()
    try:
        # Check that Bob exists
        bob = db.query(PatientModel).filter(PatientModel.patient_id == "PAT-003").first()
        assert bob is not None
        # Check that Bob is not already associated to any user
        user_link = db.query(UserModel).filter(UserModel.associated_id == "PAT-003").first()
        assert user_link is None
    finally:
        db.close()

    # Register a user and supply Bob's Health ID
    reg_username = f"bob_user_{uuid.uuid4().hex[:6]}"
    response = client.post(
        "/api/auth/register",
        json={
            "username": reg_username,
            "password": "password123",
            "role": "Patient",
            "patient_name": "Bob Johnson",
            "patient_age": 45,
            "patient_gender": "Male",
            "patient_health_id": "HID-700800900"
        }
    )
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    assert data["associated_id"] == "PAT-003"  # Linked to existing Bob Johnson!

    # Clean up user
    db = SessionLocal()
    try:
        db.query(UserModel).filter(UserModel.username == reg_username).delete()
        db.commit()
    finally:
        db.close()


def test_user_registration_creates_new_patient_profile_if_health_id_not_found():
    db = SessionLocal()
    initial_count = db.query(PatientModel).count()
    db.close()

    # Register a new patient
    new_username = f"new_pat_user_{uuid.uuid4().hex[:6]}"
    health_id = f"HID-NEW-{uuid.uuid4().hex[:6].upper()}"
    response = client.post(
        "/api/auth/register",
        json={
            "username": new_username,
            "password": "password123",
            "role": "Patient",
            "patient_name": "New Test Patient Profile",
            "patient_age": 28,
            "patient_gender": "Female",
            "patient_health_id": health_id
        }
    )
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    
    # Assert a new PAT-xxx ID was assigned
    new_associated_id = data["associated_id"]
    assert new_associated_id.startswith("PAT-")

    db = SessionLocal()
    try:
        # Assert database count increased
        new_count = db.query(PatientModel).count()
        assert new_count == initial_count + 1

        # Assert patient was created correctly
        created_pat = db.query(PatientModel).filter(PatientModel.patient_id == new_associated_id).first()
        assert created_pat is not None
        assert created_pat.health_id == health_id
        assert created_pat.name == "New Test Patient Profile"

        # Clean up both patient and user
        db.query(UserModel).filter(UserModel.username == new_username).delete()
        db.query(PatientModel).filter(PatientModel.patient_id == new_associated_id).delete()
        db.commit()
    finally:
        db.close()


def test_user_registration_blocks_duplicate_user_mapping_for_same_health_id():
    # Seed a temporary user associated with PAT-003 to simulate it already being mapped
    db = SessionLocal()
    temp_user = UserModel(
        user_id="temp-user-id-123",
        username="temp_mapped_bob",
        password_hash="dummy_hash",
        role="Patient",
        associated_id="PAT-003"
    )
    db.add(temp_user)
    db.commit()
    db.close()

    try:
        # Attempt to register another user with Bob's Health ID
        response = client.post(
            "/api/auth/register",
            json={
                "username": f"another_bob_user_{uuid.uuid4().hex[:6]}",
                "password": "password123",
                "role": "Patient",
                "patient_name": "Bob Johnson",
                "patient_age": 45,
                "patient_gender": "Male",
                "patient_health_id": "HID-700800900"
            }
        )
        assert response.status_code == 400
        assert "already linked" in response.json()["detail"]
    finally:
        # Clean up
        db = SessionLocal()
        db.query(UserModel).filter(UserModel.user_id == "temp-user-id-123").delete()
        db.commit()
        db.close()
