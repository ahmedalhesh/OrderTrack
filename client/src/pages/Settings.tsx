import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  LogOut, 
  ArrowRight,
  Upload,
  Image as ImageIcon,
  LayoutDashboard,
  Save
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Settings {
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  // إعدادات الترقيم
  orderPrefix?: string;
  orderStartNumber?: number;
  orderNumberFormat?: string;
  customerPrefix?: string;
  customerStartNumber?: number;
  customerNumberFormat?: string;
}

export default function SettingsPage() {
  const { token, logout, isAuthenticated } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Settings>({
    companyName: "",
    companyLogo: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: "",
    orderPrefix: "ORD-",
    orderStartNumber: 1,
    orderNumberFormat: "4",
    customerPrefix: "CUST-",
    customerStartNumber: 1,
    customerNumberFormat: "4",
  });
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("فشل تحميل الإعدادات");
      return response.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "",
        companyLogo: settings.companyLogo || "",
        companyAddress: settings.companyAddress || "",
        companyPhone: settings.companyPhone || "",
        companyEmail: settings.companyEmail || "",
        companyWebsite: settings.companyWebsite || "",
        orderPrefix: settings.orderPrefix || "ORD-",
        orderStartNumber: settings.orderStartNumber || 1,
        orderNumberFormat: settings.orderNumberFormat || "4",
        customerPrefix: settings.customerPrefix || "CUST-",
        customerStartNumber: settings.customerStartNumber || 1,
        customerNumberFormat: settings.customerNumberFormat || "4",
      });
      if (settings.companyLogo) {
        setLogoPreview(settings.companyLogo);
      }
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Settings) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل تحديث الإعدادات");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "نجح",
        description: "تم تحديث الإعدادات بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث الإعدادات",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof Settings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // حساب الأبعاد الجديدة مع الحفاظ على النسبة
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة",
        variant: "destructive",
      });
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      // ضغط الصورة قبل الحفظ
      const compressedBase64 = await compressImage(file, 800, 0.8);
      setLogoPreview(compressedBase64);
      setFormData((prev) => ({ ...prev, companyLogo: compressedBase64 }));
      
      toast({
        title: "نجح",
        description: "تم تحميل الشعار بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل الصورة",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleLogout = () => {
    logout();
    setLocation("/admin/login");
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">الإعدادات</h1>
              <p className="text-xs text-muted-foreground">بيانات الشركة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="w-4 h-4 ml-2" />
                لوحة التحكم
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات</CardTitle>
            <CardDescription>
              قم بتحديث إعدادات النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="numbering" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="numbering">الترقيم</TabsTrigger>
                <TabsTrigger value="company">بيانات الشركة</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* تبويب الترقيم */}
              <TabsContent value="numbering" className="space-y-6 mt-0">
                <div className="space-y-6">
                  {/* ترقيم الطلبيات */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-semibold text-lg">ترقيم الطلبيات</h3>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="orderPrefix">البادئة</Label>
                        <Input
                          id="orderPrefix"
                          value={formData.orderPrefix || "ORD-"}
                          onChange={(e) => handleInputChange("orderPrefix", e.target.value)}
                          placeholder="مثال: ORD-"
                        />
                        <p className="text-xs text-muted-foreground">بادئة رقم الطلبية</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="orderStartNumber">رقم البداية</Label>
                        <Input
                          id="orderStartNumber"
                          type="number"
                          min="1"
                          value={formData.orderStartNumber || 1}
                          onChange={(e) => handleInputChange("orderStartNumber", parseInt(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground">الرقم الأول للبدء</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="orderNumberFormat">عدد الأرقام</Label>
                        <Input
                          id="orderNumberFormat"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.orderNumberFormat || "4"}
                          onChange={(e) => handleInputChange("orderNumberFormat", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">مثال: 4 = 0001، 5 = 00001</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">مثال:</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {formData.orderPrefix || "ORD-"}{String(formData.orderStartNumber || 1).padStart(parseInt(formData.orderNumberFormat || "4"), "0")}
                      </p>
                    </div>
                  </div>

                  {/* ترقيم العملاء */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-semibold text-lg">ترقيم العملاء</h3>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="customerPrefix">البادئة</Label>
                        <Input
                          id="customerPrefix"
                          value={formData.customerPrefix || "CUST-"}
                          onChange={(e) => handleInputChange("customerPrefix", e.target.value)}
                          placeholder="مثال: CUST-"
                        />
                        <p className="text-xs text-muted-foreground">بادئة رقم العميل</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customerStartNumber">رقم البداية</Label>
                        <Input
                          id="customerStartNumber"
                          type="number"
                          min="1"
                          value={formData.customerStartNumber || 1}
                          onChange={(e) => handleInputChange("customerStartNumber", parseInt(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground">الرقم الأول للبدء</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customerNumberFormat">عدد الأرقام</Label>
                        <Input
                          id="customerNumberFormat"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.customerNumberFormat || "4"}
                          onChange={(e) => handleInputChange("customerNumberFormat", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">مثال: 4 = 0001، 5 = 00001</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">مثال:</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {formData.customerPrefix || "CUST-"}{String(formData.customerStartNumber || 1).padStart(parseInt(formData.customerNumberFormat || "4"), "0")}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* تبويب بيانات الشركة */}
              <TabsContent value="company" className="space-y-6 mt-0">
                {/* الشعار */}
                <div className="space-y-2">
                  <Label>شعار الشركة</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img 
                          src={logoPreview} 
                          alt="Company Logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    {!logoPreview && (
                      <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Label 
                        htmlFor="logo-upload" 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>اختر صورة</span>
                        </div>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        PNG, JPG أو GIF (حد أقصى 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* اسم الشركة */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="مثال: شركة الوسيط للشراء"
                    required
                  />
                </div>

                {/* العنوان */}
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">العنوان</Label>
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => handleInputChange("companyAddress", e.target.value)}
                    placeholder="عنوان الشركة الكامل"
                    rows={3}
                  />
                </div>

                {/* رقم الهاتف */}
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">رقم الهاتف</Label>
                  <Input
                    id="companyPhone"
                    value={formData.companyPhone}
                    onChange={(e) => handleInputChange("companyPhone", e.target.value)}
                    placeholder="مثال: 0912345678"
                    dir="ltr"
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">البريد الإلكتروني</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                    placeholder="مثال: info@company.com"
                    dir="ltr"
                  />
                </div>

                {/* الموقع الإلكتروني */}
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">الموقع الإلكتروني</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
                    placeholder="مثال: https://www.company.com"
                    dir="ltr"
                  />
                </div>
              </TabsContent>

              {/* أزرار */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Link href="/admin">
                  <Button type="button" variant="outline">
                    إلغاء
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground ml-2"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            </form>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

