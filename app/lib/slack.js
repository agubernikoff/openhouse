/**
 * Posts a message to a Slack incoming webhook. No-ops when the webhook isn't
 * configured, and never throws — notifications must not break the request
 * that triggered them (callers run this via `context.waitUntil`).
 * @param {string | undefined} webhookUrl
 * @param {{text: string; blocks?: unknown[]}} message
 */
export async function postToSlack(webhookUrl, message) {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`Slack notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Slack notification request failed:', error);
  }
}
