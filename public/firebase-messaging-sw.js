importScripts("https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  messagingSenderId: "686513083893"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  const nTitle = title || "Nova mensagem";
  const nOpts = {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
    data: payload.data || {}
  };
  self.registration.showNotification(nTitle, nOpts);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.click_action || "/";
  event.waitUntil(clients.openWindow(url));
});
