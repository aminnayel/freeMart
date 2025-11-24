import {
  users,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
} from "@shared/schema";
import { hashPassword } from "./password";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, data: Partial<User>): Promise<User | undefined>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Product operations
  getProducts(categoryId?: number, searchQuery?: string): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Cart operations
  getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number, userId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrderById(orderId: number, userId: string): Promise<(Order & { items: OrderItem[] }) | undefined>;
  updateOrderStatus(orderId: number, status: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private products: Map<number, Product> = new Map();
  private cartItems: Map<number, CartItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();

  private categoryIdCounter = 1;
  private productIdCounter = 1;
  private cartItemIdCounter = 1;
  private orderIdCounter = 1;
  private orderItemIdCounter = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed realistic Egyptian supermarket categories in Arabic
    const cats = [
      { name: "فواكه وخضروات", slug: "fruits-vegetables", imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400" },
      { name: "ألبان وبيض", slug: "dairy-eggs", imageUrl: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400" },
      { name: "مخبوزات", slug: "bakery", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400" },
      { name: "لحوم ودواجن", slug: "meat-poultry", imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400" },
      { name: "مشروبات", slug: "beverages", imageUrl: "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=400" },
      { name: "بقالة", slug: "pantry", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
    ];

    cats.forEach(c => this.createCategory(c));

    // Seed realistic Egyptian supermarket products with EGP pricing - all in Arabic
    const prods = [
      // فواكه وخضروات
      { name: "موز طازج", description: "موز طازج ومستورد عالي الجودة", price: "15.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", isAvailable: true },
      { name: "تفاح أحمر", description: "تفاح أحمر مصري طازج", price: "25.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", isAvailable: true },
      { name: "طماطم طازجة", description: "طماطم مصرية طازجة للسلطة والطبخ", price: "8.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400", isAvailable: true },
      { name: "خيار أخضر", description: "خيار مصري طازج مثالي للسلطة", price: "6.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400", isAvailable: true },
      { name: "برتقال بلدي", description: "برتقال مصري بلدي غني بفيتامين سي", price: "12.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=400", isAvailable: true },
      { name: "بطاطس", description: "بطاطس مصرية طازجة", price: "10.00", unit: "unit_kg", categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400", isAvailable: true },

      // ألبان وبيض
      { name: "لبن جهينة كامل الدسم", description: "لبن جهينة طازج كامل الدسم ١ لتر", price: "22.00", unit: "unit_liter", categoryId: 2, imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", isAvailable: true },
      { name: "زبادي دانون", description: "زبادي دانون كريمي ٤٠٠ جرام", price: "18.00", unit: "unit_pack", categoryId: 2, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", isAvailable: true },
      { name: "جبنة رومي", description: "جبنة رومي مصرية ٢٥٠ جرام", price: "55.00", unit: "unit_pack", categoryId: 2, imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400", isAvailable: true },
      { name: "بيض أبيض", description: "بيض أبيض طازج من المزرعة", price: "45.00", unit: "unit_dozen", categoryId: 2, imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400", isAvailable: true },
      { name: "جبنة فيتا", description: "جبنة فيتا بيضاء ٥٠٠ جرام", price: "40.00", unit: "unit_pack", categoryId: 2, imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", isAvailable: true },

      // مخبوزات
      { name: "عيش فينو", description: "عيش فينو طازج من الفرن", price: "5.00", unit: "unit_piece", categoryId: 3, imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", isAvailable: true },
      { name: "عيش بلدي", description: "عيش بلدي مصري أصلي", price: "3.00", unit: "unit_piece", categoryId: 3, imageUrl: "https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=400", isAvailable: true },
      { name: "كرواسون", description: "كرواسون بالزبدة الطبيعية عبوة ٤ قطع", price: "25.00", unit: "unit_pack", categoryId: 3, imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", isAvailable: true },
      { name: "توست أبيض", description: "توست أبيض طري للساندويتشات", price: "15.00", unit: "unit_pack", categoryId: 3, imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400", isAvailable: true },

      // لحوم ودواجن
      { name: "صدور فراخ", description: "صدور فراخ طازجة بدون عظم", price: "90.00", unit: "unit_kg", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400", isAvailable: true },
      { name: "لحم بقري مفروم", description: "لحم بقري مفروم طازج قليل الدهن", price: "180.00", unit: "unit_kg", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400", isAvailable: true },
      { name: "سمك فيليه", description: "فيليه سمك أبيض طازج", price: "110.00", unit: "unit_kg", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400", isAvailable: true },
      { name: "كبدة فراخ", description: "كبدة فراخ طازجة", price: "65.00", unit: "unit_kg", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400", isAvailable: true },

      // مشروبات
      { name: "عصير برتقال طبيعي", description: "عصير برتقال طبيعي ١٠٠٪ لتر واحد", price: "30.00", unit: "unit_liter", categoryId: 5, imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400", isAvailable: true },
      { name: "مياه معدنية نستله", description: "مياه معدنية نستله ١.٥ لتر", price: "6.00", unit: "unit_liter", categoryId: 5, imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400", isAvailable: true },
      { name: "كوكاكولا", description: "كوكاكولا مشروب غازي ١ لتر", price: "18.00", unit: "unit_liter", categoryId: 5, imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400", isAvailable: true },
      { name: "شاي ليبتون", description: "شاي ليبتون أصفر ١٠٠ كيس", price: "45.00", unit: "unit_pack", categoryId: 5, imageUrl: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400", isAvailable: true },

      // بقالة
      { name: "أرز أبيض", description: "أرز أبيض مصري فاخر ١ كيلو", price: "20.00", unit: "unit_kg", categoryId: 6, imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", isAvailable: true },
      { name: "مكرونة", description: "مكرونة إيطالية ٥٠٠ جرام", price: "15.00", unit: "unit_pack", categoryId: 6, imageUrl: "https://images.unsplash.com/photo-1551462147-37bd170cda27?w=400", isAvailable: true },
      { name: "زيت زيتون", description: "زيت زيتون بكر ممتاز ٥٠٠ مل", price: "85.00", unit: "unit_liter", categoryId: 6, imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400", isAvailable: true },
      { name: "سكر أبيض", description: "سكر أبيض ناعم ١ كيلو", price: "22.00", unit: "unit_kg", categoryId: 6, imageUrl: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400", isAvailable: true },
      { name: "ملح طعام", description: "ملح طعام ميود ١ كيلو", price: "8.00", unit: "unit_kg", categoryId: 6, imageUrl: "https://images.unsplash.com/photo-1598514982901-ae62764ae75e?w=400", isAvailable: true },
    ];

    prods.forEach(p => this.createProduct(p));

    // Seed test users
    this.seedUsers();
  }

  private async seedUsers() {
    const hashedPassword = await hashPassword("password123");

    // User 1: Regular User
    await this.upsertUser({
      firstName: "Test",
      lastName: "User",
      phoneNumber: "01234567890",
      password: hashedPassword,
      isAdmin: false,
    });

    // User 2: Admin User
    await this.upsertUser({
      firstName: "Admin",
      lastName: "User",
      phoneNumber: "01000000000",
      password: hashedPassword,
      isAdmin: true,
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phoneNumber === phoneNumber
    );
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || "user-1";
    const existing = this.users.get(id);
    const user: User = {
      ...userData,
      id,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      password: userData.password,
      deliveryAddress: userData.deliveryAddress || null,
      city: userData.city || null,
      postalCode: userData.postalCode || null,
      phoneNumber: userData.phoneNumber,
      // Set test@example.com as admin by default
      isAdmin: userData.email === "test@example.com" ? true : (userData.isAdmin ?? false),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password = hashedPassword;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = {
      ...category,
      id,
      imageUrl: category.imageUrl || null,
      createdAt: new Date(),
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Product operations
  async getProducts(categoryId?: number, searchQuery?: string): Promise<Product[]> {
    let products = Array.from(this.products.values());
    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery))
      );
    }
    return products;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const newProduct: Product = {
      ...product,
      id,
      description: product.description || null,
      imageUrl: product.imageUrl || null,
      stock: product.stock || 0,
      unit: product.unit || "piece",
      isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Product = {
      ...existing,
      ...product,
      id,
      updatedAt: new Date(),
    };

    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }

  // Cart operations
  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    const items = Array.from(this.cartItems.values()).filter(i => i.userId === userId);
    return items.map(item => {
      const product = this.products.get(item.productId)!;
      return { ...item, product };
    }).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = Array.from(this.cartItems.values()).find(
      i => i.userId === item.userId && i.productId === item.productId
    );

    if (existing) {
      existing.quantity += item.quantity || 1;
      existing.updatedAt = new Date();
      this.cartItems.set(existing.id, existing);
      return existing;
    }

    const id = this.cartItemIdCounter++;
    const newItem: CartItem = {
      ...item,
      id,
      quantity: item.quantity || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cartItems.set(id, newItem);
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    item.quantity = quantity;
    item.updatedAt = new Date();
    this.cartItems.set(id, item);
    return item;
  }

  async removeFromCart(id: number, userId: string): Promise<void> {
    const item = this.cartItems.get(id);
    if (item && item.userId === userId) {
      this.cartItems.delete(id);
    }
  }

  async clearCart(userId: string): Promise<void> {
    const toDelete = Array.from(this.cartItems.values())
      .filter(i => i.userId === userId)
      .map(i => i.id);
    toDelete.forEach(id => this.cartItems.delete(id));
  }

  // Order operations
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder: Order = {
      ...order,
      id,
      status: "pending",
      notes: order.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, newOrder);

    items.forEach(item => {
      const itemId = this.orderItemIdCounter++;
      this.orderItems.set(itemId, {
        ...item,
        id: itemId,
        orderId: id,
        createdAt: new Date(),
      });
    });

    return newOrder;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getOrderById(orderId: number, userId: string): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const order = this.orders.get(orderId);
    if (!order || order.userId !== userId) return undefined;

    const items = Array.from(this.orderItems.values()).filter(i => i.orderId === orderId);
    return { ...order, items };
  }

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
      this.orders.set(orderId, order);
    }
  }
}

export const storage = new MemStorage();
