from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    # Using Service Role Key as requested by architecture constraints
    # for backend administrative actions and avoiding RLS issues
    # when accessing/creating users.
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return supabase

supabase_client = get_supabase()
