import { supabase } from './supabase';

// Obtiene todos los ancestros de un gallo hasta N generaciones
async function getAncestors(galloId, maxGen = 3, currentGen = 1) {
  if (!galloId || currentGen > maxGen) return new Set();

  const { data } = await supabase
    .from('genealogia')
    .select('padre_id, madre_id')
    .eq('gallo_id', galloId)
    .single();

  if (!data) return new Set();

  const ancestors = new Set();
  if (data.padre_id) {
    ancestors.add(data.padre_id);
    const pAncestors = await getAncestors(data.padre_id, maxGen, currentGen + 1);
    pAncestors.forEach(a => ancestors.add(a));
  }
  if (data.madre_id) {
    ancestors.add(data.madre_id);
    const mAncestors = await getAncestors(data.madre_id, maxGen, currentGen + 1);
    mAncestors.forEach(a => ancestors.add(a));
  }
  return ancestors;
}

// Detecta ancestros comunes entre padre y madre
export async function detectarConsanguinidad(padreId, madreId) {
  if (!padreId || !madreId) return [];

  const [ancestrosPadre, ancestrosMadre] = await Promise.all([
    getAncestors(padreId),
    getAncestors(madreId)
  ]);

  // También incluir al padre y madre mismos
  ancestrosPadre.add(padreId);
  ancestrosMadre.add(madreId);

  const comunes = [...ancestrosPadre].filter(a => ancestrosMadre.has(a));

  if (comunes.length === 0) return [];

  // Obtener nombres de los ancestros comunes
  const { data } = await supabase
    .from('gallos')
    .select('id, nombre, codigo_anillo')
    .in('id', comunes);

  return data || [];
}
