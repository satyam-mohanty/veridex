import pandas as pd
import numpy as np
import re
import pickle
import os
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

os.makedirs("data", exist_ok=True)
os.makedirs("models", exist_ok=True)


def generate_synthetic_emails(num_samples=600):
    phishing_keywords = [
        "urgent",
        "verify",
        "account",
        "suspended",
        "click",
        "password",
        "bank",
        "winner",
        "free",
        "prize",
        "congratulations",
        "login",
        "confirm",
        "limited",
        "offer",
        "security",
        "alert",
        "OTP",
        "transaction",
        "blocked",
    ]

    legitimate_topics = [
        "meeting",
        "project",
        "lunch",
        "update",
        "code",
        "review",
        "schedule",
        "hello",
        "thanks",
        "questions",
        "feedback",
        "report",
        "sprint",
        "planning",
        "holiday",
        "team",
        "dinner",
        "call",
        "catch up",
    ]

    phishing_templates = [
        "URGENT: Your {bank} account has been suspended. Please click here to verify your identity.",
        "Congratulations! You are the winner of a free {prize}. Login to claim your limited offer.",
        "Security Alert: Unusual transaction detected. Confirm your password via OTP immediately.",
        "Your account will be blocked. Please verify your details by clicking the link.",
        "Final notice: Limited time offer to get your free {prize}. Click below.",
    ]

    legit_templates = [
        "Hi team, just a quick update on the latest project sprint. Let's schedule a call.",
        "Thanks for the feedback. I will review the code and send a report by tomorrow.",
        "Are we still on for lunch today? Let me know your schedule.",
        "Hello, attached is the planning document for the next meeting. Any questions?",
        "Happy holiday! Catch up with the team when you get back.",
    ]

    data = []

    for _ in range(num_samples):
        text = random.choice(phishing_templates)
        words = text.split()
        words.insert(random.randint(0, len(words)), random.choice(phishing_keywords))
        data.append({"text": " ".join(words), "label": 1})

    for _ in range(num_samples):
        text = random.choice(legit_templates)
        words = text.split()
        words.insert(random.randint(0, len(words)), random.choice(legitimate_topics))
        data.append({"text": " ".join(words), "label": 0})

    df = pd.DataFrame(data)
    df = df.sample(frac=1).reset_index(drop=True)
    return df


def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\.\S+", "", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def train_email_model():
    dataset_path = "data/email_data.csv"

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    print(f"Loading existing dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)
    df.dropna(subset=["label", "text"], inplace=True)
    df["label"] = df["label"].astype(int)

    if len(df) > 20000:
        print(
            f"Dataset is large ({len(df)} rows). Sampling 20000 rows for faster training..."
        )
        df = df.sample(n=20000, random_state=42).reset_index(drop=True)

    print("Preprocessing text...")
    df["cleaned_text"] = df["text"].apply(clean_text)

    X = df["cleaned_text"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Vectorizing...")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train_vec, y_train)

    print("Evaluating...")
    y_pred = rf.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print(
        classification_report(
            y_test, y_pred, target_names=["Legitimate (0)", "Phishing (1)"]
        )
    )

    if acc < 0.92:
        print("Warning: Accuracy is below the 92% target.")

    print("Saving model and vectorizer...")
    with open("models/email_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open("models/vectorizer_email.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print("Done!")


if __name__ == "__main__":
    train_email_model()
