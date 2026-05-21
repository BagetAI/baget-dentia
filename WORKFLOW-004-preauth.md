# WORKFLOW-004-preauth.md: Insurance Pre-Authorization Tracking Specification
**Status**: Approved
**Author**: Alex (Product Manager)
**Last Updated**: May 21, 2026
**Version**: 1.0

---

## 1. Problem Statement

For independent 1-4 chair dental clinics with no dedicated IT support, tracking insurance pre-authorizations ("pre-auths") for major procedures (such as crowns, root canals, bridges, and implants) is a primary operational bottleneck. Because these clinics lack automated tracking tools, they rely on highly fragile manual systems:
*   **The Paper Drawer & Sticky Note System**: Office managers print a copy of the pre-auth request, file it in a accordion folder by month, or stick notes to the front desk monitor.
*   **The Spreadsheet Trap**: Staff manually transcribe patient names, insurance carriers, submission dates, and procedure codes into static Excel or Google sheets.
*   **The Hold-Time Black Hole**: Every week, the office manager spends 3-5 hours on hold calling dental insurance PPO/HMO carriers to check the status of claims.
*   **Lost Clinical Revenue**: Due to administrative delays, pre-auth approvals sit unnoticed. Treatment plans stall, patients drift away, and clinical chairs sit empty. This directly causes thousands of dollars in monthly revenue leaks per practice.

---

## 2. Solution Overview

Dentia automates the insurance pre-authorization lifecycle by reading treatment plans directly from the clinic's Practice Management Software (PMS) via the outbound-only **PMS Sync Daemon**. 

```
+------------------+     Outbound Poll     +-------------------+     Visual Board      +-----------------------+
|  Local PMS DB    | ────────────────────► |   Dentia Cloud    | ────────────────────► | Interactive Kanban    |
| (Open Dental,    |   Sync Daemon SEC   |  (Ingest & Track) |  - Age Calculation    |  - Auto Payer 278 Tx  |
|  Dentrix, etc.)  |                       |                   |  - SLA Flagging       |  - Automated Patient  |
+------------------+                       +-------------------+                       |    SMS Scheduling     |
                                                                                       +-----------------------+
```

Our lightweight software-only service ingests pre-auth claims, visualizes them in a digital Kanban-style board, automatically tracks aging days against carrier-specific SLAs, and triggers automated SMS booking hooks the moment approval is secured.

---

## 3. Step-by-Step Logic Map (Manual to Automated)

| Phase | Traditional Manual Process | Dentia Automated Software Logic |
| :--- | :--- | :--- |
| **1. Capture** | Office manager manually logs a pre-auth submission in an Excel spreadsheet or writes it on a binder log. | The **PMS Sync Daemon** polls the local PMS database every 10 minutes. It detects new rows in the claim/pre-auth tables with `claim_type = 'PreAuth'` and pulls metadata to the cloud. |
| **2. Pipeline Ingestion** | Paper copy is placed in a physical "Pending" folder. No active notifications are set. | Ingests the pre-auth record into the `insurance_pre_auths` table and places it in the **Submitted** column of the interactive Kanban board. Sets `submitted_at` timestamp. |
| **3. Age & SLA Tracking** | Staff must manually calculate how many days have passed by looking at the submission calendar. | Nightly scheduler runs an aging calculation: `elapsed_days = current_date - submitted_date`. Updates visual indicators (e.g., Yellow warning if >14 days, Red alert if >30 days). |
| **4. Payer Follow-Up** | Office manager calls the carrier, navigates IVR phone menus, and sits on hold to request updates. | At **Day 21**, Dentia initiates a secure **EDI 278 Health Care Services Review** transaction query via our clearinghouse integration to check the electronic adjudication status automatically. |
| **5. Task Escalation** | If forgot, the pre-auth sits indefinitely. Patients are only called if they contact the clinic. | If EDI 278 is unavailable or returns pending status at **Day 30**, the pre-auth is pushed to the office manager's "Action Required" dashboard queue with a pre-written call script. |
| **6. Closure & Booking** | Once mail arrives or status is checked, staff write down the approval and try to phone-tag the patient. | The **PMS Sync Daemon** reads the updated status from the local PMS, or the office manager toggles the Kanban card to **Approved**. This instantly fires a target SMS booking text. |

---

## 4. State Transition Machine

Every pre-authorization record advances through a structured, transactional lifecycle. Below is the strict state diagram and validation criteria for status transitions:

```
[ SUBMITTED ]
      │
      ├───► (Elapsed Days > 14) ───────────────► [ AGING ]
      │                                             │
      ├───► (EDI 278 Approved / Manual) ────────────┼───┐
      │                                             │   │
      └───► (EDI 278 Denied / Manual) ──────────────┼───┼───┐
                                                    │   │   │
                                                    ▼   │   │
                                                [ OVERDUE ] │
                                                    │   │   │
                                                    ├───┼───┤
      ┌─────────────────────────────────────────────┘   │   │
      │                                                 │   │
      ▼                                                 ▼   ▼
[ MANUAL_FOLLOW_UP ] ───────────────────────────► [ APPROVED ] / [ DENIED ]
                                                        │
                                                        ▼ (Trigger SMS)
                                                  [ COMPLETED ]
```

### State Registry & Action Triggers

*   **SUBMITTED**: Initial state when the PMS Sync Daemon detects a pre-authorization claim.
    *   *Trigger*: Claim extraction.
    *   *System Action*: Set `status = 'submitted'`, calculate SLA target date.
*   **AGING**: Claims that remain unpaid/unadjudicated beyond 14 days.
    *   *Trigger*: `elapsed_days > 14` AND `status = 'submitted'`.
    *   *System Action*: Highlight card in yellow on dashboard.
*   **OVERDUE**: Claims exceeding 30 days without an adjudication status.
    *   *Trigger*: `elapsed_days > 30` AND `status = 'aging'`.
    *   *System Action*: Highlight card in red. Queue automated EDI 278 Inquiry check.
*   **MANUAL_FOLLOW_UP**: Scheduled when EDI checks fail or require manual intervention.
    *   *Trigger*: EDI 278 returns error, or elapsed days exceed 40.
    *   *System Action*: Promote to the office manager's high-priority call queue. Show carrier phone number, policy ID, and script.
*   **APPROVED**: Carrier has approved the pre-authorization.
    *   *Trigger*: PMS database update sync (`claim_status = 'Approved'`) OR manual drag-and-drop on the Kanban board.
    *   *System Action*: Trigger the patient booking sequence. Dispatch a customizable, automated SMS recall text with a direct, secure scheduling link.
*   **DENIED**: Carrier has rejected the pre-authorization.
    *   *Trigger*: PMS database update sync OR manual drag-and-drop.
    *   *System Action*: Notify clinic staff via dashboard alert to resolve claims or review alternative treatment options with the patient.

---

## 5. SQL Schema Additions

To support pre-authorization tracking within the existing database schema structure, the following PostgreSQL compatible tables and indices are defined:

```sql
-- 1. Insurance Pre-Authorizations Table
CREATE TABLE insurance_pre_auths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    pms_pre_auth_id VARCHAR(100) NOT NULL, -- Core identifier from Open Dental/Dentrix
    carrier_name VARCHAR(255) NOT NULL,
    carrier_phone VARCHAR(20),
    subscriber_id VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    estimated_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    procedure_codes VARCHAR(255)[] NOT NULL, -- Array of procedure codes (e.g., {'D2740', 'D3330'})
    status VARCHAR(50) DEFAULT 'submitted' NOT NULL, -- 'submitted', 'aging', 'overdue', 'manual_follow_up', 'approved', 'denied', 'completed'
    submitted_date DATE NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_preauth_status CHECK (status IN ('submitted', 'aging', 'overdue', 'manual_follow_up', 'approved', 'denied', 'completed'))
);

-- Indices for performance and aging calculations
CREATE INDEX idx_pre_auths_clinic_status ON insurance_pre_auths (clinic_id, status);
CREATE INDEX idx_pre_auths_aging_search ON insurance_pre_auths (status, submitted_date) WHERE status IN ('submitted', 'aging', 'overdue');
CREATE INDEX idx_pre_auths_patient ON insurance_pre_auths (patient_id);

-- 2. Pre-Authorization Activity Logs (Tracks manual and automated touches)
CREATE TABLE pre_auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pre_auth_id UUID REFERENCES insurance_pre_auths(id) ON DELETE CASCADE NOT NULL,
    operator_type VARCHAR(50) NOT NULL, -- 'system_edi', 'system_daemon', 'staff_member'
    operator_name VARCHAR(255), -- Staff member name or system process identifier
    action_taken VARCHAR(100) NOT NULL, -- 'status_changed', 'note_added', 'edi_query_dispatched', 'patient_sms_sent'
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pre_auth_logs_parent ON pre_auth_logs (pre_auth_id);
```

---

## 6. Patient SMS Re-Engagement Logic

Once a pre-authorization shifts to the `APPROVED` state, Dentia initiates automated scheduling outreach. The system bypasses manual office phone calls by pairing the approval with our direct-to-calendar booking engine:

```
                  [ Pre-Auth Status -> APPROVED ]
                                 │
                                 ▼
                     [ Run Consent Guard Check ]
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼ (Consent Verified)                        ▼ (No Consent / Denied)
 [ Generate Secure Booking Token ]           [ Queue Dashboard Call Task ]
           │                                 - Prompt: "Consent needed to text"
           ▼
 [ Dispatch Automated SMS Gateway ]
 - Sanitized Body (No PHI / HIPAA Compliant)
 - Secure Direct Link to Clinic Calendar
```

### SMS Template Construction (HIPAA-Sanitized)
Under strict adherence to HIPAA guidelines and our Secure Sanitization Layer, we never transmit specific clinical procedure details, diagnoses, or complex treatment plan descriptions in the SMS message body. 

*   **Approved Pre-Auth SMS Template**: 
    > "Dentia Dental Care: Good news, the dental insurance coverage review for your pending treatment plan has been processed and approved. You can now schedule your appointment directly online. Select a convenient time here: https://baget-dentia.vercel.app/book"
*   **Verification Constraint**: 
    When the patient clicks the link, they are taken to the Dentia Booking widget. The patient must verify their identity by entering their **Last Name** and **Date of Birth** to unlock and schedule the specific reserved operatories and chairs. This action automatically writes the scheduled appointment back to the local PMS, completes the pre-auth tracker lifecycle (`status = 'completed'`), and closes the loop with zero manual administrative overhead.
