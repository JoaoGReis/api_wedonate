// src/services/geocodeService.js

// Esta função recebe um endereço em texto e retorna as coordenadas
async function getCoordsFromAddress(addressString) {
    if (!addressString) {
        return null;
    }

    try {
        const queryCodificada = encodeURIComponent(addressString);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryCodificada}`, {
            method: 'GET',
            headers: {
                // É importante se identificar para a API do OpenStreetMap
                'User-Agent': 'WeDonateApp/1.0 (seu-contato@email.com)'
            }
        });

        if (!response.ok) {
            console.error("Erro na API de Geocoding:", await response.text());
            return null;
        }

        const data = await response.json();

        // Se encontrou um resultado, retorna as coordenadas do primeiro (mais relevante)
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }

        return null; // Retorna nulo se o endereço não for encontrado

    } catch (error) {
        console.error('Erro de rede ao chamar o serviço de geocoding:', error);
        return null;
    }
}

// Exporta a função para que outros arquivos possam usá-la
module.exports = { getCoordsFromAddress };