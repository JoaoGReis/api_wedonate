// src/controllers/organizacaoController.js

const db = require('../config/database');
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt
const jwt = require('jsonwebtoken');

// --- CREATE (AGORA COM HASH DE SENHA) ---
exports.createOrganizacao = async (req, res) => {
    const { nome_organizacao, cnpj, email, senha, telefone, endereco } = req.body;

    // 1. Validação básica
    if (!email || !senha || !nome_organizacao || !cnpj || !telefone || !endereco) {
        return res.status(400).send({ message: "Preencha todos os campos." });
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

// UPDATE: Atualiza uma organização com regras de negócio complexas
exports.updateOrganizacaoById = async (req, res) => {
    const { id } = req.params;
    // Apenas os campos permitidos são extraídos do corpo da requisição
    const { nome_organizacao, telefone, endereco, senha } = req.body;

    try {
        // 1. Buscar os dados atuais da organização, incluindo a data da última alteração
        const orgDataResult = await db.query(
            'SELECT nome_organizacao, telefone, endereco, data_ultima_alteracao, data_cadastro FROM organizacoes WHERE id_organizacao = $1',
            [id]
        );

        if (orgDataResult.rows.length === 0) {
            return res.status(404).send({ message: "Organização não encontrada." });
        }

        const organizacaoAtual = orgDataResult.rows[0];

        // 2. Checar a regra dos 30 dias
        const dataReferencia = organizacaoAtual.data_ultima_alteracao || organizacaoAtual.data_cadastro;
        const hoje = new Date();
        const diffTime = Math.abs(hoje - new Date(dataReferencia));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
            return res.status(403).send({
                message: `Alteração não permitida. Você só pode alterar seus dados a cada 30 dias. Próxima alteração possível em ${31 - diffDays} dia(s).`
            });
        }

        // 3. Preparar os campos para a query de atualização
        // Usamos os valores atuais como padrão caso um novo valor não seja fornecido
        const novoNome = nome_organizacao || organizacaoAtual.nome_organizacao;
        const novoTelefone = telefone || organizacaoAtual.telefone;
        const novoEndereco = endereco || organizacaoAtual.endereco;

        let queryUpdate;
        let queryParams;

        // 4. Lidar com a atualização de senha (se uma nova senha for fornecida)
        if (senha) {
            // Se uma nova senha foi enviada, geramos um novo hash
            const salt = await bcrypt.genSalt(10);
            const novaSenhaHash = await bcrypt.hash(senha, salt);

            queryUpdate = `UPDATE organizacoes 
                           SET nome_organizacao = $1, telefone = $2, endereco = $3, senha_hash = $4, data_ultima_alteracao = NOW() 
                           WHERE id_organizacao = $5`;
            queryParams = [novoNome, novoTelefone, novoEndereco, novaSenhaHash, id];
        } else {
            // Se nenhuma senha nova foi enviada, mantemos a senha_hash antiga
            queryUpdate = `UPDATE organizacoes 
                           SET nome_organizacao = $1, telefone = $2, endereco = $3, data_ultima_alteracao = NOW() 
                           WHERE id_organizacao = $4`;
            queryParams = [novoNome, novoTelefone, novoEndereco, id];
        }

        // 5. Executar a query de atualização no banco de dados
        await db.query(queryUpdate, queryParams);

        res.status(200).send({ message: 'Organização atualizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar organização:', error);
        res.status(500).send({ message: "Erro interno no servidor." });
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
    // --- FUNÇÃO DE LOGIN ATUALIZADA ---
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

            // --- GERAÇÃO DO TOKEN JWT ---
            // 1. Criar o "payload" - as informações que queremos guardar no token
            const payload = {
                id: organizacao.id_organizacao,
                nome: organizacao.nome_organizacao
            };

            // 2. Assinar o token com o segredo do .env
            // Ele expira em 8 horas ('8h').
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

            // 3. Retornar o token e os dados da organização
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
