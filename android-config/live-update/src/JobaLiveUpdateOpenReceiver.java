package __PKG__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * A tap on the card itself.
 *
 * Two steps, in this order, because the app may not be running: record the task
 * id on the device FIRST, then bring the app forward. If the launch is refused or
 * the process is rebuilt on the way, the id is already stored and the app opens
 * the task as soon as it is ready — the same "park it, then open it" hand-off the
 * app already uses for a shared link (`src/lib/pendingTask.js`).
 */
public class JobaLiveUpdateOpenReceiver extends BroadcastReceiver {

    public static final String ACTION_OPEN = "__PKG__.LIVE_UPDATE_OPEN";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String taskId = intent.getStringExtra("task_id");
        if (taskId == null || taskId.isEmpty()) return;

        Context appContext = context.getApplicationContext();
        new JobaLiveUpdateStore(appContext).setPendingOpenTask(taskId);

        Intent launch = new Intent(appContext, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launch.putExtra("joba_open_task", taskId);
        try {
            appContext.startActivity(launch);
        } catch (Throwable ignored) {
            // The id is stored; opening the app by hand lands on the same task.
        }
    }
}