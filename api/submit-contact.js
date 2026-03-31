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

  const { name, email, message, service } = req.body;

  try {
    // 1. Guardar en Notion CRM
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_ID },
      properties: {
        Nombre: { title: [{ text: { content: name } }] },
        Email: { email: email },
        Fuente: { select: { name: 'Formulario Contacto' } },
        Mensaje: { rich_text: [{ text: { content: message || '' } }] },
        Notas: service ? { rich_text: [{ text: { content: `Servicio: ${service}` } }] } : undefined,
        Estado: { select: { name: 'Nuevo' } },
      }
    });

    // 2. Email de confirmación al usuario
    await resend.emails.send({
      from: 'Urano MKT <onboarding@resend.dev>',
      to: email,
      subject: `Recibimos tu mensaje, ${name} ✓`,
      html: buildConfirmEmail(name, message),
    });

    // 3. Notificación a vos
    await resend.emails.send({
      from: 'Urano MKT <onboarding@resend.dev>',
      to: process.env.OWNER_EMAIL,
      subject: `📩 Nuevo contacto: ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#AF0061">Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#666">Nombre</td><td style="padding:8px;font-weight:bold">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${email}</td></tr>
            <tr><td style="padding:8px;color:#666">Servicio</td><td style="padding:8px">${service || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Mensaje</td><td style="padding:8px">${message || '—'}</td></tr>
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

function buildConfirmEmail(name, message) {
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
      <h2 style="color:#0D0D0D;font-size:22px;margin:0 0 16px">Recibimos tu mensaje ✓</h2>
      <p style="color:#555;font-size:15px;line-height:1.7">Hola <strong>${name}</strong>, gracias por escribirnos. Ya recibimos tu consulta y nos vamos a poner en contacto con vos muy pronto.</p>

      ${message ? `
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;border-left:3px solid #AF0061">
        <p style="color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Tu mensaje</p>
        <p style="color:#333;font-size:14px;line-height:1.7;margin:0">${message}</p>
      </div>` : ''}

      <p style="color:#555;font-size:15px;line-height:1.7">Mientras tanto, si querés saber más sobre cómo trabajamos, podés visitar nuestra web.</p>

      <div style="text-align:center;margin-top:32px">
        <a href="https://uranomkt.com" style="display:inline-block;background:#AF0061;color:#fff;padding:14px 32px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;border-radius:4px">Visitar Urano MKT →</a>
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
