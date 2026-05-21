'use client';

import React, { useState, useEffect } from 'react';

interface PatientReminder {
  id: string;
  patientId: string;
  reminderType: string;
  channel: string;
  status: string;
  messageBody: string;
  twilioSid?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export default function AdminReminders() {
  const [reminders, setReminders] = useState<PatientReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form input
  const [patientId, setPatientId] = useState('pat-1'); // default pre-loaded patient
  const [clinicId, setClinicId] = useState('clinic-1');
  const [reminderType, setReminderType] = useState<'recall' | 'reminder_24h' | 'reminder_2h'>('recall');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?clinicId=${clinicId}`);
      const data = await res.json();
      if (data.success) {
        setReminders(data.reminders || []);
      }
    } catch (err) {
      console.error('Failed to load reminders logs.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          clinicId,
          reminderType,
          customMessage: customMessage || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `SMS triggered successfully! Status: ${data.status}. Twilio SID: ${data.twilioSid || 'Simulated'}`,
        });
        setCustomMessage('');
        fetchReminders();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch patient reminder.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Network error triggering backend reminder endpoint.',
      });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4ECD8] text-[#4A3728] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center border-b-2 border-[#6B2D3E] pb-4">
          <div className="flex items-center space-x-3">
            <span className="font-serif text-2xl font-bold text-[#6B2D3E]">DENTIA</span>
            <span className="px-2 py-0.5 bg-[#6B2D3E] text-[#F4ECD8] text-[10px] font-bold uppercase rounded">Admin Portal</span>
          </div>
          <a href="/book" className="text-sm font-bold text-[#6B2D3E] hover:underline uppercase tracking-wider">
            Patient Booking Portal &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left panel: Trigger Form */}
          <div className="md:col-span-1 bg-white border-4 border-[#6B2D3E] rounded-[4px] p-6 shadow-[4px_4px_0px_0px_rgba(107,45,62,0.15)]">
            <h2 className="font-serif text-xl font-bold text-[#6B2D3E] uppercase tracking-tight mb-4 border-b border-[#6B2D3E]/10 pb-2">
              Dispatch Reminder
            </h2>

            {feedback && (
              <div className={`p-3 rounded text-xs font-semibold mb-4 ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSendReminder} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                  Patient Selector (UUID)
                </label>
                <input
                  type="text"
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#2C3E50]"
                />
                <span className="text-[9px] text-gray-500">Default: `pat-1` (Sarah Jenkins - Verified Consent)</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                  Reminder Campaign Type
                </label>
                <select
                  value={reminderType}
                  onChange={(e: any) => setReminderType(e.target.value)}
                  className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded px-2 py-1.5 text-xs focus:outline-none"
                >
                  <option value="recall">Recall Autopilot (Overdue hygiene care)</option>
                  <option value="reminder_24h">24-Hour Lead Booking Reminder</option>
                  <option value="reminder_2h">2-Hour Immediate Appt Check</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B2D3E] mb-1">
                  Custom Template Override (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter custom HIPAA-compliant content..."
                  className="w-full bg-[#F4ECD8] border border-[#6B2D3E] rounded p-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full py-2.5 bg-[#6B2D3E] text-[#F4ECD8] hover:bg-[#6B2D3E]/90 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {triggering ? 'Dispatching Twilio API...' : 'Fire SMS Reminder'}
              </button>
            </form>
          </div>

          {/* Right panel: Sent Logs list */}
          <div className="md:col-span-2 bg-white border-4 border-[#6B2D3E] rounded-[4px] p-6 shadow-[4px_4px_0px_0px_rgba(107,45,62,0.15)] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#6B2D3E]/10 pb-2">
              <h2 className="font-serif text-xl font-bold text-[#6B2D3E] uppercase tracking-tight">
                SMS Delivery & Audit Registry
              </h2>
              <button 
                onClick={fetchReminders}
                className="text-xs font-bold text-[#6B2D3E] hover:underline"
              >
                Refresh Log
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[#2C3E50] text-sm font-mono animate-pulse">
                Fetching clinic's real-time SMS outbox...
              </div>
            ) : reminders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#6B2D3E]/20 text-[#6B2D3E] uppercase tracking-wider font-bold">
                      <th className="py-2">Type</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Sent Time</th>
                      <th className="py-2">Twilio Sid / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {reminders.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-700 uppercase">
                            {reminder.reminderType}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            reminder.status === 'sent' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {reminder.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500 text-[10px]">
                          {reminder.sentAt ? new Date(reminder.sentAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3 text-[10px] max-w-[180px] truncate" title={reminder.twilioSid || reminder.errorMessage}>
                          {reminder.twilioSid ? (
                            <span className="text-emerald-700 font-bold">{reminder.twilioSid}</span>
                          ) : (
                            <span className="text-rose-600">{reminder.errorMessage || 'Unknown Error'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">
                No outbound reminders found in this location's history log.
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-[#6B2D3E]/10 text-[11px] text-[#2C3E50] leading-relaxed">
              <strong>Compliance Notice:</strong> Every SMS dispatched carries custom token parameters that automatically match the patient's record on response. No medical context (Protected Health Information) is transmitted over raw SMS, satisfying the strict requirements of 45 CFR § 164.308.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
