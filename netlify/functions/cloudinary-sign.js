/**
 * cloudinary-sign.js
 * Gera uma assinatura segura para upload direto ao Cloudinary pelo frontend.
 * O frontend nunca precisa expor o API Secret.
 */

const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Variáveis de ambiente do Cloudinary não configuradas.' }),
    };
  }

  // Parâmetros que o frontend vai incluir no upload
  const timestamp = Math.round(Date.now() / 1000);
  const folder    = 'nossas-memorias';

  // String a assinar (parâmetros em ordem alfabética)
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ signature, timestamp, apiKey, cloudName, folder }),
  };
};
