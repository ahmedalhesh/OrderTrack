import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  isNotificationSupported,
  notifyOrderUpdate,
  notifyNewOrder,
  notifyOrderDeleted
} from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderForm } from "@/components/OrderForm";
import { CustomerForm } from "@/components/CustomerForm";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Order, type OrderStatus, ORDER_STATUSES, type Customer } from "@shared/schema";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  LogOut,
  RefreshCw,
  Loader2,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Bell,
  Settings as SettingsIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const { token, logout, isAuthenticated } = useAuthStore();
  const [, setLocation] = useLocation();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    isNotificationSupported() ? getNotificationPermission() : "denied"
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  const { data: customers = [], isLoading: isLoadingCustomers, refetch: refetchCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("فشل تحميل العملاء");
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
          console.log("تم الاتصال بخادم التحديثات اللحظية (لوحة التحكم)");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "order_update" && data.order) {
              // تحديث قائمة الطلبيات
              queryClient.setQueryData<Order[]>(["/api/orders"], (oldOrders) => {
                if (!oldOrders) return oldOrders;
                return oldOrders.map((o) => (o.id === data.order.id ? data.order : o));
              });
              
              // إرسال إشعار المتصفح إذا كان مفعلاً
              if (notificationPermission === "granted") {
                notifyOrderUpdate(data.order.orderNumber, data.order.orderStatus);
              }
            } else if (data.type === "order_create" && data.order) {
              // إضافة طلبية جديدة
              queryClient.setQueryData<Order[]>(["/api/orders"], (oldOrders) => {
                if (!oldOrders) return [data.order];
                return [data.order, ...oldOrders];
              });
              
              // إرسال إشعار المتصفح إذا كان مفعلاً
              if (notificationPermission === "granted") {
                notifyNewOrder(data.order.orderNumber, data.order.customerName);
              }
            } else if (data.type === "order_delete" && data.orderId) {
              // حذف طلبية
              queryClient.setQueryData<Order[]>(["/api/orders"], (oldOrders) => {
                if (!oldOrders) return oldOrders;
                const deletedOrder = oldOrders.find((o) => o.id === data.orderId);
                if (deletedOrder && notificationPermission === "granted") {
                  notifyOrderDeleted(deletedOrder.orderNumber);
                }
                return oldOrders.filter((o) => o.id !== data.orderId);
              });
            }
          } catch (error) {
            console.error("خطأ في معالجة رسالة WebSocket:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("خطأ في WebSocket:", error);
        };

        ws.onclose = () => {
          console.log("تم إغلاق اتصال WebSocket (لوحة التحكم)");
          // إعادة الاتصال بعد 3 ثوانٍ
          reconnectTimeoutRef.current = setTimeout(() => {
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
  }, [isAuthenticated, notificationPermission]);

  // طلب إذن الإشعارات
  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "تم تفعيل الإشعارات",
          description: "ستتلقى إشعارات عند تحديث الطلبيات",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("فشل حذف الطلبية");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الطلبية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل حذف الطلبية",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // البحث برقم الحساب
    const customer = order.customerId ? customers.find(c => c.id === order.customerId) : null;
    const accountNumberMatch = customer?.accountNumber?.toLowerCase().includes(query) || false;
    
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.phoneNumber.includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      accountNumberMatch
    );
  });

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.orderStatus === "تم التسليم").length,
    inProgress: orders.filter(o => !["تم التسليم", "ملغاة / توجد مشكلة"].includes(o.orderStatus)).length,
    cancelled: orders.filter(o => o.orderStatus === "ملغاة / توجد مشكلة").length,
  };

  const handleLogout = () => {
    logout();
    setLocation("/admin/login");
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً!",
    });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground">إدارة الطلبيات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/settings">
              <Button variant="ghost" size="sm">
                <SettingsIcon className="w-4 h-4 ml-2" />
                الإعدادات
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الطلبيات</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-total-orders">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-in-progress">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تم التسليم</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-delivered">{stats.delivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ملغاة</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-cancelled">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">الطلبيات</TabsTrigger>
            <TabsTrigger value="customers">العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    إدارة الطلبيات
                  </CardTitle>
                  <CardDescription className="mt-1">
                    عرض وإدارة جميع الطلبيات
                  </CardDescription>
                </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setSelectedOrder(null);
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-order">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة طلبية
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedOrder ? "تعديل الطلبية" : "إضافة طلبية جديدة"}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedOrder ? "قم بتعديل بيانات الطلبية" : "أدخل بيانات الطلبية الجديدة"}
                    </DialogDescription>
                  </DialogHeader>
                  <OrderForm 
                    order={selectedOrder} 
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setSelectedOrder(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلبية، الهاتف، اسم الزبون، أو رقم الحساب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                data-testid="input-search"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد طلبيات حتى الآن"}
                </p>
                {!searchQuery && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsFormOpen(true)}
                    data-testid="button-add-first-order"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    أضف أول طلبية
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                        <TableHead className="text-center font-semibold">تاريخ الوصول</TableHead>
                        <TableHead className="text-center font-semibold">الحالة</TableHead>
                        <TableHead className="text-center font-semibold">قيمة الشحن</TableHead>
                        <TableHead className="text-center font-semibold">قيمة الطلبية</TableHead>
                        <TableHead className="text-center font-semibold">عدد الأصناف</TableHead>
                        <TableHead className="text-center font-semibold">رقم الطلبية</TableHead>
                        <TableHead className="text-center font-semibold">الهاتف</TableHead>
                        <TableHead className="text-center font-semibold">اسم الزبون</TableHead>
                        <TableHead className="text-center font-semibold">رقم الحساب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsFormOpen(true);
                                }}
                                data-testid={`button-edit-${order.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-delete-${order.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من حذف الطلبية رقم {order.orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteMutation.mutate(order.id)}
                                      data-testid={`button-confirm-delete-${order.id}`}
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{order.estimatedDeliveryDate || "غير محدد"}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <OrderStatusBadge status={order.orderStatus as OrderStatus} size="sm" showIcon={false} />
                            </div>
                          </TableCell>
                          <TableCell dir="ltr" className="text-center">
                            {order.shippingCost ? `${order.shippingCost} د.ل` : "-"}
                          </TableCell>
                          <TableCell dir="ltr" className="text-center">
                            {order.orderValue ? `${order.orderValue} د.ل` : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {order.itemsCount ? order.itemsCount : "-"}
                          </TableCell>
                          <TableCell className="text-center font-medium">{order.orderNumber}</TableCell>
                          <TableCell dir="ltr" className="text-center">{order.phoneNumber}</TableCell>
                          <TableCell className="text-center">{order.customerName}</TableCell>
                          <TableCell className="text-center font-mono">
                            {order.customerId ? (
                              customers.find(c => c.id === order.customerId)?.accountNumber || "-"
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    إدارة العملاء
                  </CardTitle>
                  <CardDescription className="mt-1">
                    إنشاء وإدارة حسابات العملاء
                  </CardDescription>
                </div>
                <Dialog 
                  open={isCustomerFormOpen} 
                  onOpenChange={(open) => {
                    setIsCustomerFormOpen(open);
                    if (!open) setSelectedCustomer(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء حساب عميل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedCustomer ? "تعديل بيانات العميل" : "إنشاء حساب عميل جديد"}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedCustomer 
                          ? "قم بتعديل بيانات العميل" 
                          : "أدخل بيانات العميل لإنشاء حساب خاص به"}
                      </DialogDescription>
                    </DialogHeader>
                    <CustomerForm 
                      customer={selectedCustomer}
                      onSuccess={() => {
                        setIsCustomerFormOpen(false);
                        setSelectedCustomer(null);
                        refetchCustomers();
                      }}
                      onCancel={() => {
                        setIsCustomerFormOpen(false);
                        setSelectedCustomer(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">لا توجد حسابات عملاء حتى الآن</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsCustomerFormOpen(true)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء أول حساب
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                          <TableHead className="text-center font-semibold">تاريخ الإنشاء</TableHead>
                          <TableHead className="text-center font-semibold">رقم الهاتف</TableHead>
                          <TableHead className="text-center font-semibold">اسم العميل</TableHead>
                          <TableHead className="text-center font-semibold">رقم الحساب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setIsCustomerFormOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        هل أنت متأكد من حذف حساب العميل {customer.name}؟ لا يمكن التراجع عن هذا الإجراء.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(`/api/customers/${customer.id}`, {
                                              method: "DELETE",
                                              headers: {
                                                Authorization: `Bearer ${token}`,
                                              },
                                            });
                                            if (response.ok) {
                                              toast({
                                                title: "تم الحذف بنجاح",
                                                description: `تم حذف حساب العميل ${customer.name}`,
                                              });
                                              refetchCustomers();
                                            } else {
                                              throw new Error("فشل الحذف");
                                            }
                                          } catch (error) {
                                            toast({
                                              title: "خطأ",
                                              description: "حدث خطأ أثناء حذف العميل",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        حذف
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("ar-LY") : "-"}
                            </TableCell>
                            <TableCell dir="ltr" className="text-center">{customer.phoneNumber}</TableCell>
                            <TableCell className="text-center">{customer.name}</TableCell>
                            <TableCell className="text-center font-medium" dir="ltr">{customer.accountNumber}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
