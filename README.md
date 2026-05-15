# 🛠️ 서비스 관리 대시보드 (Service Management Dashboard)

고객 정보 관리와 설치 위치 확인을 위한 효율적인 관리 도구입니다. 카카오 지도 API를 통합하여 위치 기반 서비스를 제공합니다.

## ✨ 주요 기능

- **고객 관리**: 고객 명단 확인 및 상세 정보 관리
- **카카오 지도 연동**: 고객의 설치 위치를 지도상에서 시각화
- **주소 검색**: 주소 검색을 통한 정확한 위치 설정
- **모바일 최적화**: 반응형 레이아웃을 통해 모바일 환경에서도 편리한 사용성 제공
- **자동 번호 보정**: 전화번호 입력 시 자동으로 형식을 보정하는 유틸리티 포함

## 🚀 기술 스택

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS / Vanilla CSS
- **Maps**: Kakao Maps API (react-kakao-maps-sdk)
- **Excel**: xlsx (데이터 임포트/익스포트 지원)

## 📦 실행 방법

1. **의존성 설치**:
   ```bash
   npm install
   ```

2. **환경 변수 설정**:
   `.env.local` 파일을 생성하고 카카오 API 키를 설정합니다.
   ```env
   NEXT_PUBLIC_KAKAO_APP_KEY=your_kakao_app_key
   ```

3. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

## 📝 최근 업데이트

- 카카오 지도 로딩 안정화 및 클라이언트 사이드 내비게이션 최적화
- 모바일 내비게이션 레이아웃 및 헤더 UI 통일
- 주소 검색 기능 및 설정 페이지 레이아웃 개선
