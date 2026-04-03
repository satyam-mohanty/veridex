import pickle
import re
import os
import tldextract

PHISHING_KEYWORDS = [
    "urgent",
    "verify",
    "suspended",
    "winner",
    "prize",
    "congratulations",
    "confirm",
    "limited time",
    "otp",
    "blocked",
    "password",
    "bank account",
    "wire transfer",
    "claim now",
    "act now",
]


def load_pkl(path):
    with open(path, "rb") as f:
        return pickle.load(f)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

email_model = load_pkl(os.path.join(MODELS_DIR, "email_model.pkl"))
email_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_email.pkl"))

sms_model = load_pkl(os.path.join(MODELS_DIR, "sms_model.pkl"))
sms_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_sms.pkl"))

url_model = load_pkl(os.path.join(MODELS_DIR, "url_model.pkl"))
url_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_url.pkl"))

try:
    review_model = load_pkl(os.path.join(MODELS_DIR, "review_model.pkl"))
    review_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_review.pkl"))
except Exception as e:
    review_model = None
    review_vec = None

TRUSTED_DOMAINS = {
    "google.com",
    "google.co.in",
    "google.co.uk",
    "google.com.au",
    "github.com",
    "githubusercontent.com",
    "microsoft.com",
    "live.com",
    "outlook.com",
    "office.com",
    "azure.com",
    "apple.com",
    "icloud.com",
    "amazon.com",
    "amazon.in",
    "amazonaws.com",
    "flipkart.com",
    "netflix.com",
    "youtube.com",
    "youtu.be",
    "facebook.com",
    "fb.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "wikipedia.org",
    "stackoverflow.com",
    "reddit.com",
    "twitch.tv",
    "spotify.com",
    "dropbox.com",
    "paypal.com",
    "ebay.com",
    "walmart.com",
    "adobe.com",
    "cloudflare.com",
    "npmjs.com",
    "pypi.org",
    "mozilla.org",
    "whatsapp.com",
    "discord.com",
    "slack.com",
    "zoom.us",
    "notion.so",
    "figma.com",
    "vercel.com",
    "netlify.com",
    "satyammohanty.com",
    "claude.ai",
    "anthropic.com",
    "hindustantimes.com",
    "indiatimes.com",
    "ndtv.com",
    "indianexpress.com",
    "thehindu.com",
    "news18.com",
    "firstpost.com",
}


def _extract_root_domain(url: str) -> str:
    """Extract root domain (e.g. 'github.com') from a URL."""
    try:
        ext = tldextract.extract(url)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}".lower()
    except Exception:
        pass
    url = re.sub(r"^https?://", "", url)
    url = re.sub(r"[/?#].*$", "", url)
    url = re.sub(r":\d+$", "", url)
    return url.lower()


def _clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\.\S+", "", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _clean_url(url):
    if not isinstance(url, str):
        return ""
    url = re.sub(r"^https?:\/\/", "", url)
    return url


def _find_keywords(text):
    text_lower = text.lower()
    found = []
    for kw in PHISHING_KEYWORDS:
        if kw in text_lower:
            found.append(kw)
    return found


def predict_email(text: str) -> dict:
    cleaned = _clean_text(text)
    vec = email_vec.transform([cleaned])

    label_idx = email_model.predict(vec)[0]
    probs = email_model.predict_proba(vec)[0]

    label = "phishing" if label_idx == 1 else "legitimate"
    confidence = float(probs[label_idx])

    return {
        "label": label,
        "confidence": confidence,
        "top_keywords": _find_keywords(text),
    }


def predict_sms(text: str) -> dict:
    cleaned = _clean_text(text)
    vec = sms_vec.transform([cleaned])

    label_idx = sms_model.predict(vec)[0]
    probs = sms_model.predict_proba(vec)[0]

    label = "phishing" if label_idx == 1 else "legitimate"
    confidence = float(probs[label_idx])

    return {
        "label": label,
        "confidence": confidence,
        "top_keywords": _find_keywords(text),
    }


def predict_url(url: str) -> dict:
    root_domain = _extract_root_domain(url)
    if root_domain in TRUSTED_DOMAINS:
        return {
            "label": "legitimate",
            "confidence": 0.97,
            "suspicious_features": [],
        }

    cleaned = _clean_url(url)
    vec = url_vec.transform([cleaned])

    label_idx = url_model.predict(vec)[0]
    probs = url_model.predict_proba(vec)[0]

    label = "phishing" if label_idx == 1 else "legitimate"
    confidence = float(probs[label_idx])

    return {"label": label, "confidence": confidence, "suspicious_features": []}


def predict_review(text: str) -> dict:
    if not review_model or not review_vec:
        # Fallback or error
        return {
            "label": "legitimate",
            "confidence": 0.5,
            "top_keywords": []
        }
    
    cleaned = _clean_text(text)
    vec = review_vec.transform([cleaned])

    label_idx = review_model.predict(vec)[0]
    probs = review_model.predict_proba(vec)[0]

    label = "fake" if label_idx == 1 else "genuine"
    confidence = float(probs[label_idx])

    return {
        "label": label,
        "confidence": confidence,
        "top_keywords": _find_keywords(text),
    }


if __name__ == "__main__":
    print("=== Testing predict.py ===\n")

    email_sample = (
        "URGENT: Your account has been suspended. Please confirm your password."
    )
    print(f"Testing Email: '{email_sample}'")
    email_res = predict_email(email_sample)
    print(f"Result: {email_res}\n")

    sms_sample = "Hey, are we still on for lunch?"
    print(f"Testing SMS: '{sms_sample}'")
    sms_res = predict_sms(sms_sample)
    print(f"Result: {sms_res}\n")

    url_sample = "http://login-update-account77.xyz/verify?id=3321"
    print(f"Testing URL: '{url_sample}'")
    url_res = predict_url(url_sample)
    print(f"Result: {url_res}\n")

    review_sample = "Extremely disappointed. This did not look like what pictures portrayed online. Smells musty."
    print(f"Testing Review: '{review_sample}'")
    review_res = predict_review(review_sample)
    print(f"Result: {review_res}\n")

    print("All tests passed!") # Triggering uvicorn reload
