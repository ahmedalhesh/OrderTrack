import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertOrderSchema, updateOrderSchema, loginSchema } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "default-secret-key";

interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "غير مصرح بالوصول" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "جلسة منتهية الصلاحية" });
    }
    req.user = user as { id: number; username: string };
    next();
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات غير صالحة" });
      }

      const { username, password } = result.data;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        return res.status(400).json({ message: "المدير موجود بالفعل" });
      }

      const hashedPassword = await bcrypt.hash("admin123", 10);
      const user = await storage.createUser({
        username: "admin",
        password: hashedPassword,
      });

      res.json({ message: "تم إنشاء المدير بنجاح", username: user.username });
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.get("/api/orders/track", async (req, res) => {
    try {
      const { orderNumber, phoneNumber } = req.query;

      if (orderNumber && typeof orderNumber === "string") {
        const order = await storage.getOrderByNumber(orderNumber);
        if (!order) {
          return res.status(404).json({ message: "لم يتم العثور على الطلبية" });
        }
        return res.json(order);
      }

      if (phoneNumber && typeof phoneNumber === "string") {
        const orders = await storage.getOrdersByPhone(phoneNumber);
        if (orders.length === 0) {
          return res.status(404).json({ message: "لم يتم العثور على طلبيات بهذا الرقم" });
        }
        return res.json(orders);
      }

      return res.status(400).json({ message: "يرجى إدخال رقم الطلبية أو رقم الهاتف" });
    } catch (error) {
      console.error("Track order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.get("/api/orders", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.get("/api/orders/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "لم يتم العثور على الطلبية" });
      }
      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.post("/api/orders", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const result = insertOrderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      const existingOrder = await storage.getOrderByNumber(result.data.orderNumber);
      if (existingOrder) {
        return res.status(400).json({ message: "رقم الطلبية موجود بالفعل" });
      }

      const order = await storage.createOrder(result.data);
      res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.put("/api/orders/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = updateOrderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      const order = await storage.updateOrder(id, result.data);
      if (!order) {
        return res.status(404).json({ message: "لم يتم العثور على الطلبية" });
      }
      res.json(order);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  app.delete("/api/orders/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrder(id);
      if (!deleted) {
        return res.status(404).json({ message: "لم يتم العثور على الطلبية" });
      }
      res.json({ message: "تم حذف الطلبية بنجاح" });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  return httpServer;
}
