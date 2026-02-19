package com.grigo.totalmanagements;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String CHANNEL_ID = "default_high";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    /**
     * 앱 시작 시 알림 채널을 삭제 후 HIGH 중요도로 재생성.
     * 한 번 낮은 중요도로 생성된 채널은 코드만으로는 바꿀 수 없어,
     * 삭제 후 다시 만들면 제목/본문이 보이는 heads-up 알림이 표시됨.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;

            nm.deleteNotificationChannel("default");
            nm.deleteNotificationChannel(CHANNEL_ID);

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("푸시 알림");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(false);

            nm.createNotificationChannel(channel);
        }
    }
}
