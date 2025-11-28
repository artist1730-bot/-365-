/**
 * 구글 시트 연동 모듈 - CSV 파일 로드 방식
 */

// 구글 시트 설정
const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1oJkQyTnEtWjq1hQUpdSFVi4BYf0RR7HqWvHIm9RqnG4',
    GID: '507687400'
};

/**
 * 구글 시트 데이터 가져오기 (CSV 파일 직접 로드)
 */
async function loadGoogleSheetData() {
    try {
        console.log('📥 구글 시트 CSV 데이터 로딩 시작...');
        
        // CSV 파일 로드
        const csvUrl = 'data/google-sheet.csv';
        console.log('🔗 CSV URL:', csvUrl);
        
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(`✅ CSV 데이터 로드: ${csvText.length} bytes`);
        
        // CSV 파싱
        const rawData = parseCSVToJSON(csvText);
        console.log(`📊 파싱된 행: ${rawData.length}개`);
        
        if (rawData.length === 0) {
            console.warn('⚠️ 파싱된 데이터가 없습니다.');
            return null;
        }
        
        // 데이터 변환
        const transformedData = transformGoogleSheetData(rawData);
        console.log(`✨ 변환된 데이터: ${transformedData.length}건`);
        
        if (transformedData.length === 0) {
            console.warn('⚠️ 변환된 데이터가 없습니다.');
            return null;
        }
        
        return {
            metadata: {
                hospital: '아인병원',
                system: 'AIN365 시설관리',
                lastUpdated: new Date().toISOString().split('T')[0],
                dataSource: 'Google Sheets CSV',
                totalRecords: transformedData.length
            },
            facilityRequests: transformedData
        };
        
    } catch (error) {
        console.error('❌ 구글 시트 연동 오류:', error);
        console.error('오류 상세:', error.message);
        return null;
    }
}

/**
 * CSV를 JSON으로 파싱 (RFC 4180 준수 - 따옴표 안 개행 문자 처리)
 */
function parseCSVToJSON(csvText) {
    console.log(`📝 CSV 원본 크기: ${csvText.length} bytes`);
    
    // CSV를 행 단위로 파싱 (따옴표 안의 개행 문자 처리)
    const rows = parseCSVRows(csvText);
    console.log(`📝 총 행 수: ${rows.length}`);
    
    if (rows.length < 3) {
        console.error(`❌ CSV 행이 너무 적음: ${rows.length}`);
        return [];
    }
    
    // 첫 번째 행은 제목 ("V O C 접수/처리 현황")
    // 두 번째 행이 실제 헤더
    const headerRow = rows[1];
    
    // 헤더 정리 (개행 문자 제거하고 공백으로 변경)
    const headers = headerRow.map(h => h.replace(/\n/g, ' ').trim());
    console.log(`🔑 헤더 개수: ${headers.length}`);
    
    const data = [];
    let successCount = 0;
    let emptyCount = 0;
    
    // 데이터는 3번째 행부터 (인덱스 2부터)
    for (let i = 2; i < rows.length; i++) {
        const values = rows[i];
        
        // 빈 행 스킵
        if (!values || values.length === 0) {
            emptyCount++;
            continue;
        }
        
        // 첫 번째 값(날짜)이 없으면 스킵
        if (!values[0] || values[0].trim() === '') {
            emptyCount++;
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(row);
        successCount++;
    }
    
    console.log(`✅ 성공적으로 파싱된 행: ${successCount}개`);
    
    return data;
}

/**
 * CSV를 행 단위로 파싱 (따옴표 안의 개행 문자 처리)
 */
function parseCSVRows(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < csvText.length) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // 따옴표 이스케이프 ("")
                currentField += '"';
                i += 2;
                continue;
            } else {
                // 따옴표 시작/끝
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        }
        
        if (!inQuotes) {
            if (char === ',') {
                // 필드 구분
                currentRow.push(currentField);
                currentField = '';
                i++;
                continue;
            }
            
            if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                // 행 끝
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                
                if (char === '\r') i += 2;
                else i++;
                continue;
            }
            
            if (char === '\r') {
                // 단독 \r
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                i++;
                continue;
            }
        }
        
        // 일반 문자
        currentField += char;
        i++;
    }
    
    // 마지막 필드/행 처리
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    
    return rows;
}

/**
 * 구글 시트 데이터를 대시보드 형식으로 변환
 */
function transformGoogleSheetData(rawData) {
    console.log(`🔄 데이터 변환 시작: ${rawData.length}개 행`);
    const transformed = [];
    let skippedNoDate = 0;
    let skippedBadFormat = 0;
    
    rawData.forEach((row, index) => {
        try {
            // 날짜 추출
            let requestDate = row['하자보수 요청일'] || '';
            requestDate = requestDate.replace(/\n/g, '').trim();
            
            if (!requestDate || requestDate === '') {
                skippedNoDate++;
                return;
            }
            
            const formattedDate = formatDate(requestDate);
            if (!formattedDate) {
                skippedBadFormat++;
                return;
            }
            
            // 기타 필드 추출
            let category = row['하자 공종구분'] || '';
            category = category.replace(/\n/g, ' ').trim();
            
            let content = row['하자보수 요청 내용'] || '';
            content = content.replace(/\n/g, ' ').trim();
            
            let issueType = row['하자유형 (작동불량 / 균열, 파손 / 들뜸, 탈락 / 오염 / 결로, 누수 / 개선 / 민원)'] || '';
            issueType = issueType.replace(/\n/g, ' ').trim();
            
            let processDate = row['처리 의뢰일'] || '';
            processDate = processDate.replace(/\n/g, '').trim();
            
            let completionDate = row['보수 종료일 (임시 조치 / 추이 주시 / 업체 이관 / 책임부서이관 / 긴급)'] || '';
            completionDate = completionDate.replace(/\n/g, ' ').trim();
            
            let status = row['처리 구분'] || '';
            status = status.replace(/\n/g, '').trim();
            
            let manager = row['담당자'] || '';
            manager = manager.replace(/\n/g, ' ').trim();
            
            let requester = row['하자보수 요청자'] || '';
            requester = requester.replace(/\n/g, ' ').trim();
            
            let department = row['하자 구분'] || '';
            department = department.replace(/\n/g, ' ').trim();
            
            const mappedCategory = mapCategory(category, content, issueType);
            const location = extractLocation(content);
            const priority = determinePriority(issueType, content, completionDate);
            const mappedStatus = mapStatus(status, completionDate);
            const delayDays = calculateDelayDays(requestDate, processDate, completionDate, mappedStatus);
            
            const item = {
                id: index + 1,
                date: formattedDate,
                category: mappedCategory,
                location: location,
                priority: priority,
                status: mappedStatus,
                requestTime: extractTime(requestDate) || '09:00',
                completionTime: mappedStatus === '완료' ? (extractTime(completionDate) || '17:00') : null,
                season: getSeason(formattedDate),
                description: content.substring(0, 100),
                issueType: issueType,
                manager: manager,
                requester: requester,
                department: department,
                delayDays: delayDays,
                processDate: processDate ? formatDate(processDate) : null,
                completionDate: completionDate ? formatDate(completionDate) : null
            };
            
            transformed.push(item);
        } catch (error) {
            console.warn(`❌ 행 ${index} 처리 오류:`, error);
        }
    });
    
    console.log(`✅ 변환 성공: ${transformed.length}개`);
    console.log(`⚠️ 날짜 없음으로 스킵: ${skippedNoDate}개`);
    console.log(`⚠️ 날짜 형식 오류로 스킵: ${skippedBadFormat}개`);
    
    return transformed.filter(item => item.date && item.date !== '');
}

// 헬퍼 함수들
function mapCategory(category, content, issueType) {
    const text = (category + ' ' + content + ' ' + issueType).toLowerCase();
    
    if (text.includes('기계') || text.includes('설비') || text.includes('냉난방') || 
        text.includes('보일러') || text.includes('온수')) {
        return '냉난방';
    }
    if (text.includes('전기') || text.includes('조명') || text.includes('콘센트')) {
        return '전기';
    }
    if (text.includes('배관') || text.includes('급수') || text.includes('급탕') || 
        text.includes('누수') || text.includes('수도')) {
        return '배관';
    }
    if (text.includes('청소') || text.includes('오염')) {
        return '청소';
    }
    if (text.includes('소방') || text.includes('화재')) {
        return '소방';
    }
    if (text.includes('건축') || text.includes('영선') || text.includes('도배') || 
        text.includes('바닥') || text.includes('벽')) {
        return '건축';
    }
    
    return '기타';
}

function extractLocation(content) {
    const patterns = [
        /(\d+)층/,
        /(\d{3,4})호/,
        /(지하|옥상|로비|주차장|복도|계단|엘리베이터|좌욕실|화장실|병동|외래)/
    ];
    
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            return match[0];
        }
    }
    
    return '기타';
}

function determinePriority(issueType, content, completionDate) {
    const text = (issueType + ' ' + content + ' ' + completionDate).toLowerCase();
    
    if (text.includes('누수') || text.includes('긴급') || 
        text.includes('응급') || text.includes('즉시')) {
        return '긴급';
    }
    if (text.includes('작동불량') || text.includes('고장') || 
        text.includes('파손') || text.includes('균열')) {
        return '높음';
    }
    
    return '보통';
}

function mapStatus(status, completionDate) {
    if (status === '종결' || status.includes('완료')) {
        return '완료';
    }
    if (status.includes('진행') || status.includes('처리중')) {
        return '진행중';
    }
    if (completionDate && completionDate !== '') {
        return '완료';
    }
    
    return '대기중';
}

function calculateDelayDays(requestDate, processDate, completionDate, status) {
    try {
        const request = new Date(formatDate(requestDate));
        
        if (status === '완료' && completionDate) {
            const completion = new Date(formatDate(completionDate));
            const diffTime = completion - request;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }
        
        if (status !== '완료') {
            const today = new Date();
            const diffTime = today - request;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }
    } catch (error) {
        return 0;
    }
    
    return 0;
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '') return null;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
        return dateStr.replace(/\./g, '-');
    }
    
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
        return dateStr.replace(/\//g, '-');
    }
    
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        return null;
    }
    
    return null;
}

function extractTime(dateStr) {
    if (!dateStr) return null;
    
    const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
        const hour = timeMatch[1].padStart(2, '0');
        const minute = timeMatch[2];
        return `${hour}:${minute}`;
    }
    
    return null;
}

function getSeason(dateStr) {
    if (!dateStr) return '가을';
    
    try {
        const month = parseInt(dateStr.split('-')[1]);
        
        if (month >= 3 && month <= 5) return '봄';
        if (month >= 6 && month <= 8) return '여름';
        if (month >= 9 && month <= 11) return '가을';
        return '겨울';
    } catch (e) {
        return '가을';
    }
}

/**
 * 자동 갱신 설정
 */
function setupAutoRefresh(intervalMinutes = 5) {
    console.log(`🔄 자동 갱신 설정: ${intervalMinutes}분마다`);
    
    setInterval(async () => {
        console.log('🔄 데이터 자동 갱신 중...');
        const newData = await loadGoogleSheetData();
        if (newData && newData.facilityRequests.length > 0) {
            facilityData = newData;
            updateAllStats();
            createAllCharts();
            console.log('✅ 데이터 갱신 완료');
            
            document.getElementById('dataSource').innerHTML = `
                <i class="fas fa-check-circle" style="color: #38ef7d;"></i>
                <span>구글 시트 연동: ${newData.facilityRequests.length}건</span>
            `;
        }
    }, intervalMinutes * 60 * 1000);
}
