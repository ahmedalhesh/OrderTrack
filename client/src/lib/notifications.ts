/**
 * خدمة إشعارات المتصفح
 */

// التحقق من دعم الإشعارات
export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

// التحقق من حالة إذن الإشعارات
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}

// طلب إذن الإشعارات
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error("المتصفح لا يدعم الإشعارات");
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    throw new Error("تم رفض الإشعارات. يرجى تفعيلها من إعدادات المتصفح");
  }

  // طلب الإذن
  const permission = await Notification.requestPermission();
  return permission;
}

// الحصول على أيقونة الإشعار (من favicon أو الشعار)
function getNotificationIcon(): string {
  const linkElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (linkElement && linkElement.href) {
    return linkElement.href;
  }
  // أيقونة افتراضية إذا لم يكن هناك favicon
  return "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>";
}

// إرسال إشعار
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationSupported()) {
    console.warn("المتصفح لا يدعم الإشعارات");
    return null;
  }

  if (Notification.permission !== "granted") {
    console.warn("لم يتم منح إذن الإشعارات");
    return null;
  }

  const notificationIcon = getNotificationIcon();
  const defaultOptions: NotificationOptions = {
    icon: notificationIcon,
    badge: notificationIcon,
    dir: "rtl",
    lang: "ar",
    ...options,
  };

  try {
    const notification = new Notification(title, defaultOptions);
    
    // إغلاق الإشعار تلقائياً بعد 5 ثوان
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error("خطأ في عرض الإشعار:", error);
    return null;
  }
}

// إشعار تحديث الطلبية
export function notifyOrderUpdate(orderNumber: string, newStatus: string) {
  return showNotification(`تم تحديث حالة الطلبية ${orderNumber}`, {
    body: `الحالة الجديدة: ${newStatus}`,
    tag: `order-${orderNumber}`,
    requireInteraction: false,
  });
}

// إشعار طلبية جديدة
export function notifyNewOrder(orderNumber: string, customerName: string) {
  return showNotification(`طلبية جديدة: ${orderNumber}`, {
    body: `العميل: ${customerName}`,
    tag: `order-new-${orderNumber}`,
    requireInteraction: true,
  });
}

// إشعار حذف الطلبية
export function notifyOrderDeleted(orderNumber: string) {
  return showNotification(`تم حذف الطلبية ${orderNumber}`, {
    body: "تم حذف هذه الطلبية من النظام",
    tag: `order-deleted-${orderNumber}`,
    requireInteraction: false,
  });
}

