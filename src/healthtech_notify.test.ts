import { sendAppointmentReminder } from "./healthtech_notify.ts";

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body));
  if (body.event !== "appointment.reminder") return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
  return new Response(JSON.stringify({ ok: true, data: { delivered: true } }), { status: 200 });
};
process.env.INFRAI_API_KEY = "test-key";
const result = await sendAppointmentReminder({ appointmentId: "apt_1", accountId: "clinic_1", patientName: "Ari", startsAt: "2026-09-03T09:30:00.000Z", channel: "clinic_1" });
if (!(result as { delivered: boolean }).delivered) throw new Error("reminder was not delivered");
globalThis.fetch = originalFetch;
console.log("appointment reminder decision: delivered");
