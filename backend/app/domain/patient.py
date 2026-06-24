class Patient:
    def __init__(self, patient_id: str, name: str, age: int, gender: str, health_id: str):
        self.patient_id = patient_id
        self.name = name
        self.age = age
        self.gender = gender
        self.health_id = health_id

    def validate(self):
        if not self.name or len(self.name.strip()) < 2:
            raise ValueError("Invalid patient name: must be at least 2 characters")
        if self.age < 0 or self.age > 120:
            raise ValueError("Invalid patient age: must be between 0 and 120")
        if self.gender not in ["Male", "Female", "Other"]:
            raise ValueError("Invalid gender: must be Male, Female, or Other")
        if not self.health_id or len(self.health_id.strip()) == 0:
            raise ValueError("Health ID is required")
