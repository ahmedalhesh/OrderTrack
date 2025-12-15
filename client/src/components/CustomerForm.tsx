import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  const form = useForm<InsertCustomer & { accountNumber?: string }>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      accountNumber: customer?.accountNumber || "",
      password: "",
      name: customer?.name || "",
      phoneNumber: customer?.phoneNumber || "",
    },
  });

  const onSubmit = async (data: InsertCustomer & { accountNumber?: string }) => {
    setIsLoading(true);
    try {
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PUT" : "POST";
      
      // عند التعديل، لا ترسل كلمة المرور إذا كانت فارغة
      // عند الإنشاء، لا ترسل accountNumber لأنه سيتم توليده تلقائياً
      const requestData: any = {
        name: data.name,
        phoneNumber: data.phoneNumber,
      };
      
      if (customer) {
        // عند التعديل
        if (data.password && data.password.trim()) {
          requestData.password = data.password;
        }
      } else {
        // عند الإنشاء
        if (data.password && data.password.trim()) {
          requestData.password = data.password;
        }
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "حدث خطأ");
      }
      
      toast({
        title: customer ? "تم التعديل بنجاح" : "تم إنشاء الحساب بنجاح",
        description: customer 
          ? `تم تحديث بيانات العميل ${result.name}`
          : `تم إنشاء حساب للعميل ${result.name} برقم حساب ${result.accountNumber}`,
      });
      form.reset();
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
          <h3 className="font-semibold text-lg border-b pb-2">معلومات الحساب</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {customer ? (
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الحساب</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: CUST-12345"
                        dir="ltr"
                        {...field}
                        readOnly={true}
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>رقم الحساب</FormLabel>
                <FormControl>
                  <Input
                    placeholder="سيتم توليده تلقائياً"
                    dir="ltr"
                    readOnly={true}
                    className="bg-muted cursor-not-allowed"
                    value="سيتم توليده تلقائياً"
                  />
                </FormControl>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {customer ? "كلمة المرور (اتركها فارغة للاحتفاظ بالقديمة)" : "كلمة المرور *"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={customer ? "أدخل كلمة مرور جديدة أو اتركها فارغة" : "أدخل كلمة المرور"}
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
          <h3 className="font-semibold text-lg border-b pb-2">معلومات العميل</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="أدخل اسم العميل"
                      {...field}
                      readOnly={!!customer}
                      className={customer ? "bg-muted cursor-not-allowed" : ""}
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              customer ? "حفظ التعديلات" : "إنشاء الحساب"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

