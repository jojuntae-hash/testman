import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url, customPrompt, apiKey } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL을 입력해주세요.' }, { status: 400 })
    }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY

    // 1. URL 분석 및 메타데이터 추출
    let pageTitle = ''
    let siteType: 'youtube' | 'blog' | 'article' | 'other' = 'other'
    let textContent = ''
    let videoId = ''
    let thumbnail = ''

    // 유튜브 판별
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
    if (ytMatch && ytMatch[1]) {
      siteType = 'youtube'
      videoId = ytMatch[1]
      thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json()
          pageTitle = oembedData.title || ''
        }
      } catch (err) {
        console.warn('oEmbed fetch error:', err)
      }
    } else {
      // 일반 웹 페이지 (블로그, 웹진 등) 스크래핑
      try {
        const fetchRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        })
        if (fetchRes.ok) {
          const html = await fetchRes.text()
          // Title 추출
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
          if (titleMatch) {
            pageTitle = titleMatch[1].trim()
          }
          // 본문 간단 텍스트 추출 (HTML 태그 제거 및 공백 정리)
          const cleanText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000) // 토큰 한도 고려하여 일부 추출
          textContent = cleanText

          if (url.includes('blog') || url.includes('tistory') || url.includes('velog') || url.includes('brunch')) {
            siteType = 'blog'
          } else {
            siteType = 'article'
          }
        }
      } catch (err) {
        console.warn('Webpage fetch error:', err)
      }
    }

    if (!pageTitle) {
      pageTitle = url
    }

    // 2. Gemini API 호출이 가능한 경우 요약 생성
    let summaryMarkdown = ''
    let keyPoints: string[] = []

    if (geminiKey) {
      try {
        const promptText = `
당신은 최고의 지식 큐레이터 및 인사이트 분석가입니다.
아래 콘텐츠의 핵심을 나중에 다시 볼 때 완벽히 이해할 수 있도록 **매우 상세하고 깊이 있게** 정리해주세요.

[콘텐츠 정보]
- 링크: ${url}
- 유형: ${siteType}
- 제목: ${pageTitle}
${videoId ? `- 유튜브 ID: ${videoId}` : ''}
${textContent ? `- 내용 텍스트: ${textContent.slice(0, 5000)}` : ''}
${customPrompt ? `- 사용자 요청사항: ${customPrompt}` : ''}

[작성 지침 - 엄격 준수]
1. ⚠️ **서두 인사나 메타 설명 금지**: "요청하신 영상 요약입니다", "마크다운으로 작성했습니다" 같은 불필요한 시작 멘트는 절대 쓰지 말고, 곧바로 1번 핵심 요약부터 시작하세요.
2. 📖 **충분하고 상세한 분량**: 수박 겉핥기식이 아닌, 영상/글에서 전달하는 핵심 논리, 뇌과학/심리적 원리, 실제 예시, 행동 요령까지 최대한 구체적이고 자세하게 설명해주세요.
3. 👁️ **가독성 최우선**:
   - 복잡한 마크다운 기호(**, ### 등)를 남발하지 마세요.
   - 각 항목과 문단 사이에 빈 줄을 충분히 넣어 답답하지 않고 시원하게 읽히도록 작성하세요.
   - 중요한 부분은 깔끔한 번호 매기기(1, 2, 3)와 불릿 기호(•, -)를 활용하세요.

[문서 구성 형식]

■ 1. 핵심 요약 (Key Summary)
• 영상의 핵심 메시지 3~4가지를 명확한 문장으로 요약

(빈 줄)

■ 2. 상세 분석 및 핵심 원리 (Deep Dive)
• 주제별/단계별로 왜 그런 현상이 일어나는지, 배경 원리와 메커니즘을 상세히 설명
• 영상에서 제시하는 핵심 논점과 근거를 구체적으로 서술

(빈 줄)

■ 3. 구체적인 실천 가이드 & 적용점 (Action Plan)
• 당장 일상과 업무에 적용할 수 있는 실천 지침 3~5가지 (구체적 방법 포함)

(빈 줄)

■ 4. 핵심 키워드
#태그1 #태그2 #태그3 #태그4 #태그5
`

        const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey 
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: promptText }]
            }]
          })
        })

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

          // 태그 자동 추출
          const tagMatches = rawText.match(/#([가-힣a-zA-Z0-9_-]+)/g)
          if (tagMatches) {
            keyPoints = Array.from(new Set(tagMatches.map((t: string) => t.replace(/^#/, '').trim()))).filter(Boolean) as string[]
          }

          // 본문에서 '■ 4. 핵심 키워드' 및 해시태그 라인 제거하여 본문을 깔끔하게 정돈
          let cleanedSummary = rawText
            .replace(/■\s*4\.\s*핵심\s*키워드[\s\S]*$/i, '')
            .replace(/#([가-힣a-zA-Z0-9_-]+)/g, '')
            .trim()

          summaryMarkdown = cleanedSummary
        } else {
          const errData = await geminiRes.text()
          console.error('Gemini API Error:', errData)
          let errMsg = 'Gemini API 호출 실패'
          try {
            const parsed = JSON.parse(errData)
            errMsg = parsed.error?.message || errMsg
          } catch {}
          return NextResponse.json({
            success: false,
            title: pageTitle,
            type: siteType,
            url,
            videoId,
            thumbnail,
            error: `Gemini API 호출 오류: ${errMsg}`
          }, { status: 400 })
        }
      } catch (err: any) {
        console.error('Gemini call error:', err)
        return NextResponse.json({
          error: `Gemini 호출 중 오류 발생: ${err.message}`
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({
        success: false,
        title: pageTitle,
        type: siteType,
        url,
        videoId,
        thumbnail,
        error: 'Gemini API 키가 설정되지 않았습니다. 상단 [API 설정]에서 키를 등록해주세요.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      title: pageTitle,
      type: siteType,
      url,
      videoId,
      thumbnail,
      summary: summaryMarkdown,
      tags: keyPoints,
      hasAiSummary: !!summaryMarkdown
    })
  } catch (error: any) {
    console.error('Summarize error:', error)
    return NextResponse.json({ error: error.message || '요약 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
