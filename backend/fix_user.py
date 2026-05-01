import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(url, key)

try:
    print("Checking auth.users for kienphanthi12@gmail.com:")
    # We can't easily query auth.users by email using the python client without fetching all or using admin
    # Let's use admin API
    users = supabase.auth.admin.list_users()
    for u in users:
        if hasattr(u, 'email') and getattr(u, 'email') == 'kienphanthi12@gmail.com':
            print(f"Found in auth.users: {u.id} - {u.email}")
            break
        elif type(u) == dict and u.get('email') == 'kienphanthi12@gmail.com':
            print(f"Found in auth.users: {u.get('id')} - {u.get('email')}")
            break
    else:
        # Check through the user attribute if list_users returns a User object
        # Supabase python client list_users() returns a UserList object with .users
        if hasattr(users, 'users'):
            for u in users.users:
                if u.email == 'kienphanthi12@gmail.com':
                    print(f"Found in auth.users: {u.id} - {u.email}")
                    break
            else:
                print("Not found in auth.users")
        else:
            print("Not found in auth.users (fallback)")

    print("\nChecking public.users for kienphanthi12@gmail.com:")
    response = supabase.table("users").select("*").eq("email", "kienphanthi12@gmail.com").execute()
    print(response.data)

    if not response.data:
        print("\nInserting into public.users...")
        # Get the ID from auth.users to keep it in sync
        user_id = None
        if hasattr(users, 'users'):
            for u in users.users:
                if u.email == 'kienphanthi12@gmail.com':
                    user_id = u.id
                    break
        
        if user_id:
            supabase.table("users").insert({
                "id": user_id,
                "email": "kienphanthi12@gmail.com",
                "name": "Kien Phan",
                "role": "teacher" # Defaulting to teacher, they can change it
            }).execute()
            print("Successfully inserted into public.users!")
        else:
            print("Could not find user ID to insert.")
        
except Exception as e:
    print("Error:")
    print(str(e))
