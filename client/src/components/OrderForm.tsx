import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertOrderSchema, type InsertOrder, type Order, ORDER_STATUSES } from "@shared/schema";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";

interface OrderFormProps {
  order?: Order | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  const form = useForm<InsertOrder>({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || "",
      customerName: order?.customerName || "",
      phoneNumber: order?.phoneNumber || "",
      orderStatus: order?.orderStatus || "تم استلام الطلب",
      estimatedDeliveryDate: order?.estimatedDeliveryDate || "",
      adminNotes: order?.adminNotes || "",
    },
  });

  const onSubmit = async (data: InsertOrder) => {
    setIsLoading(true);
    try {
      const url = order ? `/api/orders/${order.id}` : "/api/orders";
      const method = order ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "حدث خطأ");
      }
      
      toast({
        title: order ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح",
        description: order ? "تم تحديث بيانات الطلبية" : "تم إضافة الطلبية الجديدة",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">معلومات الزبون</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الطلبية *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: ORD-12345"
                      data-testid="input-form-order-number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الزبون *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="أدخل اسم الزبون"
                      data-testid="input-form-customer-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الهاتف *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="مثال: 0912345678"
                    dir="ltr"
                    className="text-right"
                    data-testid="input-form-phone"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">حالة الطلبية</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="orderStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حالة الطلب *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-order-status">
                        <SelectValue placeholder="اختر حالة الطلب" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الوصول المتوقع</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: 2024-01-15"
                      data-testid="input-form-delivery-date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">ملاحظات</h3>
          
          <FormField
            control={form.control}
            name="adminNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات للزبون</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="أدخل أي ملاحظات تريد عرضها للزبون..."
                    className="min-h-[100px] resize-none"
                    data-testid="input-form-notes"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
            data-testid="button-save-order"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                {order ? "حفظ التعديلات" : "إضافة الطلبية"}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-form"
          >
            <X className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
        </div>
      </form>
    </Form>
  );
}
