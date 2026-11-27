import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, Menu, Search, ShoppingBag, User, X, CircleHelp, Package, MapPin, Bookmark } from 'lucide-react';
import { useCarrito } from '../context/CarritoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import DireccionEntrega, { leerDireccionGuardada } from './DireccionEntrega.jsx';
import { obtenerEstadoBienvenida } from '../services/api.js';

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [direccionAbierta, setDireccionAbierta] = useState(false);
  const [direccionActual, setDireccionActual] = useState(() => leerDireccionGuardada());
  const [fraseIndex, setFraseIndex] = useState(0);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(true);
  const actualizarDireccion = useCallback(() => setDireccionActual(leerDireccionGuardada()), []);
  useEffect(() => { window.addEventListener('lino:direccion-actualizada', actualizarDireccion); return () => window.removeEventListener('lino:direccion-actualizada', actualizarDireccion); }, [actualizarDireccion]);
  const navegar = useNavigate();
  const { cantidadTotal } = useCarrito();
  const { usuario, cargando, cerrarSesion } = useAuth();
  useEffect(() => { let activo=true; const revisar=()=>obtenerEstadoBienvenida().then(r=>{if(activo)setMostrarBienvenida(r.mostrar);}).catch(()=>{}); revisar(); const evento=()=>revisar(); window.addEventListener('lino:actualizar-bienvenida',evento); return ()=>{activo=false;window.removeEventListener('lino:actualizar-bienvenida',evento);}; }, [usuario]);
  const frases = ['Nuevos estilos para todos los días', 'Precios finales con IGV incluido', 'Envío gratis llevando 2 o más unidades', ...(mostrarBienvenida ? ['¡Bienvenida a LINO! Usa BIENVENIDA10 en tu primera compra'] : [])];
  useEffect(() => { const id=window.setInterval(()=>setFraseIndex(i=>(i+1)%frases.length),3000); return ()=>window.clearInterval(id); }, [frases.length]);
  function cerrar() { setMenuAbierto(false); setBusquedaAbierta(false); }
  async function salir() { await cerrarSesion(); cerrar(); navegar('/'); }
  function buscar(evento) { evento.preventDefault(); navegar(`/catalogo?buscar=${encodeURIComponent(texto.trim())}`); cerrar(); }
  const links = [
    { ruta: '/', texto: 'Inicio', end: true },
    { ruta: '/catalogo', texto: 'Colección', end: true },
    { ruta: '/catalogo?categoria=mujer', texto: 'Mujer' },
    { ruta: '/catalogo?categoria=hombre', texto: 'Hombre' },
    { ruta: '/catalogo?categoria=accesorios', texto: 'Accesorios' },
    { ruta: '/catalogo?categoria=zapatillas', texto: 'Zapatillas' },
  ];
  const cuenta = usuario ? <>
    <Link to="/mi-cuenta" className="nav-account-link" onClick={cerrar}><User size={15}/> Mi cuenta</Link>
    <Link to="/mi-cuenta/listas" className="nav-account-link nav-favorites-link" onClick={cerrar} aria-label="Mis favoritos" title="Mis favoritos"><Bookmark size={19}/></Link>
    {usuario.rol === 'admin' && <Link to="/admin" className="nav-account-link nav-admin-link" onClick={cerrar}>Administración</Link>}
    <button type="button" className="nav-account-link nav-logout" onClick={salir}><LogOut size={15}/> Salir</button>
  </> : <Link to="/login" className="nav-account-link" onClick={cerrar}><User size={15}/> Iniciar sesión</Link>;
  return <>
    <div className="announcement"><button type="button" className="delivery-trigger" onClick={()=>setDireccionAbierta(true)}><MapPin size={15}/> Entrega en {direccionActual?.distrito || 'tu zona'}</button><span className="announcement-divider">•</span><span className="announcement-rotating" key={fraseIndex}>{frases[fraseIndex % frases.length]}</span><ArrowUpRight size={13} aria-hidden="true" /></div>
    <header className="site-header">
      <div className="header-inner container">
        <button type="button" className="icon-button mobile-toggle" onClick={() => setMenuAbierto(a => !a)} aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuAbierto}>{menuAbierto ? <X size={23}/> : <Menu size={23}/>}</button>
        <Link to="/" className="logo" onClick={cerrar} aria-label="LINO, ir a inicio">LINO<span className="logo-dot">.</span></Link>
        <nav className={`main-nav ${menuAbierto ? 'is-open' : ''}`} aria-label="Navegación principal">
          {links.map(({ ruta, texto, end }) => <NavLink key={ruta} to={ruta} end={end} className={({ isActive }) => {
            const activo = ruta.includes('?') ? window.location.pathname + window.location.search === ruta : isActive && (!end || !window.location.search);
            return activo ? 'nav-link active' : 'nav-link';
          }} onClick={cerrar}>{texto}</NavLink>)}
          <Link to="/centro-ayuda" className="nav-link nav-mobile-extra" onClick={cerrar}>Centro de ayuda</Link>
          <div className="auth-mobile">{!cargando && cuenta}</div>
        </nav>
        <div className="header-actions">
          <Link to="/centro-ayuda" className="icon-button help-header" title="Centro de ayuda" aria-label="Centro de ayuda"><CircleHelp size={19}/></Link>
          <button type="button" className="icon-button" title="Buscar prendas" aria-label="Abrir búsqueda" aria-expanded={busquedaAbierta} onClick={() => { setBusquedaAbierta(a => !a); setMenuAbierto(false); }}><Search size={21}/></button>
          <Link to="/carrito" className="icon-button cart-button" aria-label={`Carrito con ${cantidadTotal} productos`} onClick={cerrar}><ShoppingBag size={21}/>{cantidadTotal > 0 && <span className="cart-count">{cantidadTotal}</span>}</Link>
          <div className="auth-desktop">{!cargando && cuenta}</div>
        </div>
      </div>
      {direccionAbierta && <div className="address-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDireccionAbierta(false);}}><div className="address-modal"><button className="address-modal-close" onClick={()=>setDireccionAbierta(false)} aria-label="Cerrar"><X/></button><DireccionEntrega compact onChange={actualizarDireccion}/><button className="btn btn-dark" onClick={()=>setDireccionAbierta(false)}>Guardar dirección</button></div></div>}
      {busquedaAbierta && <form className="search-bar container" onSubmit={buscar} role="search"><Search size={19}/><input autoFocus value={texto} onChange={e => setTexto(e.target.value)} placeholder="Busca camisetas, pantalones, accesorios..." aria-label="Buscar productos"/><button type="submit" className="search-submit">Buscar <ArrowUpRight size={16}/></button></form>}
    </header>
  </>;
}
