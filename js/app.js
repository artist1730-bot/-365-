// 전역 변수
let charts = {};

// 날짜/시간 업데이트
function updateDateTime() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ko-KR', options);
    document.getElementById('lastUpdate').textContent = now.toLocaleString('ko-KR');
}

setInterval(updateDateTime, 1000);
updateDateTime();

// 모든 통계 업데이트
function updateAllStats() {
    if (!facilityData || !facilityData.facilityRequests) {
        console.error('데이터가 없습니다');
        return;
    }
    
    console.log('📊 통계 업데이트 시작...');
    updateMainStats();
    updateDailyStats();
    updateWeeklyStats();
    updateMonthlyStats();
    updateDelayStats();
    console.log('✅ 통계 업데이트 완료');
}

// 메인 통계 업데이트
function updateMainStats() {
    const data = facilityData.facilityRequests;
    
    const total = data.length;
    const completed = data.filter(r => r.status === '완료').length;
    const inProgress = data.filter(r => r.status === '진행중').length;
    const pending = data.filter(r => r.status === '대기중').length;
    const urgentPending = data.filter(r => r.status !== '완료' && r.priority === '긴급').length;
    
    document.getElementById('totalRequests').textContent = total.toLocaleString();
    document.getElementById('completedRequests').textContent = completed.toLocaleString();
    document.getElementById('inProgressRequests').textContent = inProgress.toLocaleString();
    document.getElementById('pendingRequests').textContent = pending.toLocaleString();
    document.getElementById('urgentRequests').textContent = urgentPending.toLocaleString();
}

// 일일 통계 업데이트
function updateDailyStats() {
    const selectedDate = document.getElementById('selectedDate').value;
    if (!selectedDate) return;
    
    const dayData = facilityData.facilityRequests.filter(r => r.date === selectedDate);
    
    const total = dayData.length;
    const completed = dayData.filter(r => r.status === '완료').length;
    const avgTime = completed > 0 ? 
        dayData.filter(r => r.status === '완료').reduce((sum, r) => sum + (r.delayDays || 0), 0) / completed : 0;
    
    document.getElementById('dailyTotal').textContent = total;
    document.getElementById('dailyCompleted').textContent = completed;
    document.getElementById('dailyAvgTime').textContent = avgTime.toFixed(1) + '일';
}

// 주간 통계 업데이트
function updateWeeklyStats() {
    const { startDate, endDate } = getWeekRange(currentWeekOffset);
    
    const weekData = facilityData.facilityRequests.filter(r => {
        return r.date >= startDate && r.date <= endDate;
    });
    
    const total = weekData.length;
    const completed = weekData.filter(r => r.status === '완료').length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    
    document.getElementById('weeklyTotal').textContent = total;
    document.getElementById('weeklyCompleted').textContent = completed;
    document.getElementById('weeklyRate').textContent = completionRate + '%';
}

// 월간 통계 업데이트
function updateMonthlyStats() {
    const month1 = getMonthString(currentMonthOffset);
    const month2 = getMonthString(currentMonthOffset - 1);
    
    const month1Data = facilityData.facilityRequests.filter(r => r.date.startsWith(month1));
    const month2Data = facilityData.facilityRequests.filter(r => r.date.startsWith(month2));
    
    document.getElementById('month1Total').textContent = month1Data.length;
    document.getElementById('month2Total').textContent = month2Data.length;
    
    const diff = month1Data.length - month2Data.length;
    const diffPercent = month2Data.length > 0 ? ((diff / month2Data.length) * 100).toFixed(1) : 0;
    document.getElementById('monthlyDiff').textContent = `${diff >= 0 ? '+' : ''}${diffPercent}%`;
}

// 미처리 항목 통계 업데이트  
function updateDelayStats() {
    const pendingData = facilityData.facilityRequests.filter(r => r.status !== '완료');
    
    document.getElementById('pendingTotal').textContent = pendingData.length;
    document.getElementById('pendingUrgent').textContent = 
        pendingData.filter(r => r.priority === '긴급').length;
    document.getElementById('pendingHigh').textContent = 
        pendingData.filter(r => r.priority === '높음').length;
    
    // 테이블 생성
    const tbody = document.getElementById('pendingTableBody');
    tbody.innerHTML = '';
    
    // 지연 일수 기준으로 정렬 (내림차순)
    const sortedPending = pendingData
        .filter(r => r.delayDays > 3)
        .sort((a, b) => b.delayDays - a.delayDays)
        .slice(0, 20); // 상위 20개만
    
    sortedPending.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.category}</td>
            <td>${item.location}</td>
            <td>${item.requester || '-'}</td>
            <td>${item.department || '-'}</td>
            <td><span class="badge badge-${item.status === '진행중' ? 'warning' : 'secondary'}">${item.status}</span></td>
            <td><span class="badge badge-${item.priority === '긴급' ? 'danger' : item.priority === '높음' ? 'warning' : 'info'}">${item.priority}</span></td>
            <td><span class="delay-badge ${item.delayDays > 30 ? 'delay-critical' : item.delayDays > 14 ? 'delay-high' : 'delay-medium'}">${item.delayDays}일</span></td>
        `;
        tbody.appendChild(row);
    });
}

// 모든 차트 생성
function createAllCharts() {
    console.log('📈 차트 생성 시작...');
    createDailyChart();
    createWeeklyChart();
    createMonthlyChart();
    console.log('✅ 차트 생성 완료');
}

// 일일 차트 생성
function createDailyChart() {
    const selectedDate = document.getElementById('selectedDate').value;
    if (!selectedDate) return;
    
    const dayData = facilityData.facilityRequests.filter(r => r.date === selectedDate);
    
    const categories = {};
    dayData.forEach(r => {
        categories[r.category] = (categories[r.category] || 0) + 1;
    });
    
    const ctx = document.getElementById('dailyChart');
    if (charts.daily) charts.daily.destroy();
    
    charts.daily = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// 주간 차트 생성
function createWeeklyChart() {
    const { startDate, endDate } = getWeekRange(currentWeekOffset);
    
    const weekDays = [];
    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        weekDays.push(d.toISOString().split('T')[0]);
    }
    
    const dailyCounts = weekDays.map(date => 
        facilityData.facilityRequests.filter(r => r.date === date).length
    );
    
    const ctx = document.getElementById('weeklyChart');
    if (charts.weekly) charts.weekly.destroy();
    
    charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekDays.map(d => new Date(d).toLocaleDateString('ko-KR', { weekday: 'short' })),
            datasets: [{
                label: '요청 건수',
                data: dailyCounts,
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// 월간 차트 생성
function createMonthlyChart() {
    const month1 = getMonthString(currentMonthOffset);
    const month2 = getMonthString(currentMonthOffset - 1);
    
    const month1Data = facilityData.facilityRequests.filter(r => r.date.startsWith(month1));
    const month2Data = facilityData.facilityRequests.filter(r => r.date.startsWith(month2));
    
    const ctx = document.getElementById('monthlyChart');
    if (charts.monthly) charts.monthly.destroy();
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [month1 + '월', month2 + '월'],
            datasets: [{
                label: '요청 건수',
                data: [month1Data.length, month2Data.length],
                backgroundColor: ['#667eea', '#764ba2']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// 헬퍼 함수들
function getWeekRange(offset) {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (offset * 7));
    
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(targetDate.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0]
    };
}

function getMonthString(offset) {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function setYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById('selectedDate').value = yesterday.toISOString().split('T')[0];
}

function updateWeekDisplay() {
    const { startDate, endDate } = getWeekRange(currentWeekOffset);
    const start = new Date(startDate);
    const end = new Date(endDate);
    document.getElementById('weekRange').textContent = 
        `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
}

function updateMonthRangeDisplay() {
    const month1 = getMonthString(currentMonthOffset);
    const month2 = getMonthString(currentMonthOffset - 1);
    document.getElementById('monthRange').textContent = 
        `${month1.split('-')[1]}월 vs ${month2.split('-')[1]}월`;
}

// 주차 네비게이션
function prevWeek() {
    currentWeekOffset--;
    updateWeekDisplay();
    updateWeeklyStats();
    createWeeklyChart();
}

function nextWeek() {
    if (currentWeekOffset < 0) {
        currentWeekOffset++;
        updateWeekDisplay();
        updateWeeklyStats();
        createWeeklyChart();
    }
}

// 월 네비게이션
function prevMonth() {
    currentMonthOffset--;
    updateMonthRangeDisplay();
    updateMonthlyStats();
    createMonthlyChart();
}

function nextMonth() {
    if (currentMonthOffset < 0) {
        currentMonthOffset++;
        updateMonthRangeDisplay();
        updateMonthlyStats();
        createMonthlyChart();
    }
}
