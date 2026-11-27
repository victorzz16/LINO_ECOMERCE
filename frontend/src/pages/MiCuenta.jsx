import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, UserCircle, CircleHelp, Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerProductos } from '../services/api.js';
import { soles } from '../services/formato.js';

const leerFavoritos = () => { try { return JSON.parse(localStorage.getItem('lino:favoritos') || '[]'); } catch { return []; } };
export default function MiCuenta() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [favoritos, setFavoritos] = useState(leerFavoritos);
  const [productos, setProductos] = useState([]);
  useEffect(() => { fetch('/api/pedidos/mis-pedidos', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : { pedidos: [] }).then(d => setPedidos(d.pedidos || [])).catch(() => {}); obtenerProductos().then(setProductos).catch(() => {}); }, []);
  useEffect(() => { const sync = () => setFavoritos(leerFavoritos()); window.addEventListener('lino:favoritos-actualizados', sync); return () => window.removeEventListener('lino:favoritos-actualizados', sync); }, []);
  const guardados = productos.filter(p => favoritos.includes(p.id));
  return <div className="account-home"><section className="account-welcome"><div><span className="account-kicker">MI CUENTA LINO</span><h1>Hola, <strong>{usuario?.nombre || 'bienvenido/a'}</strong></h1><p>Administra tus compras, tus datos y tus productos favoritos.</p></div><Link className="account-profile-shortcut" to="/mi-cuenta/perfil"><UserCircle size={20}/> Mi perfil <ArrowRight size={16}/></Link></section>
    <div className="account-quick-links"><Link to="/mis-pedidos"><Package/><strong>Mis compras</strong><span>Consulta tus pedidos</span></Link><Link to="/mi-cuenta/perfil"><UserCircle/><strong>Mi perfil</strong><span>Datos personales y direcciones</span></Link><Link to="/centro-ayuda"><CircleHelp/><strong>Ayuda</strong><span>Resuelve tus consultas</span></Link></div>
    <section className="account-section"><div className="account-section-heading"><h2>Últimas compras ({pedidos.length})</h2><Link to="/mis-pedidos">Revisar todas <ArrowRight size={15}/></Link></div>{pedidos.length ? <div className="account-order-preview">{pedidos.slice(0,5).map(p => <Link to="/mis-pedidos" className="account-order-tile" key={p.id}><span className="account-order-state">{p.estado || 'Registrado'}</span><Package size={25}/><div><strong>Pedido #{String(p.id).slice(-8)}</strong><small>{new Date(p.fecha).toLocaleDateString('es-PE')}</small></div><b>{soles(p.totalCentimos)}</b></Link>)}</div> : <div className="account-empty compact"><Package/><p>Aún no tienes compras registradas.</p><Link to="/catalogo">Explorar productos</Link></div>}</section>
    <section className="account-section"><div className="account-section-heading"><h2>Mis favoritos</h2><Link to="/mi-cuenta/listas">Ver mi lista <ArrowRight size={15}/></Link></div>{guardados.length ? <div className="account-favorite-row">{guardados.slice(0,4).map(p => <Link to={`/producto/${p.id}`} className="account-favorite-card" key={p.id}><img src={p.imagen} alt={p.nombre}/><strong>{p.nombre}</strong><span>{soles(p.precioCentimos)}</span></Link>)}</div> : <div className="account-empty compact"><Heart/><p>Guarda aquí los productos que te gustan.</p><Link to="/catalogo">Descubrir productos</Link></div>}</section>
  </div>;
}
