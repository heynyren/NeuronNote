<div align="center">

**🌐 [English](README.md) · Tiếng Việt**

# 🧠 Neuron Note

**Lưu lại điều đáng nhớ trên web — ôn lại đúng lúc sắp quên.**

Bôi đen một đoạn bất kỳ → lưu theo nhãn, kèm link quay về đúng vị trí →
ôn lại theo **lặp lại ngắt quãng** (spaced repetition). Đồng bộ giữa máy tính và
điện thoại qua Google Drive.

![Version](https://img.shields.io/badge/extension-v1.6.1-6c5ce7)
![Android](https://img.shields.io/badge/android-v1.1.1-2ecc71)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Android-lightgrey)

</div>

---

## Neuron Note là gì?

Đọc trên web ta gặp rất nhiều thứ hay nhưng rồi quên sạch. Neuron Note biến việc
"bôi đen để nhớ" thành một quy trình học thật sự:

1. **Lưu nhanh** — bôi đen đoạn văn → chuột phải → chọn nhãn → xong. Đoạn được tô màu
   ngay trên trang, kèm một *text-fragment link* đưa bạn quay lại đúng chỗ.
2. **Ôn đúng lúc** — mọi đoạn tự vào lịch ôn. Nhớ thì giãn dần `1 → 3 → 7 → 14 → 30 → 60 → 120`
   ngày; chưa nhớ thì gặp lại sau 1 ngày.
3. **Mọi nơi** — cùng dữ liệu trên **Chrome/Edge** và **Android**, đồng bộ 2 chiều
   qua Google Drive (backend Apps Script của chính bạn — không có máy chủ bên thứ ba).

## Có gì trong repo này

| Thư mục | Nội dung |
|---|---|
| [`neuron-note/`](neuron-note/) | **Extension Chrome/Edge** (Manifest V3) — bản chính. Xem [README](neuron-note/README.md). |
| [`android-app/`](android-app/) | **App Android** (Capacitor) — companion, dùng chung backend. Xem [README](android-app/README.md). |

## Tính năng nổi bật

- 🏷️ **Nhãn kiểu Google Keep** — một đoạn mang nhiều nhãn, lọc AND/OR.
- 🔁 **Chế độ Học** — spaced repetition, phím tắt, ẩn khỏi học / đánh dấu đã thuộc.
- 📈 **Tiến độ & phần thưởng** — mục tiêu mỗi ngày, chuỗi ngày liên tiếp, lịch nhiệt
  17 tuần và 23 huy hiệu, cùng cơ chế với app Denken 3 Shuu. Tiến độ đồng bộ giữa máy
  tính và điện thoại cùng với các đoạn đã lưu.
- 🔗 **Neo lại chính xác** — dùng chuẩn *text fragment* của trình duyệt, người khác
  không cài extension mở link vẫn nhảy đúng chỗ.
- ∑ **Hiểu công thức toán** — nhận diện KaTeX/MathJax (ví dụ nội dung Gemini xuất ra).
- ☁️ **Đồng bộ Google Drive** — trộn theo "bản mới hơn thắng", xoá lan truyền qua bia mộ.
- 📧 **Email nhắc ôn mỗi sáng** — qua Apps Script.
- 📤 **Xuất/nhập** — Markdown, JSON, CSV.

## Bắt đầu nhanh

**Extension (Chrome/Edge):**
```
1. chrome://extensions → bật Developer mode
2. Load unpacked → chọn thư mục neuron-note/
```
Chi tiết + cách bật đồng bộ: [neuron-note/README.md](neuron-note/README.md).

**App Android:** cần Node.js + Android Studio, xem
[hướng dẫn build](android-app/README.md).

## Riêng tư & dữ liệu

Neuron Note **không có máy chủ riêng**. Toàn bộ dữ liệu nằm trong trình duyệt/điện thoại
của bạn (`chrome.storage.local` / Capacitor Preferences) và — nếu bạn bật đồng bộ — trong
file `neuron-note-data.json` trên **Google Drive của chính bạn**, qua một Apps Script do
bạn tự tạo. Không ai khác chạm được dữ liệu đó.

## Tác giả

Được tạo và phát triển bởi **Nyren Pham** — https://github.com/heynyren/NeuronNote

Đây là sản phẩm gốc của mình. Nếu thấy hữu ích, một ⭐ cho repo là mình vui rồi.

## Tên & logo (thương hiệu)

**Mã nguồn** mở theo AGPL-3.0, nhưng **tên "Neuron Note"** và **logo/icon** là
nhãn hiệu của tác giả, **không** nằm trong giấy phép mã nguồn. Bạn được dùng và
fork code thoải mái — nhưng hãy đặt cho bản của bạn **tên và thương hiệu riêng**,
đừng trình bày như thể đó là "Neuron Note" chính thức. Xem [NOTICE](NOTICE).

## Giấy phép

Phát hành theo **[GNU Affero General Public License v3.0](LICENSE)** (AGPL-3.0).

Nói ngắn gọn: ai cũng được dùng, học hỏi, chia sẻ và chỉnh sửa tự do — nhưng nếu
phân phối lại, **hoặc chạy bản đã sửa dưới dạng dịch vụ mạng**, thì **bắt buộc
phải mở mã nguồn của họ theo cùng giấy phép** và **ghi công tác giả gốc**. Điều này
giữ Neuron Note luôn mở cho mọi người và **ngăn bị biến thành phần mềm đóng**. Chi
tiết về tác giả và thương hiệu xem [NOTICE](NOTICE).
