**🌐 [English](README.md) · Tiếng Việt**

# Neuron Note — App Android v1.0.1

Companion cho extension Neuron Note trên máy tính. Cùng định dạng dữ liệu và cùng
backend Apps Script/Google Drive, nên **đồng bộ thẳng với máy tính**.

## Làm được gì

- **Sổ tay**: xem lại mọi đoạn đã lưu, tìm kiếm, lọc **nhiều nhãn** cùng lúc (bất kỳ/tất cả), mở link gốc.
- **Học**: ôn theo lặp lại ngắt quãng (1/3/7/14/30/60/120 ngày), tự chấm Nhớ/Chưa nhớ, ẩn khỏi học / đánh dấu đã thuộc.
- **Thêm**: dán & lưu một đoạn bất kỳ, chọn nhãn.
- **Lưu từ mọi ứng dụng**: bôi đen chữ ở bất kỳ app nào (trình duyệt, PDF, tin nhắn…) → menu chọn **Neuron Note** → lưu thẳng vào sổ tay dưới nhãn mặc định. Cũng nhận được khi bạn dùng **Chia sẻ → Neuron Note**.
- **Đồng bộ 2 chiều** với máy tính: bản mới hơn thắng, xoá lan truyền qua "bia mộ".

> Lưu ý: note lưu từ điện thoại (bôi đen ở app khác) thường **không kèm URL**, nên không
> có nút "Mở đoạn"; nhưng vẫn có text, nhãn và vào lịch học bình thường. Note lưu từ máy
> tính (có link + highlight) khi mở trên điện thoại sẽ bấm được "Mở" để nhảy tới đúng đoạn.

## Build (Windows)

Cần: Node.js, Android Studio (kèm JDK). Chạy trong thư mục dự án:

```bat
npm install
npx cap add android
npx cap sync android
node patch-android.js
npx @capacitor/assets generate --android
cd android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew assembleDebug
```

APK nằm ở `android\app\build\outputs\apk\debug\app-debug.apk`. Chép sang điện thoại và cài
(bật "Cài từ nguồn không xác định").

**Mỗi lần sửa web (www/):** chạy lại `npx cap sync android` → `node patch-android.js` → `gradlew assembleDebug`.

`patch-android.js` tự làm 3 việc trên thư mục `android/` do Capacitor sinh ra: chép
`MainActivity.java` (nhận ACTION_PROCESS_TEXT + SEND), thêm intent-filter vào
`AndroidManifest`, đổi tên app thành "Neuron Note". Chạy lại nhiều lần vô hại.

## Kết nối đồng bộ

1. Cài xong, mở app → ⚙ **Cài đặt** → dán **đúng link Web App** Apps Script bạn đã dùng cho
   extension (và mã bí mật nếu có) → bật *Tự đồng bộ* → **Đồng bộ ngay**.
2. Vì dùng chung file `neuron-note-data.json` trên Drive của bạn, mọi đoạn ở máy tính sẽ
   hiện trên điện thoại và ngược lại.

## Ghi chú kỹ thuật

- `appId` = `com.nhien.neuronnote`. Giữ nguyên id này ở các bản cập nhật sau để cài đè,
  không mất dữ liệu.
- Lưu trữ: Capacitor **Preferences** dưới một khoá `nn` = `{ notes, settings }`. `notes`
  chính là dữ liệu đồng bộ (khớp 100% với extension). `settings` (nhãn, link, nhãn mặc
  định) là **cục bộ theo máy** — giống extension, chỉ `notes` đi qua đồng bộ; nhưng nhãn
  dùng trên các đoạn đã đồng bộ vẫn hiện ra để lọc.
- Đồng bộ dùng `CapacitorHttp` (native, tránh CORS) với `Content-Type: text/plain` để
  không kích hoạt preflight của Apps Script.
- Nhận text hệ thống: `MainActivity.java` ghi `{text,ts}` JSON vào SharedPreferences
  `CapacitorStorage` khoá `incomingText`, bắn sự kiện `nn-incoming-text`; `app.js`
  `checkIncoming()` đọc + xoá + lưu note (mốc tươi 60 giây), gọi lúc khởi động + resume +
  sự kiện đó.

## Cấu trúc

```
neuron-note-android/
├── capacitor.config.json     appId com.nhien.neuronnote, CapacitorHttp bật
├── package.json
├── patch-android.js          vá android/ sau mỗi cap sync
├── android-src/MainActivity.java
├── assets/                   icon.png + splash.png cho @capacitor/assets
├── test.js                   test jsdom (chạy: node test.js)
└── www/
    ├── index.html
    ├── app.css
    ├── shared.js             NN.* (logic thuần khớp extension) + lưu Preferences
    └── app.js                toàn bộ giao diện + đồng bộ + nhận PROCESS_TEXT
```
