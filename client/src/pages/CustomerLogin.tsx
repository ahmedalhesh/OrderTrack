import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { customerLoginSchema, type CustomerLoginInput } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Package, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useCustomerAuthStore } from "@/lib/customerAuth";
import { Footer } from "@/components/Footer";

export default function CustomerLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setToken } = useCustomerAuthStore();

  const form = useForm<CustomerLoginInput>({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: {
      accountNumber: "",
      phoneNumber: "",
      password: "",
    },
  });

  const onSubmit = async (data: CustomerLoginInput) => {
    setIsLoading(true);
    try {
      // استخدام القيمة من accountNumber (الحقل المشترك)
      const identifier = (data.accountNumber || data.phoneNumber || "").trim();
      
      const loginData: any = {
        password: data.password,
      };
      
      // إرسال القيمة في كلا الحقلين للبحث في كلا المكانين
      if (identifier) {
        loginData.accountNumber = identifier;
        loginData.phoneNumber = identifier;
      }

      const response = await fetch(getApiUrl("/api/customer/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "فشل تسجيل الدخول");
      }

      setToken(result.token, result.customer);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${result.customer.name}`,
      });
      setLocation("/customer/dashboard");
    } catch (error: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message || "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading">تسجيل دخول العميل</CardTitle>
          <CardDescription>
            أدخل رقم حسابك أو رقم هاتفك وكلمة المرور للوصول إلى طلبياتك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الحساب أو رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="أدخل رقم حسابك أو رقم هاتفك"
                        className="h-12"
                        dir="ltr"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          // نسخ القيمة إلى phoneNumber أيضاً للبحث في كلا الحقلين
                          form.setValue("phoneNumber", value);
                        }}
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
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowRight className="w-5 h-5 mr-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة إلى الصفحة الرئيسية
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </main>
      <Footer />
    </div>
  );
}

