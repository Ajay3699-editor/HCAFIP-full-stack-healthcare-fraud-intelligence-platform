class Claim:
    def __init__(self, claim_id: str, patient_id: str, scheme_id: str, amount: float, status: str = "PENDING"):
        self.claim_id = claim_id
        self.patient_id = patient_id
        self.scheme_id = scheme_id
        self.amount = amount
        self.status = status

    def validate(self):
        if not self.patient_id:
            raise ValueError("Patient ID is required")
        if not self.scheme_id:
            raise ValueError("Scheme ID is required")
        if self.amount <= 0:
            raise ValueError("Claim amount must be greater than zero")
        if self.status not in ["PENDING", "APPROVED", "REJECTED", "FLAGGED"]:
            raise ValueError("Invalid claim status: must be PENDING, APPROVED, REJECTED, or FLAGGED")
