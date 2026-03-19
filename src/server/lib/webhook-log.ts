// In-memory webhook event log for debugging.
// In production, persist to a table or external service.

export interface WebhookEvent {
  id: string;
  source: "stripe" | "inngest" | "linkedin" | "system";
  eventType: string;
  status: "success" | "error";
  payload: string; // Truncated JSON
  error?: string;
  timestamp: string;
}

const MAX_EVENTS = 200;
const events: WebhookEvent[] = [];

export function logWebhookEvent(
  event: Omit<WebhookEvent, "id" | "timestamp">
) {
  events.unshift({
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });

  // Trim to max
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

export function getWebhookEvents(limit = 50): WebhookEvent[] {
  return events.slice(0, limit);
}

export function clearWebhookEvents() {
  events.length = 0;
}
