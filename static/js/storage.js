/**
 * Storage management module
 * Uses API calls instead of localStorage
 */

import {
    droneAPI, partAPI, repairAPI, droneTypeAPI,
    manufacturerAPI, practiceDayAPI
} from './api.js';

// ==================== 機体関連 ====================

export const droneStorage = {
    async getAll() {
        try {
            return await droneAPI.getAll();
        } catch (error) {
            console.error('Error fetching drones:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await droneAPI.getById(id);
        } catch (error) {
            console.error('Error fetching drone:', error);
            return null;
        }
    },

    async add(drone) {
        try {
            const result = await droneAPI.create({
                name: drone.name,
                type: drone.type,
                startDate: drone.startDate,
                photo: drone.photo || '',
                status: drone.status || 'ready'
            });
            return { ...drone, id: result.id };
        } catch (error) {
            console.error('Error adding drone:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await droneAPI.update(id, updates);
            const updated = await droneAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating drone:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await droneAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting drone:', error);
            throw error;
        }
    }
};

// ==================== パーツ関連 ====================

export const partStorage = {
    async getAll() {
        try {
            return await partAPI.getAll();
        } catch (error) {
            console.error('Error fetching parts:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await partAPI.getById(id);
        } catch (error) {
            console.error('Error fetching part:', error);
            return null;
        }
    },

    async getByDroneId(droneId) {
        try {
            return await partAPI.getAll(droneId);
        } catch (error) {
            console.error('Error fetching parts by drone:', error);
            return [];
        }
    },

    async add(part) {
        try {
            const result = await partAPI.create({
                droneId: part.droneId,
                name: part.name,
                startDate: part.startDate,
                manufacturerId: part.manufacturerId || null
            });
            return { ...part, id: result.id };
        } catch (error) {
            console.error('Error adding part:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await partAPI.update(id, updates);
            const updated = await partAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating part:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await partAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting part:', error);
            throw error;
        }
    }
};

// ==================== 修理履歴関連 ====================

export const repairStorage = {
    async getAll() {
        try {
            return await repairAPI.getAll();
        } catch (error) {
            console.error('Error fetching repairs:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await repairAPI.getById(id);
        } catch (error) {
            console.error('Error fetching repair:', error);
            return null;
        }
    },

    async getByDroneId(droneId) {
        try {
            return await repairAPI.getAll(droneId);
        } catch (error) {
            console.error('Error fetching repairs by drone:', error);
            return [];
        }
    },

    async getByPartId(partId) {
        try {
            return await repairAPI.getAll(null, partId);
        } catch (error) {
            console.error('Error fetching repairs by part:', error);
            return [];
        }
    },

    async add(repair) {
        try {
            const result = await repairAPI.create({
                droneId: repair.droneId,
                partId: repair.partId || null,
                date: repair.date,
                description: repair.description
            });
            return { ...repair, id: result.id };
        } catch (error) {
            console.error('Error adding repair:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await repairAPI.update(id, updates);
            const updated = await repairAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating repair:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await repairAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting repair:', error);
            throw error;
        }
    }
};

// ==================== 機体種類関連 ====================

export const droneTypeStorage = {
    async getAll() {
        try {
            return await droneTypeAPI.getAll();
        } catch (error) {
            console.error('Error fetching drone types:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await droneTypeAPI.getById(id);
        } catch (error) {
            console.error('Error fetching drone type:', error);
            return null;
        }
    },

    async add(type) {
        try {
            const result = await droneTypeAPI.create({
                name: type.name,
                defaultParts: type.defaultParts || []
            });
            return { ...type, id: result.id };
        } catch (error) {
            console.error('Error adding drone type:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await droneTypeAPI.update(id, updates);
            const updated = await droneTypeAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating drone type:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await droneTypeAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting drone type:', error);
            throw error;
        }
    }
};

// ==================== 練習日関連 ====================

export const practiceDayStorage = {
    async getAll() {
        try {
            return await practiceDayAPI.getAll();
        } catch (error) {
            console.error('Error fetching practice days:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await practiceDayAPI.getById(id);
        } catch (error) {
            console.error('Error fetching practice day:', error);
            return null;
        }
    },

    async add(day) {
        try {
            const result = await practiceDayAPI.create({
                date: day.date,
                note: day.note || null
            });
            return { ...day, id: result.id };
        } catch (error) {
            console.error('Error adding practice day:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await practiceDayAPI.update(id, updates);
            const updated = await practiceDayAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating practice day:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await practiceDayAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting practice day:', error);
            throw error;
        }
    }
};

// ==================== メーカー関連 ====================

export const manufacturerStorage = {
    async getAll() {
        try {
            return await manufacturerAPI.getAll();
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
            return [];
        }
    },

    async getById(id) {
        try {
            return await manufacturerAPI.getById(id);
        } catch (error) {
            console.error('Error fetching manufacturer:', error);
            return null;
        }
    },

    async add(manufacturer) {
        try {
            const result = await manufacturerAPI.create({
                name: manufacturer.name
            });
            return { ...manufacturer, id: result.id };
        } catch (error) {
            console.error('Error adding manufacturer:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            await manufacturerAPI.update(id, updates);
            const updated = await manufacturerAPI.getById(id);
            return updated;
        } catch (error) {
            console.error('Error updating manufacturer:', error);
            throw error;
        }
    },

    async remove(id) {
        try {
            await manufacturerAPI.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting manufacturer:', error);
            throw error;
        }
    }
};
