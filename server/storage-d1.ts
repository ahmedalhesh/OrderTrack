import { orders, users, customers, settings, type Order, type InsertOrder, type UpdateOrder, type User, type InsertUser, type Customer, type InsertCustomer, type Settings, type InsertSettings, type UpdateSettings } from "@shared/schema";
import { createD1Database } from "./db-d1";
import { eq, or, desc, sql, like } from "drizzle-orm";
import type { IStorage } from "./storage";

export class D1Storage implements IStorage {
  private db: ReturnType<typeof createD1Database>;

  constructor(d1: D1Database) {
    this.db = createD1Database(d1);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByPhone(phoneNumber: string): Promise<Order[]> {
    return this.db.select().from(orders).where(eq(orders.phoneNumber, phoneNumber)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async searchOrders(query: string): Promise<Order[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return this.db.select().from(orders).where(
      or(
        sql`LOWER(${orders.orderNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${orders.phoneNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${orders.customerName}) LIKE ${searchPattern}`
      )
    ).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    let orderNumber = insertOrder.orderNumber;
    if (!orderNumber || orderNumber.trim() === "") {
      orderNumber = await this.generateNextOrderNumber();
    }

    const statusTimestamps: Record<string, string> = {
      [insertOrder.orderStatus || "تم استلام الطلب"]: new Date().toISOString(),
    };

    const [order] = await this.db.insert(orders).values({
      ...insertOrder,
      orderNumber,
      statusTimestamps: JSON.stringify(statusTimestamps),
      updatedAt: new Date(),
    }).returning();
    return order;
  }

  async updateOrder(id: number, updateData: UpdateOrder): Promise<Order | undefined> {
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
          statusTimestamps = {};
        }

        if (currentOrder.createdAt && Object.keys(statusTimestamps).length === 0) {
          const initialStatus = currentOrder.orderStatus || "تم استلام الطلب";
          statusTimestamps[initialStatus] = currentOrder.createdAt.toISOString();
        }

        if (!statusTimestamps[updateData.orderStatus]) {
          statusTimestamps[updateData.orderStatus] = new Date().toISOString();
        }

        updateData.statusTimestamps = JSON.stringify(statusTimestamps);
      }
    }

    const [order] = await this.db.update(orders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await this.db.delete(orders).where(eq(orders.id, id)).returning();
    return result.length > 0;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByAccountNumber(accountNumber: string): Promise<Customer | undefined> {
    const [customer] = await this.db.select().from(customers).where(eq(customers.accountNumber, accountNumber));
    return customer || undefined;
  }

  async getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined> {
    const [customer] = await this.db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    // توليد رقم الحساب تلقائياً إذا لم يكن موجوداً
    let accountNumber = insertCustomer.accountNumber;
    if (!accountNumber || accountNumber.trim() === "") {
      accountNumber = await this.generateNextCustomerNumber();
    }

    const [customer] = await this.db.insert(customers).values({
      ...insertCustomer,
      accountNumber,
      updatedAt: new Date(),
    }).returning();
    return customer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async updateCustomer(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await this.db.update(customers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await this.db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      return [];
    }

    return this.db.select()
      .from(orders)
      .where(
        or(
          eq(orders.customerId, customerId),
          eq(orders.phoneNumber, customer.phoneNumber)
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async getSettings(): Promise<Settings | undefined> {
    const [setting] = await this.db.select().from(settings).where(eq(settings.id, 1));
    return setting || undefined;
  }

  async updateSettings(settingsData: UpdateSettings): Promise<Settings> {
    const existing = await this.getSettings();
    
    if (existing) {
      const [updated] = await this.db.update(settings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(settings.id, 1))
        .returning();
      if (!updated) {
        throw new Error("فشل تحديث الإعدادات");
      }
      return updated;
    } else {
      // إنشاء إعدادات جديدة - D1 يدعم INSERT مباشرة
      const now = new Date();
      const [result] = await this.db.insert(settings).values({
        id: 1,
        ...settingsData,
        createdAt: now,
        updatedAt: now,
      }).returning();
      
      if (!result) {
        throw new Error("فشل إنشاء الإعدادات");
      }
      return result;
    }
  }

  async generateNextOrderNumber(): Promise<string> {
    const settings = await this.getSettings();
    const prefix = settings?.orderPrefix || "ORD-";
    const startNumber = settings?.orderStartNumber || 1;
    const format = parseInt(settings?.orderNumberFormat || "4", 10);

    const lastOrders = await this.db.select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(like(orders.orderNumber, `${prefix}%`))
      .orderBy(desc(orders.id))
      .limit(100);

    let maxNumber = startNumber - 1;

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

    const lastCustomers = await this.db.select({ accountNumber: customers.accountNumber })
      .from(customers)
      .where(like(customers.accountNumber, `${prefix}%`))
      .orderBy(desc(customers.id))
      .limit(100);

    let maxNumber = startNumber - 1;

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
}

