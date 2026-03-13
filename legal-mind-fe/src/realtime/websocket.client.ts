import { WebSocketHandler, WebSocketMessage } from "./websocket.types";

class AppWebSocketClient {
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private listeners = new Map<string, Set<WebSocketHandler>>();
  private globalListeners = new Set<WebSocketHandler>();
  private reconnectTimeout: number | null = null;
  private manuallyClosed = false;
  private isConnecting = false;

  connect(url: string) {
    if (!url) {
      return;
    }

    if (this.socket && this.url === url && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.url = url;
    this.manuallyClosed = false;

    if (this.isConnecting) return;
    this.isConnecting = true;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.isConnecting = false;
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed: WebSocketMessage = JSON.parse(event.data);

        this.globalListeners.forEach((handler) => handler(parsed));

        const typedListeners = this.listeners.get(parsed.type);
        if (typedListeners) {
          typedListeners.forEach((handler) => handler(parsed));
        }
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
      }
    };

    this.socket.onclose = () => {
      this.isConnecting = false;
      this.socket = null;

      if (!this.manuallyClosed && this.url) {
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect(this.url!);
        }, 2000);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnect() {
    this.manuallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not open");
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  on(type: string, handler: WebSocketHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(handler);

    return () => {
      this.listeners.get(type)?.delete(handler);
      if (this.listeners.get(type)?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  onAny(handler: WebSocketHandler) {
    this.globalListeners.add(handler);

    return () => {
      this.globalListeners.delete(handler);
    };
  }

  getState() {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}

export const websocketClient = new AppWebSocketClient();
