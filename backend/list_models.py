import os
from google import genai
from app.core.config import settings

def main():
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        models = client.models.list()
        print("AVAILABLE MODELS:")
        for m in models:
            if "generateContent" in m.supported_actions and "gemini" in m.name:
                print(m.name)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
