import React from 'react';
import { Shield } from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">
            <img src="/logo.png" alt="GNDEC Bidar" className="footer__logo" />
            <div>
              <div className="footer__name">Guru Nanak Dev Engineering College, Bidar</div>
              <div className="footer__meta">
                Department of CSE (IoT and Cybersecurity including Blockchain Technology)
                <br />
                Organized by Cyber Samurai Association • Hacktober 2026
              </div>
            </div>
          </div>
          <div className="footer__copy">
            © 2026 Guru Nanak Dev Engineering College, Bidar, Karnataka, India. All rights reserved.
          </div>
        </div>

        {/* Phase 5 — Subtle, minimal admin icon in footer */}
        <div className="footer__admin-icon">
          <button
            onClick={onOpenAdminLogin}
            className="admin-icon-btn"
            title="System Portal"
            aria-label="System Portal"
          >
            <Shield size={14} />
          </button>
          <span className="admin-icon-label">Admin</span>
        </div>
      </div>
    </footer>
  );
};
