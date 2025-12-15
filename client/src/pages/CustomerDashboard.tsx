import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderProgressBar } from "@/components/OrderProgressBar";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Footer } from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Order, type OrderStatus, ORDER_STATUSES } from "@shared/schema";
import { Package, LogOut, Calendar, MessageSquare, Loader2, Bell, BellOff, User, Lock, CreditCard, Search, Filter, X, DollarSign, ShoppingCart, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuthStore } from "@/lib/customerAuth";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  isNotificationSupported,
  notifyOrderUpdate 
} from "@/lib/notifications";

export default function CustomerDashboard() {
  const { token, logout, isAuthenticated, customer } = useCustomerAuthStore();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    isNotificationSupported() ? getNotificationPermission() : "denied"
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/customer/login");
    }
  }, [isAuthenticated, setLocation]);

  // جلب معلومات العميل إذا لم تكن موجودة
  const { data: customerProfile } = useQuery({
    queryKey: ["/api/customer/profile"],
    enabled: isAuthenticated && !customer,
    queryFn: async () => {
      const response = await fetch("/api/customer/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("فشل تحميل معلومات الحساب");
      return response.json();
    },
  });

  // تحديث معلومات العميل في الـ store إذا تم جلبها
  useEffect(() => {
    if (customerProfile && !customer) {
      useCustomerAuthStore.getState().setCustomer(customerProfile);
    }
  }, [customerProfile, customer]);

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/customer/orders"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/customer/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("فشل تحميل الطلبيات");
      return response.json();
    },
  });

  // جلب بيانات الشركة
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const response = await fetch("/api/settings/public");
      if (!response.ok) return null;
      return response.json();
    },
  });

  // إعداد WebSocket للاستماع للتحديثات اللحظية
  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("تم الاتصال بخادم التحديثات اللحظية (لوحة العميل)");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "order_update" && data.order) {
              queryClient.setQueryData<Order[]>(["/api/customer/orders"], (oldOrders) => {
                if (!oldOrders) return oldOrders;
                return oldOrders.map((o) => (o.id === data.order.id ? data.order : o));
              });
              toast({
                title: "تم تحديث حالة الطلبية",
                description: `تم تحديث حالة الطلبية ${data.order.orderNumber}`,
              });
              
              // إرسال إشعار المتصفح إذا كان مفعلاً
              if (notificationPermission === "granted") {
                notifyOrderUpdate(data.order.orderNumber, data.order.orderStatus);
              }
            }
          } catch (error) {
            console.error("خطأ في معالجة رسالة WebSocket:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("خطأ في WebSocket:", error);
        };

        ws.onclose = () => {
          console.log("تم إغلاق اتصال WebSocket (لوحة العميل)");
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("خطأ في الاتصال بـ WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, toast, notificationPermission]);

  // طلب إذن الإشعارات
  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "تم تفعيل الإشعارات",
          description: "ستتلقى إشعارات عند تحديث طلبياتك",
        });
      } else {
        toast({
          title: "لم يتم تفعيل الإشعارات",
          description: "يرجى السماح بالإشعارات من إعدادات المتصفح",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تفعيل الإشعارات",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/customer/login");
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً!",
    });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "غير محدد";
    return dateStr;
  };

  // فلترة الطلبيات
  const filteredOrders = orders.filter((order) => {
    // فلترة حسب البحث (رقم الطلبية فقط)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = order.orderNumber.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // فلترة حسب الحالة
    if (statusFilter !== "all") {
      if (order.orderStatus !== statusFilter) return false;
    }

    return true;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {companySettings?.companyLogo ? (
              <img 
                src={companySettings.companyLogo} 
                alt={companySettings.companyName || "Company Logo"} 
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">
                {companySettings?.companyName || "لوحة العميل"}
              </h1>
              <p className="text-xs text-muted-foreground">تتبع طلبياتك</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isNotificationSupported() && notificationPermission !== "granted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableNotifications}
                title="تفعيل إشعارات المتصفح"
              >
                <Bell className="w-4 h-4 ml-2" />
                تفعيل الإشعارات
              </Button>
            )}
            {notificationPermission === "granted" && (
              <Button
                variant="ghost"
                size="sm"
                disabled
                title="الإشعارات مفعلة"
              >
                <Bell className="w-4 h-4 ml-2 text-primary" />
                الإشعارات مفعلة
              </Button>
            )}
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

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* معلومات الحساب */}
        {(customer || customerProfile) && (
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">معلومات الحساب</CardTitle>
                    <CardDescription>إدارة معلومات حسابك</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <CreditCard className="w-4 h-4" />
                    رقم الحساب
                  </div>
                  <p className="font-semibold text-lg font-mono">{(customer || customerProfile)?.accountNumber}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <User className="w-4 h-4" />
                    الاسم
                  </div>
                  <p className="font-semibold text-lg">{(customer || customerProfile)?.name}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <MessageSquare className="w-4 h-4" />
                    رقم الهاتف
                  </div>
                  <p className="font-semibold text-lg" dir="ltr">{(customer || customerProfile)?.phoneNumber}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <Lock className="w-4 h-4" />
                    كلمة المرور
                  </div>
                  <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Lock className="w-4 h-4 ml-2" />
                        تغيير كلمة المرور
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>تغيير كلمة المرور</DialogTitle>
                        <DialogDescription>
                          يرجى إدخال كلمة المرور الحالية والجديدة
                        </DialogDescription>
                      </DialogHeader>
                      <ChangePasswordForm
                        onSuccess={() => setIsChangePasswordOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة الطلبيات */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">لا توجد طلبيات حتى الآن</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-2">طلبياتي</h2>
                <p className="text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      عرض {filteredOrders.length} من {orders.length} طلبية
                    </>
                  ) : (
                    <>إجمالي {orders.length} طلبية</>
                  )}
                </p>
              </div>
            </div>

            {/* شريط البحث والفلترة */}
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* البحث */}
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث برقم الطلبية..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  {/* فلترة حسب الحالة */}
                  <div className="sm:w-64">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 ml-2" />
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        {ORDER_STATUSES.slice(0, 8).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* زر إزالة الفلاتر */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="sm:w-auto"
                    >
                      <X className="w-4 h-4 ml-2" />
                      إزالة الفلاتر
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* رسالة عدم وجود نتائج */}
            {filteredOrders.length === 0 && hasActiveFilters ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-2">لم يتم العثور على طلبيات</p>
                  <p className="text-sm text-muted-foreground/70 mb-4">
                    حاول تغيير معايير البحث أو الفلترة
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="w-4 h-4 ml-2" />
                    إزالة جميع الفلاتر
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
              <Card key={order.id} className="shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardDescription className="mb-1">رقم الطلبية</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl font-heading">
                        {order.orderNumber}
                      </CardTitle>
                    </div>
                    <OrderStatusBadge status={order.orderStatus as OrderStatus} />
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <OrderProgressBar currentStatus={order.orderStatus as OrderStatus} order={order} />

                  {(order.orderValue || order.itemsCount || order.shippingCost) && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {order.orderValue && (
                        <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <DollarSign className="w-4 h-4" />
                            قيمة الطلبية
                          </div>
                          <p className="font-semibold text-lg" dir="ltr">
                            {order.orderValue} د.ل
                          </p>
                        </div>
                      )}

                      {order.itemsCount && (
                        <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <ShoppingCart className="w-4 h-4" />
                            عدد الأصناف
                          </div>
                          <p className="font-semibold text-lg">
                            {order.itemsCount}
                          </p>
                        </div>
                      )}

                      {order.shippingCost && (
                        <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Truck className="w-4 h-4" />
                            قيمة الشحن
                          </div>
                          <p className="font-semibold text-lg" dir="ltr">
                            {order.shippingCost} د.ل
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {order.estimatedDeliveryDate && (
                    <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        تاريخ الوصول المتوقع
                      </div>
                      <p className="font-semibold text-lg">
                        {formatDate(order.estimatedDeliveryDate)}
                      </p>
                    </div>
                  )}

                  {order.adminNotes && (
                    <div className="p-4 rounded-lg bg-accent/30 border-r-4 border-primary space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MessageSquare className="w-4 h-4" />
                        ملاحظات من الإدارة
                      </div>
                      <p className="text-foreground leading-relaxed">{order.adminNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}


