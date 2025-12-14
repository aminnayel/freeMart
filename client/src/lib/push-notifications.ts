
// Utility to convert VAPID key
export function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Check if user has an active push subscription
export async function checkPushSubscription(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch (error) {
        console.error("Failed to check push subscription:", error);
        return false;
    }
}

export async function subscribeToPushNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications not supported");
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            // Optional: Update server with existing subscription to be sure
            await sendSubscriptionToServer(existingSubscription);
            return true;
        }

        // Fetch VAPID Key
        const response = await fetch('/api/push/public-key');
        if (!response.ok) throw new Error("Failed to fetch public key");
        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        await sendSubscriptionToServer(subscription);
        console.log("Push notification subscribed successfully");
        return true;
    } catch (error) {
        console.error("Failed to subscribe users to push:", error);
        return false;
    }
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
    await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
    });
}
