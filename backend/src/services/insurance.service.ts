import { randomUUID } from 'node:crypto';

export interface EligibilityResult {
  eligible: boolean;
  verificationRef: string;
}

const CLEARINGHOUSE_LATENCY_MS = 150;

export async function verifyEligibilityMock(
  _patientId: string | null,
): Promise<EligibilityResult> {
  await new Promise((resolve) => setTimeout(resolve, CLEARINGHOUSE_LATENCY_MS));

  return {
    eligible: true,
    verificationRef: `mock_elig_${randomUUID().slice(0, 12)}`,
  };
}
