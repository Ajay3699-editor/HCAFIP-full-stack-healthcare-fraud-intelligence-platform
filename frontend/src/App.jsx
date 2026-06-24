import { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Heart, 
  FileText, 
  LogOut, 
  Sun, 
  Moon, 
  TrendingUp, 
  UserPlus,
  Map
} from 'lucide-react';
import Login from './components/Login';
import GovernmentDashboard from './components/GovernmentDashboard';
import InvestigatorDashboard from './components/InvestigatorDashboard';
import HospitalDashboard from './components/HospitalDashboard';
import PatientDashboard from './components/PatientDashboard';
import GovSealSVG from './components/GovSealSVG';
import GovBanner from './components/GovBanner';
import FraudMap from './components/FraudMap';


function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState(() => {
    const initialUser = JSON.parse(localStorage.getItem('user')) || null;
    if (initialUser) {
      if (initialUser.role === 'Government') return 'overview';
      if (initialUser.role === 'Investigator') return 'alerts';
      if (initialUser.role === 'Hospital') return 'claims';
      if (initialUser.role === 'Patient') return 'portal';
    }
    return '';
  });

  // Apply theme class to body
  useEffect(() => {
    const body = document.body;
    if (theme === 'light') {
      body.classList.add('light-mode');
    } else {
      body.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData.role === 'Government') setActiveTab('overview');
    else if (userData.role === 'Investigator') setActiveTab('alerts');
    else if (userData.role === 'Hospital') setActiveTab('claims');
    else if (userData.role === 'Patient') setActiveTab('portal');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveTab('');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!token || !user) {
    return (
      <div className="auth-page">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // Define navigation tabs based on roles
  const getNavItems = () => {
    switch (user.role) {
      case 'Government':
        return [
          { id: 'overview', label: 'System Overview', icon: TrendingUp },
          { id: 'claims', label: 'Manage Claims', icon: FileText },
          { id: 'patients', label: 'Patient Registry', icon: UserPlus },
          { id: 'map', label: 'Fraud Hotspots Map', icon: Map },
        ];
      case 'Investigator':
        return [
          { id: 'alerts', label: 'Fraud Alerts', icon: AlertTriangle },
          { id: 'assistant', label: 'Gemini Assistant', icon: Shield },
        ];
      case 'Hospital':
        return [
          { id: 'claims', label: 'Claims Console', icon: FileText },
          { id: 'treatment', label: 'Record Treatment', icon: Activity },
        ];
      case 'Patient':
        return [
          { id: 'portal', label: 'My Portal', icon: Heart },
        ];
      default:
        return [];
    }
  };

  const renderActiveContent = () => {
    switch (user.role) {
      case 'Government':
        if (activeTab === 'map') {
          return <FraudMap token={token} />;
        }
        return <GovernmentDashboard activeTab={activeTab} token={token} user={user} />;
      case 'Investigator':
        return <InvestigatorDashboard activeTab={activeTab} token={token} user={user} />;
      case 'Hospital':
        return <HospitalDashboard activeTab={activeTab} token={token} user={user} />;
      case 'Patient':
        return <PatientDashboard activeTab={activeTab} token={token} user={user} />;
      default:
        return <div>Invalid Role Dashboard</div>;
    }
  };

  const navItems = getNavItems();
  const currentTabLabel = navItems.find(item => item.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="app-container-wrapper">
      <GovBanner />
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '16px 20px', height: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GovSealSVG style={{ width: '26px', height: '26px' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px' }}>HCAFIP</span>
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              Healthcare Claim Assurance & Fraud Intelligence Portal
            </span>
          </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.username}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {user.role}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={toggleTheme} 
              className="btn btn-secondary" 
              style={{ padding: '8px', borderRadius: '50%' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={handleLogout} 
              className="btn btn-secondary" 
              style={{ padding: '8px', borderRadius: '50%', color: 'var(--danger)' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.25rem' }}>{currentTabLabel}</h1>
            <span className="badge badge-info">{user.role} Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Server: <strong style={{ color: 'var(--success)' }}>Online</strong>
            </span>
          </div>
        </header>
        
        <div className="page-container animate-fade-in">
          {renderActiveContent()}
        </div>
      </main>
    </div>
  </div>
  );
}

export default App;
