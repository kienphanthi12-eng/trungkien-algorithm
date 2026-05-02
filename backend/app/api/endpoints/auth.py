from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.services.supabase_client import supabase_client, get_supabase
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
            "email_confirm": True,  # Auto-confirm for Phase 1 simplicity
            "user_metadata": {
                "name": user_data.name,
                "role": user_data.role
            }
        })

        user_id = str(auth_response.user.id)

        # Insert into public.users table as defined in schema
        supabase_client.table("users").insert({
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }).execute()

        return {"message": "User registered successfully", "user_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        if user_id:
            try:
                supabase_client.auth.admin.delete_user(user_id)
            except Exception:
                pass
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Email này đã được đăng ký. Vui lòng đăng nhập.")
        if "user not allowed" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Đăng ký không được phép. Vui lòng kiểm tra cài đặt Supabase hoặc liên hệ quản trị viên.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin):
    try:
        # Use a fresh client so sign_in doesn't overwrite the shared admin client's service-role session
        auth_client = get_supabase()
        auth_response = auth_client.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })

        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return TokenResponse(
            access_token=auth_response.session.access_token,
            user={
                "id": str(auth_response.user.id),
                "email": auth_response.user.email,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() and "credential" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid login credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error_msg)

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    try:
        user_id = str(current_user.id)

        print(f"\n=== GET_ME DEBUG ===")
        print(f"Looking for user_id: {user_id}")

        # Query by email instead of ID to bypass any UUID type mismatch in PostgREST
        db_response = supabase_client.table("users").select("*").eq("email", current_user.email).execute()

        print(f"Response data: {db_response.data}")

        if not db_response.data or len(db_response.data) == 0:
            print(f"Profile for {current_user.email} missing. Attempting auto-create...")
            user_metadata = getattr(current_user, 'user_metadata', {}) or {}

            new_user_data = {
                "id": user_id,
                "email": current_user.email,
                "name": user_metadata.get("name", current_user.email.split('@')[0]),
                "role": user_metadata.get("role", "student")
            }

            try:
                supabase_client.table("users").insert(new_user_data).execute()
                user_data = new_user_data
                print(f"Auto-created profile: {user_data}")
            except Exception as insert_err:
                print(f"Auto-create failed: {str(insert_err)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Profile missing and could not be auto-created: {str(insert_err)}"
                )
        else:
            user_data = db_response.data[0]
            print(f"Profile found: {user_data}")

        return {
            "id": user_data.get("id", user_id),
            "email": current_user.email,
            "name": user_data.get("name"),
            "role": user_data.get("role")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception caught: {type(e)} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
