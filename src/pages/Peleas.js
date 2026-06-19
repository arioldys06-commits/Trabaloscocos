import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';

const RESULTADOS = ['Victoria','Derrota','Tablas','Muerto','Cancelada'];

export default function Peleas() {
  const { user } = useAuth();
  const toast = useToast();
  const [peleas, setPeleas] = useState([]);
  const [gallos, setGallos] = useState([]);
  const [modal, setModal] = useState(false);
  const [filtroResultado, setFiltroResultado] = useState('');
  const [filtroGallo, setFiltroGallo] = useState('');
  const [form, setForm] = useState(defaultForm());
  const [stats, setStats] = useState({});

  function defaultForm() {
    return {
      gallo_id:'', fecha:'', lugar:'', evento:'',
      rival_nombre:'', rival_dueno:'', rival_procedencia:'', rival_raza:'',
      peso_pelea:'', resultado:'', metodo_victoria:'', tiempo_minutos:'',
      apostado_monto:'', apostado_resultado:'', notas:''
    };
  }

  useEffect(() => { cargar(); cargarGallos(); }, []);

  const cargar = async () => {
    const { data } = await supabase
      .from('peleas')
      .select('*, gallos(nombre, raza)')
      .order('fecha', { ascending:false });
    setPeleas(data || []);
    calcularStats(data || []);
  };

  const cargarGallos = async () => {
    const { data } = await supabase.from('gallos').select('id,nombre,raza').order('nombre');
    setGallos(data || []);
  };

  const calcularStats = (data) => {
    const total = data.length;
    const victorias = data.filter(p => p.resultado === 'Victoria').length;
    const derrotas = data.filter(p => p.resultado === 'Derrota').length;
    const muertos = data.filter(p => p.resultado === 'Muerto').length;
    const pct = total > 0 ? Math.round((victorias / total) * 100) : 0;
    setStats({ total, victorias, derrotas, muertos, pct });
  };

  const guardar = async () => {
    if (!form.gallo_id || !form.fecha || !form.resultado) {
      toast('Gallo, fecha y resultado son requeridos', 'error'); return;
    }
    const body = {
      ...form, criador_id: user?.id,
      peso_pelea: form.peso_pelea || null,
      tiempo_minutos: parseInt(form.tiempo_minutos) || null,
      apostado_monto: form.apostado_monto || null,
    };
    const { error } = await supabase.from('peleas').insert(body);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Pelea registrada');
    setModal(false);
    cargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta pelea?')) return;
    await supabase.from('peleas').delete().eq('id', id);
    toast('Pelea eliminada', 'warning');
    cargar();
  };

  const filtradas = peleas.filter(p => {
    const esFiltroR = !filtroResultado || p.resultado === filtroResultado;
    const esFiltroG = !filtroGallo || p.gallo_id === filtroGallo;
    return esFiltroR && esFiltroG;
  });

  const resBadge = (r) => {
    const map = { Victoria:'verde', Derrota:'rojo', Muerto:'rojo', Tablas:'oro', Cancelada:'gris' };
    return `badge badge-${map[r] || 'gris'}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚔️ Peleas</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setModal(true); }}>
          + Registrar Pelea
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:'20px'}}>
        <div className="stat-card">
          <span className="stat-label">Total Peleas</span>
          <span className="stat-value">{stats.total || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Victorias</span>
          <span className="stat-value" style={{color:'var(--verde)'}}>{stats.victorias || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Derrotas</span>
          <span className="stat-value" style={{color:'var(--rojo)'}}>{stats.derrotas || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">% Efectividad</span>
          <span className="stat-value" style={{color: (stats.pct||0) >= 60 ? 'var(--verde)' : (stats.pct||0) >= 40 ? 'var(--oro)' : 'var(--rojo)'}}>{stats.pct || 0}%</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap'}}>
        <select className="form-select" style={{width:'200px'}} value={filtroGallo} onChange={e => setFiltroGallo(e.target.value)}>
          <option value="">Todos los gallos</option>
          {gallos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select className="form-select" style={{width:'180px'}} value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)}>
          <option value="">Todos los resultados</option>
          {RESULTADOS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gallo</th>
              <th>Fecha</th>
              <th>Lugar / Evento</th>
              <th>Rival</th>
              <th>Peso</th>
              <th>Resultado</th>
              <th>Apuesta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">⚔️</div><p>No hay peleas registradas</p></div></td></tr>
            ) : filtradas.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{fontWeight:'600'}}>{p.gallos?.nombre}</div>
                  <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{p.gallos?.raza}</div>
                </td>
                <td>{p.fecha}</td>
                <td>
                  <div>{p.lugar || '—'}</div>
                  {p.evento && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{p.evento}</div>}
                </td>
                <td>
                  <div>{p.rival_nombre || '—'}</div>
                  {p.rival_dueno && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>Dueño: {p.rival_dueno}</div>}
                  {p.rival_raza && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{p.rival_raza}</div>}
                </td>
                <td>{p.peso_pelea ? `${p.peso_pelea} lbs` : '—'}</td>
                <td>
                  <span className={resBadge(p.resultado)}>{p.resultado}</span>
                  {p.metodo_victoria && <div style={{color:'var(--gris-light)', fontSize:'11px', marginTop:'2px'}}>{p.metodo_victoria}</div>}
                </td>
                <td>
                  {p.apostado_monto ? (
                    <div>
                      <div>RD$ {parseFloat(p.apostado_monto).toLocaleString()}</div>
                      {p.apostado_resultado && <span className={`badge ${p.apostado_resultado === 'Ganado' ? 'badge-verde' : p.apostado_resultado === 'Perdido' ? 'badge-rojo' : 'badge-gris'}`}>{p.apostado_resultado}</span>}
                    </div>
                  ) : '—'}
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" style={{color:'var(--rojo)'}} onClick={() => eliminar(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:'700px'}}>
            <div className="modal-header">
              <h3>REGISTRAR PELEA</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Gallo *</label>
                  <select className="form-select" value={form.gallo_id} onChange={e => setForm(f=>({...f,gallo_id:e.target.value}))}>
                    <option value="">Seleccionar...</option>
                    {gallos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => setForm(f=>({...f,fecha:e.target.value}))} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Lugar</label>
                  <input className="form-input" value={form.lugar} onChange={e => setForm(f=>({...f,lugar:e.target.value}))} placeholder="Ej: Coliseo Los Pinos" />
                </div>
                <div className="form-group">
                  <label className="form-label">Evento</label>
                  <input className="form-input" value={form.evento} onChange={e => setForm(f=>({...f,evento:e.target.value}))} placeholder="Ej: Torneo Navideño" />
                </div>
              </div>

              <div style={{padding:'12px', background:'var(--gris-mid)', borderRadius:'8px', marginBottom:'16px'}}>
                <div style={{fontFamily:'Oswald', color:'var(--gris-light)', fontSize:'11px', letterSpacing:'2px', marginBottom:'12px'}}>DATOS DEL RIVAL</div>
                <div className="form-grid-2">
                  <div className="form-group" style={{marginBottom:'12px'}}>
                    <label className="form-label">Nombre del Rival</label>
                    <input className="form-input" value={form.rival_nombre} onChange={e => setForm(f=>({...f,rival_nombre:e.target.value}))} placeholder="Nombre del gallo rival" />
                  </div>
                  <div className="form-group" style={{marginBottom:'12px'}}>
                    <label className="form-label">Dueño del Rival</label>
                    <input className="form-input" value={form.rival_dueno} onChange={e => setForm(f=>({...f,rival_dueno:e.target.value}))} placeholder="Nombre del criador rival" />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">Procedencia</label>
                    <input className="form-input" value={form.rival_procedencia} onChange={e => setForm(f=>({...f,rival_procedencia:e.target.value}))} placeholder="Ciudad / País" />
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">Raza del Rival</label>
                    <input className="form-input" value={form.rival_raza} onChange={e => setForm(f=>({...f,rival_raza:e.target.value}))} placeholder="Ej: Sweater" />
                  </div>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Peso en Pelea</label>
                  <input className="form-input" type="number" step="0.1" value={form.peso_pelea} onChange={e => setForm(f=>({...f,peso_pelea:e.target.value}))} placeholder="lbs" />
                </div>
                <div className="form-group">
                  <label className="form-label">Resultado *</label>
                  <select className="form-select" value={form.resultado} onChange={e => setForm(f=>({...f,resultado:e.target.value}))}>
                    <option value="">Seleccionar...</option>
                    {RESULTADOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tiempo (min)</label>
                  <input className="form-input" type="number" value={form.tiempo_minutos} onChange={e => setForm(f=>({...f,tiempo_minutos:e.target.value}))} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Método / Cómo ganó</label>
                <input className="form-input" value={form.metodo_victoria} onChange={e => setForm(f=>({...f,metodo_victoria:e.target.value}))} placeholder="Ej: Navaja, Por puntos, KO..." />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Monto Apostado (RD$)</label>
                  <input className="form-input" type="number" value={form.apostado_monto} onChange={e => setForm(f=>({...f,apostado_monto:e.target.value}))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Resultado Apuesta</label>
                  <select className="form-select" value={form.apostado_resultado} onChange={e => setForm(f=>({...f,apostado_resultado:e.target.value}))}>
                    <option value="">N/A</option>
                    <option>Ganado</option><option>Perdido</option><option>Nulo</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} placeholder="Observaciones de la pelea..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>Registrar pelea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
