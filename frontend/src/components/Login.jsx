import { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, Key } from 'lucide-react';
import { API_BASE } from '../config';
import GovBanner from './GovBanner';
import GovSealSVG from './GovSealSVG';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Patient');
  const [associatedId, setAssociatedId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientHealthId, setPatientHealthId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
      let payload = { username, password };
      if (isRegister) {
        payload.role = role;
        if (role === 'Patient') {
          payload.associated_id = null;
          payload.patient_name = patientName || username;
          payload.patient_age = patientAge ? parseInt(patientAge) : null;
          payload.patient_gender = patientGender;
          payload.patient_health_id = patientHealthId;
        } else {
          payload.associated_id = associatedId || null;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = 'An error occurred during authentication';
        if (data && data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(err => {
              const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : '';
              return field ? `${field}: ${err.msg}` : err.msg;
            }).join(', ');
          } else if (typeof data.detail === 'object') {
            errorMsg = JSON.stringify(data.detail);
          }
        }
        throw new Error(errorMsg);
      }

      onLogin(data.access_token, {
        username: data.username,
        role: data.role,
        associated_id: data.associated_id
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderUsernameField = () => (
    <div>
      <label htmlFor="username">Username</label>
      <div style={{ position: 'relative' }}>
        <User size={16} style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'var(--text-muted)' 
        }} />
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          style={{ paddingLeft: '38px' }}
        />
      </div>
    </div>
  );

  const renderPasswordField = () => (
    <div>
      <label htmlFor="password">Password</label>
      <div style={{ position: 'relative' }}>
        <Lock size={16} style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'var(--text-muted)' 
        }} />
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ paddingLeft: '38px' }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', minHeight: '100vh', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <GovBanner />
      
      {/* Official Federal Agency Header */}
      <header style={{ 
        width: '100%', 
        padding: '16px 24px', 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottom: '2px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        zIndex: 5
      }}>
        <GovSealSVG style={{ width: '38px', height: '38px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <h1 style={{ 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            letterSpacing: '0.5px', 
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            margin: 0
          }}>
            Healthcare Claim Assurance & Fraud Intelligence Portal (HCAFIP)
          </h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
            Official Portal for Scheme Claims, Benefit Assurances & Illegal Fraud Detection
          </span>
        </div>
      </header>

      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '24px 16px' }}>
        <div className="glass-card auth-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <GovSealSVG className="usa-seal-svg" />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
              {isRegister ? 'SSO Credential Registration' : 'Secure Single Sign-On'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
              {isRegister 
                ? 'Register your official credentials with the federal healthcare network' 
                : 'Sign in to access secure benefit claims & intelligence registers'
              }
            </p>
          </div>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'var(--danger-light)', 
          color: 'var(--danger)', 
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 500,
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isRegister ? (
          <>
            {renderUsernameField()}
            {renderPasswordField()}
          </>
        ) : (
          <>
            <div>
              <label htmlFor="role">Platform Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Patient">Patient</option>
                <option value="Hospital">Hospital Provider</option>
                <option value="Government">Government Administrator</option>
                <option value="Investigator">Fraud Investigator</option>
              </select>
            </div>

            {role === 'Patient' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '3px solid var(--accent)', paddingLeft: '12px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PATIENT REGISTRATION INFO</div>
                  
                  <div>
                    <label htmlFor="patientName">Full Name</label>
                    <input 
                      id="patientName"
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="patientAge">Age</label>
                      <input 
                        id="patientAge"
                        type="number"
                        required
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="65"
                        min="0"
                        max="120"
                      />
                    </div>
                    <div>
                      <label htmlFor="patientGender">Gender</label>
                      <select 
                        id="patientGender"
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="patientHealthId">Government Health ID / Healthcard (e.g., HID-100200300)</label>
                    <input 
                      id="patientHealthId"
                      type="text"
                      required
                      value={patientHealthId}
                      onChange={(e) => setPatientHealthId(e.target.value)}
                      placeholder="HID-800900100"
                    />
                  </div>
                </div>
                {renderUsernameField()}
                {renderPasswordField()}
              </div>
            )}

            {role === 'Hospital' && (
              <>
                <div>
                  <label htmlFor="associatedId">Linked Hospital ID (e.g., HOSP-001)</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-muted)' 
                    }} />
                    <input
                      id="associatedId"
                      type="text"
                      required
                      value={associatedId}
                      onChange={(e) => setAssociatedId(e.target.value)}
                      placeholder="HOSP-001"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
                {renderUsernameField()}
                {renderPasswordField()}
              </>
            )}

            {(role === 'Government' || role === 'Investigator') && (
              <>
                {renderUsernameField()}
                {renderPasswordField()}
              </>
            )}
          </>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
          {loading ? 'Processing...' : isRegister ? 'Register & Login' : 'Sign In'}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '10px', 
        borderTop: '1px solid var(--border-color)', 
        paddingTop: '16px' 
      }}>
        <button 
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="btn btn-secondary"
          style={{ width: '100%', display: 'flex', gap: '8px', fontSize: '0.85rem' }}
        >
          {isRegister ? <Lock size={14} /> : <UserPlus size={14} />}
          {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </button>
      </div>

      {!isRegister && (
        <div style={{ 
          marginTop: '10px', 
          padding: '12px', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.4'
        }}>
          <strong>Demo Credentials:</strong><br />
          - Admin: <code>gov_admin</code> / <code>admin123</code><br />
          - Investigator: <code>investigator</code> / <code>intel123</code><br />
          - Hospital: <code>hosp_city</code> / <code>city123</code><br />
          - Patient: <code>patient_john</code> / <code>john123</code>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default Login;
