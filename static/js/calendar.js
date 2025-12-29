/**
 * Calendar management module
 */

import { practiceDayStorage, repairStorage, partStorage, droneStorage } from './storage.js';
import { updateStats } from './drone.js';

let currentDate = new Date();

/**
 * Initialize calendar
 */
export async function initCalendar() {
    await renderCalendar();
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
window.openAddPracticeModal = openAddPracticeModal;

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
    prevMonthHandler = async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await renderCalendar();
    };

    nextMonthHandler = async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await renderCalendar();
    };

    addPracticeDayBtnHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Add practice day button clicked');
        try {
            openAddPracticeModal();
        } catch (error) {
            console.error('Error opening practice modal:', error);
            alert('練習日追加モーダルを開く際にエラーが発生しました');
        }
    };

    addPracticeFormHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await addPracticeDay();
        return false;
    };

    deleteEventBtnHandler = () => {
        deleteEvent();
    };

    // イベントリスナーを登録
    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', prevMonthHandler);
    } else {
        console.warn('prev-month button not found');
    }

    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', nextMonthHandler);
    } else {
        console.warn('next-month button not found');
    }

    const addPracticeDayBtn = document.getElementById('add-practice-day');
    if (addPracticeDayBtn) {
        // 既存のイベントリスナーを削除（重複防止）
        addPracticeDayBtn.removeEventListener('click', addPracticeDayBtnHandler);
        addPracticeDayBtn.addEventListener('click', addPracticeDayBtnHandler);
        console.log('Add practice day button event listener registered');
        
        // 直接クリックイベントも設定（フォールバック）
        addPracticeDayBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add practice day button clicked (onclick)');
            openAddPracticeModal();
        };
    } else {
        console.error('add-practice-day button not found');
        // 少し待ってから再試行
        setTimeout(() => {
            const retryBtn = document.getElementById('add-practice-day');
            if (retryBtn) {
                retryBtn.addEventListener('click', addPracticeDayBtnHandler);
                retryBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAddPracticeModal();
                };
                console.log('Add practice day button event listener registered (retry)');
            }
        }, 100);
    }

    const addPracticeForm = document.getElementById('add-practice-form');
    if (addPracticeForm) {
        addPracticeForm.addEventListener('submit', addPracticeFormHandler);
    } else {
        console.warn('add-practice-form not found');
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
export async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 月と年の表示を更新
    const monthYearEl = document.getElementById('current-month-year');
    if (monthYearEl) {
        monthYearEl.textContent = `${year}年 ${month + 1}月`;
    }

    // カレンダーコンテナを取得
    const container = document.getElementById('calendar-container');
    if (!container) {
        console.error('Calendar container not found');
        return;
    }
    
    // 既存のカレンダーを取得
    const existingCalendar = container.querySelector('.calendar-grid');
    
    // コンテナにposition: relativeを設定（新しいカレンダーを絶対配置するため）
    if (!container.style.position) {
        container.style.position = 'relative';
    }
    
    // 新しいカレンダーグリッドを作成（既存のものは残したまま）
    const calendar = document.createElement('div');
    calendar.className = 'calendar-grid';
    calendar.style.opacity = '0';
    calendar.style.transition = 'opacity 0.2s ease';
    
    // 既存のカレンダーがある場合、新しいカレンダーを絶対配置で上に重ねる
    if (existingCalendar) {
        calendar.style.position = 'absolute';
        calendar.style.top = '0';
        calendar.style.left = '0';
        calendar.style.width = '100%';
        calendar.style.zIndex = '1';
    }

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

        // イベント表示（非同期で取得）
        const events = await getEventsForDate(dateStr);
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
                eventItem.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await openEventDetailModal(event, dateStr);
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

    // 新しいカレンダーをコンテナに追加（既存のカレンダーの上に重ねる）
    container.appendChild(calendar);
    
    // 少し待ってからフェードイン効果を適用
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            calendar.style.opacity = '1';
        });
    });
    
    // 既存のカレンダーを削除（新しいカレンダーが表示された後）
    if (existingCalendar) {
        setTimeout(() => {
            if (existingCalendar.parentNode) {
                existingCalendar.remove();
            }
            // 既存のカレンダーを削除した後、新しいカレンダーの絶対配置を解除
            if (calendar.parentNode === container) {
                calendar.style.position = '';
                calendar.style.top = '';
                calendar.style.left = '';
                calendar.style.width = '';
                calendar.style.zIndex = '';
            }
        }, 250);
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Get events for a specific date
 */
async function getEventsForDate(dateStr) {
    const events = [];

    // 練習日
    const practiceDays = await practiceDayStorage.getAll();
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
    const repairs = await repairStorage.getAll();
    for (const repair of repairs) {
        if (repair.date === dateStr) {
            const drone = await droneStorage.getById(repair.droneId);
            const droneName = drone ? drone.name : '不明';
            const part = repair.partId ? await partStorage.getById(repair.partId) : null;
            const partName = part ? part.name : '';
            const label = partName ? `${droneName} - ${partName} 修理` : `${droneName} 修理`;
            events.push({ 
                type: 'repair', 
                label,
                id: repair.id,
                data: repair
            });
        }
    }

    // パーツ交換履歴
    const parts = await partStorage.getAll();
    for (const part of parts) {
        if (part.replacementHistory) {
            for (let index = 0; index < part.replacementHistory.length; index++) {
                const replacement = part.replacementHistory[index];
                if (replacement.date === dateStr) {
                    const drone = await droneStorage.getById(part.droneId);
                    const droneName = drone ? drone.name : '不明';
                    events.push({ 
                        type: 'replacement', 
                        label: `${droneName} - ${part.name} 交換`,
                        id: part.id,
                        replacementIndex: index,
                        data: { part, replacement }
                    });
                }
            }
        }
    }

    return events;
}

/**
 * Open add practice modal
 * @param {string} dateStr - Optional date string in YYYY-MM-DD format to pre-fill
 */
function openAddPracticeModal(dateStr = null) {
    try {
        console.log('openAddPracticeModal called with dateStr:', dateStr);
        const form = document.getElementById('add-practice-form');
        const modal = document.getElementById('add-practice-modal');
        const dateInput = document.getElementById('practice-date');
        
        if (!form) {
            console.error('add-practice-form not found');
            alert('フォームが見つかりません');
            return;
        }
        
        if (!modal) {
            console.error('add-practice-modal not found');
            alert('モーダルが見つかりません');
            return;
        }
        
        form.reset();
        
        // 日付が指定されている場合は自動設定
        if (dateStr && dateInput) {
            dateInput.value = dateStr;
        } else if (dateInput) {
            // 日付が指定されていない場合は今日の日付を設定
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }
        
        modal.style.display = 'flex';
        console.log('Modal displayed');
        
        // アイコンを再レンダリング
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error('Error opening practice modal:', error);
        alert('練習日追加モーダルを開く際にエラーが発生しました: ' + error.message);
    }
}

/**
 * Add practice day
 */
async function addPracticeDay() {
    try {
        console.log('addPracticeDay called');
        const dateInput = document.getElementById('practice-date');
        const noteInput = document.getElementById('practice-note');
        
        if (!dateInput) {
            console.error('practice-date input not found');
            alert('練習日入力フィールドが見つかりません');
            return;
        }
        
        const date = dateInput.value;
        const note = noteInput ? noteInput.value.trim() : '';

        if (!date) {
            alert('練習日を選択してください');
            return;
        }

        console.log('Adding practice day:', { date, note });

        // 同じ日付の練習日が既に存在するかチェック
        const existingPracticeDays = await practiceDayStorage.getAll();
        if (existingPracticeDays.some(day => day.date === date)) {
            alert('この日付には既に練習日が登録されています');
            return;
        }

        const practiceDay = {
            date,
            note: note || null
        };
        
        console.log('Sending practice day data:', practiceDay);
        
        try {
            const result = await practiceDayStorage.add(practiceDay);
            console.log('Practice day added successfully:', result);
            
            closeModal('add-practice-modal');
            await renderCalendar();
            if (window.updateStats) {
                await window.updateStats();
            } else {
                await updateStats();
            }
        } catch (storageError) {
            console.error('Storage error:', storageError);
            // ストレージエラーを再スローして、外側のcatchで処理
            throw storageError;
        }
    } catch (error) {
        console.error('Error adding practice day:', error);
        console.error('Error stack:', error.stack);
        
        let errorMessage = '練習日の追加中にエラーが発生しました';
        if (error.message) {
            if (error.message.includes('既に練習日が登録されています')) {
                errorMessage = 'この日付には既に練習日が登録されています';
            } else if (error.message.includes('サーバーエラー')) {
                errorMessage = error.message;
            } else if (error.message.includes('認証')) {
                errorMessage = '認証エラーが発生しました。ログインし直してください。';
            } else {
                errorMessage += ': ' + error.message;
            }
        }
        
        alert(errorMessage);
    }
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

async function openEventDetailModal(event, dateStr) {
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
        const drone = await droneStorage.getById(repair.droneId);
        const droneName = drone ? drone.name : '不明';
        const part = repair.partId ? await partStorage.getById(repair.partId) : null;
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
        const drone = await droneStorage.getById(part.droneId);
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
async function deleteEvent() {
    if (!currentEventData) return;
    
    const confirmMessage = 'この予定を削除してもよろしいですか？';
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        if (currentEventData.type === 'practice') {
            // 練習日を削除
            await practiceDayStorage.remove(currentEventData.id);
        } else if (currentEventData.type === 'repair') {
            // 修理履歴を削除
            await repairStorage.remove(currentEventData.id);
        } else if (currentEventData.type === 'replacement') {
            // パーツ交換履歴を削除
            const { part, replacement } = currentEventData.data;
            const replacementHistory = part.replacementHistory || [];
            replacementHistory.splice(currentEventData.replacementIndex, 1);
            await partStorage.update(part.id, { replacementHistory });
        }
        
        closeModal('event-detail-modal');
        await renderCalendar();
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


