// src/routes/consultaRoutes.js

const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');

router.get('/consulta/cnpj/:cnpj', consultaController.consultarCNPJ);

module.exports = router;