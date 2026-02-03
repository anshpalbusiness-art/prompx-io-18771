// API helper utilities for PromptX

import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError, withRetry, logError } from "./errorHandling";
import type { User } from "@supabase/supabase-js";

// User management
export const userApi = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw handleSupabaseError(error);
      return user;
    } catch (error) {
      logError(handleSupabaseError(error), 'getCurrentUser');
      return null;
    }
  },

  // Get user session
  getUserSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw handleSupabaseError(error);
      return session;
    } catch (error) {
      logError(handleSupabaseError(error), 'getUserSession');
      return null;
    }
  },

  // Sign in user
  signIn: async (email: string, password: string) => {
    return withRetry(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw handleSupabaseError(error);
      return data;
    });
  },

  // Sign up user
  signUp: async (email: string, password: string, username?: string) => {
    return withRetry(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });
      if (error) throw handleSupabaseError(error);
      return data;
    });
  },

  // Sign out user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw handleSupabaseError(error);
    } catch (error) {
      logError(handleSupabaseError(error), 'signOut');
      throw error;
    }
  },

  // Check if user is admin
  isAdmin: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw handleSupabaseError(error);
      }

      return !!data;
    } catch (error) {
      logError(handleSupabaseError(error), 'isAdmin');
      return false;
    }
  }
};

// Subscription management
export const subscriptionApi = {
  // Get user subscription
  getUserSubscription: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      logError(handleSupabaseError(error), 'getUserSubscription');
      return null;
    }
  },

  // Create or update subscription
  upsertSubscription: async (subscriptionData: any) => {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData)
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    });
  },

  // Cancel subscription
  cancelSubscription: async (userId: string) => {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    });
  }
};

// Plan management
export const planApi = {
  // Get all active plans
  getActivePlans: async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) throw handleSupabaseError(error);
      return data || [];
    } catch (error) {
      logError(handleSupabaseError(error), 'getActivePlans');
      return [];
    }
  },

  // Get plan by type
  getPlanByType: async (planType: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_type', planType)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      logError(handleSupabaseError(error), 'getPlanByType');
      return null;
    }
  }
};

// Usage tracking
export const usageApi = {
  // Track usage
  trackUsage: async (userId: string, feature: string, metadata?: any) => {
    try {
      const { data, error } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          feature,
          metadata,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    } catch (error) {
      logError(handleSupabaseError(error), 'trackUsage');
      return null;
    }
  },

  // Get usage stats
  getUsageStats: async (userId: string, feature?: string, startDate?: string, endDate?: string) => {
    try {
      let query = supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId);

      if (feature) {
        query = query.eq('feature', feature);
      }

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw handleSupabaseError(error);
      return data || [];
    } catch (error) {
      logError(handleSupabaseError(error), 'getUsageStats');
      return [];
    }
  }
};

// Prompt management
export const promptApi = {
  // Save prompt
  savePrompt: async (userId: string, promptData: any) => {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: userId,
          ...promptData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    });
  },

  // Get user prompts
  getUserPrompts: async (userId: string, limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw handleSupabaseError(error);
      return data || [];
    } catch (error) {
      logError(handleSupabaseError(error), 'getUserPrompts');
      return [];
    }
  },

  // Delete prompt
  deletePrompt: async (promptId: string, userId: string) => {
    return withRetry(async () => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId)
        .eq('user_id', userId);

      if (error) throw handleSupabaseError(error);
    });
  }
};

// Team management
export const teamApi = {
  // Get team members
  getTeamMembers: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:profiles(email, username)
        `)
        .eq('team_owner_id', userId)
        .eq('status', 'active');

      if (error) throw handleSupabaseError(error);
      return data || [];
    } catch (error) {
      logError(handleSupabaseError(error), 'getTeamMembers');
      return [];
    }
  },

  // Invite team member
  inviteTeamMember: async (ownerId: string, email: string, role: string = 'member') => {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          team_owner_id: ownerId,
          email,
          role,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    });
  }
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1);

    return !error;
  } catch (error) {
    logError(handleSupabaseError(error), 'healthCheck');
    return false;
  }
};

// Initialize API
export const initializeApi = async (): Promise<void> => {
  try {
    // Check database connection
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }

    console.log('✅ API initialized successfully');
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    throw error;
  }
};
