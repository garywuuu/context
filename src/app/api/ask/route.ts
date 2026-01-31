import { NextRequest, NextResponse } from 'next/server';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { askQuestion } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    // Authenticate session
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body = await request.json();

    // Validate required fields
    if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: question' },
        { status: 400 }
      );
    }

    const question = body.question.trim();
    const limit = typeof body.limit === 'number' ? Math.min(Math.max(body.limit, 1), 20) : 5;

    // Call RAG pipeline
    const result = await askQuestion(auth.organizationId, question, { limit });

    return NextResponse.json({
      question,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in /api/ask:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
