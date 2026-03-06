# 🛡️ Veridex — AI-Powered Phishing Detection System

> Real-time phishing detection across emails, SMS, and URLs using machine learning, NLP, and explainable AI.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=flat-square&logo=scikit-learn)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## What is Veridex?

Veridex is a full-stack AI cybersecurity tool that detects phishing attacks in real time. It analyzes suspicious emails, SMS messages, and URLs using a trained machine learning pipeline and returns a detailed risk report — including threat category, social engineering tactics used, word-level AI attribution, and embedded URL scanning.

It ships as two products:

- **Web Dashboard** — paste any content and get a full analysis report
- **Chrome Extension** — runs silently in the background, scanning every site you visit and every Gmail email you open

---

## Features

### Core Detection
- Email phishing detection using Random Forest + TF-IDF
- SMS phishing (smishing) detection
- URL phishing detection with 15+ security feature extraction
- Risk scoring from 0 to 100 with levels: LOW / MEDIUM / HIGH / CRITICAL

### Deep Analysis
- **Social Engineering Detection** — identifies urgency, fear, authority impersonation, scarcity, and reward bait tactics
- **Threat Categorization** — classifies attack type: Credential Harvesting, Financial Fraud, Malware Delivery, Account Takeover, Prize Scam
- **Writing Quality Analysis** — detects unusual capitalization, spelling errors, and formality anomalies
- **Sender Domain Analysis** — checks for brand spoofing, suspicious TLDs, and domain risk patterns
- **Embedded URL Scanner** — extracts and individually scans every URL found inside an email

### Explainability (XAI)
- LIME-based word-level attribution showing exactly which words pushed the model toward phishing
- Color-coded word chips: red = phishing signal, green = safe signal
- Human-readable reasons for every decision

### Chrome Extension
- Auto-scans every URL you visit and updates the toolbar badge
- Browser notification alerts for HIGH and CRITICAL risk sites
- Gmail integration — reads opened emails and injects a live Safe / Caution / Suspicious label
- Manual scan panel in the popup for URL, email, and SMS
- "Mark as Safe" feedback button to report false positives

---

## System Architecture

```
User Input (Email / SMS / URL)
        │
        ▼
┌─────────────────────┐
│   React Dashboard   │  ◄──── Chrome Extension
│   (Vite + Tailwind) │         (content.js + background.js)
└────────┬────────────┘
         │ HTTP (axios)
         ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend                 │
│                                         │
│  /scan/email  →  predict_email()        │
│  /scan/sms    →  predict_sms()          │
│  /scan/url    →  predict_url()          │
│  /scan/email/deep →  deep analysis      │
│  /feedback    →  feedback_log.jsonl     │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ ML Models│  │   LIME   │            │
│  │ (sklearn)│  │  (XAI)   │            │
│  └──────────┘  └──────────┘            │
│  ┌──────────────────────────┐          │
│  │  analysis.py             │          │
│  │  - Social Engineering    │          │
│  │  - Threat Category       │          │
│  │  - Writing Quality       │          │
│  │  - Sender Domain         │          │
│  │  - URL Extractor         │          │
│  └──────────────────────────┘          │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  ML Models (.pkl)   │
│  - email_model      │
│  - sms_model        │
│  - url_model        │
│  - vectorizers (x3) │
└─────────────────────┘
```

---

## Project Structure

```
veridex/
├── backend/
│   ├── main.py              # FastAPI app + all endpoints
│   ├── schemas.py           # Pydantic request/response models
│   ├── predict.py           # ML model loading + prediction functions
│   ├── url_features.py      # 15-feature URL security analyzer
│   ├── explainability.py    # LIME word attribution
│   ├── analysis.py          # Deep analysis modules
│   ├── train_models.py      # Model training script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── ScanInput.jsx
│   │       ├── ResultPanel.jsx
│   │       ├── RiskMeter.jsx
│   │       ├── WordExplainer.jsx
│   │       ├── URLFeatureTable.jsx
│   │       └── ThreatDashboard.jsx
│   ├── package.json
│   └── vite.config.js
├── veridex-extension/
│   ├── manifest.json
│   ├── background.js        # Service worker: URL scanning, notifications
│   ├── content.js           # Gmail email scanning + badge injection
│   ├── content.css          # Injected styles
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── icons/
├── Dockerfile
├── render.yaml
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Models | scikit-learn (Random Forest), TF-IDF |
| Explainability | LIME |
| Backend | FastAPI, Uvicorn, Pydantic v2 |
| Frontend | React 18, Vite, Tailwind CSS, Axios |
| URL Analysis | tldextract, urllib.parse |
| Browser Extension | Chrome Manifest V3, Vanilla JS |
| Deployment | Render (backend), Vercel (frontend) |
| Containerization | Docker, Docker Compose |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- pip
- npm

### Step 1 — Backend Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/veridex.git
cd veridex

# Install backend dependencies
pip install -r backend/requirements.txt

# Train the ML models (required before first run)
python backend/train_models.py

# Start the backend server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`
API docs available at: `http://localhost:8000/docs`

### Step 2 — Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Step 3 — Chrome Extension Setup

```bash
cd veridex-extension

# Generate extension icons
python generate_icons.py
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Toggle on **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `veridex-extension/` folder
5. Pin the Veridex icon to your toolbar

> The backend must be running at `localhost:8000` for the extension to work.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check + model status |
| POST | `/scan/email` | Scan email text for phishing |
| POST | `/scan/sms` | Scan SMS message for phishing |
| POST | `/scan/url` | Scan URL for phishing |
| POST | `/scan/email/deep` | Full deep analysis of email |
| POST | `/scan/auto` | Auto-detect type and route |
| POST | `/feedback` | Submit false positive feedback |

### Example Request

```bash
curl -X POST http://localhost:8000/scan/email \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: Your account has been suspended. Verify now."}'
```

### Example Response

```json
{
  "input_type": "email",
  "label": "phishing",
  "confidence": 0.91,
  "risk_level": "CRITICAL",
  "risk_score": 89,
  "reasons": [
    "Suspicious keywords detected: urgent, suspended, verify",
    "Message pattern matches known phishing templates",
    "AI model confidence: 91%"
  ],
  "top_keywords": ["urgent", "suspended", "verify"],
  "explanation": [
    { "word": "suspended", "weight": 0.312, "direction": "phishing" },
    { "word": "urgent", "weight": 0.287, "direction": "phishing" },
    { "word": "verify", "weight": 0.201, "direction": "phishing" }
  ],
  "scan_timestamp": "2026-03-06T10:45:22.341Z"
}
```

---

## Chrome Extension Features

| Feature | Description |
|---|---|
| Toolbar Badge | Color-coded risk indicator on every site you visit |
| Browser Notification | Instant alert for HIGH and CRITICAL risk URLs |
| Gmail Integration | Reads opened emails, shows Safe/Caution/Suspicious label |
| Manual Scan Popup | Paste any URL, email, or SMS for instant analysis |
| Scan History | Last 20 scans stored locally, viewable in popup |
| Mark as Safe | Report false positives to improve the model |

**Badge Colors:**
- 🟢 `✓` — LOW risk (safe)
- 🟡 `!` — MEDIUM risk (caution)
- 🟠 `!!` — HIGH risk (dangerous)
- 🔴 `!!!` — CRITICAL risk (do not proceed)

---

## Deployment

### Backend — Render

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set build command: `pip install -r backend/requirements.txt`
5. Set start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Deploy and copy your public URL

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set root directory to `frontend/`
4. Add environment variable: `VITE_API_URL = https://your-render-url.onrender.com`
5. Deploy

### Docker (Local)

```bash
docker-compose up --build
```

---

## How the AI Works

1. **Preprocessing** — text is cleaned, lowercased, URLs and emails replaced with tokens
2. **Vectorization** — TF-IDF converts text to numerical features (5000 features, bigrams)
3. **Classification** — Random Forest predicts phishing probability
4. **Risk Scoring** — confidence score mapped to 0-100 risk scale
5. **Explainability** — LIME perturbs the input to find which words most influenced the decision
6. **Deep Analysis** — rule-based modules detect social engineering, threat type, and writing anomalies

---

## Demo Inputs

Try these in the web dashboard:

**Phishing Email:**
```
URGENT: Your Bank of America account has been suspended due to unusual 
login activity. Verify your identity within 24 hours to avoid permanent 
closure: http://bankofamerica-secure-verify.xyz/login
```

**Phishing SMS:**
```
FREE MSG: You've won an iPhone 15! Claim before it expires: 
http://prize-claim-now.tk/win?id=38291
```

**Phishing URL:**
```
http://192.168.1.1/paypal-login/verify?account=true&token=abc123
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---
---

## Built By

**Satyam Mohanty** — B.Tech CSE (AI & ML), CMR University, Bengaluru

Built as a hackathon project for the AI in Cybersecurity theme.
