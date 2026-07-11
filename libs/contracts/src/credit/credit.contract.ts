export type LedgerReasonType =
  | 'TOPUP'
  | 'GENERATE_VIDEO'
  | 'GENERATE_IMAGE'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'BONUS';

export type ReferenceTypeValue = 'PAYMENT' | 'MEDIA_JOB' | 'MANUAL' | 'BONUS';

export interface CreditMutationResult {
  ledgerId: string;
  userId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface CreditBalanceResponse {
  userId: string;
  creditBalance: number;
}

export interface CreditHistoryItem {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  type: 'CREDIT' | 'DEBIT';
  reason: LedgerReasonType;
  note: string | null;
  referenceType: ReferenceTypeValue;
  referenceId: string | null;
  createdAt: string;
}

export interface CreditHistoryResponse {
  items: CreditHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreditHistoryQuery {
  page?: number;
  pageSize?: number;
}