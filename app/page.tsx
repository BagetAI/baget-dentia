'use client';

import React, { useState } from 'react';

export default function LandingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    practiceEmail: '',
    practiceName: '',
    currentPms: 'Open Dental',
    chairCount: '1-2 Chairs',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong. Please check your inputs and try again.');
      }
    } catch (err) {
      setError('Failed to connect to waitlist database. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-serif text-2xl font-bold tracking-widest text-[#0F5E64]">DENTIA</span>
            <span className="px-2 py-0.5 bg-[#EBF7F7] text-[#0F5E64] text-[10px] font-bold uppercase rounded">Zero-IT SaaS</span>
          </div>
          <a 
            href="/book" 
            className="text-xs font-bold uppercase tracking-wider text-[#0F5E64] hover:text-[#00B1A7] transition-colors border border-[#0F5E64] px-4 py-2 rounded"
          >
            Live Demo Scheduler &rarr;
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Brand Copy */}
        <div className="lg:col-span-7 space-y-6">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#2C3E50] font-bold leading-tight">
            Stop playing phone tag. Stop losing patients to the busy tone.
          </h1>
          <p className="text-lg md:text-xl text-[#64748B] leading-relaxed">
            The zero-IT, software-only assistant built specifically for 1-4 chair dental practices. 
            Automate patient recalls, offer direct-to-calendar online booking, and track insurance pre-authorizations in one clean dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-semibold text-[#2C3E50]">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-[#00B1A7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>No proprietary desk phones required</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-[#00B1A7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Flexible month-to-month contracts</span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Converting Waitlist Form */}
        <div className="lg:col-span-5">
          <div className="bg-white border-2 border-slate-200 rounded-lg p-6 md:p-8 shadow-xl">
            {success ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-[#10B981]/10 border-2 border-[#10B981] rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#2C3E50]">Priority Spot Secured</h3>
                <p className="text-sm text-[#64748B]">
                  Thank you! Your dental clinic is registered for our Q3 2026 early access program. We will reach out shortly to coordinate your 15-minute remote setup.
                </p>
                <div className="pt-4">
                  <a 
                    href="/book" 
                    className="inline-block px-6 py-3 bg-[#0F5E64] text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-[#00B1A7] transition-colors"
                  >
                    Try the Live Patient Widget
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h3 className="font-serif text-xl font-bold text-[#2C3E50]">Join the Q3 2026 Beta</h3>
                  <p className="text-xs text-[#64748B] mt-1">Free 15-minute remote sync. No setup fees.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 text-xs rounded font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Sarah Jenkins"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5E64] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Practice Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Oakridge Family Dentistry"
                    value={formData.practiceName}
                    onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5E64] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Practice Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="office@oakridgedentistry.com"
                    value={formData.practiceEmail}
                    onChange={(e) => setFormData({ ...formData, practiceEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5E64] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                      Current PMS
                    </label>
                    <select
                      value={formData.currentPms}
                      onChange={(e) => setFormData({ ...formData, currentPms: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs focus:outline-none"
                    >
                      <option value="Open Dental">Open Dental</option>
                      <option value="Dentrix">Dentrix</option>
                      <option value="Eaglesoft">Eaglesoft</option>
                      <option value="Other">Other Software</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                      Chair Size
                    </label>
                    <select
                      value={formData.chairCount}
                      onChange={(e) => setFormData({ ...formData, chairCount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs focus:outline-none"
                    >
                      <option value="1-2 Chairs">1-2 Chairs</option>
                      <option value="3-4 Chairs">3-4 Chairs</option>
                      <option value="5+ Chairs">5+ Chairs</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0F5E64] text-white hover:bg-[#00B1A7] text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Securing DB Spot...' : 'Secure My Priority Beta Slot'}
                </button>

                <p className="text-[10px] text-center text-[#64748B]">
                  Join 40+ dental clinics transitioning to zero-IT automation.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Practice Economics Table */}
      <section className="bg-[#EBF7F7]/60 py-16 border-t border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-3 mb-12">
            <h2 className="font-serif text-3xl font-bold text-[#2C3E50]">
              The High Cost of Manual Front-Desk Admin
            </h2>
            <p className="text-slate-600 max-w-lg mx-auto text-sm">
              See how moving from spreadsheets, notes, and desk phones to Dentia's autonomous system impacts clinic operations:
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[#2C3E50] uppercase tracking-wider font-bold text-xs">
                  <th className="px-6 py-4">Administrative Action</th>
                  <th className="px-6 py-4 text-rose-700">Traditional Method Cost</th>
                  <th className="px-6 py-4 text-[#0F5E64]">Dentia Automated Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-semibold text-[#2C3E50]">Patient No-Shows</td>
                  <td className="px-6 py-4 text-rose-700">$20k - $70k lost revenue annually</td>
                  <td className="px-6 py-4 text-[#0F5E64]">Automatic 2-way SMS alerts reduce no-shows by 22%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-[#2C3E50]">Eligibility Calls</td>
                  <td className="px-6 py-4 text-rose-700">15 mins per patient (5-7 hrs daily)</td>
                  <td className="px-6 py-4 text-[#0F5E64]">Automated electronic EDI 278 real-time verification</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-[#2C3E50]">Hygiene Recalls</td>
                  <td className="px-6 py-4 text-rose-700">Hours of manual outreach phone tag</td>
                  <td className="px-6 py-4 text-[#0F5E64]">Autonomous Recall Engine texts patient direct booking links</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-[#2C3E50]">IT Setup & Hardware</td>
                  <td className="px-6 py-4 text-rose-700">Up to $750 plus expensive desk phone buy-ins</td>
                  <td className="px-6 py-4 text-[#0F5E64]">100% software-only. Runs on existing office computers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2C3E50] text-slate-300 py-12 border-t border-slate-700">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-serif text-xl font-bold tracking-widest text-white">DENTIA</span>
            <span className="text-xs text-slate-400">Copyright &copy; 2026. All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-xs uppercase tracking-wider font-semibold">
            <a href="/book" className="hover:text-[#00B1A7] transition-colors">Client Demo Scheduler</a>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">HIPAA Compliant BAA Guarantee</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
