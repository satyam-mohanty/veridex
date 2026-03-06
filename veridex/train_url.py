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


def generate_synthetic_url(num_samples=600):
    phishing_domains = [
        "login-update-account",
        "verify-bank-security",
        "secure-update-password",
        "free-prize-winner",
        "account-suspended",
        "confirm-details-now",
        "alert-security-update",
    ]

    legitimate_domains = [
        "google",
        "example",
        "github",
        "microsoft",
        "apple",
        "amazon",
        "netflix",
        "wikipedia",
        "stackoverflow",
        "linkedin",
        "twitter",
    ]

    tlds = [".com", ".net", ".org", ".io", ".co"]

    data = []

    for _ in range(num_samples):
        protocol = random.choice(["http://", "https://"])
        domain = random.choice(phishing_domains) + str(random.randint(10, 99))
        tld = random.choice([".info", ".xyz", ".cc", ".tk", ".com"])
        path = (
            "/"
            + random.choice(["login", "secured", "verify", "update"])
            + "?id="
            + str(random.randint(1000, 9999))
        )
        url = protocol + domain + tld + path
        data.append({"url": url, "label": 1})

    for _ in range(num_samples):
        protocol = random.choice(["http://", "https://"])
        domain = random.choice(legitimate_domains)
        tld = random.choice(tlds)
        path = "/" + random.choice(["home", "about", "contact", "products", ""])
        if path != "/":
            path += str(random.choice(["", ".html", "/index"]))
        url = protocol + domain + tld + path
        data.append({"url": url, "label": 0})

    df = pd.DataFrame(data)
    df = df.sample(frac=1).reset_index(drop=True)
    return df


def clean_url(url):
    if not isinstance(url, str):
        return ""
    url = re.sub(r"^https?:\/\/", "", url)
    return url


def train_url_model():
    dataset_path = "data/malicious_url.csv"

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    print(f"Loading existing dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)

    df = df[["url", "type"]].rename(columns={"type": "label_text"})
    df["label"] = df["label_text"].apply(
        lambda x: 0 if str(x).lower().strip() == "benign" else 1
    )
    df.dropna(subset=["label", "url"], inplace=True)
    df["label"] = df["label"].astype(int)

    if len(df) > 20000:
        print(
            f"Dataset is large ({len(df)} rows). Sampling 20000 rows for faster training..."
        )
        df = df.sample(n=20000, random_state=42).reset_index(drop=True)

    print("Preprocessing URL...")
    df["cleaned_url"] = df["url"].apply(clean_url)

    X = df["cleaned_url"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Vectorizing...")
    vectorizer = TfidfVectorizer(
        analyzer="char_wb", ngram_range=(3, 5), max_features=3000
    )
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

    if acc < 0.88:
        print("Warning: Accuracy is below the 88% target.")

    print("Saving model and vectorizer...")
    with open("models/url_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open("models/vectorizer_url.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print("Done!")


if __name__ == "__main__":
    train_url_model()
