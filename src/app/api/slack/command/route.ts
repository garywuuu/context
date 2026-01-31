import { NextRequest, NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/slack';
import { supabaseAdmin } from '@/lib/supabase';
import { askQuestion } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body as text for signature verification
    const rawBody = await request.text();

    // 2. Verify Slack signing secret
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';

    const isValid = verifySlackSignature(
      process.env.SLACK_SIGNING_SECRET || '',
      signature,
      timestamp,
      rawBody
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse form-urlencoded body (Slack sends slash commands as form data)
    const params = new URLSearchParams(rawBody);
    const text = params.get('text') || '';
    const teamId = params.get('team_id') || '';
    const responseUrl = params.get('response_url') || '';

    // 4. Validate input
    if (!text.trim()) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Please provide a question. Usage: `/context What decisions were made about pricing?`',
      });
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Missing team_id' }, { status: 400 });
    }

    // 5. Look up integration by team_id to get organization_id
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('organization_id')
      .eq('provider', 'slack')
      .eq('status', 'active')
      .filter('credentials->>team_id', 'eq', teamId)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'This Slack workspace is not connected to Intelligent Context. Please set up the integration in your dashboard.',
      });
    }

    const organizationId = integration.organization_id;
    const question = text.trim();

    // 6. Return 200 immediately with acknowledgement
    // Fire-and-forget: process the question and respond via response_url
    processQuestionAsync(organizationId, question, responseUrl).catch((err) => {
      console.error('Error processing Slack command async:', err);
    });

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Thinking about: "${question}"...`,
    });
  } catch (error) {
    console.error('Error in /api/slack/command:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Something went wrong. Please try again.',
    });
  }
}

async function processQuestionAsync(
  organizationId: string,
  question: string,
  responseUrl: string
): Promise<void> {
  try {
    const result = await askQuestion(organizationId, question);

    // Build source text
    const sourcesText = result.sources.length > 0
      ? result.sources
          .slice(0, 3)
          .map((s, i) => `${i + 1}. ${s.action_taken} (${Math.round(s.similarity * 100)}% match)`)
          .join(' | ')
      : 'No sources found';

    // Build Slack Block Kit payload
    const payload = {
      response_type: 'in_channel' as const,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Q: ${question}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: result.answer,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Sources: ${sourcesText} | Powered by Intelligent Context`,
            },
          ],
        },
      ],
    };

    // POST answer back to response_url
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error generating answer for Slack:', error);

    // Try to send error message back to Slack
    try {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: `Sorry, I couldn't answer that question. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }),
      });
    } catch {
      console.error('Failed to send error response to Slack');
    }
  }
}
