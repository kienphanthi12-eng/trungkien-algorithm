import os
import asyncio
from dotenv import load_dotenv
from app.api.endpoints.auth import login, get_me
from app.schemas.auth import UserLogin
from fastapi.security import HTTPAuthorizationCredentials
from app.api.dependencies import get_current_user

async def main():
    load_dotenv()
    try:
        print("Logging in...")
        user_data = UserLogin(email="kienphanthi12@gmail.com", password="password123")
        # In the endpoint, login is sync
        token_res = login(user_data)
        token = token_res.access_token
        print("Logged in, token length:", len(token))
        
        print("Getting current user...")
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        user = get_current_user(creds)
        print("Current user:", user.email)
        
        print("Calling get_me...")
        me_res = get_me(user)
        print("Me:", me_res)
    except Exception as e:
        print("Error:", type(e))
        print(str(e))
        if hasattr(e, 'detail'):
            print("Detail:", getattr(e, 'detail'))

if __name__ == "__main__":
    asyncio.run(main())
