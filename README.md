# Sales Tracker - WhatsApp Sales Monitor

Sistema para capturar y registrar ventas desde un grupo de WhatsApp de closers, con historial completo de chat.

## Características

- 📊 **Dashboard de ventas** - Tabla con filtros por fecha, verificación manual
- 💬 **Timeline de chat** - Historial completo del grupo con identificación de ventas
- 🏆 **Ranking de closers** - Estadísticas por vendedor
- 🖼️ **Comprobantes** - Almacenamiento y vinculación automática de proofs
- 🔍 **Preview de ventas** - Hover sobre mensajes de venta para ver detalles

## Flujo

1. Closer reenvía comprobante (imagen/PDF) al grupo
2. Closer responde citando el comprobante con el formulario estructurado
3. Evolution API envía webhook a `/api/webhook/evolution`
4. Webhook guarda TODOS los mensajes en colección `messages`
5. Si es venta, parsea datos y guarda en `sales`
6. Si es comprobante, guarda en `proofs` y vincula automáticamente
7. Dashboard y Chat Timeline muestran los datos en tiempo real

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Firebase (Firestore + Storage)
- **WhatsApp**: Evolution API (self-hosted)
- **Icons**: lucide-react
- **Dates**: date-fns (Spanish locale)

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

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard principal - tabla de ventas, filtros, verificación |
| `/chat` | Timeline de chat - historial completo con preview de ventas |

## API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/webhook/evolution` | POST | Recibe webhooks de Evolution API |
| `/api/sales` | GET | Lista ventas con filtros |
| `/api/sales/[id]/verify` | PATCH | Verificar/rechazar venta |
| `/api/messages` | GET | Lista mensajes del chat |
| `/api/closers` | GET | Estadísticas de closers |

## Colecciones Firestore

- `messages` - Todos los mensajes del grupo (texto, imágenes, reacciones, etc.)
- `sales` - Ventas parseadas con datos del cliente y comprobante
- `proofs` - Comprobantes (imágenes/PDFs) pendientes de vincular
- `closers` - Estadísticas agregadas por vendedor
- `webhook_logs` - Logs de debug del webhook
