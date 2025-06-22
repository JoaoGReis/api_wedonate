const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    connectionString: isProduction
        ? `${process.env.DATABASE_URL}?ssl=true`
        : process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
};

if (!isProduction) {
    connectionConfig.host = process.env.DB_HOST;
    connectionConfig.port = process.env.DB_PORT;
    connectionConfig.user = process.env.DB_USER;
    connectionConfig.password = process.env.DB_PASSWORD;
    connectionConfig.database = process.env.DB_DATABASE;
    delete connectionConfig.connectionString;
    delete connectionConfig.ssl;
}

const pool = new Pool(connectionConfig);

module.exports = {
    query: (text, params) => pool.query(text, params),
};
