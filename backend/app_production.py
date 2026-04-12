"""
Production Flask Application with Database Support
Supports SQLite (local) and PostgreSQL (production)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import secrets
import hashlib
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(16))

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///banking_system.db')

# Handle PostgreSQL URL format from Railway
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# CORS Configuration
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS(app, resources={
    r"/api/*": {
        "origins": [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ==================== Database Models ====================

class User(db.Model):
    """User model for database storage"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    salt = db.Column(db.String(256), nullable=False)
    pin_hash = db.Column(db.String(256), nullable=False)
    pin_salt = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'createdAt': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<User {self.username}>'


# Create database tables
with app.app_context():
    try:
        db.create_all()
        print("✓ Database tables created successfully")
    except Exception as e:
        print(f"✗ Error creating database tables: {e}")

# ==================== Session Management ====================

# In-memory session storage (for tokens)
# In production with multiple workers, consider Redis
logged_in_users = {}

# ==================== Helper Functions ====================

def hash_password(password):
    """
    Hash a password for secure storage
    Returns tuple: (password_hash, salt)
    """
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('ascii'),
        100000
    )
    return (pwdhash.hex(), salt)


def verify_password(stored_hash, stored_salt, provided_password):
    """Verify a password against stored hash"""
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256',
        provided_password.encode('utf-8'),
        stored_salt.encode('ascii'),
        100000
    )
    return pwdhash.hex() == stored_hash


def authenticate_request():
    """Extract and validate authentication token from request"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in logged_in_users:
        return logged_in_users[token]
    return None


# ==================== Banking Data ====================

banking_data = {
    "account_balance": 15750.50,
    "account_number": "XXXX-XXXX-1234",
    "recent_transactions": [
        {"date": "2024-01-15", "description": "Salary Credit", "amount": 25000.00, "type": "credit"},
        {"date": "2024-01-12", "description": "Electricity Bill", "amount": 1200.00, "type": "debit"},
        {"date": "2024-01-10", "description": "Grocery Shopping", "amount": 2450.50, "type": "debit"},
        {"date": "2024-01-08", "description": "Mobile Recharge", "amount": 300.00, "type": "debit"},
        {"date": "2024-01-05", "description": "ATM Withdrawal", "amount": 5000.00, "type": "debit"}
    ],
    "loan_info": {
        "personal_loan": {
            "status": "Active",
            "amount": 100000.00,
            "emi": 8750.00,
            "tenure": "12 months",
            "remaining_emis": 8
        },
        "home_loan": {
            "status": "Closed",
            "amount": 1500000.00,
            "emi": 15000.00,
            "tenure": "120 months",
            "remaining_emis": 0
        }
    },
    "transfer_limits": {
        "daily_limit": 100000.00,
        "available_today": 75000.00
    }
}

# ==================== Routes ====================

@app.route('/', methods=['GET'])
def index():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'message': 'Banking System API Server',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check for deployment"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500


# ==================== Authentication Routes ====================

@app.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user
    Required fields: username, password, pin, email, firstName, lastName, phone
    """
    try:
        data = request.json

        # Validate required fields
        required_fields = ['username', 'password', 'pin', 'email', 'firstName', 'lastName', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400

        username = data['username'].strip()
        password = data['password']
        pin = data['pin'].strip()
        email = data['email'].strip().lower()

        # Validate username length
        if len(username) < 3 or len(username) > 80:
            return jsonify({
                'success': False,
                'message': 'Username must be between 3 and 80 characters'
            }), 400

        # Validate password strength
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters'
            }), 400

        # Validate PIN is exactly 4 digits
        if not pin.isdigit() or len(pin) != 4:
            return jsonify({
                'success': False,
                'message': 'PIN must be exactly 4 digits'
            }), 400

        # Check if username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 409

        # Check if email already exists
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409

        # Hash password and PIN
        hashed_pwd, pwd_salt = hash_password(password)
        hashed_pin, pin_salt = hash_password(pin)

        # Create new user
        new_user = User(
            username=username,
            password_hash=hashed_pwd,
            salt=pwd_salt,
            pin_hash=hashed_pin,
            pin_salt=pin_salt,
            email=email,
            first_name=data.get('firstName', '').strip(),
            last_name=data.get('lastName', '').strip(),
            phone=data.get('phone', '').strip()
        )

        # Save to database
        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500


@app.route('/api/login', methods=['POST'])
def login():
    """
    Login user
    Required fields: username, password
    Returns: token and user info
    """
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')

        # Validate input
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400

        # Find user in database
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        # Verify password
        if not verify_password(user.password_hash, user.salt, password):
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        # Create session token
        session_token = secrets.token_hex(32)
        logged_in_users[session_token] = username

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': session_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'Login failed'
        }), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user by removing token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

        if token in logged_in_users:
            del logged_in_users[token]
            return jsonify({
                'success': True,
                'message': 'Logged out successfully'
            }), 200

        return jsonify({
            'success': False,
            'message': 'Invalid session'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500


# ==================== Protected Routes ====================

@app.route('/api/protected/test', methods=['GET'])
def protected_test():
    """Test protected endpoint - requires authentication"""
    try:
        user = authenticate_request()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        return jsonify({
            'success': True,
            'message': f'Access granted for {user}',
            'user': user
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error'
        }), 500


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """Get dashboard data - requires authentication"""
    try:
        user = authenticate_request()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        return jsonify({
            'success': True,
            'data': banking_data,
            'user': user
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error fetching dashboard'
        }), 500


@app.route('/api/account', methods=['POST'])
def account_info():
    """Get account info - requires authentication and PIN"""
    try:
        user = authenticate_request()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        data = request.json or {}
        pin = data.get('pin', '').strip()

        if not pin:
            return jsonify({
                'success': False,
                'message': 'PIN required to access account'
            }), 400

        # Find user and verify PIN
        user_record = User.query.filter_by(username=user).first()
        if not user_record:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Verify PIN
        if not verify_password(user_record.pin_hash, user_record.pin_salt, pin):
            return jsonify({
                'success': False,
                'message': 'Invalid PIN'
            }), 401

        account_info_data = {
            'balance': banking_data['account_balance'],
            'number': banking_data['account_number'],
            'available_today': banking_data['transfer_limits']['available_today']
        }

        return jsonify({
            'success': True,
            'account': account_info_data
        }), 200

    except Exception as e:
        print(f"Account info error: {e}")
        return jsonify({
            'success': False,
            'message': 'Error fetching account info'
        }), 500


@app.route('/api/transactions', methods=['GET'])
def transactions():
    """Get transaction history - requires authentication"""
    try:
        user = authenticate_request()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        return jsonify({
            'success': True,
            'transactions': banking_data['recent_transactions']
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error fetching transactions'
        }), 500


@app.route('/api/loans', methods=['GET'])
def loans():
    """Get loan information - requires authentication"""
    try:
        user = authenticate_request()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        return jsonify({
            'success': True,
            'loans': banking_data['loan_info']
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error fetching loans'
        }), 500


# ==================== Speech Processing ====================

@app.route('/process_speech', methods=['POST'])
def process_speech():
    """Process speech commands"""
    try:
        data = request.json
        speech_text = data.get('text', '')
        language = data.get('language', 'en')

        if not speech_text:
            return jsonify({
                'error': 'No speech text provided'
            }), 400

        # Placeholder for speech processing
        return jsonify({
            'success': True,
            'response': f'Speech processing: {speech_text}',
            'original_text': speech_text,
            'language': language
        }), 200

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    db.session.rollback()
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500


# ==================== Main ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'

    print(f"\n{'='*50}")
    print("🚀 Starting Banking System API")
    print(f"{'='*50}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Port: {port}")
    print(f"Debug Mode: {debug}")
    print(f"{'='*50}\n")

    app.run(debug=debug, host='0.0.0.0', port=port, threaded=True)
