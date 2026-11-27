import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CarritoProvider, useCarrito } from './context/CarritoContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollTop from './components/ScrollTop.jsx';
import ChatAyuda from './components/ChatAyuda.jsx';
import Inicio from './pages/Inicio.jsx';
import Catalogo from './pages/Catalogo.jsx';
import DetalleProducto from './pages/DetalleProducto.jsx';
import Carrito from './pages/Carrito.jsx';
import Nosotros from './pages/Nosotros.jsx';
import Contacto from './pages/Contacto.jsx';
import CentroAyuda from './pages/CentroAyuda.jsx';
import Login from './pages/Login.jsx';
import MisPedidos from './pages/MisPedidos.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import MiPerfil from './pages/MiPerfil.jsx';
import MisListas from './pages/MisListas.jsx';
import Admin from './pages/Admin.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';

function RequireAuth({ children }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <main className="container detail-status">Verificando sesión...</main>;
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireAdmin({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <main className="container detail-status">Verificando permisos...</main>;
  if (!usuario) return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  if (usuario.rol !== 'admin') return <main className="container detail-status"><h2>Acceso restringido</h2><p>Esta sección está disponible únicamente para administración.</p><a className="btn btn-dark" href="/">Volver a la tienda</a></main>;
  return children;
}

function Layout() {
  const { mensaje } = useCarrito();
  const { cargando } = useAuth();
  if (cargando) return <main id="contenido" className="container detail-status">Cargando LINO...</main>;
  return <><ScrollTop /><Navbar /><main id="contenido">
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/catalogo" element={<Catalogo />} />
      <Route path="/producto/:id" element={<DetalleProducto />} />
      <Route path="/carrito" element={<Carrito />} />
      <Route path="/nosotros" element={<Nosotros />} />
      <Route path="/contacto" element={<Contacto />} />
      <Route path="/centro-ayuda" element={<CentroAyuda />} />
      <Route path="/login" element={<Login />} />
      <Route path="/mis-pedidos" element={<RequireAuth><MisPedidos /></RequireAuth>} />
      <Route path="/mi-cuenta" element={<RequireAuth><MiCuenta /></RequireAuth>} />
      <Route path="/mi-cuenta/perfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
      <Route path="/mi-cuenta/listas" element={<RequireAuth><MisListas /></RequireAuth>} />
      <Route path="/admin/*" element={<RequireAdmin><Admin /></RequireAdmin>} />
      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  </main><Footer /><ChatAyuda />{mensaje && <div className="toast" role="status">{mensaje}</div>}</>;
}
export default function App() {
  return <BrowserRouter><AuthProvider><CarritoProvider><Layout /></CarritoProvider></AuthProvider></BrowserRouter>;
}
