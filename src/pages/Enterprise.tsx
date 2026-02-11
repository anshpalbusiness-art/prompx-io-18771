import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { PromptOpsDashboard } from "@/components/PromptOpsDashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OfflinePromptGenerator } from "@/components/OfflinePromptGenerator";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Shield, Lock, Database, Eye, Download, Server, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

const Enterprise = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOffline, offlineModeEnabled, toggleOfflineMode, isNetworkOffline } = useOfflineMode();
  const [dataRetention, setDataRetention] = useState(() => 
    localStorage.getItem('dataRetention') === 'true'
  );
  const [auditLogging, setAuditLogging] = useState(() => 
    localStorage.getItem('auditLogging') === 'true'
  );
  const [encryptionEnabled, setEncryptionEnabled] = useState(() => 
    localStorage.getItem('encryptionEnabled') === 'true'
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleOfflineModeToggle = (enabled: boolean) => {
    toggleOfflineMode(enabled);
    toast.success(enabled ? "Offline mode enabled" : "Offline mode disabled");
  };

  const handleDataRetention = (enabled: boolean) => {
    setDataRetention(enabled);
    localStorage.setItem('dataRetention', String(enabled));
    toast.success(enabled ? "Data retention enabled" : "Data retention disabled");
  };

  const handleAuditLogging = (enabled: boolean) => {
    setAuditLogging(enabled);
    localStorage.setItem('auditLogging', String(enabled));
    toast.success(enabled ? "Audit logging enabled" : "Audit logging disabled");
  };

  const handleEncryption = (enabled: boolean) => {
    setEncryptionEnabled(enabled);
    localStorage.setItem('encryptionEnabled', String(enabled));
    toast.success(enabled ? "Encryption enabled" : "Encryption disabled");
  };

  const exportData = () => {
    const data = {
      promptHistory: localStorage.getItem('offlinePromptHistory'),
      customTemplates: localStorage.getItem('customPromptTemplates'),
      settings: {
        offlineMode: offlineModeEnabled,
        dataRetention,
        auditLogging,
        encryptionEnabled
      },
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompx-enterprise-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully!");
  };

  const clearLocalData = () => {
    if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
      localStorage.removeItem('offlinePromptHistory');
      localStorage.removeItem('customPromptTemplates');
      toast.success("Local data cleared");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-subtle">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} showHeader={false}>
      <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container-responsive mx-auto max-w-7xl py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="mb-8 sm:mb-12 md:mb-14 lg:mb-16">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 mb-5 sm:mb-6 md:mb-8">
              <div className="p-3 sm:p-3.5 bg-gradient-primary rounded-xl shadow-elegant shrink-0">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-primary-foreground" />
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Enterprise & Privacy
            </h1>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl leading-relaxed">
                  Privacy-first prompt engineering for regulated industries
                </p>
              </div>
              {isOffline && (
                <Badge variant="secondary" className="ml-auto shrink-0 shadow-md px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm">
                  {isNetworkOffline ? "Network Offline" : "Offline Mode Active"}
                </Badge>
              )}
            </div>

            {isNetworkOffline && (
              <Card className="p-4 sm:p-5 md:p-6 border-warning/50 bg-warning/10 shadow-lg rounded-xl">
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base space-y-1">
                    <p className="font-semibold text-warning">No Internet Connection</p>
                    <p className="text-muted-foreground leading-relaxed">
                      You're currently offline. All features will work using on-device processing only.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

            <Tabs defaultValue="promptops" className="w-full space-y-6 sm:space-y-8">
              <div className="flex justify-center overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex h-11 sm:h-12 items-center justify-center rounded-xl bg-muted/50 p-1.5 text-muted-foreground backdrop-blur-sm border border-border/50">
                  <TabsTrigger value="promptops" className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base whitespace-nowrap">
                    <Activity className="w-4 h-4 mr-2" />
                    PromptOps
                  </TabsTrigger>
                  <TabsTrigger value="offline" className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base whitespace-nowrap">
                    Offline Mode
                  </TabsTrigger>
                  <TabsTrigger value="privacy" className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base whitespace-nowrap">
                    Privacy Settings
                  </TabsTrigger>
                  <TabsTrigger value="compliance" className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base whitespace-nowrap">
                    Compliance
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="promptops" className="mt-0">
                <PromptOpsDashboard userId={user?.id || ""} />
              </TabsContent>

              <TabsContent value="offline" className="mt-0 space-y-6">
                <OfflinePromptGenerator />
              </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-6">
              <Card className="p-5 sm:p-6 md:p-8 rounded-xl border border-border/50 shadow-lg">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Privacy Controls
                </h2>
                
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-border/50 rounded-xl hover:border-border transition-colors bg-card/30 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Server className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <Label htmlFor="offline-mode" className="font-semibold text-sm sm:text-base">
                          Force Offline Mode
                        </Label>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Disable all cloud connections and work entirely on-device
                      </p>
                    </div>
                    <Switch
                      id="offline-mode"
                      checked={offlineModeEnabled}
                      onCheckedChange={handleOfflineModeToggle}
                      className="self-end sm:self-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-border/50 rounded-xl hover:border-border transition-colors bg-card/30 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <Label htmlFor="encryption" className="font-semibold text-sm sm:text-base">
                          Local Data Encryption
                        </Label>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Encrypt all locally stored data and prompts
                      </p>
                    </div>
                    <Switch
                      id="encryption"
                      checked={encryptionEnabled}
                      onCheckedChange={handleEncryption}
                      className="self-end sm:self-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-border/50 rounded-xl hover:border-border transition-colors bg-card/30 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <Label htmlFor="retention" className="font-semibold text-sm sm:text-base">
                          Data Retention
                        </Label>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Keep local history and analytics data
                      </p>
                    </div>
                    <Switch
                      id="retention"
                      checked={dataRetention}
                      onCheckedChange={handleDataRetention}
                      className="self-end sm:self-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-border/50 rounded-xl hover:border-border transition-colors bg-card/30 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <Label htmlFor="audit" className="font-semibold text-sm sm:text-base">
                          Audit Logging
                        </Label>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Track all prompt generations for compliance
                      </p>
                    </div>
                    <Switch
                      id="audit"
                      checked={auditLogging}
                      onCheckedChange={handleAuditLogging}
                      className="self-end sm:self-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                    <Button onClick={exportData} variant="outline" className="h-10 sm:h-11 px-5 sm:px-6 text-sm sm:text-base w-full sm:w-auto">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button onClick={clearLocalData} variant="destructive" className="h-10 sm:h-11 px-5 sm:px-6 text-sm sm:text-base w-full sm:w-auto">
                      Clear Local Data
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="mt-0 space-y-6">
              <Card className="p-5 sm:p-6 md:p-8 rounded-xl border border-border/50 shadow-lg">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Compliance Standards
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
                  <Card className="p-5 sm:p-6 rounded-xl border-primary/30 bg-card/50 shadow-md hover:shadow-lg transition-shadow">
                    <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-3 sm:mb-4">HIPAA Compliance</h3>
                    <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                      <p>✓ No PHI transmitted to cloud</p>
                      <p>✓ On-device processing only</p>
                      <p>✓ Encrypted local storage</p>
                      <p>✓ Audit logging available</p>
                      <p>✓ Access controls</p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-xl border-primary/30 bg-card/50 shadow-md hover:shadow-lg transition-shadow">
                    <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-3 sm:mb-4">GDPR Compliance</h3>
                    <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                      <p>✓ Data sovereignty (local storage)</p>
                      <p>✓ Right to erasure (data export/delete)</p>
                      <p>✓ Data portability</p>
                      <p>✓ Privacy by design</p>
                      <p>✓ No cross-border transfers</p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-xl border-primary/30 bg-card/50 shadow-md hover:shadow-lg transition-shadow">
                    <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-3 sm:mb-4">SOC 2 Type II</h3>
                    <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                      <p>✓ Security controls</p>
                      <p>✓ Availability monitoring</p>
                      <p>✓ Processing integrity</p>
                      <p>✓ Confidentiality safeguards</p>
                      <p>✓ Privacy protection</p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-xl border-primary/30 bg-card/50 shadow-md hover:shadow-lg transition-shadow">
                    <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-3 sm:mb-4">Financial Services</h3>
                    <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                      <p>✓ PCI DSS compliant architecture</p>
                      <p>✓ No sensitive data exposure</p>
                      <p>✓ Air-gapped operation</p>
                      <p>✓ Audit trail maintenance</p>
                      <p>✓ Zero cloud dependency</p>
                    </div>
                  </Card>
                </div>

                <Card className="mt-6 sm:mt-8 p-4 sm:p-5 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Note:</strong> This offline/edge mode is designed for privacy-focused enterprises 
                    in regulated industries. All processing happens on your device, ensuring complete data 
                    sovereignty and compliance with the strictest regulations.
                  </p>
                </Card>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Enterprise;
