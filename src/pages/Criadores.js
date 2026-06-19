import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';

export default function Criadores() {
  const { user } = useAuth();
  const toast = useToast();
  const [criadores, setCriadores] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(defaultForm());

  function defaultForm() {
    return { nombre:'', telefono:'', email:'', ubicacion:'', password_hash:'', rol:'criador' };
  }

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await supabase.from('criadores').select('*').order('nombre');
    setCriadores(data || []);
  };

  const abrirNuevo = () => { setEditando(null); setForm(defaultForm()); setModal(true); };
  const abrirEditar = (c) => { setEditando(c); setForm({...c, password_hash:''}); setModal(true); };

  const guardar = async () => {
    if (!form.nombre || !form.email) { toast('Nombre y email son requeridos', 'error'); return; }
    if (!editando && !form.password_hash) { toast('La contraseña es requerida', 'error'); return; }
    const body = { ...form };
    if (editando && !body.password_hash) delete body.password_hash;
    if (editando) {
      const { error } = await supabase.from('criadores').update(body).eq('id', editando.id);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Criador actualizado');
    } else {
      const { error } = await supabase.from('criadores').insert(body);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Criador registrado');
    }
    setModal(false);
    cargar();
  };

  const toggleActivo = async (c) => {
    await supabase.from('criadores').update({ activo: !c.activo }).eq('id', c.id);
    cargar();
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <p>Solo los administradores pueden gestionar criadores</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>👤 Criadores</h2>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo Criador</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Ubicación</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {criadores.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">👤</div><p>No hay criadores</p></div></td></tr>
            ) : criadores.map(c => (
              <tr key={c.id}>
                <td style={{fontWeight:'600'}}>{c.nombre}</td>
                <td style={{color:'var(--gris-light)'}}>{c.email}</td>
                <td>{c.telefono || '—'}</td>
                <td>{c.ubicacion || '—'}</td>
                <td><span className={`badge ${c.rol === 'admin' ? 'badge-oro' : 'badge-azul'}`}>{c.rol}</span></td>
                <td>
                  <span className={`badge ${c.activo ? 'badge-verde' : 'badge-rojo'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex', gap:'6px'}}>
                    <button className="btn btn-sm btn-secondary" onClick={() => abrirEditar(c)}>Editar</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleActivo(c)}>
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editando ? 'EDITAR CRIADOR' : 'NUEVO CRIADOR'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm(f=>({...f,telefono:e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña {editando ? '(dejar vacío para no cambiar)' : '*'}</label>
                <input className="form-input" type="password" value={form.password_hash} onChange={e => setForm(f=>({...f,password_hash:e.target.value}))} placeholder="••••••••" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input className="form-input" value={form.ubicacion} onChange={e => setForm(f=>({...f,ubicacion:e.target.value}))} placeholder="Ciudad, País" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-select" value={form.rol} onChange={e => setForm(f=>({...f,rol:e.target.value}))}>
                    <option value="criador">Criador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>{editando ? 'Guardar' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
