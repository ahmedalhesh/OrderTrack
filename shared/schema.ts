import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id"), // ربط بالعميل (اختياري للتوافق مع البيانات القديمة)
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  orderStatus: text("order_status").notNull().default("تم استلام الطلب"),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  adminNotes: text("admin_notes"),
  orderValue: text("order_value"), // قيمة الطلبية
  itemsCount: integer("items_count"), // عدد الأصناف
  shippingCost: text("shipping_cost"), // قيمة الشحن
  statusTimestamps: text("status_timestamps"), // JSON object لحفظ تاريخ كل حالة
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountNumber: text("account_number").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name"),
  companyLogo: text("company_logo"), // مسار الشعار أو base64
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyWebsite: text("company_website"),
  // إعدادات الترقيم
  orderPrefix: text("order_prefix"), // بادئة رقم الطلبية (مثال: ORD-)
  orderStartNumber: integer("order_start_number"), // رقم البداية للطلبيات
  orderNumberFormat: text("order_number_format"), // تنسيق رقم الطلبية (مثال: 4 = 0001, 5 = 00001)
  customerPrefix: text("customer_prefix"), // بادئة رقم العميل (مثال: CUST-)
  customerStartNumber: integer("customer_start_number"), // رقم البداية للعملاء
  customerNumberFormat: text("customer_number_format"), // تنسيق رقم العميل (مثال: 4 = 0001, 5 = 00001)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ }) => ({}));
export const ordersRelations = relations(orders, ({ }) => ({}));
export const customersRelations = relations(customers, ({ }) => ({}));
export const settingsRelations = relations(settings, ({ }) => ({}));

const baseOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = baseOrderSchema.extend({
  orderNumber: z.string().optional(), // جعل orderNumber اختياري
});

export const updateOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  accountNumber: true, // سيتم توليده تلقائياً
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const customerLoginSchema = z.object({
  accountNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
}).refine(data => {
  const hasAccountNumber = data.accountNumber && data.accountNumber.trim().length > 0;
  const hasPhoneNumber = data.phoneNumber && data.phoneNumber.trim().length > 0;
  return hasAccountNumber || hasPhoneNumber;
}, {
  message: "يرجى إدخال رقم الحساب أو رقم الهاتف",
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
export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const updateSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
