import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Package, LogIn, ArrowLeft, Phone, Mail, MapPin } from "lucide-react";

export default function Home() {
  // جلب بيانات الشركة
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings/public"));
      if (!response.ok) return null;
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {companySettings?.companyLogo ? (
                <img 
                  src={companySettings.companyLogo} 
                  alt={companySettings.companyName || "Company Logo"} 
                  className="w-12 h-12 object-contain rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="font-heading font-bold text-xl leading-tight">
                  {companySettings?.companyName || "شركة الوسيط للشراء"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {companySettings?.companyAddress || "خدمات الشراء والتوصيل من الإنترنت"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-block">
              {companySettings?.companyLogo ? (
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary/10 p-4">
                  <img 
                    src={companySettings.companyLogo} 
                    alt={companySettings.companyName || "Company Logo"} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-primary" />
                </div>
              )}
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold">
              مرحباً بك في {companySettings?.companyName || "شركة الوسيط للشراء"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {companySettings?.companyAddress || "نقدم لك أفضل خدمات الشراء والتوصيل من المواقع الإلكترونية العالمية إلى ليبيا"}
            </p>
          </div>

          {/* Login Card */}
          <Card className="shadow-xl border-2 max-w-md mx-auto">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="font-heading text-2xl font-bold">تسجيل الدخول</h3>
                  <p className="text-muted-foreground">
                    أدخل رقم حسابك للوصول إلى طلبياتك ومتابعة حالة طلباتك
                  </p>
                </div>
                
                <Link href="/customer/login" className="block">
                  <Button size="lg" className="w-full h-12 text-base font-semibold">
                    <LogIn className="w-5 h-5 ml-2" />
                    تسجيل الدخول للعميل
                  </Button>
                </Link>

              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <div className="grid gap-6 md:grid-cols-3 mt-16">
            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold">اتصل بنا</h4>
                {companySettings?.companyPhone && (
                  <p className="text-sm font-medium text-foreground">
                    {companySettings.companyPhone}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  نحن هنا لمساعدتك في أي وقت
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold">توصيل سريع</h4>
                <p className="text-sm text-muted-foreground">
                  نضمن وصول طلباتك بأسرع وقت ممكن
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="font-semibold">توصيل لجميع أنحاء ليبيا</h4>
                <p className="text-sm text-muted-foreground">
                  نصل إلى جميع المدن الليبية
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

