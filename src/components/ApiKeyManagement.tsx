import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string | null;
  api_key_hash: string | null;
  key_prefix: string | null;
  is_active: boolean;
  requests_count: number;
  rate_limit_per_hour: number;
  last_used_at: string | null;
  expires_at: string | null;
  last_rotated_at: string | null;
  created_at: string;
}

interface NewlyCreatedKey {
  id: string;
  plaintext_key: string;
}

interface ApiKeyManagementProps {
  user: User | null;
}

export default function ApiKeyManagement({ user }: ApiKeyManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewlyCreatedKey | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    try {
      // SECURITY: Never select the api_key column - it should always be null
      // We only use api_key_hash and key_prefix for validation
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, key_name, api_key_hash, key_prefix, is_active, requests_count, rate_limit_per_hour, last_used_at, expires_at, last_rotated_at, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Map to include null api_key for type compatibility
      setApiKeys((data || []).map(key => ({ ...key, api_key: null })));
    } catch (error: any) {
      toast({
        title: "Error loading API keys",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "pk_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const apiKey = generateApiKey();
      const keyPrefix = apiKey.substring(0, 12);
      
      // Generate hash using database function
      const { data: hashData, error: hashError } = await supabase
        .rpc('generate_api_key_hash', { _api_key: apiKey });
      
      if (hashError) throw hashError;

      const { data: insertData, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user?.id,
          key_name: newKeyName,
          api_key: apiKey, // Automatically cleared by database trigger
          api_key_hash: hashData,
          key_prefix: keyPrefix,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        })
        .select('id')
        .single();

      if (error) throw error;

      // Store the newly created key to display once
      // Note: The database trigger automatically clears the plaintext from storage
      setNewlyCreatedKey({
        id: insertData.id,
        plaintext_key: apiKey,
      });

      toast({
        title: "API key created",
        description: "⚠️ Copy this key now - you won't be able to see it again!",
      });

      setNewKeyName("");
      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Error creating API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyToDelete);

      if (error) throw error;

      toast({
        title: "API key deleted",
        description: "The API key has been removed",
      });

      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Error deleting API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setKeyToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const maskApiKey = (keyId: string, keyPrefix: string | null) => {
    // Check if this is a newly created key
    if (newlyCreatedKey?.id === keyId) {
      return newlyCreatedKey.plaintext_key;
    }
    // Otherwise show masked version using prefix
    return keyPrefix ? `${keyPrefix}${"•".repeat(24)}` : "••••••••••••••••••••••••••••••••••••";
  };

  const getDisplayKey = (key: ApiKey) => {
    if (newlyCreatedKey?.id === key.id) {
      return newlyCreatedKey.plaintext_key;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Create and manage API keys to integrate our prompt optimization engine into your applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Create New API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="keyName"
                  placeholder="Enter a name for your API key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <Button onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </div>
          </div>

          {apiKeys.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => {
                    const displayKey = getDisplayKey(key);
                    const isNewKey = newlyCreatedKey?.id === key.id;
                    const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
                    
                    return (
                      <TableRow key={key.id} className={isNewKey ? "bg-accent/50" : ""}>
                        <TableCell className="font-medium">
                          {key.key_name}
                          {isExpired && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Expired
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            {displayKey ? (
                              <>
                                <span className="text-green-600 dark:text-green-400">
                                  {displayKey}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  Copy now - shown once!
                                </Badge>
                              </>
                            ) : (
                              maskApiKey(key.id, key.key_prefix)
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active && !isExpired ? "default" : "secondary"}>
                            {isExpired ? "Expired" : key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{key.requests_count.toLocaleString()}</TableCell>
                        <TableCell>{key.rate_limit_per_hour}/hour</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>
                              {key.last_used_at
                                ? new Date(key.last_used_at).toLocaleDateString()
                                : "Never"}
                            </div>
                            {key.expires_at && (
                              <div className="text-xs text-muted-foreground">
                                Expires: {new Date(key.expires_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {displayKey && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(displayKey)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setKeyToDelete(key.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No API keys created yet. Create your first key to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone and any
              applications using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}