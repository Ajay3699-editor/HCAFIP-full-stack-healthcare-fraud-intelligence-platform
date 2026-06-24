<div align="center">

<!-- Banner GIF -->
<img src="https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/80728820-e06b-4f96-9c9e-9df46f0cc0a5" width="700" alt="HCAFIP Banner" />

# 🏥 HCAFIP
### Healthcare Claim Assurance & Fraud Intelligence Portal

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&pause=1000&color=00D4FF&center=true&vCenter=true&width=600&lines=AI-Powered+Healthcare+Fraud+Detection;Real-Time+Risk+Scoring+with+ML;Gemini+AI+Fraud+Investigation;Saving+Public+Money+and+Taxpayer+Funds" alt="Typing SVG" />

<br/>

<!-- Badges -->
[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://hcafip-full-stack-healthcare-fraud.vercel.app/)
[![Backend API](https://img.shields.io/badge/🔌_Backend_API-Render-46E3B7?style=for-the-badge&logo=render)](https://hcafip-full-stack-healthcare-fraud.onrender.com/docs)
[![GitHub Repo](https://img.shields.io/badge/⭐_Star_this_Repo-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/Ajay3699-editor/HCAFIP-full-stack-healthcare-fraud-intelligence-platform)

<br/>

<!-- Fun Badges -->
<img src="https://forthebadge.com/images/badges/built-with-love.svg" width="125" alt="built with love" /> &nbsp;
<img src="https://forthebadge.com/images/badges/built-with-swag.svg" width="125" alt="built with swag" /> &nbsp;
<img src="https://forthebadge.com/images/badges/open-source.svg" width="125" alt="open source" /> &nbsp;
<img src="https://forthebadge.com/images/badges/made-with-markdown.svg" width="180" alt="made with markdown" />

<br/>

<!-- Tech badges -->
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-CC2927?style=flat-square&logo=databricks&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)

</div>

---

## 💡 The Human Story: Why I Built HCAFIP

> *"Every single year, billions of rupees in public healthcare funds—hard-earned money paid by taxpayers, meant for the poorest citizens to receive life-saving surgeries and critical treatments—disappear into the black hole of healthcare fraud. Hospitals submit bills for procedures that never occurred. Patient identities are cloned to exhaust benefit balances. While corrupt parties get rich, honest citizens are denied care when they need it most."*

This is not just a corporate problem. It is a **human problem** that affects families, communities, and lives. 

As a developer, I wanted to build more than just another portfolio app. I wanted to build a **shield** for public funds. **HCAFIP** was born out of a desire to harness modern AI and Machine Learning to detect fraudulent insurance claims **in real time**, before the government money is disbursed. 

By building this, my goal is to show how technology can act as an automated guardian of public funds, ensuring every rupee goes exactly where it is needed: **saving lives.**

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212749171-b84692a8-2b04-4e3b-93ca-ac14705da224.gif" width="500" alt="Coding Vibe"/>
</div>

---

## 🎬 Project Walkthrough & Live Demo

> 📽️ **Watch the Full Video Walkthrough** — *See HCAFIP in action detecting fraud, scanning bills, and interacting with Gemini AI:*

[![Watch Demo](https://img.shields.io/badge/▶_Watch_Full_Demo_Video-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://hcafip-full-stack-healthcare-fraud.vercel.app/)

### 🔑 Try It Live Now:
The live application is fully seeded with demo data. Open the **[Live Demo](https://hcafip-full-stack-healthcare-fraud.vercel.app/)** and login using any of the roles below:

| Role | Username | Password | Purpose & Capabilities |
|---|---|---|---|
| 🏛️ **Government Admin** | `gov_admin` | `admin123` | High-level analytics, budget consumption maps, patient registry, claim approval/rejection |
| 🔍 **Fraud Investigator** | `investigator` | `intel123` | Interactive fraud queue, real-time alert triage, and **Gemini AI chatbot** for specific claim investigations |
| 🏥 **Hospital Provider** | `hosp_city` | `city123` | Submit claims, use **OCR Bill Scanning** to parse files, and view recent submissions |
| 👤 **Patient** | `patient_john` | `john123` | Track your active health scheme balances, check claim status, and ensure your identity isn't being misused |

---

## 🚀 Key Features

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" width="80" alt="Features"/>
</div>

### 🤖 Intelligent Fraud Detection
- **Machine Learning Risk Engine:** Every claim is analyzed by a scikit-learn model upon submission, producing a probability score (0-100) indicating the likelihood of fraud.
- **Rule-Based Flags:** Flags claims instantly for common red flags, such as duplicate procedures within a short period, exceeding maximum category limits, or mismatched patient records.
- **Google Gemini AI Assistant:** Integrated chat interface allowing fraud investigators to consult Gemini on complex claims. Gemini parses the claim data, compares historical patient files, and provides an explainable fraud report.

### 🧾 OCR Medical Bill Scanner
- Hospitals can simply upload a receipt or bill photo.
- The built-in OCR service (powered by Gemini Vision) extracts patient name, treatment type, cost, and dates, pre-filling the claim form automatically to eliminate manual errors and falsified text inputs.

### 📊 Real-Time Analytics & Dashboards
- **Dynamic Charts:** Displays monthly spend trends, category-wise distributions, fraud alert rates, and hospital rankings.
- **Scheme Utilization Tracking:** Monitors public health scheme balances in real-time, preventing over-drafting and leakage.

---

## 🏗️ Architecture Flow

```
                     ┌─────────────────────────────────────────┐
                     │            FRONTEND (Vercel)            │
                     │  React + Vite | Tailwind & Vanilla CSS  │
                     │  RBAC: Admin | Investigator | Hosp | Pat│
                     └────────────────────┬────────────────────┘
                                          │ HTTPS REST API + JWT
                     ┌────────────────────▼────────────────────┐
                     │            BACKEND (Render)             │
                     │ FastAPI | JWT Guard | Pandas Analytics  │
                     ├─────────────────────────────────────────┤
                     │   ML Model    │  Gemini AI   │   OCR    │
                     │ (Scikit-Learn)│ (google-genai) (Pillow) │
                     ├─────────────────────────────────────────┤
                     │             SQLAlchemy ORM              │
                     │         SQLite / PostgreSQL DB          │
                     └─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack & Moving Logos

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212257454-16e3712e-945a-4ca2-b238-408ad0bf87e6.gif" width="70" alt="HTML" />
<img src="https://user-images.githubusercontent.com/74038190/212257472-08e52665-c503-4bd9-aa20-f5a4dae769b5.gif" width="70" alt="CSS" />
<img src="https://user-images.githubusercontent.com/74038190/212257468-1e9a91f1-b626-4baa-b15d-5c385dfa7ed2.gif" width="70" alt="JS" />
<img src="https://user-images.githubusercontent.com/74038190/212257465-7ce8d493-cac5-494e-982a-5a9deb852c4b.gif" width="70" alt="React" />
<img src="https://user-images.githubusercontent.com/74038190/212257463-4d082cb4-7483-4eaf-bc25-6dde2628aabd.gif" width="70" alt="Git" />
<img src="https://user-images.githubusercontent.com/74038190/212257460-738ff738-247f-4445-a718-cdd0ca76e2db.gif" width="70" alt="Python" />
<img src="https://user-images.githubusercontent.com/74038190/212281756-450d3ffa-9335-4b98-a965-db8a18fee927.gif" width="70" alt="VSCode" />
</div>

| Layer | Component | Technologies Used |
|---|---|---|
| **Frontend** | User Interface | React 18, Vite, Lucide Icons, Custom CSS Variables |
| **Backend** | REST API Service | Python 3.11, FastAPI, Uvicorn |
| **Database** | Persistence & ORM | SQLAlchemy, SQLite (Development), PostgreSQL (Production) |
| **Intelligence** | Machine Learning | Scikit-Learn, Pandas, NumPy |
| **Generative AI** | Assistant & OCR | Google Gemini API (gemini-2.5-flash) |
| **Security** | Authentication | PyJWT, Passlib (BCrypt hashing) |

---

## ⚡ Step-by-Step Local Setup

Follow these steps to get HCAFIP running on your local machine:

### 1. Prerequisites
Ensure you have the following installed:
- Python 3.11+
- Node.js 18+
- A free **[Gemini API Key](https://aistudio.google.com/app/apikey)** from Google AI Studio.

### 2. Clone the Repository
```bash
git clone https://github.com/Ajay3699-editor/HCAFIP-full-stack-healthcare-fraud-intelligence-platform.git
cd HCAFIP-full-stack-healthcare-fraud-intelligence-platform
```

### 3. Configure and Launch Backend
```bash
cd backend

# Create and activate a Python virtual environment
python -m venv venv
venv\Scripts\activate        # On Windows
# source venv/bin/activate   # On Mac/Linux

# Install backend dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env       # On Windows
# cp .env.example .env       # On Mac/Linux
```
Open the newly created `.env` file and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_signing_secret_here
```
Now, start the backend server:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
> The API will be live at: **http://127.0.0.1:8001**  
> View interactive API docs at: **http://127.0.0.1:8001/docs**

### 4. Configure and Launch Frontend
Open a new terminal window at the project root directory:
```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
> The React app will start at: **http://localhost:5173**

---

## 🔭 Future Scope: Taking HCAFIP to the Next Level

This platform was built to serve as a rock-solid, production-grade foundation. For students, contributors, or engineers looking to take this to a real-world enterprise deployment, here is the roadmap:

- 🔒 **Aadhaar / Identity Verification Integration:** Add multi-factor authentication linking patient logins to official government IDs (e.g., Aadhaar, DigiLocker) to prevent medical identity theft.
- 🔗 **Blockchain Audit Trail:** Log all claim approval and rejection events onto an immutable blockchain ledger (like Hyperledger Fabric), ensuring government auditors can trust every decision history.
- 🗺️ **Geographic Heatmaps:** Implement a Leaflet or Google Maps dashboard view highlighting clusters of high-risk claims, pinpointing specific hospitals committing systematic geographic fraud.
- 📊 **Big Data Pipelines:** Upgrade the backend database from SQLite to PostgreSQL and build Apache Spark/Kafka pipelines to scan millions of claims per second.
- 🇮🇳 **Multi-Lingual support:** Localize the portal in Hindi, Telugu, Tamil, and other regional languages to make it accessible to local administrative bodies.

---

## 🧪 Run Tests
Keep the code robust by running the automated pytest suite:
```bash
cd backend
pytest tests/ -v
```

---

<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="700" alt="fading line" />

### Built with passion to protect government healthcare funds 💙
*"The best code you can write is code that makes the world a little more honest."*

<br>

<img src="https://user-images.githubusercontent.com/74038190/212284136-03988914-d899-44b4-b1d9-4eeccf656e44.gif" width="180" alt="dino" />

<br>

**If this project inspired you or helped you, please give it a ⭐ star!**

[![GitHub stars](https://img.shields.io/github/stars/Ajay3699-editor/HCAFIP-full-stack-healthcare-fraud-intelligence-platform?style=social)](https://github.com/Ajay3699-editor/HCAFIP-full-stack-healthcare-fraud-intelligence-platform)

</div>
