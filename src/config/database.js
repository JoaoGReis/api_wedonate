const { Pool } = require('pg');
require('dotenv').config();

const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' 
    }
};

if (!process.env.DATABASE_URL) {
    connectionConfig.host = process.env.DB_HOST;
    connectionConfig.port = process.env.DB_PORT;
    connectionConfig.user = process.env.DB_USER;
    connectionConfig.password = process.env.DB_PASSWORD;
    connectionConfig.database = process.env.DB_DATABASE;
    delete connectionConfig.connectionString; 
}

const pool = new Pool(connectionConfig);

module.exports = {
    query: (text, params) => pool.query(text, params),
};
