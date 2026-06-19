import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { detectarConsanguinidad } from '../lib/consanguinidad';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';

export default function Cruces() {
  const { user } = useAuth();
  const toast = useToast();
  const [cruces, setCruces] = useState([]);
  const [gallos, setGallos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [alertaConsang, setAlertaConsang] = useState([]);
  const [checkingConsang, setCheckingConsang] = useState(false);

  function defaultForm() {
    return { padre_id:'', madre_id:'', fecha_cruce:'', fecha_nacimiento_cria:'', huevos_puestos:'', huevos_nacidos:'', notas:'' };
  }

  useEffect(() => { cargarCruces(); cargarGallos(); }, []);

  const cargarCruces = async () => {
    const { data } = await supabase
      .from('cruces')
      .select('*, padre:padre_id(nombre,raza), madre:madre_id(nombre,raza), criadores(nombre)')
      .order('fecha_cruce', { ascending:false });
    setCruces(data || []);
  };

  const cargarGallos = async () => {
    const { data } = await supabase.from('gallos').select('id,nombre,raza,sexo,linea_genetica').order('nombre');
    setGallos(data || []);
  };

  const chequearConsanguinidad = async (padreId, madreId) => {
    if (!padreId || !madreId) { setAlertaConsang([]); return; }
    setCheckingConsang(true);
    const comunes = await detectarConsanguinidad(padreId, madreId);
    setAlertaConsang(comunes);
    setCheckingConsang(false);
  };

  const onChangePadre = async (id) => {
    setForm(f => ({ ...f, padre_id:id }));
    await chequearConsanguinidad(id, form.madre_id);
  };

  const onChangeMadre = async (id) => {
    setForm(f => ({ ...f, madre_id:id }));
    await chequearConsanguinidad(form.padre_id, id);
  };

  const guardar = async () => {
    if (!form.padre_id || !form.madre_id || !form.fecha_cruce) {
      toast('Padre, madre y fecha son requeridos', 'error'); return;
    }
    const body = {
      ...form, criador_id: user?.id,
      huevos_puestos: parseInt(form.huevos_puestos) || 0,
      huevos_nacidos: parseInt(form.huevos_nacidos) || 0,
    };
    const { error } = await supabase.from('cruces').insert(body);
    if (error) { toast('Error: ' + error.message, 'error'); return; }

    // Guardar alertas de consanguinidad si hay
    if (alertaConsang.length > 0) {
      for (const ac of alertaConsang) {
        await supabase.from('alertas_consanguinidad').insert({
          cruce_padre_id: form.padre_id,
          cruce_madre_id: form.madre_id,
          ancestro_comun_id: ac.id,
          criador_id: user?.id
        });
      }
      toast(`⚠️ Cruce registrado con ${alertaConsang.length} alerta(s) de consanguinidad`, 'warning');
    } else {
      toast('Cruce registrado exitosamente');
    }
    setModal(false);
    cargarCruces();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este cruce?')) return;
    await supabase.from('cruces').delete().eq('id', id);
    toast('Cruce eliminado', 'warning');
    cargarCruces();
  };

  const machos = gallos.filter(g => g.sexo === 'M');
  const hembras = gallos.filter(g => g.sexo === 'H');

  return (
    <div>
      <div className="page-header">
        <h2>💉 Cruces / Reproducciones</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setAlertaConsang([]); setModal(true); }}>
          + Nuevo Cruce
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Padre ♂</th>
              <th>Madre ♀</th>
              <th>Fecha Cruce</th>
              <th>Huevos</th>
              <th>Nacidos</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cruces.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">💉</div><p>No hay cruces registrados</p></div></td></tr>
            ) : cruces.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{fontWeight:'600'}}>♂ {c.padre?.nombre || '—'}</div>
                  <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{c.padre?.raza}</div>
                </td>
                <td>
                  <div style={{fontWeight:'600'}}>♀ {c.madre?.nombre || '—'}</div>
                  <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{c.madre?.raza}</div>
                </td>
                <td>{c.fecha_cruce}</td>
                <td style={{textAlign:'center'}}>{c.huevos_puestos}</td>
                <td style={{textAlign:'center'}}>
                  <span className="badge badge-verde">{c.huevos_nacidos}</span>
                </td>
                <td style={{color:'var(--gris-light)', fontSize:'12px', maxWidth:'180px'}}>{c.notas || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-ghost" style={{color:'var(--rojo)'}} onClick={() => eliminar(c.id)}>Eliminar</button>
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
              <h3>REGISTRAR CRUCE</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">♂ Padre *</label>
                  <select className="form-select" value={form.padre_id} onChange={e => onChangePadre(e.target.value)}>
                    <option value="">Seleccionar macho...</option>
                    {machos.map(g => <option key={g.id} value={g.id}>{g.nombre} {g.raza ? `(${g.raza})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">♀ Madre *</label>
                  <select className="form-select" value={form.madre_id} onChange={e => onChangeMadre(e.target.value)}>
                    <option value="">Seleccionar hembra...</option>
                    {hembras.map(g => <option key={g.id} value={g.id}>{g.nombre} {g.raza ? `(${g.raza})` : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Alerta consanguinidad */}
              {checkingConsang && (
                <div className="alert alert-warning">⏳ Verificando consanguinidad...</div>
              )}
              {alertaConsang.length > 0 && !checkingConsang && (
                <div className="alert alert-danger">
                  <div>
                    <strong>⚠️ ALERTA DE CONSANGUINIDAD</strong>
                    <p style={{marginTop:'6px', fontSize:'12px'}}>
                      Padre y madre comparten {alertaConsang.length} ancestro(s) común(es) en las últimas 3 generaciones:
                    </p>
                    <ul style={{marginTop:'8px', paddingLeft:'16px', fontSize:'12px'}}>
                      {alertaConsang.map(a => <li key={a.id}><strong>{a.nombre}</strong> {a.codigo_anillo ? `(${a.codigo_anillo})` : ''}</li>)}
                    </ul>
                    <p style={{marginTop:'8px', fontSize:'11px', opacity:0.8}}>Puedes continuar pero se registrará la alerta.</p>
                  </div>
                </div>
              )}
              {form.padre_id && form.madre_id && alertaConsang.length === 0 && !checkingConsang && (
                <div className="alert alert-success">✅ Sin consanguinidad detectada en 3 generaciones</div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha del Cruce *</label>
                  <input className="form-input" type="date" value={form.fecha_cruce} onChange={e => setForm(f=>({...f,fecha_cruce:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Nac. Crías</label>
                  <input className="form-input" type="date" value={form.fecha_nacimiento_cria} onChange={e => setForm(f=>({...f,fecha_nacimiento_cria:e.target.value}))} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Huevos Puestos</label>
                  <input className="form-input" type="number" min="0" value={form.huevos_puestos} onChange={e => setForm(f=>({...f,huevos_puestos:e.target.value}))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Huevos Nacidos</label>
                  <input className="form-input" type="number" min="0" value={form.huevos_nacidos} onChange={e => setForm(f=>({...f,huevos_nacidos:e.target.value}))} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} placeholder="Observaciones del cruce..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className={`btn ${alertaConsang.length > 0 ? 'btn-oro' : 'btn-primary'}`} onClick={guardar}>
                {alertaConsang.length > 0 ? '⚠️ Registrar con alerta' : 'Registrar cruce'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
