import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Send, 
  Zap
} from 'lucide-react';
import { API_BASE } from '../config';

function InvestigatorDashboard({ activeTab, token }) {
  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Assistant state
  const [flaggedClaims, setFlaggedClaims] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef(null);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/fraud/alerts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [headers]);

  const fetchFlaggedClaims = useCallback(async () => {
    try {
      // Investigators can list claims
      const res = await fetch(`${API_BASE}/claims/list`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Filter by flagged or pending status
        const flagged = data.filter(c => c.status === 'FLAGGED' || c.ml_risk_score > 50);
        setFlaggedClaims(flagged);
      }
    } catch (err) {
      console.error("Error fetching flagged claims:", err);
    }
  }, [headers]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts();
    } else if (activeTab === 'assistant') {
      fetchFlaggedClaims();
    }
  }, [activeTab, fetchAlerts, fetchFlaggedClaims]);

  // Scroll to bottom of chat when logs update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSelectClaim = async (claimId) => {
    setSelectedClaimId(claimId);
    if (!claimId) {
      setChatLog([]);
      return;
    }

    setChatLoading(true);
    // Load initial Gemini explanation (without query parameter)
    try {
      const res = await fetch(`${API_BASE}/fraud/claim/${claimId}/explain`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChatLog([
          {
            sender: 'assistant',
            text: data.explanation,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setChatLog([
          {
            sender: 'assistant',
            text: "Failed to generate initial AI explanation. Ensure Gemini API key is configured.",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (err) {
      console.error("Error explaining claim:", err);
      setChatLog([
        {
          sender: 'assistant',
          text: "Error connecting to AI explanation service.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedClaimId || chatLoading) return;

    const userMessage = userInput.trim();
    setUserInput('');
    
    // Add user message to log
    setChatLog(prev => [
      ...prev,
      {
        sender: 'user',
        text: userMessage,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setChatLoading(true);

    try {
      // Query Gemini with the custom question
      const res = await fetch(`${API_BASE}/fraud/claim/${selectedClaimId}/explain?query=${encodeURIComponent(userMessage)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChatLog(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: data.explanation,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setChatLog(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: "The AI assistant encountered an error. Please try again.",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      setChatLog(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "Connection lost. Failed to fetch response.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score < 30) return 'var(--success)';
    if (score < 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (activeTab === 'alerts') {
    return (
      <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} className="text-danger" style={{ color: 'var(--danger)' }} />
          Active Fraud Alerts Queue
        </h3>
        
        {alertsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Retrieving active fraud alerts...</div>
        ) : alerts.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Patient Name</th>
                  <th>Claim ID</th>
                  <th>Triggered Flag / Rule</th>
                  <th>Risk Score</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.alert_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{alert.alert_id.substring(0, 8)}...</td>
                    <td style={{ fontWeight: 600 }}>{alert.patient_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{alert.claim_id ? `${alert.claim_id.substring(0, 8)}...` : 'N/A'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={alert.reason}>
                      {alert.reason}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: getRiskColor(alert.risk_score) }}>
                        {alert.risk_score}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {alert.claim_id && (
                        <button
                          onClick={() => {
                            // Direct switch can be handled if we pass state up, or we can just guide them
                            alert(`To review this claim using AI, head over to the Gemini Assistant tab and select Claim ID ${alert.claim_id.substring(0, 8)}...`);
                          }}
                          className="btn btn-secondary animate-pulse"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', gap: '6px', color: 'var(--accent)', borderColor: 'var(--accent-light)' }}
                        >
                          <Shield size={12} />
                          AI Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No active fraud alerts detected. The ML network reports normal activity.
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'assistant') {
    return (
      <div className="grid-3 animate-fade-in" style={{ gridTemplateColumns: '320px 1fr' }}>
        {/* Selector sidebar panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--warning)' }} />
            Flagged Cases
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Select a flagged claim to review system logs and request explanations from Gemini.
          </p>

          <div>
            <label htmlFor="claim_select">Select Claim ID</label>
            <select
              id="claim_select"
              value={selectedClaimId}
              onChange={(e) => handleSelectClaim(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">-- Choose Claim --</option>
              {flaggedClaims.map(c => (
                <option key={c.claim_id} value={c.claim_id}>
                  {c.claim_id.substring(0, 8)}... | ${c.amount} ({c.ml_risk_score}%)
                </option>
              ))}
            </select>
          </div>

          {selectedClaimId && (
            <div style={{ 
              marginTop: '10px', 
              padding: '12px', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Case Meta:</div>
              {(() => {
                const claim = flaggedClaims.find(c => c.claim_id === selectedClaimId);
                if (!claim) return null;
                return (
                  <>
                    <div>Patient: <strong>{claim.patient_name}</strong></div>
                    <div>Facility: <strong>{claim.hospital_name}</strong></div>
                    <div>Amount: <strong>${claim.amount}</strong></div>
                    <div>ML Score: <strong style={{ color: getRiskColor(claim.ml_risk_score) }}>{claim.ml_risk_score}%</strong></div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Chat window */}
        <div className="chat-container">
          {/* Header */}
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)', 
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Shield size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Gemini Healthcare Fraud Investigator Assistant</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Model: gemini-2.5-flash</div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {!selectedClaimId ? (
              <div style={{ 
                margin: 'auto', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Shield size={36} style={{ color: 'var(--text-muted)' }} />
                <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>Select a Flagged Claim</div>
                <div style={{ fontSize: '0.8rem' }}>
                  Choose a suspicious claim from the list on the left to pull clinical details and begin the AI-driven audit.
                </div>
              </div>
            ) : (
              <>
                {chatLog.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.sender}`}>
                    <div className="chat-message-meta">
                      {msg.sender === 'assistant' ? 'Gemini Assistant' : 'Investigator'} • {msg.timestamp}
                    </div>
                    {/* Render newlines */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="chat-message assistant" style={{ display: 'flex', gap: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out' }}></span>
                      <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></span>
                      <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gemini is auditing medical history records...</span>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="chat-input-area">
            <input
              type="text"
              placeholder={selectedClaimId ? "Ask a follow-up query (e.g. 'Is there overlapping treatment dates?')" : "Choose a case first..."}
              disabled={!selectedClaimId || chatLoading}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '10px 14px' }}
              disabled={!selectedClaimId || chatLoading}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

export default InvestigatorDashboard;
