import { useState } from 'react';

export function GovBanner() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="usa-banner">
      <div className="usa-banner-inner">
        <span className="usa-banner-flag">🇺🇸</span>
        <span className="usa-banner-text">
          An official website of the government. <button type="button" onClick={() => setIsOpen(!isOpen)} className="usa-banner-btn">{isOpen ? 'Hide how you know' : "Here's how you know"}</button>
        </span>
      </div>
      {isOpen && (
        <div className="usa-banner-info">
          <div className="usa-banner-info-block">
            <span className="usa-banner-info-icon">🏛️</span>
            <div>
              <div className="usa-banner-info-title">Official websites use secure portal links</div>
              <div className="usa-banner-info-desc">
                This system belongs to a verified government agency and is secured for healthcare integrity and fraud detection auditing.
              </div>
            </div>
          </div>
          <div className="usa-banner-info-block">
            <span className="usa-banner-info-icon">🔒</span>
            <div>
              <div className="usa-banner-info-title">HTTPS / Secure Connection</div>
              <div className="usa-banner-info-desc">
                A secure connection means you have safely connected to the secure registry server. Only share sensitive data on official, secure portals.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GovBanner;
