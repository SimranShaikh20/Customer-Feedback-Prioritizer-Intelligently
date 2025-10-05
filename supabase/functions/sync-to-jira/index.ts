import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackItem {
  id: string;
  feedback_text: string;
  priority_score: number;
  urgency: string;
  category: string;
  source: string;
  customer_name?: string;
  customer_email?: string;
  impact_score?: number;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, domain, email, api_token, project_key, feedback, issue_type = 'Task' } = await req.json();

    const auth = btoa(`${email}:${api_token}`);
    const jiraHeaders = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Test connection
    if (action === 'test') {
      const response = await fetch(`https://${domain}/rest/api/3/project/${project_key}`, {
        method: 'GET',
        headers: jiraHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Jira API error:', errorText);
        throw new Error(`Failed to connect to Jira: ${response.status}`);
      }

      const projectData = await response.json();

      return new Response(
        JSON.stringify({ success: true, project_name: projectData.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Jira ticket
    if (action === 'create' && feedback) {
      const feedbackItem: FeedbackItem = feedback;

      // Get settings from database
      const { data: settings } = await supabaseClient
        .from('integration_settings')
        .select('settings')
        .eq('user_id', user.id)
        .eq('integration_type', 'jira')
        .single();

      const jiraSettings = (settings?.settings as any) || {};

      const issueDescription = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Feedback Details' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: feedbackItem.feedback_text }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Metadata' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Priority Score: ${feedbackItem.priority_score}/100` }],
                }],
              },
              {
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Urgency: ${feedbackItem.urgency || 'N/A'}` }],
                }],
              },
              {
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Category: ${feedbackItem.category || 'Uncategorized'}` }],
                }],
              },
              {
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Source: ${feedbackItem.source}` }],
                }],
              },
            ],
          },
        ],
      };

      if (feedbackItem.customer_name || feedbackItem.customer_email) {
        issueDescription.content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Customer Information' }],
        });
        issueDescription.content.push({
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: `Name: ${feedbackItem.customer_name || 'N/A'}` }],
              }],
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: `Email: ${feedbackItem.customer_email || 'N/A'}` }],
              }],
            },
          ],
        });
      }

      const jiraIssue: any = {
        fields: {
          project: {
            key: project_key,
          },
          summary: `[Feedback] ${feedbackItem.category || 'User Feedback'} - Priority ${feedbackItem.priority_score}`,
          description: issueDescription,
          issuetype: {
            name: jiraSettings.issue_type || issue_type,
          },
          labels: ['feedback', `priority-${feedbackItem.priority_score}`, feedbackItem.urgency?.toLowerCase() || 'medium'],
        },
      };

      // Add assignee if specified
      if (jiraSettings.default_assignee) {
        jiraIssue.fields.assignee = {
          name: jiraSettings.default_assignee,
        };
      }

      const response = await fetch(`https://${domain}/rest/api/3/issue`, {
        method: 'POST',
        headers: jiraHeaders,
        body: JSON.stringify(jiraIssue),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Jira create issue error:', errorText);
        throw new Error(`Failed to create Jira issue: ${response.status}`);
      }

      const result = await response.json();
      console.log('Jira ticket created:', result.key);

      // Update feedback with Jira ticket key
      await supabaseClient
        .from('feedback')
        .update({ 
          notes: `Jira ticket created: ${result.key}\n${feedbackItem.notes || ''}` 
        })
        .eq('id', feedbackItem.id);

      return new Response(
        JSON.stringify({ success: true, issue_key: result.key, issue_url: `https://${domain}/browse/${result.key}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-to-jira function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});