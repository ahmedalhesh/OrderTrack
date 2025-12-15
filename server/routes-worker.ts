import { Hono } from "hono";
import type { Context, Next } from "hono";
import { D1Storage } from "./storage-d1";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertOrderSchema, updateOrderSchema, loginSchema, customerLoginSchema, insertCustomerSchema, updateSettingsSchema } from "@shared/schema";

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

type WorkerContext = Context<{ Bindings: Env; Variables: { user?: { id: number; username: string }; customer?: { id: number; accountNumber: string } } }>;

const JWT_SECRET = (c: WorkerContext) => c.env.SESSION_SECRET || "default-secret-key";

// Helper functions
function getStorage(c: WorkerContext): D1Storage {
  return new D1Storage(c.env.DB);
}

async function authenticateToken(c: WorkerContext, next: Next) {
  const authHeader = c.req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return c.json({ message: "غير مصرح بالوصول" }, 401);
  }

  try {
    const secret = JWT_SECRET(c);
    const decoded = jwt.verify(token, secret) as { id: number; username: string };
    c.set("user", decoded);
    await next();
  } catch (err) {
    return c.json({ message: "جلسة منتهية الصلاحية" }, 403);
  }
}

async function authenticateCustomer(c: WorkerContext, next: Next) {
  const authHeader = c.req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return c.json({ message: "غير مصرح بالوصول" }, 401);
  }

  try {
    const secret = JWT_SECRET(c);
    const decoded = jwt.verify(token, secret) as { id: number; accountNumber: string };
    c.set("customer", decoded);
    await next();
  } catch (err) {
    return c.json({ message: "جلسة منتهية الصلاحية" }, 403);
  }
}

export function registerWorkerRoutes(app: Hono<{ Bindings: Env; Variables: { user?: { id: number; username: string }; customer?: { id: number; accountNumber: string } } }>) {
  // Health check
  app.get("/api/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin login
  app.post("/api/auth/login", async (c) => {
    try {
      const body = await c.req.json();
      const result = loginSchema.safeParse(body);
      if (!result.success) {
        return c.json({ message: "بيانات غير صالحة" }, 400);
      }

      const { username, password } = result.data;
      const storage = getStorage(c);
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return c.json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" }, 401);
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return c.json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" }, 401);
      }

      const secret = JWT_SECRET(c);
      const token = jwt.sign(
        { id: user.id, username: user.username },
        secret,
        { expiresIn: "24h" }
      );

      return c.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Admin setup
  app.post("/api/auth/setup", async (c) => {
    try {
      const storage = getStorage(c);
      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        return c.json({ message: "المدير موجود بالفعل" }, 400);
      }

      const hashedPassword = await bcrypt.hash("admin123", 10);
      const user = await storage.createUser({
        username: "admin",
        password: hashedPassword,
      });

      return c.json({ message: "تم إنشاء المدير بنجاح", username: user.username });
    } catch (error) {
      console.error("Setup error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Track order (public)
  app.get("/api/orders/track", async (c) => {
    try {
      const orderNumber = c.req.query("orderNumber");
      const phoneNumber = c.req.query("phoneNumber");
      const storage = getStorage(c);

      if (orderNumber && typeof orderNumber === "string") {
        const order = await storage.getOrderByNumber(orderNumber);
        if (!order) {
          return c.json({ message: "لم يتم العثور على الطلبية" }, 404);
        }
        return c.json(order);
      }

      if (phoneNumber && typeof phoneNumber === "string") {
        const orders = await storage.getOrdersByPhone(phoneNumber);
        if (orders.length === 0) {
          return c.json({ message: "لم يتم العثور على طلبيات بهذا الرقم" }, 404);
        }
        return c.json(orders);
      }

      return c.json({ message: "يرجى إدخال رقم الطلبية أو رقم الهاتف" }, 400);
    } catch (error) {
      console.error("Track order error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get all orders (admin only)
  app.get("/api/orders", authenticateToken, async (c) => {
    try {
      const storage = getStorage(c);
      const orders = await storage.getAllOrders();
      return c.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get single order (admin only)
  app.get("/api/orders/:id", authenticateToken, async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const storage = getStorage(c);
      const order = await storage.getOrder(id);
      if (!order) {
        return c.json({ message: "لم يتم العثور على الطلبية" }, 404);
      }
      return c.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Create order (admin only)
  app.post("/api/orders", authenticateToken, async (c) => {
    try {
      const body = await c.req.json();
      const result = insertOrderSchema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        }, 400);
      }

      const storage = getStorage(c);
      const order = await storage.createOrder(result.data);
      return c.json(order, 201);
    } catch (error) {
      console.error("Create order error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Update order (admin only)
  app.put("/api/orders/:id", authenticateToken, async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const result = updateOrderSchema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        }, 400);
      }

      const storage = getStorage(c);
      const order = await storage.updateOrder(id, result.data);
      if (!order) {
        return c.json({ message: "لم يتم العثور على الطلبية" }, 404);
      }
      return c.json(order);
    } catch (error) {
      console.error("Update order error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Delete order (admin only)
  app.delete("/api/orders/:id", authenticateToken, async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const storage = getStorage(c);
      const deleted = await storage.deleteOrder(id);
      if (!deleted) {
        return c.json({ message: "لم يتم العثور على الطلبية" }, 404);
      }
      return c.json({ message: "تم حذف الطلبية بنجاح" });
    } catch (error) {
      console.error("Delete order error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Search orders (admin only)
  app.get("/api/orders/search/:query", authenticateToken, async (c) => {
    try {
      const query = c.req.param("query");
      const storage = getStorage(c);
      const orders = await storage.searchOrders(query);
      return c.json(orders);
    } catch (error) {
      console.error("Search orders error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Customer login
  app.post("/api/customer/login", async (c) => {
    try {
      const body = await c.req.json();
      const result = customerLoginSchema.safeParse(body);
      if (!result.success) {
        return c.json({ message: "بيانات غير صالحة" }, 400);
      }

      const storage = getStorage(c);
      let customer;

      if (result.data.accountNumber) {
        customer = await storage.getCustomerByAccountNumber(result.data.accountNumber);
      } else if (result.data.phoneNumber) {
        customer = await storage.getCustomerByPhoneNumber(result.data.phoneNumber);
      }

      if (!customer) {
        return c.json({ message: "رقم الحساب أو رقم الهاتف غير صحيح" }, 401);
      }

      const validPassword = await bcrypt.compare(result.data.password, customer.password);
      if (!validPassword) {
        return c.json({ message: "كلمة المرور غير صحيحة" }, 401);
      }

      const secret = JWT_SECRET(c);
      const token = jwt.sign(
        { id: customer.id, accountNumber: customer.accountNumber },
        secret,
        { expiresIn: "30d" }
      );

      return c.json({
        token,
        customer: {
          id: customer.id,
          accountNumber: customer.accountNumber,
          name: customer.name,
          phoneNumber: customer.phoneNumber,
        },
      });
    } catch (error) {
      console.error("Customer login error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get customer profile
  app.get("/api/customer/profile", authenticateCustomer, async (c) => {
    try {
      const customer = c.get("customer");
      if (!customer) {
        return c.json({ message: "غير مصرح بالوصول" }, 401);
      }

      const storage = getStorage(c);
      const customerData = await storage.getCustomer(customer.id);
      if (!customerData) {
        return c.json({ message: "لم يتم العثور على العميل" }, 404);
      }

      return c.json({
        id: customerData.id,
        accountNumber: customerData.accountNumber,
        name: customerData.name,
        phoneNumber: customerData.phoneNumber,
      });
    } catch (error) {
      console.error("Get customer profile error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Change customer password
  app.put("/api/customer/change-password", authenticateCustomer, async (c) => {
    try {
      const customer = c.get("customer");
      if (!customer) {
        return c.json({ message: "غير مصرح بالوصول" }, 401);
      }

      const body = await c.req.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return c.json({ message: "كلمة المرور الحالية والجديدة مطلوبة" }, 400);
      }

      if (newPassword.length < 6) {
        return c.json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }, 400);
      }

      const storage = getStorage(c);
      const customerData = await storage.getCustomer(customer.id);
      if (!customerData) {
        return c.json({ message: "لم يتم العثور على العميل" }, 404);
      }

      const validPassword = await bcrypt.compare(currentPassword, customerData.password);
      if (!validPassword) {
        return c.json({ message: "كلمة المرور الحالية غير صحيحة" }, 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateCustomer(customer.id, { password: hashedPassword });

      return c.json({ message: "تم تحديث كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Change password error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get customer orders
  app.get("/api/customer/orders", authenticateCustomer, async (c) => {
    try {
      const customer = c.get("customer");
      if (!customer) {
        return c.json({ message: "غير مصرح بالوصول" }, 401);
      }

      const storage = getStorage(c);
      const orders = await storage.getOrdersByCustomerId(customer.id);
      return c.json(orders);
    } catch (error) {
      console.error("Get customer orders error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Create customer (admin only)
  app.post("/api/customers", authenticateToken, async (c) => {
    try {
      const body = await c.req.json();
      const result = insertCustomerSchema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        }, 400);
      }

      const storage = getStorage(c);
      // createCustomer يتولى توليد رقم الحساب تلقائياً
      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const customer = await storage.createCustomer({
        ...result.data,
        password: hashedPassword,
      });

      return c.json({
        id: customer.id,
        accountNumber: customer.accountNumber,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      }, 201);
    } catch (error) {
      console.error("Create customer error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get all customers (admin only)
  app.get("/api/customers", authenticateToken, async (c) => {
    try {
      const storage = getStorage(c);
      const customers = await storage.getAllCustomers();
      return c.json(customers.map(c => ({
        id: c.id,
        accountNumber: c.accountNumber,
        name: c.name,
        phoneNumber: c.phoneNumber,
      })));
    } catch (error) {
      console.error("Get customers error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Update customer (admin only)
  app.put("/api/customers/:id", authenticateToken, async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const result = insertCustomerSchema.partial().safeParse(body);
      if (!result.success) {
        return c.json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        }, 400);
      }

      const storage = getStorage(c);
      const updateData: any = { ...result.data };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const customer = await storage.updateCustomer(id, updateData);
      if (!customer) {
        return c.json({ message: "لم يتم العثور على العميل" }, 404);
      }

      return c.json({
        id: customer.id,
        accountNumber: customer.accountNumber,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      });
    } catch (error) {
      console.error("Update customer error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Delete customer (admin only)
  app.delete("/api/customers/:id", authenticateToken, async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const storage = getStorage(c);
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return c.json({ message: "لم يتم العثور على العميل" }, 404);
      }
      return c.json({ message: "تم حذف العميل بنجاح" });
    } catch (error) {
      console.error("Delete customer error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get settings (admin only)
  app.get("/api/settings", authenticateToken, async (c) => {
    try {
      const storage = getStorage(c);
      const settings = await storage.getSettings();
      return c.json(settings || {
        companyName: "",
        companyLogo: "",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        companyWebsite: "",
      });
    } catch (error) {
      console.error("Get settings error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Update settings (admin only)
  app.put("/api/settings", authenticateToken, async (c) => {
    try {
      const body = await c.req.json();
      const result = updateSettingsSchema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors 
        }, 400);
      }

      const storage = getStorage(c);
      const settings = await storage.updateSettings(result.data);
      return c.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });

  // Get public settings (no auth)
  app.get("/api/settings/public", async (c) => {
    try {
      const storage = getStorage(c);
      const settings = await storage.getSettings();
      return c.json(settings || {
        companyName: "",
        companyLogo: "",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        companyWebsite: "",
      });
    } catch (error) {
      console.error("Get public settings error:", error);
      return c.json({ message: "حدث خطأ في الخادم" }, 500);
    }
  });
}

