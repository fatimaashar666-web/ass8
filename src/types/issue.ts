export const issueCategories = [
  "COMPUTER",
  "PROJECTOR",
  "FAN",
  "LIGHT",
  "WIFI",
] as const;

export const issueStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED"] as const;

export type IssueCategory = (typeof issueCategories)[number];
export type IssueStatus = (typeof issueStatuses)[number];

export type Issue = {
  id: string;
  ticketCode: string;
  category: IssueCategory;
  title: string;
  description: string;
  building: string;
  room: string;
  reporterName: string;
  reporterEmail: string;
  imageData: string | null;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
};

export type Overview = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  byCategory: Record<IssueCategory, number>;
  thisWeek: number[];
};