/**
 * Calendar management module
 */

import { practiceDayStorage, repairStorage, partStorage, droneStorage } from './storage.js';
import { updateStats } from './drone.js';

let currentDate = new Date();

/**
 * Initialize calendar
 */
export function initCalendar() {
    renderCalendar();
    setupEventListeners();
}

/**
 * Reinitialize calendar event listeners (called when calendar page is shown)
 */
export function reinitCalendarListeners() {
    setupEventListeners();
}

// グローバルに公開（ナビゲーションから呼び出せるように）
window.renderCalendar = renderCalendar;
window.reinitCalendarListeners = reinitCalendarListeners;

// イベントリスナーの参照を保持（重複登録を防ぐため）
let eventListenersSetup = false;
let prevMonthHandler = null;
let nextMonthHandler = null;
let addPracticeDayBtnHandler = null;
let addPracticeFormHandler = null;
let deleteEventBtnHandler = null;

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // 既に設定済みの場合は、既存のリスナーを削除
    if (eventListenersSetup) {
        const prevMonthBtn = document.getElementById('prev-month');
        if (prevMonthBtn && prevMonthHandler) {
            prevMonthBtn.removeEventListener('click', prevMonthHandler);
        }

        const nextMonthBtn = document.getElementById('next-month');
        if (nextMonthBtn && nextMonthHandler) {
            nextMonthBtn.removeEventListener('click', nextMonthHandler);
        }

        const addPracticeDayBtn = document.getElementById('add-practice-day');
        if (addPracticeDayBtn && addPracticeDayBtnHandler) {
            addPracticeDayBtn.removeEventListener('click', addPracticeDayBtnHandler);
        }

        const addPracticeForm = document.getElementById('add-practice-form');
        if (addPracticeForm && addPracticeFormHandler) {
            addPracticeForm.removeEventListener('submit', addPracticeFormHandler);
        }

        const deleteEventBtn = document.getElementById('delete-event-btn');
        if (deleteEventBtn && deleteEventBtnHandler) {
            deleteEventBtn.removeEventListener('click', deleteEventBtnHandler);
        }
    }

    // 新しいハンドラーを作成
    prevMonthHandler = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    };

    nextMonthHandler = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    };

    addPracticeDayBtnHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openAddPracticeModal();
    };

    addPracticeFormHandler = (e) => {
        e.preventDefault();
        addPracticeDay();
    };

    deleteEventBtnHandler = () => {
        deleteEvent();
    };

    // イベントリスナーを登録
    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', prevMonthHandler);
    }

    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', nextMonthHandler);
    }

    const addPracticeDayBtn = document.getElementById('add-practice-day');
    if (addPracticeDayBtn) {
        addPracticeDayBtn.addEventListener('click', addPracticeDayBtnHandler);
    }

    const addPracticeForm = document.getElementById('add-practice-form');
    if (addPracticeForm) {
        addPracticeForm.addEventListener('submit', addPracticeFormHandler);
    }

    setupModalClose('add-practice-modal', 'cancel-add-practice');
    
    // 予定詳細モーダルのイベントリスナー
    setupModalClose('event-detail-modal', 'cancel-event-detail');
    
    const deleteEventBtn = document.getElementById('delete-event-btn');
    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', deleteEventBtnHandler);
    }

    eventListenersSetup = true;
}

/**
 * Render calendar
 */
export function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 月と年の表示を更新
    document.getElementById('current-month-year').textContent = 
        `${year}年 ${month + 1}月`;

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

    // 前月の残り（空のセル）
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendar.appendChild(emptyCell);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.style.cursor = 'pointer';
        dayCell.style.transition = 'background-color 0.2s ease';
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 日付セルのクリックイベント（練習日追加モーダルを開く）
        dayCell.addEventListener('click', (e) => {
            // イベントアイテムのクリックは無視
            if (e.target.closest('.event-item')) {
                return;
            }
            openAddPracticeModal(dateStr);
        });
        
        // ホバー効果
        dayCell.addEventListener('mouseenter', () => {
            dayCell.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
        });
        dayCell.addEventListener('mouseleave', () => {
            dayCell.style.backgroundColor = '';
        });
        
        // 日付表示
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        
        // 今日の日付をハイライト
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayNumber.style.color = 'var(--primary)';
            dayNumber.style.background = 'rgba(99, 102, 241, 0.1)';
            dayNumber.style.width = '24px';
            dayNumber.style.height = '24px';
            dayNumber.style.display = 'flex';
            dayNumber.style.alignItems = 'center';
            dayNumber.style.justifyContent = 'center';
            dayNumber.style.borderRadius = '50%';
        }
        
        dayCell.appendChild(dayNumber);

        // イベント表示
        const events = getEventsForDate(dateStr);
        if (events.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            eventsContainer.style.display = 'flex';
            eventsContainer.style.flexDirection = 'column';
            eventsContainer.style.gap = '2px';
            
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = `event-item event-${event.type}`;
                eventItem.style.fontSize = '0.7rem';
                eventItem.style.padding = '2px 4px';
                eventItem.style.borderRadius = '2px';
                eventItem.style.whiteSpace = 'nowrap';
                eventItem.style.overflow = 'hidden';
                eventItem.style.textOverflow = 'ellipsis';
                eventItem.style.cursor = 'pointer';
                
                let bgColor, textColor;
                if (event.type === 'practice') {
                    bgColor = 'rgba(16, 185, 129, 0.1)';
                    textColor = '#059669';
                } else if (event.type === 'repair') {
                    bgColor = 'rgba(239, 68, 68, 0.1)';
                    textColor = '#dc2626';
                } else {
                    bgColor = 'rgba(99, 102, 241, 0.1)';
                    textColor = '#4f46e5';
                }
                
                eventItem.style.background = bgColor;
                eventItem.style.color = textColor;
                eventItem.style.borderLeft = `2px solid ${textColor}`;
                
                eventItem.textContent = event.label;
                
                // イベントアイテムのクリックイベント（詳細モーダルを開く）
                eventItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventDetailModal(event, dateStr);
                });
                
                // ホバー効果
                eventItem.addEventListener('mouseenter', () => {
                    eventItem.style.opacity = '0.8';
                });
                eventItem.addEventListener('mouseleave', () => {
                    eventItem.style.opacity = '1';
                });
                
                eventsContainer.appendChild(eventItem);
            });
            
            dayCell.appendChild(eventsContainer);
        }

        calendar.appendChild(dayCell);
    }

    container.appendChild(calendar);
    lucide.createIcons();
}

/**
 * Get events for a specific date
 */
function getEventsForDate(dateStr) {
    const events = [];

    // 練習日
    const practiceDays = practiceDayStorage.getAll();
    practiceDays.forEach(day => {
        if (day.date === dateStr) {
            events.push({ 
                type: 'practice', 
                label: '練習',
                id: day.id,
                data: day
            });
        }
    });

    // 修理履歴
    const repairs = repairStorage.getAll();
    repairs.forEach(repair => {
        if (repair.date === dateStr) {
            const drone = droneStorage.getById(repair.droneId);
            const droneName = drone ? drone.name : '不明';
            const part = repair.partId ? partStorage.getById(repair.partId) : null;
            const partName = part ? part.name : '';
            const label = partName ? `${droneName} - ${partName} 修理` : `${droneName} 修理`;
            events.push({ 
                type: 'repair', 
                label,
                id: repair.id,
                data: repair
            });
        }
    });

    // パーツ交換履歴
    const parts = partStorage.getAll();
    parts.forEach(part => {
        if (part.replacementHistory) {
            part.replacementHistory.forEach((replacement, index) => {
                if (replacement.date === dateStr) {
                    const drone = droneStorage.getById(part.droneId);
                    const droneName = drone ? drone.name : '不明';
                    events.push({ 
                        type: 'replacement', 
                        label: `${droneName} - ${part.name} 交換`,
                        id: part.id,
                        replacementIndex: index,
                        data: { part, replacement }
                    });
                }
            });
        }
    });

    return events;
}

/**
 * Open add practice modal
 * @param {string} dateStr - Optional date string in YYYY-MM-DD format to pre-fill
 */
function openAddPracticeModal(dateStr = null) {
    try {
        const form = document.getElementById('add-practice-form');
        const modal = document.getElementById('add-practice-modal');
        const dateInput = document.getElementById('practice-date');
        
        if (!form || !modal) {
            console.error('Practice modal elements not found');
            return;
        }
        
        form.reset();
        
        // 日付が指定されている場合は自動設定
        if (dateStr && dateInput) {
            dateInput.value = dateStr;
        }
        
        modal.style.display = 'flex';
        
        // アイコンを再レンダリング
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error('Error opening practice modal:', error);
    }
}

/**
 * Add practice day
 */
function addPracticeDay() {
    const dateInput = document.getElementById('practice-date');
    const noteInput = document.getElementById('practice-note');
    
    if (!dateInput) {
        alert('練習日入力フィールドが見つかりません');
        return;
    }
    
    const date = dateInput.value;
    const note = noteInput ? noteInput.value.trim() : '';

    if (!date) {
        alert('練習日を選択してください');
        return;
    }

    // 同じ日付の練習日が既に存在するかチェック
    const existingPracticeDays = practiceDayStorage.getAll();
    if (existingPracticeDays.some(day => day.date === date)) {
        alert('この日付には既に練習日が登録されています');
        return;
    }

    const practiceDay = {
        date,
        note: note || null
    };
    
    practiceDayStorage.add(practiceDay);
    closeModal('add-practice-modal');
    renderCalendar();
    updateStats();
}

/**
 * Setup modal close handlers
 */
function setupModalClose(modalId, cancelButtonId = null) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found`);
        return;
    }
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal(modalId);
        });
    } else {
        console.warn(`Close button not found in modal ${modalId}`);
    }
    
    if (cancelButtonId) {
        const cancelBtn = document.getElementById(cancelButtonId);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal(modalId);
            });
        }
    }

    // モーダルの背景をクリックした時に閉じる
    modal.addEventListener('click', (e) => {
        // モーダルコンテンツ内のクリックは無視
        if (e.target.closest('.modal-content')) {
            return;
        }
        
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Open event detail modal
 */
let currentEventData = null;

function openEventDetailModal(event, dateStr) {
    currentEventData = { ...event, date: dateStr };
    const modal = document.getElementById('event-detail-modal');
    const titleEl = document.getElementById('event-detail-title');
    const contentEl = document.getElementById('event-detail-content');
    
    if (!modal || !titleEl || !contentEl) {
        console.error('Event detail modal elements not found');
        return;
    }
    
    let title = '';
    let content = '';
    
    if (event.type === 'practice') {
        title = '練習日の詳細';
        const practiceDay = event.data;
        content = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">日付</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${formatDate(dateStr)}</p>
                </div>
                ${practiceDay.note ? `
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">メモ</label>
                    <p style="font-size: 1rem; color: var(--text-main); white-space: pre-wrap;">${escapeHtml(practiceDay.note)}</p>
                </div>
                ` : ''}
            </div>
        `;
    } else if (event.type === 'repair') {
        title = '修理履歴の詳細';
        const repair = event.data;
        const drone = droneStorage.getById(repair.droneId);
        const droneName = drone ? drone.name : '不明';
        const part = repair.partId ? partStorage.getById(repair.partId) : null;
        const partName = part ? part.name : '';
        
        content = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">日付</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${formatDate(dateStr)}</p>
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">機体</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${escapeHtml(droneName)}</p>
                </div>
                ${partName ? `
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">パーツ</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${escapeHtml(partName)}</p>
                </div>
                ` : ''}
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">内容</label>
                    <p style="font-size: 1rem; color: var(--text-main); white-space: pre-wrap;">${escapeHtml(repair.description || '')}</p>
                </div>
            </div>
        `;
    } else if (event.type === 'replacement') {
        title = 'パーツ交換履歴の詳細';
        const { part, replacement } = event.data;
        const drone = droneStorage.getById(part.droneId);
        const droneName = drone ? drone.name : '不明';
        
        content = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">日付</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${formatDate(dateStr)}</p>
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">機体</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${escapeHtml(droneName)}</p>
                </div>
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">パーツ</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${escapeHtml(part.name)}</p>
                </div>
                ${replacement.note ? `
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">メモ</label>
                    <p style="font-size: 1rem; color: var(--text-main); white-space: pre-wrap;">${escapeHtml(replacement.note)}</p>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    titleEl.textContent = title;
    contentEl.innerHTML = content;
    modal.style.display = 'flex';
    
    // アイコンを再レンダリング
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Delete event
 */
function deleteEvent() {
    if (!currentEventData) return;
    
    const confirmMessage = 'この予定を削除してもよろしいですか？';
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        if (currentEventData.type === 'practice') {
            // 練習日を削除
            practiceDayStorage.remove(currentEventData.id);
        } else if (currentEventData.type === 'repair') {
            // 修理履歴を削除
            repairStorage.remove(currentEventData.id);
        } else if (currentEventData.type === 'replacement') {
            // パーツ交換履歴を削除
            const { part, replacement } = currentEventData.data;
            const replacementHistory = part.replacementHistory || [];
            replacementHistory.splice(currentEventData.replacementIndex, 1);
            partStorage.update(part.id, { replacementHistory });
        }
        
        closeModal('event-detail-modal');
        renderCalendar();
        updateStats();
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('予定の削除に失敗しました');
    }
}

/**
 * Format date string
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


