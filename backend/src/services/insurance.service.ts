// Mock insurance eligibility check. No real clearinghouse is called, but the
// shape mirrors reality: before a clinic confirms a visit it often verifies
// coverage with an external service, and that call takes real wall-clock time.
//
// The artificial delay matters: it models the network round-trip, and it sits
// right in the middle of the booking flow's check-then-write window — which
// is what makes the Gap 5 race condition reliably reproducible in tests.
// (The race exists without the delay too; the delay just widens the window
// from microseconds to ~150ms.)
import { randomUUID } from 'node:crypto';

export interface EligibilityResult {
  eligible: boolean;
  verificationRef: string;
}

const CLEARINGHOUSE_LATENCY_MS = 150;

export async function verifyEligibilityMock(_patientId: string): Promise<EligibilityResult> {
  await new Promise((resolve) => setTimeout(resolve, CLEARINGHOUSE_LATENCY_MS));

  // Always eligible. A fun extension: make it fail ~10% of the time and
  // handle that in the booking flow (which is where the REQUESTED state of
  // the Gap 1 machine earns its keep).
  return {
    eligible: true,
    verificationRef: `mock_elig_${randomUUID().slice(0, 12)}`,
  };
}
