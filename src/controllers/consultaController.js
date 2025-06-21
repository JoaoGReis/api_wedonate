// src/controllers/consultaController.js

exports.consultarCNPJ = async (req, res) => {
    const { cnpj } = req.params;
    const cnpjApenasNumeros = cnpj.replace(/\D/g, '');

    if (cnpjApenasNumeros.length !== 14) {
        return res.status(400).send({ message: 'O CNPJ deve ter 14 números.' });
    }

    try {
        // A MUDANÇA ESTÁ AQUI: Adicionamos o cabeçalho 'User-Agent' na requisição
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjApenasNumeros}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
        });

        if (!response.ok) {
            let erroApiExterna;
            const errorBodyText = await response.text();
            try {
                erroApiExterna = JSON.parse(errorBodyText);
            } catch (e) {
                erroApiExterna = errorBodyText;
            }
            return res.status(response.status).send({
                message: 'Erro ao consultar o CNPJ na API externa.',
                details: erroApiExterna
            });
        }

        const data = await response.json();

        const enderecoCompleto = `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}, ${data.municipio || ''} - ${data.uf || ''}. CEP: ${data.cep || ''}`;

        const dadosFiltrados = {
            nome: data.razao_social,
            email: data.email,
            telefone: data.ddd_telefone_1 || data.ddd_telefone_2,
            endereco: enderecoCompleto,
            situacao_cadastral: data.descricao_situacao_cadastral
        };

        res.status(200).send(dadosFiltrados);

    } catch (error) {
        console.error('Erro de rede ou conexão ao chamar a API de CNPJ:', error);
        res.status(500).send({ message: 'Erro interno ao consultar serviço de CNPJ.' });
    }
};