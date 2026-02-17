"""
Blockchain Implementation for E-Voting System
Uses SHA-256 hashing with Proof-of-Work consensus.
Each block stores a single vote with cryptographic chaining.
"""

import hashlib
import json
import time


class Block:
    """Represents a single block in the blockchain."""

    def __init__(self, index, timestamp, data, previous_hash, nonce=0):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self.calculate_hash()

    def calculate_hash(self):
        """Generate SHA-256 hash of the block contents."""
        block_string = json.dumps({
            'index': self.index,
            'timestamp': self.timestamp,
            'data': self.data,
            'previous_hash': self.previous_hash,
            'nonce': self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine_block(self, difficulty):
        """
        Proof-of-Work: find a nonce that produces a hash
        starting with `difficulty` number of leading zeros.
        """
        target = '0' * difficulty
        while self.hash[:difficulty] != target:
            self.nonce += 1
            self.hash = self.calculate_hash()
        return self.hash

    def to_dict(self):
        """Serialize block to dictionary."""
        return {
            'index': self.index,
            'timestamp': self.timestamp,
            'data': self.data,
            'previous_hash': self.previous_hash,
            'nonce': self.nonce,
            'hash': self.hash
        }


class Blockchain:
    """Custom blockchain for recording votes with PoW consensus."""

    def __init__(self, difficulty=4):
        self.chain = []
        self.difficulty = difficulty
        self._create_genesis_block()

    def _create_genesis_block(self):
        """Create the first block in the chain."""
        genesis = Block(0, time.time(), {'type': 'genesis', 'message': 'Genesis Block'}, '0')
        genesis.mine_block(self.difficulty)
        self.chain.append(genesis)

    def get_latest_block(self):
        """Return the most recent block."""
        return self.chain[-1]

    def add_vote(self, voter_id, candidate):
        """
        Create a new block containing a vote,
        mine it, and append to the chain.
        Returns the mined block.
        """
        vote_data = {
            'type': 'vote',
            'voter_id': voter_id,
            'candidate': candidate,
            'timestamp': time.time()
        }
        new_block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            data=vote_data,
            previous_hash=self.get_latest_block().hash
        )
        new_block.mine_block(self.difficulty)
        self.chain.append(new_block)
        return new_block

    def is_chain_valid(self):
        """
        Validate the entire blockchain:
        - Each block's stored hash matches its recalculated hash
        - Each block's previous_hash matches the prior block's hash
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Recalculate and compare hash
            if current.hash != current.calculate_hash():
                return False

            # Verify chain linkage
            if current.previous_hash != previous.hash:
                return False

        return True

    def find_vote(self, voter_id):
        """Search the chain for a vote cast by the given voter."""
        for block in self.chain:
            if block.data.get('type') == 'vote' and block.data.get('voter_id') == voter_id:
                return block.to_dict()
        return None

    def get_chain(self):
        """Return the full chain as a list of dicts."""
        return [block.to_dict() for block in self.chain]

    def get_stats(self):
        """Return chain statistics."""
        vote_blocks = [b for b in self.chain if b.data.get('type') == 'vote']
        return {
            'total_blocks': len(self.chain),
            'total_votes': len(vote_blocks),
            'difficulty': self.difficulty,
            'latest_hash': self.get_latest_block().hash,
            'is_valid': self.is_chain_valid()
        }
