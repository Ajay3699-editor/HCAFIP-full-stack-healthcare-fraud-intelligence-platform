import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Heart, 
  Activity, 
  FileText, 
  User, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { API_BASE } from '../config';

// Custom SVG Chart for Patient claims history visualization
const PatientClaimsChart = ({ claims }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  if (!claims || claims.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        No claims data available to construct telemetry graphs.
      </div>
    );
  }

  const maxVal = Math.max(...claims.map(c => c.amount), 100);
  
  const svgWidth = 500;
  const svgHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;
  
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const barSpacing = chartWidth / claims.length;
  const barWidth = Math.min(32, barSpacing * 0.5);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="220">
        <defs>
          <linearGradient id="claimGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="claimGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="var(--border-color)"
                strokeDasharray="3,3"
              />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-secondary)">
                ${Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {claims.map((claim, idx) => {
          const ratio = claim.amount / maxVal;
          const barHeight = ratio * chartHeight;
          const x = paddingLeft + idx * barSpacing + (barSpacing - barWidth) / 2;
          const y = svgHeight - barHeight - paddingBottom;

          return (
            <g key={claim.claim_id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={hoveredIdx === idx ? "url(#claimGradHover)" : "url(#claimGrad)"}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {hoveredIdx === idx && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--text-primary)"
                  fontWeight="700"
                >
                  ${claim.amount.toFixed(0)}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={svgHeight - 20}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-secondary)"
                fontWeight="600"
              >
                {new Date(claim.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
              </text>
              <text
                x={x + barWidth / 2}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="8"
                fill="var(--text-muted)"
                fontWeight="500"
              >
                {claim.procedure.substring(0, 10)}...
              </text>
            </g>
          );
        })}
      </svg>
      {hoveredIdx !== null && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          pointerEvents: 'none',
          boxShadow: 'var(--card-shadow)',
          zIndex: 10,
          textAlign: 'center'
        }}>
          <strong>{claims[hoveredIdx].scheme_name}</strong><br />
          Amount: <strong>${claims[hoveredIdx].amount.toFixed(2)}</strong> ({claims[hoveredIdx].status})<br />
          Hospital: {claims[hoveredIdx].hospital_name || claims[hoveredIdx].hospital_id}
        </div>
      )}
    </div>
  );
};

function PatientDashboard({ token, user }) {
  const [patientInfo, setPatientInfo] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchPatientData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Patient Info
      const patRes = await fetch(`${API_BASE}/patients/${user.associated_id}`, { headers });
      if (patRes.ok) {
        const patData = await patRes.json();
        setPatientInfo(patData);
      }

      // 2. Fetch Treatments
      const trtRes = await fetch(`${API_BASE}/treatments/patient/${user.associated_id}`, { headers });
      if (trtRes.ok) {
        const trtData = await trtRes.json();
        setTreatments(trtData);
      }

      // 3. Fetch Claims
      const clmRes = await fetch(`${API_BASE}/claims/patient/${user.associated_id}`, { headers });
      if (clmRes.ok) {
        const clmData = await clmRes.json();
        setClaims(clmData);
      }

      // 4. Fetch Schemes
      const schRes = await fetch(`${API_BASE}/dashboard/schemes`, { headers });
      if (schRes.ok) {
        const schData = await schRes.json();
        setSchemes(schData);
      }

    } catch (err) {
      console.error("Error fetching patient dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [headers, user.associated_id]);

  useEffect(() => {
    if (user.associated_id) {
      fetchPatientData();
    }
  }, [user.associated_id, fetchPatientData]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
      case 'REJECTED': return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
      case 'FLAGGED': return <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />;
      default: return <Clock size={14} style={{ color: 'var(--warning)' }} />;
    }
  };

  // Compute scheme utilization
  const getSchemeUtilization = (scheme) => {
    // Filter active/approved/pending claims for this scheme
    const schemeClaims = claims.filter(c => c.scheme_id === scheme.scheme_id && c.status !== 'REJECTED');
    const totalClaimed = schemeClaims.reduce((sum, c) => sum + c.amount, 0);
    const attemptsUsed = schemeClaims.length;

    const remainingAmount = Math.max(0, scheme.max_amount - totalClaimed);
    const remainingAttempts = Math.max(0, scheme.max_attempts - attemptsUsed);

    const amountPct = scheme.max_amount > 0 ? (totalClaimed / scheme.max_amount) * 100 : 0;
    const attemptsPct = scheme.max_attempts > 0 ? (attemptsUsed / scheme.max_attempts) * 100 : 0;

    return {
      totalClaimed,
      attemptsUsed,
      remainingAmount,
      remainingAttempts,
      amountPct: Math.min(100, amountPct),
      attemptsPct: Math.min(100, attemptsPct)
    };
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Retrieving personal health portal file...</div>;
  }

  // Age calculations
  const joiningYear = patientInfo?.created_at ? new Date(patientInfo.created_at).getFullYear() : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsElapsed = Math.max(0, currentYear - joiningYear);
  const presentAge = patientInfo ? (patientInfo.age + yearsElapsed) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Section: Profile and Scheme Coverage */}
      <div className="grid-3 animate-fade-in" style={{ gridTemplateColumns: '320px 1fr 1fr' }}>
        
        {/* Patient Profile card */}
        {patientInfo && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                padding: '16px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent-light)', 
                color: 'var(--accent)',
                display: 'inline-flex'
              }}>
                <User size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{patientInfo.name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  (Joined in {joiningYear} at age of {patientInfo.age})
                </div>
              </div>
            </div>

            <div style={{ 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Joining Age:</span>
                <span style={{ fontWeight: 600 }}>{patientInfo.age} years</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Present Age:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{presentAge} years</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gender:</span>
                <span style={{ fontWeight: 600 }}>{patientInfo.gender}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Health ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{patientInfo.health_id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Schemes Balance */}
        {schemes.map((scheme, idx) => {
          const util = getSchemeUtilization(scheme);
          return (
            <div className="glass-card" key={scheme.scheme_id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={16} style={{ color: idx % 2 === 0 ? 'var(--danger)' : 'var(--accent)' }} />
                {scheme.scheme_name}
              </h3>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Payout balance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Coverage Utilized</span>
                    <span style={{ fontWeight: 600 }}>${util.totalClaimed.toFixed(2)} / ${scheme.max_amount.toFixed(2)}</span>
                  </div>
                  <div className="chart-track" style={{ height: '8px' }}>
                    <div className="chart-fill" style={{ 
                      width: `${util.amountPct}%`, 
                      background: util.amountPct > 80 ? 'var(--danger)' : 'var(--accent)' 
                    }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                    Remaining Limit: <strong>${util.remainingAmount.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Attempt balance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Claims Submitted</span>
                    <span style={{ fontWeight: 600 }}>{util.attemptsUsed} / {scheme.max_attempts}</span>
                  </div>
                  <div className="chart-track" style={{ height: '8px' }}>
                    <div className="chart-fill" style={{ 
                      width: `${util.attemptsPct}%`, 
                      background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
                    }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                    Remaining Filings: <strong>{util.remainingAttempts}</strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Section: Highlights Summary & Claims SVG Graph */}
      {patientInfo && (
        <div className="grid-2 animate-fade-in" style={{ marginTop: '10px' }}>
          {/* Benefit Utilization Summary Highlight */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
              <TrendingUp size={18} />
              Benefit Utilization Summary Highlight
            </h3>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              {patientInfo.name} is currently registered under ID <code style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>{patientInfo.patient_id}</code> with Health ID <code style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>{patientInfo.health_id}</code>.
              <br />
              Under the benefit schemes:
              <ul style={{ margin: '8px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {schemes.map((scheme) => {
                  const util = getSchemeUtilization(scheme);
                  return (
                    <li key={scheme.scheme_id}>
                      <strong>{scheme.scheme_name}</strong>: Utilized <strong style={{ color: 'var(--accent)' }}>${util.totalClaimed.toFixed(2)}</strong> of max ${scheme.max_amount.toFixed(2)} ({util.attemptsUsed} claims submitted).
                    </li>
                  );
                })}
              </ul>
            </div>
            
            {/* Highlighted list of usage events */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Highlighted Medical Claims Events
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {claims.length > 0 ? (
                  claims.map((claim) => (
                    <div key={claim.claim_id} style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      padding: '10px 14px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        On <strong style={{ color: 'var(--accent)' }}>{new Date(claim.created_at).toLocaleDateString()}</strong>, claimed under <span style={{ fontWeight: 600 }}>{claim.scheme_name}</span> at <strong>{claim.hospital_name || claim.hospital_id}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Procedure: <em>{claim.procedure}</em> (ID: {claim.claim_id.substring(0, 8)})
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>${claim.amount.toFixed(2)}</span>
                        <span className={`badge ${
                          claim.status === 'APPROVED' ? 'badge-success' :
                          claim.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {claim.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)', padding: '10px' }}>
                    No insurance claim events recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SVG claims spending chart */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justify_content: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
              Claim History Spending Graph
            </h3>
            <PatientClaimsChart claims={claims} />
          </div>
        </div>
      )}

      {/* Bottom Section: Treatment Logs and Claim Statuses */}
      <div className="grid-2 animate-fade-in" style={{ marginTop: '10px' }}>
        
        {/* Treatment Log */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            Medical Treatment History
          </h3>
          
          {treatments.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hospital</th>
                    <th>Procedure</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {treatments.map((trt) => (
                    <tr key={trt.treatment_id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(trt.date).toLocaleDateString()}
                      </td>
                      <td>{trt.hospital_name || trt.hospital_id}</td>
                      <td style={{ fontWeight: 600 }}>{trt.procedure}</td>
                      <td style={{ fontWeight: 600 }}>${trt.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No treatment entries found on record.
            </div>
          )}
        </div>

        {/* Claim Log */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            My Insurance Benefit Claims
          </h3>
          
          {claims.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Scheme</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.claim_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{claim.claim_id.substring(0, 8)}...</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{claim.scheme_name}</td>
                      <td style={{ fontWeight: 600 }}>${claim.amount.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${
                          claim.status === 'APPROVED' ? 'badge-success' :
                          claim.status === 'REJECTED' ? 'badge-danger' :
                          claim.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', fontSize: '0.7rem', padding: '2px 8px' }}>
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
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No benefit claims submitted yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default PatientDashboard;
