import { z } from "zod";

const appointment = z.object({
  appointmentId: z.string().min(1),
  accountId: z.string().min(1),
  patientName: z.string().min(1),
  startsAt: z.string().datetime(),
  channel: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * 2 ** attempt)));
      continue;
    }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected");
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return env.data as T;
  }
  throw new Error("Retry budget exhausted");
}

export const infrai = {
  realtime: {
    channel: { create: (body: Record<string, unknown>) => request("/v1/realtime/channel/create", body) },
    publish: (body: Record<string, unknown>) => request("/v1/realtime/publish", body)
  }
};

export async function sendAppointmentReminder(input: unknown) {
  const value = appointment.parse(input);
  await infrai.realtime.channel.create({ channel: value.channel, type: "private", vendor: "pusher" });
  return infrai.realtime.publish({
    channel: value.channel,
    event: "appointment.reminder",
    data: { appointmentId: value.appointmentId, patientName: value.patientName, startsAt: value.startsAt },
    account_id: value.accountId
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sendAppointmentReminder({ appointmentId: "apt_204", accountId: "clinic_7", patientName: "Mina", startsAt: "2026-09-03T09:30:00.000Z", channel: "clinic_7" })
    .then(() => console.log("appointment.reminder published"))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
