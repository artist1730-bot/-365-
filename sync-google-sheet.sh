#!/bin/bash
# Google Sheets CSV 자동 다운로드 스크립트

SHEET_ID="1oJkQyTnEtWjq1hQUpdSFVi4BYf0RR7HqWvHIm9RqnG4"
GID="507687400"
OUTPUT_FILE="data/google-sheet.csv"

echo "📥 구글 시트 데이터 다운로드 중..."
curl -sL "https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}" > "${OUTPUT_FILE}"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)
    LINE_COUNT=$(wc -l < "${OUTPUT_FILE}")
    echo "✅ 다운로드 완료!"
    echo "   파일 크기: ${FILE_SIZE}"
    echo "   라인 수: ${LINE_COUNT}"
else
    echo "❌ 다운로드 실패!"
    exit 1
fi
