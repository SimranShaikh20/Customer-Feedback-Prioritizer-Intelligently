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

    const { action, webhook_url, feedback } = await req.json();

    // Test connection
    if (action === 'test') {
      const testMessage = {
        text: '✅ FeedbackIQ Slack Integration Test',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ Connection Successful!',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Your Slack integration is working correctly. You will receive notifications here when high-priority feedback is detected.',
            },
          },
        ],
      };

      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send feedback notification
    if (action === 'notify' && feedback) {
      const feedbackItem: FeedbackItem = feedback;
      
      const priorityEmoji = feedbackItem.priority_score >= 90 ? '🔴' : 
                           feedbackItem.priority_score >= 80 ? '🟠' : '🟡';
      
      const message = {
        text: `${priorityEmoji} High Priority Feedback Detected`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${priorityEmoji} High Priority Feedback`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Priority Score:*\n${feedbackItem.priority_score}/100`,
              },
              {
                type: 'mrkdwn',
                text: `*Urgency:*\n${feedbackItem.urgency || 'N/A'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Category:*\n${feedbackItem.category || 'Uncategorized'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Source:*\n${feedbackItem.source}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Feedback:*\n${feedbackItem.feedback_text}`,
            },
          },
        ],
      };

      if (feedbackItem.customer_name || feedbackItem.customer_email) {
        message.blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${feedbackItem.customer_name || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${feedbackItem.customer_email || 'N/A'}`,
            },
          ],
        });
      }

      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      console.log('Slack notification sent successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-slack function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});