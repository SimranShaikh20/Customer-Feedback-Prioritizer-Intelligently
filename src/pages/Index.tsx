import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              AI-Powered Feedback Prioritization for Product Teams
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Transform customer feedback into actionable insights with intelligent categorization, 
              priority scoring, and team collaboration tools.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/dashboard">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Smart Categorization</CardTitle>
              <CardDescription>
                AI automatically categorizes feedback into bugs, feature requests, UX issues, 
                and more with intelligent theme extraction.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Priority Scoring</CardTitle>
              <CardDescription>
                Advanced algorithms calculate priority scores based on impact, urgency, 
                and frequency to help you focus on what matters most.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card hover:border-primary transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Assign feedback to team members, track status changes, add notes, 
                and sync directly to Notion for seamless workflow integration.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24">
        <Card className="bg-gradient-primary border-0 text-primary-foreground">
          <CardContent className="py-16 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to prioritize smarter?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join product teams using FeedbackIQ to make data-driven decisions.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg">
              <Link to="/auth">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
