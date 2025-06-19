// src/config/database.js

const { Pool } = require('pg');
require('dotenv').config();

// Cria um pool de conexões com base nas credenciais do arquivo .env
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        rejectUnauthorized: false // Importante para conexões com a AWS
    }
});

// Exporta um objeto que permite executar queries de forma centralizada
module.exports = {
    query: (text, params) => pool.query(text, params),
};