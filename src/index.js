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
const campanhaRoutes = require('./routes/campanhaRoutes');
const localRoutes = require('./routes/localRoutes');
const consultaRoutes = require('./routes/consultaRoutes'); // 1. IMPORTAR AS NOVAS ROTAS AQUI

// Define um prefixo para as rotas.
app.use('/api/v1', organizacaoRoutes);
app.use('/api/v1', campanhaRoutes);
app.use('/api/v1', localRoutes);
app.use('/api/v1', consultaRoutes); // 2. USAR AS NOVAS ROTAS AQUI

// Rota raiz para teste
app.get('/', (req, res) => {
    res.send('API WeDonate está no ar!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});