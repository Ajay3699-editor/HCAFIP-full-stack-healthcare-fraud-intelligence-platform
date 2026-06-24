import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Search, 
  Plus, 
  DollarSign, 
  Activity,
  Award
} from 'lucide-react';
import { API_BASE } from '../config';

// 1. Doughnut Chart Component
const DoughnutChart = ({ data, valuePrefix = "$", centerLabel = "Total Spent" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const slices = data.map((item, idx) => {
    const valueRatio = total > 0 ? item.value / total : 0;
    const angle = valueRatio * 360;
    const startAngle = data.slice(0, idx).reduce((sum, prevItem) => {
      const prevRatio = total > 0 ? prevItem.value / total : 0;
      return sum + prevRatio * 360;
    }, 0);

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const cx = 100;
    const cy = 100;
    const r = 80;

    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, startAngle + angle);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${start.x} ${start.y}`,
      `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `Z`
    ].join(" ");

    return {
      d,
      label: item.label,
      value: item.value,
      color: item.color,
      percent: (valueRatio * 100).toFixed(1) + "%"
    };
  });

  const selectedSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
        <svg viewBox="0 0 200 200" width="200" height="200">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.d}
              fill={slice.color}
              stroke="var(--bg-secondary)"
              strokeWidth="1.5"
              style={{
                transition: 'all 0.2s',
                transformOrigin: '100px 100px',
                transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)',
                cursor: 'pointer'
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          <circle cx="100" cy="100" r="50" fill="var(--bg-secondary)" />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          width: '90px'
        }}>
          {selectedSlice ? (
            <>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{selectedSlice.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, margin: '2px 0' }}>{valuePrefix}{selectedSlice.value.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 600 }}>{selectedSlice.percent}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{centerLabel}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{valuePrefix}{total.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px', flexGrow: 1, minWidth: '150px' }}>
        {slices.map((slice, idx) => (
          <div 
            key={idx}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.78rem', 
              cursor: 'pointer',
              opacity: hoveredIndex === null || hoveredIndex === idx ? 1 : 0.6,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }}></span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{slice.label}:</span>
            <span style={{ color: 'var(--text-secondary)' }}>{valuePrefix}{slice.value.toLocaleString(undefined, {maximumFractionDigits:0})} ({slice.percent})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Patient Growth Bar Chart Component
const PatientBarChart = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const svgWidth = 320;
  const svgHeight = 180;
  const padding = 30;
  const bottomPad = 25;
  const chartHeight = svgHeight - padding - bottomPad;
  const chartWidth = svgWidth - padding * 2;
  const barSpacing = chartWidth / data.length;
  const barWidth = Math.min(25, barSpacing * 0.5);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="180">
        <defs>
          <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="patientGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + chartHeight * (1 - ratio);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={svgWidth - padding}
              y2={y}
              stroke="var(--border-color)"
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const ratio = item.value / maxVal;
          const barHeight = ratio * chartHeight;
          const x = padding + idx * barSpacing + (barSpacing - barWidth) / 2;
          const y = svgHeight - barHeight - bottomPad;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={hoveredIdx === idx ? "url(#patientGradHover)" : "url(#patientGrad)"}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--text-primary)"
                fontWeight="700"
                opacity={hoveredIdx === idx ? 1 : 0.8}
              >
                {item.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--text-secondary)"
                fontWeight="600"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 3. Fraud Trends Line Chart
const FraudTrendsChart = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No trend data.</div>;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  
  const points = data.map((item, idx) => {
    const x = paddingLeft + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight * (1 - item.count / maxVal);
    return { x, y, ...item };
  });
  
  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="180">
        <defs>
          <linearGradient id="fraudAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          return (
            <line
              key={i}
              x1={paddingLeft}
              y1={y}
              x2={svgWidth - paddingRight}
              y2={y}
              stroke="var(--border-color)"
              strokeDasharray="3,3"
            />
          );
        })}
        
        <path d={areaD} fill="url(#fraudAreaGrad)" />
        <path d={pathD} fill="none" stroke="var(--danger)" strokeWidth="2.5" />
        
        {[0, maxVal / 2, maxVal].map((val, i) => {
          const y = paddingTop + chartHeight * (1 - (i / 2));
          return (
            <text key={i} x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-secondary)">
              {Math.round(val)}
            </text>
          );
        })}
        
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 6 : 4}
              fill="var(--danger)"
              stroke="var(--bg-secondary)"
              strokeWidth="2"
              style={{ transition: 'r 0.15s, fill 0.15s', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <text
              x={p.x}
              y={svgHeight - 12}
              textAnchor="middle"
              fontSize="8.5"
              fill="var(--text-secondary)"
              transform={`rotate(-30, ${p.x}, ${svgHeight - 12})`}
            >
              {p.month.substring(5)}
            </text>
          </g>
        ))}
      </svg>
      {hoveredIdx !== null && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          pointerEvents: 'none',
          boxShadow: 'var(--card-shadow)',
          zIndex: 10
        }}>
          <strong>{points[hoveredIdx].month}</strong><br />
          Flagged Claims: {points[hoveredIdx].count}<br />
          Avg Risk: {points[hoveredIdx].avg_risk}%
        </div>
      )}
    </div>
  );
};

function GovernmentDashboard({ activeTab, token }) {
  // Summary State
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Claims State
  const [claims, setClaims] = useState([]);
  const [claimsFilter, setClaimsFilter] = useState('ALL');
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsLoading, setClaimsLoading] = useState(false);

  // Patients State
  const [patients, setPatients] = useState([]);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [newPatientHealthId, setNewPatientHealthId] = useState('');
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientMsg, setPatientMsg] = useState({ text: '', type: '' });

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [headers]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/analytics`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  }, [headers]);

  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/claims/list`, { headers });
      if (res.ok) {
        const data = await res.json();
        setClaims(data);
      }
    } catch (err) {
      console.error("Error fetching claims:", err);
    } finally {
      setClaimsLoading(false);
    }
  }, [headers]);

  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patients/list`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setPatientsLoading(false);
    }
  }, [headers]);

  // Fetch data depending on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchSummary();
      fetchAnalytics();
    } else if (activeTab === 'claims') {
      fetchClaims();
    } else if (activeTab === 'patients') {
      fetchPatients();
    }
  }, [activeTab, fetchSummary, fetchAnalytics, fetchClaims, fetchPatients]);

  const handleApproveClaim = async (claimId) => {
    try {
      const res = await fetch(`${API_BASE}/claims/${claimId}/approve`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        fetchClaims();
        fetchSummary();
      }
    } catch (err) {
      console.error("Error approving claim:", err);
    }
  };

  const handleRejectClaim = async (claimId) => {
    try {
      const res = await fetch(`${API_BASE}/claims/${claimId}/reject`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        fetchClaims();
        fetchSummary();
      }
    } catch (err) {
      console.error("Error rejecting claim:", err);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newPatientName,
          age: parseInt(newPatientAge),
          gender: newPatientGender,
          health_id: newPatientHealthId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPatientMsg({ text: 'Patient registered successfully!', type: 'success' });
        setNewPatientName('');
        setNewPatientAge('');
        setNewPatientHealthId('');
        fetchPatients();
      } else {
        let errorMsg = 'Failed to register patient';
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
        setPatientMsg({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error("Error adding patient:", err);
      setPatientMsg({ text: 'Network error occurred', type: 'error' });
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const getRiskColor = (score) => {
    if (score < 30) return 'var(--success)';
    if (score < 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (activeTab === 'overview') {
    // Construct data for the charts
    const monthlySpendingData = analytics?.monthly_spending?.map(item => {
      // Mapping YYYY-MM to readable Month Names (e.g. 2026-01 -> Jan)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(item.month.split("-")[1]) - 1;
      return {
        label: monthNames[mIdx] || item.month,
        value: item.amount,
        color: [
          '#6366f1', '#4f46e5', '#3b82f6', '#2563eb', 
          '#10b981', '#059669', '#f59e0b', '#d97706', 
          '#ef4444', '#dc2626', '#ec4899', '#db2777'
        ][mIdx] || '#64748b'
      };
    }) || [];

    const patientGrowthData = analytics?.patient_growth?.map(item => ({
      label: item.year,
      value: item.count
    })) || [];

    const riskDistributionData = analytics?.fraud_analysis?.risk_distribution?.map((item, idx) => ({
      label: item.category,
      value: item.count,
      color: ['#10b981', '#f59e0b', '#ef4444'][idx] || '#64748b'
    })) || [];

    const totalClaimsForFraud = summary?.total_claims || 1;
    const fraudRate = ((summary?.flagged_claims || 0) / totalClaimsForFraud * 100).toFixed(1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* KPI Cards */}
        {summaryLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading summary metrics...</div>
        ) : summary ? (
          <div className="grid-4 animate-fade-in">
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                <FileText size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Claims Submitted</span>
                <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{summary.total_claims}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Approved Payouts</span>
                <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{formatCurrency(summary.total_amount_approved)}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fraud Detected Cases</span>
                <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{summary.flagged_claims} Detected</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Activity size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Average Risk Rating</span>
                <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{summary.average_risk_score}%</h3>
              </div>
            </div>
          </div>
        ) : null}

        {/* spending and patient growth row */}
        <div className="grid-2 animate-fade-in">
          {/* Monthly spending pie/doughnut chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
              Monthly Patient Spending Payouts (Yearly Breakdown)
            </h3>
            {monthlySpendingData.length > 0 ? (
              <DoughnutChart data={monthlySpendingData} />
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0', textAlign: 'center' }}>
                No spending data available.
              </div>
            )}
          </div>

          {/* New Patient Growth historical bar chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
              New Registered Patients Count (Yearly Growth)
            </h3>
            <div style={{ padding: '10px 0' }}>
              {patientGrowthData.length > 0 ? (
                <PatientBarChart data={patientGrowthData} />
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0', textAlign: 'center' }}>
                  No patient growth registry data available.
                </div>
              )}
            </div>
            <div style={{ 
              marginTop: '12px', 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)', 
              display: 'flex', 
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '10px'
            }}>
              <span>Last 3 Years + Active Year</span>
              <strong style={{ color: 'var(--accent)' }}>System Growth Registry</strong>
            </div>
          </div>
        </div>

        {/* Section divider */}
        <div style={{ 
          borderBottom: '1px solid var(--border-color)', 
          margin: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '8px'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            Fraud Intelligence Dashboard & Trends
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Powered by Automated ML Risk Classifiers & AI Intelligence
          </span>
        </div>

        {/* Fraud specific metrics summary row */}
        {analytics?.fraud_analysis && (
          <div className="grid-3 animate-fade-in">
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--danger)' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Flagged Rate</span>
                <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>{fraudRate}% of Claims</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--success)' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amount Saved by Fraud Intelligence</span>
                <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>{formatCurrency(analytics.fraud_analysis.total_blocked_amount)}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--warning)' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Activity size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Fraud Cases Detected</span>
                <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>{analytics.fraud_analysis.total_alerts} Alerts</h3>
              </div>
            </div>
          </div>
        )}

        {/* Fraud Graphs Row */}
        <div className="grid-2 animate-fade-in">
          {/* Risk distribution Doughnut chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} className="text-accent" style={{ color: 'var(--accent)' }} />
              Claim Risk Profile Distribution
            </h3>
            {riskDistributionData.length > 0 ? (
              <DoughnutChart data={riskDistributionData} valuePrefix="" centerLabel="Total Claims" />
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0', textAlign: 'center' }}>
                No risk profile distribution data.
              </div>
            )}
          </div>

          {/* Triggered rules horizontal bars */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} className="text-accent" style={{ color: 'var(--accent)' }} />
              Top Triggered Fraud Rules
            </h3>
            {analytics?.fraud_analysis?.fraud_rules && analytics.fraud_analysis.fraud_rules.length > 0 ? (
              <div className="chart-bar-container" style={{ gap: '16px' }}>
                {analytics.fraud_analysis.fraud_rules.map((item, idx) => {
                  const maxCount = Math.max(...analytics.fraud_analysis.fraud_rules.map(r => r.count), 1);
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div className="chart-row" key={idx}>
                      <div className="chart-label" style={{ width: '150px' }} title={item.rule}>{item.rule}</div>
                      <div className="chart-track" style={{ height: '16px' }}>
                        <div 
                          className="chart-fill" 
                          style={{ 
                            width: `${percentage}%`, 
                            background: item.rule === 'Duplicate Procedures' ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                          }}
                        ></div>
                      </div>
                      <div className="chart-value" style={{ width: '40px' }}>
                        {item.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0', textAlign: 'center' }}>
                No fraud rule telemetry records available.
              </div>
            )}
          </div>
        </div>

        {/* Fraud & Risk Line Trend Chart */}
        <div className="glass-card animate-fade-in" style={{ width: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            Monthly Fraud Alert Trends & ML Flag Frequencies
          </h3>
          {analytics?.fraud_trends && analytics.fraud_trends.length > 0 ? (
            <FraudTrendsChart data={analytics.fraud_trends} />
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '30px 0', textAlign: 'center' }}>
              No monthly fraud alert trend records available.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'claims') {
    const filteredClaims = claims.filter(c => {
      const matchStatus = claimsFilter === 'ALL' || c.status === claimsFilter;
      const matchSearch = 
        c.claim_id.toLowerCase().includes(claimsSearch.toLowerCase()) ||
        (c.patient_name || '').toLowerCase().includes(claimsSearch.toLowerCase()) ||
        (c.hospital_name || '').toLowerCase().includes(claimsSearch.toLowerCase());
      return matchStatus && matchSearch;
    });

    return (
      <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* Status filter buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'PENDING', 'FLAGGED', 'APPROVED', 'REJECTED'].map(statusVal => (
              <button
                key={statusVal}
                onClick={() => setClaimsFilter(statusVal)}
                className={`btn ${claimsFilter === statusVal ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                {statusVal}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} />
            <input
              type="text"
              placeholder="Search Claim ID, Patient or Hospital"
              value={claimsSearch}
              onChange={(e) => setClaimsSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {claimsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading claims database...</div>
        ) : filteredClaims.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Patient Name</th>
                  <th>Hospital</th>
                  <th>Scheme</th>
                  <th>Amount</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.claim_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{claim.claim_id.substring(0, 8)}...</td>
                    <td>{claim.patient_name || 'N/A'}</td>
                    <td>{claim.hospital_name || 'N/A'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{claim.scheme_name || claim.scheme_id}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(claim.amount)}</td>
                    <td>
                      <span style={{ 
                        fontWeight: 700, 
                        color: getRiskColor(claim.ml_risk_score) 
                      }}>
                        {claim.ml_risk_score}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        claim.status === 'APPROVED' ? 'badge-success' :
                        claim.status === 'REJECTED' ? 'badge-danger' :
                        claim.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td>
                      {claim.status !== 'APPROVED' && claim.status !== 'REJECTED' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleApproveClaim(claim.claim_id)} 
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'var(--success)' }}
                            title="Approve Payout"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectClaim(claim.claim_id)} 
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            title="Reject & Deny Payout"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                      {(claim.status === 'APPROVED' || claim.status === 'REJECTED') && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No claims match your filters.
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'patients') {
    return (
      <div className="grid-3 animate-fade-in">
        {/* Patient Registration form */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            Register Patient
          </h3>
          
          {patientMsg.text && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: patientMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', 
              color: patientMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', 
              borderRadius: '6px',
              fontSize: '0.8rem',
              marginBottom: '14px',
              fontWeight: 500
            }}>
              {patientMsg.text}
            </div>
          )}

          <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="p_name">Full Name</label>
              <input 
                id="p_name"
                type="text" 
                required 
                placeholder="John Doe" 
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
              />
            </div>
            <div className="grid-2">
              <div>
                <label htmlFor="p_age">Age</label>
                <input 
                  id="p_age"
                  type="number" 
                  required 
                  placeholder="30" 
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="p_gender">Gender</label>
                <select 
                  id="p_gender"
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="p_hid">Health ID</label>
              <input 
                id="p_hid"
                type="text" 
                required 
                placeholder="HID-100200300" 
                value={newPatientHealthId}
                onChange={(e) => setNewPatientHealthId(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
              <Plus size={16} />
              Register Patient
            </button>
          </form>
        </div>

        {/* Patients List */}
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Registered Patients Registry</h3>
          
          {patientsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading patient registry...</div>
          ) : patients.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Health ID</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((pat) => (
                    <tr key={pat.patient_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{pat.patient_id}</td>
                      <td style={{ fontWeight: 600 }}>{pat.name}</td>
                      <td>{pat.age}</td>
                      <td>{pat.gender}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{pat.health_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No registered patients found.
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default GovernmentDashboard;
