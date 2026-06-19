import React from 'react';
import { useAuth } from '../lib/AuthContext';

const MENU = [
  { id:'dashboard',   icon:'📊', label:'Dashboard'    },
  { id:'gallos',      icon:'🐓', label:'Gallos'       },
  { id:'genealogia',  icon:'🌳', label:'Genealogía'   },
  { id:'cruces',      icon:'💉', label:'Cruces'       },
  { id:'peleas',      icon:'⚔️',  label:'Peleas'       },
  { id:'salud',       icon:'🏥', label:'Salud'        },
  { id:'criadores',   icon:'👤', label:'Criadores'    },
];

export default function Sidebar({ active, onNav }) {
  const { user, logout } = useAuth();
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>🐓 TRABA<br/>LOS COCOS</h1>
        <p>Control Parental</p>
      </div>
      <nav className="sidebar-nav">
        {MENU.map(m => (
          <button
            key={m.id}
            className={`nav-item${active === m.id ? ' active' : ''}`}
            onClick={() => onNav(m.id)}
          >
            <span className="nav-icon">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.nombre}</strong>
          {user?.rol === 'admin' ? '👑 Admin' : '🐓 Criador'}
        </div>
        <button className="btn-logout" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}
