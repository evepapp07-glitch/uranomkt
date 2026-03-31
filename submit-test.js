import { Resend } from 'resend';
import { Client } from '@notionhq/client';

const resend = new Resend(process.env.RESEND_API_KEY);
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, instagram, score, nivel, desc, necesita } = req.body;

  try {
    // 1. Guardar en Notion CRM
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_ID },
      properties: {
        Nombre: { title: [{ text: { content: name } }] },
        Email: { email: email },
        Fuente: { select: { name: 'Test de Diagnóstico' } },
        'Nivel de Marca': { select: { name: nivel } },
        'Puntaje Test': { number: score },
        Instagram: instagram ? { url: instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@','')}` } : undefined,
        Estado: { select: { name: 'Nuevo' } },
      }
    });

    // 2. Email al lead con su resultado
    await resend.emails.send({
      from: 'Urano MKT <onboarding@resend.dev>',
      to: email,
      subject: `Tu diagnóstico de marca está listo, ${name} 🔥`,
      html: buildResultEmail(name, score, nivel, desc, necesita),
    });

    // 3. Notificación a vos
    await resend.emails.send({
      from: 'Urano MKT <onboarding@resend.dev>',
      to: process.env.OWNER_EMAIL,
      subject: `🔥 Nuevo lead: ${name} — ${nivel}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#AF0061">Nuevo lead desde el Test</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#666">Nombre</td><td style="padding:8px;font-weight:bold">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${email}</td></tr>
            <tr><td style="padding:8px;color:#666">Instagram</td><td style="padding:8px">${instagram || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Nivel</td><td style="padding:8px;font-weight:bold;color:#AF0061">${nivel}</td></tr>
            <tr><td style="padding:8px;color:#666">Puntaje</td><td style="padding:8px">${score}/32</td></tr>
          </table>
          <p style="margin-top:20px"><a href="https://notion.so" style="background:#AF0061;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Ver en CRM →</a></p>
        </div>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function buildResultEmail(name, score, nivel, desc, necesita) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08)">
    
    <div style="background:#0D0D0D;padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:2px">URANO MKT</h1>
      <p style="color:#AF0061;margin:8px 0 0;font-size:12px;letter-spacing:4px;text-transform:uppercase">Marketing Perpetuo</p>
    </div>

    <div style="padding:40px">
      <p style="color:#666;font-size:16px;margin:0 0 8px">Hola <strong>${name}</strong>,</p>
      <h2 style="color:#0D0D0D;font-size:22px;margin:0 0 24px">Tu diagnóstico de marca está listo 🚀</h2>

      <div style="background:#0D0D0D;border-radius:8px;padding:28px;text-align:center;margin-bottom:28px">
        <p style="color:#9A9A9A;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">Tu puntaje</p>
        <p style="color:#AF0061;font-size:52px;font-weight:900;margin:0;line-height:1">${score}<span style="color:#444;font-size:24px">/32</span></p>
        <p style="color:#fff;font-size:18px;font-weight:700;margin:12px 0 0">${nivel}</p>
      </div>

      <div style="border-left:3px solid #AF0061;padding-left:20px;margin-bottom:28px">
        <p style="color:#333;font-size:15px;line-height:1.7;margin:0">${desc}</p>
      </div>

      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:32px">
        <p style="color:#AF0061;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;font-weight:700">Lo que necesitás ahora</p>
        <p style="color:#333;font-size:14px;line-height:1.7;margin:0">${necesita}</p>
      </div>

      <div style="text-align:center">
        <a href="https://uranomkt.com/#contacto" style="display:inline-block;background:#AF0061;color:#fff;padding:14px 32px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;border-radius:4px">Hablemos de tu marca →</a>
      </div>
    </div>

    <div style="background:#0D0D0D;padding:24px;text-align:center">
      <p style="color:#444;font-size:12px;margin:0">© 2025 Urano MKT — Marketing Perpetuo</p>
      <p style="color:#333;font-size:11px;margin:8px 0 0">Tu marca no necesita gritar. Necesita ser escuchada por las personas correctas.</p>
    </div>

  </div>
</body>
</html>`;
}
