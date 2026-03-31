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
    const notionProperties = {
      Nombre: { title: [{ text: { content: name || '' } }] },
      Email: { email: email },
      Fuente: { select: { name: 'Formulario Contacto' } },
      Mensaje: { rich_text: [{ text: { content: message || '' } }] },
      Estado: { select: { name: 'Nuevo' } },
    };
    if (service) {
      notionProperties.Notas = { rich_text: [{ text: { content: 'Servicio: ' + service } }] };
    }
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_ID },
      properties: notionProperties,
    });

    // 2. Notificación a vos
    await resend.emails.send({
      from: 'Urano MKT <onboarding@resend.dev>',
      to: 'uranomkt.07@gmail.com',
      subject: '📩 Nuevo contacto: ' + name + ' — ' + (service || 'Sin servicio'),
      html: '<div style="font-family:sans-serif;max-width:500px"><div style="background:#0D0D0D;padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">URANO MKT</h1><p style="color:#AF0061;margin:6px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase">Nuevo contacto desde la web</p></div><div style="padding:24px"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;color:#666">Nombre</td><td style="padding:8px;font-weight:bold">' + name + '</td></tr><tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Email</td><td style="padding:8px">' + email + '</td></tr><tr><td style="padding:8px;color:#666">Servicio</td><td style="padding:8px">' + (service || '—') + '</td></tr></table></div></div>',
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
