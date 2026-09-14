-- ==============================================================================
-- 💡 지식 & 인사이트 아카이브 (insights) 테이블 생성 SQL
-- ==============================================================================
-- Supabase 대시보드(https://supabase.com) > Project > SQL Editor 에 복사하여 실행(Run)하세요.

-- 1. 인사이트(insights) 테이블 생성
CREATE TABLE IF NOT EXISTS public.insights (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    type TEXT DEFAULT 'youtube',
    thumbnail TEXT,
    video_id TEXT,
    summary TEXT,
    user_notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security(RLS) 비활성화 (기존 고객 관리 프로젝트와 동일하게 어디서나 읽기/쓰기 가능)
ALTER TABLE public.insights DISABLE ROW LEVEL SECURITY;

-- 혹시 RLS를 활성화하고 전체 허용 정책을 적용하고 싶다면 아래 주석을 해제하세요:
-- ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all public access for insights" ON public.insights FOR ALL USING (true) WITH CHECK (true);

-- 3. 빠른 검색과 정렬을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(type);

-- 4. 실시간(Realtime) 동기화 활성화 (선택 사항)
ALTER PUBLICATION supabase_realtime ADD TABLE public.insights;
