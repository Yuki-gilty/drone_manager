/**
 * API communication module
 * Uses Supabase REST API (PostgREST) for all database operations
 */

import { supabase, getCurrentUserId } from './supabase.js';

/**
 * Helper function to handle Supabase errors
 */
function handleSupabaseError(error) {
    console.error('Supabase error:', error);
    
    if (error.code === 'PGRST116') {
        throw new Error('データが見つかりません');
    }
    
    if (error.code === '23505') {
        throw new Error('このデータは既に存在します');
    }
    
    if (error.code === '23503') {
        throw new Error('関連するデータが存在するため削除できません');
    }
    
    if (error.message) {
        throw new Error(error.message);
    }
    
    throw new Error('データベースエラーが発生しました');
}

// ==================== 認証関連 ====================

export const authAPI = {
    /**
     * ユーザー登録
     * Supabase Authを使用し、同時にprofilesテーブルにユーザー情報を保存
     */
    async register(username, password, email = null) {
        try {
            // Email is now required, so we should always have a valid email
            if (!email) {
                throw new Error('メールアドレスは必須です');
            }
            const finalEmail = email;

            // Supabase Authでユーザーを作成
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: finalEmail,
                password: password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('ユーザー登録に失敗しました');
            }

            // profilesテーブルにユーザー情報を保存
            // 注意: Supabaseのトリガー関数で自動的に作成されるはずですが、
            // フォールバックとして手動でINSERTを試みます
            // トリガーで既に作成されている場合は、ON CONFLICTで無視されます
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    username: username,
                    email: email
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                // 既に存在する場合は無視（23505 = unique violation）
                if (profileError.code === '23505') {
                    // 既に存在する場合は無視して続行（トリガーで作成された可能性）
                } else if (profileError.code === 'PGRST205') {
                    // テーブルが存在しない場合は警告を出して続行
                    console.warn('Profiles table not found. User registered but profile not saved. Please create the profiles table in Supabase.');
                } else if (profileError.message && profileError.message.includes('row-level security')) {
                    // RLSポリシー違反の場合は、トリガーで作成されるはずなので警告のみ
                    console.warn('RLS policy violation on profile insert. Profile should be auto-created by trigger function.');
                } else {
                    // その他のエラーはスロー
                    throw profileError;
                }
            }

            // ユーザー情報を取得
            let user = await this.getCurrentUser();

            // profilesテーブルが存在しない場合、Supabase Authのユーザー情報から直接構築
            if (!user && authData.user) {
                user = {
                    id: authData.user.id,
                    username: authData.user.user_metadata?.username || username,
                    email: authData.user.email || email
                };
            }

            return {
                message: '登録が完了しました',
                user: user
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    /**
     * ログイン
     */
    async login(username, password) {
        try {
            let userEmail = null;

            // RPC関数を使用してusernameからemailを取得
            // この関数はSECURITY DEFINERで定義されているため、RLSをバイパスできる
            const { data: email, error: rpcError } = await supabase
                .rpc('get_user_email_by_username', { p_username: username });

            if (rpcError) {
                console.error('RPC error:', rpcError);
                // RPC関数が存在しない場合、直接クエリを試みる（フォールバック）
                if (rpcError.code === 'PGRST202' || rpcError.message?.includes('function')) {
                    console.warn('RPC function not found. Please run the SQL setup to create get_user_email_by_username function.');
                    // 入力がメールアドレス形式かチェック
                    if (username.includes('@')) {
                        userEmail = username;
                    } else {
                        throw new Error('ログイン機能を使用するには、Supabaseでget_user_email_by_username関数を作成してください。または、ユーザー名の代わりにメールアドレスでログインしてください。');
                    }
                } else {
                    throw new Error('ユーザー名またはパスワードが正しくありません');
                }
            } else if (!email) {
                throw new Error('ユーザー名またはパスワードが正しくありません');
            } else {
                userEmail = email;
            }

            // Supabase Authでログイン
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: password
            });

            if (authError) {
                throw new Error('ユーザー名またはパスワードが正しくありません');
            }

            // ユーザー情報を取得
            let user = await this.getCurrentUser();

            // profilesテーブルが存在しない場合、Supabase Authのユーザー情報から直接構築
            if (!user && authData.user) {
                user = {
                    id: authData.user.id,
                    username: authData.user.user_metadata?.username || username,
                    email: authData.user.email
                };
            }

            return {
                message: 'ログインに成功しました',
                user: user
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    /**
     * ログアウト
     */
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { message: 'ログアウトしました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    /**
     * 現在のユーザー情報を取得
     */
    async getCurrentUser() {
        try {
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !authUser) {
                return null;
            }

            // profilesテーブルからユーザー情報を取得
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (profileError || !profile) {
                return {
                    id: authUser.id,
                    username: authUser.user_metadata?.username || 'Unknown',
                    email: authUser.email
                };
            }

            return {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                created_at: profile.created_at
            };
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },
};

// ==================== 機体関連 ====================

export const droneAPI = {
    async getAll(typeId = null) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            let query = supabase
                .from('drones')
                .select(`
                    *,
                    drone_types!inner(name)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (typeId) {
                query = query.eq('type_id', typeId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // パーツ一覧を取得
            const dronesWithParts = await Promise.all(
                (data || []).map(async (drone) => {
                    const { data: parts } = await supabase
                        .from('parts')
                        .select('id')
                        .eq('drone_id', drone.id);

                    return {
                        ...drone,
                        typeName: drone.drone_types?.name || '',
                        parts: parts?.map(p => p.id) || []
                    };
                })
            );

            return dronesWithParts;
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('drones')
                .select(`
                    *,
                    drone_types!inner(name)
                `)
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            // パーツ一覧を取得
            const { data: parts } = await supabase
                .from('parts')
                .select('id')
                .eq('drone_id', id);

            return {
                ...data,
                typeName: data.drone_types?.name || '',
                parts: parts?.map(p => p.id) || []
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(drone) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('drones')
                .insert({
                    user_id: userId,
                    name: drone.name,
                    type_id: drone.type,
                    start_date: drone.startDate,
                    photo: drone.photo || '',
                    status: drone.status || 'ready'
                })
                .select()
                .single();

            if (error) throw error;

            // デフォルトパーツを追加
            const { data: typeData } = await supabase
                .from('drone_types')
                .select('default_parts')
                .eq('id', drone.type)
                .single();

            if (typeData?.default_parts && Array.isArray(typeData.default_parts)) {
                const defaultParts = typeData.default_parts;
                for (const partData of defaultParts) {
                    const partName = typeof partData === 'string' ? partData : partData.name;
                    const manufacturerId = typeof partData === 'object' ? partData.manufacturerId : null;

                    await supabase
                        .from('parts')
                        .insert({
                            user_id: userId,
                            drone_id: data.id,
                            name: partName,
                            start_date: drone.startDate,
                            manufacturer_id: manufacturerId,
                            replacement_history: []
                        });
                }
            }

            return { id: data.id, message: '機体が追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.type !== undefined) updateData.type_id = updates.type;
            if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
            if (updates.photo !== undefined) updateData.photo = updates.photo;
            if (updates.status !== undefined) updateData.status = updates.status;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('drones')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '機体が更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { error } = await supabase
                .from('drones')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '機体が削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};

// ==================== パーツ関連 ====================

export const partAPI = {
    async getAll(droneId = null) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            let query = supabase
                .from('parts')
                .select(`
                    *,
                    manufacturers(name)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (droneId) {
                query = query.eq('drone_id', droneId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(part => ({
                id: part.id,
                droneId: part.drone_id,
                name: part.name,
                startDate: part.start_date,
                manufacturerId: part.manufacturer_id,
                manufacturerName: part.manufacturers?.name || null,
                replacementHistory: part.replacement_history || [],
                createdAt: part.created_at
            }));
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('parts')
                .select(`
                    *,
                    manufacturers(name)
                `)
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                droneId: data.drone_id,
                name: data.name,
                startDate: data.start_date,
                manufacturerId: data.manufacturer_id,
                manufacturerName: data.manufacturers?.name || null,
                replacementHistory: data.replacement_history || [],
                createdAt: data.created_at
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(part) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('parts')
                .insert({
                    user_id: userId,
                    drone_id: part.droneId,
                    name: part.name,
                    start_date: part.startDate,
                    manufacturer_id: part.manufacturerId || null,
                    replacement_history: []
                })
                .select()
                .single();

            if (error) throw error;

            return { id: data.id, message: 'パーツが追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
            if (updates.manufacturerId !== undefined) updateData.manufacturer_id = updates.manufacturerId;
            if (updates.replacementHistory !== undefined) updateData.replacement_history = updates.replacementHistory;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('parts')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: 'パーツが更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { error } = await supabase
                .from('parts')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: 'パーツが削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};

// ==================== 修理履歴関連 ====================

export const repairAPI = {
    async getAll(droneId = null, partId = null) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            let query = supabase
                .from('repairs')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (droneId) {
                query = query.eq('drone_id', droneId);
            }

            if (partId) {
                query = query.eq('part_id', partId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(repair => ({
                id: repair.id,
                droneId: repair.drone_id,
                partId: repair.part_id,
                date: repair.date,
                description: repair.description,
                createdAt: repair.created_at
            }));
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('repairs')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                droneId: data.drone_id,
                partId: data.part_id,
                date: data.date,
                description: data.description,
                createdAt: data.created_at
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(repair) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('repairs')
                .insert({
                    user_id: userId,
                    drone_id: repair.droneId,
                    part_id: repair.partId || null,
                    date: repair.date,
                    description: repair.description
                })
                .select()
                .single();

            if (error) throw error;

            return { id: data.id, message: '修理履歴が追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.date !== undefined) updateData.date = updates.date;
            if (updates.description !== undefined) updateData.description = updates.description;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('repairs')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '修理履歴が更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { error } = await supabase
                .from('repairs')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '修理履歴が削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};

// ==================== 機体種類関連 ====================

export const droneTypeAPI = {
    async getAll() {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('drone_types')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(type => ({
                id: type.id,
                name: type.name,
                defaultParts: type.default_parts || [],
                createdAt: type.created_at
            }));
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('drone_types')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                name: data.name,
                defaultParts: data.default_parts || [],
                createdAt: data.created_at
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(type) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('drone_types')
                .insert({
                    user_id: userId,
                    name: type.name,
                    default_parts: type.defaultParts || []
                })
                .select()
                .single();

            if (error) throw error;

            return { id: data.id, message: '機体種類が追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.defaultParts !== undefined) updateData.default_parts = updates.defaultParts;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('drone_types')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '機体種類が更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            // 使用中の機体があるかチェック
            const { data: drones } = await supabase
                .from('drones')
                .select('id')
                .eq('type_id', id)
                .limit(1);

            if (drones && drones.length > 0) {
                throw new Error('この種類を使用している機体があるため削除できません');
            }

            const { error } = await supabase
                .from('drone_types')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '機体種類が削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};

// ==================== メーカー関連 ====================

export const manufacturerAPI = {
    async getAll() {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('manufacturers')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(mfg => ({
                id: mfg.id,
                name: mfg.name,
                createdAt: mfg.created_at
            }));
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('manufacturers')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                name: data.name,
                createdAt: data.created_at
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(manufacturer) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('manufacturers')
                .insert({
                    user_id: userId,
                    name: manufacturer.name
                })
                .select()
                .single();

            if (error) throw error;

            return { id: data.id, message: 'メーカーが追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('manufacturers')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: 'メーカーが更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            // 使用中のパーツがあるかチェック
            const { data: parts } = await supabase
                .from('parts')
                .select('id')
                .eq('manufacturer_id', id)
                .limit(1);

            if (parts && parts.length > 0) {
                throw new Error('このメーカーを使用しているパーツがあるため削除できません');
            }

            const { error } = await supabase
                .from('manufacturers')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: 'メーカーが削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};

// ==================== 練習日関連 ====================

export const practiceDayAPI = {
    async getAll() {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('practice_days')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error) throw error;

            return (data || []).map(day => ({
                id: day.id,
                date: day.date,
                note: day.note,
                createdAt: day.created_at
            }));
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async getById(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('practice_days')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                date: data.date,
                note: data.note,
                createdAt: data.created_at
            };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async create(practiceDay) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { data, error } = await supabase
                .from('practice_days')
                .insert({
                    user_id: userId,
                    date: practiceDay.date,
                    note: practiceDay.note || null
                })
                .select()
                .single();

            if (error) throw error;

            return { id: data.id, message: '練習日が追加されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async update(id, updates) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const updateData = {};
            if (updates.date !== undefined) updateData.date = updates.date;
            if (updates.note !== undefined) updateData.note = updates.note || null;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('practice_days')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '練習日が更新されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },

    async delete(id) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('認証が必要です');

            const { error } = await supabase
                .from('practice_days')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            return { message: '練習日が削除されました' };
        } catch (error) {
            handleSupabaseError(error);
        }
    },
};
