// src/routes/organizacaoRoutes.js

const express = require('express');
const router = express.Router();
const organizacaoController = require('../controllers/organizacaoController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');

// Rota POST para criar uma organização
router.post('/organizacoes', upload.single('imagem'), organizacaoController.createOrganizacao);

// Rota GET para listar todas as organizações
router.get('/organizacoes', organizacaoController.listAllOrganizacoes);

// Rota GET para buscar uma organização por ID
router.get('/organizacoes/:id', organizacaoController.findOrganizacaoById);
router.get('/organizacoes/buscar', organizacaoController.findOrganizacoesByNome);

router.put('/organizacoes/:id', upload.single('imagem'), authMiddleware, organizacaoController.updateOrganizacaoById);
router.delete('/organizacoes/:id', authMiddleware, organizacaoController.deleteOrganizacaoById);

// Rota POST para autenticar uma organização
router.post('/login', organizacaoController.loginOrganizacao);

module.exports = router;