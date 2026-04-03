from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import sys
import os
import logging
import requests as http_requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

try:
    from predict import predict_email, predict_sms, predict_url, predict_review, TRUSTED_DOMAINS, _extract_root_domain
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
    ReviewScanRequest,
    ScanResponse,
    URLChainResponse,
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

        # Check if this is a trusted domain — skip heuristic override if so
        is_trusted = _extract_root_domain(request.url) in TRUSTED_DOMAINS

        heuristic_score = 0
        if not is_trusted:
            extracted = extract_url_features(request.url)
            heuristic_flags = extracted.get("suspicious_flags", [])

            for flag in heuristic_flags:
                if flag not in suspicious_features:
                    suspicious_features.append(flag)

            heuristic_score = compute_url_risk_score(extracted)

        risk_level, risk_score = determine_risk(label, confidence)

        if not is_trusted and heuristic_score > risk_score:
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

        if label == "phishing" or risk_level in ["CRITICAL", "HIGH", "MEDIUM"]:
            if not reasons:
                reasons.append("URL characters match known phishing signatures")
            reasons.append(f"AI model confidence: {int(confidence * 100)}%")

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


@app.post("/scan/url/chain", response_model=URLChainResponse)
def scan_url_chain(request: URLScanRequest):
    """Follow redirects for a URL and scan the final destination."""
    if not request.url or len(request.url.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Input URL must be at least 3 characters."
        )

    try:
        # Follow redirects
        redirect_chain = [request.url]
        final_url = request.url
        try:
            resp = http_requests.head(
                request.url,
                allow_redirects=True,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            if resp.history:
                redirect_chain = [r.url for r in resp.history] + [resp.url]
                final_url = resp.url
        except Exception:
            # If redirect following fails (timeout, DNS, etc.), just scan the original URL
            pass

        redirect_count = len(redirect_chain) - 1  # exclude the original URL

        # Scan the final URL using the existing model
        if not MODELS_LOADED:
            raise Exception("Models not properly loaded.")

        # Check if original URL or final URL belongs to a trusted domain
        is_original_trusted = _extract_root_domain(request.url) in TRUSTED_DOMAINS
        is_final_trusted = _extract_root_domain(final_url) in TRUSTED_DOMAINS
        is_trusted = is_original_trusted or is_final_trusted

        result = predict_url(final_url)
        label = result["label"]
        confidence = result["confidence"]
        suspicious_features = result.get("suspicious_features", [])

        heuristic_score = 0
        if not is_trusted:
            extracted = extract_url_features(final_url)
            heuristic_flags = extracted.get("suspicious_flags", [])
            for flag in heuristic_flags:
                if flag not in suspicious_features:
                    suspicious_features.append(flag)

            heuristic_score = compute_url_risk_score(extracted)

        risk_level, risk_score = determine_risk(label, confidence)

        if not is_trusted and heuristic_score > risk_score:
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
        if label == "phishing" or risk_level in ["CRITICAL", "HIGH", "MEDIUM"]:
            if not reasons:
                reasons.append("URL characters match known phishing signatures")
            reasons.append(f"AI model confidence: {int(confidence * 100)}%")

        final_url_safe = is_trusted or (label == "legitimate" and risk_level == "LOW")

        return URLChainResponse(
            redirect_count=redirect_count,
            redirect_chain=redirect_chain,
            final_url=final_url,
            final_url_safe=final_url_safe,
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


@app.post("/scan/review", response_model=ScanResponse)
def scan_review(request: ReviewScanRequest):
    if not request.text or len(request.text.strip()) < 5:
        raise HTTPException(
            status_code=400, detail="Input text must be at least 5 characters."
        )

    try:
        if not MODELS_LOADED:
            raise Exception("Models not properly loaded.")

        result = predict_review(request.text)

        label = result["label"]
        confidence = result["confidence"]
        top_keywords = result.get("top_keywords", [])

        # Review-specific risk: genuine = LOW, fake = HIGH/CRITICAL
        if label == "genuine":
            risk_level = "LOW"
            risk_score = min(25, int(confidence * 25))
        else:
            if confidence >= 0.85:
                risk_level = "CRITICAL"
                risk_score = int(85 + (confidence - 0.85) / 0.15 * 15)
            elif confidence >= 0.70:
                risk_level = "HIGH"
                risk_score = int(70 + (confidence - 0.70) / 0.15 * 14)
            else:
                risk_level = "MEDIUM"
                risk_score = int(50 + (confidence - 0.50) / 0.20 * 19)

        reasons = []
        if top_keywords:
            reasons.append(f"Suspicious keywords detected: {', '.join(top_keywords)}")
        reasons.append("Review pattern matches known fake review signatures")
        reasons.append(f"AI model confidence: {int(confidence * 100)}%")

        return ScanResponse(
            input_type="review",
            label=label,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            reasons=reasons,
            top_keywords=top_keywords,
            explanation=None,
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
