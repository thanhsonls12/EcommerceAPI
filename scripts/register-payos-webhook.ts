import { PayOS } from '@payos/node'
import envConfig from '../src/shared/config'

const webhookUrl = process.argv[2]

if (!webhookUrl) {
  console.error('Usage: npm run payos:webhook -- <webhook-url>')
  process.exit(1)
}

let parsedUrl: URL

try {
  parsedUrl = new URL(webhookUrl)
} catch {
  console.error('Webhook URL is invalid')
  process.exit(1)
}

if (parsedUrl.protocol !== 'https:') {
  console.error('Webhook URL must use HTTPS')
  process.exit(1)
}

const payos = new PayOS({
  clientId: envConfig.PAYOS_CLIENT_ID,
  apiKey: envConfig.PAYOS_API_KEY,
  checksumKey: envConfig.PAYOS_CHECKSUM_KEY,
})

async function main() {
  const result = await payos.webhooks.confirm(webhookUrl)

  console.log('PayOS webhook registered successfully')
  console.log('Webhook URL: ' + result.webhookUrl)
}

main().catch((error: unknown) => {
  console.error('Failed to register PayOS webhook')
  console.error(error)
  process.exit(1)
})
