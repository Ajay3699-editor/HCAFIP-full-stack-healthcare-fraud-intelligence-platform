from datetime import datetime

class Treatment:
    def __init__(self, treatment_id: str, patient_id: str, hospital_id: str, date: datetime, procedure: str, cost: float):
        self.treatment_id = treatment_id
        self.patient_id = patient_id
        self.hospital_id = hospital_id
        self.date = date
        self.procedure = procedure
        self.cost = cost

    def validate(self):
        if not self.patient_id:
            raise ValueError("Patient ID is required")
        if not self.hospital_id:
            raise ValueError("Hospital ID is required")
        if not self.procedure or len(self.procedure.strip()) == 0:
            raise ValueError("Procedure description is required")
        if self.cost < 0:
            raise ValueError("Treatment cost cannot be negative")
        if not isinstance(self.date, datetime):
            raise ValueError("Invalid date: must be a datetime object")
