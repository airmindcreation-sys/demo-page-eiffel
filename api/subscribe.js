/**
 * Vercel Serverless Function — POST /api/subscribe
 * Relai entre les formulaires email du site et l'API Brevo.
 *
 * Variables d'environnement requises (à configurer dans Vercel → Project → Settings → Environment Variables) :
 *   - BREVO_API_KEY  : clé API Brevo (xkeysib-...). NE JAMAIS COMMITER.
 *   - BREVO_LIST_ID  : ID de la liste Brevo (entier). Défaut : 5 (liste "Airmind Estate").
 *
 * Tester une fois déployé :
 *   curl -X POST https://<ton-domaine>.vercel.app/api/subscribe \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test+demo@exemple.fr","source":"manual_curl"}'
 *
 * Réponses :
 *   200 → contact ajouté ou mis à jour
 *   400 → email manquant ou invalide
 *   405 → méthode non autorisée
 *   409 → email déjà enregistré (cas rare avec updateEnabled: true)
 *   500 → erreur serveur ou Brevo (clé manquante, panne API, etc.)
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : 'unknown';
  const firstname = typeof body.firstname === 'string' ? body.firstname.trim().slice(0, 64) : '';
  const lastname = typeof body.lastname === 'string' ? body.lastname.trim().slice(0, 64) : '';

  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (firstname.length < 2 || lastname.length < 2) {
    return res.status(400).json({ error: 'invalid_name' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const listIdRaw = process.env.BREVO_LIST_ID;
  let listIds;
  if (listIdRaw) {
    const parsed = parseInt(listIdRaw, 10);
    if (!Number.isNaN(parsed)) listIds = [parsed];
  } else {
    listIds = [5];
    console.warn('[subscribe] BREVO_LIST_ID not set, using fallback 5');
  }

  const payload = {
    email,
    updateEnabled: true,
    attributes: {
      PRENOM: firstname,
      NOM: lastname,
      SOURCE_FORM: source,
    },
  };
  if (listIds) payload.listIds = listIds;

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (brevoRes.ok) {
      return res.status(200).json({ ok: true });
    }

    let errBody = null;
    try { errBody = await brevoRes.json(); } catch (_) {}

    if (brevoRes.status === 400 && errBody && errBody.code === 'duplicate_parameter') {
      return res.status(409).json({ error: 'already_subscribed' });
    }

    console.error('[subscribe] Brevo error', brevoRes.status, errBody && errBody.code);
    return res.status(500).json({ error: 'upstream_error' });
  } catch (err) {
    console.error('[subscribe] fetch failed:', err && err.message);
    return res.status(500).json({ error: 'network_error' });
  }
};
