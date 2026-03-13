import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { websocketClient } from "./websocket.client";

type WebSocketContextValue = {
  connect: (url: string) => void;
  disconnect: () => void;
  send: (payload: unknown) => void;
  readyState: number;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  url: string | null;
};

export const AppWebSocketProvider = ({ children, url }: Props) => {
  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED);

  useEffect(() => {
    if (!url) {
      websocketClient.disconnect();
      setReadyState(WebSocket.CLOSED);
      return;
    }

    websocketClient.connect(url);

    const interval = window.setInterval(() => {
      setReadyState(websocketClient.getState());
    }, 500);

    return () => {
      clearInterval(interval);
      websocketClient.disconnect();
    };
  }, [url]);

  const value = useMemo(
    () => ({
      connect: websocketClient.connect.bind(websocketClient),
      disconnect: websocketClient.disconnect.bind(websocketClient),
      send: websocketClient.send.bind(websocketClient),
      readyState,
    }),
    [readyState]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useAppWebSocket = () => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error("useAppWebSocket must be used inside AppWebSocketProvider");
  }

  return context;
};
