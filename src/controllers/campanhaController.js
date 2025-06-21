// src/controllers/campanhaController.js

const db = require('../config/database');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Instancia o cliente S3 da v3
const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});

// CREATE: Cria uma nova campanha de forma segura
exports.createCampanha = async (req, res) => {
    // 1. O ID da organização vem do token JWT, garantindo que o criador é quem está logado.
    const id_organizacao_criadora = req.organizacao.id;

    // 2. O resto dos dados vem do corpo da requisição.
    const { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
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

// READ (All): Lista todas as campanhas (Rota Pública)
exports.listAllCampanhas = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM campanhas ORDER BY data_criacao DESC');
        res.status(200).send(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao listar campanhas." });
    }
};

// READ (by ID): Busca uma campanha específica (Rota Pública)
exports.findCampanhaById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM campanhas WHERE id_campanha = $1', [id]);
        if (rows.length === 0) return res.status(404).send({ message: "Campanha não encontrada." });
        res.status(200).send(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao buscar campanha." });
    }
};

// UPDATE: Atualiza uma campanha com verificação de permissão
exports.updateCampanhaById = async (req, res) => {
    const { id } = req.params; // ID da campanha a ser alterada
    const id_org_logada = req.organizacao.id; // ID da organização logada (do token)

    const { titulo, descricao, itens_necessarios, endereco_campanha, data_inicio, data_fim, status } = req.body;
    const nova_imagem_url = req.file ? req.file.location : undefined;

    try {
        // 1. Busca a campanha para verificar o dono e a imagem antiga
        const campanhaResult = await db.query('SELECT id_organizacao_criadora, imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
        if (campanhaResult.rows.length === 0) {
            return res.status(404).send({ message: "Campanha não encontrada." });
        }

        const campanha = campanhaResult.rows[0];

        // 2. Lógica de AUTORIZAÇÃO: Verifica se a organização logada é a dona da campanha
        if (campanha.id_organizacao_criadora !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para alterar esta campanha." });
        }

        // 3. Se uma nova imagem foi enviada, deleta a antiga do S3
        if (nova_imagem_url && campanha.imagem_url) {
            const oldKey = campanha.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }));
        }

        // 4. Prepara e executa a query de atualização
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

// DELETE: Deleta uma campanha com verificação de permissão
exports.deleteCampanhaById = async (req, res) => {
    const { id } = req.params;
    const id_org_logada = req.organizacao.id;

    try {
        // 1. Busca a campanha para verificar o dono e pegar a URL da imagem
        const campanhaResult = await db.query('SELECT id_organizacao_criadora, imagem_url FROM campanhas WHERE id_campanha = $1', [id]);
        if (campanhaResult.rows.length === 0) {
            return res.status(404).send({ message: "Campanha não encontrada." });
        }

        const campanha = campanhaResult.rows[0];

        // 2. Lógica de AUTORIZAÇÃO: Verifica se a organização logada é a dona da campanha
        if (campanha.id_organizacao_criadora !== id_org_logada) {
            return res.status(403).send({ message: "Acesso negado. Você não tem permissão para deletar esta campanha." });
        }

        // 3. Deleta a imagem do S3, se existir
        if (campanha.imagem_url) {
            const nomeArquivo = campanha.imagem_url.split('/').pop();
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: nomeArquivo }));
        }

        // 4. Deleta a campanha do banco de dados
        await db.query('DELETE FROM campanhas WHERE id_campanha = $1', [id]);
        res.status(200).send({ message: 'Campanha deletada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro no servidor ao deletar campanha." });
    }
};