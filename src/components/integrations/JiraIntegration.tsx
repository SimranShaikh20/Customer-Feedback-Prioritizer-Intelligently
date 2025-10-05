import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface JiraSettings {
  id?: string;
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  is_active: boolean;
  settings: {
    auto_create_tickets?: boolean;
    min_priority_score?: number;
    issue_type?: string;
    default_assignee?: string;
  };
}

const JiraIntegration = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<JiraSettings>({
    domain: "",
    email: "",
    api_token: "",
    project_key: "",
    is_active: false,
    settings: {
      auto_create_tickets: true,
      min_priority_score: 80,
      issue_type: "Task",
      default_assignee: "",
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
        .eq("integration_type", "jira")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsedSettings = (data.settings as any) || {};
        setSettings({
          id: data.id,
          domain: parsedSettings.domain || "",
          email: parsedSettings.email || "",
          api_token: data.api_key || "",
          project_key: parsedSettings.project_key || "",
          is_active: data.is_active || false,
          settings: {
            auto_create_tickets: parsedSettings.auto_create_tickets ?? true,
            min_priority_score: parsedSettings.min_priority_score || 80,
            issue_type: parsedSettings.issue_type || "Task",
            default_assignee: parsedSettings.default_assignee || "",
          },
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.domain || !settings.email || !settings.api_token || !settings.project_key) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-jira", {
        body: {
          action: "test",
          domain: settings.domain,
          email: settings.email,
          api_token: settings.api_token,
          project_key: settings.project_key,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Connection successful! Project: ${data.project_name}`);
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
    if (!settings.domain || !settings.email || !settings.api_token || !settings.project_key) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        integration_type: "jira",
        api_key: settings.api_token,
        is_active: settings.is_active,
        settings: {
          domain: settings.domain,
          email: settings.email,
          project_key: settings.project_key,
          ...settings.settings,
        },
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

      toast.success("Jira integration disconnected");
      setSettings({
        domain: "",
        email: "",
        api_token: "",
        project_key: "",
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
            <CardTitle>Jira</CardTitle>
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
            Automatically create Jira tickets from high-priority feedback items
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
              Connect Jira
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jira Integration Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain">Jira Domain</Label>
                <Input
                  id="domain"
                  placeholder="yourcompany.atlassian.net"
                  value={settings.domain}
                  onChange={(e) =>
                    setSettings({ ...settings, domain: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Jira instance domain (without https://)
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={settings.email}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Jira account email
                </p>
              </div>

              <div>
                <Label htmlFor="api_token">API Token</Label>
                <Input
                  id="api_token"
                  type="password"
                  placeholder="Your Jira API token"
                  value={settings.api_token}
                  onChange={(e) =>
                    setSettings({ ...settings, api_token: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create an API token at{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center"
                  >
                    id.atlassian.com
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </p>
              </div>

              <div>
                <Label htmlFor="project_key">Project Key</Label>
                <Input
                  id="project_key"
                  placeholder="PROJ"
                  value={settings.project_key}
                  onChange={(e) =>
                    setSettings({ ...settings, project_key: e.target.value.toUpperCase() })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Jira project key (e.g., PROJ, FB, etc.)
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
              <h3 className="font-semibold">Ticket Settings</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-create tickets</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create Jira tickets for high-priority feedback
                  </p>
                </div>
                <Switch
                  checked={settings.settings.auto_create_tickets || false}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        auto_create_tickets: checked,
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

              <div>
                <Label htmlFor="issue_type">Issue Type</Label>
                <Select
                  value={settings.settings.issue_type || "Task"}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        issue_type: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Story">Story</SelectItem>
                    <SelectItem value="Epic">Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="default_assignee">Default Assignee (Optional)</Label>
                <Input
                  id="default_assignee"
                  placeholder="username"
                  value={settings.settings.default_assignee || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        default_assignee: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activate Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable Jira ticket creation
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

export default JiraIntegration;