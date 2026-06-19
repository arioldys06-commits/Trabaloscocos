import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Login({ onLogin }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, pass);
      onLogin();
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', background:'var(--negro)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px'
    }}>
      <div style={{width:'100%', maxWidth:'400px'}}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <div style={{fontSize:'3rem', marginBottom:'12px'}}>🐓</div>
          <h1 style={{
            fontFamily:'Oswald,sans-serif', fontSize:'2rem',
            fontWeight:'700', color:'var(--oro)', letterSpacing:'2px'
          }}>TRABA LOS COCOS</h1>
          <p style={{color:'var(--gris-light)', fontSize:'12px', letterSpacing:'3px', marginTop:'6px', textTransform:'uppercase'}}>
            Sistema de Control Parental
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="form-input"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="alert alert-danger" style={{marginBottom:'16px'}}>
                🔒 {error}
              </div>
            )}
            <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar al sistema'}
            </button>
          </form>
        </div>

        <p style={{textAlign:'center', color:'var(--gris-light)', fontSize:'11px', marginTop:'20px', letterSpacing:'1px'}}>
          TRABA LOS COCOS © 2026
        </p>
      </div>
    </div>
  );
}
