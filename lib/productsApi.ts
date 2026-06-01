import { supabase } from './supabase'

export interface Product {
  id: string
  name: string
  model_name: string
  image_url: string
  description?: string
  created_at?: string
}

// Supabase 데이터베이스 연동 함수
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase products fetch error:', error)
      return getFallbackProducts() // Supabase 테이블이 아직 없을 경우의 임시 데이터
    }

    // 데이터가 없으면 임시 데이터 반환 (초기 세팅용)
    if (!data || data.length === 0) {
      return getFallbackProducts()
    }

    return data as Product[]
  } catch (error) {
    console.error('Error fetching products:', error)
    return getFallbackProducts()
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      const fallback = getFallbackProducts().find(p => p.id === id)
      return fallback || null
    }

    return data as Product
  } catch (error) {
    const fallback = getFallbackProducts().find(p => p.id === id)
    return fallback || null
  }
}

// 이미지 업로드 함수 (Supabase Storage)
export async function uploadProductImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `images/${fileName}`

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error('이미지 업로드에 실패했습니다.')
  }

  // 업로드된 이미지의 Public URL 가져오기
  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

// 새 제품 등록 함수
export async function addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single()

  if (error) {
    console.error('Insert error:', error)
    throw new Error('제품 등록에 실패했습니다.')
  }

  return data as Product
}


// 제품 수정 함수
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update error:', error)
    throw new Error('제품 수정에 실패했습니다.')
  }

  return data as Product
}

// Supabase DB가 아직 구축되지 않았거나 비어있을 경우 보여줄 테스트 데이터
function getFallbackProducts(): Product[] {
  return [
    {
      id: '1',
      name: '아이콘 얼음정수기',
      model_name: 'CHPI-7400N',
      image_url: '/products/얼음정수기-CHPI-7400N.png',
      description: '풍부한 얼음, 완벽한 정수'
    },
    {
      id: '2',
      name: '아이콘 정수기 2',
      model_name: 'CHP-7210N',
      image_url: '/products/정수기2-CHP-7210N.png',
      description: '더 작아지고 더 완벽해진 아이콘'
    }
  ]
}
