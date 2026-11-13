import nodemailer from 'nodemailer';
import { getDb, newId } from './db';

export interface SendMailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  previewCode?: string;
  previewLink?: string;
}

export function isDevMailboxEnabled(): boolean {
  if (process.env.ENABLE_DEV_MAILBOX === 'false') {
    return false;
  }
  if (process.env.ENABLE_DEV_MAILBOX === 'true') {
    return true;
  }
  // Standaard aan zolang er nog geen externe SMTP-mailserver is ingesteld
  return !process.env.SMTP_HOST;
}

export async function sendMail(options: SendMailOptions): Promise<{
  mode: 'dev_mailbox' | 'smtp';
}> {
  const db = getDb();
  const smtpHost = process.env.SMTP_HOST?.trim();
  let mode: 'dev_mailbox' | 'smtp' = 'dev_mailbox';

  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    });

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        '"Werkplanken Secretariaat" <noreply@werkplanken.nl>',
      to: options.toName
        ? `"${options.toName}" <${options.toEmail}>`
        : options.toEmail,
      subject: options.subject,
      text: options.textBody,
      html: options.htmlBody,
    });
    mode = 'smtp';
  }

  if (isDevMailboxEnabled()) {
    db.prepare(
      `INSERT INTO email_outbox (
        id, to_email, to_name, subject, html_body, text_body,
        preview_code, preview_link, delivery_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId('mail'),
      options.toEmail,
      options.toName || '',
      options.subject,
      options.htmlBody,
      options.textBody,
      options.previewCode || null,
      options.previewLink || null,
      mode,
      new Date().toISOString()
    );
  }

  return { mode };
}

export function buildLoginEmail(params: {
  fullName: string;
  code: string;
  magicUrl: string;
}): { subject: string; htmlBody: string; textBody: string } {
  const subject = `Uw inlogcode: ${params.code} — Mijn Werkplank`;

  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 580px; margin: 0 auto; background: #FAF8F5; padding: 28px; border: 1px solid #D6D0C4; border-radius: 12px; color: #1E293B;">
      <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #1B365D; font-family: Arial, sans-serif; font-weight: bold;">
        Mijn Werkplank · Veilig Inloggen
      </p>
      <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #1B365D;">
        Goedendag ${params.fullName},
      </h1>
      <p style="font-family: Arial, sans-serif; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
        U hoeft bij ons <strong>geen wachtwoord</strong> te onthouden. Kies hieronder wat voor u het makkelijkst is:
      </p>

      <div style="background: #FFFFFF; border: 2px solid #1B365D; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #475569; margin: 0 0 10px 0;">
          <strong>Optie 1:</strong> Staat het inlogscherm al voor u open (bijv. op uw computer of iPad)?<br/>Typ dan deze 6 cijfers in:
        </p>
        <div style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: bold; letter-spacing: 8px; color: #1B365D; padding: 10px 0;">
          ${params.code}
        </div>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #475569; margin: 0 0 14px 0;">
          <strong>Optie 2:</strong> Leest u deze e-mail op hetzelfde apparaat waarmee u de app wilt openen?
        </p>
        <a href="${params.magicUrl}" style="display: inline-block; background: #1B365D; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; padding: 14px 28px; border-radius: 8px;">
          Klik hier om direct in te loggen →
        </a>
      </div>

      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #64748B; line-height: 1.5; margin: 0;">
        Deze code is 30 minuten geldig. Zodra u bent ingelogd, blijft u op uw eigen telefoon of computer automatisch 1 jaar ingelogd.
      </p>
    </div>
  `;

  const textBody = [
    `Goedendag ${params.fullName},`,
    ``,
    `Uw 6-cijferige inlogcode voor Mijn Werkplank is: ${params.code}`,
    ``,
    `Of klik direct op deze link om in te loggen:`,
    params.magicUrl,
    ``,
    `Deze code is 30 minuten geldig. Daarna blijft u op uw eigen apparaat een jaar lang ingelogd.`,
  ].join('\n');

  return { subject, htmlBody, textBody };
}

export function buildWerkplankInviteEmail(params: {
  fullName: string;
  lodgeName: string;
  lodgeNumber: number;
  eventTitle: string;
  eventDateFormatted: string;
  startTime: string;
  location: string;
  hasMeal: boolean;
  mealInfo: string;
  werkplankExcerpt: string;
  attendWithMealUrl: string;
  attendNoMealUrl: string;
  declineUrl: string;
}): { subject: string; htmlBody: string; textBody: string } {
  const subject = `Werkplank (${params.eventDateFormatted}): ${params.eventTitle} — Loge ${params.lodgeName}`;

  const mealButtonHtml = params.hasMeal
    ? `<a href="${params.attendWithMealUrl}" style="display: block; background: #15803D; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; padding: 14px 18px; border-radius: 8px; margin-bottom: 10px; text-align: center;">
         ✓ Ik ben aanwezig + eet mee bij het Broedermaal
       </a>`
    : '';

  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #FAF8F5; padding: 28px; border: 1px solid #D6D0C4; border-radius: 12px; color: #1E293B;">
      <p style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1B365D; font-family: Arial, sans-serif; font-weight: bold;">
        Loge ${params.lodgeName} Nr. ${params.lodgeNumber}
      </p>
      <h1 style="margin: 0 0 12px 0; font-size: 22px; color: #1B365D;">
        ${params.eventTitle}
      </h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 16px 0; color: #334155;">
        <strong>Datum:</strong> ${params.eventDateFormatted} om ${params.startTime} uur<br/>
        <strong>Locatie:</strong> ${params.location}
        ${params.hasMeal && params.mealInfo ? `<br/><strong>Broedermaal:</strong> ${params.mealInfo}` : ''}
      </p>
      <div style="background: #FFFFFF; border-left: 4px solid #B8860B; padding: 14px 16px; margin-bottom: 22px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; white-space: pre-line;">
        ${params.werkplankExcerpt}
      </div>

      <p style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">
        Geef direct met 1 klik uw aanwezigheid door (zonder in te hoeven loggen):
      </p>
      ${mealButtonHtml}
      <a href="${params.attendNoMealUrl}" style="display: block; background: #1B365D; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; padding: 14px 18px; border-radius: 8px; margin-bottom: 10px; text-align: center;">
        ✓ Ik ben aanwezig${params.hasMeal ? ' (zonder Broedermaal)' : ''}
      </a>
      <a href="${params.declineUrl}" style="display: block; background: #FFFFFF; border: 2px solid #94A3B8; color: #334155; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; padding: 12px 18px; border-radius: 8px; text-align: center;">
        ✕ Ik ben helaas verhinderd
      </a>
    </div>
  `;

  const textBody = [
    `Waarde ${params.fullName},`,
    ``,
    `${params.eventTitle} — Loge ${params.lodgeName} Nr. ${params.lodgeNumber}`,
    `Datum: ${params.eventDateFormatted} om ${params.startTime} uur`,
    `Locatie: ${params.location}`,
    ``,
    params.werkplankExcerpt,
    ``,
    params.hasMeal ? `Aanwezig + Broedermaal: ${params.attendWithMealUrl}` : '',
    `Aanwezig: ${params.attendNoMealUrl}`,
    `Verhinderd: ${params.declineUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, htmlBody, textBody };
}
