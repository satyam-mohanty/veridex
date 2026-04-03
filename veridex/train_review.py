import pandas as pd
import numpy as np
import re
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

os.makedirs("models", exist_ok=True)

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\.\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def train_review_model():
    dataset_path = "data/fake_reviews_dataset.csv"

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    print(f"Loading existing dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)
    df.dropna(subset=["label", "text"], inplace=True)
    
    df["label_num"] = df["label"].astype(int)

    print("Preprocessing text...")
    df["cleaned_text"] = df["text"].apply(clean_text)

    X = df["cleaned_text"]
    y = df["label_num"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Vectorizing...")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train_vec, y_train)

    print("Evaluating...")
    y_pred = rf.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print(
        classification_report(
            y_test, y_pred, target_names=["Genuine (0)", "Fake (1)"]
        )
    )

    print("Saving model and vectorizer...")
    with open("models/review_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open("models/vectorizer_review.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print("Done!")

if __name__ == "__main__":
    train_review_model()
