export interface SyncUserRequest {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface SyncUserResponse {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
}