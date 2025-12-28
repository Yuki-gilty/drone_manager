/**
 * Main application module
 */

import { initDroneManagement, showDroneDetail, getCurrentDroneId } from './drone.js';
import { initCalendar } from './calendar.js';
import { partStorage, repairStorage, droneStorage, droneTypeStorage, manufacturerStorage } from './storage.js';
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

    // カスタムパーツ名入力の切り替え
    const useCustomPartNameLink = document.getElementById('use-custom-part-name');
    if (useCustomPartNameLink) {
        useCustomPartNameLink.addEventListener('click', (e) => {
            e.preventDefault();
            const select = document.getElementById('part-name');
            const customInput = document.getElementById('part-name-custom');
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.required = true;
            select.required = false;
            useCustomPartNameLink.style.display = 'none';
        });
    }

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
        loadPartNameOptions();
        document.getElementById('part-name-custom').style.display = 'none';
        document.getElementById('add-part-modal').style.display = 'block';
    };

    // 修理履歴追加モーダルの開閉
    window.openAddRepairModal = function() {
        document.getElementById('add-repair-form').reset();
        document.getElementById('add-repair-modal').style.display = 'block';
    };
}

/**
 * Load part name options from drone type default parts
 */
function loadPartNameOptions() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const drone = droneStorage.getById(droneId);
    if (!drone) return;

    const droneType = droneTypeStorage.getById(drone.type);
    if (!droneType) return;

    // 既に追加されているパーツ名を取得
    const existingParts = partStorage.getByDroneId(droneId);
    const existingPartNames = existingParts.map(part => part.name);

    // 種類のデフォルトパーツを取得（互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameを使用）
    const defaultParts = droneType.defaultParts || [];
    const defaultPartNames = defaultParts.map(part => typeof part === 'string' ? part : part.name);
    
    // 既に追加されているパーツを除外
    const availableParts = defaultPartNames.filter(partName => !existingPartNames.includes(partName));

    const select = document.getElementById('part-name');
    select.innerHTML = '<option value="">選択してください</option>';
    
    availableParts.forEach(partName => {
        const option = document.createElement('option');
        option.value = partName;
        option.textContent = partName;
        select.appendChild(option);
    });

    // パーツが利用可能な場合、selectを表示、そうでなければカスタム入力を表示
    if (availableParts.length === 0) {
        select.style.display = 'none';
        const customInput = document.getElementById('part-name-custom');
        customInput.style.display = 'block';
        customInput.required = true;
        select.required = false;
        document.getElementById('use-custom-part-name').style.display = 'none';
    } else {
        select.style.display = 'block';
        const customInput = document.getElementById('part-name-custom');
        customInput.style.display = 'none';
        customInput.required = false;
        select.required = true;
        document.getElementById('use-custom-part-name').style.display = 'block';
    }

    // メーカー選択肢を読み込む
    loadManufacturerOptions();
}

/**
 * Load manufacturer options
 */
function loadManufacturerOptions() {
    const manufacturers = manufacturerStorage.getAll();
    const select = document.getElementById('part-manufacturer');
    
    select.innerHTML = '<option value="">選択してください（任意）</option>';
    
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer.id;
        option.textContent = manufacturer.name;
        select.appendChild(option);
    });
}

/**
 * Add part
 */
function addPart() {
    const droneId = getCurrentDroneId();
    if (!droneId) return;

    const select = document.getElementById('part-name');
    const customInput = document.getElementById('part-name-custom');
    const manufacturerSelect = document.getElementById('part-manufacturer');
    const startDate = document.getElementById('part-start-date').value;

    // パーツ名を取得（selectまたはカスタム入力から）
    let name = '';
    const selectDisplay = window.getComputedStyle(select).display;
    const customInputDisplay = window.getComputedStyle(customInput).display;
    
    if (selectDisplay !== 'none' && select.value) {
        name = select.value.trim();
    } else if (customInputDisplay !== 'none' && customInput.value) {
        name = customInput.value.trim();
    }

    if (!name || !startDate) {
        alert('必須項目を入力してください');
        return;
    }

    // 既に同じ名前のパーツが存在するかチェック
    const existingParts = partStorage.getByDroneId(droneId);
    if (existingParts.some(part => part.name === name)) {
        alert('このパーツは既に追加されています');
        return;
    }

    const part = {
        droneId,
        name,
        startDate,
        replacementHistory: [],
        manufacturerId: manufacturerSelect.value || null
    };

    const newPart = partStorage.add(part);
    
    // 機体のparts配列を更新
    const drone = droneStorage.getById(droneId);
    if (drone) {
        const parts = drone.parts || [];
        parts.push(newPart.id);
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

