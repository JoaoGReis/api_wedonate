// src/routes/localRoutes.js

const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');
const upload = require('../config/multerConfig'); // Reutilizamos o mesmo middleware de upload!
const authMiddleware = require('../middleware/authMiddleware');

router.post('/locais', authMiddleware, upload.single('imagem'), localController.createLocal);
router.get('/locais', localController.listAllLocais); // Pode ser público
router.get('/locais/:id', localController.findLocalById); // Pode ser público
router.put('/locais/:id', authMiddleware, upload.single('imagem'), localController.updateLocalById);
router.delete('/locais/:id', authMiddleware, localController.deleteLocalById);

module.exports = router;