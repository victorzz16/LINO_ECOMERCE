import { useEffect, useState } from 'react';
import { Package, RefreshCw, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { soles } from '../services/formato.js';
import { nombreMetodoPago } from '../services/metodosPago.js';
const API = import.meta.env.VITE_API_URL || '/api';
const estadoLabel = { registrado: 'Registrado', preparando: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]); const [cargando, setCargando] = useState(true); const [error, setError] = useState('');
  async function cargar() {
    setCargando(true); setError('');
    try { const r = await fetch(`${API}/pedidos/mis-pedidos`, { credentials: 'same-origin' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'No se pudieron cargar tus pedidos.'); setPedidos(d.pedidos || []); }
    catch (e) { setError(e.message); } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  return <div className="container account-page">
    <div className="page-heading"><p className="overline">TU CUENTA LINO</p><h1>Mis <em>pedidos.</em></h1><p>Consulta el historial y el estado de tus compras.</p></div>
    <div className="account-toolbar"><span>{pedidos.length} pedidos registrados</span><button className="btn btn-outline" onClick={cargar}><RefreshCw size={16}/> Actualizar</button></div>
    {error && <div className="notice error">{error}</div>}
    {cargando ? <p className="loading">Cargando historial...</p> : pedidos.length ? <div className="orders-list">{pedidos.map(p => <article className="order-card" key={p.id}>
      <div className="order-card-top"><div><span className="order-id">PEDIDO {p.id}</span><p>{new Date(p.fecha).toLocaleString('es-PE')}</p></div><span className={`order-status status-${p.estado}`}>{estadoLabel[p.estado] || p.estado}</span></div>
      <div className="order-lines">{p.lineas.map((l,i) => <div className="order-line" key={`${p.id}-${i}`}><span>{l.nombreProducto} · {l.talla} / {l.color} × {l.cantidad}</span><strong>{soles(l.subtotalCentimos)}</strong></div>)}</div>
      <div className="order-card-bottom"><span>{nombreMetodoPago(p.metodoPago)} · {p.estadoPago === 'no_procesado' ? 'Pago demostrativo' : p.estadoPago}</span><strong>Total {soles(p.totalCentimos)}</strong></div>
    </article>)}</div> : <div className="account-empty"><Package size={42}/><h2>Aún no tienes pedidos</h2><p>Cuando realices una compra, aparecerá aquí su historial.</p><Link to="/catalogo" className="btn btn-dark"><ShoppingBag size={17}/> Explorar productos</Link></div>}
  </div>;
}
