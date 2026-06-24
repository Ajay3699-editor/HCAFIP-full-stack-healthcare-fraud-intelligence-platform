class Scheme:
    def __init__(self, scheme_id: str, scheme_name: str, max_amount: float, max_attempts: int):
        self.scheme_id = scheme_id
        self.scheme_name = scheme_name
        self.max_amount = max_amount
        self.max_attempts = max_attempts

    def validate(self):
        if not self.scheme_name or len(self.scheme_name.strip()) == 0:
            raise ValueError("Scheme name is required")
        if self.max_amount <= 0:
            raise ValueError("Max amount must be greater than zero")
        if self.max_attempts <= 0:
            raise ValueError("Max attempts must be greater than zero")
