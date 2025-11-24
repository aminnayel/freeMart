import { Button } from "@/components/ui/button";
import { ShoppingCart, Search, Package, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">{t('app_name')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button asChild data-testid="button-login">
            <a href="/auth">{t('login')}</a>
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: t('hero_title') }} />
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('hero_subtitle')}
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6" data-testid="button-get-started">
            <a href="/auth">{t('get_started')}</a>
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Search className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature_search_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('feature_search_desc')}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Package className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature_quality_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('feature_quality_desc')}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature_delivery_title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('feature_delivery_desc')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
