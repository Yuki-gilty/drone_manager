/**
 * Parts management module
 */

import { partStorage, repairStorage, droneStorage } from './storage.js';

let currentPartId = null;

/**
 * Show part detail page
 */
export function showPartDetail(partId) {
    currentPartId = partId;
    const part = partStorage.getById(partId);
    if (!part) return;

    const drone = droneStorage.getById(part.droneId);
    const droneName = drone ? drone.name : '不明';
    const replacements = part.replacementHistory || [];
    const repairs = repairStorage.getByPartId(partId);

    const detailContent = document.getElementById('part-detail-content');
    detailContent.innerHTML = `
        <div class="part-detail-header">
            <div class="part-detail-info">
                <h2>${escapeHtml(part.name)}</h2>
                <p><strong>所属機体:</strong> ${escapeHtml(droneName)}</p>
                <p><strong>使用開始日:</strong> ${formatDate(part.startDate)}</p>
            </div>
        </div>

        <div class="part-detail-section">
            <div class="section-header">
                <h3>交換履歴</h3>
                <button id="add-replacement-btn" class="btn btn-primary">交換履歴を追加</button>
            </div>
            <div id="replacements-list" class="replacements-list">
                ${replacements.length === 0 ? '<p class="empty-message">交換履歴がありません</p>' : ''}
                ${replacements.map((replacement, index) => `
                    <div class="replacement-item">
                        <div class="replacement-date">${formatDate(replacement.date)}</div>
                        <div class="replacement-content">
                            <p>${escapeHtml(replacement.description)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="part-detail-section">
            <div class="section-header">
                <h3>修理履歴</h3>
            </div>
            <div id="part-repairs-list" class="repairs-list">
                ${repairs.length === 0 ? '<p class="empty-message">修理履歴がありません</p>' : ''}
                ${repairs.map(repair => `
                    <div class="repair-item">
                        <div class="repair-date">${formatDate(repair.date)}</div>
                        <div class="repair-content">
                            <p>${escapeHtml(repair.description)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // イベントリスナーを設定
    const addReplacementBtn = document.getElementById('add-replacement-btn');
    if (addReplacementBtn) {
        addReplacementBtn.addEventListener('click', () => {
            openAddReplacementModal();
        });
    }

    // 戻るボタンの設定
    const backBtn = document.getElementById('back-to-drone-detail');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const droneId = document.getElementById('current-drone-id')?.value;
            if (droneId && window.showDroneDetail) {
                window.showDroneDetail(droneId);
            }
        });
    }

    showPage('part-detail-page');
}

/**
 * Open add replacement modal
 */
function openAddReplacementModal() {
    document.getElementById('add-replacement-form').reset();
    document.getElementById('add-replacement-modal').style.display = 'block';
}

/**
 * Add replacement history
 */
function addReplacement() {
    const date = document.getElementById('replacement-date').value;
    const description = document.getElementById('replacement-description').value.trim();

    if (!date || !description) {
        alert('必須項目を入力してください');
        return;
    }

    const part = partStorage.getById(currentPartId);
    if (!part) return;

    const replacementHistory = part.replacementHistory || [];
    replacementHistory.push({
        date,
        description
    });

    partStorage.update(currentPartId, { replacementHistory });
    closeModal('add-replacement-modal');
    showPartDetail(currentPartId);
}

/**
 * Show specific page
 */
function showPage(pageId) {
    if (window.showPage) {
        window.showPage(pageId);
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    if (window.closeModal) {
        window.closeModal(modalId);
    }
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility: Format date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Export functions for use in other modules
export { addReplacement };

