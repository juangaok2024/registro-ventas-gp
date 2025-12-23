# Sales Tracker - WhatsApp Sales Monitor

Sistema para capturar y registrar ventas desde un grupo de WhatsApp de closers.

## Flujo

1. Closer reenvía comprobante (imagen/PDF) al grupo
2. Closer responde con el formulario estructurado
3. Evolution API envía webhook
4. Cloud Function parsea y guarda en Firestore
5. Dashboard muestra registro de ventas

## Stack

- **Frontend**: Next.js 14 + Tailwind + shadcn/ui
- **Backend**: Firebase (Firestore + Storage + Cloud Functions)
- **WhatsApp**: Evolution API (self-hosted)

## Setup

### 1. Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 2. Variables de entorno

```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Para Cloud Functions
EVOLUTION_API_URL=https://tu-evolution.com
EVOLUTION_API_KEY=tu-api-key
SALES_GROUP_JID=120363319748570079@g.us
```

### 3. Deploy

```bash
# Frontend
npm run build
firebase deploy --only hosting

# Functions
cd functions
npm run deploy
```

## Estructura del Mensaje (Closer)

```
Nombre: [nombre cliente]
Email: [email]
Teléfono: [teléfono]
Monto: [cantidad][moneda]
Producto: [producto]
Funnel: [ads/orgánico/etc]
Medio de Pago: [método]
tipo de pago: [Completo/Cuota X/Y]
Extras: [extras]
Status: [emoji]
✅
```
