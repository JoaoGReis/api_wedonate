// src/controllers/campanhaController.js

const db = require('../config/database');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();


const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});


const calcularTempoRestante = (dataFim) => {
    if (!dataFim) {
        return "Duração indefinida";
    }
    const hoje = new Date();

    const fim = new Date(dataFim);
    const diffTime = fim.getTime() - hoje.getTime();

    if (diffTime <= 0) {
        return "Encerrada";
    }

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return "Encerra hoje";
    }

    return `Encerra em ${diffDays} dias`;
};



exports.createCampanha = async (req, res) => {
    const id_organizacao_criadora = req.organizacao.id;
    const { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
    const imagem_url = req.file ? req.file.location : null;


    if (data_inicio && data_fim && new Date(data_fim) < new Date(data_inicio)) {
        return res.status(400).send({ message: "A data de fim não pode ser anterior à data de início." });
    }

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


exports.listAllCampanhas = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM campanhas ORDER BY data_criacao DESC');


        const campanhasComTempo = rows.map(campanha => ({
            ...campanha,
            tempo_restante: calcularTempoRestante(campanha.data_fim)
        }));

        res.status(200).send(campanhasComTempo);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao listar campanhas." });
    }
};


exports.findCampanhaById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM campanhas WHERE id_campanha = $1', [id]);
        if (rows.length === 0) return res.status(404).send({ message: "Campanha não encontrada." });

        const campanha = rows[0];


        const campanhaComTempo = {
            ...campanha,
            tempo_restante: calcularTempoRestante(campanha.data_fim)
        };

        res.status(200).send(campanhaComTempo);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao buscar campanha." });
    }
};
// --- SEARCH by Titulo ---
exports.findCampanhasByTitulo = async (req, res) => {
    const { titulo } = req.query;

    if (!titulo) {
        return res.status(400).send({ message: "O parâmetro de busca 'titulo' é obrigatório." });
    }

    try {
        const searchTerm = `%${titulo}%`;

        const { rows } = await db.query(
            'SELECT * FROM campanhas WHERE titulo ILIKE $1 ORDER BY data_criacao DESC',
            [searchTerm]
        );
        const campanhasComTempo = rows.map(campanha => ({
            ...campanha,
            tempo_restante: calcularTempoRestante(campanha.data_fim)
        }));

        res.status(200).send(campanhasComTempo);

    } catch (error) {
        console.error('Erro ao buscar campanhas por título:', error);
        res.status(500).send({ message: "Erro interno no servidor." });
    }
};

//Alterar
exports.updateCampanhaById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;
    const { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
    const nova_imagem_url = req.file ? req.file.location : undefined;

    try {
        const campanhaResult = await db.query('SELECT id_organizacao_criadora, imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
        if (campanhaResult.rows.length === 0) {
            return res.status(404).send({ message: "Campanha não encontrada." });
        }

        const campanha = campanhaResult.rows[0];

        if (campanha.id_organizacao_criadora !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para alterar esta campanha." });
        }

        if (data_inicio && data_fim && new Date(data_fim) < new Date(data_inicio)) {
            return res.status(400).send({ message: "A data de fim não pode ser anterior à data de início." });
        }

        if (nova_imagem_url && campanha.imagem_url) {
            const oldKey = campanha.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }));
        }

        const campos = { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status };
        if (nova_imagem_url) campos.imagem_url = nova_imagem_url;

        const setClause = Object.keys(campos).filter(key => campos[key] !== undefined).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(campos).filter(value => value !== undefined);

        const { rows } = await db.query(
            `UPDATE campanhas SET ${setClause} WHERE id_campanha = $${values.length + 1} RETURNING *`,
            [...values, id]
        );

        res.status(200).send({ message: 'Campanha atualizada com sucesso!', campanha: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao atualizar campanha." });
    }
};

// DELETE
exports.deleteCampanhaById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;

    try {
        const campanhaResult = await db.query('SELECT id_organizacao_criadora, imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
        if (campanhaResult.rows.length === 0) {
            return res.status(404).send({ message: "Campanha não encontrada." });
        }

        const campanha = campanhaResult.rows[0];

        if (campanha.id_organizacao_criadora !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para deletar esta campanha." });
        }

        if (campanha.imagem_url) {
            const nomeArquivo = campanha.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: nomeArquivo }));
        }

        await db.query('DELETE FROM campanhas WHERE id_campanha = $1', [id]);
        res.status(200).send({ message: 'Campanha deletada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao deletar campanha." });
    }
};