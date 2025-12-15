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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { insertOrderSchema, type InsertOrder, type Order, ORDER_STATUSES, type Customer } from "@shared/schema";
import { Loader2, Save, X, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface OrderFormProps {
  order?: Order | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  // جلب قائمة العملاء
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const form = useForm<InsertOrder & { customerId?: number }>({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      orderNumber: order?.orderNumber || "",
      customerName: order?.customerName || "",
      phoneNumber: order?.phoneNumber || "",
      customerId: order?.customerId || undefined,
      orderStatus: order?.orderStatus || "تم استلام الطلب",
      estimatedDeliveryDate: order?.estimatedDeliveryDate || "",
      adminNotes: order?.adminNotes || "",
      orderValue: order?.orderValue || "",
      itemsCount: order?.itemsCount || undefined,
      shippingCost: order?.shippingCost || "",
    },
  });

  // عند اختيار عميل، ملء البيانات تلقائياً
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id.toString() === selectedCustomerId);
      if (customer) {
        form.setValue("customerName", customer.name);
        form.setValue("phoneNumber", customer.phoneNumber);
        form.setValue("customerId", customer.id);
      }
    }
  }, [selectedCustomerId, customers, form]);

  const onSubmit = async (data: InsertOrder & { customerId?: number }) => {
    setIsLoading(true);
    try {
      const url = order ? getApiUrl(`/api/orders/${order.id}`) : getApiUrl("/api/orders");
      const method = order ? "PUT" : "POST";
      
      // إرسال البيانات مع customerId إذا كان موجوداً
      const orderData: any = { ...data };
      if (data.customerId) {
        orderData.customerId = data.customerId;
      }
      
      // عند إنشاء طلبية جديدة، إزالة orderNumber ليتم توليده تلقائياً
      if (!order) {
        delete orderData.orderNumber;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
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
                  <FormLabel>رقم الطلبية {order ? "*" : "(سيتم توليده تلقائياً)"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={order ? "مثال: ORD-12345" : "سيتم توليده تلقائياً"}
                      data-testid="input-form-order-number"
                      {...field}
                      readOnly={true}
                      disabled={!order}
                      className="bg-muted"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!order && customers.length > 0 && (
              <FormItem>
                <FormLabel>اختر عميل (اختياري)</FormLabel>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-9",
                          !selectedCustomerId && "text-muted-foreground"
                        )}
                      >
                        {selectedCustomerId
                          ? customers.find((customer) => customer.id.toString() === selectedCustomerId)?.name + " - " + customers.find((customer) => customer.id.toString() === selectedCustomerId)?.accountNumber
                          : "اختر عميل من القائمة أو ابحث..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command 
                      filter={(value, search) => {
                        const searchLower = search.toLowerCase();
                        const valueLower = value.toLowerCase();
                        // البحث في جميع أجزاء القيمة
                        if (valueLower.includes(searchLower)) {
                          return 1;
                        }
                        return 0;
                      }}
                    >
                      <CommandInput placeholder="ابحث بالاسم، رقم الحساب، أو رقم الهاتف..." />
                      <CommandList>
                        <CommandEmpty>لم يتم العثور على عميل.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} ${customer.accountNumber} ${customer.phoneNumber} ${customer.name} ${customer.accountNumber} ${customer.phoneNumber}`}
                              keywords={[customer.name, customer.accountNumber, customer.phoneNumber, customer.email || ""]}
                              onSelect={() => {
                                setSelectedCustomerId(customer.id.toString());
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  selectedCustomerId === customer.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{customer.name} - {customer.accountNumber}</span>
                                <span className="text-xs text-muted-foreground" dir="ltr">{customer.phoneNumber}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
                      readOnly={true}
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="text-right bg-muted"
                      data-testid="input-form-phone"
                      {...field}
                      readOnly={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">معلومات الطلبية</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="orderValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>قيمة الطلبية</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: 150.50 د.ل"
                      dir="ltr"
                      type="number"
                      step="0.01"
                      data-testid="input-form-order-value"
                      {...field}
                      value={field.value || ""}
                      readOnly={true}
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemsCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد الأصناف</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: 3"
                      dir="ltr"
                      type="number"
                      min="1"
                      data-testid="input-form-items-count"
                      {...field}
                      value={field.value || ""}
                      readOnly={true}
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shippingCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>قيمة الشحن</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: 50.00 د.ل"
                      dir="ltr"
                      type="number"
                      step="0.01"
                      data-testid="input-form-shipping-cost"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? e.target.value : "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
