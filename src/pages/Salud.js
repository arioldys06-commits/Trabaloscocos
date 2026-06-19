import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';

const TIPOS = ['Vacuna','Desparasitacion','Enfermedad','Tratamiento','Revision','Vitaminas'];

export default function Salud() {
  const { user } = useAuth();
  const toast = useToast();
  const [registros, setRegistros] = useState([]);
  const [gallos, setGallos] = useState([]);
  const [modal, setModal] = useState(false);
  const [filtroGallo, setFiltroGallo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState(defaultForm());

  function defaultForm() {
    return { gallo_id:'', fecha: new Date().toISOString().split('T')[0], tipo:'', descripcion:'', producto_usado:'', dosis:'', veterinario:'', proxima_fecha:'', notas:'' };
  }

  useEffect(() => { cargar(); cargarGallos(); }, []);

  const cargar = async () => {
    const { data } = await supabase
      .from('salud')
      .select('*, gallos(nombre)')
      .order('fecha', { ascending:false });
    setRegistros(data || []);
  };

  const cargarGallos = async () => {
    const { data } = await supabase.from('gallos').select('id,nombre').order('nombre');
    setGallos(data || []);
  };

  const guardar = async () => {
    if (!form.gallo_id || !form.fecha || !form.tipo || !form.descripcion) {
      toast('Gallo, fecha, tipo y descripción son requeridos', 'error'); return;
    }
    const { error } = await supabase.from('salud').insert({ ...form, criador_id: user?.id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Registro de salud guardado');
    setModal(false);
    cargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    await supabase.from('salud').delete().eq('id', id);
    toast('Registro eliminado', 'warning');
    cargar();
  };

  const filtrados = registros.filter(r => {
    const esFiltroG = !filtroGallo || r.gallo_id === filtroGallo;
    const esFiltroT = !filtroTipo || r.tipo === filtroTipo;
    return esFiltroG && esFiltroT;
  });

  const hoy = new Date().toISOString().split('T')[0];
  const proximasCitas = registros.filter(r => r.proxima_fecha && r.proxima_fecha >= hoy)
    .sort((a,b) => a.proxima_fecha.localeCompare(b.proxima_fecha))
    .slice(0, 3);

  const tipoBadge = (t) => {
    const map = { Vacuna:'azul', Desparasitacion:'verde', Enfermedad:'rojo', Tratamiento:'oro', Revision:'gris', Vitaminas:'verde' };
    return `badge badge-${map[t] || 'gris'}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>🏥 Salud y Veterinaria</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setModal(true); }}>
          + Nuevo Registro
        </button>
      </div>

      {/* Próximas citas */}
      {proximasCitas.length > 0 && (
        <div className="alert alert-warning" style={{marginBottom:'20px'}}>
          <div>
            <strong>📅 Próximas citas médicas</strong>
            <div style={{marginTop:'8px', display:'flex', gap:'16px', flexWrap:'wrap'}}>
              {proximasCitas.map(c => (
                <div key={c.id} style={{fontSize:'12px'}}>
                  🐓 <strong>{c.gallos?.nombre}</strong> — {c.tipo} el <strong>{c.proxima_fecha}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap'}}>
        <select className="form-select" style={{width:'200px'}} value={filtroGallo} onChange={e => setFiltroGallo(e.target.value)}>
          <option value="">Todos los gallos</option>
          {gallos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select className="form-select" style={{width:'180px'}} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gallo</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Producto / Dosis</th>
              <th>Próxima Cita</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🏥</div><p>No hay registros de salud</p></div></td></tr>
            ) : filtrados.map(r => (
              <tr key={r.id}>
                <td style={{fontWeight:'600'}}>{r.gallos?.nombre}</td>
                <td>{r.fecha}</td>
                <td><span className={tipoBadge(r.tipo)}>{r.tipo}</span></td>
                <td>{r.descripcion}</td>
                <td>
                  {r.producto_usado && <div style={{fontSize:'13px'}}>{r.producto_usado}</div>}
                  {r.dosis && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>Dosis: {r.dosis}</div>}
                </td>
                <td>
                  {r.proxima_fecha
                    ? <span className={`badge ${r.proxima_fecha < hoy ? 'badge-rojo' : 'badge-oro'}`}>{r.proxima_fecha}</span>
                    : '—'}
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" style={{color:'var(--rojo)'}} onClick={() => eliminar(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>REGISTRO DE SALUD</h3>
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
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-select" value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))}>
                  <option value="">Seleccionar...</option>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <input className="form-input" value={form.descripcion} onChange={e => setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: Vacuna Newcastle dosis anual" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Producto Usado</label>
                  <input className="form-input" value={form.producto_usado} onChange={e => setForm(f=>({...f,producto_usado:e.target.value}))} placeholder="Nombre del producto" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dosis</label>
                  <input className="form-input" value={form.dosis} onChange={e => setForm(f=>({...f,dosis:e.target.value}))} placeholder="Ej: 1ml / 5kg" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Veterinario</label>
                  <input className="form-input" value={form.veterinario} onChange={e => setForm(f=>({...f,veterinario:e.target.value}))} placeholder="Nombre del veterinario" />
                </div>
                <div className="form-group">
                  <label className="form-label">Próxima Cita</label>
                  <input className="form-input" type="date" value={form.proxima_fecha} onChange={e => setForm(f=>({...f,proxima_fecha:e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} placeholder="Observaciones adicionales..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>Guardar registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
