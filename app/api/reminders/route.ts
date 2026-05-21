import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '../../../lib/booking-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, clinicId, reminderType, appointmentId, customMessage } = body;

    if (!patientId || !clinicId || !reminderType) {
      return NextResponse.json(
        { error: 'patientId, clinicId, and reminderType are required fields.' },
        { status: 400 }
      );
    }

    // Initialize/read from mock DB (this supports the MVP running statefully)
    const result = await BookingService.triggerSmsReminder({
      patientId,
      clinicId,
      reminderType,
      appointmentId,
      customMessage,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reminderId: result.reminderId,
      status: result.status,
      twilioSid: result.twilioSid,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId') || 'clinic-1';
    
    const reminders = BookingService.getReminders(clinicId);
    return NextResponse.json({ success: true, reminders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
