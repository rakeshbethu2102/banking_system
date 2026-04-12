from flask import Flask, render_template, request, jsonify, session, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import json
import re
from datetime import datetime
import secrets
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(16))

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///banking_system.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# CORS Configuration
CORS(app, resources={r"/api/*": {"origins": [os.getenv('FRONTEND_URL', 'http://localhost:3000')]}})

# Database Model for Users
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    salt = db.Column(db.String(256), nullable=False)
    pin_hash = db.Column(db.String(256), nullable=False)
    pin_salt = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone
        }

# Create tables
with app.app_context():
    db.create_all()

# Session token storage
logged_in_users = {}

# Helper function to hash passwords
def hash_password(password):
    """Hash a password for storing."""
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('ascii'), 100000)
    return (pwdhash.hex(), salt)

# Dummy banking data
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
        }
    }
}

@app.route('/')
def index():
    return jsonify({'message': 'Banking System API Server Running'})

@app.route('/process_speech', methods=['POST'])
def process_speech():
    try:
        data = request.json
        speech_text = data.get('text', '')
        lang = data.get('language', 'en')
        
        if not speech_text:
            return jsonify({'error': 'No speech text provided'}), 400
        
        return jsonify({
            'success': True,
            'response': 'Speech processing placeholder',
            'original_text': speech_text,
            'language': lang
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Authentication routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        required_fields = ['username', 'password', 'pin', 'email', 'firstName', 'lastName', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        username = data['username']
        password = data['password']
        pin = data['pin']
        email = data['email']
        
        # Check if PIN is exactly 4 digits
        if not pin.isdigit() or len(pin) != 4:
            return jsonify({'success': False, 'message': 'PIN must be a 4 digit number'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
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
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            phone=data.get('phone', '')
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'User registered successfully'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password are required'}), 400
        
        # Find user in database
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 400
        
        # Verify password
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), user.salt.encode('ascii'), 100000)
        if pwdhash.hex() != user.password_hash:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 400
        
        # Create session token
        session_token = secrets.token_hex(32)
        logged_in_users[session_token] = username
        
        return jsonify({
            'success': True, 
            'message': 'Login successful',
            'token': session_token,
            'user': user.to_dict()
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if token in logged_in_users:
            del logged_in_users[token]
            return jsonify({'success': True, 'message': 'Logged out successfully'})
        else:
            return jsonify({
