/**
 * Main application module
 */

import { initDroneManagement, showDroneDetail, getCurrentDroneId } from './drone.js';
import { initCalendar } from './calendar.js';
import { partStorage, repairStorage, droneStorage } from './storage.js';
import { addReplacement } from './parts.js';

/**
 * Initialize application
 */
function init() {
    // ナビゲーション
    setupNavigation();
    
    // 機体管理の初期化
    initDroneManagement();
    
    // カレンダーの初期化
    initCalendar();
    
    // モーダルの設定
    setupModals();
}

/**
 * Setup navigation
 */
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            if (page === 'home') {
                showPage('home-page');
            } else if (page === 'calendar') {
                showPage('calendar-page');
            }
            
            // アクティブ状態を更新
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

/**
 * Show specific page
 */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

/**
 * Setup modals
 */
function setupModals() {
    // パーツ追加モーダル
    document.getElementById('add-part-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addPart();
    });
    document.getElementById('cancel-add-part').addEventListener('click', () => {
        closeModal('add-part-modal');
    });

    // 交換履歴追加モーダル
    document.getElementById('add-replacement-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addReplacement();
    });
    document.getElementById('cancel-add-replacement').addEventListener('click', () => {
        closeModal('add-replacement-modal');
    });

    // 修理履歴追加モーダル
    document.getElementById('add-repair-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addRepair();
    });
    document.getElementById('cancel-add-repair').addEventListener('click', () => {
        closeModal('add-repair-modal');
    });

    // パーツ追加モーダルの開閉
    window.openAddPartModal = function() {
        document.getElementById('add-part-form').reset();
        document.getElementById('add-part-modal').style.display = 'block';
    };

    // 修理履歴追加モーダルの開閉
    window.openAddRepairModal = function() {
        document.getElementById('add-repair-form').reset();
        document.getElementById('add-repair-modal').style.display = 'block';
    };
}

/**
 * Add part
 */
function addPart() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const name = document.getElementById('part-name').value.trim();
    const startDate = document.getElementById('part-start-date').value;

    if (!name || !startDate) {
        alert('必須項目を入力してください');
        return;
    }

    const part = {
        droneId,
        name,
        startDate,
        replacementHistory: []
    };

    partStorage.add(part);
    
    // 機体のparts配列を更新
    const drone = droneStorage.getById(droneId);
    if (drone) {
        const parts = drone.parts || [];
        parts.push(part.id);
        droneStorage.update(droneId, { parts });
    }

    closeModal('add-part-modal');
    
    // 機体詳細を再表示
    showDroneDetail(droneId);
}

/**
 * Add repair
 */
function addRepair() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const date = document.getElementById('repair-date').value;
    const description = document.getElementById('repair-description').value.trim();

    if (!date || !description) {
        alert('必須項目を入力してください');
        return;
    }

    const repair = {
        droneId,
        partId: null, // 機体全体の修理
        date,
        description
    };

    repairStorage.add(repair);
    closeModal('add-repair-modal');
    
    // 機体詳細を再表示
    showDroneDetail(droneId);
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// グローバルに公開
window.showPage = showPage;
window.closeModal = closeModal;
window.showDroneDetail = showDroneDetail;

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', init);

