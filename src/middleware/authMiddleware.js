// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Pega o token do cabeçalho 'Authorization'
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // O cabeçalho vem no formato "Bearer <token>", então separamos em duas partes
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).send({ message: 'Erro no token.' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).send({ message: 'Token mal formatado.' });
    }

    // Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Token inválido ou expirado.' });
        }

        // Se o token for válido, anexa o payload decodificado à requisição
        req.organizacao = decoded; // Agora req.organizacao.id estará disponível
        return next(); // Permite que a requisição continue para o controlador
    });
};