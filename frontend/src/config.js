export const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8001/api'
    : 'https://hcafip-full-stack-healthcare-fraud.onrender.com/api');

