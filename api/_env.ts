function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} env var`)
  return value
}

function requiredEnvAny(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  throw new Error(`Missing one of ${names.join(', ')} env vars`)
}

function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export const serverEnv = {
  appUrl: appUrl(),
  stripeSecretKey: requiredEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: requiredEnv('STRIPE_WEBHOOK_SECRET'),
  supabaseUrl: requiredEnvAny('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  supabaseAnonKey: requiredEnvAny('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
}
