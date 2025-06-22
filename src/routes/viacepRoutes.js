// src/routes/viacepRoutes.js

const express = require('express');
const router = express.Router();
const viacepController = require('../controllers/viacepController');


router.get('/cep/:cep', viacepController.consultarCep);

module.exports = router;