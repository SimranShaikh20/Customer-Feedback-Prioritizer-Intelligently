import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Feedback = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    feedback_text: "",
    source: "Survey",
    customer_name: "",
    customer_email: "",
    customer_segment: "Free",
  });

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setFeedback(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user?.id)
      .single();

    if (!user || !profile) {
      toast.error("Please log in to add feedback");
      return;
    }

    const { error } = await supabase.from("feedback").insert({
      ...formData,
      user_id: user.id,
      organization_id: profile.organization_id,
    });

    if (error) {
      toast.error("Failed to add feedback");
    } else {
      toast.success("Feedback added successfully");
      setIsAddDialogOpen(false);
      setFormData({
        feedback_text: "",
        source: "Survey",
        customer_name: "",
        customer_email: "",
        customer_segment: "Free",
      });
      fetchFeedback();
    }
  };

  const handleAnalyze = async (id: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback", {
        body: { feedback_id: id },
      });

      if (error) throw error;

      toast.success("Feedback analyzed successfully");
      fetchFeedback();
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze feedback");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete feedback");
    } else {
      toast.success("Feedback deleted");
      fetchFeedback();
    }
  };

  const getPriorityColor = (score: number | null) => {
    if (!score) return "bg-muted";
    if (score >= 80) return "bg-priority-critical";
    if (score >= 60) return "bg-priority-high";
    if (score >= 40) return "bg-priority-medium";
    return "bg-priority-low";
  };

  const getUrgencyColor = (urgency: string | null) => {
    if (urgency === "High") return "bg-priority-critical text-white";
    if (urgency === "Medium") return "bg-priority-medium text-white";
    if (urgency === "Low") return "bg-priority-low text-white";
    return "bg-muted";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">All Feedback</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Feedback</DialogTitle>
                <DialogDescription>
                  Enter feedback details. AI analysis can be run after submission.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback_text">Feedback Text *</Label>
                  <Textarea
                    id="feedback_text"
                    value={formData.feedback_text}
                    onChange={(e) =>
                      setFormData({ ...formData, feedback_text: e.target.value })
                    }
                    required
                    rows={4}
                    placeholder="Enter customer feedback..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Source *</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) =>
                        setFormData({ ...formData, source: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Survey">Survey</SelectItem>
                        <SelectItem value="In-App">In-App</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Support Ticket">Support Ticket</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_segment">Customer Segment *</Label>
                    <Select
                      value={formData.customer_segment}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customer_segment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                        <SelectItem value="Free">Free</SelectItem>
                        <SelectItem value="Trial">Trial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData({ ...formData, customer_name: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Customer Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) =>
                        setFormData({ ...formData, customer_email: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Add Feedback
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Feedback List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No feedback yet. Add your first feedback item to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  feedback.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs truncate">
                        {item.feedback_text}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.customer_segment}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge>{item.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.urgency ? (
                          <Badge className={getUrgencyColor(item.urgency)}>
                            {item.urgency}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.priority_score ? (
                          <Badge className={getPriorityColor(item.priority_score)}>
                            {item.priority_score}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!item.category && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAnalyze(item.id)}
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Feedback;
