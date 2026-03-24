const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'nossa_historia';
const COLLECTION_NAME = 'photos';

let cachedClient = null;

function generateId() {
  return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function connectToDatabase() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient;
  }
  if (!MONGODB_URI) throw new Error('MONGODB_URI não configurada');
  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    cachedClient = null;
    throw new Error(`Falha ao conectar: ${error.message}`);
  }
}

async function getPhotos() {
  const client = await connectToDatabase();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  // Retorna sem ordenação fixa — o frontend ordena por data
  return await collection.find({}).toArray();
}

async function addPhoto(photoData) {
  const client = await connectToDatabase();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  const newPhoto = {
    id: generateId(),
    ...photoData,
    createdAt: new Date(),
  };
  await collection.insertOne(newPhoto);
  return newPhoto;
}

async function updatePhoto(photoId, photoData) {
  const client = await connectToDatabase();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  const result = await collection.updateOne(
    { id: photoId },
    { $set: { ...photoData, updatedAt: new Date() } }
  );
  if (result.matchedCount === 0) throw new Error('Foto não encontrada');
  return result;
}

async function deletePhoto(photoId) {
  const client = await connectToDatabase();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  const result = await collection.deleteOne({ id: photoId });
  if (result.deletedCount === 0) throw new Error('Foto não encontrada');
  return result;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    let response;

    if (event.httpMethod === 'GET') {
      const photos = await getPhotos();
      response = { statusCode: 200, headers, body: JSON.stringify(photos) };

    } else if (event.httpMethod === 'POST') {
      if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corpo vazio' }) };
      let photoData;
      try { photoData = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }
      const { src, date, caption, type } = photoData;
      if (!src || !date || !caption) return { statusCode: 400, headers, body: JSON.stringify({ error: 'src, date e caption obrigatórios' }) };
      const newPhoto = await addPhoto({ src, date, caption, type: type || 'image' });
      response = { statusCode: 201, headers, body: JSON.stringify(newPhoto) };

    } else if (event.httpMethod === 'PUT') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID não fornecido' }) };
      if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corpo vazio' }) };
      let photoData;
      try { photoData = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }
      const { src, date, caption, type } = photoData;
      await updatePhoto(id, { src, date, caption, type: type || 'image' });
      response = { statusCode: 200, headers, body: JSON.stringify({ message: 'Atualizado com sucesso' }) };

    } else if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID não fornecido' }) };
      await deletePhoto(id);
      response = { statusCode: 200, headers, body: JSON.stringify({ message: 'Excluído com sucesso' }) };

    } else {
      response = { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
    }

    return response;
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Erro interno' }) };
  }
};
