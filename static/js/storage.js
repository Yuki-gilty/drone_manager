/**
 * Local storage management module
 * Uses localStorage to store all data as JSON
 */

const STORAGE_KEYS = {
    DRONES: 'drones',
    PARTS: 'parts',
    REPAIRS: 'repairs',
    DRONE_TYPES: 'drone_types',
    PRACTICE_DAYS: 'practice_days'
};

/**
 * Initialize default data if storage is empty
 */
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.DRONE_TYPES)) {
        // デフォルトの機体の種類を追加
        const defaultTypes = [
            { id: generateId(), name: '5inch', createdAt: new Date().toISOString() },
            { id: generateId(), name: 'Whoop', createdAt: new Date().toISOString() },
            { id: generateId(), name: 'FPV Wing', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem(STORAGE_KEYS.DRONE_TYPES, JSON.stringify(defaultTypes));
    }
}

/**
 * Generate a unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get all items of a type
 */
function getAll(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

/**
 * Save all items of a type
 */
function saveAll(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
}

/**
 * Get a single item by ID
 */
function getById(key, id) {
    const items = getAll(key);
    return items.find(item => item.id === id) || null;
}

/**
 * Add a new item
 */
function add(key, item) {
    const items = getAll(key);
    const newItem = {
        ...item,
        id: item.id || generateId(),
        createdAt: item.createdAt || new Date().toISOString()
    };
    items.push(newItem);
    saveAll(key, items);
    return newItem;
}

/**
 * Update an existing item
 */
function update(key, id, updates) {
    const items = getAll(key);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updates };
    saveAll(key, items);
    return items[index];
}

/**
 * Delete an item
 */
function remove(key, id) {
    const items = getAll(key);
    const filtered = items.filter(item => item.id !== id);
    saveAll(key, filtered);
    return filtered.length < items.length;
}

// Drone operations
export const droneStorage = {
    getAll: () => getAll(STORAGE_KEYS.DRONES),
    getById: (id) => getById(STORAGE_KEYS.DRONES, id),
    add: (drone) => add(STORAGE_KEYS.DRONES, drone),
    update: (id, updates) => update(STORAGE_KEYS.DRONES, id, updates),
    remove: (id) => remove(STORAGE_KEYS.DRONES, id)
};

// Part operations
export const partStorage = {
    getAll: () => getAll(STORAGE_KEYS.PARTS),
    getById: (id) => getById(STORAGE_KEYS.PARTS, id),
    getByDroneId: (droneId) => getAll(STORAGE_KEYS.PARTS).filter(part => part.droneId === droneId),
    add: (part) => add(STORAGE_KEYS.PARTS, part),
    update: (id, updates) => update(STORAGE_KEYS.PARTS, id, updates),
    remove: (id) => remove(STORAGE_KEYS.PARTS, id)
};

// Repair operations
export const repairStorage = {
    getAll: () => getAll(STORAGE_KEYS.REPAIRS),
    getById: (id) => getById(STORAGE_KEYS.REPAIRS, id),
    getByDroneId: (droneId) => getAll(STORAGE_KEYS.REPAIRS).filter(repair => repair.droneId === droneId),
    getByPartId: (partId) => getAll(STORAGE_KEYS.REPAIRS).filter(repair => repair.partId === partId),
    add: (repair) => add(STORAGE_KEYS.REPAIRS, repair),
    update: (id, updates) => update(STORAGE_KEYS.REPAIRS, id, updates),
    remove: (id) => remove(STORAGE_KEYS.REPAIRS, id)
};

// Drone type operations
export const droneTypeStorage = {
    getAll: () => getAll(STORAGE_KEYS.DRONE_TYPES),
    getById: (id) => getById(STORAGE_KEYS.DRONE_TYPES, id),
    add: (type) => add(STORAGE_KEYS.DRONE_TYPES, type),
    update: (id, updates) => update(STORAGE_KEYS.DRONE_TYPES, id, updates),
    remove: (id) => remove(STORAGE_KEYS.DRONE_TYPES, id)
};

// Practice day operations
export const practiceDayStorage = {
    getAll: () => getAll(STORAGE_KEYS.PRACTICE_DAYS),
    getById: (id) => getById(STORAGE_KEYS.PRACTICE_DAYS, id),
    add: (day) => add(STORAGE_KEYS.PRACTICE_DAYS, day),
    update: (id, updates) => update(STORAGE_KEYS.PRACTICE_DAYS, id, updates),
    remove: (id) => remove(STORAGE_KEYS.PRACTICE_DAYS, id)
};

// Initialize storage on module load
initStorage();


