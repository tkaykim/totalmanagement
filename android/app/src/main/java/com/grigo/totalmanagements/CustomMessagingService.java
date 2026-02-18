package com.grigo.totalmanagements;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.RemoteMessage;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * FCM 수신 시 짧은/긴 메시지·이미지 알림 표시.
 * - notification payload: 플러그인 기본 처리
 * - data-only (title/body/image in data): BigTextStyle / BigPictureStyle 로 표시
 */
public class CustomMessagingService extends com.capacitorjs.plugins.pushnotifications.MessagingService {

    private static final String CHANNEL_ID = "default";
    private static final int NOTIFICATION_ID_BASE = 1000;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        RemoteMessage.Notification notif = remoteMessage.getNotification();
        Map<String, String> data = remoteMessage.getData();

        if (notif != null) {
            super.onMessageReceived(remoteMessage);
            return;
        }

        String title = data != null ? data.get("title") : null;
        String body = data != null ? data.get("body") : null;
        String imageUrl = data != null ? data.get("image") : null;
        if (title == null) title = "알림";
        if (body == null) body = "";

        ensureChannel();
        if (imageUrl != null && !imageUrl.isEmpty()) {
            showBigPictureNotification(title, body, imageUrl, data);
        } else {
            showBigTextNotification(title, body, data);
        }

        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("푸시 알림");
            channel.enableVibration(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void showBigTextNotification(String title, String body, Map<String, String> data) {
        Intent intent = new Intent(this, MainActivity.class);
        if (data != null && data.containsKey("action_url")) {
            intent.putExtra("action_url", data.get("action_url"));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(CHANNEL_ID, NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000), builder.build());
        }
    }

    private void showBigPictureNotification(String title, String body, String imageUrl, Map<String, String> data) {
        Handler mainHandler = new Handler(Looper.getMainLooper());
        new Thread(() -> {
            Bitmap bitmap = fetchBitmap(imageUrl);
            mainHandler.post(() -> {
                Intent intent = new Intent(this, MainActivity.class);
                if (data != null && data.containsKey("action_url")) {
                    intent.putExtra("action_url", data.get("action_url"));
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

                if (bitmap != null) {
                    builder.setStyle(new NotificationCompat.BigPictureStyle().bigPicture(bitmap).bigLargeIcon((Bitmap) null));
                } else {
                    builder.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
                }

                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify(CHANNEL_ID, NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000), builder.build());
                }
            });
        }).start();
    }

    private Bitmap fetchBitmap(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setDoInput(true);
            conn.connect();
            InputStream is = conn.getInputStream();
            Bitmap bitmap = BitmapFactory.decodeStream(is);
            is.close();
            return bitmap;
        } catch (IOException e) {
            return null;
        }
    }
}
