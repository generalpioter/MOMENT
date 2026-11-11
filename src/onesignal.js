const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const BASE_PATH = import.meta.env.BASE_URL;
const SERVICE_WORKER_PATH = "push/onesignal/OneSignalSDKWorker.js";

let oneSignalPromise;

export function isOneSignalConfigured() {
  return Boolean(APP_ID);
}

export function getOneSignal() {
  if (!APP_ID) {
    return Promise.reject(new Error("OneSignal App ID is not configured."));
  }

  if (!oneSignalPromise) {
    oneSignalPromise = new Promise((resolve, reject) => {
      const deferred = window.OneSignalDeferred = window.OneSignalDeferred || [];

      deferred.push(async OneSignal => {
        try {
          await OneSignal.init({
            appId: APP_ID,
            serviceWorkerPath: SERVICE_WORKER_PATH,
            serviceWorkerParam: { scope: `${BASE_PATH}push/onesignal/` },
            autoResubscribe: true,
            welcomeNotification: { disable: true },
          });
          resolve(OneSignal);
        } catch (error) {
          reject(error);
        }
      });

      if (!document.querySelector("script[data-onesignal-sdk]")) {
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        script.dataset.onesignalSdk = "true";
        script.onerror = () => {
          script.remove();
          reject(new Error("Nie udało się załadować OneSignal SDK."));
        };
        document.head.appendChild(script);
      }
    }).catch(error => {
      oneSignalPromise = undefined;
      throw error;
    });
  }

  return oneSignalPromise;
}