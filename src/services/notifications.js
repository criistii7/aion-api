const cron = require('node-cron');

const SUPABASE_URL = 'https://ysfgyxpcirmhtmofsgzs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WRK3IHuomGdFrVVw7rgmtw_2ywnEtEr';
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

// Personas notificadas hoy (clave: nombre_YYYY-MM-DD)
const notifiedToday = new Set();

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}

async function sbGet(table, qs = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: SB_HEADERS });
  return r.json();
}

async function sendWA(phone, apikey, message) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${apikey}`;
  try {
    await fetch(url);
    console.log(`[WA] Enviado a ${phone}`);
  } catch(e) {
    console.error(`[WA] Error enviando a ${phone}:`, e.message);
  }
}

async function isAbsent(persona) {
  const t = today();
  const rows = await sbGet('s9_absences',
    `persona=eq.${encodeURIComponent(persona)}&desde=lte.${t}&or=(hasta.is.null,hasta.gte.${t})`
  );
  return Array.isArray(rows) && rows.length > 0;
}

// ── 9:15 L-V: aviso a quien no ha fichado ─────────────────────────
async function morningCheck() {
  console.log('[CRON] Comprobando fichajes de entrada...');
  try {
    const [activeRows, phones, config] = await Promise.all([
      sbGet('s9_active'),
      sbGet('s9_phones'),
      sbGet('s9_config', 'key=eq.names'),
    ]);

    const activePersonas = new Set((activeRows || []).map(a => a.persona));
    const phoneMap = Object.fromEntries((phones || []).map(p => [p.persona, p]));
    const names = config?.[0]?.value || [];

    for (const name of names) {
      if (activePersonas.has(name)) continue;
      if (!phoneMap[name]) continue;
      if (await isAbsent(name)) continue;

      await sendWA(
        phoneMap[name].phone,
        phoneMap[name].apikey,
        `⏰ Hola ${name.split(' ')[0]}, son las 9:15 y aún no has fichado entrada en Sección 9. Recuerda registrarla cuando empieces.`
      );
    }
  } catch(e) {
    console.error('[CRON] Error en morningCheck:', e.message);
  }
}

// ── Cada 5 min: aviso al superar 8h30m trabajadas ─────────────────
async function hoursCheck() {
  try {
    const now = Date.now();
    const [activeRows, phones] = await Promise.all([
      sbGet('s9_active'),
      sbGet('s9_phones'),
    ]);

    const phoneMap = Object.fromEntries((phones || []).map(p => [p.persona, p]));

    for (const row of (activeRows || [])) {
      if (!row.entrada) continue;
      if (!phoneMap[row.persona]) continue;

      const key = `${row.persona}_${today()}`;
      if (notifiedToday.has(key)) continue;

      const pausas = row.pausas || [];
      const pauseMs = pausas.reduce((acc, p) => {
        if (p.inicio && p.fin)  return acc + (p.fin - p.inicio);
        if (p.inicio && !p.fin) return acc + (now - p.inicio);
        return acc;
      }, 0);

      const workedMs = now - row.entrada - pauseMs;

      if (workedMs >= 8.5 * 3600 * 1000) {
        if (await isAbsent(row.persona)) continue;
        notifiedToday.add(key);

        const h = Math.floor(workedMs / 3600000);
        const m = Math.floor((workedMs % 3600000) / 60000);

        await sendWA(
          phoneMap[row.persona].phone,
          phoneMap[row.persona].apikey,
          `⚠️ Hola ${row.persona.split(' ')[0]}, llevas ${h}h ${m}min trabajadas. Recuerda registrar tu salida en Sección 9 cuando termines.`
        );
      }
    }
  } catch(e) {
    console.error('[CRON] Error en hoursCheck:', e.message);
  }
}

// ── Endpoint de prueba manual ──────────────────────────────────────
async function sendTest(phone, apikey, name) {
  await sendWA(phone, apikey,
    `✅ Hola ${name}, este es un mensaje de prueba del sistema de notificaciones de Sección 9. ¡Funciona correctamente!`
  );
}

function initCrons() {
  // 9:15 AM lunes a viernes, hora Madrid
  cron.schedule('15 9 * * 1-5', morningCheck, { timezone: 'Europe/Madrid' });

  // Cada 5 minutos
  cron.schedule('*/5 * * * *', hoursCheck);

  console.log('[CRON] Notificaciones iniciadas — 9:15 L-V + cada 5min');
}

module.exports = { initCrons, sendTest, sendWA };
