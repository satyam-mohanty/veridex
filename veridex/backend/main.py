from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import sys
import os
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

try:
    from predict import predict_email, predict_sms, predict_url
    from url_features import extract_url_features, compute_url_risk_score
    from explainability import explain_email, explain_sms

    MODELS_LOADED = True
except Exception as e:
    logging.error(f"Failed to load ML models or features: {e}")
    MODELS_LOADED = False

from backend.schemas import (
    EmailScanRequest,
    SMSScanRequest,
    URLScanRequest,
    ScanResponse,
    HealthResponse,
)

app = FastAPI(title="PhishShield API", description="REST API backend for PhishShield")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def determine_risk(label: str, confidence: float) -> tuple[str, int]:
    """Risk for URL / SMS — uses standard thresholds."""
    if label == "legitimate":
        return "LOW", min(30, int(confidence * 30))
    else:
        if confidence >= 0.85:
            return "CRITICAL", int(85 + (confidence - 0.85) / 0.15 * 15)
        elif confidence >= 0.70:
            return "HIGH", int(70 + (confidence - 0.70) / 0.15 * 14)
        elif confidence >= 0.50:
            return "MEDIUM", int(50 + (confidence - 0.50) / 0.20 * 19)
        else:
            return "LOW", int(30 + (confidence / 0.50) * 19)


def determine_risk_email(label: str, confidence: float) -> tuple[str, int]:
    if label == "legitimate":
        return "LOW", min(25, int(confidence * 25))
    else:
        if confidence >= 0.92:
            return "CRITICAL", int(88 + (confidence - 0.92) / 0.08 * 12)
        elif confidence >= 0.80:
            return "HIGH", int(70 + (confidence - 0.80) / 0.12 * 18)
        elif confidence >= 0.60:
            return "MEDIUM", int(45 + (confidence - 0.60) / 0.20 * 25)
        else:
            return "LOW", int(15 + (confidence / 0.60) * 29)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", models_loaded=MODELS_LOADED)


@app.post("/scan/email", response_model=ScanResponse)
def scan_email(request: EmailScanRequest):
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Input text must be at least 3 characters."
        )

    try:
        if not MODELS_LOADED:
            raise Exception("Models not properly loaded.")

        result = predict_email(request.text)

        label = result["label"]
        confidence = result["confidence"]
        top_keywords = result.get("top_keywords", [])

        risk_level, risk_score = determine_risk_email(label, confidence)

        reasons = []
        if top_keywords:
            reasons.append(f"Suspicious keywords detected: {', '.join(top_keywords)}")
        reasons.append("Message pattern matches known phishing templates")
        reasons.append(f"AI model confidence: {int(confidence * 100)}%")

        explanation = explain_email(request.text)

        return ScanResponse(
            input_type="email",
            label=label,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            reasons=reasons,
            top_keywords=top_keywords,
            explanation=explanation,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan/sms", response_model=ScanResponse)
def scan_sms(request: SMSScanRequest):
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Input text must be at least 3 characters."
        )

    try:
        if not MODELS_LOADED:
            raise Exception("Models not properly loaded.")

        result = predict_sms(request.text)

        label = result["label"]
        confidence = result["confidence"]
        top_keywords = result.get("top_keywords", [])

        risk_level, risk_score = determine_risk(label, confidence)

        reasons = []
        if top_keywords:
            reasons.append(f"Suspicious keywords detected: {', '.join(top_keywords)}")
        reasons.append("Message pattern matches known phishing templates")
        reasons.append(f"AI model confidence: {int(confidence * 100)}%")

        explanation = explain_sms(request.text)

        return ScanResponse(
            input_type="sms",
            label=label,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            reasons=reasons,
            top_keywords=top_keywords,
            explanation=explanation,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan/url", response_model=ScanResponse)
def scan_url(request: URLScanRequest):
    if not request.url or len(request.url.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Input URL must be at least 3 characters."
        )

    try:
        if not MODELS_LOADED:
            raise Exception("Models not properly loaded.")

        result = predict_url(request.url)

        label = result["label"]
        confidence = result["confidence"]

        suspicious_features = result.get("suspicious_features", [])

        heuristic_score = 0
        if not suspicious_features:
            extracted = extract_url_features(request.url)
            suspicious_features = extracted.get("suspicious_flags", [])
            heuristic_score = compute_url_risk_score(extracted)

        risk_level, risk_score = determine_risk(label, confidence)

        if heuristic_score > risk_score:
            risk_score = heuristic_score
            label = "phishing"
            if risk_score >= 85:
                risk_level = "CRITICAL"
            elif risk_score >= 70:
                risk_level = "HIGH"
            elif risk_score >= 50:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

        reasons = suspicious_features.copy()

        return ScanResponse(
            input_type="url",
            label=label,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            reasons=reasons,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import json
from backend.schemas import FeedbackRequest, FeedbackResponse


@app.post("/feedback", response_model=FeedbackResponse)
def handle_feedback(request: FeedbackRequest):
    try:
        feedback_data = {
            "input": request.input,
            "correct_label": request.correct_label,
            "input_type": request.input_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        log_path = os.path.join(BASE_DIR, "feedback_log.jsonl")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(feedback_data) + "\n")
        return FeedbackResponse(status="received", message="Feedback saved. Thank you.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
