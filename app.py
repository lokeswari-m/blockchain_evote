"""
Main Flask Application – Blockchain E-Voting System
Provides RESTful API endpoints for admin and voter operations
backed by Supabase (PostgreSQL) and a custom blockchain.
"""

import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from blockchain import Blockchain

# ─── Configuration ────────────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
voting_chain = Blockchain(difficulty=4)

# ─── Page Routes ──────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/voter')
def voter_page():
    return render_template('voter.html')

# ─── Authentication ──────────────────────────────────────────────────

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Authenticate admin via Supabase Auth."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        auth_response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })

        user_id = auth_response.user.id

        # Verify user is an admin
        admin_check = supabase.table('admins').select('*').eq('user_id', user_id).execute()

        if not admin_check.data:
            return jsonify({'error': 'Not authorized as admin'}), 403

        return jsonify({
            'message': 'Login successful',
            'admin': admin_check.data[0],
            'access_token': auth_response.session.access_token
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 401


@app.route('/api/voter/login', methods=['POST'])
def voter_login():
    """Authenticate voter by voter ID."""
    data = request.get_json()
    voter_id = data.get('voter_id')

    if not voter_id:
        return jsonify({'error': 'Voter ID is required'}), 400

    try:
        result = supabase.table('voters').select('*').eq('voter_id', voter_id).execute()

        if not result.data:
            return jsonify({'error': 'Voter ID not found'}), 404

        voter = result.data[0]
        return jsonify({
            'message': 'Login successful',
            'voter': voter
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Admin Operations ────────────────────────────────────────────────

@app.route('/api/admin/add-voter', methods=['POST'])
def add_voter():
    """Register a new voter."""
    data = request.get_json()
    voter_id = data.get('voter_id')
    name = data.get('name')
    email = data.get('email')

    if not all([voter_id, name, email]):
        return jsonify({'error': 'voter_id, name, and email are required'}), 400

    try:
        # Check if voter_id already exists
        existing = supabase.table('voters').select('*').eq('voter_id', voter_id).execute()
        if existing.data:
            return jsonify({'error': 'Voter ID already exists'}), 409

        result = supabase.table('voters').insert({
            'voter_id': voter_id,
            'name': name,
            'email': email,
            'has_voted': False
        }).execute()

        return jsonify({
            'message': 'Voter registered successfully',
            'voter': result.data[0]
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/voters', methods=['GET'])
def get_voters():
    """List all registered voters."""
    try:
        result = supabase.table('voters').select('*').order('created_at', desc=False).execute()
        return jsonify({'voters': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/add-candidate', methods=['POST'])
def add_candidate():
    """Add a new election candidate."""
    data = request.get_json()
    name = data.get('name')
    party = data.get('party')
    description = data.get('description', '')

    if not all([name, party]):
        return jsonify({'error': 'name and party are required'}), 400

    try:
        existing = supabase.table('candidates').select('*').eq('name', name).execute()
        if existing.data:
            return jsonify({'error': 'Candidate already exists'}), 409

        result = supabase.table('candidates').insert({
            'name': name,
            'party': party,
            'description': description,
            'vote_count': 0
        }).execute()

        return jsonify({
            'message': 'Candidate added successfully',
            'candidate': result.data[0]
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/candidates', methods=['GET'])
def admin_get_candidates():
    """List all candidates (admin view)."""
    try:
        result = supabase.table('candidates').select('*').order('created_at', desc=False).execute()
        return jsonify({'candidates': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/results', methods=['GET'])
def get_results():
    """Get election results with turnout statistics."""
    try:
        candidates = supabase.table('candidates').select('*').order('vote_count', desc=True).execute()
        voters = supabase.table('voters').select('*').execute()

        total_voters = len(voters.data)
        voted_count = sum(1 for v in voters.data if v.get('has_voted'))
        turnout = (voted_count / total_voters * 100) if total_voters > 0 else 0

        total_votes = sum(c.get('vote_count', 0) for c in candidates.data)

        results = []
        for c in candidates.data:
            vote_count = c.get('vote_count', 0)
            percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
            results.append({
                'name': c['name'],
                'party': c['party'],
                'vote_count': vote_count,
                'percentage': round(percentage, 2)
            })

        return jsonify({
            'results': results,
            'stats': {
                'total_voters': total_voters,
                'voted': voted_count,
                'turnout': round(turnout, 2),
                'total_votes': total_votes
            },
            'blockchain': voting_chain.get_stats()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Voter Operations ────────────────────────────────────────────────

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Public endpoint to list all candidates."""
    try:
        result = supabase.table('candidates').select('id, name, party, description').execute()
        return jsonify({'candidates': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/vote', methods=['POST'])
def cast_vote():
    """Cast a vote — records to both blockchain and database."""
    data = request.get_json()
    voter_id = data.get('voter_id')
    candidate_name = data.get('candidate_name')

    if not all([voter_id, candidate_name]):
        return jsonify({'error': 'voter_id and candidate_name are required'}), 400

    try:
        # 1. Verify voter exists and hasn't voted
        voter_result = supabase.table('voters').select('*').eq('voter_id', voter_id).execute()
        if not voter_result.data:
            return jsonify({'error': 'Voter ID not found'}), 404

        voter = voter_result.data[0]
        if voter.get('has_voted'):
            return jsonify({'error': 'You have already voted'}), 409

        # 2. Verify candidate exists
        candidate_result = supabase.table('candidates').select('*').eq('name', candidate_name).execute()
        if not candidate_result.data:
            return jsonify({'error': 'Candidate not found'}), 404

        candidate = candidate_result.data[0]

        # 3. Mine vote onto the blockchain
        new_block = voting_chain.add_vote(voter_id, candidate_name)

        # 4. Record vote in database
        supabase.table('votes').insert({
            'voter_id': voter_id,
            'candidate_name': candidate_name,
            'block_hash': new_block.hash,
            'previous_hash': new_block.previous_hash,
            'timestamp': new_block.timestamp
        }).execute()

        # 5. Update voter status
        supabase.table('voters').update({
            'has_voted': True
        }).eq('voter_id', voter_id).execute()

        # 6. Increment candidate vote count
        supabase.table('candidates').update({
            'vote_count': candidate.get('vote_count', 0) + 1
        }).eq('name', candidate_name).execute()

        return jsonify({
            'message': 'Vote cast successfully!',
            'block': new_block.to_dict(),
            'receipt': {
                'voter_id': voter_id,
                'candidate': candidate_name,
                'block_hash': new_block.hash,
                'block_index': new_block.index,
                'timestamp': new_block.timestamp
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/verify-vote/<voter_id>', methods=['GET'])
def verify_vote(voter_id):
    """Verify a vote exists on the blockchain."""
    try:
        block = voting_chain.find_vote(voter_id)
        if block:
            return jsonify({
                'verified': True,
                'block': block,
                'chain_valid': voting_chain.is_chain_valid()
            })
        return jsonify({'verified': False, 'message': 'No vote found for this voter ID'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Blockchain ───────────────────────────────────────────────────────

@app.route('/api/blockchain/validate', methods=['GET'])
def validate_chain():
    """Validate the entire blockchain."""
    try:
        is_valid = voting_chain.is_chain_valid()
        return jsonify({
            'valid': is_valid,
            'stats': voting_chain.get_stats(),
            'chain': voting_chain.get_chain()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Run ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("  Blockchain E-Voting System")
    print("  http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
