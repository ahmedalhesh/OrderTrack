import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertOrderSchema, updateOrderSchema, loginSchema, customerLoginSchema, insertCustomerSchema, updateSettingsSchema } from "@shared/schema";
import { getBroadcaster } from "./websocket";

const JWT_SECRET = process.env.SESSION_SECRET || "default-secret-key";

interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

interface CustomerAuthRequest extends Request {
  customer?: { id: number; accountNumber: string };
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
  
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
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
      // إذا كان رقم الطلبية فارغاً أو undefined، احذفه تماماً ليتم توليده تلقائياً
      const orderData = { ...req.body };
      if (!orderData.orderNumber || orderData.orderNumber.trim() === "") {
        delete orderData.orderNumber;
      }

      const result = insertOrderSchema.safeParse(orderData);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      // التحقق من رقم الطلبية فقط إذا كان موجوداً
      if (result.data.orderNumber && result.data.orderNumber.trim() !== "") {
        const existingOrder = await storage.getOrderByNumber(result.data.orderNumber);
        if (existingOrder) {
          return res.status(400).json({ message: "رقم الطلبية موجود بالفعل" });
        }
      }

      const order = await storage.createOrder(result.data);
      
      // إرسال تحديث عبر WebSocket
      const broadcaster = getBroadcaster();
      if (broadcaster) {
        broadcaster.broadcastOrderCreate(order);
      }
      
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
      
      // إرسال تحديث عبر WebSocket
      const broadcaster = getBroadcaster();
      if (broadcaster) {
        console.log(`[WebSocket] Broadcasting order update: ${order.orderNumber} (ID: ${order.id})`);
        broadcaster.broadcastOrderUpdate(order);
      } else {
        console.warn("[WebSocket] Broadcaster not initialized");
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
      
      // إرسال تحديث عبر WebSocket
      const broadcaster = getBroadcaster();
      if (broadcaster) {
        broadcaster.broadcastOrderDelete(id);
      }
      
      res.json({ message: "تم حذف الطلبية بنجاح" });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // ========== Customer APIs ==========
  
  // تسجيل دخول العميل
  app.post("/api/customer/login", async (req, res) => {
    try {
      const result = customerLoginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { accountNumber, phoneNumber, password } = result.data;
      
      // البحث عن العميل برقم الحساب أو رقم الهاتف
      // الحصول على القيمة من أي من الحقلين (لأنهما نفس القيمة في الحقل المشترك)
      const identifier = (accountNumber || phoneNumber || "").trim();
      
      if (!identifier) {
        return res.status(400).json({ message: "يرجى إدخال رقم الحساب أو رقم الهاتف" });
      }
      
      if (!password || !password.trim()) {
        return res.status(400).json({ message: "كلمة المرور مطلوبة" });
      }
      
      let customer;
      // محاولة البحث برقم الحساب أولاً
      customer = await storage.getCustomerByAccountNumber(identifier);
      // إذا لم يتم العثور عليه، جرب البحث برقم الهاتف
      if (!customer) {
        customer = await storage.getCustomerByPhoneNumber(identifier);
      }

      if (!customer) {
        return res.status(401).json({ message: "رقم الحساب/الهاتف أو كلمة المرور غير صحيحة" });
      }

      const validPassword = await bcrypt.compare(password.trim(), customer.password);
      if (!validPassword) {
        return res.status(401).json({ message: "رقم الحساب/الهاتف أو كلمة المرور غير صحيحة" });
      }

      const token = jwt.sign(
        { id: customer.id, accountNumber: customer.accountNumber, type: "customer" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({ 
        token, 
        customer: { 
          id: customer.id, 
          accountNumber: customer.accountNumber,
          name: customer.name,
          phoneNumber: customer.phoneNumber 
        } 
      });
    } catch (error) {
      console.error("Customer login error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // مصادقة العميل
  function authenticateCustomer(req: CustomerAuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "غير مصرح بالوصول" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err || decoded.type !== "customer") {
        return res.status(403).json({ message: "جلسة منتهية الصلاحية" });
      }
      req.customer = { id: decoded.id, accountNumber: decoded.accountNumber };
      next();
    });
  }

  // الحصول على معلومات العميل
  app.get("/api/customer/profile", authenticateCustomer as any, async (req: CustomerAuthRequest, res) => {
    try {
      if (!req.customer) {
        return res.status(401).json({ message: "غير مصرح بالوصول" });
      }
      const customer = await storage.getCustomer(req.customer.id);
      if (!customer) {
        return res.status(404).json({ message: "لم يتم العثور على العميل" });
      }
      res.json({
        id: customer.id,
        accountNumber: customer.accountNumber,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      });
    } catch (error) {
      console.error("Get customer profile error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // تغيير كلمة مرور العميل
  app.put("/api/customer/change-password", authenticateCustomer as any, async (req: CustomerAuthRequest, res) => {
    try {
      if (!req.customer) {
        return res.status(401).json({ message: "غير مصرح بالوصول" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "كلمة المرور الحالية والجديدة مطلوبة" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }

      // التحقق من كلمة المرور الحالية
      const customer = await storage.getCustomer(req.customer.id);
      if (!customer) {
        return res.status(404).json({ message: "لم يتم العثور على العميل" });
      }

      const validPassword = await bcrypt.compare(currentPassword.trim(), customer.password);
      if (!validPassword) {
        return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }

      // تحديث كلمة المرور
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      await storage.updateCustomer(req.customer.id, { password: hashedPassword });

      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Change customer password error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // الحصول على طلبيات العميل
  app.get("/api/customer/orders", authenticateCustomer as any, async (req: CustomerAuthRequest, res) => {
    try {
      if (!req.customer) {
        return res.status(401).json({ message: "غير مصرح بالوصول" });
      }
      const orders = await storage.getOrdersByCustomerId(req.customer.id);
      res.json(orders);
    } catch (error) {
      console.error("Get customer orders error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // إنشاء حساب عميل (للمسؤول فقط)
  app.post("/api/customers", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const result = insertCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      // توليد رقم الحساب تلقائياً بناءً على الإعدادات
      const accountNumber = await storage.generateNextCustomerNumber();

      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const customer = await storage.createCustomer({
        ...result.data,
        accountNumber: accountNumber,
        password: hashedPassword,
      });

      res.status(201).json({
        id: customer.id,
        accountNumber: customer.accountNumber,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      });
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // الحصول على جميع العملاء (للمسؤول فقط)
  app.get("/api/customers", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers.map(c => ({
        id: c.id,
        accountNumber: c.accountNumber,
        name: c.name,
        phoneNumber: c.phoneNumber,
        createdAt: c.createdAt,
      })));
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // تعديل عميل (للمسؤول فقط)
  app.put("/api/customers/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      // إذا تم إرسال كلمة مرور جديدة، قم بتشفيرها
      const updateData: any = { ...result.data };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const customer = await storage.updateCustomer(id, updateData);
      if (!customer) {
        return res.status(404).json({ message: "لم يتم العثور على العميل" });
      }

      res.json({
        id: customer.id,
        accountNumber: customer.accountNumber,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      });
    } catch (error) {
      console.error("Update customer error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // حذف عميل (للمسؤول فقط)
  app.delete("/api/customers/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return res.status(404).json({ message: "لم يتم العثور على العميل" });
      }
      res.json({ message: "تم حذف العميل بنجاح" });
    } catch (error) {
      console.error("Delete customer error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // ========== Settings APIs ==========
  
  // الحصول على إعدادات الشركة
  app.get("/api/settings", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {
        companyName: "",
        companyLogo: "",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        companyWebsite: "",
      });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // تحديث إعدادات الشركة
  app.put("/api/settings", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const result = updateSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        });
      }

      const settings = await storage.updateSettings(result.data);
      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  // الحصول على إعدادات الشركة (عام - بدون مصادقة)
  app.get("/api/settings/public", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {
        companyName: "",
        companyLogo: "",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        companyWebsite: "",
      });
    } catch (error) {
      console.error("Get public settings error:", error);
      res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
  });

  return httpServer;
}
