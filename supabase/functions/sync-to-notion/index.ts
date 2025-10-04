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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, api_key, database_id, min_priority_score } = await req.json();

    // Get integration settings if not provided
    let notionApiKey = api_key;
    let notionDatabaseId = database_id;

    if (!notionApiKey || !notionDatabaseId) {
      const { data: settings, error: settingsError } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("integration_type", "notion")
        .single();

      if (settingsError) throw new Error("Integration not configured");

      notionApiKey = settings.api_key;
      notionDatabaseId = settings.database_id;
    }

    if (action === "test") {
      // Test connection to Notion
      const response = await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ success: false, error: `Notion API error: ${error}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const database = await response.json();

      return new Response(
        JSON.stringify({ success: true, database_name: database.title?.[0]?.plain_text || "Untitled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync") {
      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Get high-priority feedback
      const { data: feedbackItems, error: feedbackError } = await supabase
        .from("feedback")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .gte("priority_score", min_priority_score || 80)
        .order("priority_score", { ascending: false })
        .limit(50);

      if (feedbackError) throw feedbackError;

      let syncedCount = 0;
      const errors: string[] = [];

      // Sync each item to Notion
      for (const item of feedbackItems || []) {
        try {
          const notionPage = {
            parent: { database_id: notionDatabaseId },
            properties: {
              "Title": {
                title: [{ text: { content: item.feedback_text.substring(0, 100) } }],
              },
              "Category": {
                select: item.category ? { name: item.category } : undefined,
              },
              "Priority Score": {
                number: item.priority_score || 0,
              },
              "Urgency": {
                select: item.urgency ? { name: item.urgency } : undefined,
              },
              "Impact Score": {
                number: item.impact_score || 0,
              },
              "Sentiment": {
                select: item.sentiment ? { name: item.sentiment } : undefined,
              },
              "Customer Segment": {
                select: item.customer_segment ? { name: item.customer_segment } : undefined,
              },
              "Status": {
                select: item.status ? { name: item.status } : undefined,
              },
              "Source": {
                select: item.source ? { name: item.source } : undefined,
              },
              "Created Date": {
                date: { start: item.created_at },
              },
            },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ text: { content: item.feedback_text } }],
                },
              },
              ...(item.customer_name || item.customer_email
                ? [
                    {
                      object: "block",
                      type: "heading_3",
                      heading_3: {
                        rich_text: [{ text: { content: "Customer Details" } }],
                      },
                    },
                    {
                      object: "block",
                      type: "paragraph",
                      paragraph: {
                        rich_text: [
                          {
                            text: {
                              content: `Name: ${item.customer_name || "N/A"}\nEmail: ${item.customer_email || "N/A"}`,
                            },
                          },
                        ],
                      },
                    },
                  ]
                : []),
              ...(item.notes
                ? [
                    {
                      object: "block",
                      type: "heading_3",
                      heading_3: {
                        rich_text: [{ text: { content: "Notes" } }],
                      },
                    },
                    {
                      object: "block",
                      type: "paragraph",
                      paragraph: {
                        rich_text: [{ text: { content: item.notes } }],
                      },
                    },
                  ]
                : []),
            ],
          };

          const response = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${notionApiKey}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notionPage),
          });

          if (response.ok) {
            syncedCount++;
          } else {
            const error = await response.text();
            errors.push(`Item ${item.id}: ${error}`);
          }
        } catch (error: any) {
          errors.push(`Item ${item.id}: ${error.message}`);
        }
      }

      // Update last sync time
      await supabase
        .from("integration_settings")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("integration_type", "notion");

      // Log sync history
      await supabase.from("sync_history").insert({
        user_id: user.id,
        integration_type: "notion",
        sync_type: "manual",
        items_synced: syncedCount,
        status: errors.length === 0 ? "Success" : "Partial",
        error_details: errors.length > 0 ? errors.join("; ") : null,
      });

      return new Response(
        JSON.stringify({
          success: true,
          items_synced: syncedCount,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});