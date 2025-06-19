// src/controllers/campanhaController.js

const db = require('../config/database');
// Importa apenas o cliente e os comandos necessários do SDK v3
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Instancia o cliente S3 da v3
const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});

// CREATE
exports.createCampanha = async (req, res) => {
    const { id_organizacao_criadora, titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
    const imagem_url = req.file ? req.file.location : null;

    try {
        const { rows } = await db.query(
            `INSERT INTO campanhas (id_organizacao_criadora, titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status, imagem_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [id_organizacao_criadora, titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status, imagem_url]
        );
        res.status(201).send({ message: "Campanha criada com sucesso!", campanha: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao criar campanha." });
    }
};

// READ (All)
exports.listAllCampanhas = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM campanhas ORDER BY data_criacao DESC');
        res.status(200).send(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao listar campanhas." });
    }
};

// READ (By ID)
exports.findCampanhaById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM campanhas WHERE id_campanha = $1', [id]);
        if (rows.length === 0) return res.status(404).send({ message: "Campanha não encontrada." });
        res.status(200).send(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor." });
    }
};

// UPDATE (com deleção da imagem antiga do S3)
exports.updateCampanhaById = async (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
    const nova_imagem_url = req.file ? req.file.location : undefined;

    try {
        // Se uma nova imagem foi enviada, primeiro deletamos a antiga do S3
        if (nova_imagem_url) {
            const oldData = await db.query('SELECT imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
            const oldImageUrl = oldData.rows[0]?.imagem_url;
            if (oldImageUrl) {
                const oldKey = oldImageUrl.split('/').pop();
                await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }));
            }
        }

        // Prepara a query de update
        const campos = { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status };
        if (nova_imagem_url) campos.imagem_url = nova_imagem_url;

        const setClause = Object.keys(campos).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(campos);

        const { rows } = await db.query(
            `UPDATE campanhas SET ${setClause} WHERE id_campanha = $${values.length + 1} RETURNING *`,
            [...values, id]
        );

        if (rows.length === 0) return res.status(404).send({ message: "Campanha não encontrada." });
        
        res.status(200).send({ message: 'Campanha atualizada!', campanha: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor." });
    }
};


// DELETE
exports.deleteCampanhaById = async (req, res) => {
    const { id } = req.params;
    try {
        const campanhaResult = await db.query('SELECT imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
        if (campanhaResult.rows.length === 0) {
            return res.status(404).send({ message: "Campanha não encontrada." });
        }

        const imagemUrl = campanhaResult.rows[0].imagem_url;

        if (imagemUrl) {
            const nomeArquivo = imagemUrl.split('/').pop();
            const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: nomeArquivo
            });
            await s3Client.send(deleteCommand);
        }

        await db.query('DELETE FROM campanhas WHERE id_campanha = $1', [id]);
        res.status(200).send({ message: 'Campanha deletada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor." });
    }
};