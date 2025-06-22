// src/routes/viacepRoutes.js

const express = require('express');
const router = express.Router();
const viacepController = require('../controllers/viacepController');

// Define a rota pública para a consulta de CEP.
// Ex: /consultas/cep/18270010
router.get('/cep/:cep', viacepController.consultarCep);

module.exports = router;