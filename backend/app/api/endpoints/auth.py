from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister):
    if user_data.role not in ["teacher", "student"]:
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")
    
    user_id = None
    try:
        # Use admin API to create user so it doesn't affect backend client's session
        auth_response = supabase_client.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True, # Auto-confirm for Phase 1 simplicity
            "user_metadata": {
                "name": user_data.name,
                "role": user_data.role
            }
        })
        
        user_id = auth_response.user.id
        
        # Insert into public.users table as defined in schema
        supabase_client.table("users").insert({
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }).execute()

        return {"message": "User registered successfully", "user_id": user_id}

    except Exception as e:
        if user_id:
            try:
                supabase_client.auth.admin.delete_user(user_id)
            except Exception:
                pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin):
    try:
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        return TokenResponse(
            access_token=auth_response.session.access_token,
            user={
                "id": auth_response.user.id,
                "email": auth_response.user.email,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    try:
        user_id = str(current_user.id)
        
        print(f"\n=== GET_ME DEBUG ===")
        print(f"Looking for user_id: {user_id}")
        print(f"user_id type: {type(user_id)}")
        
        # Query by email instead of ID to bypass any UUID type mismatch in PostgREST
        db_response = supabase_client.table("users").select("*").eq("email", current_user.email).execute()
        
        print(f"Raw response: {db_response}")
        print(f"Response data: {db_response.data}")
        print(f"Data length: {len(db_response.data) if db_response.data else 0}")
        
        # Check if data exists
        if not db_response.data or len(db_response.data) == 0:
            print("ERROR: No data returned from query")
            raise HTTPException(status_code=404, detail="User not found in database")
        
        # Get first item from array
        user_data = db_response.data[0]
        
        print(f"User found: {user_data}")
        
        return {
            "id": user_id,
            "email": current_user.email,
            "name": user_data.get("name"),
            "role": user_data.get("role")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception caught: {type(e)} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
