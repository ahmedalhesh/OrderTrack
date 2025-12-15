import { orders, users, customers, settings, type Order, type InsertOrder, type UpdateOrder, type User, type InsertUser, type Customer, type InsertCustomer, type Settings, type InsertSettings, type UpdateSettings } from "@shared/schema";
import { db, sqlite } from "./db";
import { eq, or, desc, sql, like } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByAccountNumber(accountNumber: string): Promise<Customer | undefined>;
  getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByPhone(phoneNumber: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  searchOrders(query: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: UpdateOrder): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settingsData: UpdateSettings): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByPhone(phoneNumber: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.phoneNumber, phoneNumber)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async searchOrders(query: string): Promise<Order[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db.select().from(orders).where(
      or(
        sql`LOWER(${orders.orderNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${orders.phoneNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${orders.customerName}) LIKE ${searchPattern}`
      )
    ).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // توليد رقم الطلبية تلقائياً إذا كان فارغاً
    let orderNumber = insertOrder.orderNumber;
    if (!orderNumber || orderNumber.trim() === "") {
      orderNumber = await this.generateNextOrderNumber();
    }

    // إنشاء statusTimestamps مع تاريخ الحالة الأولى
    const statusTimestamps: Record<string, string> = {
      [insertOrder.orderStatus || "تم استلام الطلب"]: new Date().toISOString(),
    };

    const [order] = await db.insert(orders).values({
      ...insertOrder,
      orderNumber,
      statusTimestamps: JSON.stringify(statusTimestamps),
      updatedAt: new Date(),
    }).returning();
    return order;
  }

  async updateOrder(id: number, updateData: UpdateOrder): Promise<Order | undefined> {
    // إذا تم تحديث الحالة، أضف التاريخ إلى statusTimestamps
    if (updateData.orderStatus) {
      const currentOrder = await this.getOrder(id);
      if (currentOrder) {
        let statusTimestamps: Record<string, string> = {};
        try {
          if (currentOrder.statusTimestamps && typeof currentOrder.statusTimestamps === 'string') {
            statusTimestamps = JSON.parse(currentOrder.statusTimestamps);
          } else if (currentOrder.statusTimestamps && typeof currentOrder.statusTimestamps === 'object') {
            statusTimestamps = currentOrder.statusTimestamps as Record<string, string>;
          }
        } catch (e) {
          // إذا فشل parsing، ابدأ من جديد
          statusTimestamps = {};
        }

        // إضافة تاريخ createdAt كتاريخ للحالة الأولى إذا لم يكن موجوداً
        if (currentOrder.createdAt && Object.keys(statusTimestamps).length === 0) {
          const initialStatus = currentOrder.orderStatus || "تم استلام الطلب";
          statusTimestamps[initialStatus] = currentOrder.createdAt.toISOString();
        }

        // إضافة التاريخ للحالة الجديدة فقط إذا لم تكن موجودة
        if (!statusTimestamps[updateData.orderStatus]) {
          statusTimestamps[updateData.orderStatus] = new Date().toISOString();
        }

        updateData.statusTimestamps = JSON.stringify(statusTimestamps);
      }
    }

    const [order] = await db.update(orders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id)).returning();
    return result.length > 0;
  }

  // دوال العملاء
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByAccountNumber(accountNumber: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.accountNumber, accountNumber));
    return customer || undefined;
  }

  async getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values({
      ...insertCustomer,
      updatedAt: new Date(),
    }).returning();
    return customer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getLastAccountNumber(): Promise<string | null> {
    // البحث عن آخر رقم حساب
    const settings = await this.getSettings();
    const prefix = settings?.customerPrefix || "CUST-";
    
    const allCustomers = await db.select({ accountNumber: customers.accountNumber })
      .from(customers)
      .where(like(customers.accountNumber, `${prefix}%`))
      .orderBy(desc(customers.id))
      .limit(1);
    
    if (allCustomers.length === 0) {
      return null;
    }
    
    return allCustomers[0].accountNumber;
  }

  async generateNextOrderNumber(): Promise<string> {
    const settings = await this.getSettings();
    const prefix = settings?.orderPrefix || "ORD-";
    const startNumber = settings?.orderStartNumber || 1;
    const format = parseInt(settings?.orderNumberFormat || "4", 10);

    // البحث عن آخر رقم طلبية يبدأ بالبادئة
    const lastOrders = await db.select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(like(orders.orderNumber, `${prefix}%`))
      .orderBy(desc(orders.id))
      .limit(100); // جلب آخر 100 طلبية للبحث عن أعلى رقم

    let maxNumber = startNumber - 1;

    // استخراج الأرقام من أرقام الطلبيات
    if (lastOrders.length > 0) {
      for (const order of lastOrders) {
        const match = order.orderNumber.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(format, "0");
    return `${prefix}${formattedNumber}`;
  }

  async generateNextCustomerNumber(): Promise<string> {
    const settings = await this.getSettings();
    const prefix = settings?.customerPrefix || "CUST-";
    const startNumber = settings?.customerStartNumber || 1;
    const format = parseInt(settings?.customerNumberFormat || "4", 10);

    // البحث عن آخر رقم حساب يبدأ بالبادئة
    const lastCustomers = await db.select({ accountNumber: customers.accountNumber })
      .from(customers)
      .where(like(customers.accountNumber, `${prefix}%`))
      .orderBy(desc(customers.id))
      .limit(100); // جلب آخر 100 عميل للبحث عن أعلى رقم

    let maxNumber = startNumber - 1;

    // استخراج الأرقام من أرقام الحسابات
    if (lastCustomers.length > 0) {
      for (const customer of lastCustomers) {
        const match = customer.accountNumber.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(format, "0");
    return `${prefix}${formattedNumber}`;
  }

  async updateCustomer(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    // الحصول على بيانات العميل للحصول على رقم الهاتف
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      return [];
    }

    // البحث عن الطلبيات التي تطابق customerId أو رقم الهاتف
    // هذا يضمن عرض جميع طلبيات العميل حتى لو لم يتم ربطها بـ customerId
    return db.select()
      .from(orders)
      .where(
        or(
          eq(orders.customerId, customerId),
          eq(orders.phoneNumber, customer.phoneNumber)
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  // دوال الإعدادات
  async getSettings(): Promise<Settings | undefined> {
    // استخدام id=1 دائماً للإعدادات
    const [setting] = await db.select().from(settings).where(eq(settings.id, 1));
    return setting || undefined;
  }

  async updateSettings(settingsData: UpdateSettings): Promise<Settings> {
    const existing = await this.getSettings();
    const now = Date.now();
    
    if (existing) {
      // تحديث الإعدادات الموجودة
      const [updated] = await db.update(settings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(settings.id, 1))
        .returning();
      if (!updated) {
        throw new Error("فشل تحديث الإعدادات");
      }
      return updated;
    } else {
      // إنشاء إعدادات جديدة - نستخدم raw SQL مع INSERT OR REPLACE
      // لأن SQLite لا يسمح بتحديد id يدوياً مع AUTOINCREMENT باستخدام Drizzle مباشرة
      sqlite.prepare(`
        INSERT OR REPLACE INTO settings 
        (id, company_name, company_logo, company_address, company_phone, company_email, company_website, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        settingsData.companyName || null,
        settingsData.companyLogo || null,
        settingsData.companyAddress || null,
        settingsData.companyPhone || null,
        settingsData.companyEmail || null,
        settingsData.companyWebsite || null,
        now,
        now
      );
      
      const [result] = await db.select().from(settings).where(eq(settings.id, 1));
      if (!result) {
        throw new Error("فشل إنشاء الإعدادات");
      }
      return result;
    }
  }
}

export const storage = new DatabaseStorage();
