import React, { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Gallos from './pages/Gallos';
import Genealogia from './pages/Genealogia';
import Cruces from './pages/Cruces';
import Peleas from './pages/Peleas';
import Salud from './pages/Salud';
import Criadores from './pages/Criadores';

const PAGE_TITLES = {
  dashboard:  'Dashboard',
  gallos:     'Gallos',
  genealogia: 'Árbol Genealógico',
  cruces:     'Cruces / Reproducciones',
  peleas:     'Peleas',
  salud:      'Salud y Veterinaria',
  criadores:  'Criadores',
};

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [galloGenealogiaInicial, setGalloGenealogiaInicial] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--negro)'}}>
        <div style={{color:'var(--oro)', fontFamily:'Oswald', fontSize:'1.2rem', letterSpacing:'2px'}}>
          🐓 Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const navTo = (p) => { setPage(p); setGalloGenealogiaInicial(null); };

  const renderPage = () => {
    switch(page) {
      case 'dashboard':  return <Dashboard onNav={navTo} />;
      case 'gallos':     return <Gallos onVerGenealogia={(g) => { setGalloGenealogiaInicial(g); setPage('genealogia'); }} />;
      case 'genealogia': return <Genealogia galloInicial={galloGenealogiaInicial} onNav={navTo} />;
      case 'cruces':     return <Cruces />;
      case 'peleas':     return <Peleas />;
      case 'salud':      return <Salud />;
      case 'criadores':  return <Criadores />;
      default:           return <Dashboard onNav={navTo} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar active={page} onNav={navTo} />
      <div className="main-content">
        <div className="topbar">
          <span className="topbar-title">{PAGE_TITLES[page] || ''}</span>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <span style={{color:'var(--gris-light)', fontSize:'12px'}}>
              🐓 TRABA LOS COCOS
            </span>
          </div>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
