"""
Seed Data Script
Populates the database with sample candidates and voters for testing.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')


def seed_data():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Candidates ────────────────────────────────────────────────
    candidates = [
        {
            'name': 'Alice Johnson',
            'party': 'Progressive Party',
            'description': 'Advocate for education reform and renewable energy.',
            'vote_count': 0
        },
        {
            'name': 'Bob Williams',
            'party': 'Conservative Alliance',
            'description': 'Focus on fiscal responsibility and national security.',
            'vote_count': 0
        },
        {
            'name': 'Carol Martinez',
            'party': 'Green Future',
            'description': 'Environmental conservation and sustainable development.',
            'vote_count': 0
        },
        {
            'name': 'David Chen',
            'party': 'Innovation Party',
            'description': 'Technology-driven solutions for modern governance.',
            'vote_count': 0
        },
        {
            'name': 'Eva Rodriguez',
            'party': 'Unity Coalition',
            'description': 'Community-first approach to policy making.',
            'vote_count': 0
        }
    ]

    print("Seeding candidates...")
    for c in candidates:
        try:
            supabase.table('candidates').insert(c).execute()
            print(f"  ✓ {c['name']} ({c['party']})")
        except Exception as e:
            print(f"  ✗ {c['name']}: {e}")

    # ── Voters ────────────────────────────────────────────────────
    voters = [
        {'voter_id': 'V001', 'name': 'John Smith',       'email': 'john@example.com',     'has_voted': False},
        {'voter_id': 'V002', 'name': 'Jane Doe',         'email': 'jane@example.com',     'has_voted': False},
        {'voter_id': 'V003', 'name': 'Michael Brown',    'email': 'michael@example.com',  'has_voted': False},
        {'voter_id': 'V004', 'name': 'Sarah Wilson',     'email': 'sarah@example.com',    'has_voted': False},
        {'voter_id': 'V005', 'name': 'James Taylor',     'email': 'james@example.com',    'has_voted': False},
        {'voter_id': 'V006', 'name': 'Emily Davis',      'email': 'emily@example.com',    'has_voted': False},
        {'voter_id': 'V007', 'name': 'Robert Miller',    'email': 'robert@example.com',   'has_voted': False},
        {'voter_id': 'V008', 'name': 'Lisa Anderson',    'email': 'lisa@example.com',     'has_voted': False},
        {'voter_id': 'V009', 'name': 'William Thomas',   'email': 'william@example.com',  'has_voted': False},
        {'voter_id': 'V010', 'name': 'Amanda Jackson',   'email': 'amanda@example.com',   'has_voted': False},
    ]

    print("\nSeeding voters...")
    for v in voters:
        try:
            supabase.table('voters').insert(v).execute()
            print(f"  ✓ {v['voter_id']} - {v['name']}")
        except Exception as e:
            print(f"  ✗ {v['voter_id']}: {e}")

    print("\nSeed data complete!")
    print("Test voter IDs: V001 through V010")


if __name__ == '__main__':
    seed_data()
