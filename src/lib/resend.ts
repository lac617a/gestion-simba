import "server-only";

/**
 * Cliente mínimo de la API de Resend (correos). Sin RESEND_API_KEY no se manda nada.
 * RESEND_API_URL solo se cambia para pruebas (un Resend falso local).
 */
const API_URL = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "");
/** Remitente: debe ser de un dominio verificado en Resend (profiya.com). */
export const RESEND_FROM = process.env.RESEND_FROM || "Simba Reservas <reservas@profiya.com>";

/** "Simba Reservas <reservas@profiya.com>" → { name, email } (organizador de las invitaciones). */
export function fromParts(from = RESEND_FROM) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || m[2], email: m[2] } : { name: from.trim(), email: from.trim() };
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

async function call(path: string, body: unknown, idempotencyKey?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data?.message ?? res.statusText}`);
  return data;
}

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Sin fecha se manda ya; con fecha, Resend lo programa (hasta 30 días adelante) */
  scheduledAt?: Date;
  /** Evita duplicados si la misma petición se repite (Resend lo recuerda 24 horas) */
  idempotencyKey?: string;
  /** Archivos adjuntos (ej. la invitación .ics); el contenido es texto */
  attachments?: { filename: string; content: string; contentType: string }[];
};

/** Manda o programa un correo. Devuelve el id de Resend. */
export async function sendEmail({ to, subject, html, text, scheduledAt, idempotencyKey, attachments }: EmailInput): Promise<string> {
  const data = await call(
    "/emails",
    {
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
      text,
      ...(scheduledAt && { scheduled_at: scheduledAt.toISOString() }),
      ...(attachments && {
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "utf8").toString("base64"),
          content_type: a.contentType,
        })),
      }),
    },
    idempotencyKey
  );
  if (!data?.id) throw new Error("Resend no devolvió el id del correo");
  return data.id;
}

/** Cancela un correo programado (si ya salió, Resend responde con error). */
export async function cancelEmail(id: string) {
  await call(`/emails/${encodeURIComponent(id)}/cancel`, {});
}
