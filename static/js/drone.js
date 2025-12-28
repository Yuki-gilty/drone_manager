/**
 * Drone management module
 */

import { droneStorage, droneTypeStorage, partStorage, repairStorage } from './storage.js';

let currentDroneId = null;
let selectedTypeFilter = '';

/**
 * Initialize drone management
 */
export function initDroneManagement() {
    loadDroneList();
    loadTypeFilter();
    setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // 機体追加ボタン
    document.getElementById('add-drone-btn').addEventListener('click', () => {
        openAddDroneModal();
    });

    // 種類管理ボタン
    document.getElementById('manage-types-btn').addEventListener('click', () => {
        openManageTypesModal();
    });

    // 種類フィルター
    document.getElementById('type-filter').addEventListener('change', (e) => {
        selectedTypeFilter = e.target.value;
        loadDroneList();
    });

    // 機体追加フォーム
    document.getElementById('add-drone-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addDrone();
    });

    // 種類追加フォーム
    document.getElementById('add-type-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addDroneType();
    });

    // 戻るボタン
    document.getElementById('back-to-list').addEventListener('click', () => {
        showHomePage();
    });

    // モーダルクローズ
    setupModalClose('add-drone-modal', 'cancel-add-drone');
    setupModalClose('manage-types-modal');

    // 写真プレビュー
    document.getElementById('drone-photo').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${event.target.result}" alt="プレビュー">`;
            };
            reader.readAsDataURL(file);
        } else {
            document.getElementById('photo-preview').innerHTML = '';
        }
    });
}

/**
 * Load drone list
 */
function loadDroneList() {
    const drones = droneStorage.getAll();
    const filteredDrones = selectedTypeFilter 
        ? drones.filter(drone => drone.type === selectedTypeFilter)
        : drones;

    const droneList = document.getElementById('drone-list');
    droneList.innerHTML = '';

    if (filteredDrones.length === 0) {
        droneList.innerHTML = '<p class="empty-message">機体が登録されていません</p>';
        return;
    }

    filteredDrones.forEach(drone => {
        const card = createDroneCard(drone);
        droneList.appendChild(card);
    });
}

/**
 * Create drone card element
 */
function createDroneCard(drone) {
    const card = document.createElement('div');
    card.className = 'drone-card';
    card.addEventListener('click', () => showDroneDetail(drone.id));

    const photo = drone.photo 
        ? `<img src="${drone.photo}" alt="${drone.name}" class="drone-photo">`
        : '<div class="drone-photo-placeholder">写真なし</div>';

    const type = droneTypeStorage.getById(drone.type);
    const typeName = type ? type.name : '不明';

    card.innerHTML = `
        ${photo}
        <div class="drone-card-info">
            <h3>${escapeHtml(drone.name)}</h3>
            <p class="drone-type">${escapeHtml(typeName)}</p>
            <p class="drone-date">使用開始: ${formatDate(drone.startDate)}</p>
        </div>
    `;

    return card;
}

/**
 * Load type filter dropdown
 */
function loadTypeFilter() {
    const types = droneTypeStorage.getAll();
    const filterSelect = document.getElementById('type-filter');
    const addDroneSelect = document.getElementById('drone-type');

    // フィルター用
    filterSelect.innerHTML = '<option value="">すべての種類</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        filterSelect.appendChild(option);
    });

    // 追加フォーム用
    addDroneSelect.innerHTML = '<option value="">選択してください</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        addDroneSelect.appendChild(option);
    });
}

/**
 * Open add drone modal
 */
function openAddDroneModal() {
    loadTypeFilter();
    document.getElementById('add-drone-form').reset();
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('add-drone-modal').style.display = 'block';
}

/**
 * Add new drone
 */
async function addDrone() {
    const name = document.getElementById('drone-name').value.trim();
    const type = document.getElementById('drone-type').value;
    const startDate = document.getElementById('drone-start-date').value;
    const photoFile = document.getElementById('drone-photo').files[0];

    if (!name || !type || !startDate) {
        alert('必須項目を入力してください');
        return;
    }

    let photoBase64 = '';
    if (photoFile) {
        try {
            photoBase64 = await compressAndConvertToBase64(photoFile);
        } catch (error) {
            alert('写真の処理中にエラーが発生しました。別の写真を選択してください。');
            console.error('Photo compression error:', error);
            return;
        }
    }

    const drone = {
        name,
        type,
        startDate,
        photo: photoBase64,
        parts: []
    };

    droneStorage.add(drone);
    closeModal('add-drone-modal');
    loadDroneList();
}

/**
 * Compress and convert image file to base64
 */
function compressAndConvertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 最大サイズを設定（800x800px）
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                // アスペクト比を維持しながらリサイズ
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = (width * MAX_HEIGHT) / height;
                        height = MAX_HEIGHT;
                    }
                }

                // Canvasでリサイズと圧縮
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG品質を0.7に設定して圧縮
                let compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // サイズチェック（約500KB以下を目安）
                const sizeInMB = (compressedBase64.length * 3) / 4 / 1024 / 1024;
                if (sizeInMB > 0.5) {
                    // さらに圧縮を試みる（品質0.5）
                    compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                }
                
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Show drone detail page
 */
export function showDroneDetail(droneId) {
    currentDroneId = droneId;
    const drone = droneStorage.getById(droneId);
    if (!drone) return;

    const type = droneTypeStorage.getById(drone.type);
    const typeName = type ? type.name : '不明';
    const parts = partStorage.getByDroneId(droneId);
    const repairs = repairStorage.getByDroneId(droneId);

    const detailContent = document.getElementById('drone-detail-content');
    detailContent.innerHTML = `
        <div class="drone-detail-header">
            ${drone.photo ? `<img src="${drone.photo}" alt="${drone.name}" class="drone-detail-photo">` : '<div class="drone-detail-photo-placeholder">写真なし</div>'}
            <div class="drone-detail-info">
                <h2>${escapeHtml(drone.name)}</h2>
                <p><strong>種類:</strong> ${escapeHtml(typeName)}</p>
                <p><strong>使用開始日:</strong> ${formatDate(drone.startDate)}</p>
                <div style="margin-top: 1rem;">
                    <button id="delete-drone-btn" class="btn btn-danger">機体を削除</button>
                </div>
            </div>
        </div>

        <div class="drone-detail-section">
            <div class="section-header">
                <h3>使用中のパーツ</h3>
                <button id="add-part-btn" class="btn btn-primary">パーツを追加</button>
            </div>
            <div id="parts-list" class="parts-list">
                ${parts.length === 0 ? '<p class="empty-message">パーツが登録されていません</p>' : ''}
                ${parts.map(part => `
                    <div class="part-item" data-part-id="${part.id}">
                        <div class="part-item-info">
                            <h4>${escapeHtml(part.name)}</h4>
                            <p>使用開始: ${formatDate(part.startDate)}</p>
                        </div>
                        <button class="btn btn-secondary view-part-btn" data-part-id="${part.id}">詳細</button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="drone-detail-section">
            <div class="section-header">
                <h3>修理履歴</h3>
                <button id="add-repair-btn" class="btn btn-primary">修理履歴を追加</button>
            </div>
            <div id="repairs-list" class="repairs-list">
                ${repairs.length === 0 ? '<p class="empty-message">修理履歴がありません</p>' : ''}
                ${repairs.map(repair => {
                    const part = repair.partId ? partStorage.getById(repair.partId) : null;
                    return `
                        <div class="repair-item">
                            <div class="repair-date">${formatDate(repair.date)}</div>
                            <div class="repair-content">
                                <p>${escapeHtml(repair.description)}</p>
                                ${part ? `<p class="repair-part">対象パーツ: ${escapeHtml(part.name)}</p>` : '<p class="repair-part">対象: 機体全体</p>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // イベントリスナーを設定
    document.getElementById('add-part-btn').addEventListener('click', () => {
        openAddPartModal();
    });

    document.getElementById('add-repair-btn').addEventListener('click', () => {
        openAddRepairModal();
    });

    document.getElementById('delete-drone-btn').addEventListener('click', () => {
        deleteDrone(droneId);
    });

    // 現在の機体IDを保存
    document.getElementById('current-drone-id').value = droneId;

    document.querySelectorAll('.view-part-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partId = e.target.dataset.partId;
            import('./parts.js').then(module => {
                module.showPartDetail(partId);
            });
        });
    });

    if (window.showPage) {
        window.showPage('drone-detail-page');
    }
}

/**
 * Open add part modal
 */
function openAddPartModal() {
    if (window.openAddPartModal) {
        window.openAddPartModal();
    }
}

/**
 * Open add repair modal
 */
function openAddRepairModal() {
    if (window.openAddRepairModal) {
        window.openAddRepairModal();
    }
}

/**
 * Show home page
 */
function showHomePage() {
    if (window.showPage) {
        window.showPage('home-page');
    }
    loadDroneList();
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
    if (window.closeModal) {
        window.closeModal(modalId);
    }
}

/**
 * Open manage types modal
 */
function openManageTypesModal() {
    loadTypesList();
    document.getElementById('add-type-form').reset();
    document.getElementById('manage-types-modal').style.display = 'block';
}

/**
 * Load types list
 */
function loadTypesList() {
    const types = droneTypeStorage.getAll();
    const typesList = document.getElementById('types-list');
    
    typesList.innerHTML = '';
    
    if (types.length === 0) {
        typesList.innerHTML = '<p class="empty-message">種類が登録されていません</p>';
        return;
    }

    types.forEach(type => {
        const item = document.createElement('div');
        item.className = 'type-item';
        item.innerHTML = `
            <span class="type-name">${escapeHtml(type.name)}</span>
            <button class="btn btn-danger btn-small delete-type-btn" data-type-id="${type.id}">削除</button>
        `;
        
        item.querySelector('.delete-type-btn').addEventListener('click', () => {
            if (confirm(`「${type.name}」を削除しますか？`)) {
                deleteDroneType(type.id);
            }
        });
        
        typesList.appendChild(item);
    });
}

/**
 * Add drone type
 */
function addDroneType() {
    const name = document.getElementById('new-type-name').value.trim();
    if (!name) {
        alert('種類名を入力してください');
        return;
    }

    droneTypeStorage.add({ name });
    document.getElementById('new-type-name').value = '';
    loadTypesList();
    loadTypeFilter();
}

/**
 * Delete drone type
 */
function deleteDroneType(typeId) {
    // 使用中の機体があるかチェック
    const drones = droneStorage.getAll();
    const inUse = drones.some(drone => drone.type === typeId);
    
    if (inUse) {
        alert('この種類を使用している機体があるため削除できません');
        return;
    }

    droneTypeStorage.remove(typeId);
    loadTypesList();
    loadTypeFilter();
}

/**
 * Delete drone
 */
function deleteDrone(droneId) {
    const drone = droneStorage.getById(droneId);
    if (!drone) return;

    if (!confirm(`「${drone.name}」を削除しますか？\n\n関連するパーツと修理履歴もすべて削除されます。`)) {
        return;
    }

    // 関連するパーツを削除
    const parts = partStorage.getByDroneId(droneId);
    parts.forEach(part => {
        // パーツに関連する修理履歴を削除
        const partRepairs = repairStorage.getByPartId(part.id);
        partRepairs.forEach(repair => {
            repairStorage.remove(repair.id);
        });
        partStorage.remove(part.id);
    });

    // 機体に関連する修理履歴を削除
    const repairs = repairStorage.getByDroneId(droneId);
    repairs.forEach(repair => {
        repairStorage.remove(repair.id);
    });

    // 機体を削除
    droneStorage.remove(droneId);

    // 一覧ページに戻る
    showHomePage();
}

/**
 * Get current drone ID
 */
export function getCurrentDroneId() {
    return currentDroneId;
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

