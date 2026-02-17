"""
Admin Creation Script
Usage: python create_admin.py <email> <password>
Creates a Supabase Auth user and inserts a matching row into the admins table.
"""

import sys
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')


def create_admin(email: str, password: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"Creating admin user: {email}")

    try:
        # Create auth user (with auto-confirm to skip email verification)
        auth_response = supabase.auth.sign_up({
            'email': email,
            'password': password,
            'options': {
                'data': {
                    'role': 'admin'
                }
            }
        })

        user_id = auth_response.user.id
        print(f"Auth user created: {user_id}")

        # Insert into admins table
        supabase.table('admins').insert({
            'user_id': user_id,
            'email': email,
            'role': 'super_admin'
        }).execute()

        print(f"Admin record created for {email}")
        print("Login at http://localhost:5000/admin")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python create_admin.py <email> <password>")
        print("Example: python create_admin.py admin@evoting.com Admin123!")
        sys.exit(1)

    create_admin(sys.argv[1], sys.argv[2])
