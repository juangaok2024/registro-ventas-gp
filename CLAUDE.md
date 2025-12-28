# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sales Tracker - A system that captures sales from a WhatsApp group. Closers forward payment proofs (image/PDF) and respond with structured sale data. Evolution API sends webhooks that get processed and stored in Firebase.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint

# Firebase deployment
firebase deploy --only hosting           # Deploy frontend
firebase deploy --only firestore:rules   # Deploy Firestore rules
firebase deploy --only storage           # Deploy Storage rules
```

## Architecture

```
WhatsApp Group → Evolution API → /api/webhook/evolution → Firestore → Dashboard/Chat
```

### Data Flow
1. Closer sends proof (image/PDF) to WhatsApp group
2. Closer replies to proof with structured message (Nombre:, Monto:, etc.)
3. Evolution API webhook triggers `/api/webhook/evolution/route.ts`
4. **ALL messages saved to `messages` collection** (complete chat history)
5. If proof (image/doc): saved to `proofs` collection, marked for linking
6. If sale report: parsed with regex, saved to `sales`, linked to proof via quotedMessageId
7. Closer stats updated in `closers` collection
8. Dashboard (`/`) shows sales table, Chat Timeline (`/chat`) shows full history

### Pages
- `/` - Main dashboard with sales table, date filters, verification actions
- `/chat` - Chat timeline with message bubbles, sale hover preview, filters (all/sales/proofs)

### Key Files
- [types/sales.ts](types/sales.ts) - Type definitions (`ChatMessage`, `Sale`, `EvolutionWebhookPayload`) and `SALE_PATTERNS` regex
- [lib/parser.ts](lib/parser.ts) - `parseSaleMessage()` extracts data from structured messages
- [lib/firebase.ts](lib/firebase.ts) - Firebase client initialization (Firestore + Storage)
- [app/api/webhook/evolution/route.ts](app/api/webhook/evolution/route.ts) - Webhook handler (saves ALL messages, processes sales/proofs)
- [app/api/messages/route.ts](app/api/messages/route.ts) - API for fetching chat messages with pagination and filters
- [app/chat/page.tsx](app/chat/page.tsx) - Chat timeline page
- [components/MessageBubble.tsx](components/MessageBubble.tsx) - Message bubble with sale hover preview
- [components/SalePreviewCard.tsx](components/SalePreviewCard.tsx) - Tooltip showing sale details on hover

### Firestore Collections
- `messages` - ALL messages from WhatsApp group (complete chat history)
- `sales` - Parsed sale records with client data, amounts, proof links
- `proofs` - Payment proofs (images/PDFs) with `linkedToSale` flag
- `closers` - Aggregated closer stats (totalSales, totalAmount)
- `webhook_logs` - Debug logs for webhook processing

### Sale Message Format (parsed by regex)
```
Nombre: [client name]
Email: [email]
Teléfono: [phone]
Monto: [amount][currency]
Producto: [product]
Funnel: [source]
Medio de Pago: [method]
tipo de pago: [Completo/Cuota X/Y]
Extras: [extras]
Status: [emoji]
✅
```

## Environment Variables

Copy `.env.example` to `.env.local`:
- `NEXT_PUBLIC_FIREBASE_*` - Firebase client config
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` - WhatsApp API
- `SALES_GROUP_JID` - WhatsApp group ID (format: `123456@g.us`)

## Tech Stack
- Next.js 14 (App Router)
- Firebase (Firestore, Storage)
- Tailwind CSS
- date-fns (Spanish locale for relative times)
- lucide-react (icons)

## Important Notes

### Firestore Gotchas
- **Never use `undefined`** - Firestore rejects undefined values. Use conditional field assignment:
  ```typescript
  const doc: Record<string, unknown> = { required: value };
  if (optional) doc.optional = optional; // Only add if has value
  ```
- **Deploy indexes** after adding composite queries: `firebase deploy --only firestore:indexes`

### Message Types
The webhook handles: `text`, `image`, `document`, `audio`, `video`, `sticker`, `reaction`

### Proof Linking
1. Proof arrives → saved to `proofs` with `linkedToSale: false`
2. Sale message cites proof → `quotedMessageId` contains proof's messageId
3. Webhook looks up proof by messageId, sets `linkedToSale: true`
4. Fallback: if no quote, finds most recent unlinked proof from same sender (10 min window)
