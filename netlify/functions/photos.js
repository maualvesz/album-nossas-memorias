/**
 * photos.js
 * Gerencia os registros de fotos/vídeos no MongoDB.
 * Armazena APENAS a URL do Cloudinary — sem base64, sem payload gigante.
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI     = process.env.MONGODB_URI;
const DB_NAME         = 'nossa_historia';
const COLLECTION_NAME = 'photos';

let cachedClient = null;

function generateId() {
  return 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function connectToDatabase() {
  if (cachedClient) {
    try {
      // Ping rápido para ver se ainda está conectado
      await cachedClient.db('admin').command({ ping: 1 });
      return cachedClient;
    } catch {
      cachedClient = null;
    }
  }

  if (!MONGODB_URI) throw new Error('MONGODB_URI não configurada nas variáveis de ambiente.');

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  cachedClient = client;
  return client;
}

async function getPhotos() {
  const client = await connectToDatabase();
  const col = client.db(DB_NAME).collection(COLLECTION_NAME);
  // Retorna todos — o frontend ordena/filtra
  return col.find({}, { projection: { _id: 0 } }).toArray();
}

async function addPhoto({ src, publicId, date, caption, type }) {
  const client = await connectToDatabase();
  const col = client.db(DB_NAME).collection(COLLECTION_NAME);
  const doc = {
    id: generateId(),
    src,            // URL do Cloudinary
    publicId,       // public_id do Cloudinary (para exclusão futura)
    date,
    caption,
    type: type || 'image',
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return doc;
}

async function updatePhoto(photoId, { src, publicId, date, caption, type }) {
  const client = await connectToDatabase();
  const col = client.db(DB_NAME).collection(COLLECTION_NAME);
  const set = { date, caption, type: type || 'image', updatedAt: new Date() };
  if (src)      set.src      = src;
  if (publicId) set.publicId = publicId;

  const result = await col.updateOne({ id: photoId }, { $set: set });
  if (result.matchedCount === 0) throw new Error('Registro não encontrado.');
  return result;
}

async function deletePhoto(photoId) {
  const client = await connectToDatabase();
  const col = client.db(DB_NAME).collection(COLLECTION_NAME);
  const result = await col.deleteOne({ id: photoId });
  if (result.deletedCount === 0) throw new Error('Registro não encontrado.');
  return result;
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const ok  = (data, status = 200) => ({ statusCode: status, headers, body: JSON.stringify(data) });
  const err = (msg,  status = 400) => ({ statusCode: status, headers, body: JSON.stringify({ error: msg }) });

  try {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};

    // ── GET /photos ──────────────────────────────────────────────────────────
    if (method === 'GET') {
      return ok(await getPhotos());
    }

    // ── POST /photos ─────────────────────────────────────────────────────────
    if (method === 'POST') {
      if (!event.body) return err('Corpo vazio');
      let body;
      try { body = JSON.parse(event.body); } catch { return err('JSON inválido'); }

      const { src, publicId, date, caption, type } = body;
      if (!src || !date || !caption) return err('src, date e caption são obrigatórios');

      const doc = await addPhoto({ src, publicId, date, caption, type });
      return ok(doc, 201);
    }

    // ── PUT /photos?id=xxx ───────────────────────────────────────────────────
    if (method === 'PUT') {
      if (!params.id) return err('ID não fornecido');
      if (!event.body) return err('Corpo vazio');
      let body;
      try { body = JSON.parse(event.body); } catch { return err('JSON inválido'); }

      const { src, publicId, date, caption, type } = body;
      if (!date || !caption) return err('date e caption são obrigatórios');

      await updatePhoto(params.id, { src, publicId, date, caption, type });
      return ok({ message: 'Atualizado com sucesso.' });
    }

    // ── DELETE /photos?id=xxx ────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!params.id) return err('ID não fornecido');
      await deletePhoto(params.id);
      return ok({ message: 'Excluído com sucesso.' });
    }

    return err('Método não permitido', 405);

  } catch (e) {
    console.error('Erro na função photos:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Erro interno' }) };
  }
};
