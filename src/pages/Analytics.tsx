import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#a855f7", "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const Analytics = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [urgencyData, setUrgencyData] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: feedback } = await supabase.from("feedback").select("*");

    if (feedback) {
      // Category breakdown
      const categoryCount: Record<string, number> = {};
      feedback.forEach((item) => {
        if (item.category) {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        }
      });
      setCategoryData(
        Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
      );

      // Urgency distribution
      const urgencyCount: Record<string, number> = {};
      feedback.forEach((item) => {
        if (item.urgency) {
          urgencyCount[item.urgency] = (urgencyCount[item.urgency] || 0) + 1;
        }
      });
      setUrgencyData(
        Object.entries(urgencyCount).map(([name, value]) => ({ name, value }))
      );

      // Customer segment analysis
      const segmentCount: Record<string, number> = {};
      feedback.forEach((item) => {
        segmentCount[item.customer_segment] =
          (segmentCount[item.customer_segment] || 0) + 1;
      });
      setSegmentData(
        Object.entries(segmentCount).map(([name, value]) => ({ name, value }))
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Urgency Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={urgencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle>Customer Segment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={segmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#6366f1" name="Feedback Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
