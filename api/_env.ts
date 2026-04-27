export function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} env var`)
  return value
}

export function requiredEnvAny(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  throw new Error(`Missing one of ${names.join(', ')} env vars`)
}

export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
