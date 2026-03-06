export type AuthPayload = {
  userId: string;
  email: string;
  name: string;
};

export type CursorPayload = {
  boardId: string;
  x: number;
  y: number;
  color: string;
  name: string;
};
