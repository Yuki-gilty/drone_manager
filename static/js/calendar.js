/**
 * Calendar management module
 */

import { practiceDayStorage, repairStorage, partStorage, droneStorage } from './storage.js';

let currentDate = new Date();

/**
 * Initialize calendar
 */
export function initCalendar() {
    renderCalendar();
    setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('add-practice-day').addEventListener('click', () => {
        openAddPracticeModal();
    });

    document.getElementById('add-practice-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addPracticeDay();
    });

    setupModalClose('add-practice-modal', 'cancel-add-practice');
}

/**
 * Render calendar
 */
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 月と年の表示を更新
    document.getElementById('current-month-year').textContent = 
        `${year}年${month + 1}月`;

    // カレンダーコンテナをクリア
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    // カレンダーグリッドを作成
    const calendar = document.createElement('div');
    calendar.className = 'calendar-grid';

    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-weekday';
        header.textContent = day;
        calendar.appendChild(header);
    });

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // 空のセル（月の最初の日より前）
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendar.appendChild(emptyCell);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 日付表示
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        // イベント表示
        const events = getEventsForDate(dateStr);
        if (events.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = `event-item event-${event.type}`;
                eventItem.textContent = event.label;
                eventsContainer.appendChild(eventItem);
            });
            
            dayCell.appendChild(eventsContainer);
        }

        calendar.appendChild(dayCell);
    }

    container.appendChild(calendar);
}

/**
 * Get events for a specific date
 */
function getEventsForDate(dateStr) {
    const events = [];

    // 練習日
    const practiceDays = practiceDayStorage.getAll();
    if (practiceDays.some(day => day.date === dateStr)) {
        events.push({ type: 'practice', label: '練習' });
    }

    // 修理履歴
    const repairs = repairStorage.getAll();
    repairs.forEach(repair => {
        if (repair.date === dateStr) {
            const drone = droneStorage.getById(repair.droneId);
            const droneName = drone ? drone.name : '不明';
            const part = repair.partId ? partStorage.getById(repair.partId) : null;
            const partName = part ? part.name : '';
            const label = partName ? `${droneName} - ${partName} 修理` : `${droneName} 修理`;
            events.push({ type: 'repair', label });
        }
    });

    // パーツ交換履歴
    const parts = partStorage.getAll();
    parts.forEach(part => {
        if (part.replacementHistory) {
            part.replacementHistory.forEach(replacement => {
                if (replacement.date === dateStr) {
                    const drone = droneStorage.getById(part.droneId);
                    const droneName = drone ? drone.name : '不明';
                    events.push({ type: 'replacement', label: `${droneName} - ${part.name} 交換` });
                }
            });
        }
    });

    return events;
}

/**
 * Open add practice modal
 */
function openAddPracticeModal() {
    document.getElementById('add-practice-form').reset();
    document.getElementById('add-practice-modal').style.display = 'block';
}

/**
 * Add practice day
 */
function addPracticeDay() {
    const date = document.getElementById('practice-date').value;

    if (!date) {
        alert('練習日を選択してください');
        return;
    }

    practiceDayStorage.add({ date });
    closeModal('add-practice-modal');
    renderCalendar();
}

/**
 * Setup modal close handlers
 */
function setupModalClose(modalId, cancelButtonId = null) {
    const modal = document.getElementById(modalId);
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', () => closeModal(modalId));
    
    if (cancelButtonId) {
        document.getElementById(cancelButtonId).addEventListener('click', () => closeModal(modalId));
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}


