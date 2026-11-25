package io.github.yhkwon2004.eumlog;

import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public final class MainActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse(getString(R.string.start_url));
    }
}
