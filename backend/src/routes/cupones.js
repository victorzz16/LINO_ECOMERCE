import { Router } from 'express';
import { validarCuponPost, bienvenidaGet } from '../controllers/cuponController.js';
const router = Router();
router.post('/validar', validarCuponPost);
router.get('/bienvenida', bienvenidaGet);
export default router;
