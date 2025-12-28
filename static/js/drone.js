/**
 * Drone management module
 */

import { droneStorage, droneTypeStorage, partStorage, repairStorage, manufacturerStorage } from './storage.js';

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

    // メーカー管理ボタン（存在する場合のみ）
    const manageManufacturersBtn = document.getElementById('manage-manufacturers-btn');
    if (manageManufacturersBtn) {
        manageManufacturersBtn.addEventListener('click', () => {
            openManageManufacturersModal();
        });
    }

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

    // メーカー追加フォーム
    const addManufacturerForm = document.getElementById('add-manufacturer-form');
    if (addManufacturerForm) {
        addManufacturerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addManufacturer();
            return false;
        });
    }

    // 戻るボタン
    document.getElementById('back-to-list').addEventListener('click', () => {
        showHomePage();
    });

    // モーダルクローズ
    setupModalClose('add-drone-modal', 'cancel-add-drone');
    setupModalClose('manage-types-modal');
    setupModalClose('manage-manufacturers-modal');

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

    const newDrone = droneStorage.add(drone);
    
    // 種類のデフォルトパーツを追加
    const droneType = droneTypeStorage.getById(type);
    if (droneType && droneType.defaultParts && droneType.defaultParts.length > 0) {
        const parts = newDrone.parts || [];
        droneType.defaultParts.forEach(partData => {
            // 互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameとmanufacturerIdを使用
            const partName = typeof partData === 'string' ? partData : partData.name;
            const manufacturerId = typeof partData === 'string' ? null : (partData.manufacturerId || null);
            const part = {
                droneId: newDrone.id,
                name: partName,
                startDate: startDate, // 機体の使用開始日と同じにする
                replacementHistory: [],
                manufacturerId: manufacturerId
            };
            const newPart = partStorage.add(part);
            parts.push(newPart.id);
        });
        droneStorage.update(newDrone.id, { parts });
    }
    
    closeModal('add-drone-modal');
    
    // ホーム画面を表示してから一覧を更新
    showHomePage();
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
    
    // パーツにメーカー情報を追加
    const partsWithManufacturer = parts.map(part => {
        const manufacturer = part.manufacturerId ? manufacturerStorage.getById(part.manufacturerId) : null;
        return {
            ...part,
            manufacturerName: manufacturer ? manufacturer.name : null
        };
    });

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
                ${partsWithManufacturer.length === 0 ? '<p class="empty-message">パーツが登録されていません</p>' : ''}
                ${partsWithManufacturer.map(part => `
                    <div class="part-item" data-part-id="${part.id}">
                        <div class="part-item-info">
                            <h4>${escapeHtml(part.name)}</h4>
                            <p>${part.manufacturerName ? `<strong>メーカー:</strong> ${escapeHtml(part.manufacturerName)}<br>` : ''}使用開始: ${formatDate(part.startDate)}</p>
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
        // メーカー管理モーダルの場合は、種類管理モーダルを閉じないようにする
        if (modalId === 'manage-manufacturers-modal') {
            // メーカー管理モーダルが開いている場合、種類管理モーダルは閉じない
            if (e.target === modal) {
                closeModal(modalId);
            }
        } else {
            if (e.target === modal) {
                closeModal(modalId);
            }
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
        const defaultParts = type.defaultParts || [];
        const item = document.createElement('div');
        item.className = 'type-item-expandable';
        item.dataset.typeId = type.id;
        
        const isExpanded = item.dataset.expanded === 'true';
        
        item.innerHTML = `
            <div class="type-item-header">
                <span class="type-name">${escapeHtml(type.name)}</span>
                <div class="type-item-actions">
                    <button class="btn btn-secondary btn-small toggle-parts-btn" data-type-id="${type.id}">
                        ${isExpanded ? 'パーツを閉じる' : 'パーツを管理'}
                    </button>
                    <button class="btn btn-danger btn-small delete-type-btn" data-type-id="${type.id}">削除</button>
                </div>
            </div>
            <div class="type-parts-section" style="display: ${isExpanded ? 'block' : 'none'};">
                <div class="type-parts-list">
                    ${defaultParts.length === 0 
                        ? '<p class="empty-message" style="padding: 1rem; margin: 0;">パーツが登録されていません</p>'
                        : defaultParts.map((part, index) => {
                            // 互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameを使用
                            const partName = typeof part === 'string' ? part : part.name;
                            const partObj = typeof part === 'string' ? { name: part, manufacturerId: null } : part;
                            const manufacturer = partObj.manufacturerId ? manufacturerStorage.getById(partObj.manufacturerId) : null;
                            const manufacturerName = manufacturer ? manufacturer.name : '';
                            return `
                                <div class="type-part-item">
                                    <div>
                                        <span>${escapeHtml(partName)}</span>
                                        ${manufacturerName ? `<span style="color: #7f8c8d; font-size: 0.875rem; margin-left: 0.5rem;">(${escapeHtml(manufacturerName)})</span>` : ''}
                                    </div>
                                    <button class="btn btn-danger btn-small delete-type-part-btn" data-type-id="${type.id}" data-part-index="${index}">削除</button>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
                <form class="add-type-part-form" data-type-id="${type.id}">
                    <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                        <div style="flex: 1;">
                            <input type="text" class="type-part-name-input" placeholder="パーツ名を入力" required>
                        </div>
                        <div style="flex: 1;">
                            <select class="type-part-manufacturer-select" data-type-id="${type.id}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;">
                                <option value="">メーカー（任意）</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-small">パーツを追加</button>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem;">
                        <a href="#" class="manage-manufacturers-link" style="color: #3498db; text-decoration: underline; cursor: pointer;">メーカーを管理</a>
                    </div>
                </form>
            </div>
        `;
        
        // イベントリスナーを設定
        item.querySelector('.toggle-parts-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTypeParts(type.id);
        });
        
        item.querySelector('.delete-type-btn').addEventListener('click', () => {
            if (confirm(`「${type.name}」を削除しますか？`)) {
                deleteDroneType(type.id);
            }
        });
        
        const addPartForm = item.querySelector('.add-type-part-form');
        addPartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addTypePart(type.id);
        });
        
        // メーカー選択肢を読み込む
        const manufacturerSelect = item.querySelector('.type-part-manufacturer-select');
        loadManufacturerOptionsForType(manufacturerSelect);
        
        // メーカー管理リンクのイベントリスナー
        const manageManufacturersLink = item.querySelector('.manage-manufacturers-link');
        if (manageManufacturersLink) {
            manageManufacturersLink.addEventListener('click', (e) => {
                e.preventDefault();
                openManageManufacturersModal();
            });
        }
        
        item.querySelectorAll('.delete-type-part-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partIndex = parseInt(e.target.dataset.partIndex);
                deleteTypePart(type.id, partIndex);
            });
        });
        
        typesList.appendChild(item);
    });
}

/**
 * Load manufacturer options for type part form
 */
function loadManufacturerOptionsForType(selectElement) {
    const manufacturers = manufacturerStorage.getAll();
    selectElement.innerHTML = '<option value="">メーカー（任意）</option>';
    
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer.id;
        option.textContent = manufacturer.name;
        selectElement.appendChild(option);
    });
}

/**
 * Toggle type parts section
 */
function toggleTypeParts(typeId) {
    const typeItem = document.querySelector(`.type-item-expandable[data-type-id="${typeId}"]`);
    if (!typeItem) return;
    
    const partsSection = typeItem.querySelector('.type-parts-section');
    const toggleBtn = typeItem.querySelector('.toggle-parts-btn');
    const isExpanded = partsSection.style.display !== 'none';
    
    partsSection.style.display = isExpanded ? 'none' : 'block';
    toggleBtn.textContent = isExpanded ? 'パーツを管理' : 'パーツを閉じる';
    typeItem.dataset.expanded = (!isExpanded).toString();
}

/**
 * Add part to type
 */
function addTypePart(typeId) {
    const typeItem = document.querySelector(`.type-item-expandable[data-type-id="${typeId}"]`);
    if (!typeItem) return;
    
    const input = typeItem.querySelector('.type-part-name-input');
    const manufacturerSelect = typeItem.querySelector('.type-part-manufacturer-select');
    const partName = input.value.trim();
    const manufacturerId = manufacturerSelect.value || null;
    
    if (!partName) {
        alert('パーツ名を入力してください');
        return;
    }
    
    const type = droneTypeStorage.getById(typeId);
    if (!type) return;
    
    // defaultPartsを正規化（文字列の場合はオブジェクトに変換）
    let defaultParts = type.defaultParts || [];
    defaultParts = defaultParts.map(part => {
        if (typeof part === 'string') {
            return { name: part, manufacturerId: null };
        }
        return part;
    });
    
    // 既に同じ名前のパーツが存在するかチェック
    if (defaultParts.some(part => {
        const name = typeof part === 'string' ? part : part.name;
        return name === partName;
    })) {
        alert('このパーツは既に登録されています');
        return;
    }
    
    defaultParts.push({ name: partName, manufacturerId });
    droneTypeStorage.update(typeId, { defaultParts });
    
    input.value = '';
    manufacturerSelect.value = '';
    loadTypesList();
}

/**
 * Delete part from type
 */
function deleteTypePart(typeId, partIndex) {
    const type = droneTypeStorage.getById(typeId);
    if (!type) return;
    
    const defaultParts = type.defaultParts || [];
    if (partIndex < 0 || partIndex >= defaultParts.length) return;
    
    // 互換性のため、文字列の場合はそのまま、オブジェクトの場合はnameを使用
    const part = defaultParts[partIndex];
    const partName = typeof part === 'string' ? part : part.name;
    
    if (!confirm(`「${partName}」を削除しますか？`)) {
        return;
    }
    
    defaultParts.splice(partIndex, 1);
    droneTypeStorage.update(typeId, { defaultParts });
    
    loadTypesList();
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

/**
 * Open manage manufacturers modal
 */
function openManageManufacturersModal() {
    loadManufacturersList();
    const form = document.getElementById('add-manufacturer-form');
    if (form) {
        form.reset();
    }
    const modal = document.getElementById('manage-manufacturers-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Load manufacturers list
 */
function loadManufacturersList() {
    const manufacturers = manufacturerStorage.getAll();
    const manufacturersList = document.getElementById('manufacturers-list');
    
    manufacturersList.innerHTML = '';
    
    if (manufacturers.length === 0) {
        manufacturersList.innerHTML = '<p class="empty-message">メーカーが登録されていません</p>';
        return;
    }

    manufacturers.forEach(manufacturer => {
        const item = document.createElement('div');
        item.className = 'type-item';
        item.innerHTML = `
            <span class="type-name">${escapeHtml(manufacturer.name)}</span>
            <button class="btn btn-danger btn-small delete-manufacturer-btn" data-manufacturer-id="${manufacturer.id}">削除</button>
        `;
        
        item.querySelector('.delete-manufacturer-btn').addEventListener('click', () => {
            if (confirm(`「${manufacturer.name}」を削除しますか？`)) {
                deleteManufacturer(manufacturer.id);
            }
        });
        
        manufacturersList.appendChild(item);
    });
}

/**
 * Add manufacturer
 */
function addManufacturer() {
    const nameInput = document.getElementById('new-manufacturer-name');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('メーカー名を入力してください');
        return;
    }

    // メーカーを追加
    manufacturerStorage.add({ name });
    
    // 入力フィールドをクリア
    nameInput.value = '';
    
    // メーカーリストを更新
    loadManufacturersList();
    
    // 種類管理画面のメーカー選択プルダウンを更新
    updateAllTypePartManufacturerSelects();
    
    // メーカー管理モーダルを開いたままにする（閉じない）
    // 種類管理モーダルも開いたままにする
}

/**
 * Update all manufacturer selects in type part forms
 */
function updateAllTypePartManufacturerSelects() {
    document.querySelectorAll('.type-part-manufacturer-select').forEach(select => {
        loadManufacturerOptionsForType(select);
    });
}

/**
 * Delete manufacturer
 */
function deleteManufacturer(manufacturerId) {
    // 使用中のパーツがあるかチェック
    const parts = partStorage.getAll();
    const inUse = parts.some(part => part.manufacturerId === manufacturerId);
    
    if (inUse) {
        alert('このメーカーを使用しているパーツがあるため削除できません');
        return;
    }

    manufacturerStorage.remove(manufacturerId);
    loadManufacturersList();
}

