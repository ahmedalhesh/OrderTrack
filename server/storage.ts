import { orders, users, type Order, type InsertOrder, type UpdateOrder, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, or, ilike, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByPhone(phoneNumber: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  searchOrders(query: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: UpdateOrder): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
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
    return db.select().from(orders).where(
      or(
        ilike(orders.orderNumber, `%${query}%`),
        ilike(orders.phoneNumber, `%${query}%`),
        ilike(orders.customerName, `%${query}%`)
      )
    ).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values({
      ...insertOrder,
      updatedAt: new Date(),
    }).returning();
    return order;
  }

  async updateOrder(id: number, updateData: UpdateOrder): Promise<Order | undefined> {
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
}

export const storage = new DatabaseStorage();
