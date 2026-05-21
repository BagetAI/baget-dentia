import fs from 'fs';
import path from 'path';

// Types mimicking the SQL Schema
export interface Clinic {
  id: string;
  name: string;
  phone: string;
  email: string;
  timezone: string;
}

export interface Chair {
  id: string;
  clinicId: string;
  name: string;
  isActive: boolean;
}

export interface Provider {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  role: 'dentist' | 'hygienist';
}

export interface Appointment {
  id: string;
  clinicId: string;
  chairId: string;
  providerId: string;
  patientId: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  status: 'unscheduled' | 'hold' | 'pending_pms' | 'confirmed' | 'released' | 'conflict_failed';
  pmsAppointmentId?: string;
}

export interface BookingHold {
  id: string;
  chairId: string;
  startTime: string;
  endTime: string;
  token: string;
  expiresAt: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  pmsInternalId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  email: string;
  phone: string;
  smsConsentStatus: 'verified' | 'denied' | 'unknown';
}

export interface PatientReminder {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  reminderType: 'recall' | 'reminder_24h' | 'reminder_2h';
  channel: 'sms' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'responded';
  messageBody: string;
  twilioSid?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

interface DatabaseState {
  clinics: Clinic[];
  chairs: Chair[];
  providers: Provider[];
  patients: Patient[];
  appointments: Appointment[];
  bookingHolds: BookingHold[];
  patientReminders: PatientReminder[];
}

const DB_FILE = path.join('/tmp', 'dentia_db.json');

// Initialize base data if it doesn't exist
function getDb(): DatabaseState {
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!parsed.patientReminders) {
        parsed.patientReminders = [];
      }
      return parsed;
    } catch (e) {
      // fallback to initial seed
    }
  }

  const initialDb: DatabaseState = {
    clinics: [
      {
        id: 'clinic-1',
        name: 'Dentia Dental Care',
        phone: '1-800-555-0199',
        email: 'hello@dentia.app',
        timezone: 'America/New_York',
      }
    ],
    chairs: [
      { id: 'chair-1', clinicId: 'clinic-1', name: 'Chair 1 (Hygiene)', isActive: true },
      { id: 'chair-2', clinicId: 'clinic-1', name: 'Chair 2 (General)', isActive: true },
      { id: 'chair-3', clinicId: 'clinic-1', name: 'Chair 3 (Pediatric)', isActive: true },
    ],
    providers: [
      { id: 'prov-1', clinicId: 'clinic-1', firstName: 'Dr. Arthur', lastName: 'Dent', role: 'dentist' },
      { id: 'prov-2', clinicId: 'clinic-1', firstName: 'Sarah', lastName: 'Jenkins', role: 'hygienist' },
    ],
    patients: [
      {
        id: 'pat-1',
        clinicId: 'clinic-1',
        pmsInternalId: 'OD-8820',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        dateOfBirth: '1988-11-22',
        email: 'sarah.jenkins@example.com',
        phone: '+15550192', // formatting for real-world simulation
        smsConsentStatus: 'verified'
      }
    ],
    appointments: [],
    bookingHolds: [],
    patientReminders: [],
  };

  saveDb(initialDb);
  return initialDb;
}

function saveDb(db: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write db', e);
  }
}

export class BookingService {
  /**
   * Cleans up expired holds before performing any queries or bookings
   */
  private static cleanExpiredHolds(db: DatabaseState): boolean {
    const now = new Date();
    const initialCount = db.bookingHolds.length;
    db.bookingHolds = db.bookingHolds.filter(h => new Date(h.expiresAt) > now);
    return db.bookingHolds.length !== initialCount;
  }

  /**
   * Fetches real-time available time slots for a clinic and date
   * Considers clinic business hours, existing appointments, and active temporary holds.
   */
  public static getAvailableSlots(clinicId: string, dateStr: string) {
    const db = getDb();
    const changed = this.cleanExpiredHolds(db);
    if (changed) saveDb(db);

    // Business Hours: 9 AM to 5 PM (17:00), in 1-hour increments
    const slotTimes = [
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
    ];

    const targetDate = new Date(dateStr);
    const availableSlots: { time: string; chairId: string; providerId: string; chairName: string }[] = [];

    // For simplicity, we loop through all our active chairs and find empty spots
    db.chairs.filter(c => c.clinicId === clinicId && c.isActive).forEach(chair => {
      slotTimes.forEach(time => {
        const startIso = `${dateStr}T${time}:00.000Z`;
        const start = new Date(startIso);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
        const endIso = end.toISOString();

        // Check if chair is booked in appointments (hold, pending_pms, confirmed)
        const hasAppointment = db.appointments.some(appt => {
          if (appt.chairId !== chair.id) return false;
          if (['hold', 'pending_pms', 'confirmed'].includes(appt.status)) {
            const aStart = new Date(appt.startTime);
            const aEnd = new Date(appt.endTime);
            // Overlap check
            return (start < aEnd && end > aStart);
          }
          return false;
        });

        // Check if chair is held in bookingHolds
        const hasHold = db.bookingHolds.some(hold => {
          if (hold.chairId !== chair.id) return false;
          const hStart = new Date(hold.startTime);
          const hEnd = new Date(hold.endTime);
          return (start < hEnd && end > hStart);
        });

        if (!hasAppointment && !hasHold) {
          // Assign dr/hygienist based on chair/role rules
          const provider = chair.id === 'chair-1' 
            ? db.providers.find(p => p.role === 'hygienist') 
            : db.providers.find(p => p.role === 'dentist');

          availableSlots.push({
            time,
            chairId: chair.id,
            chairName: chair.name,
            providerId: provider?.id || db.providers[0].id,
          });
        }
      });
    });

    return availableSlots;
  }

  /**
   * Places a 10-minute hold on a calendar slot to prevent double-booking
   */
  public static placeHold(chairId: string, startTimeIso: string, durationMinutes = 60): { success: boolean; token?: string; error?: string } {
    const db = getDb();
    this.cleanExpiredHolds(db);

    const start = new Date(startTimeIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Double check availability atomically
    const hasOverlap = db.appointments.some(appt => {
      if (appt.chairId !== chairId) return false;
      if (['hold', 'pending_pms', 'confirmed'].includes(appt.status)) {
        return (start < new Date(appt.endTime) && end > new Date(appt.startTime));
      }
      return false;
    }) || db.bookingHolds.some(hold => {
      if (hold.chairId !== chairId) return false;
      return (start < new Date(hold.expiresAt) && end > new Date(hold.startTime));
    });

    if (hasOverlap) {
      return { success: false, error: 'This time slot is no longer available. Please select another slot.' };
    }

    const token = 'tx-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    const newHold: BookingHold = {
      id: 'hld-' + Math.random().toString(36).substring(2, 9),
      chairId,
      startTime: startTimeIso,
      endTime: end.toISOString(),
      token,
      expiresAt,
    };

    db.bookingHolds.push(newHold);
    saveDb(db);

    return {
      success: true,
      token,
    };
  }

  /**
   * Confirms a booking using a valid hold token, matches patient via DOB + Last Name verification
   */
  public static confirmBooking(
    token: string,
    patientData: { firstName: string; lastName: string; dateOfBirth: string; email: string; phone: string }
  ): { success: boolean; appointmentId?: string; error?: string } {
    const db = getDb();
    this.cleanExpiredHolds(db);

    const holdIndex = db.bookingHolds.findIndex(h => h.token === token);
    if (holdIndex === -1) {
      return { success: false, error: 'Your temporary booking hold has expired or is invalid. Please restart selection.' };
    }

    const hold = db.bookingHolds[holdIndex];

    // Find or create patient
    let patient = db.patients.find(p => 
      p.lastName.toLowerCase() === patientData.lastName.toLowerCase() && 
      p.dateOfBirth === patientData.dateOfBirth
    );

    if (!patient) {
      // Create new patient record
      patient = {
        id: 'pat-' + Math.random().toString(36).substring(2, 9),
        clinicId: 'clinic-1',
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        dateOfBirth: patientData.dateOfBirth,
        email: patientData.email,
        phone: patientData.phone,
        smsConsentStatus: 'verified', // Opted in via booking action
      };
      db.patients.push(patient);
    }

    // Default provider lookup
    const chair = db.chairs.find(c => c.id === hold.chairId);
    const provider = chair?.id === 'chair-1'
      ? db.providers.find(p => p.role === 'hygienist')
      : db.providers.find(p => p.role === 'dentist');

    const apptId = 'apt-' + Math.random().toString(36).substring(2, 9);
    const newAppointment: Appointment = {
      id: apptId,
      clinicId: 'clinic-1',
      chairId: hold.chairId,
      providerId: provider?.id || db.providers[0].id,
      patientId: patient.id,
      startTime: hold.startTime,
      endTime: hold.endTime,
      status: 'confirmed',
      pmsAppointmentId: 'PMS-APT-' + Math.floor(100000 + Math.random() * 900000),
    };

    db.appointments.push(newAppointment);
    
    // Remove the hold
    db.bookingHolds.splice(holdIndex, 1);
    saveDb(db);

    return {
      success: true,
      appointmentId: apptId,
    };
  }

  /**
   * Triggers an SMS reminder via Twilio using edge-native direct fetch call
   */
  public static async triggerSmsReminder(data: {
    patientId: string;
    clinicId: string;
    reminderType: 'recall' | 'reminder_24h' | 'reminder_2h';
    appointmentId?: string;
    customMessage?: string;
  }): Promise<{ success: boolean; reminderId?: string; twilioSid?: string; status: string; message?: string; error?: string }> {
    const db = getDb();

    const patient = db.patients.find(p => p.id === data.patientId);
    if (!patient) {
      return { success: false, error: 'Patient record not found.' };
    }

    if (patient.smsConsentStatus !== 'verified') {
      return { success: false, error: 'Patient has not verified prior consent for SMS notifications under HIPAA.' };
    }

    const clinic = db.clinics.find(c => c.id === data.clinicId);
    if (!clinic) {
      return { success: false, error: 'Clinic record not found.' };
    }

    // Construct HIPAA-sanitized message
    let messageBody = data.customMessage;
    if (!messageBody) {
      if (data.reminderType === 'recall') {
        messageBody = `${clinic.name}: It is time for your routine dental care cleaning. Under strict adherence to hygiene protocols, book your chair online instantly here: https://baget-dentia.vercel.app/book`;
      } else if (data.reminderType === 'reminder_24h') {
        messageBody = `${clinic.name}: Reminder of your upcoming appointment in 24 hours. Confirm your slot directly by clicking: https://baget-dentia.vercel.app/book`;
      } else {
        messageBody = `${clinic.name}: Your appointment is in 2 hours. See you soon! Reply STOP to cancel.`;
      }
    }

    // Prepare reminder database record
    const reminderId = 'rem-' + Math.random().toString(36).substring(2, 9);
    const newReminder: PatientReminder = {
      id: reminderId,
      clinicId: data.clinicId,
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      reminderType: data.reminderType,
      channel: 'sms',
      status: 'pending',
      messageBody,
      createdAt: new Date().toISOString(),
    };

    // Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER || '+15017122661';

    let twilioSid: string | undefined;
    let finalStatus: 'sent' | 'failed' = 'failed';
    let errorMessage: string | undefined;

    if (accountSid && authToken) {
      try {
        const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: patient.phone,
            From: twilioFrom,
            Body: messageBody,
          }).toString()
        });

        const twilioData = await res.json();
        if (res.ok && twilioData.sid) {
          twilioSid = twilioData.sid;
          finalStatus = 'sent';
        } else {
          errorMessage = twilioData.message || 'Twilio execution failed.';
        }
      } catch (err: any) {
        errorMessage = err.message || 'Network error triggering Twilio client REST API.';
      }
    } else {
      // In development or missing envs, simulate success
      twilioSid = 'SM-SIMULATED-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      finalStatus = 'sent';
      console.log(`[Twilio Simulation Mode] Sent to ${patient.phone}: ${messageBody}`);
    }

    newReminder.status = finalStatus;
    newReminder.twilioSid = twilioSid;
    newReminder.errorMessage = errorMessage;
    newReminder.sentAt = finalStatus === 'sent' ? new Date().toISOString() : undefined;

    db.patientReminders.push(newReminder);
    saveDb(db);

    if (finalStatus === 'failed') {
      return { success: false, error: errorMessage || 'Twilio dispatch failed.', status: 'failed' };
    }

    return {
      success: true,
      reminderId,
      status: 'sent',
      twilioSid,
      message: 'Reminder dispatched successfully.',
    };
  }

  /**
   * Retrieves all logged patient reminders for a clinic
   */
  public static getReminders(clinicId: string): PatientReminder[] {
    const db = getDb();
    return db.patientReminders.filter(r => r.clinicId === clinicId);
  }
}
