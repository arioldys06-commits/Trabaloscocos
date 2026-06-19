import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';

const ESTADOS = ['Activo','Retirado','Muerto','Vendido','Reproductor'];

const RAZAS_LATAM = [
  'Sweater','Kelso','Hatch','Albany','Roundhead','Claret','Grey',
  'Butcher','Lemon','Radio','Blueface','Warhorse','Perú','Asil',
  'Shamo','Malay','Gamefowl Dominicano','Cubano','Colombiano',
  'Mexicano','Puerto Rico','Otra (escribir)'
];

const PARENTESCOS = [
  'Padre','Madre','Hijo','Hija','Hermano','Hermana',
  'Abuelo Paterno','Abuela Paterna','Abuelo Materno','Abuela Materna',
  'Tío','Tía','Primo','Prima','Sin parentesco'
];

export default function Gallos({ onVerGenealogia }) {
  const { user } = useAuth();
  const toast = useToast();
  const [gallos, setGallos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSexo, setFiltroSexo] = useState('');
  const [form, setForm] = useState(defaultForm());
  const [uploading, setUploading] = useState(false);
  const [razaManual, setRazaManual] = useState(false);

  function defaultForm() {
    return {
      nombre:'', alias:'', codigo_anillo:'', fecha_nacimiento:'',
      raza:'', linea_genetica:'', color_plumaje:'', color_patas:'',
      peso_actual:'', sexo:'M', estado:'Activo', notas:'', foto_url:'',
      parentesco:''
    };
  }

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gallos')
      .select('*')
      .order('nombre');
    setGallos(data || []);
    setLoading(false);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(defaultForm());
    setRazaManual(false);
    setModal(true);
  };

  const abrirEditar = (g) => {
    setEditando(g);
    const esRazaConocida = RAZAS_LATAM.includes(g.raza);
    setRazaManual(!esRazaConocida && !!g.raza);
    setForm({
      nombre: g.nombre || '',
      alias: g.alias || '',
      codigo_anillo: g.codigo_anillo || '',
      fecha_nacimiento: g.fecha_nacimiento || '',
      raza: g.raza || '',
      linea_genetica: g.linea_genetica || '',
      color_plumaje: g.color_plumaje || '',
      color_patas: g.color_patas || '',
      peso_actual: g.peso_actual || '',
      sexo: g.sexo || 'M',
      estado: g.estado || 'Activo',
      notas: g.notas || '',
      foto_url: g.foto_url || '',
      parentesco: g.parentesco || '',
    });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { toast('El nombre es requerido', 'error'); return; }
    const body = {
      nombre: form.nombre,
      alias: form.alias,
      codigo_anillo: form.codigo_anillo || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      raza: form.raza,
      linea_genetica: form.linea_genetica,
      color_plumaje: form.color_plumaje,
      color_patas: form.color_patas,
      peso_actual: form.peso_actual || null,
      sexo: form.sexo,
      estado: form.estado,
      notas: form.notas,
      foto_url: form.foto_url,
      parentesco: form.parentesco,
      criador_id: user?.id
    };
    if (editando) {
      const { error } = await supabase.from('gallos').update(body).eq('id', editando.id);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Gallo actualizado');
    } else {
      const { error } = await supabase.from('gallos').insert(body);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Gallo registrado');
    }
    setModal(false);
    cargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este gallo?')) return;
    await supabase.from('gallos').delete().eq('id', id);
    toast('Gallo eliminado', 'warning');
    cargar();
  };

  const uploadFoto = async (file) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `gallo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('gallos-fotos').upload(fileName, file, { upsert:true });
    if (error) { toast('Error subiendo foto: ' + error.message, 'error'); setUploading(false); return; }
    const { data } = supabase.storage.from('gallos-fotos').getPublicUrl(fileName);
    setForm(f => ({ ...f, foto_url: data.publicUrl }));
    setUploading(false);
    toast('Foto subida');
  };

  const onRazaSelect = (val) => {
    if (val === 'Otra (escribir)') {
      setRazaManual(true);
      setForm(f => ({ ...f, raza: '' }));
    } else {
      setRazaManual(false);
      setForm(f => ({ ...f, raza: val }));
    }
  };

  const filtrados = gallos.filter(g => {
    const q = busqueda.toLowerCase();
    const match = !q || g.nombre?.toLowerCase().includes(q) || g.codigo_anillo?.toLowerCase().includes(q) || g.raza?.toLowerCase().includes(q);
    const esFiltroEstado = !filtroEstado || g.estado === filtroEstado;
    const esFiltroSexo = !filtroSexo || g.sexo === filtroSexo;
    return match && esFiltroEstado && esFiltroSexo;
  });

  const estadoBadge = (e) => {
    const map = { Activo:'verde', Retirado:'gris', Muerto:'rojo', Vendido:'oro', Reproductor:'azul' };
    return `badge badge-${map[e] || 'gris'}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>🐓 Gallos</h2>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo Gallo</button>
      </div>

      <div style={{display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap'}}>
        <div className="search-bar" style={{flex:'1', minWidth:'200px'}}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Buscar por nombre, anillo, raza..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select className="form-select" style={{width:'160px'}} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
        <select className="form-select" style={{width:'140px'}} value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}>
          <option value="">Ambos sexos</option>
          <option value="M">Machos</option>
          <option value="H">Hembras</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gallo</th>
              <th>Anillo</th>
              <th>Raza / Línea</th>
              <th>Parentesco</th>
              <th>Sexo</th>
              <th>Peso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{textAlign:'center', padding:'40px', color:'var(--gris-light)'}}>Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">🐓</div><p>No se encontraron gallos</p></div></td></tr>
            ) : filtrados.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <div className="gallo-avatar">
                      {g.foto_url ? <img src={g.foto_url} alt={g.nombre} /> : '🐓'}
                    </div>
                    <div>
                      <div style={{fontWeight:'600'}}>{g.nombre}</div>
                      {g.alias && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>"{g.alias}"</div>}
                    </div>
                  </div>
                </td>
                <td style={{color:'var(--gris-light)', fontSize:'12px'}}>{g.codigo_anillo || '—'}</td>
                <td>
                  <div>{g.raza || '—'}</div>
                  {g.linea_genetica && <div style={{color:'var(--gris-light)', fontSize:'12px'}}>{g.linea_genetica}</div>}
                </td>
                <td>
                  {g.parentesco
                    ? <span className="badge badge-azul">{g.parentesco}</span>
                    : <span style={{color:'var(--gris-light)'}}>—</span>}
                </td>
                <td>{g.sexo === 'M' ? '♂ Macho' : '♀ Hembra'}</td>
                <td>{g.peso_actual ? `${g.peso_actual} lbs` : '—'}</td>
                <td><span className={estadoBadge(g.estado)}>{g.estado}</span></td>
                <td>
                  <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                    <button className="btn btn-sm btn-ghost" onClick={() => onVerGenealogia(g)} title="Ver árbol genealógico">🌳</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => abrirEditar(g)}>Editar</button>
                    <button className="btn btn-sm btn-ghost" style={{color:'var(--rojo)'}} onClick={() => eliminar(g.id)}>Eliminar</button>
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
              <h3>{editando ? 'EDITAR GALLO' : 'NUEVO GALLO'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Foto */}
              <div className="form-group" style={{textAlign:'center'}}>
                {form.foto_url
                  ? <img src={form.foto_url} alt="preview" className="foto-preview" style={{marginBottom:'8px'}} />
                  : <div style={{fontSize:'3rem', marginBottom:'8px'}}>🐓</div>
                }
                <div className="foto-upload" onClick={() => document.getElementById('fotoInput').click()}>
                  <span>📷</span>
                  <span style={{fontSize:'12px', color:'var(--gris-light)'}}>
                    {uploading ? 'Subiendo...' : 'Subir foto del gallo'}
                  </span>
                </div>
                <input id="fotoInput" type="file" accept="image/*" style={{display:'none'}}
                  onChange={e => e.target.files[0] && uploadFoto(e.target.files[0])} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: El Campeón" />
                </div>
                <div className="form-group">
                  <label className="form-label">Alias / Apodo</label>
                  <input className="form-input" value={form.alias} onChange={e => setForm(f=>({...f,alias:e.target.value}))} placeholder="Ej: El Flaco" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Código / Anillo</label>
                  <input className="form-input" value={form.codigo_anillo} onChange={e => setForm(f=>({...f,codigo_anillo:e.target.value}))} placeholder="Ej: TLC-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <input className="form-input" type="date" value={form.fecha_nacimiento} onChange={e => setForm(f=>({...f,fecha_nacimiento:e.target.value}))} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Raza</label>
                  <select className="form-select"
                    value={razaManual ? 'Otra (escribir)' : (form.raza || '')}
                    onChange={e => onRazaSelect(e.target.value)}>
                    <option value="">Seleccionar raza...</option>
                    {RAZAS_LATAM.map(r => <option key={r}>{r}</option>)}
                  </select>
                  {razaManual && (
                    <input className="form-input" style={{marginTop:'8px'}}
                      value={form.raza}
                      onChange={e => setForm(f=>({...f,raza:e.target.value}))}
                      placeholder="Escribe la raza..." autoFocus />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Línea Genética</label>
                  <input className="form-input" value={form.linea_genetica} onChange={e => setForm(f=>({...f,linea_genetica:e.target.value}))} placeholder="Ej: Sweater McCarthy" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Parentesco en la Traba</label>
                <select className="form-select" value={form.parentesco} onChange={e => setForm(f=>({...f,parentesco:e.target.value}))}>
                  <option value="">Sin parentesco / No aplica</option>
                  {PARENTESCOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Color Plumaje</label>
                  <input className="form-input" value={form.color_plumaje} onChange={e => setForm(f=>({...f,color_plumaje:e.target.value}))} placeholder="Ej: Pinto" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color Patas</label>
                  <input className="form-input" value={form.color_patas} onChange={e => setForm(f=>({...f,color_patas:e.target.value}))} placeholder="Ej: Amarillo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Peso (lbs)</label>
                  <input className="form-input" type="number" step="0.1" value={form.peso_actual} onChange={e => setForm(f=>({...f,peso_actual:e.target.value}))} placeholder="0.0" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <select className="form-select" value={form.sexo} onChange={e => setForm(f=>({...f,sexo:e.target.value}))}>
                    <option value="M">♂ Macho</option>
                    <option value="H">♀ Hembra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.estado} onChange={e => setForm(f=>({...f,estado:e.target.value}))}>
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} placeholder="Observaciones adicionales..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>
                {editando ? 'Guardar cambios' : 'Registrar gallo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
