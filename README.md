# Bytes Quantum Template Base

Welcome to the **Bytes Quantum Template Base** project. Below are six test case scenarios (1 Success Flow and 1 Failed Flow for each configuration) that you can copy and paste directly into the intake form to test the evaluation engine.

---

## 📝 Sample Inputs for Ingestion & Judgment Testing

### 1. Service Team Readiness (`service.team_readiness`)

#### 🟢 Success Flow (Lolos Kepatuhan)
*   **Representative ID (`repId`)**: `REP-01`
*   **Team Name (`teamName`)**: `Alpha`
*   **Scenario Name (`scenario`)**: `Slow Connection`
*   **Interaction Transcript (`transcript`)**:
    ```text
    Customer: Internet saya lambat sekali hari ini.
    Agent: Baik, boleh tahu apakah lambat di semua HP atau hanya di satu laptop? Dan apakah sudah dicoba restart modemnya?
    Customer: Lambat di semua HP, modem sudah di-restart tetap sama.
    Agent: Oke, kalau begitu saya bantu jadwalkan kunjungan teknisi besok jam 10 pagi ya.
    ```
*   **Observer Notes (`notes`)**: `Lolos kriteria`
*   **Audio/Video Recording (`audioVideoFile`)**: *(Upload any audio or video file)*

#### 🔴 Failed Flow (Gagal Kepatuhan)
*   **Representative ID (`repId`)**: `REP-02`
*   **Team Name (`teamName`)**: `Alpha`
*   **Scenario Name (`scenario`)**: `Slow Connection`
*   **Interaction Transcript (`transcript`)**:
    ```text
    Customer: Internet saya lambat sekali hari ini.
    Agent: Langsung beli paket booster internet tambahan saja biar cepat.
    ```
*   **Observer Notes (`notes`)**: `Tidak melakukan discovery dan langsung merekomendasikan booster.`
*   **Audio/Video Recording (`audioVideoFile`)**: *(Optional)*

---

### 2. F&B Audit Readiness (`fnb.audit_readiness`)

#### 🟢 Success Flow (Lolos Kepatuhan)
*   **Employee ID (`employeeId`)**: `EMP-FNB-01`
*   **Branch / Location Name (`branchName`)**: `Sudirman-FoodCourt`
*   **Criterion (`criterionId`)**: `criterion_handwashing_station`
*   **Checklist Answer (`checklistAnswer`)**: `yes`
*   **Shift (`shift`)**: `mid`
*   **Media Attachments (`mediaUrls`)**: *(Upload an image of the clean handwashing station)*
*   **Notes / Comments (`note`)**: `Handwashing station has plenty of soap, paper towels, hot water running at 40C, and clear access pathway.`

#### 🔴 Failed Flow (Gagal Kepatuhan)
*   **Employee ID (`employeeId`)**: `EMP-FNB-99`
*   **Branch / Location Name (`branchName`)**: `Jakarta-Sudirman`
*   **Criterion (`criterionId`)**: `criterion_cold_storage_labeling`
*   **Checklist Answer (`checklistAnswer`)**: `no`
*   **Shift (`shift`)**: `opening`
*   **Media Attachments (`mediaUrls`)**: *(Upload an image of the unlabeled storage)*
*   **Notes / Comments (`note`)**: `Cold storage container with raw chicken was found unlabeled and undated in the main walk-in freezer.`

---

### 3. Employee Compliance Review (`allied-financial-insurance-employee-compliance`)

#### 🟢 Success Flow (Lolos Kepatuhan)
*   **Employee ID (`employeeId`)**: `EMP-7712`
*   **Company (`company`)**: `Allied Financial Insurance`
*   **Training Completion Date (`trainingCompletionDate`)**: `2026-02-15` *(Within the last year from current date June 2026)*
*   **Training Certificate (`trainingCertificate`)**: *(Upload a training certificate PDF)*
*   **Compliance Quiz Score (`complianceQuizScore`)**: `85` *(80% or higher threshold)*
*   **Signed Compliance Form (`signedComplianceForm`)**: *(Upload a signed compliance form PDF)*
*   **Notes / Comments on Issues (`notes`)**: `All training certificates and signed forms are complete and up-to-date.`

#### 🔴 Failed Flow (Gagal Kepatuhan - Quiz Score Below Minimum)
*   **Employee ID (`employeeId`)**: `EMP-7713`
*   **Company (`company`)**: `Allied Financial Insurance`
*   **Training Completion Date (`trainingCompletionDate`)**: `2026-02-15`
*   **Training Certificate (`trainingCertificate`)**: *(Upload a training certificate PDF)*
*   **Compliance Quiz Score (`complianceQuizScore`)**: `70` *(Below mandatory 80% passing threshold)*
*   **Signed Compliance Form (`signedComplianceForm`)**: *(Upload a signed compliance form PDF)*
*   **Notes / Comments on Issues (`notes`)**: `Quiz score did not meet the mandatory 80% passing threshold.`
