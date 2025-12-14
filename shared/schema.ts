import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =====================================================
// CORE TABLES
// =====================================================

// Session storage table - Required for Express sessions
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password").notNull(),
  deliveryAddress: text("delivery_address"),
  city: varchar("city"),
  postalCode: varchar("postal_code"),
  phoneNumber: varchar("phone_number").notNull().unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  loyaltyPoints: integer("loyalty_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  englishName: varchar("english_name", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 200 }).notNull(),
  englishName: varchar("english_name", { length: 200 }),
  description: text("description"),
  englishDescription: text("english_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // For showing discounts
  imageUrl: text("image_url"),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  unit: varchar("unit", { length: 50 }).notNull().default("piece"),
  brand: varchar("brand", { length: 100 }),
  barcode: varchar("barcode", { length: 50 }),
  isAvailable: boolean("is_available").notNull().default(true),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// DELIVERY MANAGEMENT
// =====================================================

export const deliveryZones = pgTable("delivery_zones", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  englishName: varchar("english_name", { length: 100 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  estimatedMinutes: integer("estimated_minutes").default(60),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliverySlots = pgTable("delivery_slots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday), null = every day
  startTime: varchar("start_time", { length: 10 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 10 }).notNull(), // "12:00"
  maxOrders: integer("max_orders").default(50),
  surcharge: decimal("surcharge", { precision: 10, scale: 2 }).default("0"), // Extra fee for express
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// ORDERS (Enhanced)
// =====================================================

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // Payment
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // 'cod' | 'card' | 'fawry' | 'vodafone_cash'
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"), // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentReference: varchar("payment_reference", { length: 200 }),
  // Delivery
  deliveryAddress: text("delivery_address").notNull(),
  city: varchar("city").notNull(),
  postalCode: varchar("postal_code").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  deliveryZoneId: integer("delivery_zone_id").references(() => deliveryZones.id),
  deliverySlotId: integer("delivery_slot_id").references(() => deliverySlots.id),
  scheduledDate: timestamp("scheduled_date"),
  deliveredAt: timestamp("delivered_at"),
  // Promo & Loyalty
  promoCodeId: integer("promo_code_id"),
  pointsEarned: integer("points_earned").default(0),
  pointsRedeemed: integer("points_redeemed").default(0),
  // Notes
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productPrice: decimal("product_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// PROMO CODES & LOYALTY
// =====================================================

export const promoCodes = pgTable("promo_codes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' | 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  maximumDiscount: decimal("maximum_discount", { precision: 10, scale: 2 }), // Cap for percentage discounts
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").default(0),
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promoCodeUsage = pgTable("promo_code_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  points: integer("points").notNull(), // Positive = earned, Negative = redeemed
  type: varchar("type", { length: 20 }).notNull(), // 'earned' | 'redeemed' | 'expired' | 'bonus'
  orderId: integer("order_id").references(() => orders.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// WISHLIST & REVIEWS
// =====================================================

export const wishlists = pgTable("wishlists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(), // 1-5
  title: varchar("title", { length: 200 }),
  comment: text("comment"),
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// NOTIFICATIONS & PUSH
// =====================================================

export const productNotifications = pgTable("product_notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// PASSWORD RESET
// =====================================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// OFFERS / BANNERS
// =====================================================

export const offers = pgTable("offers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 200 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }),
  subtitle: text("subtitle"),
  subtitleEn: text("subtitle_en"),
  imageUrl: text("image_url"),
  backgroundColor: varchar("background_color", { length: 100 }),
  ctaText: varchar("cta_text", { length: 50 }).default("تسوق الآن"),
  ctaTextEn: varchar("cta_text_en", { length: 50 }).default("Shop Now"),
  linkType: varchar("link_type", { length: 20 }).notNull(), // 'category' | 'product' | 'search' | 'url'
  linkValue: varchar("link_value", { length: 200 }).notNull(), // category slug, product id, search query, or URL
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// ADMIN LOGS
// =====================================================

export const adminLogs = pgTable("admin_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  adminUserId: varchar("admin_user_id").references(() => users.id).notNull(),
  adminName: varchar("admin_name", { length: 200 }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'product' | 'order' | 'user' | etc.
  targetId: varchar("target_id", { length: 100 }),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// RELATIONS
// =====================================================

export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  orders: many(orders),
  wishlists: many(wishlists),
  reviews: many(reviews),
  loyaltyTransactions: many(loyaltyTransactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  wishlists: many(wishlists),
  reviews: many(reviews),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  deliveryZone: one(deliveryZones, {
    fields: [orders.deliveryZoneId],
    references: [deliveryZones.id],
  }),
  deliverySlot: one(deliverySlots, {
    fields: [orders.deliverySlotId],
    references: [deliverySlots.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
}));

// =====================================================
// TYPES
// =====================================================

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCategory = typeof categories.$inferInsert;
export type Category = typeof categories.$inferSelect;

export type InsertProduct = typeof products.$inferInsert;
export type Product = typeof products.$inferSelect;

export type InsertCartItem = typeof cartItems.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertDeliveryZone = typeof deliveryZones.$inferInsert;
export type DeliveryZone = typeof deliveryZones.$inferSelect;

export type InsertDeliverySlot = typeof deliverySlots.$inferInsert;
export type DeliverySlot = typeof deliverySlots.$inferSelect;

export type InsertPromoCode = typeof promoCodes.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;

export type InsertWishlist = typeof wishlists.$inferInsert;
export type Wishlist = typeof wishlists.$inferSelect;

export type InsertReview = typeof reviews.$inferInsert;
export type Review = typeof reviews.$inferSelect;

export type InsertProductNotification = typeof productNotifications.$inferInsert;
export type ProductNotification = typeof productNotifications.$inferSelect;

export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

export type InsertAdminLog = typeof adminLogs.$inferInsert;
export type AdminLog = typeof adminLogs.$inferSelect;

export type InsertOffer = typeof offers.$inferInsert;
export type Offer = typeof offers.$inferSelect;

// =====================================================
// ZOD SCHEMAS
// =====================================================

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1),
  slug: z.string().min(1),
}).omit({
  id: true as never,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).omit({
  id: true as never,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true as never,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders, {
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).omit({
  id: true as never,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  productPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).omit({
  id: true as never,
  createdAt: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes, {
  code: z.string().min(3).max(50),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).omit({
  id: true as never,
  createdAt: true,
  usedCount: true,
});

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().min(1).max(5),
}).omit({
  id: true as never,
  createdAt: true,
  updatedAt: true,
  isVerifiedPurchase: true,
  isApproved: true,
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  deliveryAddress: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const insertProductNotificationSchema = createInsertSchema(productNotifications).omit({
  id: true as never,
  createdAt: true,
});

export const insertOfferSchema = createInsertSchema(offers, {
  title: z.string().min(1),
  linkType: z.enum(['category', 'product', 'search', 'url']),
  linkValue: z.string().min(1),
}).omit({
  id: true as never,
  createdAt: true,
  updatedAt: true,
});

