-- Database Schema Specification for Dentia (PostgreSQL Compatible)
-- Optimized for 1-4 chair independent practices with no on-site IT

-- 1. Clinics table (supports multi-site in future, default single site)
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/New_York' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Chairs / Operatories table (1-4 chairs per practice)
CREATE TABLE chairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "Chair 1", "Operatory A"
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_chairs_clinic ON chairs(clinic_id) WHERE is_active = TRUE;

-- 3. Providers (Dentists / Hygienists)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'dentist', 'hygienist'
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_providers_clinic ON providers(clinic_id) WHERE is_active = TRUE;

-- 4. Patients table with strict consent and identity verification flags
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    pms_internal_id VARCHAR(100), -- ID from Open Dental / Dentrix
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL, -- Required for secure booking DOB match verification
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    sms_consent_status VARCHAR(50) DEFAULT 'unknown' NOT NULL, -- 'verified', 'denied', 'unknown'
    sms_consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_patients_pms_id ON patients(clinic_id, pms_internal_id);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_dob_search ON patients(last_name, date_of_birth);

-- 5. Appointments table with concurrency control and status mapping
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    chair_id UUID REFERENCES chairs(id) NOT NULL,
    provider_id UUID REFERENCES providers(id) NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'unscheduled', 'hold', 'pending_pms', 'confirmed', 'released', 'conflict_failed'
    pms_appointment_id VARCHAR(100), -- ID of written back appt in local PMS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_appt_times CHECK (start_time < end_time)
);

-- Indexes to prevent double booking and speed up availability queries
CREATE INDEX idx_appointments_time_range ON appointments (chair_id, start_time, end_time) 
WHERE status IN ('hold', 'pending_pms', 'confirmed');

CREATE INDEX idx_appointments_patient ON appointments (patient_id);

-- 6. Temporary Booking Holds for double-booking prevention (10-minute lock)
CREATE TABLE booking_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chair_id UUID REFERENCES chairs(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    token VARCHAR(100) UNIQUE NOT NULL, -- Generated secure token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_booking_holds_expiration ON booking_holds (expires_at);
CREATE INDEX idx_booking_holds_overlap ON booking_holds (chair_id, start_time, end_time);
