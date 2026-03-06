import os
import pickle
import re
from sklearn.pipeline import make_pipeline
from sklearn.base import BaseEstimator, TransformerMixin
from lime.lime_text import LimeTextExplainer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


def load_pkl(path):
    with open(path, "rb") as f:
        return pickle.load(f)


email_model = load_pkl(os.path.join(MODELS_DIR, "email_model.pkl"))
email_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_email.pkl"))

sms_model = load_pkl(os.path.join(MODELS_DIR, "sms_model.pkl"))
sms_vec = load_pkl(os.path.join(MODELS_DIR, "vectorizer_sms.pkl"))


class TextCleaner(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X, y=None):
        cleaned = []
        for text in X:
            if not isinstance(text, str):
                cleaned.append("")
                continue
            text = text.lower()
            text = re.sub(r"http\S+|www\.\S+", "", text)
            text = re.sub(r"\S+@\S+", "", text)
            text = re.sub(r"[^a-zA-Z\s]", "", text)
            text = re.sub(r"\s+", " ", text).strip()
            cleaned.append(text)
        return cleaned


email_pipeline = make_pipeline(TextCleaner(), email_vec, email_model)
sms_pipeline = make_pipeline(TextCleaner(), sms_vec, sms_model)


def explain_email(text: str, num_features: int = 8) -> list:
    explainer = LimeTextExplainer(class_names=["legitimate", "phishing"])
    try:
        exp = explainer.explain_instance(
            text, email_pipeline.predict_proba, num_features=num_features, labels=(1,)
        )
        features = exp.as_list(label=1)

        results = []
        for word, weight in features:
            direction = "phishing" if weight > 0 else "legitimate"
            results.append(
                {"word": word, "weight": float(weight), "direction": direction}
            )

        results.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return results
    except Exception as e:
        print(f"LIME explain_email error: {e}")
        return []


def explain_sms(text: str, num_features: int = 6) -> list:
    explainer = LimeTextExplainer(class_names=["legitimate", "phishing"])
    try:
        exp = explainer.explain_instance(
            text, sms_pipeline.predict_proba, num_features=num_features, labels=(1,)
        )
        features = exp.as_list(label=1)

        results = []
        for word, weight in features:
            direction = "phishing" if weight > 0 else "legitimate"
            results.append(
                {"word": word, "weight": float(weight), "direction": direction}
            )

        results.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return results
    except Exception as e:
        print(f"LIME explain_sms error: {e}")
        return []
