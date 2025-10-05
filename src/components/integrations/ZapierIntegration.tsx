import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ExternalLink, Zap } from "lucide-react";

interface ZapierSettings {
  id?: string;
  webhook_url: string;
  is_active: boolean;
  settings: {
    trigger_on_new_feedback?: boolean;
    trigger_on_high_priority?: boolean;
    min_priority_score?: number;
  };
}

const ZapierIntegration = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ZapierSettings>({
    webhook_url: "",
    is_active: false,
    settings: {
      trigger_on_new_feedback: false,
      trigger_on_high_priority: true,
      min_priority_score: 80,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("integration_type", "zapier")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          webhook_url: data.api_key || "",
          is_active: data.is_active || false,
          settings: (data.settings as any) || {
            trigger_on_new_feedback: false,
            trigger_on_high_priority: true,
            min_priority_score: 80,
          },
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.webhook_url) {
      toast.error("Please provide a Zapier webhook URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(settings.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          message: "Test connection from FeedbackIQ",
        }),
      });

      toast.success("Test request sent to Zapier. Check your Zap history to confirm.");
    } catch (error: any) {
      toast.error(error.message || "Failed to test connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings.webhook_url) {
      toast.error("Please provide a Zapier webhook URL");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        integration_type: "zapier",
        api_key: settings.webhook_url,
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

  const handleDisconnect = async () => {
    if (!settings.id) return;

    try {
      const { error } = await supabase
        .from("integration_settings")
        .delete()
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Zapier integration disconnected");
      setSettings({
        webhook_url: "",
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
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Zapier
            </CardTitle>
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
            Connect FeedbackIQ with 5,000+ apps through Zapier automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.is_active ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(true)}
                  className="flex-1"
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
              Connect Zapier
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zapier Integration Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook_url">Zapier Webhook URL</Label>
                <Input
                  id="webhook_url"
                  type="password"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={settings.webhook_url}
                  onChange={(e) =>
                    setSettings({ ...settings, webhook_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a "Catch Hook" trigger in Zapier at{" "}
                  <a
                    href="https://zapier.com/app/zaps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center"
                  >
                    zapier.com/app/zaps
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
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
              <h3 className="font-semibold">Trigger Settings</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trigger on new feedback</Label>
                  <p className="text-xs text-muted-foreground">
                    Send all new feedback to Zapier
                  </p>
                </div>
                <Switch
                  checked={settings.settings.trigger_on_new_feedback || false}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        trigger_on_new_feedback: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trigger on high priority feedback</Label>
                  <p className="text-xs text-muted-foreground">
                    Only send high-priority feedback
                  </p>
                </div>
                <Switch
                  checked={settings.settings.trigger_on_high_priority || false}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        trigger_on_high_priority: checked,
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
                <p className="text-xs text-muted-foreground mt-1">
                  Only applies if "Trigger on high priority" is enabled
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activate Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable Zapier webhooks
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

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">How to use:</h4>
              <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Create a new Zap in Zapier</li>
                <li>Choose "Webhooks by Zapier" as the trigger</li>
                <li>Select "Catch Hook" as the trigger event</li>
                <li>Copy the webhook URL and paste it above</li>
                <li>Configure your desired action (e.g., send to Gmail, create Trello card, etc.)</li>
              </ol>
            </div>

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

export default ZapierIntegration;