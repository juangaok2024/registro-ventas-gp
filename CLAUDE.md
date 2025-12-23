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
WhatsApp Group → Evolution API → /api/webhook/evolution → Firestore → Dashboard
```

### Data Flow
1. Closer sends proof (image/PDF) to WhatsApp group
2. Closer replies to proof with structured message (Nombre:, Monto:, etc.)
3. Evolution API webhook triggers `/api/webhook/evolution/route.ts`
4. Parser extracts sale data using regex patterns from `types/sales.ts`
5. Sale stored in Firestore `sales` collection, closer stats updated in `closers` collection
6. Dashboard at `app/page.tsx` displays sales table and closer rankings

### Key Files
- [types/sales.ts](types/sales.ts) - Type definitions and `SALE_PATTERNS` regex for parsing
- [lib/parser.ts](lib/parser.ts) - `parseSaleMessage()` extracts data from structured messages
- [lib/firebase.ts](lib/firebase.ts) - Firebase client initialization (Firestore + Storage)
- [app/api/webhook/evolution/route.ts](app/api/webhook/evolution/route.ts) - Webhook handler (proof caching, message parsing, Firestore writes)

### Firestore Collections
- `sales` - Individual sale records with client data, amounts, proofs
- `closers` - Aggregated closer stats (totalSales, totalAmount)

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
