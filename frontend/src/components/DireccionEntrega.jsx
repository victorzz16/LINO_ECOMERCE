import { useEffect, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
const KEY = 'lino_direccion_entrega_v1';
const vacia = { departamento:'Lima', provincia:'Lima', distrito:'', direccion:'', referencia:'', lat:null, lng:null };
export function leerDireccionGuardada() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export default function DireccionEntrega({ onChange, compact = false }) {
  const [datos, setDatos] = useState(() => ({ ...vacia, ...(leerDireccionGuardada() || {}) }));
  const [estadoGeo, setEstadoGeo] = useState('');
  function actualizar(campo, valor) { setDatos(actual => { const next = { ...actual, [campo]: valor }; localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('lino:direccion-actualizada')); return next; }); }
  useEffect(() => { const texto = [datos.direccion, datos.referencia, datos.distrito, datos.provincia, datos.departamento].filter(Boolean).join(', ').slice(0,300); onChange?.(texto); }, [datos, onChange]);
  function ubicacionActual() {
    if (!navigator.geolocation) { setEstadoGeo('Tu navegador no permite obtener la ubicación.'); return; }
    setEstadoGeo('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      let next = { ...datos, lat: coords.latitude, lng: coords.longitude };
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
        const r = await fetch(url, { headers: { Accept: 'application/json' } });
        if (r.ok) {
          const d = await r.json(); const a = d.address || {};
          next = { ...next, direccion: [a.road, a.house_number].filter(Boolean).join(' ' ) || d.display_name || '', distrito: a.suburb || a.city_district || a.town || a.city || next.distrito, provincia: a.county || a.city || next.provincia, departamento: a.state || next.departamento };
        }
      } catch { /* Se conservan las coordenadas si la búsqueda inversa no responde. */ }
      setDatos(next); localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('lino:direccion-actualizada')); setEstadoGeo('Ubicación capturada. Revisa y completa la dirección antes de confirmar.');
    }, error => setEstadoGeo(error.code === 1 ? 'Permite el acceso a la ubicación en tu navegador.' : 'No se pudo obtener tu ubicación. Ingresa la dirección manualmente.'), { enableHighAccuracy:true, timeout:12000, maximumAge:60000 });
  }
  return <section className={`address-editor ${compact ? 'address-editor-compact' : ''}`}>
    <div className="address-editor-title"><MapPin size={19}/><strong>Dirección de entrega</strong></div>
    <p className="address-hint">Indica dónde quieres recibir tu pedido o utiliza tu ubicación actual.</p>
    <button type="button" className="btn btn-outline address-location" onClick={ubicacionActual}><LocateFixed size={16}/> Usar mi ubicación actual</button>
    <div className="address-grid">
      <label>Departamento<input value={datos.departamento} onChange={e=>actualizar('departamento',e.target.value)} required maxLength="80"/></label>
      <label>Provincia<input value={datos.provincia} onChange={e=>actualizar('provincia',e.target.value)} required maxLength="80"/></label>
      <label>Distrito<input value={datos.distrito} onChange={e=>actualizar('distrito',e.target.value)} required maxLength="80"/></label>
      <label className="address-wide">Dirección exacta<input value={datos.direccion} onChange={e=>actualizar('direccion',e.target.value)} placeholder="Av., calle, número, interior" required minLength="4" maxLength="160"/></label>
      <label className="address-wide">Referencia (opcional)<input value={datos.referencia} onChange={e=>actualizar('referencia',e.target.value)} placeholder="Frente al parque, edificio azul…" maxLength="100"/></label>
    </div>
    {datos.lat && datos.lng && <small className="address-coords">Coordenadas guardadas: {datos.lat.toFixed(5)}, {datos.lng.toFixed(5)}</small>}
    {estadoGeo && <small className="address-status" role="status">{estadoGeo}</small>}
  </section>;
}
