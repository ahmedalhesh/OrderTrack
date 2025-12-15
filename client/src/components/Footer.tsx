import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function Footer() {
  const [logoError, setLogoError] = useState(false);
  
  // جلب بيانات الشركة
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings/public"));
      if (!response.ok) return null;
      return response.json();
    },
  });

  return (
    <footer className="border-t mt-16 py-8 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          {/* معلومات الشركة */}
          {(companySettings?.companyAddress || companySettings?.companyPhone || companySettings?.companyEmail) && (
            <div className="text-center md:text-right space-y-2">
              {companySettings?.companyAddress && (
                <p className="text-sm text-muted-foreground">{companySettings.companyAddress}</p>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 text-sm text-muted-foreground">
                {companySettings?.companyPhone && (
                  <span>الهاتف: {companySettings.companyPhone}</span>
                )}
                {companySettings?.companyEmail && (
                  <span>البريد: {companySettings.companyEmail}</span>
                )}
              </div>
            </div>
          )}
          
          {/* حقوق النشر والمطور */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
            <div className="text-center sm:text-right">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} جميع الحقوق محفوظة
              </p>
              {companySettings?.companyAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  {companySettings.companyAddress}
                </p>
              )}
              {companySettings?.companyPhone && (
                <p className="text-sm text-muted-foreground mt-1">
                  {companySettings.companyPhone}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>تطوير</span>
              <a 
                href="http://washq.ly/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-80 transition-opacity group"
                title="washq.ly"
              >
                {!logoError ? (
                  <img 
                    src="https://washq.ly/favicon.ico" 
                    alt="washq.ly"
                    className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-primary hover:underline">washq.ly</span>
                )}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

