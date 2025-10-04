import DashboardLayout from "@/components/DashboardLayout";
import NotionIntegration from "@/components/integrations/NotionIntegration";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Integrations = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Integrations</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NotionIntegration />

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Slack</CardTitle>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <CardDescription>
                Get notifications in Slack when high-priority feedback is detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Connect Slack
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Zapier</CardTitle>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <CardDescription>
                Connect FeedbackIQ with 5,000+ apps through Zapier automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Connect Zapier
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Jira</CardTitle>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <CardDescription>
                Automatically create Jira tickets from high-priority feedback items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Connect Jira
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Integrations;
