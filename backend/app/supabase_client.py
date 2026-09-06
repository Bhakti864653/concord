import os

from supabase import Client, create_client


def get_admin_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])


def get_anon_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_PUBLISHABLE_KEY"]
    )
