'use client';

import React, { useState, useEffect } from 'react';

interface Slot {
  time: string;
  chairId: string;
  chairName: string;
  providerId: string;
}

export default function BookAppointment() {
  const [selectedDate, setSelectedDate] = useState('2026-05-28');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [holdExpires, setHoldExpires] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Patient form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
  });

  const [bookingStatus, setBookingStatus] = useState<'idle' | 'holding' | 'booking' | 'confirmed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedApptId, setConfirmedApptId] = useState('');

  // Clean hold on unmount or refresh
  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  // Handle countdown timer for hold expiration
  useEffect(() => {
    if (!holdExpires) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = holdExpires - now;

      if (diff <= 0) {
        setHoldToken(null);
        setHoldExpires(null);
        setSelectedSlot(null);
        setBookingStatus('idle');
        setErrorMessage('Your 10-minute reservation hold has expired. Please choose another time slot.');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpires]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/booking?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots || []);
      } else {
        setErrorMessage(data.error || 'Failed to fetch slots.');
      }
    } catch (err) {
      setErrorMessage('Network error trying to fetch available appointment slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = async (slot: Slot) => {
    setErrorMessage('');
    setBookingStatus('booking');
    
    const startTimeIso = `${selectedDate}T${slot.time}:00.000Z`;

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hold',
          chairId: slot.chairId,
          startTime: startTimeIso,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedSlot(slot);
        setHoldToken(data.token);
        setHoldExpires(Date.now() + 10 * 60 * 1000); // 10 minutes
        setBookingStatus('holding');
      } else {
        setErrorMessage(data.error || 'That time slot is no longer available. Please select another slot.');
        setBookingStatus('idle');
        fetchSlots(); // refresh
      }
    } catch (err) {
      setErrorMessage('Failed to connect to the booking engine. Please try again.');
      setBookingStatus('idle');
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdToken) return;

    setErrorMessage('');
    setBookingStatus('booking');

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          token: holdToken,
          patient: formData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedApptId(data.appointmentId);
        setBookingStatus('confirmed');
      } else {
        setErrorMessage(data.error || 'Failed to finalize your appointment booking.');
        setBookingStatus('holding');
      }
    } catch (err) {
      setErrorMessage('Communication error during booking write-back. Please contact support.');
      setBookingStatus('holding');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4ECD8] text-[#4A3728] p-4 md:p-8 flex items-center justify-center font-sans selection:bg-[#6B2D3E] selection:text-[#F4ECD8]">
      <div className="max-w-2xl w-full bg-[#FFFFFF] border-4 border-[#6B2D3E] rounded-[4px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(107,45,62,0.15)] relative">
        
        {/* Retro style paper lines */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#6B2D3E]" />

        <div className="text-center mb-8 mt-2">
          <h1 className="font-serif text-3xl md:text-4xl text-[#6B2D3E] tracking-tight leading-tight uppercase font-bold">
            Dentia Appointment Registry
          </h1>
          <p className="text-sm font-medium text-[#2C3E50] tracking-wide mt-2 uppercase">
            Direct-to-Calendar Practice Scheduler
          </p>
          <div className="w-24 h-1 bg-[#6B2D3E] mx-auto mt-4" />
        </div>

        {errorMessage && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#881337] p-4 rounded-[4px] mb-6 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {bookingStatus !== 'confirmed' ? (
          <div>
            {/* Step 1: Select Date & Slot */}
            {bookingStatus === 'idle' && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-bold uppercase tracking-wider text-[#6B2D3E] mb-2">
                    Select Target Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min="2026-05-21"
                    className="w-full bg-[#F4ECD8] border-2 border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] font-mono focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B2D3E] mb-3">
                    Available Time Slots for {selectedDate}
                  </h3>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8 text-[#2C3E50] font-mono animate-pulse">
                      Reading live clinic calendar availability...
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectSlot(slot)}
                          className="bg-[#F4ECD8] border border-[#6B2D3E] text-left p-3 rounded-[4px] hover:bg-[#6B2D3E] hover:text-[#F4ECD8] transition-colors group cursor-pointer"
                        >
                          <div className="font-mono font-bold text-lg">{slot.time}</div>
                          <div className="text-xs uppercase opacity-75 mt-1 group-hover:text-[#F4ECD8]">
                            {slot.chairName}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-[#6B2D3E]/30 rounded-[4px] text-sm text-[#2C3E50]">
                      No active chairs available for booking on this date.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Patient Info & Hold Form */}
            {bookingStatus === 'holding' && selectedSlot && (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div className="bg-[#6B2D3E]/5 border border-[#6B2D3E] p-4 rounded-[4px] flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#2C3E50] font-bold">Temporarily Locked Slot</p>
                    <p className="font-serif font-bold text-lg text-[#6B2D3E]">
                      {selectedDate} at {selectedSlot.time} ({selectedSlot.chairName})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-[#2C3E50] font-bold">Lock Expires In</p>
                    <p className="font-mono text-xl font-bold text-[#EF4444]">{timeLeft}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      max="2026-05-21"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] font-mono focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="555-0199"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded-[4px] px-3 py-2 text-[#4A3728] focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  />
                </div>

                <div className="text-xs text-[#2C3E50] leading-relaxed border-t border-[#6B2D3E]/20 pt-4">
                  By booking, you authorize Dentia Dental Care to transmit essential transaction updates via SMS. No clinical treatment parameters will be included in the texts under strict adherence to HIPAA guidelines.
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHoldToken(null);
                      setHoldExpires(null);
                      setSelectedSlot(null);
                      setBookingStatus('idle');
                    }}
                    className="flex-1 py-3 bg-transparent border-2 border-[#6B2D3E] text-[#6B2D3E] font-bold uppercase tracking-wider rounded-[4px] hover:bg-[#6B2D3E]/5 transition-colors cursor-pointer text-sm"
                  >
                    Cancel Hold
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#6B2D3E] border-2 border-[#6B2D3E] text-[#F4ECD8] font-bold uppercase tracking-wider rounded-[4px] hover:bg-[#6B2D3E]/90 transition-colors cursor-pointer text-sm"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            )}

            {bookingStatus === 'booking' && (
              <div className="text-center py-16 space-y-4">
                <div className="inline-block w-8 h-8 border-4 border-[#6B2D3E] border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-sm uppercase tracking-wider text-[#2C3E50]">
                  Executing secure database handshake...
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Confirmation State */
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-[#10B981]/10 border-2 border-[#10B981] rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#6B2D3E] uppercase tracking-tight">
                Appointment Registered
              </h2>
              <p className="text-sm text-[#2C3E50] max-w-md mx-auto">
                The appointment slot was written back successfully to Dentia Dental Care's PMS database.
              </p>
            </div>

            <div className="bg-[#F4ECD8] p-4 rounded-[4px] border border-[#6B2D3E] max-w-sm mx-auto text-left font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-[#6B2D3E]">PATIENT:</span>
                <span>{formData.lastName.toUpperCase()}, {formData.firstName.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#6B2D3E]">DATETIME:</span>
                <span>{selectedDate} @ {selectedSlot?.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#6B2D3E]">OPERATORY:</span>
                <span>{selectedSlot?.chairName.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-t border-[#6B2D3E]/20 pt-2 mt-2">
                <span className="font-bold text-[#2C3E50]">PMS REF ID:</span>
                <span className="text-[#6B2D3E] font-bold">{confirmedApptId}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '' });
                setSelectedSlot(null);
                setHoldToken(null);
                setHoldExpires(null);
                setBookingStatus('idle');
                fetchSlots();
              }}
              className="py-3 px-6 bg-[#6B2D3E] text-[#F4ECD8] font-bold uppercase tracking-wider rounded-[4px] hover:bg-[#6B2D3E]/90 transition-colors cursor-pointer text-sm"
            >
              Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
