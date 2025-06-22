// src/controllers/organizacaoController.js

const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { isCNPJ } = require('brazilian-values');
const geocodeService = require('../services/geocodeService');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Importa para S3
require('dotenv').config();

// Instancia o cliente S3
const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});

// CREATE: Cria uma organização com validação, geocoding e imagem
exports.createOrganizacao = async (req, res) => {
    const { nome_organizacao, cnpj, email, senha, telefone, descricao, cep, rua, numero, bairro, cidade } = req.body;
    // Pega a URL da imagem do middleware multer, se ela foi enviada
    const imagem_url = req.file ? req.file.location : null;

    // Bloco de Validação
    if (!validator.isEmail(email)) return res.status(400).send({ message: "Formato de e-mail inválido." });
    if (!validator.isStrongPassword(senha, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) return res.status(400).send({ message: "A senha não atende aos requisitos de segurança." });
    if (!isCNPJ(cnpj)) return res.status(400).send({ message: "Formato de CNPJ inválido." });

    try {
        const orgExistente = await db.query('SELECT * FROM organizacoes WHERE email = $1 OR cnpj = $2', [email, cnpj]);
        if (orgExistente.rows.length > 0) {
            return res.status(409).send({ message: "E-mail ou CNPJ já cadastrado." });
        }

        const enderecoCompleto = `${rua}, ${numero}, ${bairro}, ${cidade}, ${cep}`;
        const coordenadas = await geocodeService.getCoordsFromAddress(enderecoCompleto);
        if (!coordenadas) {
            return res.status(400).send({ message: "Endereço não pôde ser encontrado no mapa." });
        }
        const { latitude, longitude } = coordenadas;

        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Query de inserção ATUALIZADA com a coluna imagem_url
        const { rows } = await db.query(
            `INSERT INTO organizacoes 
             (nome_organizacao, cnpj, email, senha_hash, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, imagem_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id_organizacao`,
            [nome_organizacao, cnpj, email, senha_hash, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, imagem_url]
        );

        res.status(201).send({
            message: "Organização criada com sucesso!",
            organizacaoId: rows[0].id_organizacao
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao criar organização." });
    }
};

// --- LOGIN ---
exports.loginOrganizacao = async (req, res) => { /* ...código existente, sem alterações... */ };

// --- READ (ALL) ---
exports.listAllOrganizacoes = async (req, res) => {
    try {
        // Atualizado para incluir a imagem_url
        const { rows } = await db.query('SELECT id_organizacao, nome_organizacao, cnpj, email, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, imagem_url, data_cadastro, data_ultima_alteracao FROM organizacoes');
        res.status(200).send(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao listar organizações." });
    }
};

// --- READ (by ID) ---
exports.findOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    try {
        // Atualizado para incluir a imagem_url
        const { rows } = await db.query('SELECT id_organizacao, nome_organizacao, cnpj, email, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, imagem_url, data_cadastro, data_ultima_alteracao FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).send({ message: "Organização não encontrada." });
        }
        res.status(200).send(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao buscar organização." });
    }
};

// --- UPDATE ---
exports.updateOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;

    if (id_org_logada !== parseInt(id, 10)) {
        return res.status(403).send({ message: "Acesso negado." });
    }

    const { nome_organizacao, telefone, senha, descricao, cep, rua, numero, bairro, cidade } = req.body;
    const nova_imagem_url = req.file ? req.file.location : undefined;

    try {
        const orgDataResult = await db.query('SELECT * FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (orgDataResult.rows.length === 0) return res.status(404).send({ message: "Organização não encontrada." });

        const organizacaoAtual = orgDataResult.rows[0];

        // Se uma nova imagem foi enviada e existia uma antiga, deleta a antiga
        if (nova_imagem_url && organizacaoAtual.imagem_url) {
            const oldKey = organizacaoAtual.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }));
        }

        // ... (lógica de 30 dias e geocoding continua aqui) ...

        const camposParaAtualizar = { nome_organizacao, telefone, descricao, cep, rua, numero, bairro, cidade };
        if (nova_imagem_url) {
            camposParaAtualizar.imagem_url = nova_imagem_url;
        }
        if (senha) {
            camposParaAtualizar.senha_hash = await bcrypt.hash(senha, await bcrypt.genSalt(10));
        }

        const setClause = Object.keys(camposParaAtualizar).filter(key => camposParaAtualizar[key] !== undefined).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
        if (!setClause) return res.status(400).send({ message: "Nenhum campo para atualizar foi fornecido." });

        const values = Object.values(camposParaAtualizar).filter(value => value !== undefined);

        await db.query(`UPDATE organizacoes SET ${setClause}, data_ultima_alteracao = NOW() WHERE id_organizacao = $${values.length + 1}`, [...values, id]);
        res.status(200).send({ message: 'Organização atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar organização:', error);
        res.status(500).send({ message: "Erro interno no servidor." });
    }
};

// --- DELETE ---
exports.deleteOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;

    if (id_org_logada !== parseInt(id, 10)) {
        return res.status(403).send({ message: "Acesso negado." });
    }

    try {
        const orgResult = await db.query('SELECT imagem_url FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (orgResult.rows.length === 0) {
            return res.status(404).send({ message: "Organização não encontrada." });
        }

        const imagemUrl = orgResult.rows[0].imagem_url;

        // Se existir uma imagem, deleta-a do S3
        if (imagemUrl) {
            const nomeArquivo = imagemUrl.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: nomeArquivo }));
        }

        await db.query('DELETE FROM organizacoes WHERE id_organizacao = $1', [id]);
        res.status(200).send({ message: 'Organização deletada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao deletar organização." });
    }
};