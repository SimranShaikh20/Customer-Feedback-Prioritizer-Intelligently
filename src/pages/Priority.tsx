import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const Priority = () => {
  const [priorityFeedback, setPriorityFeedback] = useState<any[]>([]);

  useEffect(() => {
    fetchPriorityFeedback();
  }, []);

  const fetchPriorityFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .not("priority_score", "is", null)
      .order("priority_score", { ascending: false })
      .limit(10);
    if (data) setPriorityFeedback(data);
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return "text-priority-critical";
    if (score >= 60) return "text-priority-high";
    if (score >= 40) return "text-priority-medium";
    return "text-priority-low";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Priority View</h1>

        <div className="grid grid-cols-1 gap-6">
          {priorityFeedback.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-12 text-center text-muted-foreground">
                No analyzed feedback yet. Add feedback and run AI analysis to see priority scores.
              </CardContent>
            </Card>
          ) : (
            priorityFeedback.map((item, index) => (
              <Card key={item.id} className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span
                          className={`text-4xl font-bold ${getPriorityColor(
                            item.priority_score
                          )}`}
                        >
                          {item.priority_score}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {item.category && <Badge>{item.category}</Badge>}
                        {item.urgency && (
                          <Badge
                            className={
                              item.urgency === "High"
                                ? "bg-priority-critical text-white"
                                : item.urgency === "Medium"
                                ? "bg-priority-medium text-white"
                                : "bg-priority-low text-white"
                            }
                          >
                            {item.urgency}
                          </Badge>
                        )}
                        <Badge variant="outline">{item.customer_segment}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg mb-4">{item.feedback_text}</p>
                  {item.key_themes && item.key_themes.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {item.key_themes.map((theme: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Source: {item.source}</p>
                    {item.customer_name && <p>Customer: {item.customer_name}</p>}
                    <p>Impact Score: {item.impact_score}/10</p>
                    <p>Status: {item.status}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Priority;
