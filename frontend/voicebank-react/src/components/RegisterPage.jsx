import React, { useState, useEffect, useRef } from 'react';
import VoiceAuth from '../utils/VoiceAuth';
import { authService } from '../services/api';
import './AuthStyles.css';
import { Link } from "react-router-dom";

import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    pin: '',
    aadhaar: '',
    dob: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState(''); // For voice authentication status
  const [voiceLang, setVoiceLang] = useState('en-US'); // language for voice recognition
  
  const voiceAuthRef = useRef(null);

  // Initialize voice authentication
  useEffect(() => {
    voiceAuthRef.current = new VoiceAuth();
    
    // Set up callbacks
    voiceAuthRef.current.setOnResult((transcript) => {
      setIsListening(false);
      setAuthStatus(`Heard: ${transcript}`);
      
      // Parse the command
      const parsedData = voiceAuthRef.current.parseAuthCommand(transcript);
      
      // Update form data based on parsed data
      if (parsedData.firstName) {
        setFormData(prev => ({
          ...prev,
          firstName: parsedData.firstName
        }));
      }
      
      if (parsedData.lastName) {
        setFormData(prev => ({
          ...prev,
          lastName: parsedData.lastName
        }));
      }
      
      if (parsedData.email) {
        setFormData(prev => ({
          ...prev,
          email: parsedData.email
        }));
      }
      
      if (parsedData.phone) {
        setFormData(prev => ({
          ...prev,
          phone: parsedData.phone
        }));
      }
      
      if (parsedData.username) {
        setFormData(prev => ({
          ...prev,
          username: parsedData.username
        }));
      }
      
      if (parsedData.password) {
        setFormData(prev => ({
          ...prev,
          password: parsedData.password
        }));
      }
      if (parsedData.pin) {
        setFormData(prev => ({
          ...prev,
          pin: parsedData.pin
        }));
      }
    });
    
    voiceAuthRef.current.setOnError((event) => {
      setIsListening(false);
      setAuthStatus('');
      setError(`Voice recognition error: ${event.error}`);
      speak(`Sorry, I couldn't understand that. ${event.error}`, `క్షమించండి, నేను అర్థం చేసుకోలేదు. ${event.error}`);
    });
    
    voiceAuthRef.current.setOnStart(() => {
      setIsListening(true);
      setAuthStatus('Listening...');
      setError('');
    });
    
    voiceAuthRef.current.setOnEnd(() => {
      setIsListening(false);
      if (authStatus === 'Listening...') {
        setAuthStatus('');
      }
    });
    
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = () => {
        // Voices are loaded
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (voiceAuthRef.current) {
        voiceAuthRef.current.abort();
      }
    };
  }, []);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'pin') {
      // only digits up to 4
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.username || !formData.password || !formData.pin) {
      setError('Please fill in all required fields');
      speak('Please fill in all required fields', 'దయచేసి అవసరమైన అన్ని ఫీల్డ్లను పూరించండి');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      speak('Passwords do not match', 'పాస్‌వర్డ్లు సరిపోలలేకపోతున్నాయి');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      speak('Password must be at least 6 characters', 'పాస్‌వర్డ్ కనీసం 6 అక్షరాల ఉండాలి');
      return;
    }

    if (!/^[0-9]{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      speak('PIN must be exactly four digits', 'పిన్ తప్పక నలుగురు అంకెలుగా ఉండాలి');
      return;
    }
    
    setIsLoading(true);
    setAuthStatus('Creating your account...');
    setError('');
    
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        username: formData.username,
        password: formData.password,
        pin: formData.pin,
      };
      
      const response = await authService.register(userData);
      
      if (response.success) {
        setSuccess('Registration successful! You can now log in.');
        speak('Registration successful! You can now log in.', 'నమోదు విజయవంతంగా జరిగింది! మీరు ఇప్పుడు లాగిన్ చేయవచ్చు.');
        setAuthStatus('');
        
        // After a short pause, navigate to the login page
        setTimeout(() => {
          navigate('/login');
        }, 1500);

        // Reset form after successful registration
        setTimeout(() => {
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            username: '',
            password: '',
            confirmPassword: '',
            pin: '',
            aadhaar: '',
            dob: ''
          });
        }, 2000);
      } else {
        setError(response.message || 'Registration failed');
        speak(response.message || 'Registration failed', 'నమోదు విఫలమైంది');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      speak('Something went wrong with registration; let\'s give it another go.', 'నమోదు సమయంలో లోపం జరిగింది; దయచేసి మళ్లీ ప్రయత్నించండి.');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    if (!voiceAuthRef.current.isSupported) {
      setError('Voice recognition not supported in your browser');
      speak('Voice recognition is not supported in your browser', 'మీ బ్రౌజర్‌లో వాయిస్ గుర్తింపు మద్దతు లేదు');
      return;
    }
    
    try {
      voiceAuthRef.current.initialize({
        continuous: false,
        interimResults: false,
        language: voiceLang // use selected language
      });
      voiceAuthRef.current.start();
    } catch (err) {
      setError(err.message);
      speak('Error initializing voice recognition', 'వాయిస్ గుర్తింపును ప్రారంభిస్తుండగా పผิดశIFA');
    }
  };
  
  // Auto-fill form based on voice input
  useEffect(() => {
    if (authStatus.includes('Heard:')) {
      // Process parsed data automatically
    }
  }, [authStatus]);

  // helper to localize frontend messages
  const getReply = (en, te) => (voiceLang.startsWith('te') ? te : en);

  const speak = (en, te = en) => {
    if (voiceAuthRef.current) {
      const msg = getReply(en, te);
      voiceAuthRef.current.speak(msg, { lang: voiceLang });
    }
  };

  const speakInstruction = (instruction) => {
    speak(instruction, instruction); // can pass Telugu variations when calling
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎙️ voiceBank Register</h1>
          <p>Create your account to access voice banking services</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-danger" role="alert" style={{marginBottom: '20px', borderRadius: '8px', padding: '14px', background: '#ffe8e8', border: '1px solid #ffcccc', color: '#d32f2f'}}>
              <strong>⚠ Error:</strong> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success" role="alert" style={{marginBottom: '20px', borderRadius: '8px', padding: '14px', background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724'}}>
              <strong>✓ Success:</strong> {success}
            </div>
          )}
          
          {authStatus && !success && (
            <div className={`alert ${authStatus.includes('Error') || authStatus.includes('Invalid') ? 'alert-danger' : 'alert-info'}`} role="alert" style={{marginBottom: '20px', borderRadius: '8px', padding: '14px', background: authStatus.includes('Error') ? '#ffe8e8' : '#e3f2fd', border: authStatus.includes('Error') ? '1px solid #ffcccc' : '1px solid #90caf9', color: authStatus.includes('Error') ? '#d32f2f' : '#1565c0'}}>
              ℹ️ {authStatus}
            </div>
          )}

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="firstName">👤 First Name *</label>
              <div className="input-with-voice">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  aria-label="First name"
                />
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your first name","దయచేసి మీ మొదటి పేరు చెప్పండి"));
                  }}
                  title="Use voice input for first name"
                  aria-label="Voice input for first name"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="lastName">👤 Last Name *</label>
              <div className="input-with-voice">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  aria-label="Last name"
                />
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your last name","దయచేసి మీ ఇంటిమిదటి పేరు చెప్పండి"));
                  }}
                  title="Use voice input for last name"
                  aria-label="Voice input for last name"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="email">✉️ Email *</label>
              <div className="input-with-voice">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  aria-label="Email address"
                />
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your email address","దయచేసి మీ ఇమెయిల్ చిరునామా చెప్పండి"));
                  }}
                  title="Use voice input for email"
                  aria-label="Voice input for email"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="phone">📱 Phone Number *</label>
              <div className="input-with-voice">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  aria-label="Phone number"
                />
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your phone number","దయచేసి మీ ఫోన్ నంబర్ చెప్పండి"));
                  }}
                  title="Use voice input for phone number"
                  aria-label="Voice input for phone number"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="username">🔐 Username *</label>
            <div className="input-with-voice">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                aria-label="Username"
              />
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={() => {
                  startVoiceRecognition();
                  speakInstruction(getReply("Please say your desired username","దయచేసి మీ కోరుకున్న ఉపయోగనామం చెప్పండి"));
                }}
                title="Use voice input for username"
                aria-label="Voice input for username"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="pin">🔢 4‑digit PIN *</label>
            <div className="input-with-voice">
              <input
                type={showPassword ? "text" : "password"}
                id="pin"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                placeholder="Enter PIN (e.g. 1234)"
                maxLength={4}
                aria-label="4 digit PIN"
                pattern="\d*"
              />
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={() => {
                  startVoiceRecognition();
                  speakInstruction(getReply("Please say your four digit pin","దయచేసి మీ నాలుగు అంకెల పిన్ చెప్పండి"));
                }}
                title="Use voice input for PIN"
                aria-label="Voice input for PIN"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="password">🔑 Password *</label>
              <div className="input-with-voice">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  title="Show/hide password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your password","దయచేసి మీ పాస్‌వర్డ్ చెప్పండి"));
                  }}
                  title="Use voice input for password"
                  aria-label="Voice input for password"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">🔑 Confirm Password *</label>
              <div className="input-with-voice">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  aria-label="Confirm password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title="Show/hide confirm password"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your password again to confirm","దయచేసి మీ పాస్‌వర్డ్‌ను మరోసారి నిర్ధారించడానికి చెప్పండి"));
                  }}
                  title="Use voice input for confirm password"
                  aria-label="Voice input for confirm password"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="aadhaar">🆔 Aadhaar Number</label>
              <div className="input-with-voice">
                <input
                  type="text"
                  id="aadhaar"
                  name="aadhaar"
                  value={formData.aadhaar}
                  onChange={handleChange}
                  placeholder="Enter Aadhaar number (optional)"
                  aria-label="Aadhaar number"
                />
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => {
                    startVoiceRecognition();
                    speakInstruction(getReply("Please say your Aadhaar number","దయచేసి మీ ఆధార్ నంబర్ చెప్పండి"));
                  }}
                  title="Use voice input for Aadhaar number"
                  aria-label="Voice input for Aadhaar number"
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="dob">📅 Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                aria-label="Date of birth"
              />
            </div>
          </div>

          <div className="form-agreement">
            <label className="checkbox-label">
              <input type="checkbox" required aria-label="Agree to terms" />
              <span className="checkmark"></span>
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          <p style={{fontSize:'0.85rem',color:'#555',marginTop:'8px'}}>Your 4‑digit PIN will be required to unlock your account overview on the dashboard.</p>

          <button type="submit" className="auth-btn" disabled={authStatus.includes('Creating')}>
            {authStatus.includes('Creating') ? '🔄 Creating Account...' : '✓ Create Account'}
          </button>
        </form>

        <div className="voice-instructions">
          <h3>🎙️ Voice Commands</h3>
          <ul>
            <li>Say: "My name is John Doe, email is john@example.com, phone is 9876543210"</li>
            <li>Say: "Username is johndoe, password is secret123"</li>
            <li>Say: "PIN is 1234" to set a four-digit PIN</li>
          </ul>
          <div style={{marginTop:'12px', paddingTop: '12px', borderTop: '1px solid rgba(102,126,234,0.2)'}}>
            <label htmlFor="voiceLang" style={{marginRight:'8px',fontSize:'0.85rem', fontWeight: '600', color: '#555'}}>Language:</label>
            <select
              id="voiceLang"
              value={voiceLang}
              onChange={e => setVoiceLang(e.target.value)}
              style={{padding:'8px 12px',borderRadius:'6px', border: '1px solid #ddd', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500'}}
            >
              <option value="en-US">🇺🇸 English</option>
              <option value="te-IN">🇮🇳 తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;