import { ORDER_STATUSES, type OrderStatus, type Order } from "@shared/schema";
import { 
  Package, 
  CreditCard, 
  ShoppingCart, 
  Truck, 
  Plane, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  XCircle,
  Check,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcons = [
  Package,
  CreditCard,
  ShoppingCart,
  Truck,
  Plane,
  MapPin,
  Navigation,
  CheckCircle2,
  XCircle,
];

interface OrderProgressBarProps {
  currentStatus: OrderStatus;
  order?: Order;
}

export function OrderProgressBar({ currentStatus, order }: OrderProgressBarProps) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
  const isCancelled = currentStatus === "ملغاة / توجد مشكلة";
  const isDelivered = currentStatus === "تم التسليم";
  
  const displayStatuses = ORDER_STATUSES.slice(0, 8);

  // تحليل statusTimestamps من Order
  let statusTimestamps: Record<string, string> = {};
  if (order?.statusTimestamps) {
    try {
      statusTimestamps = typeof order.statusTimestamps === "string" 
        ? JSON.parse(order.statusTimestamps) 
        : order.statusTimestamps;
    } catch (e) {
      console.error("Failed to parse statusTimestamps:", e);
    }
  }

  // إذا لم يكن هناك statusTimestamps، استخدم createdAt كتاريخ للحالة الأولى
  if (order && Object.keys(statusTimestamps).length === 0 && order.createdAt) {
    const initialStatus = order.orderStatus || "تم استلام الطلب";
    statusTimestamps[initialStatus] = order.createdAt instanceof Date 
      ? order.createdAt.toISOString() 
      : new Date(order.createdAt).toISOString();
  }

  // دالة لتنسيق التاريخ والوقت (ميلادي)
  const formatDateTime = (timestamp: string | undefined) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      
      // تنسيق التاريخ الميلادي بالعربية
      const months = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const dateStr = `${day} ${month} ${year}`;
      
      // تنسيق الوقت بأرقام إنجليزية
      const timeStr = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      
      return { date: dateStr, time: timeStr };
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="w-full py-6">
      {/* Desktop Design - Timeline with Steps */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 right-0 left-0 h-1 bg-gradient-to-l from-primary/20 via-primary/40 to-primary/20 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isCancelled ? 'bg-gradient-to-l from-destructive to-destructive/80' : 'bg-gradient-to-l from-primary to-primary/80'
              )}
              style={{ 
                width: isDelivered ? '100%' : `${Math.min((currentIndex / 7) * 100, 100)}%`
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-8 gap-4">
            {displayStatuses.map((status, index) => {
              const Icon = statusIcons[index];
              const isCompleted = index < currentIndex && !isCancelled;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex;
              
              return (
                <div key={status} className="flex flex-col items-center relative">
                  {/* Step Circle */}
                  <div className="relative z-10">
                    <div 
                      className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md",
                        "border-2 relative overflow-hidden",
                        isCompleted && "bg-primary text-primary-foreground border-primary scale-105",
                        isCurrent && !isCancelled && "bg-primary text-primary-foreground border-primary ring-4 ring-primary/30 scale-110 shadow-lg",
                        isCurrent && isCancelled && "bg-destructive text-destructive-foreground border-destructive ring-4 ring-destructive/30 scale-110 shadow-lg",
                        isPending && "bg-card text-muted-foreground border-muted-foreground/30"
                      )}
                    >
                      {/* Background Pattern for Completed/Current */}
                      {(isCompleted || isCurrent) && (
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                      )}
                      
                      {/* Icon or Check */}
                      <div className="relative z-10">
                        {isCompleted ? (
                          <Check className="w-7 h-7" strokeWidth={2.5} />
                        ) : (
                          <Icon className={cn(
                            "w-6 h-6",
                            isCurrent && "animate-pulse"
                          )} />
                        )}
                      </div>

                      {/* Pulse Animation for Current */}
                      {isCurrent && !isCancelled && (
                        <div className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
                      )}
                    </div>

                  </div>

                  {/* Status Label */}
                  <div className={cn(
                    "mt-4 text-center transition-all duration-300 space-y-1",
                    isCurrent && "scale-105"
                  )}>
                    <span 
                      className={cn(
                        "block text-sm font-medium leading-tight px-2 py-1 rounded-md transition-colors",
                        isCurrent && "text-foreground font-bold bg-primary/10",
                        isCompleted && "text-muted-foreground",
                        isPending && "text-muted-foreground/60"
                      )}
                    >
                      {status}
                    </span>
                    {/* عرض التاريخ والوقت - يظهر إذا كان موجود في statusTimestamps */}
                    {(() => {
                      const dateTime = formatDateTime(statusTimestamps[status]);
                      if (dateTime) {
                        return (
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{dateTime.date}</span>
                            </div>
                            <div className="text-muted-foreground/80">{dateTime.time}</div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Design - Vertical Timeline */}
      <div className="md:hidden space-y-4">
        {displayStatuses.map((status, index) => {
          const Icon = statusIcons[index];
          const isCompleted = index < currentIndex && !isCancelled;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const isLast = index === displayStatuses.length - 1;
          
          return (
            <div key={status} className="flex items-start gap-4 relative">
              {/* Vertical Line */}
              {!isLast && (
                <div className="absolute right-8 top-16 w-0.5 h-full">
                  <div 
                    className={cn(
                      "w-full h-full transition-all duration-500",
                      isCompleted ? "bg-gradient-to-b from-primary to-primary/50" : "bg-muted"
                    )}
                    style={{ height: isLast ? '0' : '100%' }}
                  />
                </div>
              )}

              {/* Step Circle */}
              <div className="relative z-10 flex-shrink-0">
                <div 
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                    "border-2 relative overflow-hidden",
                    isCompleted && "bg-primary text-primary-foreground border-primary",
                    isCurrent && !isCancelled && "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20 shadow-lg scale-110",
                    isCurrent && isCancelled && "bg-destructive text-destructive-foreground border-destructive ring-4 ring-destructive/20 shadow-lg scale-110",
                    isPending && "bg-card text-muted-foreground border-muted-foreground/30"
                  )}
                >
                  {(isCompleted || isCurrent) && (
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                  )}
                  
                  <div className="relative z-10">
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      <Icon className={cn(
                        "w-5 h-5",
                        isCurrent && "animate-pulse"
                      )} />
                    )}
                  </div>

                  {isCurrent && !isCancelled && (
                    <div className="absolute inset-0 rounded-xl bg-primary animate-ping opacity-20" />
                  )}
                </div>
              </div>

              {/* Status Content */}
              <div className={cn(
                "flex-1 pt-2 transition-all duration-300",
                isCurrent && "translate-x-1"
              )}>
                <div 
                  className={cn(
                    "inline-flex flex-col gap-2 px-3 py-2 rounded-lg transition-all w-full",
                    isCurrent && "bg-primary/10 font-bold",
                    isCompleted && "text-muted-foreground",
                    isPending && "text-muted-foreground/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-foreground",
                      isCompleted && "text-muted-foreground",
                      isPending && "text-muted-foreground/60"
                    )}>
                      {status}
                    </span>
                    {isCurrent && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                        الآن
                      </span>
                    )}
                  </div>
                  {/* عرض التاريخ والوقت - يظهر إذا كان موجود في statusTimestamps */}
                  {(() => {
                    const dateTime = formatDateTime(statusTimestamps[status]);
                    if (dateTime) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{dateTime.date}</span>
                          <span className="text-muted-foreground/80">-</span>
                          <span className="text-muted-foreground/80">{dateTime.time}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled Status Alert */}
      {isCancelled && (
        <div className="mt-8 p-4 bg-destructive/10 border-r-4 border-destructive rounded-lg flex items-start gap-4 animate-in slide-in-from-top-2">
          <div className="flex-shrink-0 mt-0.5">
            <XCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-destructive mb-1">الطلبية ملغاة أو توجد مشكلة</p>
            <p className="text-sm text-muted-foreground">يرجى التواصل مع الإدارة للمزيد من المعلومات</p>
          </div>
        </div>
      )}
    </div>
  );
}
