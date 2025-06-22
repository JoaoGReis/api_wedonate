// src/controllers/localController.js

const db = require('../config/database');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});


exports.createLocal = async (req, res) => {
    // 1. O ID da organização que está cadastrando vem do token, não do corpo da requisição.
    const id_org_cadastro = req.organizacao.id;

    // 2. Os outros dados vêm do corpo da requisição.
    const { nome, endereco, latitude, longitude, descricao, categoria, telefone, status_operacional } = req.body;
    const imagem_url = req.file ? req.file.location : null;

    try {
        const { rows } = await db.query(
            `INSERT INTO locais (nome, endereco, latitude, longitude, descricao, categoria, telefone, status_operacional, imagem_url, id_org_cadastro) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [nome, endereco, latitude, longitude, descricao, categoria, telefone, status_operacional, imagem_url, id_org_cadastro]
        );
        res.status(201).send({ message: "Local cadastrado com sucesso!", local: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao cadastrar local." });
    }
};

// READ (All): Lista todos os locais (Rota Pública)
exports.listAllLocais = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM locais ORDER BY nome ASC');
        res.status(200).send(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao listar locais." });
    }
};

// READ (by ID): Busca um local específico (Rota Pública)
exports.findLocalById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM locais WHERE id_local = $1', [id]);
        if (rows.length === 0) return res.status(404).send({ message: "Local não encontrado." });
        res.status(200).send(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao buscar local." });
    }
};

// UPDATE: Atualiza um local com verificação de permissão
exports.updateLocalById = async (req, res) => {
    const { id } = req.params; // ID do local a ser alterado
    const id_org_logada = req.organizacao.id; // ID da organização logada (do token)

    const { nome, endereco, latitude, longitude, descricao, categoria, telefone, status_operacional } = req.body;
    const nova_imagem_url = req.file ? req.file.location : undefined;

    try {
        // 1. Busca o local para verificar o dono e a imagem antiga
        const localResult = await db.query('SELECT id_org_cadastro, imagem_url FROM locais WHERE id_local = $1', [id]);
        if (localResult.rows.length === 0) {
            return res.status(404).send({ message: "Local não encontrado." });
        }

        const local = localResult.rows[0];

        // 2. Lógica de AUTORIZAÇÃO: Verifica se a organização logada é a dona do local
        if (local.id_org_cadastro !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para alterar este local." });
        }

        // 3. Se uma nova imagem foi enviada, deleta a antiga do S3
        if (nova_imagem_url && local.imagem_url) {
            const oldKey = local.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }));
        }

        // 4. Prepara e executa a query de atualização
        const campos = { nome, endereco, latitude, longitude, descricao, categoria, telefone, status_operacional };
        if (nova_imagem_url) campos.imagem_url = nova_imagem_url;

        const setClause = Object.keys(campos).filter(key => campos[key] !== undefined).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(campos).filter(value => value !== undefined);

        const { rows } = await db.query(
            `UPDATE locais SET ${setClause} WHERE id_local = $${values.length + 1} RETURNING *`,
            [...values, id]
        );

        res.status(200).send({ message: 'Local atualizado com sucesso!', local: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao atualizar local." });
    }
};

// DELETE: Deleta um local com verificação de permissão
exports.deleteLocalById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;

    try {
        // 1. Busca o local para verificar o dono e a URL da imagem
        const localResult = await db.query('SELECT id_org_cadastro, imagem_url FROM locais WHERE id_local = $1', [id]);
        if (localResult.rows.length === 0) {
            return res.status(404).send({ message: "Local não encontrado." });
        }

        const local = localResult.rows[0];

        // 2. Lógica de AUTORIZAÇÃO: Verifica se a organização logada é a dona do local
        if (local.id_org_cadastro !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para deletar este local." });
        }

        // 3. Deleta a imagem associada do S3, se existir
        if (local.imagem_url) {
            const nomeArquivo = local.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: nomeArquivo }));
        }

        // 4. Deleta o local do banco de dados
        await db.query('DELETE FROM locais WHERE id_local = $1', [id]);
        res.status(200).send({ message: 'Local deletado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao deletar local." });
    }
};