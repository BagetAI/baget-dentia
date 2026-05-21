import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '../../../lib/booking-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, practiceName, practiceEmail, currentPms, chairCount } = body;

    // Validate presence of required fields
    if (!fullName || !practiceName || !practiceEmail || !currentPms || !chairCount) {
      return NextResponse.json(
        { error: 'All fields are required to join the priority waitlist.' },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(practiceEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid professional email address.' },
        { status: 400 }
      );
    }

    // Attempt to persist the waitlist signup
    const result = BookingService.addWaitlistSignup({
      fullName,
      practiceName,
      practiceEmail,
      currentPms,
      chairCount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      signupId: result.signupId,
      message: 'Successfully registered for the Dentia early-adopter waitlist.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error processing waitlist submission.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Basic auth check or secret key check can be skipped for pure admin review dashboard in the MVP
    const signups = BookingService.getWaitlistSignups();
    return NextResponse.json({ success: true, signups });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error fetching waitlist.' },
      { status: 500 }
    );
  }
}
