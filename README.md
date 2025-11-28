# 아인병원 AIN365 시설관리 대시보드

Google Sheets 데이터를 실시간으로 연동하여 시설관리 현황을 시각화하는 대시보드입니다.

## 🎯 주요 기능

### 📊 통계 대시보드
- **메인 통계**: 전체/완료/진행중/대기중/긴급 미처리 건수
- **일일 통계**: 특정 날짜 선택 (기본: 어제), 카테고리별 도넛 차트
- **주간 통계**: 주차별 네비게이션 (기본: 지난주), 요일별 막대 차트  
- **월간 통계**: 2개월 비교, 변화율 표시
- **장기 미처리**: 3일 이상 지연 항목 테이블 (공종/층/접수자/부서/지연일수)

### 🔄 데이터 연동
- Google Sheets CSV 자동 연동 (2921건 데이터)
- 5분마다 자동 갱신
- 수동 새로고침 버튼

### 📱 반응형 디자인
- 모바일, 태블릿, 데스크톱 지원
- 세련된 그라데이션 UI
- Font Awesome 아이콘
- Chart.js 차트

## 🚀 사용 방법

### 로컬 실행
```bash
# 1. 데이터 다운로드
./sync-google-sheet.sh

# 2. 웹 서버 시작
python3 -m http.server 8000

# 3. 브라우저에서 접속
# http://localhost:8000
```

### 데이터 갱신
```bash
./sync-google-sheet.sh
```

## 📁 프로젝트 구조
```
ain365-dashboard/
├── index.html                          # 메인 HTML
├── css/
│   └── styles.css                      # 스타일시트
├── js/
│   ├── google-sheets-integration.js    # CSV 파서 & 데이터 변환
│   └── app.js                          # 대시보드 로직
├── data/
│   └── google-sheet.csv                # CSV 데이터 (자동 다운로드)
├── sync-google-sheet.sh                # 데이터 동기화 스크립트
└── README.md
```

## 🔧 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js 4.4.0
- **Icons**: Font Awesome 6.4.0
- **Data**: Google Sheets CSV Export
- **Parser**: RFC 4180 준수 CSV 파서

## 📊 데이터 처리
- CSV 파싱: 따옴표 안 개행 문자 올바르게 처리
- 데이터 변환: 카테고리/위치/우선순위 자동 매핑
- 날짜 계산: 지연 일수 자동 계산

## 🌐 배포
현재 실행 중: https://8000-i4z26vaadhdfaj4nmqy4u-c07dda5e.sandbox.novita.ai/

## 📝 라이선스
© 2025 아인병원 AIN365 시설관리. All rights reserved.
