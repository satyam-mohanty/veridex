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


def generate_synthetic_sms(num_samples=600):
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
        "URGENT: Your account is suspended. Reply to verify. http://bit.ly/",
        "You won a free prize! Click here to claim your limited offer.",
        "Bank Alert: Confirm your OTP for latest transaction.",
        "Your account will be blocked. login to confirm details.",
        "Final notice: get your free {prize}. Click below.",
    ]

    legit_templates = [
        "Hey, see you at the meeting.",
        "Thanks for the update. Will check the code.",
        "Are we on for lunch?",
        "Hello, here is the report.",
        "Catch up later?",
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


def train_sms_model():
    dataset_path = "data/sms_spam_dataset.csv"

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    print(f"Loading existing dataset from {dataset_path}")
    df = pd.read_csv(dataset_path, encoding="latin-1")
    df = df[["v1", "v2"]].rename(columns={"v1": "label_text", "v2": "text"})
    df["label"] = df["label_text"].map({"ham": 0, "spam": 1})
    df.dropna(subset=["label", "text"], inplace=True)
    df["label"] = df["label"].astype(int)

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

    if acc < 0.94:
        print("Warning: Accuracy is below the 94% target.")

    print("Saving model and vectorizer...")
    with open("models/sms_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open("models/vectorizer_sms.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print("Done!")


if __name__ == "__main__":
    train_sms_model()
