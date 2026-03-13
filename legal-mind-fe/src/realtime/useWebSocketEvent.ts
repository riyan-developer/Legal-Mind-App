import { useEffect } from "react";
import { websocketClient } from "./websocket.client";
import { WebSocketHandler } from "./websocket.types";

export const useWebSocketEvent = <T = unknown>(
  eventType: string,
  handler: WebSocketHandler<T>
) => {
  useEffect(() => {
    const unsubscribe = websocketClient.on(eventType, handler);
    return unsubscribe;
  }, [eventType, handler]);
};

export const useWebSocketAnyEvent = <T = unknown>(
  handler: WebSocketHandler<T>
) => {
  useEffect(() => {
    const unsubscribe = websocketClient.onAny(handler);
    return unsubscribe;
  }, [handler]);
};