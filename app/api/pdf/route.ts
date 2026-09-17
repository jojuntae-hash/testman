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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
    });

    const page = await browser.newPage();

    // 페이지 콘텐츠 및 CSS 렌더링 설정
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0']
    });

    // 텍스트 기반 벡터 PDF 출력
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      preferCSSPageSize: true
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
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
