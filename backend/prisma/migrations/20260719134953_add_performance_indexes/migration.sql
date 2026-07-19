-- CreateIndex
CREATE INDEX "Appointment_patientId_createdAt_idx" ON "Appointment"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_slotId_idx" ON "Appointment"("slotId");

-- CreateIndex
CREATE INDEX "Doctor_specialty_idx" ON "Doctor"("specialty");

-- CreateIndex
CREATE INDEX "DoctorClinic_clinicId_idx" ON "DoctorClinic"("clinicId");

-- CreateIndex
CREATE INDEX "Slot_doctorId_status_startAt_idx" ON "Slot"("doctorId", "status", "startAt");

-- CreateIndex
CREATE INDEX "TimeOff_doctorId_startAt_idx" ON "TimeOff"("doctorId", "startAt");
