import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export function useFavicon() {
  // جلب بيانات الشركة
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings/public"));
      if (!response.ok) return null;
      return response.json();
    },
  });

  useEffect(() => {
    // البحث عن رابط favicon الحالي أو إنشاء واحد جديد
    let linkElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    if (!linkElement) {
      linkElement = document.createElement("link");
      linkElement.rel = "icon";
      document.head.appendChild(linkElement);
    }

    // تحديث favicon بناءً على شعار الشركة
    if (companySettings?.companyLogo) {
      linkElement.href = companySettings.companyLogo;
      // تحديد نوع الصورة بشكل صحيح
      if (companySettings.companyLogo.startsWith("data:image")) {
        const mimeType = companySettings.companyLogo.split(";")[0].split(":")[1];
        linkElement.type = mimeType || "image/png";
      } else {
        linkElement.type = "image/png";
      }
    } else {
      // إذا لم يكن هناك شعار، استخدم favicon افتراضي
      linkElement.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>";
      linkElement.type = "image/svg+xml";
    }
  }, [companySettings?.companyLogo]);
}

