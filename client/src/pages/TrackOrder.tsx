import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderProgressBar } from "@/components/OrderProgressBar";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Footer } from "@/components/Footer";
import { trackOrderSchema, type TrackOrderInput, type Order, type OrderStatus } from "@shared/schema";
import { Search, Package, Phone, Calendar, MessageSquare, Loader2, ArrowLeft, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/api";

export default function TrackOrder() {
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<"orderNumber" | "phoneNumber">("orderNumber");
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // جلب بيانات الشركة
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings/public"));
      if (!response.ok) return null;
      return response.json();
    },
  });

  const form = useForm<TrackOrderInput>({
    resolver: zodResolver(trackOrderSchema),
    defaultValues: {
      orderNumber: "",
      phoneNumber: "",
    },
  });

  const onSubmit = async (data: TrackOrderInput) => {
    setIsLoading(true);
    setOrder(null);
    setOrders([]);
    
    try {
      const params = new URLSearchParams();
      if (searchType === "orderNumber" && data.orderNumber) {
        params.set("orderNumber", data.orderNumber);
      } else if (searchType === "phoneNumber" && data.phoneNumber) {
        params.set("phoneNumber", data.phoneNumber);
      }
      
      const response = await fetch(`/api/orders/track?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "حدث خطأ أثناء البحث");
      }
      
      if (Array.isArray(result)) {
        if (result.length === 0) {
          toast({
            title: "لم يتم العثور على طلبيات",
            description: "تأكد من صحة البيانات المدخلة",
            variant: "destructive",
          });
        } else if (result.length === 1) {
          setOrder(result[0]);
        } else {
          setOrders(result);
        }
      } else {
        setOrder(result);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء البحث",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "غير محدد";
    return dateStr;
  };

  // استخدام useRef لتخزين أحدث القيم
  const orderRef = useRef<Order | null>(null);
  const ordersRef = useRef<Order[]>([]);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // إعداد WebSocket للاستماع للتحديثات اللحظية
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("تم الاتصال بخادم التحديثات اللحظية");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[Client] Received WebSocket message:", data.type);
            
            if (data.type === "order_update" && data.order) {
              const updatedOrder = data.order;
              console.log("[Client] Order update received:", updatedOrder.orderNumber, "Status:", updatedOrder.orderStatus);
              
              // تحديث الطلبية المعروضة إذا كانت نفس الطلبية
              const currentOrder = orderRef.current;
              if (currentOrder && currentOrder.id === updatedOrder.id) {
                console.log("[Client] Updating displayed order");
                setOrder(updatedOrder);
                toast({
                  title: "تم تحديث حالة الطلبية",
                  description: `تم تحديث حالة الطلبية ${updatedOrder.orderNumber}`,
                });
              }
              
              // تحديث قائمة الطلبيات إذا كانت موجودة
              const currentOrders = ordersRef.current;
              if (currentOrders.length > 0) {
                console.log("[Client] Updating orders list");
                setOrders((prevOrders) =>
                  prevOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                );
              }
            } else if (data.type === "connected") {
              console.log("[Client] WebSocket connected:", data.message);
            }
          } catch (error) {
            console.error("خطأ في معالجة رسالة WebSocket:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("خطأ في WebSocket:", error);
        };

        ws.onclose = () => {
          console.log("تم إغلاق اتصال WebSocket");
          // إعادة الاتصال بعد 3 ثوانٍ
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
  }, [toast]); // إزالة order و orders من dependencies

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
              <h1 className="font-heading font-bold text-lg leading-tight">تتبع الطلبيات</h1>
              <p className="text-xs text-muted-foreground">
                {companySettings?.companyName || "شركة الوسيط للشراء"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 ml-2" />
                الصفحة الرئيسية
              </Button>
            </Link>
            <Link href="/customer/login">
              <Button variant="outline" size="sm">
                <LogIn className="w-4 h-4 ml-2" />
                تسجيل الدخول
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="font-heading text-3xl md:text-4xl font-bold">تتبع طلبيتك</h2>
            <p className="text-muted-foreground text-lg">
              أدخل رقم الطلبية أو رقم الهاتف للاطلاع على حالة طلبك
            </p>
          </div>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <Tabs 
                value={searchType} 
                onValueChange={(v) => {
                  setSearchType(v as "orderNumber" | "phoneNumber");
                  form.reset();
                  setOrder(null);
                  setOrders([]);
                }}
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="orderNumber" className="gap-2" data-testid="tab-order-number">
                    <Package className="w-4 h-4" />
                    رقم الطلبية
                  </TabsTrigger>
                  <TabsTrigger value="phoneNumber" className="gap-2" data-testid="tab-phone-number">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </TabsTrigger>
                </TabsList>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <TabsContent value="orderNumber" className="mt-0">
                      <FormField
                        control={form.control}
                        name="orderNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الطلبية</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="مثال: ORD-12345"
                                className="h-12 text-base"
                                data-testid="input-order-number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="phoneNumber" className="mt-0">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الهاتف</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="مثال: 0912345678"
                                className="h-12 text-base"
                                dir="ltr"
                                data-testid="input-phone-number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold"
                      disabled={isLoading}
                      data-testid="button-search"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          جاري البحث...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5 ml-2" />
                          بحث
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </Tabs>
            </CardContent>
          </Card>

          {orders.length > 1 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  الطلبيات المرتبطة برقم الهاتف
                </CardTitle>
                <CardDescription>
                  تم العثور على {orders.length} طلبيات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOrder(o);
                      setOrders([]);
                    }}
                    className="w-full p-4 rounded-lg border bg-card text-right hover-elevate active-elevate-2 transition-all"
                    data-testid={`button-order-${o.id}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold text-lg">{o.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{o.customerName}</p>
                      </div>
                      <OrderStatusBadge status={o.orderStatus as OrderStatus} size="sm" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {order && (
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardDescription className="mb-1">رقم الطلبية</CardDescription>
                    <CardTitle className="text-2xl md:text-3xl font-heading" data-testid="text-order-number">
                      {order.orderNumber}
                    </CardTitle>
                  </div>
                  <OrderStatusBadge status={order.orderStatus as OrderStatus} />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <OrderProgressBar currentStatus={order.orderStatus as OrderStatus} order={order} />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      تاريخ الوصول المتوقع
                    </div>
                    <p className="font-semibold text-lg" data-testid="text-delivery-date">
                      {formatDate(order.estimatedDeliveryDate)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="w-4 h-4" />
                      رقم الهاتف
                    </div>
                    <p className="font-semibold text-lg" dir="ltr" data-testid="text-phone">
                      {order.phoneNumber}
                    </p>
                  </div>
                </div>

                {order.adminNotes && (
                  <div className="p-4 rounded-lg bg-accent/30 border-r-4 border-primary space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MessageSquare className="w-4 h-4" />
                      ملاحظات من الإدارة
                    </div>
                    <p className="text-foreground leading-relaxed" data-testid="text-admin-notes">
                      {order.adminNotes}
                    </p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setOrder(null);
                    form.reset();
                  }}
                  data-testid="button-new-search"
                >
                  بحث جديد
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
