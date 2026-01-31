import { NextRequest, NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/slack';
import {
  handleBlockAction,
  handleViewSubmission,
} from '@/lib/slack/interaction-handlers';

/**
 * POST /api/slack/interactions - Slack interactivity endpoint
 * Receives button clicks and modal submissions as application/x-www-form-urlencoded
 * with a `payload` JSON field.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Slack signature
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const signature = request.headers.get('x-slack-signature') || '';
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';

  if (!verifySlackSignature(signingSecret, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse form-encoded body → extract `payload` JSON
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return NextResponse.json({ error: 'Invalid payload JSON' }, { status: 400 });
  }

  const payloadType = payload.type as string;

  switch (payloadType) {
    case 'block_actions': {
      // Respond 200 immediately, handle async
      void handleBlockAction(payload).catch((err) => {
        console.error('Error handling block action:', err);
      });
      return new NextResponse('', { status: 200 });
    }

    case 'view_submission': {
      // Synchronous — can return validation errors
      try {
        const result = await handleViewSubmission(payload);
        if (result) {
          return NextResponse.json(result);
        }
        return new NextResponse('', { status: 200 });
      } catch (err) {
        console.error('Error handling view submission:', err);
        return new NextResponse('', { status: 200 });
      }
    }

    case 'view_closed':
      return new NextResponse('', { status: 200 });

    default:
      console.warn('Unknown interaction payload type:', payloadType);
      return new NextResponse('', { status: 200 });
  }
}
