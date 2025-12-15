import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import type { Order } from "@shared/schema";

export class OrderUpdateBroadcaster {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WebSocket] New client connected. Total clients: ${this.clients.size}`);

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on("error", (error) => {
        console.error("[WebSocket] Error:", error);
        this.clients.delete(ws);
      });

      // إرسال رسالة ترحيب
      ws.send(JSON.stringify({ type: "connected", message: "تم الاتصال بنجاح" }));
    });
  }

  // بث تحديث الطلبية لجميع العملاء المتصلين
  broadcastOrderUpdate(order: Order) {
    const message = JSON.stringify({
      type: "order_update",
      order,
    });

    console.log(`[WebSocket] Broadcasting to ${this.clients.size} clients`);
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          this.clients.delete(client);
        }
      }
    });
    console.log(`[WebSocket] Sent update to ${sentCount} clients`);
  }

  // بث حذف الطلبية
  broadcastOrderDelete(orderId: number) {
    const message = JSON.stringify({
      type: "order_delete",
      orderId,
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          this.clients.delete(client);
        }
      }
    });
  }

  // بث إضافة طلبية جديدة
  broadcastOrderCreate(order: Order) {
    const message = JSON.stringify({
      type: "order_create",
      order,
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          this.clients.delete(client);
        }
      }
    });
  }
}

let broadcaster: OrderUpdateBroadcaster | null = null;

export function initializeWebSocket(httpServer: Server): OrderUpdateBroadcaster {
  if (!broadcaster) {
    broadcaster = new OrderUpdateBroadcaster(httpServer);
  }
  return broadcaster;
}

export function getBroadcaster(): OrderUpdateBroadcaster | null {
  return broadcaster;
}

