import React, { useState, useEffect, useRef } from 'react';
import VoiceAuth from '../utils/VoiceAuth';
import { authService } from '../services/api';
import './AuthStyles.css';

import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";

const LoginPage = ({ login }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState(''); // For voice authentication status
  
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
      
      // If both username and password are captured, auto-submit
        if (parsedData.username && parsedData.password) {
        // Auto-fill form with parsed data
        setFormData({
          username: parsedData.username,
          password: parsedData.password
        });
        
        // Optionally auto-submit if both fields are filled
        // Uncomment the following lines if auto-submit is desired:
        // setTimeout(() => {
        //   handleVoiceSubmit(parsedData);
        // }, 1000);
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

  const handleVoiceSubmit = async (parsedData) => {
    if (!parsedData.username || !parsedData.password) {
      setError('Please provide both username and password through voice');
      speak('Please provide both username and password', 'దయచేసి ఉపయోగనామం మరియు పాస్‌వర్డ్ రెండింటినీ అందించండి');
      return;
    }
    
    // Set form data and trigger submit
    setFormData({
      username: parsedData.username,
      password: parsedData.password
    });
    
    // Submit the form
    await handleSubmitFromData({
      username: parsedData.username,
      password: parsedData.password
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmitFromData = async (data) => {
    setIsLoading(true);
    setError('');
    setAuthStatus('Authenticating...');
    
    try {
      const response = await authService.login(data);
      
      if (response.success) {
        login(response); // Pass the full response object
        speak(`Welcome back, ${response.user.firstName || response.user.username}!`, `మళ్లీ స్వాగతం, ${response.user.firstName || response.user.username}!`);
        setAuthStatus('Login successful!');
        // Navigation is handled by App router when isAuthenticated becomes true
      } else {
        setError(response.message || 'Login failed');
        speak(response.message || 'Hmm, login didn\'t work. Give it another shot.', 'హమ్, లోగిన్ జరగలేదు. మళ్లీ ప్రయత్నించండి.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
      speak('Login failed, please try again', 'లోగిన్ విఫల‌మైంది, దయచేసి మళ్లీ ప్రయత్నించండి');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      speak('Please enter both username and password', 'దయచేసి ఉపయోగనామం మరియు పాస్‌వర్డ్ రెండింటిని నమోదు చేయండి');
      return;
    }
    
    await handleSubmitFromData(formData);
  };
  
  // Auto-login if both username and password are filled from voice input
  useEffect(() => {
    if (formData.username && formData.password && formData.username.trim() && formData.password.trim()) {
      const autoLogin = async () => {
        if (!isLoading && !authStatus.includes('Authenticating')) {
          await handleSubmitFromData(formData);
        }
      };
      
      // Only auto-login if both fields were populated via voice
      if (authStatus.includes('Heard:')) {
        const timer = setTimeout(() => {
          autoLogin();
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [formData]);

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
      speak('Error initializing voice recognition', 'వాయిస్ గుర్తింపును ప్రారంభిస్తున్నప్పుడు లో పొరతుంది');
    }
  };

  const getReply = (en, te) => (voiceLang.startsWith('te') ? te : en);
  const speak = (en, te = en) => {
    if (voiceAuthRef.current) {
      const msg = getReply(en, te);
      voiceAuthRef.current.speak(msg, { lang: voiceLang });
    }
  };

  const speakInstruction = (instruction) => {
    speak(instruction, instruction);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎙️ voiceBank Login</h1>
          <p>Welcome back! Please sign in to access your account</p>
          <p style={{fontSize:'0.85rem',color:'#555',marginTop:'6px'}}>Note: you will be asked for your 4-digit PIN on the dashboard to view account details.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-danger" role="alert" style={{marginBottom: '20px', borderRadius: '8px', padding: '14px', background: '#ffe8e8', border: '1px solid #ffcccc', color: '#d32f2f'}}>
              <strong>⚠ Error:</strong> {error}
            </div>
          )}
          
          {authStatus && !authStatus.includes('Authenticating') && (
            <div className={`alert ${authStatus.includes('Heard') ? 'alert-info' : 'alert-success'}`} role="alert" style={{marginBottom: '20px', borderRadius: '8px', padding: '14px', background: authStatus.includes('Heard') ? '#e3f2fd' : '#d4edda', border: authStatus.includes('Heard') ? '1px solid #90caf9' : '1px solid #c3e6cb', color: authStatus.includes('Heard') ? '#1565c0' : '#155724'}}>
              ℹ️ {authStatus}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="username">👤 Username</label>
            <div className="input-with-voice">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                aria-label="Username"
              />
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={() => {
                  startVoiceRecognition();
                  speakInstruction(getReply("Please say your username","దయచేసి మీ ఉపయోగనామం చెప్పండి"));
                }}
                title="Use voice input for username"
                aria-label="Voice input for username"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">🔐 Password</label>
            <div className="input-with-voice">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
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

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" aria-label="Remember me" />
              <span className="checkmark"></span>
              Remember me
            </label>
            <a href="#forgot-password" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="auth-btn" disabled={authStatus.includes('Authenticating')}>
            {authStatus.includes('Authenticating') ? '🔄 Signing In...' : '✓ Sign In'}
          </button>
        </form>

        <div className="voice-instructions">
          <h3>🎙️ Voice Commands</h3>
          <ul>
            <li>Say: "My username is john_doe and password is secret123"</li>
            <li>Say: "Login with username john_doe and password secret123"</li>
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
          <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;