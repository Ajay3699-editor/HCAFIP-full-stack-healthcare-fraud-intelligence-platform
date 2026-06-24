import { useEffect, useRef, useState } from 'react';
import { Shield, RefreshCw, AlertOctagon, Landmark, MapPin } from 'lucide-react';
import { API_BASE } from '../config';

function FraudMap({ token }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHospitalMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dashboard/hospital-map`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHospitals(data);
      } else {
        setError('Failed to fetch hospital metrics');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalMapData();
  }, [token]);

  useEffect(() => {
    if (loading || error || hospitals.length === 0 || !mapContainerRef.current) return;

    // Avoid double initialization of Leaflet map
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const L = window.L;
    if (!L) {
      console.error("Leaflet library not loaded");
      return;
    }

    // Set view to center of seeded hospitals (approx New Delhi)
    const map = L.map(mapContainerRef.current, {
      center: [28.6120, 77.2080],
      zoom: 13,
      zoomControl: false
    });
    
    mapRef.current = map;

    // Add Zoom Control at the top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap standard tile layer
    const isDarkMode = !document.body.classList.contains('light-mode');
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add dark filter class to tile layer if theme is dark
    if (isDarkMode) {
      tileLayer.getContainer().classList.add('dark-map-tiles');
    }

    // Place markers for each hospital
    hospitals.forEach((hosp) => {
      const { latitude, longitude, name, type, location, total_claims, approved_amount, flagged_claims, blocked_amount, average_risk_score } = hosp;

      // Determine colors based on fraud rate or risk
      const fraudRate = total_claims > 0 ? (flagged_claims / total_claims) * 100 : 0;
      let markerColor = 'var(--success)'; // Green for low risk
      let pulseClass = 'pulse-green';
      
      if (average_risk_score >= 60 || fraudRate >= 40) {
        markerColor = 'var(--danger)'; // Red for high risk
        pulseClass = 'pulse-danger';
      } else if (average_risk_score >= 30 || fraudRate >= 15) {
        markerColor = 'var(--warning)'; // Yellow/Orange for medium risk
        pulseClass = 'pulse-warning';
      }

      // Create Custom Pulsing divIcon for marker
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="marker-pin-wrapper">
            <div class="marker-pulse ${pulseClass}"></div>
            <div class="marker-core" style="background-color: ${markerColor}">
              <span class="marker-inner-icon">🏥</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      // Format currency
      const formattedApproved = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(approved_amount);
      const formattedBlocked = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(blocked_amount);

      // Create detailed HTML Popup content
      const popupContent = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <h4>${name}</h4>
            <span class="badge" style="background-color: var(--accent-light); color: var(--accent); font-size: 0.65rem;">${type} Provider</span>
          </div>
          <div class="map-popup-body">
            <p class="location-text">📍 ${location}</p>
            <div class="popup-stats-grid">
              <div class="stat-item">
                <span class="stat-lbl">Claims Filed</span>
                <span class="stat-val">${total_claims}</span>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Avg Risk Rating</span>
                <span class="stat-val" style="color: ${markerColor}; font-weight: 700;">${average_risk_score}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Flagged Cases</span>
                <span class="stat-val" style="color: var(--danger); font-weight: 700;">${flagged_claims}</span>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Payouts Approved</span>
                <span class="stat-val" style="color: var(--success); font-weight: 700;">${formattedApproved}</span>
              </div>
            </div>
            ${blocked_amount > 0 ? `
              <div class="map-popup-saving">
                <span class="saving-lbl">🛡️ Fraud Leakage Blocked</span>
                <span class="saving-val">${formattedBlocked} Saved</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Create marker and bind popup
      L.marker([latitude, longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent, {
          maxWidth: 280,
          className: 'custom-leaflet-popup'
        });

      // Draw translucent risk overlay circle (visual heatmap)
      if (flagged_claims > 0) {
        L.circle([latitude, longitude], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.12,
          radius: 200 + (flagged_claims * 80), // radius scales with number of fraud cases
          weight: 1
        }).addTo(map);
      }
    });

    // Cleanup function to remove map instances
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, error, hospitals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 180px)' }}>
      {/* Header telemetry control bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Landmark size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Geographic Fraud Leakage Radar</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Real-time spatial analysis of public funds security across registered healthcare providers
            </span>
          </div>
        </div>

        <button onClick={fetchHospitalMapData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Radar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexGrow: 1, minHeight: 0 }}>
        {/* Left Side: Interactive Map */}
        <div className="glass-card" style={{ flexGrow: 3, padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, borderRadius: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <RefreshCw size={36} className="animate-spin text-accent" style={{ color: 'var(--accent)', marginBottom: '12px' }} />
                <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>Scanning geospatial coordinates...</p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, borderRadius: '12px', padding: '24px' }}>
              <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                <AlertOctagon size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '12px' }}>{error}</p>
                <button onClick={fetchHospitalMapData} className="btn btn-primary">Try Again</button>
              </div>
            </div>
          )}

          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1, borderRadius: '12px' }}></div>
        </div>

        {/* Right Side: Legend & Geospatial statistics panel */}
        <div className="glass-card" style={{ flexGrow: 1, width: '320px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0, overflowY: 'auto' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} className="text-accent" style={{ color: 'var(--accent)' }} />
              Threat Level Legend
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }}></span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>High Risk Zone (&gt;60% Avg Risk)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Immediate investigation or payout suspension required</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }}></span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Caution Zone (30% - 60% Risk)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Moderate anomaly scores, queued for audit</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Secured Zone (&lt;30% Avg Risk)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Standard claim profiles, clean record status</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Provider Threat Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {hospitals.map((hosp) => {
                const total = hosp.total_claims || 1;
                const rate = ((hosp.flagged_claims / total) * 100).toFixed(0);
                
                let ratingColor = 'var(--success)';
                if (hosp.average_risk_score >= 60) ratingColor = 'var(--danger)';
                else if (hosp.average_risk_score >= 30) ratingColor = 'var(--warning)';

                return (
                  <div key={hosp.hospital_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: `3px solid ${ratingColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {hosp.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ratingColor }}>
                        {hosp.average_risk_score}% Risk
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      <span>Claims: {hosp.total_claims} ({hosp.flagged_claims} flagged)</span>
                      <span>Flag Rate: {rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FraudMap;
