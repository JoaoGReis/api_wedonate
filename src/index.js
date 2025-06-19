// src/index.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json()); // Para o express entender JSON
app.use(cors());         // Para permitir acesso de outras origens

// Importa as rotas
const organizacaoRoutes = require('./routes/organizacaoRoutes');

// Define um prefixo para as rotas. Ex: /api/v1/organizacoes
app.use('/api/v1', organizacaoRoutes);

// Rota raiz para teste
app.get('/', (req, res) => {
    res.send('API WeDonate - CRUD Organizações');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});