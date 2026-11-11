// Quiz·Vidéo — serveur intermédiaire (Cloudflare Worker)
// Ajoute la clé API Anthropic côté serveur et limite l'usage :
//   - 10 générations de quiz par jour et par visiteur
//   - 30 appels au total par jour et par visiteur (générations + corrections)
//
// À configurer dans Cloudflare :
//   - Secret  ANTHROPIC_API_KEY : ta clé API Anthropic
//   - KV      RATE_LIMIT        : un espace KV lié au Worker

const ALLOWED_ORIGIN = 'https://gregg97.github.io';
const MAX_QUIZ_PER_DAY = 10;
const MAX_CALLS_PER_DAY = 30;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function reply(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (request.method !== 'POST') return reply({ error: 'Méthode non autorisée' }, 405, origin);
    if (origin !== ALLOWED_ORIGIN) return reply({ error: 'Origine non autorisée' }, 403, origin);

    let body;
    try { body = await request.json(); } catch (e) { return reply({ error: 'JSON invalide' }, 400, origin); }

    // Une génération de quiz = un appel avec la recherche web
    const isQuiz = Array.isArray(body.tools) && body.tools.length > 0;

    // Compteurs du jour pour ce visiteur
    const ip = request.headers.get('CF-Connecting-IP') || 'inconnu';
    const day = new Date().toISOString().slice(0, 10);
    const quizKey = day + ':' + ip + ':quiz';
    const callKey = day + ':' + ip + ':calls';
    const quizCount = parseInt(await env.RATE_LIMIT.get(quizKey) || '0', 10);
    const callCount = parseInt(await env.RATE_LIMIT.get(callKey) || '0', 10);

    if ((isQuiz && quizCount >= MAX_QUIZ_PER_DAY) || callCount >= MAX_CALLS_PER_DAY) {
      return reply({ error: 'Limite atteinte, revenez demain' }, 429, origin);
    }

    // Requête « verrouillée » : modèle et taille imposés, seul l'outil de recherche web est permis
    const safeBody = {
      model: MODEL,
      max_tokens: Math.min(parseInt(body.max_tokens, 10) || 1000, MAX_TOKENS),
      system: String(body.system || ''),
      messages: body.messages,
    };
    if (isQuiz) safeBody.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
    });

    // On ne décompte que les appels réussis
    if (apiResponse.ok) {
      const ttl = { expirationTtl: 172800 }; // effacé automatiquement après 2 jours
      await env.RATE_LIMIT.put(callKey, String(callCount + 1), ttl);
      if (isQuiz) await env.RATE_LIMIT.put(quizKey, String(quizCount + 1), ttl);
    }

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  },
};
