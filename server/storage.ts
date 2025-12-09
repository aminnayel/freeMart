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
  type InsertProductNotification,
  type ProductNotification,
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
  getOrderByIdAdmin(orderId: number): Promise<(Order & { items: OrderItem[] }) | undefined>;
  updateOrderStatus(orderId: number, status: string): Promise<Order | undefined>;
  getAllOrders(search?: string, status?: string): Promise<Order[]>;

  // Notification operations
  createProductNotification(notification: InsertProductNotification): Promise<ProductNotification>;
  getProductNotification(userId: string, productId: number): Promise<ProductNotification | undefined>;
  getAllProductNotifications(): Promise<ProductNotification[]>;
  getNotificationSubscribers(productId: number): Promise<ProductNotification[]>;
  deleteNotificationsForProduct(productId: number): Promise<void>;

  // Stock operations
  decreaseProductStock(productId: number, quantity: number): Promise<Product | undefined>;

  // Push subscription operations
  savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void>;
  getPushSubscriptions(): Promise<PushSubscriptionData[]>;
  getPushSubscriptionByUserId(userId: string): Promise<PushSubscriptionData | undefined>;
  removePushSubscription(userId: string): Promise<void>;

  // Admin log operations
  createAdminLog(log: AdminLogData): Promise<AdminLog>;
  getAdminLogs(filters?: AdminLogFilters): Promise<AdminLog[]>;
}

export interface AdminLogFilters {
  limit?: number;
  action?: string;
  adminUserId?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
}

// Push subscription data type
export interface PushSubscriptionData {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

// Admin log data types
export interface AdminLogData {
  adminUserId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: number | string;
  details: string;
}

export interface AdminLog extends AdminLogData {
  id: number;
  timestamp: Date;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private products: Map<number, Product> = new Map();
  private cartItems: Map<number, CartItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private productNotifications: Map<number, ProductNotification> = new Map();
  private pushSubscriptions: Map<string, PushSubscriptionData> = new Map();
  private adminLogs: Map<number, AdminLog> = new Map();

  private categoryIdCounter = 1;
  private productIdCounter = 1;
  private cartItemIdCounter = 1;
  private orderIdCounter = 1;
  private orderItemIdCounter = 1;
  private notificationIdCounter = 1;
  private adminLogIdCounter = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed comprehensive Egyptian hypermarket categories in Arabic
    const cats = [
      { name: "فواكه وخضروات", englishName: "Fruits & Vegetables", slug: "fruits-vegetables", imageUrl: "🥬" },
      { name: "ألبان وبيض", englishName: "Dairy & Eggs", slug: "dairy-eggs", imageUrl: "🥛" },
      { name: "مخبوزات", englishName: "Bakery", slug: "bakery", imageUrl: "🥖" },
      { name: "لحوم ودواجن", englishName: "Meat & Poultry", slug: "meat-poultry", imageUrl: "🥩" },
      { name: "مشروبات", englishName: "Beverages", slug: "beverages", imageUrl: "🥤" },
      { name: "بقالة", englishName: "Pantry", slug: "pantry", imageUrl: "🥫" },
      { name: "حلويات ومقرمشات", englishName: "Snacks & Sweets", slug: "snacks-sweets", imageUrl: "🍫" },
      { name: "منظفات", englishName: "Cleaning Products", slug: "cleaning", imageUrl: "🧴" },
      { name: "عناية شخصية", englishName: "Personal Care", slug: "personal-care", imageUrl: "🧼" },
      { name: "مجمدات", englishName: "Frozen Foods", slug: "frozen", imageUrl: "🧊" },
    ];

    cats.forEach(c => this.createCategory(c));

    // Comprehensive Egyptian hypermarket product inventory
    const prods = [
      // ==================== فواكه وخضروات (Category 1) ====================
      { name: "طماطم صلصة فلاحي", englishName: "Farmer's Sauce Tomatoes", description: "طماطم للصلصة طازجة", englishDescription: "Fresh tomatoes for sauce", price: "12.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍅", isAvailable: true },
      { name: "بطاطس للقلي", englishName: "Frying Potatoes", description: "بطاطس قلية ممتازة", englishDescription: "Premium frying potatoes", price: "18.00", unit: "unit_kg", categoryId: 1, imageUrl: "🥔", isAvailable: true },
      { name: "خيار فلاحي", englishName: "Farmer's Cucumber", description: "خيار طازج من المزرعة", englishDescription: "Fresh farm cucumber", price: "20.00", unit: "unit_kg", categoryId: 1, imageUrl: "🥒", isAvailable: true },
      { name: "بصل أحمر", englishName: "Red Onion", description: "بصل أحمر جودة عالية", englishDescription: "High quality red onion", price: "15.00", unit: "unit_kg", categoryId: 1, imageUrl: "🧅", isAvailable: true },
      { name: "ثوم بلدي", englishName: "Local Garlic", description: "ثوم مصري طبيعي", englishDescription: "Natural Egyptian garlic", price: "100.00", unit: "unit_kg", categoryId: 1, imageUrl: "🧄", isAvailable: true },
      { name: "جزر فلاحي", englishName: "Farmer's Carrots", description: "جزر طازج", englishDescription: "Fresh carrots", price: "20.00", unit: "unit_kg", categoryId: 1, imageUrl: "🥕", isAvailable: true },
      { name: "فلفل ألوان", englishName: "Bell Peppers", description: "فلفل ألوان مشكل", englishDescription: "Mixed bell peppers", price: "45.00", unit: "unit_kg", categoryId: 1, imageUrl: "🫑", isAvailable: true },
      { name: "موز بلدي", englishName: "Local Banana", description: "موز مصري طازج", englishDescription: "Fresh Egyptian banana", price: "35.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍌", isAvailable: true },
      { name: "تفاح أحمر", englishName: "Red Apple", description: "تفاح أحمر سكري", englishDescription: "Sweet red apple", price: "85.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍎", isAvailable: true, stock: 25 },
      { name: "برتقال بلدي", englishName: "Local Orange", description: "برتقال مصري للعصير", englishDescription: "Egyptian orange for juice", price: "25.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍊", isAvailable: true, stock: 100 },
      { name: "فراولة طازجة", englishName: "Fresh Strawberry", description: "فراولة طازجة من الإسماعيلية - نفذت الكمية", englishDescription: "Fresh strawberry from Ismailia - Out of Stock", price: "50.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍓", isAvailable: false, stock: 0 },
      { name: "عنب أحمر", englishName: "Red Grapes", description: "عنب أحمر سكري - نفذت الكمية", englishDescription: "Sweet red grapes - Out of Stock", price: "60.00", unit: "unit_kg", categoryId: 1, imageUrl: "🍇", isAvailable: false, stock: 0 },

      // ==================== ألبان وبيض (Category 2) ====================
      { name: "لبن جهينة كامل الدسم", englishName: "Juhayna Full Cream Milk", description: "لبن طازج كامل الدسم 1 لتر", englishDescription: "Fresh full cream milk 1L", price: "38.00", unit: "unit_liter", categoryId: 2, imageUrl: "🥛", isAvailable: true },
      { name: "لبن جهينة سكيم", englishName: "Juhayna Skimmed Milk", description: "لبن خالي الدسم 1 لتر", englishDescription: "Skimmed milk 1L", price: "35.00", unit: "unit_liter", categoryId: 2, imageUrl: "🥛", isAvailable: true },
      { name: "زبادي جهينة", englishName: "Juhayna Yogurt", description: "زبادي طبيعي 6 علب", englishDescription: "Natural yogurt 6 cups", price: "42.00", unit: "unit_pack", categoryId: 2, imageUrl: "🍶", isAvailable: true },
      { name: "زبادي أكتيفيا", englishName: "Activia Yogurt", description: "زبادي أكتيفيا للهضم", englishDescription: "Activia digestive yogurt", price: "50.00", unit: "unit_pack", categoryId: 2, imageUrl: "🍶", isAvailable: true },
      { name: "جبنة دوميات بيضاء", englishName: "Domty White Cheese", description: "جبنة بيضاء 500 جرام", englishDescription: "White cheese 500g", price: "65.00", unit: "unit_pack", categoryId: 2, imageUrl: "🧀", isAvailable: true },
      { name: "جبنة لبنيتا مثلثات", englishName: "Labanita Triangles Cheese", description: "جبنة مثلثات 16 قطعة", englishDescription: "Cheese triangles 16 pieces", price: "55.00", unit: "unit_box", categoryId: 2, imageUrl: "🧀", isAvailable: true },
      { name: "جبنة كرافت شيدر", englishName: "Kraft Cheddar Cheese", description: "جبنة شيدر شرائح", englishDescription: "Cheddar cheese slices", price: "75.00", unit: "unit_pack", categoryId: 2, imageUrl: "🧀", isAvailable: true },
      { name: "بيض بلدي", englishName: "Local Eggs", description: "بيض بلدي 30 بيضة", englishDescription: "Local eggs 30 pieces", price: "145.00", unit: "unit_box", categoryId: 2, imageUrl: "🥚", isAvailable: true },
      { name: "زبدة الصافي", englishName: "El Safi Butter", description: "زبدة طبيعية 200 جرام", englishDescription: "Natural butter 200g", price: "48.00", unit: "unit_pack", categoryId: 2, imageUrl: "🧈", isAvailable: true },
      { name: "قشطة نستله", englishName: "Nestle Cream", description: "قشطة طبخ 170 جرام", englishDescription: "Cooking cream 170g", price: "35.00", unit: "unit_piece", categoryId: 2, imageUrl: "🥫", isAvailable: true },

      // ==================== مخبوزات (Category 3) ====================
      { name: "خبز تورتيلا لورادو", englishName: "Lorado Tortilla Bread", description: "خبز تورتيلا كبير 8 قطع", englishDescription: "Large tortilla 8 pieces", price: "42.00", unit: "unit_pack", categoryId: 3, imageUrl: "🫓", isAvailable: true },
      { name: "توست فينو", englishName: "Fino Toast", description: "توست أبيض شرائح", englishDescription: "White toast slices", price: "28.00", unit: "unit_pack", categoryId: 3, imageUrl: "🍞", isAvailable: true },
      { name: "خبز صامولي", englishName: "Samoli Bread", description: "خبز صامولي 6 قطع", englishDescription: "Samoli bread 6 pieces", price: "18.00", unit: "unit_pack", categoryId: 3, imageUrl: "🥖", isAvailable: true },
      { name: "كرواسون شوكولاتة", englishName: "Chocolate Croissant", description: "كرواسون بالشوكولاتة 4 قطع", englishDescription: "Chocolate croissant 4 pieces", price: "55.00", unit: "unit_pack", categoryId: 3, imageUrl: "🥐", isAvailable: true },
      { name: "خبز برجر", englishName: "Burger Buns", description: "خبز برجر 6 قطع", englishDescription: "Burger buns 6 pieces", price: "25.00", unit: "unit_pack", categoryId: 3, imageUrl: "🍔", isAvailable: true },
      { name: "كحك العيد", englishName: "Eid Kahk", description: "كحك بالتمر والسمسم", englishDescription: "Kahk with dates and sesame", price: "180.00", unit: "unit_kg", categoryId: 3, imageUrl: "🍪", isAvailable: true },

      // ==================== لحوم ودواجن (Category 4) ====================
      { name: "فراخ الوطنية كاملة", englishName: "El Watania Whole Chicken", description: "فراخ كاملة مجمدة", englishDescription: "Frozen whole chicken", price: "165.00", unit: "unit_piece", categoryId: 4, imageUrl: "🍗", isAvailable: true },
      { name: "صدور فراخ أمريكانا", englishName: "Americana Chicken Breast", description: "صدور دجاج بدون عظم 1 كجم", englishDescription: "Boneless chicken breast 1kg", price: "220.00", unit: "unit_kg", categoryId: 4, imageUrl: "🍗", isAvailable: true },
      { name: "لحم بتلو مفروم", englishName: "Ground Beef", description: "لحم مفروم بقري طازج", englishDescription: "Fresh ground beef", price: "280.00", unit: "unit_kg", categoryId: 4, imageUrl: "🥩", isAvailable: true },
      { name: "ستيك لحم", englishName: "Beef Steak", description: "ستيك بقري ممتاز", englishDescription: "Premium beef steak", price: "450.00", unit: "unit_kg", categoryId: 4, imageUrl: "🥩", isAvailable: true },
      { name: "سجق بلدي", englishName: "Local Sausage", description: "سجق مصري حار", englishDescription: "Egyptian spicy sausage", price: "180.00", unit: "unit_kg", categoryId: 4, imageUrl: "🌭", isAvailable: true },
      { name: "كفتة لحم", englishName: "Beef Kofta", description: "كفتة جاهزة للشوي", englishDescription: "Ready-to-grill kofta", price: "250.00", unit: "unit_kg", categoryId: 4, imageUrl: "🍖", isAvailable: true },
      { name: "أوراك فراخ", englishName: "Chicken Thighs", description: "أوراك دجاج طازجة", englishDescription: "Fresh chicken thighs", price: "150.00", unit: "unit_kg", categoryId: 4, imageUrl: "🍗", isAvailable: true },

      // ==================== مشروبات (Category 5) ====================
      { name: "بيبسي عبوة 1 لتر", englishName: "Pepsi 1L", description: "بيبسي كولا 1 لتر", englishDescription: "Pepsi Cola 1 liter", price: "22.00", unit: "unit_piece", categoryId: 5, imageUrl: "🥤", isAvailable: true },
      { name: "كوكاكولا عبوة 1 لتر", englishName: "Coca-Cola 1L", description: "كوكا كولا 1 لتر", englishDescription: "Coca-Cola 1 liter", price: "22.00", unit: "unit_piece", categoryId: 5, imageUrl: "🥤", isAvailable: true },
      { name: "سفن أب 1 لتر", englishName: "7Up 1L", description: "سفن أب ليمون 1 لتر", englishDescription: "7Up lemon 1 liter", price: "20.00", unit: "unit_piece", categoryId: 5, imageUrl: "🥤", isAvailable: true },
      { name: "ميرندا برتقال", englishName: "Mirinda Orange", description: "ميرندا برتقال 1 لتر", englishDescription: "Mirinda orange 1 liter", price: "20.00", unit: "unit_piece", categoryId: 5, imageUrl: "🥤", isAvailable: true },
      { name: "عصير جهينة مانجو", englishName: "Juhayna Mango Juice", description: "عصير مانجو 1 لتر", englishDescription: "Mango juice 1 liter", price: "38.00", unit: "unit_liter", categoryId: 5, imageUrl: "🧃", isAvailable: true },
      { name: "عصير جهينة برتقال", englishName: "Juhayna Orange Juice", description: "عصير برتقال طبيعي 1 لتر", englishDescription: "Natural orange juice 1L", price: "42.00", unit: "unit_liter", categoryId: 5, imageUrl: "🧃", isAvailable: true },
      { name: "ريد بول", englishName: "Red Bull", description: "مشروب طاقة 250 مل", englishDescription: "Energy drink 250ml", price: "55.00", unit: "unit_piece", categoryId: 5, imageUrl: "🥤", isAvailable: true },
      { name: "مياه نستله 1.5 لتر", englishName: "Nestle Water 1.5L", description: "مياه معدنية نقية", englishDescription: "Pure mineral water", price: "10.00", unit: "unit_piece", categoryId: 5, imageUrl: "💧", isAvailable: true },
      { name: "مياه دساني 1 لتر", englishName: "Dasani Water 1L", description: "مياه معالجة", englishDescription: "Processed water", price: "8.00", unit: "unit_piece", categoryId: 5, imageUrl: "💧", isAvailable: true },
      { name: "نسكافيه 3 في 1", englishName: "Nescafe 3-in-1", description: "قهوة سريعة التحضير 10 أكياس", englishDescription: "Instant coffee 10 sachets", price: "65.00", unit: "unit_box", categoryId: 5, imageUrl: "☕", isAvailable: true },

      // ==================== بقالة (Category 6) ====================
      { name: "أرز أبو كاس بسمتي", englishName: "Abu Kas Basmati Rice", description: "أرز بسمتي فاخر 1 كجم", englishDescription: "Premium basmati rice 1kg", price: "85.00", unit: "unit_kg", categoryId: 6, imageUrl: "🍚", isAvailable: true },
      { name: "أرز مصري أبو بنت", englishName: "Abu Bent Egyptian Rice", description: "أرز مصري 1 كجم", englishDescription: "Egyptian rice 1kg", price: "38.00", unit: "unit_kg", categoryId: 6, imageUrl: "🍚", isAvailable: true },
      { name: "مكرونة ريجينا", englishName: "Regina Pasta", description: "مكرونة سباغيتي 400 جرام", englishDescription: "Spaghetti pasta 400g", price: "25.00", unit: "unit_pack", categoryId: 6, imageUrl: "🍝", isAvailable: true },
      { name: "زيت عافية 1 لتر", englishName: "Afia Oil 1L", description: "زيت عباد الشمس", englishDescription: "Sunflower oil", price: "75.00", unit: "unit_liter", categoryId: 6, imageUrl: "🫒", isAvailable: true },
      { name: "زيت عرايس 1 لتر", englishName: "Arais Oil 1L", description: "زيت ذرة نقي", englishDescription: "Pure corn oil", price: "85.00", unit: "unit_liter", categoryId: 6, imageUrl: "🫒", isAvailable: true },
      { name: "سكر القصب 1 كجم", englishName: "Cane Sugar 1kg", description: "سكر أبيض ناعم", englishDescription: "Fine white sugar", price: "38.00", unit: "unit_kg", categoryId: 6, imageUrl: "🧂", isAvailable: true },
      { name: "ملح سينا 500 جرام", englishName: "Sina Salt 500g", description: "ملح طعام نقي", englishDescription: "Pure table salt", price: "8.00", unit: "unit_pack", categoryId: 6, imageUrl: "🧂", isAvailable: true },
      { name: "تونة قطعة جيشة", englishName: "Geisha Tuna Chunks", description: "تونة قطع في زيت", englishDescription: "Tuna chunks in oil", price: "42.00", unit: "unit_piece", categoryId: 6, imageUrl: "🥫", isAvailable: true },
      { name: "فول قها", englishName: "Qaha Fava Beans", description: "فول مدمس 400 جرام", englishDescription: "Fava beans 400g", price: "22.00", unit: "unit_piece", categoryId: 6, imageUrl: "🥫", isAvailable: true },
      { name: "صلصة هاينز", englishName: "Heinz Ketchup", description: "كاتشب هاينز 500 جرام", englishDescription: "Heinz ketchup 500g", price: "65.00", unit: "unit_piece", categoryId: 6, imageUrl: "🍅", isAvailable: true },
      { name: "مايونيز هاينز", englishName: "Heinz Mayonnaise", description: "مايونيز 400 جرام", englishDescription: "Mayonnaise 400g", price: "75.00", unit: "unit_piece", categoryId: 6, imageUrl: "🥫", isAvailable: true },

      // ==================== حلويات ومقرمشات (Category 7) ====================
      { name: "شيبسي تايجر", englishName: "Chipsy Tiger", description: "شيبسي تايجر حار 72 جرام", englishDescription: "Chipsy Tiger hot 72g", price: "18.00", unit: "unit_piece", categoryId: 7, imageUrl: "🍟", isAvailable: true },
      { name: "شيبسي عادي", englishName: "Chipsy Regular", description: "شيبسي ملح 65 جرام", englishDescription: "Chipsy salt 65g", price: "15.00", unit: "unit_piece", categoryId: 7, imageUrl: "🍟", isAvailable: true },
      { name: "لايز كلاسيك", englishName: "Lay's Classic", description: "لايز ملح 160 جرام", englishDescription: "Lay's salt 160g", price: "35.00", unit: "unit_pack", categoryId: 7, imageUrl: "🍟", isAvailable: true },
      { name: "دوريتوس ناتشوز", englishName: "Doritos Nachos", description: "دوريتوس جبنة 180 جرام", englishDescription: "Doritos cheese 180g", price: "45.00", unit: "unit_pack", categoryId: 7, imageUrl: "🌮", isAvailable: true },
      { name: "شوكولاتة كادبوري", englishName: "Cadbury Chocolate", description: "شوكولاتة بالحليب 65 جرام", englishDescription: "Milk chocolate 65g", price: "28.00", unit: "unit_piece", categoryId: 7, imageUrl: "🍫", isAvailable: true },
      { name: "كيت كات", englishName: "Kit Kat", description: "كيت كات 4 أصابع", englishDescription: "Kit Kat 4 fingers", price: "25.00", unit: "unit_piece", categoryId: 7, imageUrl: "🍫", isAvailable: true },
      { name: "سنيكرز", englishName: "Snickers", description: "سنيكرز بالفول السوداني", englishDescription: "Snickers with peanuts", price: "30.00", unit: "unit_piece", categoryId: 7, imageUrl: "🍫", isAvailable: true },
      { name: "أوريو بسكويت", englishName: "Oreo Cookies", description: "أوريو كريمة 137 جرام", englishDescription: "Oreo cream 137g", price: "35.00", unit: "unit_pack", categoryId: 7, imageUrl: "🍪", isAvailable: true },
      { name: "ديجيستيف", englishName: "Digestive Biscuits", description: "بسكويت ديجيستيف 250 جرام", englishDescription: "Digestive biscuits 250g", price: "45.00", unit: "unit_pack", categoryId: 7, imageUrl: "🍪", isAvailable: true },
      { name: "بسكويت لواكر", englishName: "Loacker Wafer", description: "ويفر لواكر شوكولاتة", englishDescription: "Loacker chocolate wafer", price: "38.00", unit: "unit_pack", categoryId: 7, imageUrl: "🍪", isAvailable: true },

      // ==================== منظفات (Category 8) ====================
      { name: "برسيل غسيل 2 لتر", englishName: "Persil Laundry 2L", description: "منظف غسيل سائل", englishDescription: "Liquid laundry detergent", price: "145.00", unit: "unit_piece", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "تايد بودرة 2.5 كجم", englishName: "Tide Powder 2.5kg", description: "مسحوق غسيل أوتوماتيك", englishDescription: "Automatic washing powder", price: "165.00", unit: "unit_pack", categoryId: 8, imageUrl: "📦", isAvailable: true },
      { name: "فيري سائل صحون", englishName: "Fairy Dish Soap", description: "سائل غسيل صحون 750 مل", englishDescription: "Dish washing liquid 750ml", price: "55.00", unit: "unit_piece", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "كلوركس مبيض", englishName: "Clorox Bleach", description: "مبيض كلوركس 1 لتر", englishDescription: "Clorox bleach 1L", price: "35.00", unit: "unit_liter", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "داك منظف أرضيات", englishName: "Dac Floor Cleaner", description: "منظف أرضيات بالصنوبر 1 لتر", englishDescription: "Pine floor cleaner 1L", price: "48.00", unit: "unit_liter", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "فلاش منظف حمام", englishName: "Flash Bathroom Cleaner", description: "منظف حمامات 750 مل", englishDescription: "Bathroom cleaner 750ml", price: "45.00", unit: "unit_piece", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "ملمع زجاج وندكس", englishName: "Windex Glass Cleaner", description: "منظف زجاج بخاخ", englishDescription: "Glass cleaner spray", price: "52.00", unit: "unit_piece", categoryId: 8, imageUrl: "🧴", isAvailable: true },
      { name: "سلفانا مناديل مبللة", englishName: "Silvana Wet Wipes", description: "مناديل مبللة للتنظيف 40 منديل", englishDescription: "Cleaning wet wipes 40 pcs", price: "25.00", unit: "unit_pack", categoryId: 8, imageUrl: "🧻", isAvailable: true },

      // ==================== عناية شخصية (Category 9) ====================
      { name: "شامبو هيد آند شولدرز", englishName: "Head & Shoulders Shampoo", description: "شامبو ضد القشرة 400 مل", englishDescription: "Anti-dandruff shampoo 400ml", price: "95.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧴", isAvailable: true },
      { name: "شامبو بانتين", englishName: "Pantene Shampoo", description: "شامبو بانتين للشعر الجاف 400 مل", englishDescription: "Pantene dry hair shampoo 400ml", price: "110.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧴", isAvailable: true },
      { name: "صابون دوف", englishName: "Dove Soap", description: "صابون دوف بالكريم 135 جرام", englishDescription: "Dove cream bar soap 135g", price: "32.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧼", isAvailable: true },
      { name: "صابون لوكس", englishName: "Lux Soap", description: "صابون لوكس عطري 120 جرام", englishDescription: "Lux fragrant soap 120g", price: "25.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧼", isAvailable: true },
      { name: "معجون كلوس أب", englishName: "Close Up Toothpaste", description: "معجون أسنان بالنعناع 120 جرام", englishDescription: "Mint toothpaste 120g", price: "35.00", unit: "unit_piece", categoryId: 9, imageUrl: "🪥", isAvailable: true },
      { name: "سيجنال معجون أسنان", englishName: "Signal Toothpaste", description: "معجون أسنان أبيض 100 مل", englishDescription: "White toothpaste 100ml", price: "38.00", unit: "unit_piece", categoryId: 9, imageUrl: "🪥", isAvailable: true },
      { name: "فرشاة أسنان أورال بي", englishName: "Oral-B Toothbrush", description: "فرشاة أسنان ناعمة", englishDescription: "Soft toothbrush", price: "28.00", unit: "unit_piece", categoryId: 9, imageUrl: "🪥", isAvailable: true },
      { name: "مزيل عرق ريكسونا", englishName: "Rexona Deodorant", description: "مزيل عرق بخاخ 150 مل", englishDescription: "Deodorant spray 150ml", price: "75.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧴", isAvailable: true },
      { name: "كريم نيفيا", englishName: "Nivea Cream", description: "كريم مرطب 150 مل", englishDescription: "Moisturizing cream 150ml", price: "95.00", unit: "unit_piece", categoryId: 9, imageUrl: "🧴", isAvailable: true },

      // ==================== مجمدات (Category 10) ====================
      { name: "بطاطس أمريكانا", englishName: "Americana French Fries", description: "بطاطس مقلية مجمدة 1 كجم", englishDescription: "Frozen french fries 1kg", price: "85.00", unit: "unit_kg", categoryId: 10, imageUrl: "🍟", isAvailable: true },
      { name: "برجر لحم أمريكانا", englishName: "Americana Beef Burger", description: "برجر لحم 8 قطع", englishDescription: "Beef burger 8 pieces", price: "125.00", unit: "unit_pack", categoryId: 10, imageUrl: "🍔", isAvailable: true },
      { name: "ناجتس دجاج أمريكانا", englishName: "Americana Chicken Nuggets", description: "قطع دجاج مقرمشة 400 جرام", englishDescription: "Crispy chicken nuggets 400g", price: "95.00", unit: "unit_pack", categoryId: 10, imageUrl: "🍗", isAvailable: true },
      { name: "سمك فيليه مونتانا", englishName: "Montana Fish Fillet", description: "فيليه سمك مجمد 1 كجم", englishDescription: "Frozen fish fillet 1kg", price: "185.00", unit: "unit_kg", categoryId: 10, imageUrl: "🐟", isAvailable: true },
      { name: "جمبري الوطنية", englishName: "El Watania Shrimp", description: "جمبري مجمد 500 جرام", englishDescription: "Frozen shrimp 500g", price: "165.00", unit: "unit_pack", categoryId: 10, imageUrl: "🦐", isAvailable: true },
      { name: "بيتزا أمريكان جرينز", englishName: "American Greens Pizza", description: "بيتزا خضار مجمدة", englishDescription: "Frozen vegetable pizza", price: "75.00", unit: "unit_piece", categoryId: 10, imageUrl: "🍕", isAvailable: true },
      { name: "خضار مشكل مجمد", englishName: "Mixed Frozen Vegetables", description: "خضار مشكل 400 جرام", englishDescription: "Mixed vegetables 400g", price: "45.00", unit: "unit_pack", categoryId: 10, imageUrl: "🥦", isAvailable: true },
      { name: "آيس كريم منظ", englishName: "Monz Ice Cream", description: "آيس كريم فانيليا 1 لتر", englishDescription: "Vanilla ice cream 1L", price: "85.00", unit: "unit_liter", categoryId: 10, imageUrl: "🍦", isAvailable: true },
    ];

    prods.forEach(p => this.createProduct(p));

    // Seed test users
    this.seedUsers();
  }

  private async seedUsers() {
    const hashedPassword = await hashPassword("password123");

    // User 1: Regular User (test)
    await this.upsertUser({
      id: "user-1",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "01234567890",
      password: hashedPassword,
      isAdmin: false,
    });

    // User 2: Regular User with 01000000000
    await this.upsertUser({
      id: "user-2",
      firstName: "مستخدم",
      lastName: "عادي",
      phoneNumber: "01000000000",
      password: await hashPassword("01000000000"),
      isAdmin: false,
    });

    // User 3: Admin User
    await this.upsertUser({
      id: "admin-1",
      firstName: "Admin",
      lastName: "User",
      phoneNumber: "01022222222",
      password: hashedPassword,
      isAdmin: true,
    });

    // User 4: Admin User with phone as password
    await this.upsertUser({
      id: "admin-2",
      firstName: "New",
      lastName: "Admin",
      phoneNumber: "01011111111",
      password: await hashPassword("01011111111"),
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
      englishName: category.englishName || null,
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
        (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
        (p.englishName && p.englishName.toLowerCase().includes(lowerQuery)) ||
        (p.englishDescription && p.englishDescription.toLowerCase().includes(lowerQuery))
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
      englishName: product.englishName || null,
      description: product.description || null,
      englishDescription: product.englishDescription || null,
      imageUrl: product.imageUrl || null,
      stock: product.stock !== undefined ? product.stock : 50,
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

  async getOrderByIdAdmin(orderId: number): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    const items = Array.from(this.orderItems.values()).filter(i => i.orderId === orderId);
    return { ...order, items };
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
      this.orders.set(orderId, order);
      return order;
    }
    return undefined;
  }

  async getAllOrders(search?: string, status?: string): Promise<Order[]> {
    let orders = Array.from(this.orders.values());

    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      orders = orders.filter(o =>
        o.id.toString().includes(lowerSearch) ||
        (o.phoneNumber && o.phoneNumber.includes(lowerSearch)) ||
        (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(lowerSearch))
      );
    }

    return orders.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  // Notification operations
  async createProductNotification(notification: InsertProductNotification): Promise<ProductNotification> {
    const id = this.notificationIdCounter++;
    const newNotification: ProductNotification = {
      ...notification,
      id,
      createdAt: new Date(),
    };
    this.productNotifications.set(id, newNotification);
    return newNotification;
  }

  async getProductNotification(userId: string, productId: number): Promise<ProductNotification | undefined> {
    return Array.from(this.productNotifications.values()).find(
      n => n.userId === userId && n.productId === productId
    );
  }

  async getAllProductNotifications(): Promise<ProductNotification[]> {
    return Array.from(this.productNotifications.values());
  }

  async getNotificationSubscribers(productId: number): Promise<ProductNotification[]> {
    return Array.from(this.productNotifications.values()).filter(
      n => n.productId === productId
    );
  }

  async deleteNotificationsForProduct(productId: number): Promise<void> {
    const toDelete = Array.from(this.productNotifications.values())
      .filter(n => n.productId === productId)
      .map(n => n.id);
    toDelete.forEach(id => this.productNotifications.delete(id));
  }

  // Stock operations
  async decreaseProductStock(productId: number, quantity: number): Promise<Product | undefined> {
    const product = this.products.get(productId);
    if (!product) return undefined;

    const newStock = Math.max(0, (product.stock || 0) - quantity);
    product.stock = newStock;
    product.updatedAt = new Date();

    // Auto-disable if out of stock
    if (newStock === 0) {
      product.isAvailable = false;
    }

    this.products.set(productId, product);
    return product;
  }

  // Push subscription operations
  async savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    const data: PushSubscriptionData = {
      ...subscription,
      userId,
      createdAt: new Date(),
    };
    this.pushSubscriptions.set(userId, data);
  }

  async getPushSubscriptions(): Promise<PushSubscriptionData[]> {
    return Array.from(this.pushSubscriptions.values());
  }

  async getPushSubscriptionByUserId(userId: string): Promise<PushSubscriptionData | undefined> {
    return this.pushSubscriptions.get(userId);
  }

  async removePushSubscription(userId: string): Promise<void> {
    this.pushSubscriptions.delete(userId);
  }

  // Admin log operations
  async createAdminLog(data: AdminLogData): Promise<AdminLog> {
    const log: AdminLog = {
      id: this.adminLogIdCounter++,
      ...data,
      timestamp: new Date(),
    };
    this.adminLogs.set(log.id, log);
    return log;
  }

  async getAdminLogs(filters: AdminLogFilters = {}): Promise<AdminLog[]> {
    const { limit = 100, action, adminUserId, targetType, startDate, endDate } = filters;

    let logs = Array.from(this.adminLogs.values());

    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    if (adminUserId) {
      logs = logs.filter(log => log.adminUserId === adminUserId);
    }
    if (targetType) {
      logs = logs.filter(log => log.targetType === targetType);
    }
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }

    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
