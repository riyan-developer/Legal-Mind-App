export type WebSocketMessage<T = unknown> = {
  type: string;
  data?: T;
  message?: string;
};

export type WebSocketHandler<T = unknown> = (payload: WebSocketMessage<T>) => void;