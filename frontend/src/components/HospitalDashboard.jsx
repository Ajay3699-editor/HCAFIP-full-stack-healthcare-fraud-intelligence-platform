import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  Activity, 
  Upload, 
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { API_BASE } from '../config';

function HospitalDashboard({ activeTab, token, user }) {
  // Common lists
  const [patients, setPatients] = useState([]);
  const [schemes, setSchemes] = useState([]);
  
  // Claims form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimProcedure, setClaimProcedure] = useState('');
  const [claimMsg, setClaimMsg] = useState({ text: '', type: '' });
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Bill upload state
  const [ocrLoading, setOcrLoading] = useState(false);

  // Hospital claims queue
  const [hospitalClaims, setHospitalClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  // Treatment form state
  const [trtPatientId, setTrtPatientId] = useState('');
  const [trtProcedure, setTrtProcedure] = useState('');
  const [trtCost, setTrtCost] = useState('');
  const [trtDate, setTrtDate] = useState(new Date().toISOString().split('T')[0]);
  const [trtMsg, setTrtMsg] = useState({ text: '', type: '' });
  const [trtSubmitting, setTrtSubmitting] = useState(false);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`
  }), [token]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/list`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  }, [headers]);

  const fetchSchemes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/schemes`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSchemes(data);
      }
    } catch (err) {
      console.error("Error fetching schemes:", err);
    }
  }, [headers]);

  const fetchHospitalClaims = useCallback(async () => {
    if (!user.associated_id) return;
    setClaimsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/claims/hospital/${user.associated_id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHospitalClaims(data);
      }
    } catch (err) {
      console.error("Error fetching hospital claims:", err);
    } finally {
      setClaimsLoading(false);
    }
  }, [headers, user.associated_id]);

  useEffect(() => {
    fetchPatients();
    fetchSchemes();
    if (activeTab === 'claims') {
      fetchHospitalClaims();
    }
  }, [activeTab, fetchPatients, fetchSchemes, fetchHospitalClaims]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setClaimMsg({ text: '', type: '' });
    setClaimSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/claims`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          scheme_id: selectedSchemeId,
          amount: parseFloat(claimAmount),
          procedure: claimProcedure
        })
      });

      const data = await res.json();

      if (res.ok) {
        setClaimMsg({ 
          text: `Claim submitted successfully! Status: ${data.status} | ML Risk Score: ${data.ml_risk_score}%`, 
          type: 'success' 
        });
        // Clear fields
        setSelectedPatientId('');
        setSelectedSchemeId('');
        setClaimAmount('');
        setClaimProcedure('');
        fetchHospitalClaims();
      } else {
        let errorMsg = 'Failed to submit claim.';
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
        setClaimMsg({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error("Error submitting claim:", err);
      setClaimMsg({ text: 'Network error submitting claim', type: 'error' });
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setClaimMsg({ text: 'Analyzing invoice bill using OCR...', type: 'info' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/claims/upload-bill`, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        // Auto fill form
        setClaimProcedure(data.procedure);
        setClaimAmount(data.cost.toString());
        
        // Find matching patient by name if exists
        const matched = patients.find(p => p.name.toLowerCase().includes(data.patient_name.toLowerCase()));
        if (matched) {
          setSelectedPatientId(matched.patient_id);
        }

        setClaimMsg({ 
          text: `OCR Extraction complete! Filled procedure, amount, and auto-mapped Patient.`, 
          type: 'success' 
        });
      } else {
        let errorMsg = 'OCR bill analysis failed.';
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
        setClaimMsg({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error("Error in file upload OCR:", err);
      setClaimMsg({ text: 'Error connecting to OCR service.', type: 'error' });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    setTrtMsg({ text: '', type: '' });
    setTrtSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/treatments`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: trtPatientId,
          procedure: trtProcedure,
          cost: parseFloat(trtCost),
          date: new Date(trtDate).toISOString()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setTrtMsg({ text: 'Medical treatment history logged successfully!', type: 'success' });
        setTrtPatientId('');
        setTrtProcedure('');
        setTrtCost('');
      } else {
        let errorMsg = 'Failed to log treatment record.';
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
        setTrtMsg({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error("Error submitting treatment record:", err);
      setTrtMsg({ text: 'Error logging treatment record.', type: 'error' });
    } finally {
      setTrtSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
      case 'REJECTED': return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
      case 'FLAGGED': return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
      default: return <Clock size={14} style={{ color: 'var(--warning)' }} />;
    }
  };

  if (activeTab === 'claims') {
    return (
      <div className="grid-3 animate-fade-in">
        {/* Claim Submission Panel */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            File Benefit Claim
          </h3>

          {claimMsg.text && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: 
                claimMsg.type === 'success' ? 'var(--success-light)' : 
                claimMsg.type === 'info' ? 'var(--accent-light)' : 'var(--danger-light)', 
              color: 
                claimMsg.type === 'success' ? 'var(--success)' : 
                claimMsg.type === 'info' ? 'var(--accent)' : 'var(--danger)', 
              borderRadius: '6px',
              fontSize: '0.8rem',
              marginBottom: '14px',
              fontWeight: 500
            }}>
              {claimMsg.text}
            </div>
          )}

          {/* OCR File Upload Selector */}
          <div style={{ 
            border: '2px dashed var(--border-color)', 
            borderRadius: '8px', 
            padding: '16px', 
            textAlign: 'center', 
            marginBottom: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.01)'
          }}>
            <label htmlFor="bill_file" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={24} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>OCR Bill Uploader</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Upload medical invoice/bill to auto-fill</div>
            </label>
            <input 
              id="bill_file"
              type="file" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={ocrLoading}
            />
          </div>

          {/* Claim Fields form */}
          <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="c_patient">Patient Name</label>
              <select
                id="c_patient"
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.name} ({p.health_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="c_scheme">Benefit Scheme</label>
              <select
                id="c_scheme"
                required
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(e.target.value)}
              >
                <option value="">-- Select Scheme --</option>
                {schemes.map(s => (
                  <option key={s.scheme_id} value={s.scheme_id}>
                    {s.scheme_name} (Max: ${s.max_amount})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div>
                <label htmlFor="c_proc">Procedure</label>
                <input 
                  id="c_proc"
                  type="text" 
                  required 
                  placeholder="Cataract Surgery"
                  value={claimProcedure}
                  onChange={(e) => setClaimProcedure(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="c_amt">Amount ($)</label>
                <input 
                  id="c_amt"
                  type="number" 
                  step="0.01"
                  required 
                  placeholder="3200"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }} disabled={claimSubmitting || ocrLoading}>
              {claimSubmitting ? 'Verifying Benefits...' : 'Submit Claim'}
            </button>
          </form>
        </div>

        {/* Hospital Claim History Queue */}
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Claims Submission Log</h3>

          {claimsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading submitted claims...</div>
          ) : hospitalClaims.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Patient</th>
                    <th>Scheme</th>
                    <th>Amount</th>
                    <th>ML Risk</th>
                    <th>Status</th>
                    <th>Submission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalClaims.map((claim) => (
                    <tr key={claim.claim_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{claim.claim_id.substring(0, 8)}...</td>
                      <td>{claim.patient_name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{claim.scheme_name}</td>
                      <td style={{ fontWeight: 600 }}>${claim.amount.toFixed(2)}</td>
                      <td>
                        <span style={{ 
                          fontWeight: 700, 
                          color: claim.ml_risk_score > 60 ? 'var(--danger)' : claim.ml_risk_score > 30 ? 'var(--warning)' : 'var(--success)'
                        }}>
                          {claim.ml_risk_score}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          claim.status === 'APPROVED' ? 'badge-success' :
                          claim.status === 'REJECTED' ? 'badge-danger' :
                          claim.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          {getStatusIcon(claim.status)}
                          {claim.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(claim.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No claims submitted yet from this facility.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'treatment') {
    return (
      <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
          Record Patient Treatment History
        </h3>

        {trtMsg.text && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: trtMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', 
            color: trtMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', 
            borderRadius: '6px',
            fontSize: '0.8rem',
            marginBottom: '14px',
            fontWeight: 500
          }}>
            {trtMsg.text}
          </div>
        )}

        <form onSubmit={handleTreatmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="t_patient">Patient Healthcard</label>
            <select
              id="t_patient"
              required
              value={trtPatientId}
              onChange={(e) => setTrtPatientId(e.target.value)}
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.name} ({p.health_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="t_proc">Medical Procedure / Treatment</label>
            <input 
              id="t_proc"
              type="text" 
              required 
              placeholder="e.g. General Consultation & Labs, Cataract Surgery" 
              value={trtProcedure}
              onChange={(e) => setTrtProcedure(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="t_cost">Cost of Treatment ($)</label>
              <input 
                id="t_cost"
                type="number" 
                step="0.01"
                required 
                placeholder="250.00" 
                value={trtCost}
                onChange={(e) => setTrtCost(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="t_date">Date</label>
              <input 
                id="t_date"
                type="date" 
                required 
                value={trtDate}
                onChange={(e) => setTrtDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }} disabled={trtSubmitting}>
            {trtSubmitting ? 'Saving record...' : 'Log Treatment Record'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}

export default HospitalDashboard;
