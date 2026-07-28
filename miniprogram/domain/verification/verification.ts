import {
  buildVerificationPatch as buildVerificationPatchCore,
  getDueVerificationRecord as getDueVerificationRecordCore,
  getVerificationLabel as getVerificationLabelCore,
  isVerificationDue as isVerificationDueCore,
  resolveDeferAction as resolveDeferActionCore,
  summarizeVerifications as summarizeVerificationsCore,
  VERIFICATION_FIRST_WINDOW_DAYS,
  VERIFICATION_LABELS,
  VERIFICATION_SECOND_WINDOW_DAYS,
} from './verification.core'

export { VERIFICATION_FIRST_WINDOW_DAYS, VERIFICATION_LABELS, VERIFICATION_SECOND_WINDOW_DAYS }

export type VerificationStatus = 'fulfilled' | 'unfulfilled' | 'deferred' | 'unclear'

export interface VerificationState {
  status: VerificationStatus
  updated_at: string
}

export interface VerificationSummary {
  fulfilled: number
  unfulfilled: number
  unclear: number
  deferred: number
  settled: number
  total: number
  rate: number
}

export function isVerificationDue(record: unknown, now: Date = new Date()): boolean {
  return isVerificationDueCore(record, now)
}

export function getDueVerificationRecord<T>(records: T[], now: Date = new Date()): T | null {
  return getDueVerificationRecordCore(records, now) as T | null
}

export function buildVerificationPatch(
  status: VerificationStatus,
  now: Date = new Date(),
): { verification: VerificationState } {
  return buildVerificationPatchCore(status, now) as { verification: VerificationState }
}

export function resolveDeferAction(record: unknown): VerificationStatus {
  return resolveDeferActionCore(record) as VerificationStatus
}

export function summarizeVerifications(records: unknown[]): VerificationSummary {
  return summarizeVerificationsCore(records) as VerificationSummary
}

export function getVerificationLabel(record: unknown): string {
  return getVerificationLabelCore(record)
}
