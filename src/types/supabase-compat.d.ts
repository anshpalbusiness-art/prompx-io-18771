// Temporary compatibility layer to unblock builds when generated Supabase types are empty
// This augments SupabaseClient to accept any table name string.
// It is SAFE at compile-time and does not change runtime behavior.
// Remove this once src/integrations/supabase/types.ts is regenerated with real tables.

import type { SupabaseClient } from "@supabase/supabase-js";

declare module "@supabase/supabase-js" {
  interface SupabaseClient<Database = any, SchemaName = any, Schema = any> {
    /**
     * Permissive overload: allow passing any table name as string.
     * Returns any to avoid cascading type errors while types are out of sync.
     */
    from(table: string): any;

    /**
     * Permissive overload for invoking database functions by name.
     */
    rpc(fn: string, args?: Record<string, any>, options?: any): Promise<any>;
  }
}
