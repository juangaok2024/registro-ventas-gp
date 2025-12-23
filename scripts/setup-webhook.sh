#!/bin/bash
# scripts/setup-webhook.sh
# Configura el webhook de Evolution API para recibir mensajes

# Variables - editar antes de usar
EVOLUTION_API_URL="${EVOLUTION_API_URL:-https://tu-evolution-api.com}"
EVOLUTION_API_KEY="${EVOLUTION_API_KEY:-tu-api-key}"
INSTANCE_NAME="${INSTANCE_NAME:-tu-instancia}"
WEBHOOK_URL="${WEBHOOK_URL:-https://tu-app.vercel.app/api/webhook/evolution}"

echo "🔧 Configurando webhook para Evolution API"
echo "   Instance: $INSTANCE_NAME"
echo "   Webhook: $WEBHOOK_URL"

# Configurar webhook
curl -X POST "$EVOLUTION_API_URL/webhook/set/$INSTANCE_NAME" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "'"$WEBHOOK_URL"'",
      "webhookByEvents": false,
      "webhookBase64": true,
      "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "GROUPS_UPSERT",
        "GROUP_PARTICIPANTS_UPDATE"
      ]
    }
  }'

echo ""
echo "✅ Webhook configurado"
echo ""
echo "📋 Para verificar:"
echo "   curl $EVOLUTION_API_URL/webhook/find/$INSTANCE_NAME -H 'apikey: $EVOLUTION_API_KEY'"
