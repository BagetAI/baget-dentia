import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '../../../lib/booking-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const clinicId = searchParams.get('clinicId') || 'clinic-1';

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD).' }, { status: 400 });
    }

    // Validate date formatting
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const slots = BookingService.getAvailableSlots(clinicId, date);
    return NextResponse.json({ success: true, date, slots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'hold') {
      const { chairId, startTime } = body;
      if (!chairId || !startTime) {
        return NextResponse.json({ error: 'chairId and startTime are required to create a hold.' }, { status: 400 });
      }

      const result = BookingService.placeHold(chairId, startTime);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }

      return NextResponse.json({ success: true, token: result.token });
    }

    if (action === 'confirm') {
      const { token, patient } = body;
      if (!token || !patient) {
        return NextResponse.json({ error: 'token and patient profile details are required to confirm booking.' }, { status: 400 });
      }

      const { firstName, lastName, dateOfBirth, email, phone } = patient;
      if (!firstName || !lastName || !dateOfBirth || !phone) {
        return NextResponse.json({ error: 'Patient profile lacks required fields (firstName, lastName, dateOfBirth, phone).' }, { status: 400 });
      }

      const result = BookingService.confirmBooking(token, {
        firstName,
        lastName,
        dateOfBirth,
        email: email || '',
        phone,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, appointmentId: result.appointmentId });
    }

    return NextResponse.json({ error: 'Invalid action specified. Must be "hold" or "confirm".' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
