# PhishShield AI

An AI-powered phishing detection system that analyzes emails, SMS, and URLs to protect users from cyber threats.

## Live Demos

- **Frontend App:** [FRONTEND_URL]
- **Backend API:** [BACKEND_URL]

## How it works

PhishShield AI uses an advanced machine learning pipeline to analyze text and URLs for phishing indicators. It extracts key security features and employs specialized binary classifiers for emails, SMS, and URLs. The system then calculates a comprehensive risk score and uses LIME explainability to provide human-readable insights into its decisions, showing precisely which words or URL features contributed to the classification.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, Scikit-learn, LIME
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Deployment:** Render (Backend), Vercel (Frontend), Docker

## Local Setup

### Backend

1. Navigate to the project root directory (`phishshield/`)
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
   The API will be available at `http://localhost:8000`.

### Frontend

1. Navigate to the frontend directory (`phishshield/frontend/`)
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The web app will be available at `http://localhost:5173`.
