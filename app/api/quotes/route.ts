import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const quote = await request.json()
    
    const id = String(quote.id || `quote_${Date.now()}`)
    
    // Extract total amount if available in the data
    let totalAmount = 0;
    if (quote.products && Array.isArray(quote.products)) {
        totalAmount = quote.products.reduce((sum: number, p: any) => sum + (Number(p.rentalFee) || 0), 0);
    }

    const payload = {
      id,
      title: quote.docTitle || '견적서',
      customer: quote.customer || '',
      date: quote.date || '',
      total_amount: totalAmount,
      data: quote,
      created_at: quote.createdAt || new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('quotes')
      .upsert(payload, { onConflict: 'id' })
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error: any) {
    console.error('Error saving quote:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
