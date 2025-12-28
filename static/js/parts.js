/**
 * Parts management module
 */

import { partStorage, repairStorage, droneStorage, manufacturerStorage } from './storage.js';

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
    const manufacturer = part.manufacturerId ? manufacturerStorage.getById(part.manufacturerId) : null;
    const manufacturerName = manufacturer ? manufacturer.name : '未設定';

    const detailContent = document.getElementById('part-detail-content');
    detailContent.innerHTML = `
        <div class="part-detail-header" style="border-bottom: 1px solid var(--border-base); padding-bottom: 2rem; margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="part-detail-info">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <i data-lucide="component" size="24" class="text-gradient"></i>
                    <h2 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; margin: 0;">${escapeHtml(part.name)}</h2>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted);">
                        <i data-lucide="navigation" size="18"></i>
                        <span style="font-weight: 500;">所属機体: ${escapeHtml(droneName)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted);">
                        <i data-lucide="factory" size="18"></i>
                        <span style="font-weight: 500;">メーカー: ${escapeHtml(manufacturerName)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted);">
                        <i data-lucide="calendar" size="18"></i>
                        <span style="font-weight: 500;">使用開始日: ${formatDate(part.startDate)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="part-detail-section" style="margin-bottom: 3rem;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i data-lucide="refresh-cw" class="text-gradient"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700;">パーツ交換履歴</h3>
                </div>
                <button id="add-replacement-btn" class="btn btn-primary btn-small">
                    <i data-lucide="plus" size="16"></i>
                    交換履歴を追加
                </button>
            </div>
            <div id="replacements-list" style="display: flex; flex-direction: column; gap: 1rem;">
                ${replacements.length === 0 ? `
                    <div class="empty-message" style="background: var(--bg-main); border: 2px dashed var(--border-base); border-radius: var(--radius-md); padding: 2rem; text-align: center;">
                        <p>交換履歴はありません</p>
                    </div>
                ` : ''}
                ${replacements.map((replacement, index) => `
                    <div class="replacement-item" style="background: var(--bg-card); border-left: 4px solid var(--primary); padding: 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; box-shadow: var(--shadow-sm); border-top: 1px solid var(--border-base); border-right: 1px solid var(--border-base); border-bottom: 1px solid var(--border-base);">
                        <div style="font-weight: 700; color: var(--primary); font-size: 0.875rem; margin-bottom: 0.5rem;">${formatDate(replacement.date)}</div>
                        <p style="font-size: 0.9375rem; color: var(--text-main); line-height: 1.6;">${escapeHtml(replacement.description)}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="part-detail-section">
            <div class="section-header" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
                <i data-lucide="wrench" class="text-gradient"></i>
                <h3 style="font-size: 1.25rem; font-weight: 700;">修理履歴</h3>
            </div>
            <div id="part-repairs-list" style="display: flex; flex-direction: column; gap: 1rem;">
                ${repairs.length === 0 ? `
                    <div class="empty-message" style="background: var(--bg-main); border: 2px dashed var(--border-base); border-radius: var(--radius-md); padding: 2rem; text-align: center;">
                        <p>修理履歴はありません</p>
                    </div>
                ` : ''}
                ${repairs.map(repair => `
                    <div class="repair-item" style="background: var(--bg-card); border-left: 4px solid var(--secondary); padding: 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; box-shadow: var(--shadow-sm); border-top: 1px solid var(--border-base); border-right: 1px solid var(--border-base); border-bottom: 1px solid var(--border-base);">
                        <div style="font-weight: 700; color: var(--secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">${formatDate(repair.date)}</div>
                        <p style="font-size: 0.9375rem; color: var(--text-main); line-height: 1.6;">${escapeHtml(repair.description)}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // アイコンをレンダリング
    lucide.createIcons();

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

