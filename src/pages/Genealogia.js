import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function ArbolNode({ galloId, nombre, raza, tipo, onClick }) {
  if (!galloId && !nombre) {
    return (
      <div className="arbol-node arbol-node-empty">
        <div style={{fontSize:'1.2rem', color:'var(--border)'}}>?</div>
        <div style={{fontSize:'11px', color:'var(--border)'}}>Sin registro</div>
      </div>
    );
  }
  return (
    <div className={`arbol-node ${tipo || ''}`} onClick={onClick} style={{cursor: galloId ? 'pointer' : 'default'}}>
      <div style={{fontSize:'1.2rem', marginBottom:'4px'}}>{tipo === 'padre' ? '♂' : tipo === 'madre' ? '♀' : '🐓'}</div>
      <div className="arbol-node-nombre">{nombre || '—'}</div>
      {raza && <div className="arbol-node-info">{raza}</div>}
    </div>
  );
}

export default function Genealogia({ galloInicial, onNav }) {
  const [gallos, setGallos] = useState([]);
  const [galloSel, setGalloSel] = useState(galloInicial || null);
  const [arbol, setArbol] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalParent, setModalParent] = useState(null); // {tipo: 'padre'|'madre', gallo}

  useEffect(() => { cargarGallos(); }, []);
  useEffect(() => { if (galloSel) cargarArbol(galloSel.id); }, [galloSel]);
  useEffect(() => { if (galloInicial) setGalloSel(galloInicial); }, [galloInicial]);

  const cargarGallos = async () => {
    const { data } = await supabase.from('gallos').select('id,nombre,raza,sexo,codigo_anillo').order('nombre');
    setGallos(data || []);
  };

  const cargarArbol = async (id) => {
    setLoading(true);
    const arbolData = await buildArbol(id, 3);
    setArbol(arbolData);
    setLoading(false);
  };

  const buildArbol = async (id, maxGen) => {
    if (!id || maxGen === 0) return null;
    const [galloRes, genRes] = await Promise.all([
      supabase.from('gallos').select('*').eq('id', id).single(),
      supabase.from('genealogia').select('padre_id,madre_id').eq('gallo_id', id).single()
    ]);
    const gallo = galloRes.data;
    const gen = genRes.data;
    if (!gallo) return null;
    const [padre, madre] = await Promise.all([
      gen?.padre_id ? buildArbol(gen.padre_id, maxGen - 1) : null,
      gen?.madre_id ? buildArbol(gen.madre_id, maxGen - 1) : null
    ]);
    return { ...gallo, padre, madre, padre_id: gen?.padre_id, madre_id: gen?.madre_id };
  };

  const asignarParent = async (tipo, galloId) => {
    if (!galloSel) return;
    const { data: existing } = await supabase.from('genealogia').select('*').eq('gallo_id', galloSel.id).single();
    const body = { gallo_id: galloSel.id, padre_id: existing?.padre_id || null, madre_id: existing?.madre_id || null, [tipo === 'padre' ? 'padre_id' : 'madre_id']: galloId };
    if (existing) {
      await supabase.from('genealogia').update(body).eq('gallo_id', galloSel.id);
    } else {
      await supabase.from('genealogia').insert(body);
    }
    setModalParent(null);
    cargarArbol(galloSel.id);
  };

  const renderNodo = (nodo, tipo, gen) => {
    if (!nodo) {
      return (
        <div className={`arbol-node arbol-node-empty ${tipo}`}
          onClick={gen === 1 ? () => setModalParent({ tipo }) : undefined}
          style={gen === 1 ? {cursor:'pointer', borderStyle:'dashed'} : {}}>
          <div style={{fontSize:'1.1rem', color:'var(--border)'}}>+</div>
          <div style={{fontSize:'11px', color:'var(--border)'}}>
            {gen === 1 ? `Asignar ${tipo}` : 'Sin registro'}
          </div>
        </div>
      );
    }
    return (
      <div className={`arbol-node ${tipo}`}>
        <div style={{fontSize:'1.1rem'}}>{tipo === 'padre' ? '♂' : '♀'}</div>
        <div className="arbol-node-nombre">{nodo.nombre}</div>
        <div className="arbol-node-info">{nodo.raza || nodo.linea_genetica || ''}</div>
        {nodo.codigo_anillo && <div className="arbol-node-info" style={{fontSize:'10px'}}>{nodo.codigo_anillo}</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>🌳 Árbol Genealógico</h2>
      </div>

      {/* Selector de gallo */}
      <div className="card" style={{marginBottom:'24px'}}>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="form-label">Seleccionar Gallo</label>
          <select className="form-select" style={{maxWidth:'400px'}}
            value={galloSel?.id || ''}
            onChange={e => {
              const g = gallos.find(x => x.id === e.target.value);
              setGalloSel(g || null);
            }}>
            <option value="">-- Selecciona un gallo --</option>
            {gallos.map(g => (
              <option key={g.id} value={g.id}>{g.nombre} {g.codigo_anillo ? `(${g.codigo_anillo})` : ''} — {g.sexo === 'M' ? '♂' : '♀'}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{textAlign:'center', padding:'40px', color:'var(--gris-light)'}}>Cargando árbol...</div>}

      {arbol && !loading && (
        <div className="card">
          <div className="arbol-wrap">
            <div className="arbol">
              {/* Gen 1 — el gallo principal */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Gallo</div>
                <div className="arbol-node gallo-principal" style={{flex:'none', margin:'auto 8px'}}>
                  {arbol.foto_url && <img src={arbol.foto_url} alt={arbol.nombre} style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',marginBottom:'6px'}} />}
                  <div style={{fontSize:'1.1rem'}}>🐓</div>
                  <div className="arbol-node-nombre">{arbol.nombre}</div>
                  <div className="arbol-node-info">{arbol.raza}</div>
                  {arbol.peso_actual && <div className="arbol-node-info">{arbol.peso_actual} lbs</div>}
                </div>
              </div>

              <div className="arbol-connector">›</div>

              {/* Gen 2 — padre y madre */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Padres</div>
                {renderNodo(arbol.padre, 'padre', 1)}
                {renderNodo(arbol.madre, 'madre', 1)}
              </div>

              <div className="arbol-connector">›</div>

              {/* Gen 3 — abuelos */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Abuelos</div>
                {renderNodo(arbol.padre?.padre, 'padre', 2)}
                {renderNodo(arbol.padre?.madre, 'madre', 2)}
                {renderNodo(arbol.madre?.padre, 'padre', 2)}
                {renderNodo(arbol.madre?.madre, 'madre', 2)}
              </div>

              <div className="arbol-connector">›</div>

              {/* Gen 4 — bisabuelos */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Bisabuelos</div>
                {renderNodo(arbol.padre?.padre?.padre, 'padre', 3)}
                {renderNodo(arbol.padre?.padre?.madre, 'madre', 3)}
                {renderNodo(arbol.padre?.madre?.padre, 'padre', 3)}
                {renderNodo(arbol.padre?.madre?.madre, 'madre', 3)}
                {renderNodo(arbol.madre?.padre?.padre, 'padre', 3)}
                {renderNodo(arbol.madre?.padre?.madre, 'madre', 3)}
                {renderNodo(arbol.madre?.madre?.padre, 'padre', 3)}
                {renderNodo(arbol.madre?.madre?.madre, 'madre', 3)}
              </div>
            </div>
          </div>

          <div style={{display:'flex', gap:'16px', marginTop:'20px', padding:'16px', background:'var(--gris-mid)', borderRadius:'8px'}}>
            <span style={{fontSize:'12px', color:'var(--gris-light)', display:'flex', alignItems:'center', gap:'6px'}}>
              <span style={{width:'12px',height:'12px',borderLeft:'3px solid #3498db',display:'inline-block'}}></span> Línea paterna
            </span>
            <span style={{fontSize:'12px', color:'var(--gris-light)', display:'flex', alignItems:'center', gap:'6px'}}>
              <span style={{width:'12px',height:'12px',borderLeft:'3px solid #e91e8c',display:'inline-block'}}></span> Línea materna
            </span>
            <span style={{fontSize:'12px', color:'var(--gris-light)'}}>Clic en "+" para asignar padres</span>
          </div>
        </div>
      )}

      {!galloSel && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <p>Selecciona un gallo para ver su árbol genealógico</p>
        </div>
      )}

      {/* Modal asignar padre/madre */}
      {modalParent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalParent(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>ASIGNAR {modalParent.tipo?.toUpperCase()}</h3>
              <button className="modal-close" onClick={() => setModalParent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{color:'var(--gris-light)', marginBottom:'16px', fontSize:'13px'}}>
                Selecciona el {modalParent.tipo} de <strong style={{color:'var(--blanco)'}}>{galloSel?.nombre}</strong>
              </p>
              <div style={{display:'flex', flexDirection:'column', gap:'8px', maxHeight:'400px', overflowY:'auto'}}>
                {gallos
                  .filter(g => g.id !== galloSel?.id)
                  .filter(g => modalParent.tipo === 'padre' ? g.sexo === 'M' : g.sexo === 'H')
                  .map(g => (
                    <button key={g.id} className="btn btn-ghost" style={{justifyContent:'flex-start', gap:'12px'}}
                      onClick={() => asignarParent(modalParent.tipo, g.id)}>
                      <span>{g.sexo === 'M' ? '♂' : '♀'}</span>
                      <div style={{textAlign:'left'}}>
                        <div style={{fontWeight:'600'}}>{g.nombre}</div>
                        <div style={{fontSize:'11px', color:'var(--gris-light)'}}>{g.raza} {g.codigo_anillo ? `· ${g.codigo_anillo}` : ''}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalParent(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
