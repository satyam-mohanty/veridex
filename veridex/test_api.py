import sys
import os
import json

sys.path.append(r"d:\Desktop\Satyam\Hackathons\Reva Hackathon\V2\veridex")

try:
    from backend.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)

    payload = {
        "text": "URGENT: Your account has been suspended. Please verify your password and login details immediately to avoid permanent account closure."
    }

    response = client.post("/scan/email", json=payload)
    print("STATUS:", response.status_code)
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
