import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient: any = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err)
  }
} else {
  console.warn('Supabase environment variables are missing! Database fallback mock is active.')
}

// Chained mock builder to support any arbitrary chained call without throwing null pointer exceptions
const createMockBuilder = () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    insert: () => {
      console.warn('Supabase is not configured! Insert ignored.')
      return builder
    },
    update: () => {
      console.warn('Supabase is not configured! Update ignored.')
      return builder
    },
    delete: () => {
      console.warn('Supabase is not configured! Delete ignored.')
      return builder
    },
    // Support then/catch for promise/await parsing
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    catch: (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject),
  }
  return builder
}

export const supabase = supabaseClient || {
  from: () => createMockBuilder()
}
