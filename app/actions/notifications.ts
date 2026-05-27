'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface Notification {
    id: string;
    sender_id: string | null;
    recipient_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    read_at: string | null;
    action_url: string | null;
    action_label: string | null;
    priority: string;
    metadata: Record<string, any>;
    created_at: string;
}

async function verifyAdminUser(): Promise<{ userId: string; isAdmin: boolean } | null> {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    return {
        userId: user.id,
        isAdmin: profile?.role === 'admin'
    };
}

export async function getNotifications(userId: string, limit = 50): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return { success: false, error: 'Not authenticated' };
        
        // User can only fetch their own notifications
        if (user.id !== userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return { success: false, error: error.message };

        return { success: true, data: data as Notification[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUnreadCount(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return { success: false, error: 'Not authenticated', count: 0 };
        
        if (user.id !== userId) {
            return { success: false, error: 'Unauthorized', count: 0 };
        }

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) return { success: false, error: error.message, count: 0 };

        return { success: true, count: count || 0 };
    } catch (error: any) {
        return { success: false, error: error.message, count: 0 };
    }
}

export async function markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return { success: false, error: 'Not authenticated' };
        
        // User can only mark their own notifications as read
        if (user.id !== userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('recipient_id', userId);

        if (error) return { success: false, error: error.message };

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return { success: false, error: 'Not authenticated' };
        
        // User can only mark their own notifications as read
        if (user.id !== userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) return { success: false, error: error.message };

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createNotification(data: {
    recipientId: string;
    title: string;
    message: string;
    type: string;
    senderId?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const auth = await verifyAdminUser();
        if (!auth) return { success: false, error: 'Not authenticated' };
        
        // Only admins can create notifications (or system)
        if (!auth.isAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        const supabase = await createClient();

        const { error } = await supabase.from('notifications').insert({
            recipient_id: data.recipientId,
            sender_id: null, // System/Admin notification
            title: data.title,
            message: data.message,
            type: data.type,
            action_url: data.actionUrl || null,
            action_label: data.actionLabel || null,
            priority: data.priority || 'normal',
            metadata: {}
        });

        if (error) return { success: false, error: error.message };

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendBulkNotification(data: {
    title: string;
    message: string;
    type: string;
    senderId: string;
    recipientRole?: string;
}): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const auth = await verifyAdminUser();
        if (!auth) return { success: false, error: 'Not authenticated' };
        
        // Only admins can send bulk notifications
        if (!auth.isAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        const supabase = await createAdminClient();

        // Get all users (excluding sender)
        let query = supabase.from('profiles').select('id').neq('id', data.senderId);
        
        if (data.recipientRole) {
            query = query.eq('role', data.recipientRole);
        }

        const { data: users, error } = await query;

        if (error) return { success: false, error: error.message };

        if (!users || users.length === 0) {
            return { success: true, count: 0 };
        }

        // Insert notifications for all users (sender_id set to null to avoid FK constraint issues)
        const notifications = users.map((user: { id: string }) => ({
            recipient_id: user.id,
            sender_id: null, // Admin-sent, system notification
            title: data.title,
            message: data.message,
            type: data.type,
            priority: 'normal',
            metadata: {}
        }));

        const { error: insertError } = await supabase.from('notifications').insert(notifications);

        if (insertError) return { success: false, error: insertError.message };

        return { success: true, count: users.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllNotificationsForAdmin(limit = 100): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    try {
        const auth = await verifyAdminUser();
        if (!auth) return { success: false, error: 'Not authenticated' };
        if (!auth.isAdmin) return { success: false, error: 'Admin access required' };

        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return { success: false, error: error.message };

        // Fetch sender info manually since FK doesn't work for profiles join
        const senderIds = [...new Set(data.map(n => n.sender_id).filter(Boolean))];
        const senderMap: Record<string, { full_name: string; email: string }> = {};

        if (senderIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', senderIds);
            
            profiles?.forEach(p => {
                senderMap[p.id] = { full_name: p.full_name, email: p.email };
            });
        }

        // Attach sender info to each notification
        const notificationsWithSender = data.map(n => ({
            ...n,
            sender: n.sender_id ? senderMap[n.sender_id] || null : null
        }));

        return { success: true, data: notificationsWithSender as Notification[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllNotificationsAdmin(): Promise<{ success: boolean; allNotifs?: Notification[]; total?: number; unread?: number; error?: string }> {
    try {
        const auth = await verifyAdminUser();
        if (!auth) return { success: false, error: 'Not authenticated' };
        if (!auth.isAdmin) return { success: false, error: 'Admin access required' };

        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) return { success: false, error: error.message };

        // Fetch sender info manually
        const senderIds = [...new Set(data.map(n => n.sender_id).filter(Boolean))];
        const senderMap: Record<string, { full_name: string; email: string }> = {};

        if (senderIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', senderIds);
            
            profiles?.forEach(p => {
                senderMap[p.id] = { full_name: p.full_name, email: p.email };
            });
        }

        const notificationsWithSender = data.map(n => ({
            ...n,
            sender: n.sender_id ? senderMap[n.sender_id] || null : null
        }));

        const { count: total } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
        const { count: unread } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);

        return { 
            success: true, 
            allNotifs: notificationsWithSender as Notification[], 
            total: total || 0, 
            unread: unread || 0 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getNotificationStats(): Promise<{ success: boolean; data?: { total: number; unread: number; byType: Record<string, number> }; error?: string }> {
    try {
        const auth = await verifyAdminUser();
        if (!auth) return { success: false, error: 'Not authenticated' };
        if (!auth.isAdmin) return { success: false, error: 'Admin access required' };

        const supabase = await createAdminClient();

        const { count: total } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true });

        const { count: unread } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

        const { data: byTypeData } = await supabase
            .from('notifications')
            .select('type');

        const byType: Record<string, number> = {};
        byTypeData?.forEach((n: any) => {
            byType[n.type] = (byType[n.type] || 0) + 1;
        });

        return {
            success: true,
            data: {
                total: total || 0,
                unread: unread || 0,
                byType
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
