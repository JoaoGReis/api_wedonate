// src/routes/campanhaRoutes.js
const express = require('express');
const router = express.Router();
const campanhaController = require('../controllers/campanhaController');
const upload = require('../config/multerConfig');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/campanhas', authMiddleware, upload.single('imagem'), campanhaController.createCampanha);

router.get('/campanhas', campanhaController.listAllCampanhas);
router.get('/campanhas/buscar', campanhaController.findCampanhasByTitulo);
router.get('/campanhas/:id', campanhaController.findCampanhaById);

router.put('/campanhas/:id', authMiddleware, upload.single('imagem'), campanhaController.updateCampanhaById);
router.delete('/campanhas/:id', authMiddleware, campanhaController.deleteCampanhaById);

module.exports = router;