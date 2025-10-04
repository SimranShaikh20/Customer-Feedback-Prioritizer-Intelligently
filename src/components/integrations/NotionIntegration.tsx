import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface IntegrationSettings {
  id?: string;
  api_key: string;
  database_id: string;
  is_active: boolean;
  last_sync_at?: string;
  settings: {
    auto_sync_high_priority?: boolean;
    sync_frequency?: string;
    min_priority_score?: number;
  };
}

interface SyncHistoryItem {
  id: string;
  sync_type: string;
  items_synced: number;
  status: string;
  error_details?: string;
  created_at: string;
}

const NotionIntegration = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings>({
    api_key: "",
    database_id: "",
    is_active: false,
    settings: {
      auto_sync_high_priority: false,
      sync_frequency: "manual",
      min_priority_score: 80,
    },
  });
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);

  useEffect(() => {
    loadSettings();
    loadSyncHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("integration_type", "notion")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          api_key: data.api_key || "",
          database_id: data.database_id || "",
          is_active: data.is_active || false,
          last_sync_at: data.last_sync_at || undefined,
          settings: (data.settings as any) || {
            auto_sync_high_priority: false,
            sync_frequency: "manual",
            min_priority_score: 80,
          },
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("sync_history")
        .select("*")
        .eq("integration_type", "notion")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncHistory(data || []);
    } catch (error: any) {
      console.error("Error loading sync history:", error);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.api_key || !settings.database_id) {
      toast.error("Please provide both API key and database ID");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-notion", {
        body: {
          action: "test",
          api_key: settings.api_key,
          database_id: settings.database_id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Connection successful! Database: ${data.database_name}`);
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to test connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings.api_key || !settings.database_id) {
      toast.error("Please provide both API key and database ID");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        integration_type: "notion",
        api_key: settings.api_key,
        database_id: settings.database_id,
        is_active: settings.is_active,
        settings: settings.settings,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("integration_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("integration_settings")
          .insert(settingsData);

        if (error) throw error;
      }

      toast.success("Settings saved successfully");
      setIsOpen(false);
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!settings.is_active) {
      toast.error("Please configure and activate the integration first");
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-notion", {
        body: {
          action: "sync",
          min_priority_score: settings.settings.min_priority_score || 80,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Synced ${data.items_synced} items to Notion`);
        loadSyncHistory();
        loadSettings();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!settings.id) return;

    try {
      const { error } = await supabase
        .from("integration_settings")
        .delete()
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Notion integration disconnected");
      setSettings({
        api_key: "",
        database_id: "",
        is_active: false,
        settings: {},
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect");
    }
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notion</CardTitle>
            {settings.is_active ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
          <CardDescription>
            Sync your prioritized feedback directly to Notion databases for team collaboration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.is_active ? (
            <>
              {settings.last_sync_at && (
                <p className="text-sm text-muted-foreground">
                  Last synced: {format(new Date(settings.last_sync_at), "MMM d, yyyy h:mm a")}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(true)}
                >
                  Configure
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="w-full text-destructive hover:text-destructive"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsOpen(true)} className="w-full">
              Connect Notion
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notion Integration Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="api_key">Notion API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="secret_..."
                  value={settings.api_key}
                  onChange={(e) =>
                    setSettings({ ...settings, api_key: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get your API key from{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center"
                  >
                    notion.so/my-integrations
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </p>
              </div>

              <div>
                <Label htmlFor="database_id">Notion Database ID</Label>
                <Input
                  id="database_id"
                  placeholder="abc123def456..."
                  value={settings.database_id}
                  onChange={(e) =>
                    setSettings({ ...settings, database_id: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy the database ID from your Notion database URL
                </p>
              </div>

              <Button
                onClick={handleTestConnection}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Sync Settings</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-sync high priority items</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync feedback with priority score &gt; 80
                  </p>
                </div>
                <Switch
                  checked={settings.settings.auto_sync_high_priority || false}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        auto_sync_high_priority: checked,
                      },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="min_priority">Minimum Priority Score</Label>
                <Input
                  id="min_priority"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.settings.min_priority_score || 80}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        min_priority_score: parseInt(e.target.value) || 80,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activate Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable syncing to Notion
                  </p>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, is_active: checked })
                  }
                />
              </div>
            </div>

            {syncHistory.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Recent Syncs</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncHistory.map((sync) => (
                        <TableRow key={sync.id}>
                          <TableCell className="text-xs">
                            {format(new Date(sync.created_at), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {sync.sync_type}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sync.items_synced}
                          </TableCell>
                          <TableCell>
                            {sync.status === "Success" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "Save Settings"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotionIntegration;