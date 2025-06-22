// src/config/database.js

const { Pool } = require('pg');
require('dotenv').config();

// Pega as variáveis do ambiente. O '||' oferece um valor padrão para desenvolvimento local.
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const port = parseInt(process.env.DB_PORT || '5432');
const database = process.env.DB_DATABASE;

// Monta a string de conexão, que é o formato preferido pela biblioteca 'pg'
// e lida melhor com diferentes ambientes.
const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

const pool = new Pool({
    connectionString: connectionString,
    // A configuração SSL é crucial para produção.
    // O 'pg' entende que, para conexões na nuvem, ele deve usar SSL
    // sem precisar de configurações complexas quando a string é usada.
    // Para garantir, especialmente com AWS, adicionamos esta configuração:
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Base de Dados conectada com sucesso!');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};