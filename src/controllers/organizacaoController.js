// src/controllers/organizacaoController.js

const db = require('../config/database');
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt

// --- CREATE (AGORA COM HASH DE SENHA) ---
exports.createOrganizacao = async (req, res) => {
    // Agora recebemos a 'senha' em texto plano do formulário
    const { nome_organizacao, cnpj, email, senha, telefone, endereco } = req.body;

    // 1. Validação básica
    if (!email || !senha || !nome_organizacao) {
        return res.status(400).send({ message: "Nome, e-mail e senha são obrigatórios." });
    }

    try {
        // 2. Gerar o "salt" - um valor aleatório para fortalecer o hash
        const salt = await bcrypt.genSalt(10); // 10 é o custo do processamento. É um bom padrão.

        // 3. Gerar o hash da senha usando o salt
        const senha_hash = await bcrypt.hash(senha, salt);

        // 4. Salvar o HASH no banco de dados, e não a senha original
        const { rows } = await db.query(
            "INSERT INTO organizacoes (nome_organizacao, cnpj, email, senha_hash, telefone, endereco) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_organizacao",
            [nome_organizacao, cnpj, email, senha_hash, telefone, endereco]
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

// --- NOVA FUNÇÃO DE LOGIN ---
exports.loginOrganizacao = async (req, res) => {
    const { cnpj, senha } = req.body; // No seu app, o login é feito com CNPJ

    // 1. Validação básica
    if (!cnpj || !senha) {
        return res.status(400).send({ message: "CNPJ e senha são obrigatórios." });
    }

    try {
        // 2. Buscar a organização pelo CNPJ no banco
        const { rows } = await db.query('SELECT * FROM organizacoes WHERE cnpj = $1', [cnpj]);

        // Se não encontrar, retorna um erro genérico para não informar se o CNPJ existe ou não
        if (rows.length === 0) {
            return res.status(401).send({ message: "CNPJ ou senha inválidos." });
        }

        const organizacao = rows[0];

        // 3. Comparar a senha enviada com o hash salvo no banco
        const senhaValida = await bcrypt.compare(senha, organizacao.senha_hash);

        // Se a senha não for válida, retorna o mesmo erro genérico
        if (!senhaValida) {
            return res.status(401).send({ message: "CNPJ ou senha inválidos." });
        }

        // 4. Se a senha for válida, o login foi bem-sucedido!
        // (Aqui, futuramente, você irá gerar um Token JWT para autenticação)
        res.status(200).send({
            message: "Login bem-sucedido!",
            organizacao: {
                id: organizacao.id_organizacao,
                nome: organizacao.nome_organizacao,
                email: organizacao.email
                // Não envie a senha_hash de volta!
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro interno no servidor." });
    }
};

// READ: Lista todas as organizações
exports.listAllOrganizacoes = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id_organizacao, nome_organizacao, cnpj, email, telefone, endereco FROM organizacoes');
        res.status(200).send(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao listar organizações." });
    }
};

// READ: Busca uma organização pelo ID
exports.findOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM organizacoes WHERE id_organizacao = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).send({ message: "Organização não encontrada." });
        }
        res.status(200).send(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao buscar organização." });
    }
};

// UPDATE: Atualiza uma organização pelo ID
exports.updateOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    const { nome_organizacao, cnpj, email, telefone, endereco } = req.body;
    try {
        const { rowCount } = await db.query(
            "UPDATE organizacoes SET nome_organizacao = $1, cnpj = $2, email = $3, telefone = $4, endereco = $5 WHERE id_organizacao = $6",
            [nome_organizacao, cnpj, email, telefone, endereco, id]
        );
        if (rowCount === 0) {
            return res.status(404).send({ message: "Organização não encontrada para atualização." });
        }
        res.status(200).send({ message: 'Organização atualizada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Erro ao atualizar organização." });
    }
};

// DELETE: Remove uma organização pelo ID
exports.deleteOrganizacaoById = async (req, res) => {
    const { id } = req.params;
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