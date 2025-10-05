import DashboardLayout from "@/components/DashboardLayout";
import NotionIntegration from "@/components/integrations/NotionIntegration";
import SlackIntegration from "@/components/integrations/SlackIntegration";
import ZapierIntegration from "@/components/integrations/ZapierIntegration";
import JiraIntegration from "@/components/integrations/JiraIntegration";

const Integrations = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Integrations</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NotionIntegration />
          <SlackIntegration />
          <ZapierIntegration />
          <JiraIntegration />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Integrations;
