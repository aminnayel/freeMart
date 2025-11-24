import { db } from "./db";
import { categories, products } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const categoryData = [
    { name: "Fresh Produce", slug: "fresh-produce", imageUrl: "🥬" },
    { name: "Dairy & Eggs", slug: "dairy-eggs", imageUrl: "🥛" },
    { name: "Bakery", slug: "bakery", imageUrl: "🍞" },
    { name: "Meat & Seafood", slug: "meat-seafood", imageUrl: "🥩" },
    { name: "Beverages", slug: "beverages", imageUrl: "🥤" },
    { name: "Snacks", slug: "snacks", imageUrl: "🍿" },
    { name: "Frozen Foods", slug: "frozen-foods", imageUrl: "🧊" },
    { name: "Pantry Staples", slug: "pantry-staples", imageUrl: "🌾" },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`Inserted ${insertedCategories.length} categories`);

  const productData = [
    { name: "Organic Bananas", description: "Fresh organic bananas", price: "2.99", categoryId: insertedCategories[0].id, stock: 100, unit: "bunch", imageUrl: "🍌", isAvailable: true },
    { name: "Red Apples", description: "Crisp red apples", price: "3.99", categoryId: insertedCategories[0].id, stock: 150, unit: "lb", imageUrl: "🍎", isAvailable: true },
    { name: "Fresh Tomatoes", description: "Vine-ripened tomatoes", price: "2.49", categoryId: insertedCategories[0].id, stock: 80, unit: "lb", imageUrl: "🍅", isAvailable: true },
    { name: "Green Lettuce", description: "Crispy green lettuce", price: "1.99", categoryId: insertedCategories[0].id, stock: 60, unit: "head", imageUrl: "🥬", isAvailable: true },
    { name: "Baby Carrots", description: "Sweet baby carrots", price: "2.79", categoryId: insertedCategories[0].id, stock: 90, unit: "bag", imageUrl: "🥕", isAvailable: true },
    
    { name: "Whole Milk", description: "Fresh whole milk", price: "4.29", categoryId: insertedCategories[1].id, stock: 120, unit: "gallon", imageUrl: "🥛", isAvailable: true },
    { name: "Greek Yogurt", description: "Plain Greek yogurt", price: "5.99", categoryId: insertedCategories[1].id, stock: 75, unit: "32oz", imageUrl: "🥛", isAvailable: true },
    { name: "Large Eggs", description: "Farm fresh eggs", price: "3.49", categoryId: insertedCategories[1].id, stock: 200, unit: "dozen", imageUrl: "🥚", isAvailable: true },
    { name: "Cheddar Cheese", description: "Sharp cheddar cheese", price: "6.99", categoryId: insertedCategories[1].id, stock: 50, unit: "block", imageUrl: "🧀", isAvailable: true },
    
    { name: "Whole Wheat Bread", description: "Fresh whole wheat bread", price: "3.29", categoryId: insertedCategories[2].id, stock: 40, unit: "loaf", imageUrl: "🍞", isAvailable: true },
    { name: "Croissants", description: "Buttery croissants", price: "4.99", categoryId: insertedCategories[2].id, stock: 30, unit: "6-pack", imageUrl: "🥐", isAvailable: true },
    { name: "Blueberry Muffins", description: "Freshly baked muffins", price: "5.49", categoryId: insertedCategories[2].id, stock: 25, unit: "4-pack", imageUrl: "🧁", isAvailable: true },
    
    { name: "Chicken Breast", description: "Boneless chicken breast", price: "8.99", categoryId: insertedCategories[3].id, stock: 45, unit: "lb", imageUrl: "🍗", isAvailable: true },
    { name: "Ground Beef", description: "80% lean ground beef", price: "7.99", categoryId: insertedCategories[3].id, stock: 60, unit: "lb", imageUrl: "🥩", isAvailable: true },
    { name: "Salmon Fillet", description: "Fresh Atlantic salmon", price: "12.99", categoryId: insertedCategories[3].id, stock: 35, unit: "lb", imageUrl: "🐟", isAvailable: true },
    
    { name: "Orange Juice", description: "Fresh squeezed orange juice", price: "5.49", categoryId: insertedCategories[4].id, stock: 80, unit: "64oz", imageUrl: "🍊", isAvailable: true },
    { name: "Sparkling Water", description: "Lemon flavored sparkling water", price: "3.99", categoryId: insertedCategories[4].id, stock: 100, unit: "12-pack", imageUrl: "💧", isAvailable: true },
    { name: "Green Tea", description: "Organic green tea bags", price: "4.79", categoryId: insertedCategories[4].id, stock: 65, unit: "box", imageUrl: "🍵", isAvailable: true },
    
    { name: "Potato Chips", description: "Sea salt potato chips", price: "3.49", categoryId: insertedCategories[5].id, stock: 120, unit: "bag", imageUrl: "🥔", isAvailable: true },
    { name: "Mixed Nuts", description: "Roasted mixed nuts", price: "7.99", categoryId: insertedCategories[5].id, stock: 55, unit: "container", imageUrl: "🥜", isAvailable: true },
    { name: "Chocolate Bar", description: "Dark chocolate bar", price: "2.99", categoryId: insertedCategories[5].id, stock: 90, unit: "bar", imageUrl: "🍫", isAvailable: true },
    
    { name: "Frozen Pizza", description: "Pepperoni pizza", price: "6.99", categoryId: insertedCategories[6].id, stock: 70, unit: "pizza", imageUrl: "🍕", isAvailable: true },
    { name: "Ice Cream", description: "Vanilla ice cream", price: "5.49", categoryId: insertedCategories[6].id, stock: 85, unit: "pint", imageUrl: "🍦", isAvailable: true },
    { name: "Frozen Vegetables", description: "Mixed vegetables", price: "3.29", categoryId: insertedCategories[6].id, stock: 95, unit: "bag", imageUrl: "🥦", isAvailable: true },
    
    { name: "Pasta", description: "Spaghetti pasta", price: "1.99", categoryId: insertedCategories[7].id, stock: 150, unit: "box", imageUrl: "🍝", isAvailable: true },
    { name: "Rice", description: "Long grain white rice", price: "8.99", categoryId: insertedCategories[7].id, stock: 100, unit: "5lb bag", imageUrl: "🍚", isAvailable: true },
    { name: "Olive Oil", description: "Extra virgin olive oil", price: "12.99", categoryId: insertedCategories[7].id, stock: 40, unit: "bottle", imageUrl: "🫒", isAvailable: true },
  ];

  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`Inserted ${insertedProducts.length} products`);

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
