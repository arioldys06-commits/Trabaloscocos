import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function Dashboard({ onNav }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ gallos:0, activos:0, peleas:0, victorias:0, cruces:0, alertas:0 });
  const [proxSalud, setProxSalud] = useState([]);
  const [ultimasPeleas, setUltimasPeleas] = useState([]);

  useEffect(() => {
    cargarStats();
    cargarProxSalud();
    cargarUltimasPeleas();
  }, []);

  const cargarStats = async () => {
    const [g, p, c, a] = await Promise.all([
      supabase.from('gallos').select('id,estado', { count:'exact' }),
      supabase.from('peleas').select('id,resultado', { count:'exact' }),
      supabase.from('cruces').select('id', { count:'exact' }),
      supabase.from('alertas_consanguinidad').select('id', { count:'exact' }).eq('revisada', false),
    ]);
    const activos = g.data?.filter(x => x.estado === 'Activo').length || 0;
    const victorias = p.data?.filter(x => x.resultado === 'Victoria').length || 0;
    setStats({
      gallos: g.count || 0, activos,
      peleas: p.count || 0, victorias,
      cruces: c.count || 0,
      alertas: a.count || 0
    });
  };

  const cargarProxSalud = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('salud')
      .select('*, gallos(nombre)')
      .gte('proxima_fecha', hoy)
      .order('proxima_fecha', { ascending:true })
      .limit(5);
    setProxSalud(data || []);
  };

  const cargarUltimasPeleas = async () => {
    const { data } = await supabase
      .from('peleas')
      .select('*, gallos(nombre)')
      .order('fecha', { ascending:false })
      .limit(5);
    setUltimasPeleas(data || []);
  };

  const pct = stats.peleas > 0 ? Math.round((stats.victorias / stats.peleas) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <span style={{color:'var(--gris-light)', fontSize:'13px'}}>
          Bienvenido, <strong style={{color:'var(--oro)'}}>{user?.nombre}</strong>
        </span>
      </div>

      {stats.alertas > 0 && (
        <div className="alert alert-danger" style={{marginBottom:'20px'}}>
          ⚠️ Hay <strong>{stats.alertas}</strong> alerta(s) de consanguinidad sin revisar.
          <button className="btn btn-sm btn-ghost" style={{marginLeft:'12px'}} onClick={() => onNav('cruces')}>Ver cruces</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Gallos</span>
          <span className="stat-value">{stats.gallos}</span>
          <span className="stat-sub">{stats.activos} activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peleas</span>
          <span className="stat-value">{stats.peleas}</span>
          <span className="stat-sub">{stats.victorias} victorias</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">% Victoria</span>
          <span className="stat-value" style={{color: pct >= 60 ? 'var(--verde)' : pct >= 40 ? 'var(--oro)' : 'var(--rojo)'}}>
            {pct}%
          </span>
          <span className="stat-sub">efectividad</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cruces</span>
          <span className="stat-value">{stats.cruces}</span>
          <span className="stat-sub">registrados</span>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
        {/* Próximas citas salud */}
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <h3 style={{fontFamily:'Oswald', color:'var(--blanco)', letterSpacing:'1px'}}>🏥 Próximas Citas</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => onNav('salud')}>Ver todo</button>
          </div>
          {proxSalud.length === 0 ? (
            <div className="empty-state" style={{padding:'24px'}}>
              <p>Sin citas próximas</p>
            </div>
          ) : proxSalud.map(s => (
            <div key={s.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 0', borderBottom:'1px solid var(--border)'
            }}>
              <div>
                <div style={{fontWeight:'600', fontSize:'13px'}}>{s.gallos?.nombre}</div>
                <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{s.tipo} — {s.descripcion}</div>
              </div>
              <span className="badge badge-oro">{s.proxima_fecha}</span>
            </div>
          ))}
        </div>

        {/* Últimas peleas */}
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <h3 style={{fontFamily:'Oswald', color:'var(--blanco)', letterSpacing:'1px'}}>⚔️ Últimas Peleas</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => onNav('peleas')}>Ver todo</button>
          </div>
          {ultimasPeleas.length === 0 ? (
            <div className="empty-state" style={{padding:'24px'}}>
              <p>Sin peleas registradas</p>
            </div>
          ) : ultimasPeleas.map(p => (
            <div key={p.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 0', borderBottom:'1px solid var(--border)'
            }}>
              <div>
                <div style={{fontWeight:'600', fontSize:'13px'}}>{p.gallos?.nombre}</div>
                <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{p.lugar || 'Sin lugar'} — {p.fecha}</div>
              </div>
              <span className={`badge ${
                p.resultado === 'Victoria' ? 'badge-verde' :
                p.resultado === 'Derrota' || p.resultado === 'Muerto' ? 'badge-rojo' :
                'badge-gris'
              }`}>{p.resultado}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
