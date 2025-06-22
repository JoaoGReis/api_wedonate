// src/routes/organizacaoRoutes.js

const express = require('express');
const router = express.Router();
const organizacaoController = require('../controllers/organizacaoController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');

router.post('/organizacoes', upload.single('imagem'), organizacaoController.createOrganizacao);

router.get('/organizacoes', organizacaoController.listAllOrganizacoes);
router.get('/organizacoes/buscar', organizacaoController.findOrganizacoesByNome);
router.get('/organizacoes/:id', organizacaoController.findOrganizacaoById);


router.put('/organizacoes/:id', authMiddleware, upload.single('imagem'), organizacaoController.updateOrganizacaoById);
router.delete('/organizacoes/:id', authMiddleware, organizacaoController.deleteOrganizacaoById);

router.post('/login', organizacaoController.loginOrganizacao);

module.exports = router;