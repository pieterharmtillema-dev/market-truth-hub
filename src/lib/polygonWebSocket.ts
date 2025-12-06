// Polygon.io WebSocket for real-time price streaming
import { POLYGON_API_KEY } from "./polygon";

type PriceCallback = (symbol: string, price: number, change: number) => void;

interface PolygonTrade {
  ev: string; // event type
  sym: string; // symbol
  p: number; // price
  s: number; // size
  t: number; // timestamp
}

interface PolygonAggregate {
  ev: string; // event type (AM = minute agg, A = second agg)
  sym: string; // symbol
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  vw: number; // vwap
  s: number; // start timestamp
  e: number; // end timestamp
}

class PolygonWebSocketManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<PriceCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private messageQueue: string[] = [];
  private lastPrices: Map<string, { price: number; prevClose: number }> = new Map();
  private connectionType: "stocks" | "crypto" = "stocks";

  connect(type: "stocks" | "crypto" = "stocks") {
    if (this.ws?.readyState === WebSocket.OPEN && this.connectionType === type) {
      return;
    }

    this.connectionType = type;
    const endpoint = type === "crypto" 
      ? "wss://socket.polygon.io/crypto"
      : "wss://socket.polygon.io/stocks";

    console.log(`[Polygon WS] Connecting to ${endpoint}...`);
    
    this.ws = new WebSocket(endpoint);

    this.ws.onopen = () => {
      console.log("[Polygon WS] Connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Authenticate
      this.ws?.send(JSON.stringify({
        action: "auth",
        params: POLYGON_API_KEY
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const messages = JSON.parse(event.data);
        
        for (const msg of messages) {
          if (msg.ev === "status") {
            console.log(`[Polygon WS] Status: ${msg.message}`);
            
            if (msg.status === "auth_success") {
              // Process queued subscriptions
              this.messageQueue.forEach(m => this.ws?.send(m));
              this.messageQueue = [];
              
              // Resubscribe to existing symbols
              this.subscribers.forEach((_, symbol) => {
                this.subscribeToSymbol(symbol);
              });
            }
          } else if (msg.ev === "AM" || msg.ev === "A" || msg.ev === "XA") {
            // Aggregate (minute/second) data
            this.handleAggregate(msg);
          } else if (msg.ev === "T" || msg.ev === "XT") {
            // Trade data
            this.handleTrade(msg);
          }
        }
      } catch (e) {
        console.error("[Polygon WS] Parse error:", e);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[Polygon WS] Error:", error);
    };

    this.ws.onclose = () => {
      console.log("[Polygon WS] Disconnected");
      this.isConnected = false;
      this.attemptReconnect();
    };
  }

  private handleAggregate(msg: PolygonAggregate) {
    const symbol = msg.sym.replace("X:", "").replace("USD", "");
    const callbacks = this.subscribers.get(symbol);
    
    if (callbacks) {
      const prevData = this.lastPrices.get(symbol);
      const prevClose = prevData?.prevClose || msg.o;
      const change = ((msg.c - prevClose) / prevClose) * 100;
      
      this.lastPrices.set(symbol, { price: msg.c, prevClose });
      
      callbacks.forEach(cb => cb(symbol, msg.c, change));
    }
  }

  private handleTrade(msg: PolygonTrade) {
    const symbol = msg.sym.replace("X:", "").replace("USD", "");
    const callbacks = this.subscribers.get(symbol);
    
    if (callbacks) {
      const prevData = this.lastPrices.get(symbol);
      const prevClose = prevData?.prevClose || msg.p;
      const change = ((msg.p - prevClose) / prevClose) * 100;
      
      this.lastPrices.set(symbol, { price: msg.p, prevClose });
      
      callbacks.forEach(cb => cb(symbol, msg.p, change));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[Polygon WS] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[Polygon WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(this.connectionType);
    }, delay);
  }

  private subscribeToSymbol(symbol: string) {
    const prefix = this.connectionType === "crypto" ? "XA" : "AM";
    const formattedSymbol = this.connectionType === "crypto" 
      ? `X:${symbol}USD` 
      : symbol;

    const msg = JSON.stringify({
      action: "subscribe",
      params: `${prefix}.${formattedSymbol}`
    });

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
      console.log(`[Polygon WS] Subscribed to ${formattedSymbol}`);
    } else {
      this.messageQueue.push(msg);
    }
  }

  subscribe(symbol: string, callback: PriceCallback, type: "stocks" | "crypto" = "stocks") {
    // Ensure connection
    this.connect(type);

    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      this.subscribeToSymbol(symbol);
    }

    this.subscribers.get(symbol)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(symbol);
          // Optionally unsubscribe from WebSocket
        }
      }
    };
  }

  setPrevClose(symbol: string, prevClose: number) {
    const current = this.lastPrices.get(symbol);
    this.lastPrices.set(symbol, { 
      price: current?.price || prevClose, 
      prevClose 
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.isConnected = false;
  }
}

export const polygonWS = new PolygonWebSocketManager();
