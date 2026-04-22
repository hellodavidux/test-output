/** Where the workflow run was triggered (product surface). */
export type RunOrigin =
  | "Sandbox"
  | "Interface"
  | "API"
  | "Webhook"
  | "Scheduled"
  | "Experiment"
  | "Fork"

export interface RunData {
  runId: string
  conversationId: string
  created: string
  origin: RunOrigin
  status: "success" | "error" | "running"
  input: string
  output: string
  latency: string
  tokens: number
  user: string
}

/** Matches existing Analytics mock table (oldest → newest). */
export const INITIAL_ANALYTICS_RUNS: RunData[] = [
  {
    runId: "8af162da-6ee4-4bcf-aa7a-99b1f4adf151",
    conversationId: "conv-billing-1",
    created: "15/04/26 10:12 AM",
    origin: "Interface",
    status: "success",
    input: "I cancelled my account 3 weeks ago but was just charged $299.",
    output:
      '{"intent":"billing_dispute","action":"refund_initiated","refund_amount":299,"timeline":"3-5 business days","escalated":false}',
    latency: "2.31s",
    tokens: 184,
    user: "sarah.chen@example.com",
  },
  {
    runId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    conversationId: "conv-cancel-2",
    created: "17/04/26 02:44 PM",
    origin: "Interface",
    status: "success",
    input: "The cancel button on the billing page just spins and never completes.",
    output:
      '{"intent":"bug_report","priority":"high","action":"escalate_to_engineering","manual_cancel_offered":true,"reply_sent":true}',
    latency: "3.08s",
    tokens: 231,
    user: "m.torres@acme.io",
  },
  {
    runId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    conversationId: "N/A",
    created: "16/04/26 09:05 AM",
    origin: "Sandbox",
    status: "success",
    input: "How do I cancel my subscription?",
    output:
      "To cancel, go to Settings → Billing → Cancel Plan. You'll retain access until the end of your billing period. Your data is preserved for 30 days after cancellation.",
    latency: "1.77s",
    tokens: 139,
    user: "j.park@globex.com",
  },
  {
    runId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    conversationId: "N/A",
    created: "16/04/26 11:30 AM",
    origin: "API",
    status: "success",
    input: "I want a refund for the last 3 months — I barely used the product.",
    output:
      "Our refund policy covers requests made within 60 days of the charge. I can process a refund for your most recent charge. For older charges please contact our billing team.",
    latency: "1.22s",
    tokens: 98,
    user: "r.kim@startup.io",
  },
  {
    runId: "e5f6a7b8-c9d0-1234-ef01-345678901234",
    conversationId: "N/A",
    created: "17/04/26 08:50 AM",
    origin: "API",
    status: "success",
    input: "My team plan was downgraded last month but we're still being charged the Business rate.",
    output:
      '{"intent":"billing_dispute","action":"escalate_to_billing","priority":"medium","reply_sent":true}',
    latency: "0.94s",
    tokens: 67,
    user: "dev@techcorp.com",
  },
  {
    runId: "f6a7b8c9-d0e1-2345-f012-456789012345",
    conversationId: "N/A",
    created: "17/04/26 09:14 AM",
    origin: "Sandbox",
    status: "error",
    input: "Cancel my account right now.",
    output: "Error: account lookup timeout — unable to retrieve subscription status",
    latency: "0.38s",
    tokens: 22,
    user: "billing@newco.ai",
  },
  {
    runId: "a7b8c9d0-e1f2-3456-0123-567890123456",
    conversationId: "N/A",
    created: "17/04/26 10:02 AM",
    origin: "Webhook",
    status: "success",
    input: "I've been trying to cancel for 2 weeks but keep getting a server error.",
    output:
      '{"intent":"bug_report","priority":"high","action":"escalate_to_engineering","escalation_note":"Recurring cancel flow error — needs engineering investigation","reply_sent":true}',
    latency: "1.55s",
    tokens: 112,
    user: "l.wang@enterprise.co",
  },
  {
    runId: "b8c9d0e1-f2a3-4567-1234-678901234567",
    conversationId: "N/A",
    created: "17/04/26 10:41 AM",
    origin: "Interface",
    status: "success",
    input: "What's your refund policy?",
    output:
      "We offer full refunds on requests within 30 days of a charge. After 30 days, refunds are reviewed by our billing team on a case-by-case basis. To request one, go to Settings → Billing → Request Refund.",
    latency: "1.08s",
    tokens: 88,
    user: "ops@midmarket.io",
  },
  {
    runId: "c9d0e1f2-a3b4-5678-2345-789012345678",
    conversationId: "N/A",
    created: "17/04/26 11:18 AM",
    origin: "API",
    status: "success",
    input: "I was charged twice this month for my Pro subscription.",
    output:
      '{"intent":"billing_dispute","action":"refund_initiated","refund_amount":"duplicate_charge","timeline":"3-5 business days","escalated":false}',
    latency: "2.19s",
    tokens: 161,
    user: "f.okonkwo@client.net",
  },
  {
    runId: "d0e1f2a3-b4c5-6789-3456-890123456789",
    conversationId: "N/A",
    created: "17/04/26 12:05 PM",
    origin: "Scheduled",
    status: "success",
    input: "I was charged 3 months ago for a plan I never activated. I want a full refund.",
    output:
      "I understand your frustration. I've located the charge from 90 days ago. Please fill out our refund request form and our billing team will review your case within 2 business days.",
    latency: "1.88s",
    tokens: 144,
    user: "support-lead@acme.io",
  },
  {
    runId: "e1f2a3b4-c5d6-7890-4567-901234567890",
    conversationId: "N/A",
    created: "17/04/26 01:20 PM",
    origin: "Sandbox",
    status: "success",
    input: "Can I pause my subscription instead of cancelling?",
    output:
      "Yes — you can pause your subscription for up to 3 months. Go to Settings → Billing → Pause Subscription. Your data and settings are fully preserved during the pause.",
    latency: "0.83s",
    tokens: 74,
    user: "n.patel@scale.com",
  },
  {
    runId: "f2a3b4c5-d6e7-8901-5678-012345678901",
    conversationId: "N/A",
    created: "17/04/26 02:37 PM",
    origin: "Interface",
    status: "success",
    input: "I want to cancel but I'm worried about losing my project data.",
    output:
      "Your data won't be deleted immediately. After cancellation you have 30 days to export everything. Go to Settings → Export Data to download all projects as CSV or JSON.",
    latency: "1.41s",
    tokens: 107,
    user: "cx-manager@brand.com",
  },
  {
    runId: "d4e5f6a7-b8c9-0123-def0-234567890123",
    conversationId: "N/A",
    created: "17/04/26 04:50 PM",
    origin: "Interface",
    status: "running",
    input: "Cancel my account — I'm switching to a competitor.",
    output: "",
    latency: "-",
    tokens: 0,
    user: "data@enterprise.co",
  },
]

export function formatAnalyticsRunTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const dd = pad(d.getDate())
  const mm = pad(d.getMonth() + 1)
  const yy = String(d.getFullYear()).slice(-2)
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${dd}/${mm}/${yy} ${time}`
}
