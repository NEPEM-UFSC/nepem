//verser.js
// Realiza a verificação da versão de um projeto no Firestore e retorna a versão mais recente.

const admin = require('firebase-admin');

// Inicializando o Firebase Admin SDK, se ainda não estiver inicializado
if (!admin.apps.length) {
  /**
   * Converte a chave de API do Firebase, armazenada na variável de ambiente `FIREBASE_API_KEY`,
   * para um objeto JSON e a atribui à constante `serviceAccount`.
   *
   * A chave de API deve estar no formato JSON.
   *
   * @constant {Object} serviceAccount - A chave de API do Firebase convertida.
   */
  try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_API_KEY);

  // Inicializa o app Firebase com a credencial de conta de serviço
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('Firebase Admin SDK initialized');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error, '\n', 'Check if the FIREBASE_API_KEY environment variable is set correctly');
      throw new Error('Firebase Admin SDK initialization failed');
    }
}

// Obtém a referência ao Firestore
const db = admin.firestore();

/**
 * @fileoverview Netlify Function para consulta de versões de projetos armazenados no Firestore.
 * 
 * Esta função permite buscar a versão mais recente de um projeto específico ou listar todas as versões disponíveis.
 * 
 * ## Funcionalidades:
 * - 📌 **Buscar a versão de um projeto específico** via query string ou corpo da requisição.
 * - 📌 **Listar todas as versões dos projetos** ao fornecer `project=listall`.
 * - 📌 **Responder em formato específico para Shields.io** se `-stamp` for adicionado ao nome do projeto.
 * 
 * ## Métodos suportados:
 * - `GET` - Utiliza `queryStringParameters.project` para definir o projeto a ser buscado.
 * - `POST` - Recebe um JSON no corpo `{ "project": "nome_do_projeto" }`.
 * 
 * ## Parâmetros aceitos:
 * - `project` (string, obrigatório) - O nome do projeto a ser consultado.
 * - `project=listall` (string) - Retorna todas as versões de projetos no Firestore.
 * - `project=nome-do-projeto-stamp` (string) - Retorna resposta personalizada para Shields.io.
 * 
 * ## Respostas possíveis:
 * - `200 OK` - Retorna a versão do projeto ou lista de projetos.
 * - `400 Bad Request` - Se o parâmetro `project` não for informado.
 * - `404 Not Found` - Se o projeto não existir ou não tiver uma versão registrada.
 * - `500 Internal Server Error` - Se ocorrer um erro inesperado.
 * 
 * ## Exemplo de Uso:
 * - `GET /functions/projectVersion?project=myProject`
 * - `GET /functions/projectVersion?project=myProject-stamp`
 * - `GET /functions/projectVersion?project=listall`
 * - `POST /functions/projectVersion` com `{ "project": "myProject" }`
 * 
 * ## Exemplo de Resposta:
 * ```json
 * {
 *   "latest_version": "1.2.3"
 * }
 * ```
 * 
 * ## Requisitos:
 * - Firestore configurado com coleção `projects`, onde cada documento tem:
 *   - `latest_version` (string) - Versão mais recente do projeto.
 *   - `timestamp` (timestamp) - Data de atualização da versão.
 * - Firebase Admin SDK configurado no ambiente Netlify.
 */
exports.handler = async (event, context) => {
  try {
    // Parsear o corpo da requisição se for POST, ou usar queryStringParameters se for GET
    const body = event.body ? JSON.parse(event.body) : {};
    let { project } = body.project ? body : event.queryStringParameters;

    // Verificar se o parâmetro `project` foi fornecido
    if (!project) {
      console.warn("Missing project parameter.");
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: 'Project parameter is required' }),
      };
    }

    // Verificação aprimorada para listar todos os projetos
    if (project.toLowerCase() === 'listall') {
      try {
        const projectsRef = db.collection('projects');
        
        // Otimização: Buscar apenas os campos necessários
        const snapshot = await projectsRef.select('latest_version').get();
        
        if (snapshot.empty) {
          console.warn('No projects found in database');
          return {
            statusCode: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300", // Cache por 5 minutos
            },
            body: JSON.stringify({ 
              error: 'No projects found',
              timestamp: new Date().toISOString(),
            }),
          };
        }
        // Otimização: Usar reduce para criar o objeto de resposta
        /**
         * Reduces a Firestore snapshot to an object containing project versions and timestamps.
         *
         * @param {Array} snapshot.docs - Array of Firestore document snapshots.
         * @returns {Object} An object where each key is a document ID and each value is an object
         *                   containing the latest version and timestamp of the project.
         *                   The timestamp is converted to ISO string format if available, otherwise null.
         */
        const projects = snapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          if (data.latest_version) {
            acc[doc.id] = {
              version: data.latest_version,
              timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
            };
          }
          return acc;
        }, {});

        // Verificar se há projetos válidos após o filtro
        if (Object.keys(projects).length === 0) {
          console.warn('No valid projects found with version information');
          return {
            statusCode: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
            body: JSON.stringify({ 
              error: 'No valid projects found with version information',
              timestamp: new Date().toISOString(),
            }),
          };
        }

        console.log(`Successfully retrieved ${Object.keys(projects).length} projects`);
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projects,
            total: Object.keys(projects).length,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Error fetching projects:', error);
        return {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ 
            error: 'Error fetching projects',
            message: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Verificar se o parâmetro `stamp` foi fornecido
    const isStamp = project.endsWith('-stamp');
    console.log(isStamp);
    if (isStamp) {
      project = project.replace('-stamp', '');
    }
    // Referência ao documento no Firestore para o projeto especificado
    const docRef = db.collection('projects').doc(project);

    // Buscar o documento do projeto no Firestore
    const doc = await docRef.get();

    // Se o documento não for encontrado, retorna erro 404
    if (!doc.exists) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*", // Liberando CORS
        },
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    // Verificar se o projeto tem o sufixo '-stamp' para resposta personalizada (Shields.io)
    const data = doc.data();

    // Se o sufixo for '#stamp', retornar resposta no formato específico para Shields.io
    if (isStamp) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", // Liberando CORS
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemaVersion: 1,
          label: 'Project Version',
          message: data.latest_version,
          color: 'orange',
        }),
      };
    }

    // Verificar se os dados da versão estão disponíveis
    if (!data.latest_version) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*", // Liberando CORS
        },
        body: JSON.stringify({ error: 'Version not found' }),
      };
    }

    // Verificar se a data de lançamento está disponível
    if (!data.timestamp) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*", // Liberando CORS
        },
        body: JSON.stringify({ error: 'Release date not found' }),
      };
    }

    // Retornar a versão do projeto
    if (!isStamp) {
      console.log(isStamp);
      console.log('Project:', project, 'Version:', data.latest_version, 'Timestamp:', data.timestamp);
      return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Liberando CORS
      },
      body: JSON.stringify({ latest_version: data.latest_version }),
      };
    }

  } catch (error) {
    console.error('Error retrieving project:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // Liberando CORS
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

