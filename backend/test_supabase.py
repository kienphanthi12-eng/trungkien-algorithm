import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

print(f"URL: {url}")
print(f"Key preview: {key[:20]}...")

supabase: Client = create_client(url, key)

try:
    response = supabase.auth.admin.create_user({
        "email": "test12345@example.com",
        "password": "password123",
        "user_metadata": {"name": "Test User", "role": "student"},
        "email_confirm": True
    })
    print("User created successfully!")
    print(response)
except Exception as e:
    print("Error creating user:")
    print(type(e))
    print(str(e))
