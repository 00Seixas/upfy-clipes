const BASE_URL = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

export async function sendWhatsappMessage(phone: string, message: string) {
  const response = await fetch(`${BASE_URL}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': process.env.ZAPI_SECURITY_TOKEN!,
    },
    body: JSON.stringify({ phone, message }),
  })

  if (!response.ok) {
    throw new Error(`Z-API error: ${response.status}`)
  }

  return response.json()
}
