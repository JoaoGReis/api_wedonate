// src/controllers/viacepController.js

exports.consultarCep = async (req, res) => {
    // 1. Pega o CEP dos parâmetros da rota
    const { cep } = req.params;

    // 2. VALIDAÇÃO: Limpa o CEP para conter apenas números
    const cepApenasNumeros = cep.replace(/\D/g, '');

    // 3. VALIDAÇÃO: Verifica se o CEP limpo tem exatamente 8 dígitos
    if (cepApenasNumeros.length !== 8) {
        return res.status(400).send({ message: 'Formato de CEP inválido. O CEP deve conter 8 números.' });
    }

    try {
        // 4. Faz a chamada para a API externa (ViaCEP)
        const response = await fetch(`https://viacep.com.br/ws/${cepApenasNumeros}/json/`);
        
        if (!response.ok) {
            // Se a resposta não for bem-sucedida (ex: erro no servidor do ViaCEP)
            return res.status(response.status).send({ message: 'Erro no serviço externo de CEP.' });
        }

        const data = await response.json();

        // 5. VALIDAÇÃO: O ViaCEP retorna um { "erro": true } para CEPs que não existem.
        if (data.erro) {
            return res.status(404).send({ message: 'CEP não encontrado.' });
        }

        // 6. Formata a resposta para o frontend com os dados mais importantes
        const dadosFormatados = {
            cep: data.cep,
            rua: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
        };

        res.status(200).send(dadosFormatados);

    } catch (error) {
        console.error('Erro ao chamar a API ViaCEP:', error);
        res.status(500).send({ message: 'Erro interno ao consultar serviço de CEP.' });
    }
};