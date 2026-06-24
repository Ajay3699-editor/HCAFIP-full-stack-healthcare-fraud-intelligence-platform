import os
import re
import io
import json
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# We check if google-genai can be imported
try:
    from google import genai
    from google.genai import types
    HAS_GEMINI_SDK = True
except ImportError:
    HAS_GEMINI_SDK = False

class OCRService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.gemini_key and HAS_GEMINI_SDK:
            try:
                self.client = genai.Client(api_key=self.gemini_key)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")

    def extract_medical_info(self, file_bytes: bytes, filename: str) -> dict:
        """
        Attempts to extract Patient Name, Procedure, and Cost from an uploaded bill/prescription.
        Method resolution order:
        1. Gemini Vision LLM (if key and SDK are available)
        2. Filename parser fallback: Name_Procedure_Cost.jpg/png for easy developer testing
        3. Local Tesseract OCR (if installed)
        4. Mock fallback values
        """
        # Default stubs
        result = {
            "patient_name": "Jane Doe",
            "procedure": "Bypass Surgery",
            "cost": 4500.0,
            "method": "mock_default"
        }

        # 1. Try Gemini Vision API if key is present
        if self.client:
            try:
                image = Image.open(io.BytesIO(file_bytes))
                prompt = (
                    "Analyze the attached medical bill/receipt/discharge summary. "
                    "Extract the following three fields and return ONLY a raw JSON string: "
                    "{\n"
                    '  "patient_name": "Patient Name (string)",\n'
                    '  "procedure": "Procedure/Surgery/Treatment name (string)",\n'
                    '  "cost": 0.0 (float)\n'
                    "}\n"
                    "Do not add markdown formatting or code blocks around the JSON. If a value is missing, infer a sensible value."
                )

                # Send image and prompt to Gemini
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[image, prompt]
                )
                
                text = response.text.strip()
                # Strip markdown code fencing if Gemini includes it
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n|```$", "", text, flags=re.MULTILINE).strip()

                data = json.loads(text)
                
                extracted_name = data.get("patient_name", "").strip()
                extracted_proc = data.get("procedure", "").strip()
                extracted_cost = data.get("cost")

                if extracted_name:
                    result["patient_name"] = extracted_name
                if extracted_proc:
                    result["procedure"] = extracted_proc
                if extracted_cost is not None:
                    try:
                        result["cost"] = float(extracted_cost)
                    except ValueError:
                        pass
                
                result["method"] = "gemini_llm_ocr"
                return result
            except Exception as e:
                print(f"Gemini OCR extraction failed, trying filename fallback. Error: {e}")

        # 2. Filename Metadata Parser (Useful for testing without API keys)
        # Format: Jane-Doe_Appendectomy_1200.jpg
        try:
            base_name = os.path.splitext(filename)[0]
            parts = base_name.split("_")
            if len(parts) >= 3:
                name_part = parts[0].replace("-", " ").title()
                proc_part = parts[1].replace("-", " ").title()
                cost_part = float(parts[2])
                
                result["patient_name"] = name_part
                result["procedure"] = proc_part
                result["cost"] = cost_part
                result["method"] = "filename_metadata_parser"
                return result
        except Exception:
            pass

        # 3. Local Pytesseract Fallback
        try:
            import pytesseract
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            
            # Parse cost
            cost_match = re.search(r"(?:total|amount|cost|due|charge)[:\s]*\$?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
            if cost_match:
                try:
                    result["cost"] = float(cost_match.group(1).replace(",", ""))
                except ValueError:
                    pass

            # Parse procedure
            procedures = ["appendectomy", "chemotherapy", "mri scan", "ct scan", "bypass surgery", "cataract surgery", "dialysis", "consultation", "dental extraction"]
            for p in procedures:
                if p in text.lower():
                    result["procedure"] = p.title()
                    break

            # Parse patient name
            name_match = re.search(r"patient\s*(?:name)?[:\s]+([a-zA-Z\s]+)", text, re.IGNORECASE)
            if name_match:
                result["patient_name"] = name_match.group(1).strip().split("\n")[0]
            
            result["method"] = "pytesseract_local"
            return result
        except Exception:
            pass

        return result
