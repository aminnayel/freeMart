const arabicToEnglish: Record<string, string> = {
    // Categories
    "فواكه وخضروات": "Fruits & Vegetables",
    "ألبان وبيض": "Dairy & Eggs",
    "مخبوزات": "Bakery",
    "لحوم ودواجن": "Meat & Poultry",
    "مشروبات": "Beverages",
    "بقالة": "Pantry",
    "مجمدات": "Frozen Foods",
    "تسالي": "Snacks",

    // Products
    "موز طازج": "Fresh Banana",
    "تفاح أحمر": "Red Apple",
    "طماطم طازجة": "Fresh Tomato",
    "خيار أخضر": "Green Cucumber",
    "برتقال بلدي": "Baladi Orange",
    "بطاطس": "Potatoes",
    "لبن جهينة كامل الدسم": "Juhayna Full Cream Milk",
    "زبادي دانون": "Danone Yogurt",
    "جبنة رومي": "Roumy Cheese",
    "بيض أبيض": "White Eggs",
    "جبنة فيتا": "Feta Cheese",
    "عيش فينو": "Fino Bread",
    "عيش بلدي": "Baladi Bread",
    "كرواسون": "Croissant",
    "توست أبيض": "White Toast",
    "صدور فراخ": "Chicken Breasts",
    "لحم بقري مفروم": "Minced Beef",
    "سمك فيليه": "Fish Fillet",
    "كبدة فراخ": "Chicken Liver",
    "عصير برتقال طبيعي": "Natural Orange Juice",
    "مياه معدنية نستله": "Nestle Mineral Water",
    "كوكاكولا": "Coca-Cola",
    "شاي ليبتون": "Lipton Tea",
    "أرز أبيض": "White Rice",
    "مكرونة": "Pasta",
    "زيت زيتون": "Olive Oil",
    "سكر أبيض": "White Sugar",
    "ملح طعام": "Table Salt",
};

export function translateContent(text: string, language: string): string {
    if (language === "en" && arabicToEnglish[text]) {
        return arabicToEnglish[text];
    }
    return text;
}
