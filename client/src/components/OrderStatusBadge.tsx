import { Badge } from "@/components/ui/badge";
import { ORDER_STATUSES, type OrderStatus } from "@shared/schema";
import { 
  Package, 
  CreditCard, 
  ShoppingCart, 
  Truck, 
  Plane, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

const statusConfig: Record<OrderStatus, { 
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: React.ElementType;
}> = {
  "تم استلام الطلب": { 
    variant: "secondary", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Package
  },
  "تم تأكيد الدفع": { 
    variant: "secondary", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: CreditCard
  },
  "تم الشراء من الموقع": { 
    variant: "secondary", 
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: ShoppingCart
  },
  "قيد الشحن من المصدر": { 
    variant: "secondary", 
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: Truck
  },
  "وصلت إلى بلد العبور": { 
    variant: "secondary", 
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    icon: Plane
  },
  "وصلت إلى ليبيا": { 
    variant: "secondary", 
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    icon: MapPin
  },
  "قيد التوصيل": { 
    variant: "secondary", 
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: Navigation
  },
  "تم التسليم": { 
    variant: "default", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: CheckCircle2
  },
  "ملغاة / توجد مشكلة": { 
    variant: "destructive", 
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: XCircle
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function OrderStatusBadge({ status, showIcon = true, size = "default" }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig["تم استلام الطلب"];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"} font-medium border`}
    >
      {showIcon && <Icon className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} ml-1.5`} />}
      {status}
    </Badge>
  );
}

export function getStatusIndex(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status);
}
