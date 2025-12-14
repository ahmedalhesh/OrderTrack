import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const ORDER_STATUSES = [
  "تم استلام الطلب",
  "تم تأكيد الدفع",
  "تم الشراء من الموقع",
  "قيد الشحن من المصدر",
  "وصلت إلى بلد العبور",
  "وصلت إلى ليبيا",
  "قيد التوصيل",
  "تم التسليم",
  "ملغاة / توجد مشكلة"
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerName: text("customer_name").notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  orderStatus: text("order_status").notNull().default("تم استلام الطلب"),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const usersRelations = relations(users, ({ }) => ({}));
export const ordersRelations = relations(orders, ({ }) => ({}));

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
}).refine(data => data.orderNumber || data.phoneNumber, {
  message: "يرجى إدخال رقم الطلبية أو رقم الهاتف",
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
