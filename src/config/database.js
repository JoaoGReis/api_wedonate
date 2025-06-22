const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let connectionConfig;

if (isProduction) {

    if (!process.env.DATABASE_URL) {
        throw new Error('ERRO CRÍTICO: A variável DATABASE_URL não foi encontrada no ambiente de produção.');
    }

    connectionConfig = {
        connectionString: `${process.env.DATABASE_URL}?ssl=true`,
        ssl: {
            rejectUnauthorized: false
        }
    };
} else {
    connectionConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    };
}

const pool = new Pool(connectionConfig);

module.exports = {
    query: (text, params) => pool.query(text, params),
};
