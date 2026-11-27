import { Router } from 'express';
import { pedidoPost, misPedidosGet } from '../controllers/pedidoController.js';
const router = Router();
router.get('/mis-pedidos', misPedidosGet);
router.post('/', pedidoPost);
export default router;
