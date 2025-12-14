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
  XCircle,
  Check
} from "lucide-react";

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
}

export function OrderProgressBar({ currentStatus }: OrderProgressBarProps) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
  const isCancelled = currentStatus === "ملغاة / توجد مشكلة";
  const isDelivered = currentStatus === "تم التسليم";
  
  const displayStatuses = ORDER_STATUSES.slice(0, 8);

  return (
    <div className="w-full py-6">
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between">
          {displayStatuses.map((status, index) => {
            const Icon = statusIcons[index];
            const isCompleted = index < currentIndex && !isCancelled;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            
            return (
              <div key={status} className="flex flex-col items-center relative z-10">
                <div 
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted ? 'bg-primary text-primary-foreground shadow-lg' : ''}
                    ${isCurrent && !isCancelled ? 'bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-lg scale-110' : ''}
                    ${isCurrent && isCancelled ? 'bg-destructive text-destructive-foreground ring-4 ring-destructive/30 shadow-lg scale-110' : ''}
                    ${isPending ? 'bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/40' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span 
                  className={`
                    mt-3 text-xs text-center font-medium max-w-[80px] leading-tight
                    ${isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'}
                  `}
                >
                  {status}
                </span>
              </div>
            );
          })}
          
          <div className="absolute top-6 right-6 left-6 h-1 -translate-y-1/2 bg-muted rounded-full">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isCancelled ? 'bg-destructive' : 'bg-primary'}`}
              style={{ 
                width: `${isDelivered ? 100 : isCancelled ? (currentIndex / 7) * 100 : (currentIndex / 7) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {displayStatuses.map((status, index) => {
          const Icon = statusIcons[index];
          const isCompleted = index < currentIndex && !isCancelled;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          
          return (
            <div key={status} className="flex items-center gap-4">
              <div className="relative">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent && !isCancelled ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${isCurrent && isCancelled ? 'bg-destructive text-destructive-foreground ring-4 ring-destructive/20' : ''}
                    ${isPending ? 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/40' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                {index < displayStatuses.length - 1 && (
                  <div 
                    className={`absolute top-10 right-1/2 w-0.5 h-6 translate-x-1/2
                      ${isCompleted ? 'bg-primary' : 'bg-muted'}
                    `}
                  />
                )}
              </div>
              <span 
                className={`
                  text-sm font-medium
                  ${isCurrent ? 'text-foreground font-semibold' : ''}
                  ${isCompleted ? 'text-muted-foreground' : ''}
                  ${isPending ? 'text-muted-foreground/60' : ''}
                `}
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive">الطلبية ملغاة أو توجد مشكلة</p>
            <p className="text-sm text-muted-foreground">يرجى التواصل مع الإدارة للمزيد من المعلومات</p>
          </div>
        </div>
      )}
    </div>
  );
}
