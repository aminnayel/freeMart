import type { Express } from "express";
import { createServer, type Server } from "http";
import webpush from "web-push";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertProductSchema,
  insertCategorySchema,
  insertCartItemSchema,
  insertOrderSchema,
  updateUserProfileSchema,
  insertProductNotificationSchema,
  insertOfferSchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Configure VAPID keys for Web Push
// In production, use environment variables for these keys
const VAPID_PUBLIC_KEY = 'BIZXzkSnvXupXUdVzeg2X2NypI2ebctw9yjuxZMVho94kpHhlCZ_xjrp5BR-Bx_Z3KRbfrhgROCrmQxye1rqKI0';
const VAPID_PRIVATE_KEY = 'XGD4sLutKebBlIRhFGGApwRbQeCObTedtpeMRjJ5_c0';

webpush.setVapidDetails(
  'mailto:admin@khudarfakha.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = updateUserProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }
      const user = await storage.updateUserProfile(userId, result.data);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Admin routes
  app.get('/api/admin/products', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products for admin:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/admin/products', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }
      const product = await storage.createProduct(result.data);

      // Get category name for better logging
      const category = await storage.getCategoryById(product.categoryId);

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "CREATE_PRODUCT",
        targetType: "product",
        targetId: product.id,
        details: JSON.stringify({
          name: product.name,
          englishName: product.englishName,
          price: product.price,
          stock: product.stock,
          category: category?.name || 'Unknown',
          hasImage: !!product.imageUrl
        }),
      });

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/admin/products/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);

      // Get current product to check old stock
      const oldProduct = await storage.getProductById(productId);
      if (!oldProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const oldStock = oldProduct.stock || 0;
      const newStock = req.body.stock !== undefined ? req.body.stock : oldStock;

      // Update the product
      const product = await storage.updateProduct(productId, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // If stock increased from 0, send notifications to waiting users
      if (oldStock === 0 && newStock > 0) {
        try {
          console.log(`[STOCK] Product "${product.name}" is back in stock! Notifying subscribers...`);

          // Get all users who subscribed to notifications for this product
          const subscribers = await storage.getNotificationSubscribers(productId);

          if (subscribers.length > 0) {
            console.log(`[STOCK] Found ${subscribers.length} subscribers for product ${productId}`);

            const payload = JSON.stringify({
              title: `🎉 ${product.name} عاد للمخزون!`,
              body: `المنتج الذي كنت تنتظره أصبح متاحاً الآن. اطلبه قبل نفاد الكمية!`,
              link: `/shop?id=${product.id}`
            });

            let successCount = 0;
            let failedCount = 0;

            await Promise.all(
              subscribers.map(async (notification) => {
                try {
                  const subscription = await storage.getPushSubscriptionByUserId(notification.userId);
                  if (subscription) {
                    const pushSubscription = {
                      endpoint: subscription.endpoint,
                      keys: {
                        p256dh: subscription.keys.p256dh,
                        auth: subscription.keys.auth
                      }
                    };

                    await webpush.sendNotification(pushSubscription, payload);
                    successCount++;
                    console.log(`[STOCK] Notification sent to user ${notification.userId}`);
                  }
                } catch (pushError: any) {
                  failedCount++;
                  console.error(`[STOCK] Failed to notify user ${notification.userId}:`, pushError.message);

                  // Clean up invalid subscriptions
                  if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                    await storage.removePushSubscription(notification.userId);
                  }
                }
              })
            );

            // Clean up notifications after sending
            await storage.deleteNotificationsForProduct(productId);
            console.log(`[STOCK] Successfully notified ${successCount} users, ${failedCount} failed`);
          }
        } catch (notifyError) {
          console.error("[STOCK] Error sending back-in-stock notifications:", notifyError);
          // Don't fail the product update if notification fails
        }
      }

      // Log the admin action with detailed changes
      const changes: string[] = [];
      if (oldProduct.name !== product.name) changes.push(`name: "${oldProduct.name}" → "${product.name}"`);
      if (oldProduct.englishName !== product.englishName) changes.push(`englishName changed`);
      if (oldProduct.price !== product.price) changes.push(`price: ${oldProduct.price} → ${product.price}`);
      if (oldStock !== newStock) changes.push(`stock: ${oldStock} → ${newStock}`);
      if (oldProduct.imageUrl !== product.imageUrl) changes.push(`image updated`);
      if (oldProduct.description !== product.description) changes.push(`description updated`);
      if (oldProduct.isAvailable !== product.isAvailable) changes.push(`availability: ${product.isAvailable ? 'enabled' : 'disabled'}`);
      if (oldProduct.categoryId !== product.categoryId) changes.push(`category changed`);

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "UPDATE_PRODUCT",
        targetType: "product",
        targetId: productId,
        details: JSON.stringify({
          name: product.name,
          changes: changes.length > 0 ? changes : ['no visible changes'],
          oldStock,
          newStock
        }),
      });

      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/admin/products/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      // Get product info before deleting for the log
      const product = await storage.getProductById(productId);
      const productName = product?.name || 'Unknown';

      await storage.deleteProduct(productId);

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "DELETE_PRODUCT",
        targetType: "product",
        targetId: productId,
        details: JSON.stringify({
          deletedProductName: productName,
          deletedProductId: productId
        }),
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Notifications routes
  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = insertProductNotificationSchema.safeParse({ ...req.body, userId });

      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }

      // Check if already subscribed
      const existing = await storage.getProductNotification(userId, result.data.productId);
      if (existing) {
        return res.status(200).json({ message: "Already subscribed" });
      }

      const notification = await storage.createProductNotification(result.data);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Admin Push Notification - Real Web Push
  app.post('/api/admin/push-notification', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { title, message, link } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      // Get all push subscriptions
      const subscriptions = await storage.getPushSubscriptions();

      if (subscriptions.length === 0) {
        // Still return success but indicate no subscribers
        console.log(`[PUSH NOTIFICATION] No subscribers. Title: ${title}, Message: ${message}`);
        return res.json({
          success: true,
          message: "Notification saved (no active subscribers yet)",
          subscriberCount: 0
        });
      }

      console.log(`[PUSH NOTIFICATION] Broadcasting to ${subscriptions.length} subscribers`);
      console.log(`Title: ${title}`);
      console.log(`Message: ${message}`);
      console.log(`Link: ${link || '/'}`);

      // Prepare the push notification payload
      const payload = JSON.stringify({
        title: title,
        body: message,
        link: link || '/'
      });

      // Send push notifications to all subscribers
      let successCount = 0;
      let failedCount = 0;
      const failedSubscriptions: string[] = [];

      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            };

            await webpush.sendNotification(pushSubscription, payload);
            successCount++;
            console.log(`[PUSH] Successfully sent to user ${sub.userId}`);
          } catch (error: any) {
            failedCount++;
            console.error(`[PUSH] Failed to send to user ${sub.userId}:`, error.message || error);

            // If the subscription is no longer valid (410 Gone or 404), remove it
            if (error.statusCode === 410 || error.statusCode === 404) {
              failedSubscriptions.push(sub.userId);
              console.log(`[PUSH] Removing invalid subscription for user ${sub.userId}`);
            }
          }
        })
      );

      // Clean up invalid subscriptions
      for (const userId of failedSubscriptions) {
        await storage.removePushSubscription(userId);
      }

      // Log the notification action BEFORE sending response
      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || 'Admin',
        action: "SEND_NOTIFICATION",
        targetType: "notification",
        targetId: 0,
        details: JSON.stringify({
          title,
          message,
          link: link || '/',
          subscriberCount: successCount,
          failedCount
        }),
      });

      // Return success with subscriber count
      res.json({
        success: true,
        message: `Notification sent to ${successCount} subscriber(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        subscriberCount: successCount,
        failedCount: failedCount
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Subscribe to push notifications
  app.post('/api/push-subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      await storage.savePushSubscription(userId, {
        userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        createdAt: new Date(),
      });

      console.log(`[PUSH] User ${userId} subscribed to push notifications`);
      res.json({ success: true, message: "Subscribed to push notifications" });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.delete('/api/push-subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.removePushSubscription(userId);
      console.log(`[PUSH] User ${userId} unsubscribed from push notifications`);
      res.json({ success: true, message: "Unsubscribed from push notifications" });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Check push subscription status
  app.get('/api/push-subscription/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subscription = await storage.getPushSubscriptionByUserId(userId);
      res.json({ isSubscribed: !!subscription });
    } catch (error) {
      console.error("Error checking push subscription:", error);
      res.status(500).json({ message: "Failed to check subscription" });
    }
  });

  app.get('/api/push/public-key', async (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Admin: Get all product notification subscribers (users waiting for stock)
  app.get('/api/admin/product-notifications', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAllProductNotifications();
      // Enrich with product and user info
      const enriched = await Promise.all(
        notifications.map(async (n) => {
          const product = await storage.getProductById(n.productId);
          const user = await storage.getUser(n.userId);
          return {
            ...n,
            productName: product?.name || 'Unknown',
            productStock: product?.stock || 0,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phoneNumber : 'Unknown',
            userPhone: user?.phoneNumber || ''
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching product notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Admin: Get all push notification subscribers
  app.get('/api/admin/push-subscribers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getPushSubscriptions();
      // Enrich with user info
      const enriched = await Promise.all(
        subscriptions.map(async (s) => {
          const user = await storage.getUser(s.userId);
          return {
            userId: s.userId,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phoneNumber : 'Unknown',
            userPhone: user?.phoneNumber || '',
            subscribedAt: s.createdAt
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching push subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // Admin Orders
  app.get('/api/admin/orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { search, status } = req.query;
      const orders = await storage.getAllOrders(search as string, status as string);

      // Enrich orders with user details
      const enrichedOrders = await Promise.all(orders.map(async (order) => {
        const user = await storage.getUser(order.userId);
        return {
          ...order,
          customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest',
        };
      }));

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get single order with items (admin)
  app.get('/api/admin/orders/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderByIdAdmin(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Enrich with user details and product info
      const user = await storage.getUser(order.userId);
      const enrichedItems = await Promise.all(order.items.map(async (item) => {
        const product = await storage.getProductById(item.productId);
        return {
          ...item,
          productName: product?.name || 'Unknown Product',
          productEnglishName: product?.englishName || product?.name || 'Unknown Product',
          productImage: product?.imageUrl,
        };
      }));

      res.json({
        ...order,
        customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest',
        items: enrichedItems,
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  // Update order status
  app.patch('/api/admin/orders/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status || !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Send push notification to the customer about status update
      try {
        const subscription = await storage.getPushSubscriptionByUserId(updatedOrder.userId);
        if (subscription) {
          const statusLabels: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'قيد الانتظار', en: 'Pending' },
            processing: { ar: 'جاري التجهيز', en: 'Processing' },
            completed: { ar: 'مكتمل', en: 'Completed' },
            cancelled: { ar: 'ملغي', en: 'Cancelled' }
          };

          const payload = JSON.stringify({
            title: `طلب #${orderId} - ${statusLabels[status].ar}`,
            body: `تم تحديث حالة طلبك إلى: ${statusLabels[status].ar}`,
            link: `/orders/${orderId}`
          });

          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          console.log(`[PUSH] Sent order status notification to user ${updatedOrder.userId}`);
        }
      } catch (pushError) {
        console.error("Error sending push notification to customer:", pushError);
        // Don't fail the whole request if push fails
      }

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "UPDATE_ORDER_STATUS",
        targetType: "order",
        targetId: orderId,
        details: JSON.stringify({
          orderId,
          oldStatus: updatedOrder.status, // Will reflect new status since we're after update
          newStatus: status,
          customerPhone: updatedOrder.phoneNumber
        }),
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // ==========================================
  // OFFERS ROUTES
  // ==========================================

  // Public: Get active offers (for customer-facing shop)
  app.get('/api/offers', async (req, res) => {
    try {
      const offers = await storage.getOffers();
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Admin: Get all offers
  app.get('/api/admin/offers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const offers = await storage.getAllOffers();
      res.json(offers);
    } catch (error) {
      console.error("Error fetching admin offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Admin: Get single offer
  app.get('/api/admin/offers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const offer = await storage.getOfferById(parseInt(req.params.id));
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  // Admin: Create offer
  app.post('/api/admin/offers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = insertOfferSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }

      const offer = await storage.createOffer(result.data);

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "CREATE_OFFER",
        targetType: "offer",
        targetId: offer.id,
        details: JSON.stringify({
          title: offer.title,
          linkType: offer.linkType,
          linkValue: offer.linkValue
        }),
      });

      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  // Admin: Update offer
  app.put('/api/admin/offers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      const offer = await storage.updateOffer(offerId, req.body);

      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "UPDATE_OFFER",
        targetType: "offer",
        targetId: offerId,
        details: JSON.stringify({
          title: offer.title,
          linkType: offer.linkType,
          isActive: offer.isActive
        }),
      });

      res.json(offer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  // Admin: Delete offer
  app.delete('/api/admin/offers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      const offer = await storage.getOfferById(offerId);
      const offerTitle = offer?.title || 'Unknown';

      await storage.deleteOffer(offerId);

      await storage.createAdminLog({
        adminUserId: (req.user as any).id,
        adminName: `${(req.user as any).firstName} ${(req.user as any).lastName}`.trim(),
        action: "DELETE_OFFER",
        targetType: "offer",
        targetId: offerId,
        details: JSON.stringify({ deletedOfferTitle: offerTitle }),
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const category = await storage.getCategoryById(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const result = insertCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }
      const category = await storage.createCategory(result.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const searchQuery = req.query.search as string | undefined;
      const products = await storage.getProducts(categoryId, searchQuery);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }
      const product = await storage.createProduct(result.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Cart routes
  app.get('/api/cart', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post('/api/cart', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const result = insertCartItemSchema.safeParse({ ...req.body, userId });
      if (!result.success) {
        return res.status(400).json({
          message: fromZodError(result.error).toString()
        });
      }
      const cartItem = await storage.addToCart(result.data);
      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.patch('/api/cart/:id', async (req: any, res) => {
    try {
      const { quantity } = req.body;
      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      const cartItem = await storage.updateCartItem(parseInt(req.params.id), quantity);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(cartItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete('/api/cart/:id', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      await storage.removeFromCart(parseInt(req.params.id), userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.delete('/api/cart', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Order routes
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orderData, orderItems } = req.body;

      const orderResult = insertOrderSchema.safeParse({ ...orderData, userId });
      if (!orderResult.success) {
        return res.status(400).json({
          message: fromZodError(orderResult.error).toString()
        });
      }

      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return res.status(400).json({ message: "Order must have at least one item" });
      }

      // Validate stock availability before placing order (industry standard: check before commit)
      const stockIssues: string[] = [];
      for (const item of orderItems) {
        const product = await storage.getProductById(item.productId);
        if (!product) {
          stockIssues.push(`Product ${item.productName} not found`);
          continue;
        }
        if (!product.isAvailable) {
          stockIssues.push(`${product.name} is not available`);
          continue;
        }
        if ((product.stock || 0) < item.quantity) {
          stockIssues.push(`${product.name}: Only ${product.stock || 0} in stock, requested ${item.quantity}`);
        }
      }

      if (stockIssues.length > 0) {
        return res.status(400).json({
          message: "Stock validation failed",
          issues: stockIssues
        });
      }

      // Create the order
      const order = await storage.createOrder(orderResult.data, orderItems);

      // Decrease stock for each item (industry standard: reserve stock after order creation)
      for (const item of orderItems) {
        await storage.decreaseProductStock(item.productId, item.quantity);
        console.log(`[STOCK] Decreased stock for product ${item.productId} by ${item.quantity}`);
      }

      await storage.clearCart(userId);

      console.log(`[ORDER] Order #${order.id} created. Stock updated for ${orderItems.length} products.`);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const order = await storage.getOrderById(parseInt(req.params.id), userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/profile/upload-avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileImageUrl } = req.body;

      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }

      const user = await storage.updateUserProfile(userId, { profileImageUrl });
      res.json(user);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Admin Logs endpoint
  app.get('/api/admin/logs', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }

      // Parse filter parameters
      const filters: any = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };

      if (req.query.action) {
        filters.action = req.query.action as string;
      }
      if (req.query.adminUserId) {
        filters.adminUserId = req.query.adminUserId as string;
      }
      if (req.query.targetType) {
        filters.targetType = req.query.targetType as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const logs = await storage.getAdminLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ message: "Failed to fetch admin logs" });
    }
  });

  // =====================================================
  // DELIVERY ZONES & SLOTS
  // =====================================================

  app.get('/api/delivery-zones', async (req, res) => {
    try {
      const zones = await storage.getDeliveryZones();
      res.json(zones);
    } catch (error) {
      console.error("Error fetching delivery zones:", error);
      res.status(500).json({ message: "Failed to fetch delivery zones" });
    }
  });

  app.get('/api/delivery-slots', async (req, res) => {
    try {
      const dateParam = req.query.date as string | undefined;
      const date = dateParam ? new Date(dateParam) : undefined;
      const slots = await storage.getDeliverySlots(date);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching delivery slots:", error);
      res.status(500).json({ message: "Failed to fetch delivery slots" });
    }
  });

  // Admin delivery zone management
  app.post('/api/admin/delivery-zones', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const zone = await storage.createDeliveryZone(req.body);
      res.status(201).json(zone);
    } catch (error) {
      console.error("Error creating delivery zone:", error);
      res.status(500).json({ message: "Failed to create delivery zone" });
    }
  });

  app.patch('/api/admin/delivery-zones/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const zone = await storage.updateDeliveryZone(id, req.body);
      if (!zone) {
        return res.status(404).json({ message: "Delivery zone not found" });
      }
      res.json(zone);
    } catch (error) {
      console.error("Error updating delivery zone:", error);
      res.status(500).json({ message: "Failed to update delivery zone" });
    }
  });

  app.delete('/api/admin/delivery-zones/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDeliveryZone(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting delivery zone:", error);
      res.status(500).json({ message: "Failed to delete delivery zone" });
    }
  });

  // =====================================================
  // PROMO CODES
  // =====================================================

  app.post('/api/promo-codes/validate', isAuthenticated, async (req: any, res) => {
    try {
      const { code, orderTotal } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({ message: "Promo code is required" });
      }

      const result = await storage.validatePromoCode(code, userId, orderTotal || 0);
      res.json(result);
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ message: "Failed to validate promo code" });
    }
  });

  // Admin promo code management
  app.get('/api/admin/promo-codes', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const promoCodes = await storage.getPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  app.post('/api/admin/promo-codes', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const promo = await storage.createPromoCode(req.body);
      res.status(201).json(promo);
    } catch (error) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  app.patch('/api/admin/promo-codes/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const promo = await storage.updatePromoCode(id, req.body);
      if (!promo) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      res.json(promo);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  app.delete('/api/admin/promo-codes/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePromoCode(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Failed to delete promo code" });
    }
  });

  // =====================================================
  // WISHLIST (works for guests like cart)
  // =====================================================

  app.get('/api/wishlist', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const wishlist = await storage.getWishlist(userId);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  // Batch endpoint to get all wishlist product IDs (reduces N calls to 1)
  app.get('/api/wishlist/product-ids', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const wishlist = await storage.getWishlist(userId);
      const productIds = wishlist.map((item: any) => item.productId);
      res.json({ productIds });
    } catch (error) {
      console.error("Error fetching wishlist product IDs:", error);
      res.status(500).json({ message: "Failed to fetch wishlist product IDs" });
    }
  });

  app.post('/api/wishlist/:productId', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const productId = parseInt(req.params.productId);
      const item = await storage.addToWishlist(userId, productId);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete('/api/wishlist/:productId', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const productId = parseInt(req.params.productId);
      await storage.removeFromWishlist(userId, productId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  app.get('/api/wishlist/:productId/check', async (req: any, res) => {
    try {
      // Use authenticated user ID or default guest ID
      const userId = req.user?.id || 'guest-user';
      const productId = parseInt(req.params.productId);
      const isInWishlist = await storage.isInWishlist(userId, productId);
      res.json({ inWishlist: isInWishlist });
    } catch (error) {
      console.error("Error checking wishlist:", error);
      res.status(500).json({ message: "Failed to check wishlist" });
    }
  });

  // =====================================================
  // REVIEWS
  // =====================================================

  app.get('/api/products/:id/reviews', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getProductReviews(productId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/products/:id/rating', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const rating = await storage.getProductRating(productId);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching product rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  app.post('/api/products/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.user.id;

      const review = await storage.createReview({
        userId,
        productId,
        rating: req.body.rating,
        title: req.body.title,
        comment: req.body.comment,
        orderId: req.body.orderId,
      });

      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // =====================================================
  // LOYALTY POINTS
  // =====================================================

  app.get('/api/loyalty/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const balance = await storage.getUserLoyaltyBalance(userId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching loyalty balance:", error);
      res.status(500).json({ message: "Failed to fetch loyalty balance" });
    }
  });

  app.get('/api/loyalty/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getLoyaltyTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching loyalty transactions:", error);
      res.status(500).json({ message: "Failed to fetch loyalty transactions" });
    }
  });

  // =====================================================
  // ADMIN ANALYTICS
  // =====================================================

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getOrderStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching order stats:", error);
      res.status(500).json({ message: "Failed to fetch order stats" });
    }
  });

  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const analytics = await storage.getSalesAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
  });

  app.get('/api/admin/top-products', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const topProducts = await storage.getTopProducts(limit);
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  app.get('/api/admin/low-stock', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 10;
      const products = await storage.getLowStockProducts(threshold);
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
