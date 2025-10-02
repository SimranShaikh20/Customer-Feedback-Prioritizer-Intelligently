import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback_id } = await req.json();

    if (!feedback_id) {
      return new Response(JSON.stringify({ error: "feedback_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the feedback
    const { data: feedback, error: fetchError } = await supabase
      .from("feedback")
      .select("*")
      .eq("id", feedback_id)
      .single();

    if (fetchError || !feedback) {
      return new Response(JSON.stringify({ error: "Feedback not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI for analysis
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a feedback analysis expert. Analyze customer feedback and return ONLY a JSON object with no additional text. The JSON must have this exact structure:
{
  "category": "one of: Bug, Feature Request, UX Issue, Performance Issue, Pricing Concern, Documentation, Integration Request, Complaint, Praise",
  "urgency": "High, Medium, or Low based on customer frustration and business impact",
  "sentiment": "Positive, Neutral, or Negative",
  "impact_score": "number between 1-10 based on potential business impact",
  "key_themes": ["array", "of", "2-4", "key", "themes"],
  "summary": "One sentence summary of the core issue or request"
}`,
          },
          {
            role: "user",
            content: `Feedback: ${feedback.feedback_text}\nCustomer Segment: ${feedback.customer_segment}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Parse AI response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate priority score
    const urgencyWeight = analysis.urgency === "High" ? 3 : analysis.urgency === "Medium" ? 2 : 1;
    const priorityScore = (analysis.impact_score * 10) + (urgencyWeight * 5);

    // Update feedback with analysis
    const { error: updateError } = await supabase
      .from("feedback")
      .update({
        category: analysis.category,
        urgency: analysis.urgency,
        sentiment: analysis.sentiment,
        impact_score: analysis.impact_score,
        key_themes: analysis.key_themes,
        priority_score: priorityScore,
      })
      .eq("id", feedback_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, analysis, priority_score: priorityScore }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
