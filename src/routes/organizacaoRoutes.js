// src/routes/organizacaoRoutes.js

const express = require('express');
const router = express.Router();
const organizacaoController = require('../controllers/organizacaoController');

// Rota POST para criar uma organização
router.post('/organizacoes', organizacaoController.createOrganizacao);

// Rota GET para listar todas as organizações
router.get('/organizacoes', organizacaoController.listAllOrganizacoes);

// Rota GET para buscar uma organização por ID
router.get('/organizacoes/:id', organizacaoController.findOrganizacaoById);

// Rota PUT para atualizar uma organização por ID
router.put('/organizacoes/:id', organizacaoController.updateOrganizacaoById);

// Rota DELETE para remover uma organização por ID
router.delete('/organizacoes/:id', organizacaoController.deleteOrganizacaoById);

// Rota POST para autenticar uma organização
router.post('/login', organizacaoController.loginOrganizacao);

module.exports = router;