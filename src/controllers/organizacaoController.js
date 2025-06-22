// src/controllers/organizacaoController.js

const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { isCNPJ } = require('brazilian-values');
const geocodeService = require('../services/geocodeService'); // Importa nosso serviço de geocoding

// CREATE: Cria uma organização com validações e geocoding automático
exports.createOrganizacao = async (req, res) => {
    // Pega todos os campos do formulário do frontend
    const { nome_organizacao, cnpj, email, senha, telefone, descricao, cep, rua, numero, bairro, cidade } = req.body;

    // --- Bloco de Validação ---
    if (!validator.isEmail(email)) {
        return res.status(400).send({ message: "Formato de e-mail inválido." });
    }
    if (!validator.isStrongPassword(senha, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
        return res.status(400).send({ message: "A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo." });
    }
    if (!isCNPJ(cnpj)) {
        return res.status(400).send({ message: "Formato de CNPJ inválido." });
    }

    try {
        // Valida se o e-mail ou CNPJ já existem
        const orgExistente = await db.query('SELECT * FROM organizacoes WHERE email = $1 OR cnpj = $2', [email, cnpj]);
        if (orgExistente.rows.length > 0) {
            return res.status(409).send({ message: "E-mail ou CNPJ já cadastrado." });
        }

        // --- Geocoding Automático ---
        const enderecoCompleto = `${rua}, ${numero}, ${bairro}, ${cidade}, ${cep}`;
        const coordenadas = await geocodeService.getCoordsFromAddress(enderecoCompleto);

        if (!coordenadas) {
            return res.status(400).send({ message: "Endereço não pôde ser encontrado no mapa. Verifique os dados de endereço." });
        }

        const { latitude, longitude } = coordenadas;
        // --- Fim do Geocoding ---

        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Query de inserção com todos os novos campos, incluindo coordenadas
        const { rows } = await db.query(
            `INSERT INTO organizacoes 
             (nome_organizacao, cnpj, email, senha_hash, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id_organizacao`,
            [nome_organizacao, cnpj, email, senha_hash, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude]
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
exports.loginOrganizacao = async (req, res) => {
    const { cnpj, senha } = req.body;
    if (!cnpj || !senha) {
        return res.status(400).send({ message: "CNPJ e senha são obrigatórios." });
    }
    try {
        const { rows } = await db.query('SELECT * FROM organizacoes WHERE cnpj = $1', [cnpj]);
        if (rows.length === 0) {
            return res.status(401).send({ message: "CNPJ ou senha inválidos." });
        }
        const organizacao = rows[0];
        const senhaValida = await bcrypt.compare(senha, organizacao.senha_hash);
        if (!senhaValida) {
            return res.status(401).send({ message: "CNPJ ou senha inválidos." });
        }
        const payload = {
            id: organizacao.id_organizacao,
            nome: organizacao.nome_organizacao
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.status(200).send({
            message: "Login bem-sucedido!",
            token: token,
            organizacao: {
                id: organizacao.id_organizacao,
                nome: organizacao.nome_organizacao,
                email: organizacao.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro interno no servidor." });
    }
};

// --- READ (ALL) ---
exports.listAllOrganizacoes = async (req, res) => {
    try {
        // Retorna todos os campos, exceto a senha
        const { rows } = await db.query('SELECT id_organizacao, nome_organizacao, cnpj, email, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, data_cadastro, data_ultima_alteracao FROM organizacoes');
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
        // Retorna todos os campos, exceto a senha
        const { rows } = await db.query('SELECT id_organizacao, nome_organizacao, cnpj, email, telefone, descricao, cep, rua, numero, bairro, cidade, latitude, longitude, data_cadastro, data_ultima_alteracao FROM organizacoes WHERE id_organizacao = $1', [id]);
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

    // Validação de Autorização
    if (id_org_logada !== parseInt(id, 10)) {
        return res.status(403).send({ message: "Acesso negado. Você só pode alterar seus próprios dados." });
    }

    const { nome_organizacao, telefone, senha, descricao, cep, rua, numero, bairro, cidade } = req.body;

    try {
        const orgDataResult = await db.query('SELECT * FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (orgDataResult.rows.length === 0) {
            return res.status(404).send({ message: "Organização não encontrada." });
        }

        const organizacaoAtual = orgDataResult.rows[0];

        // Validação da regra dos 30 dias
        if (organizacaoAtual.data_ultima_alteracao) {
            const hoje = new Date();
            const diffTime = Math.abs(hoje - new Date(organizacaoAtual.data_ultima_alteracao));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                return res.status(403).send({
                    message: `Alteração não permitida. Você só pode alterar seus dados a cada 30 dias. Próxima alteração possível em ${31 - diffDays} dia(s).`
                });
            }
        }

        // Lógica de Geocoding caso o endereço mude
        let novasCoordenadas = {};
        if (rua || numero || bairro || cidade || cep) {
            const enderecoCompleto = `${rua || organizacaoAtual.rua}, ${numero || organizacaoAtual.numero}, ${bairro || organizacaoAtual.bairro}, ${cidade || organizacaoAtual.cidade}, ${cep || organizacaoAtual.cep}`;
            const coords = await geocodeService.getCoordsFromAddress(enderecoCompleto);
            if (coords) {
                novasCoordenadas = { latitude: coords.latitude, longitude: coords.longitude };
            }
        }

        // Lógica de atualização dinâmica
        const camposParaAtualizar = { nome_organizacao, telefone, descricao, cep, rua, numero, bairro, cidade, ...novasCoordenadas };
        if (senha) {
            camposParaAtualizar.senha_hash = await bcrypt.hash(senha, await bcrypt.genSalt(10));
        }

        const setClause = Object.keys(camposParaAtualizar).filter(key => camposParaAtualizar[key] !== undefined).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
        if (!setClause) return res.status(400).send({ message: "Nenhum campo para atualizar foi fornecido." });

        const values = Object.values(camposParaAtualizar).filter(value => value !== undefined);

        await db.query(
            `UPDATE organizacoes SET ${setClause}, data_ultima_alteracao = NOW() WHERE id_organizacao = $${values.length + 1}`,
            [...values, id]
        );

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
        return res.status(403).send({ message: "Acesso negado. Você só pode deletar sua própria conta." });
    }

    try {
        const { rowCount } = await db.query('DELETE FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).send({ message: "Organização não encontrada para exclusão." });
        }
        res.status(200).send({ message: 'Organização deletada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao deletar organização." });
    }
};