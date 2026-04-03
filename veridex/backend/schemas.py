from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class EmailScanRequest(BaseModel):
    text: str = Field(..., min_length=3, description="The email content to scan")


class SMSScanRequest(BaseModel):
    text: str = Field(..., min_length=3, description="The SMS content to scan")


class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=3, description="The URL to scan")


class ReviewScanRequest(BaseModel):
    text: str = Field(..., min_length=5, description="The e-commerce review content to scan")


class ScanResponse(BaseModel):
    input_type: str
    label: str
    confidence: float
    risk_level: str
    risk_score: int
    reasons: List[str]
    top_keywords: Optional[List[str]] = []
    explanation: Optional[List[Dict[str, Any]]] = None
    scan_timestamp: str


class URLChainResponse(BaseModel):
    redirect_count: int
    redirect_chain: List[str]
    final_url: str
    final_url_safe: bool
    input_type: str
    label: str
    confidence: float
    risk_level: str
    risk_score: int
    reasons: List[str]
    scan_timestamp: str


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool


class FeedbackRequest(BaseModel):
    input: str = Field(..., description="The input URL or text")
    correct_label: str = Field(..., description="The correct label for the input")
    input_type: str = Field(
        ..., description="The type of input: 'url', 'email', or 'sms'"
    )


class FeedbackResponse(BaseModel):
    status: str
    message: str
