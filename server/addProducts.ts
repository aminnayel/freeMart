import { db } from "./db";
import { products, categories } from "@shared/schema";

async function addMoreProducts() {
  console.log("Adding more products...");

  const allCategories = await db.select().from(categories);
  const categoryMap = Object.fromEntries(
    allCategories.map(c => [c.slug, c.id])
  );

  const newProducts = [
    // Fresh Produce
    { name: "Sweet Strawberries", description: "Fresh sweet strawberries", price: "4.99", categoryId: categoryMap["fresh-produce"], stock: 70, unit: "lb", imageUrl: "🍓", isAvailable: true },
    { name: "Seedless Grapes", description: "Sweet seedless grapes", price: "3.49", categoryId: categoryMap["fresh-produce"], stock: 85, unit: "lb", imageUrl: "🍇", isAvailable: true },
    { name: "Ripe Avocados", description: "Ready to eat avocados", price: "1.99", categoryId: categoryMap["fresh-produce"], stock: 95, unit: "each", imageUrl: "🥑", isAvailable: true },
    { name: "Bell Peppers", description: "Colorful bell peppers", price: "2.99", categoryId: categoryMap["fresh-produce"], stock: 65, unit: "3-pack", imageUrl: "🫑", isAvailable: true },
    { name: "Broccoli Crowns", description: "Fresh broccoli crowns", price: "2.49", categoryId: categoryMap["fresh-produce"], stock: 50, unit: "bunch", imageUrl: "🥦", isAvailable: true },
    { name: "Fresh Spinach", description: "Organic baby spinach", price: "3.29", categoryId: categoryMap["fresh-produce"], stock: 60, unit: "bag", imageUrl: "🥬", isAvailable: true },
    { name: "Cucumbers", description: "Fresh cucumbers", price: "1.49", categoryId: categoryMap["fresh-produce"], stock: 75, unit: "each", imageUrl: "🥒", isAvailable: true },
    { name: "Potatoes", description: "Russet potatoes", price: "4.99", categoryId: categoryMap["fresh-produce"], stock: 120, unit: "5lb bag", imageUrl: "🥔", isAvailable: true },
    { name: "Sweet Corn", description: "Fresh sweet corn", price: "3.99", categoryId: categoryMap["fresh-produce"], stock: 55, unit: "4-pack", imageUrl: "🌽", isAvailable: true },
    { name: "Watermelon", description: "Seedless watermelon", price: "5.99", categoryId: categoryMap["fresh-produce"], stock: 40, unit: "each", imageUrl: "🍉", isAvailable: true },
    
    // Dairy & Eggs
    { name: "Butter", description: "Salted butter", price: "4.99", categoryId: categoryMap["dairy-eggs"], stock: 80, unit: "lb", imageUrl: "🧈", isAvailable: true },
    { name: "Sour Cream", description: "Fresh sour cream", price: "3.49", categoryId: categoryMap["dairy-eggs"], stock: 60, unit: "16oz", imageUrl: "🥛", isAvailable: true },
    { name: "Cream Cheese", description: "Philadelphia cream cheese", price: "2.99", categoryId: categoryMap["dairy-eggs"], stock: 70, unit: "8oz", imageUrl: "🧀", isAvailable: true },
    { name: "Mozzarella", description: "Fresh mozzarella cheese", price: "5.49", categoryId: categoryMap["dairy-eggs"], stock: 45, unit: "ball", imageUrl: "🧀", isAvailable: true },
    { name: "Almond Milk", description: "Unsweetened almond milk", price: "3.99", categoryId: categoryMap["dairy-eggs"], stock: 90, unit: "half gallon", imageUrl: "🥛", isAvailable: true },
    
    // Bakery
    { name: "Bagels", description: "Fresh bagels variety pack", price: "4.49", categoryId: categoryMap["bakery"], stock: 35, unit: "6-pack", imageUrl: "🥯", isAvailable: true },
    { name: "Chocolate Chip Cookies", description: "Fresh baked cookies", price: "5.99", categoryId: categoryMap["bakery"], stock: 40, unit: "dozen", imageUrl: "🍪", isAvailable: true },
    { name: "French Baguette", description: "Freshly baked baguette", price: "2.99", categoryId: categoryMap["bakery"], stock: 30, unit: "loaf", imageUrl: "🥖", isAvailable: true },
    { name: "Donuts", description: "Glazed donuts", price: "6.49", categoryId: categoryMap["bakery"], stock: 25, unit: "6-pack", imageUrl: "🍩", isAvailable: true },
    { name: "Cinnamon Rolls", description: "Fresh cinnamon rolls", price: "5.99", categoryId: categoryMap["bakery"], stock: 20, unit: "4-pack", imageUrl: "🥐", isAvailable: true },
    
    // Meat & Seafood
    { name: "Pork Chops", description: "Bone-in pork chops", price: "6.99", categoryId: categoryMap["meat-seafood"], stock: 40, unit: "lb", imageUrl: "🥩", isAvailable: true },
    { name: "Turkey Breast", description: "Sliced turkey breast", price: "7.99", categoryId: categoryMap["meat-seafood"], stock: 50, unit: "lb", imageUrl: "🦃", isAvailable: true },
    { name: "Shrimp", description: "Large frozen shrimp", price: "14.99", categoryId: categoryMap["meat-seafood"], stock: 30, unit: "lb", imageUrl: "🦐", isAvailable: true },
    { name: "Bacon", description: "Hickory smoked bacon", price: "8.49", categoryId: categoryMap["meat-seafood"], stock: 65, unit: "lb", imageUrl: "🥓", isAvailable: true },
    
    // Beverages
    { name: "Coffee Beans", description: "Premium coffee beans", price: "12.99", categoryId: categoryMap["beverages"], stock: 50, unit: "bag", imageUrl: "☕", isAvailable: true },
    { name: "Soda Pack", description: "Cola variety pack", price: "6.99", categoryId: categoryMap["beverages"], stock: 85, unit: "12-pack", imageUrl: "🥤", isAvailable: true },
    { name: "Bottled Water", description: "Spring water", price: "4.99", categoryId: categoryMap["beverages"], stock: 150, unit: "24-pack", imageUrl: "💧", isAvailable: true },
    { name: "Apple Juice", description: "100% apple juice", price: "4.49", categoryId: categoryMap["beverages"], stock: 70, unit: "64oz", imageUrl: "🧃", isAvailable: true },
    { name: "Energy Drinks", description: "Energy drink variety", price: "9.99", categoryId: categoryMap["beverages"], stock: 60, unit: "4-pack", imageUrl: "🥤", isAvailable: true },
    
    // Snacks
    { name: "Pretzels", description: "Salted pretzels", price: "2.99", categoryId: categoryMap["snacks"], stock: 95, unit: "bag", imageUrl: "🥨", isAvailable: true },
    { name: "Trail Mix", description: "Deluxe trail mix", price: "6.99", categoryId: categoryMap["snacks"], stock: 70, unit: "bag", imageUrl: "🥜", isAvailable: true },
    { name: "Popcorn", description: "Microwave popcorn", price: "4.49", categoryId: categoryMap["snacks"], stock: 100, unit: "6-pack", imageUrl: "🍿", isAvailable: true },
    { name: "Granola Bars", description: "Chewy granola bars", price: "4.99", categoryId: categoryMap["snacks"], stock: 110, unit: "box", imageUrl: "🍫", isAvailable: true },
    { name: "Crackers", description: "Whole wheat crackers", price: "3.49", categoryId: categoryMap["snacks"], stock: 85, unit: "box", imageUrl: "🍘", isAvailable: true },
    
    // Frozen Foods
    { name: "Chicken Nuggets", description: "Breaded chicken nuggets", price: "7.99", categoryId: categoryMap["frozen-foods"], stock: 60, unit: "bag", imageUrl: "🍗", isAvailable: true },
    { name: "French Fries", description: "Frozen french fries", price: "3.99", categoryId: categoryMap["frozen-foods"], stock: 75, unit: "bag", imageUrl: "🍟", isAvailable: true },
    { name: "Frozen Berries", description: "Mixed berry blend", price: "5.49", categoryId: categoryMap["frozen-foods"], stock: 50, unit: "bag", imageUrl: "🫐", isAvailable: true },
    { name: "Waffles", description: "Frozen waffles", price: "4.29", categoryId: categoryMap["frozen-foods"], stock: 65, unit: "box", imageUrl: "🧇", isAvailable: true },
    { name: "Ice Cream Bars", description: "Chocolate ice cream bars", price: "6.99", categoryId: categoryMap["frozen-foods"], stock: 55, unit: "6-pack", imageUrl: "🍦", isAvailable: true },
    
    // Pantry Staples
    { name: "Canned Tomatoes", description: "Diced tomatoes", price: "1.99", categoryId: categoryMap["pantry-staples"], stock: 120, unit: "can", imageUrl: "🥫", isAvailable: true },
    { name: "Black Beans", description: "Canned black beans", price: "1.49", categoryId: categoryMap["pantry-staples"], stock: 140, unit: "can", imageUrl: "🫘", isAvailable: true },
    { name: "Peanut Butter", description: "Creamy peanut butter", price: "4.99", categoryId: categoryMap["pantry-staples"], stock: 80, unit: "jar", imageUrl: "🥜", isAvailable: true },
    { name: "Honey", description: "Pure honey", price: "7.99", categoryId: categoryMap["pantry-staples"], stock: 60, unit: "bottle", imageUrl: "🍯", isAvailable: true },
    { name: "Flour", description: "All-purpose flour", price: "5.99", categoryId: categoryMap["pantry-staples"], stock: 90, unit: "5lb bag", imageUrl: "🌾", isAvailable: true },
    { name: "Sugar", description: "Granulated sugar", price: "4.49", categoryId: categoryMap["pantry-staples"], stock: 100, unit: "4lb bag", imageUrl: "🧂", isAvailable: true },
    { name: "Salt", description: "Iodized salt", price: "1.99", categoryId: categoryMap["pantry-staples"], stock: 150, unit: "container", imageUrl: "🧂", isAvailable: true },
    { name: "Cereal", description: "Whole grain cereal", price: "5.49", categoryId: categoryMap["pantry-staples"], stock: 70, unit: "box", imageUrl: "🥣", isAvailable: true },
  ];

  const insertedProducts = await db.insert(products).values(newProducts).returning();
  console.log(`Added ${insertedProducts.length} new products`);

  console.log("Done!");
  process.exit(0);
}

addMoreProducts().catch((error) => {
  console.error("Failed to add products:", error);
  process.exit(1);
});
