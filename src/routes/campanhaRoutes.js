// src/routes/campanhaRoutes.js
const express = require('express');
const router = express.Router();
const campanhaController = require('../controllers/campanhaController');
const upload = require('../config/multerConfig');

// Rota POST: Criar Campanha (com upload de 1 arquivo do campo 'imagem')
router.post('/campanhas', upload.single('imagem'), campanhaController.createCampanha);

// Rota GET: Listar todas as Campanhas
router.get('/campanhas', campanhaController.listAllCampanhas);

// Rota GET: Buscar Campanha por ID
router.get('/campanhas/:id', campanhaController.findCampanhaById);

// Rota PUT: Atualizar Campanha por ID
router.put('/campanhas/:id', upload.single('imagem'), campanhaController.updateCampanhaById);

// Rota DELETE: Deletar Campanha por ID
router.delete('/campanhas/:id', campanhaController.deleteCampanhaById);

module.exports = router;