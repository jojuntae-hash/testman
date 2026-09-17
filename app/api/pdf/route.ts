import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML 내용이 없습니다.' }, { status: 400 });
    }

    // Chromium 헤드리스 브라우저 실행
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();

    // 뷰포트 설정 (A4 가로 비율 호환)
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // CSS @media print에 의해 요소가 숨겨지지 않도록 screen 미디어타입 에뮬레이트
    await page.emulateMediaType('screen');

    // 페이지 콘텐츠 로드
    await page.setContent(html, {
      waitUntil: 'domcontentloaded'
    });

    // 폰트 및 외부 스타일 렌더링 완료 대기
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 텍스트 기반 원본 벡터 PDF 생성
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      preferCSSPageSize: false
    });

    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="quote.pdf"'
      }
    });
  } catch (error: any) {
    console.error('PDF 생성 서버 에러:', error);
    return NextResponse.json({ error: error.message || 'PDF 생성 실패' }, { status: 500 });
  }
}
