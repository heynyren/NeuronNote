package com.nhien.neuronnote;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Nhận text từ hệ thống:
 *  - ACTION_PROCESS_TEXT: menu "Save to Neuron Note" khi bôi đen chữ ở bất kỳ app nào.
 *  - ACTION_SEND (text/plain): chia sẻ đoạn chữ tới Neuron Note.
 * Ghi {text, ts} JSON vào SharedPreferences "CapacitorStorage" khoá "incomingText"
 * (đúng nơi Capacitor Preferences đọc), rồi báo cho WebView qua sự kiện cửa sổ.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleIncoming(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleIncoming(intent);
  }

  private void handleIncoming(Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    CharSequence text = null;

    if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
      text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
      if (text == null) text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT_READONLY);
    } else if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(intent.getType())) {
      text = intent.getStringExtra(Intent.EXTRA_TEXT);
    }

    if (text == null) return;
    String s = text.toString().trim();
    if (s.isEmpty()) return;

    // JSON tối giản, tự thoát ký tự đặc biệt
    String json = "{\"text\":\"" + escape(s) + "\",\"ts\":" + System.currentTimeMillis() + "}";
    SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
    prefs.edit().putString("incomingText", json).apply();

    // nếu WebView đã sẵn sàng, báo ngay; nếu chưa, app.js sẽ tự đọc lúc khởi động
    final String js = "window.dispatchEvent(new Event('nn-incoming-text'));";
    if (this.bridge != null && this.bridge.getWebView() != null) {
      this.bridge.getWebView().post(new Runnable() {
        @Override public void run() { bridge.getWebView().evaluateJavascript(js, null); }
      });
    }
  }

  private String escape(String s) {
    StringBuilder b = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"': b.append("\\\""); break;
        case '\\': b.append("\\\\"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        case '\t': b.append("\\t"); break;
        default:
          if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
          else b.append(c);
      }
    }
    return b.toString();
  }
}
