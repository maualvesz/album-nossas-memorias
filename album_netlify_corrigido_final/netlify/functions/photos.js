const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'nossa_historia';
const COLLECTION_NAME = 'photos';

let cachedClient = null;

// Função para gerar ID único simples
function generateId() {
  return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function connectToDatabase() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não está configurada nas variáveis de ambiente');
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    console.log('Conectado ao MongoDB com sucesso');
    cachedClient = client;
    return client;
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error.message);
    cachedClient = null;
    throw new Error(`Falha ao conectar ao MongoDB: ${error.message}`);
  }
}

async function getPhotos() {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const photos = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return photos;
  } catch (error) {
    console.error('Erro ao buscar fotos:', error);
    throw error;
  }
}

async function addPhoto(photoData) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const newPhoto = {
      id: generateId(),
      ...photoData,
      createdAt: new Date(),
    };
    
    await collection.insertOne(newPhoto);
    return newPhoto;
  } catch (error) {
    console.error('Erro ao adicionar foto:', error);
    throw error;
  }
}

async function updatePhoto(photoId, photoData) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const result = await collection.updateOne(
      { id: photoId },
      { 
        $set: {
          ...photoData,
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Foto não encontrada');
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao atualizar foto:', error);
    throw error;
  }
}

async function deletePhoto(photoId) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const result = await collection.deleteOne({ id: photoId });
    
    if (result.deletedCount === 0) {
      throw new Error('Foto não encontrada');
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // Permitir que a função continue rodando após a resposta
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    let response;

    if (event.httpMethod === 'GET') {
      // GET - Obter todas as fotos
      const photos = await getPhotos();
      response = {
        statusCode: 200,
        headers,
        body: JSON.stringify(photos),
      };
    } else if (event.httpMethod === 'POST') {
      // POST - Adicionar nova foto
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Corpo da requisição vazio' }),
        };
      }

      let photoData;
      try {
        photoData = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'JSON inválido' }),
        };
      }

      const { src, date, caption } = photoData;
      
      if (!src || !date || !caption) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Dados incompletos: src, date e caption são obrigatórios' }),
        };
      }

      const newPhoto = await addPhoto({ src, date, caption });
      response = {
        statusCode: 201,
        headers,
        body: JSON.stringify(newPhoto),
      };
    } else if (event.httpMethod === 'PUT') {
      // PUT - Editar foto
      const queryParams = event.queryStringParameters || {};
      const { id } = queryParams;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID da foto não fornecido' }),
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Corpo da requisição vazio' }),
        };
      }

      let photoData;
      try {
        photoData = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'JSON inválido' }),
        };
      }

      const { src, date, caption } = photoData;

      await updatePhoto(id, { src, date, caption });
      response = {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Foto atualizada com sucesso' }),
      };
    } else if (event.httpMethod === 'DELETE') {
      // DELETE - Excluir foto
      const queryParams = event.queryStringParameters || {};
      const { id } = queryParams;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID da foto não fornecido' }),
        };
      }

      await deletePhoto(id);
      response = {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Foto excluída com sucesso' }),
      };
    } else {
      response = {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' }),
      };
    }

    return response;
  } catch (error) {
    console.error('Erro na função:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
