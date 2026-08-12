/**
 * Court Side Kino – Email Worker
 * Handles all email sending via Resend API
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: 'Inter', Arial, sans-serif; background: #faf9f6; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #1a2a4a; padding: 30px; text-align: center; }
  .header h1 { color: #e8a838; font-family: Georgia, serif; margin: 0; font-size: 24px; }
  .header p { color: #d1cdc4; margin: 5px 0 0; font-size: 14px; }
  .body { padding: 30px; color: #3d3a35; line-height: 1.6; }
  .footer { background: #f0ede6; padding: 20px; text-align: center; font-size: 12px; color: #7a7670; }
  .btn { display: inline-block; background: #e8a838; color: #1a2a4a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
  .detail { background: #f0ede6; padding: 15px; border-radius: 8px; margin: 15px 0; }
</style></head><body>
<div class="container">
  <div class="header"><h1>🎾 Court Side Kino</h1><p>by Popcornakademie · Wolfratshausen</p></div>
  <div class="body">${content}</div>
  <div class="footer">Court Side Kino · Sportcenter Hahn · Hahner Str. 12 · 82515 Wolfratshausen</div>
</div></body></html>`;
}

async function sendEmail(env, { to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Court Side Kino <kino@popcornakademie.de>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }

  return res.json();
}

const handlers = {
  '/booking': async (data, env) => {
    const html = emailWrapper(`
      <h2>Deine Buchung ist bestätigt! 🎬</h2>
      <p>Hallo ${data.name},</p>
      <p>vielen Dank für deine Buchung beim Court Side Kino. Hier sind deine Ticket-Details:</p>
      <div class="detail">
        <p><strong>Film:</strong> ${data.film}</p>
        <p><strong>Datum:</strong> ${data.date}</p>
        <p><strong>Uhrzeit:</strong> ${data.time}</p>
        <p><strong>Plätze:</strong> ${data.seats.join(', ')}</p>
        <p><strong>Referenz:</strong> ${data.reference}</p>
        <p><strong>Gesamt:</strong> ${data.total} €</p>
      </div>
      <p>Bitte zeige deinen QR-Code am Einlass vor. Wir empfehlen, 30 Minuten vor Beginn da zu sein – der Biergarten öffnet eine Stunde vorher!</p>
      <p>Wir freuen uns auf dich!<br>Dein Court Side Kino Team 🍿</p>
    `);

    return sendEmail(env, {
      to: data.email,
      subject: `Buchungsbestätigung – ${data.film} | Court Side Kino`,
      html,
    });
  },

  '/reservation': async (data, env) => {
    const html = emailWrapper(`
      <h2>Reservierung eingegangen! 🍺</h2>
      <p>Hallo ${data.customer_name},</p>
      <p>deine Biergarten-Reservierung beim Court Side Kino ist bei uns eingegangen:</p>
      <div class="detail">
        <p><strong>Datum:</strong> ${data.reservation_date}</p>
        <p><strong>Uhrzeit:</strong> ${data.reservation_time}</p>
        <p><strong>Personen:</strong> ${data.party_size}</p>
        ${data.notes ? `<p><strong>Anmerkungen:</strong> ${data.notes}</p>` : ''}
      </div>
      <p>Wir bestätigen deine Reservierung in Kürze per E-Mail. Bei Fragen erreichst du uns unter info@popcornakademie.de.</p>
      <p>Prost und bis bald!<br>Dein Court Side Kino Team</p>
    `);

    return sendEmail(env, {
      to: data.customer_email,
      subject: 'Biergarten-Reservierung – Court Side Kino',
      html,
    });
  },

  '/newsletter': async (data, env) => {
    const html = emailWrapper(`
      <h2>Willkommen beim Court Side Kino! 🎾</h2>
      <p>Schön, dass du dabei bist!</p>
      <p>Ab sofort erhältst du Updates zu neuen Filmen, Special Events und exklusiven Angeboten direkt in dein Postfach.</p>
      <p>Der erste Filmabend des Sommers wartet schon auf dich – sichere dir jetzt deine Tickets!</p>
      <a href="https://popcornakademie.github.io/kino/tickets.html" class="btn">Tickets sichern</a>
      <p>Bis bald unter freiem Himmel!<br>Dein Court Side Kino Team 🍿</p>
    `);

    return sendEmail(env, {
      to: data.email,
      subject: 'Willkommen beim Court Side Kino Newsletter!',
      html,
    });
  },

  '/contact': async (data, env) => {
    // Send to admin
    const adminHtml = emailWrapper(`
      <h2>Neue Kontaktanfrage</h2>
      <div class="detail">
        <p><strong>Von:</strong> ${data.name} (${data.email})</p>
        <p><strong>Betreff:</strong> ${data.subject || 'Kein Betreff'}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${data.message}</p>
      </div>
    `);

    await sendEmail(env, {
      to: 'info@popcornakademie.de',
      subject: `Kontakt: ${data.subject || 'Neue Anfrage'} – Court Side Kino`,
      html: adminHtml,
    });

    // Confirmation to user
    const userHtml = emailWrapper(`
      <h2>Nachricht erhalten! ✉️</h2>
      <p>Hallo ${data.name},</p>
      <p>vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.</p>
      <p>Dein Court Side Kino Team</p>
    `);

    return sendEmail(env, {
      to: data.email,
      subject: 'Deine Nachricht an Court Side Kino',
      html: userHtml,
    });
  },
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const handler = handlers[url.pathname];

    if (!handler) {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    try {
      const data = await request.json();

      if (!env.RESEND_API_KEY) {
        return jsonResponse({ error: 'Email service not configured' }, 500);
      }

      const result = await handler(data, env);
      return jsonResponse({ success: true, id: result.id });
    } catch (err) {
      console.error('Email worker error:', err);
      return jsonResponse({ error: err.message }, 500);
    }
  },
};
