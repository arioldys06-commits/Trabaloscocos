import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

export default function Genealogia({ galloInicial }) {
  const toast = useToast();
  const [gallos, setGallos] = useState([]);
  const [galloSel, setGalloSel] = useState(galloInicial || null);
  const [arbol, setArbol] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { galloId, tipo: 'padre'|'madre', sexo: 'M'|'H' }

  useEffect(() => { cargarGallos(); }, []);

  useEffect(() => {
    if (galloInicial) setGalloSel(galloInicial);
  }, [galloInicial]);

  useEffect(() => {
    if (galloSel) cargarArbol(galloSel.id);
    else setArbol(null);
  }, [galloSel]);

  const cargarGallos = async () => {
    const { data } = await supabase.from('gallos').select('id,nombre,raza,sexo,codigo_anillo,linea_genetica').order('nombre');
    setGallos(data || []);
  };

  const cargarArbol = useCallback(async (id) => {
    setLoading(true);
    const data = await buildArbol(id, 3);
    setArbol(data);
    setLoading(false);
  }, []);

  const buildArbol = async (id, maxGen) => {
    if (!id || maxGen === 0) return null;
    const [galloRes, genRes] = await Promise.all([
      supabase.from('gallos').select('*').eq('id', id).single(),
      supabase.from('genealogia').select('padre_id,madre_id').eq('gallo_id', id).single()
    ]);
    if (!galloRes.data) return null;
    const gen = genRes.data;
    const [padre, madre] = await Promise.all([
      gen?.padre_id ? buildArbol(gen.padre_id, maxGen - 1) : null,
      gen?.madre_id ? buildArbol(gen.madre_id, maxGen - 1) : null
    ]);
    return { ...galloRes.data, padre, madre, padre_id: gen?.padre_id, madre_id: gen?.madre_id };
  };

  const asignar = async (galloDestinoId, tipo, galloOrigenId) => {
    const { data: existing } = await supabase.from('genealogia').select('*').eq('gallo_id', galloDestinoId).single();
    const body = {
      gallo_id: galloDestinoId,
      padre_id: existing?.padre_id || null,
      madre_id: existing?.madre_id || null,
      [tipo === 'padre' ? 'padre_id' : 'madre_id']: galloOrigenId
    };
    if (existing) {
      await supabase.from('genealogia').update(body).eq('gallo_id', galloDestinoId);
    } else {
      await supabase.from('genealogia').insert(body);
    }
    toast(`${tipo === 'padre' ? 'Padre' : 'Madre'} asignado correctamente`);
    setModal(null);
    cargarArbol(galloSel.id);
  };

  const quitar = async (galloDestinoId, tipo) => {
    if (!window.confirm(`¿Quitar el ${tipo} de este gallo?`)) return;
    const { data: existing } = await supabase.from('genealogia').select('*').eq('gallo_id', galloDestinoId).single();
    if (!existing) return;
    const body = { ...existing, [tipo === 'padre' ? 'padre_id' : 'madre_id']: null };
    await supabase.from('genealogia').update(body).eq('gallo_id', galloDestinoId);
    toast(`${tipo === 'padre' ? 'Padre' : 'Madre'} removido`);
    cargarArbol(galloSel.id);
  };

  // Renderiza un nodo del árbol
  const Nodo = ({ nodo, tipo, galloDestinoId, gen }) => {
    const esVacio = !nodo;
    const sexoReq = tipo === 'padre' ? 'M' : 'H';

    if (esVacio) {
      return (
        <div
          className={`arbol-node arbol-node-empty ${tipo}`}
          onClick={() => setModal({ galloId: galloDestinoId, tipo, sexo: sexoReq })}
          style={{ cursor:'pointer', borderStyle:'dashed', minHeight:'80px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
        >
          <div style={{ fontSize:'1.4rem', color:'var(--gris-light)' }}>+</div>
          <div style={{ fontSize:'11px', color:'var(--gris-light)', marginTop:'4px' }}>
            Asignar {tipo === 'padre' ? '♂ Padre' : '♀ Madre'}
          </div>
        </div>
      );
    }

    return (
      <div className={`arbol-node ${tipo}`} style={{ minHeight:'80px' }}>
        {nodo.foto_url ? (
          <img src={nodo.foto_url} alt={nodo.nombre}
            style={{ width:'48px', height:'48px', borderRadius:'50%', objectFit:'cover', border:'2px solid var(--oro)', marginBottom:'6px' }} />
        ) : (
          <div style={{ fontSize:'1.4rem', marginBottom:'4px' }}>{tipo === 'padre' ? '♂' : '♀'}</div>
        )}
        <div className="arbol-node-nombre" style={{ fontSize:'12px' }}>{nodo.nombre}</div>
        {nodo.raza && <div className="arbol-node-info">{nodo.raza}</div>}
        {nodo.codigo_anillo && <div className="arbol-node-info" style={{ fontSize:'10px' }}>{nodo.codigo_anillo}</div>}
        {gen <= 2 && (
          <div style={{ display:'flex', gap:'4px', marginTop:'6px', justifyContent:'center', flexWrap:'wrap' }}>
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize:'10px', padding:'2px 8px' }}
              onClick={() => setModal({ galloId: nodo.id, tipo: 'padre', sexo: 'M' })}
              title="Asignar padre"
            >+♂</button>
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize:'10px', padding:'2px 8px' }}
              onClick={() => setModal({ galloId: nodo.id, tipo: 'madre', sexo: 'H' })}
              title="Asignar madre"
            >+♀</button>
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize:'10px', padding:'2px 8px', color:'var(--rojo)' }}
              onClick={() => quitar(galloDestinoId, tipo)}
              title="Quitar"
            >✕</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>🌳 Árbol Genealógico</h2>
      </div>

      {/* Selector */}
      <div className="card" style={{ marginBottom:'24px' }}>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Seleccionar Gallo Principal</label>
          <select
            className="form-select"
            style={{ maxWidth:'420px' }}
            value={galloSel?.id || ''}
            onChange={e => {
              const g = gallos.find(x => x.id === e.target.value);
              setGalloSel(g || null);
            }}
          >
            <option value="">-- Selecciona un gallo --</option>
            {gallos.map(g => (
              <option key={g.id} value={g.id}>
                {g.sexo === 'M' ? '♂' : '♀'} {g.nombre} {g.codigo_anillo ? `(${g.codigo_anillo})` : ''} {g.raza ? `— ${g.raza}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--gris-light)' }}>
          Construyendo árbol...
        </div>
      )}

      {!galloSel && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <p>Selecciona un gallo para ver y editar su árbol genealógico</p>
        </div>
      )}

      {arbol && !loading && (
        <div className="card">
          <div className="arbol-wrap">
            <div className="arbol" style={{ alignItems:'flex-start' }}>

              {/* GALLO PRINCIPAL */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Gallo</div>
                <div className="arbol-node gallo-principal" style={{ margin:'6px 8px', flex:'none' }}>
                  {arbol.foto_url ? (
                    <img src={arbol.foto_url} alt={arbol.nombre}
                      style={{ width:'56px', height:'56px', borderRadius:'50%', objectFit:'cover', border:'2px solid var(--oro)', marginBottom:'6px' }} />
                  ) : (
                    <div style={{ fontSize:'1.8rem', marginBottom:'4px' }}>🐓</div>
                  )}
                  <div className="arbol-node-nombre">{arbol.nombre}</div>
                  {arbol.raza && <div className="arbol-node-info">{arbol.raza}</div>}
                  {arbol.peso_actual && <div className="arbol-node-info">{arbol.peso_actual} lbs</div>}
                </div>
              </div>

              <div className="arbol-connector">›</div>

              {/* PADRES (Gen 1) */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Padres</div>
                <Nodo nodo={arbol.padre} tipo="padre" galloDestinoId={arbol.id} gen={1} />
                <Nodo nodo={arbol.madre} tipo="madre" galloDestinoId={arbol.id} gen={1} />
              </div>

              <div className="arbol-connector">›</div>

              {/* ABUELOS (Gen 2) */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Abuelos</div>
                <Nodo nodo={arbol.padre?.padre} tipo="padre" galloDestinoId={arbol.padre?.id} gen={2} />
                <Nodo nodo={arbol.padre?.madre} tipo="madre" galloDestinoId={arbol.padre?.id} gen={2} />
                <Nodo nodo={arbol.madre?.padre} tipo="padre" galloDestinoId={arbol.madre?.id} gen={2} />
                <Nodo nodo={arbol.madre?.madre} tipo="madre" galloDestinoId={arbol.madre?.id} gen={2} />
              </div>

              <div className="arbol-connector">›</div>

              {/* BISABUELOS (Gen 3) */}
              <div className="arbol-gen">
                <div className="arbol-gen-label">Bisabuelos</div>
                <Nodo nodo={arbol.padre?.padre?.padre} tipo="padre" galloDestinoId={arbol.padre?.padre?.id} gen={3} />
                <Nodo nodo={arbol.padre?.padre?.madre} tipo="madre" galloDestinoId={arbol.padre?.padre?.id} gen={3} />
                <Nodo nodo={arbol.padre?.madre?.padre} tipo="padre" galloDestinoId={arbol.padre?.madre?.id} gen={3} />
                <Nodo nodo={arbol.padre?.madre?.madre} tipo="madre" galloDestinoId={arbol.padre?.madre?.id} gen={3} />
                <Nodo nodo={arbol.madre?.padre?.padre} tipo="padre" galloDestinoId={arbol.madre?.padre?.id} gen={3} />
                <Nodo nodo={arbol.madre?.padre?.madre} tipo="madre" galloDestinoId={arbol.madre?.padre?.id} gen={3} />
                <Nodo nodo={arbol.madre?.madre?.padre} tipo="padre" galloDestinoId={arbol.madre?.madre?.id} gen={3} />
                <Nodo nodo={arbol.madre?.madre?.madre} tipo="madre" galloDestinoId={arbol.madre?.madre?.id} gen={3} />
              </div>

            </div>
          </div>

          {/* Leyenda */}
          <div style={{ display:'flex', gap:'20px', marginTop:'20px', padding:'12px 16px', background:'var(--gris-mid)', borderRadius:'8px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'12px', color:'var(--gris-light)', display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'12px', height:'12px', borderLeft:'3px solid #3498db', display:'inline-block' }}></span> Línea paterna
            </span>
            <span style={{ fontSize:'12px', color:'var(--gris-light)', display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'12px', height:'12px', borderLeft:'3px solid #e91e8c', display:'inline-block' }}></span> Línea materna
            </span>
            <span style={{ fontSize:'12px', color:'var(--gris-light)' }}>+♂ / +♀ = asignar ancestro &nbsp;|&nbsp; ✕ = quitar</span>
          </div>
        </div>
      )}

      {/* MODAL SELECCIONAR GALLO */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>ASIGNAR {modal.tipo === 'padre' ? '♂ PADRE' : '♀ MADRE'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--gris-light)', fontSize:'13px', marginBottom:'16px' }}>
                Selecciona el {modal.tipo} de <strong style={{ color:'var(--blanco)' }}>
                  {gallos.find(g => g.id === modal.galloId)?.nombre || 'este gallo'}
                </strong>
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'400px', overflowY:'auto' }}>
                {gallos
                  .filter(g => g.id !== modal.galloId && g.id !== galloSel?.id)
                  .filter(g => g.sexo === modal.sexo)
                  .map(g => (
                    <button
                      key={g.id}
                      className="btn btn-ghost"
                      style={{ justifyContent:'flex-start', gap:'12px', textAlign:'left' }}
                      onClick={() => asignar(modal.galloId, modal.tipo, g.id)}
                    >
                      <span style={{ fontSize:'1.2rem' }}>{g.sexo === 'M' ? '♂' : '♀'}</span>
                      <div>
                        <div style={{ fontWeight:'600', color:'var(--blanco)' }}>{g.nombre}</div>
                        <div style={{ fontSize:'11px', color:'var(--gris-light)' }}>
                          {g.raza || 'Sin raza'} {g.codigo_anillo ? `· ${g.codigo_anillo}` : ''} {g.linea_genetica ? `· ${g.linea_genetica}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                {gallos.filter(g => g.id !== modal.galloId && g.sexo === modal.sexo).length === 0 && (
                  <div className="empty-state" style={{ padding:'24px' }}>
                    <p>No hay {modal.sexo === 'M' ? 'machos' : 'hembras'} registrados</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
