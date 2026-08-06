**🌐 [English](README.md) · Tiếng Việt**

# Neuron Note v1.4.0

Bôi đen một đoạn bất kỳ trên web → chuột phải, chọn **nhãn** → lưu thẳng, kèm
**link quay về đúng vị trí**. Ôn lại theo **lặp lại ngắt quãng**, lọc nhiều nhãn,
và nhận **email nhắc ôn mỗi sáng**. Đồng bộ qua Google Drive (dùng chung backend
với app Android sau này).

## Lọc nhiều nhãn

Bấm nhiều nhãn ở cột trái để chọn cùng lúc. Thanh nhỏ hiện ra cho chọn:
**bất kỳ** (có ít nhất một trong các nhãn — OR) hoặc **tất cả** (phải có đủ mọi
nhãn đã chọn — AND). Bấm ✕ để bỏ lọc.

## Chế độ Học (lặp lại ngắt quãng)

Bấm **Học** ở góc trên thư viện (con số vàng là số đoạn đến hạn). Mỗi đoạn hiện lên,
bạn đọc rồi bấm **Xem ghi chú** để kiểm, sau đó tự chấm **Nhớ** / **Chưa nhớ**:
- **Nhớ** → lên bậc, giãn khoảng ôn theo 1 → 3 → 7 → 14 → 30 → 60 → 120 ngày.
- **Chưa nhớ** → quay về ôn lại sau 1 ngày.

Phím tắt khi học: `Space` lật, `1`/`←` = Chưa nhớ, `2`/`→`/`Enter` = Nhớ.

Mọi đoạn tự vào lịch học khi lưu. Bạn **kiểm soát hoàn toàn**:
- **Ẩn khỏi học** — tạm bỏ một đoạn khỏi lịch (nút ngay trên card, hoặc trong khi học).
- **Đã thuộc** — bỏ hẳn đoạn đã rõ khỏi việc ôn (đánh dấu trong lúc Sửa hoặc khi học).
- Cả hai đều bật lại được bất cứ lúc nào bằng nút **Đưa lại vào học** / **Học lại**.

Nếu đang lọc theo nhãn thì bấm Học sẽ ôn đúng phần đang lọc; không lọc thì ôn tất cả.

## Email nhắc ôn mỗi sáng (qua Apps Script)

Extension của Chrome không tự gửi email được, nhưng Apps Script của bạn thì có. Sau khi
đã dựng đồng bộ (mục dưới), mở lại dự án Apps Script:
1. Dán bản `Code.gs` mới (đã kèm phần email).
2. Chạy tay **một lần** hàm `installDailyTrigger` (chọn hàm trên thanh công cụ → Run),
   cấp quyền gửi mail khi được hỏi. Từ đó mỗi sáng ~7h bạn sẽ nhận email liệt kê số
   đoạn đến hạn kèm vài đoạn cụ thể. Đổi giờ: sửa `DIGEST_HOUR` rồi chạy lại hàm đó.
3. Muốn thử ngay: chạy hàm `testDigestNow`.

Điều kiện: extension phải **đồng bộ** để dữ liệu học có trên Drive cho Apps Script đọc.

**Lưu ý hay:** Neuron Note nhận diện được cả **công thức toán** do KaTeX/MathJax dựng
(ví dụ nội dung Gemini xuất ra). Nó bỏ qua bản MathML ẩn và mã TeX gốc, chỉ lấy đúng
công thức hiện trên màn hình, nên lưu và tô lại chính xác.

## Đổi nhãn kiểu Google Keep

Trong **Thư viện**, bấm **Sửa** ở một đoạn: phần *Nhãn* hiện các nhãn của bạn dưới
dạng **chip bấm-để-chọn**. Bấm để bật/tắt — **một đoạn mang được nhiều nhãn cùng lúc**,
không phải gõ tay nữa. Bấm **＋ nhãn** để tạo nhãn mới ngay tại chỗ (gõ tên, Enter);
nhãn mới tự thêm vào danh sách chung. Cùng cách đó áp dụng cho thẻ sửa ngay trên trang.

---

## Cách dùng kiểu Google Keep

1. **Tạo nhãn trước.** Mở **Thư viện** (bấm icon → Thư viện) → cột trái, mục
   *Nhãn của tôi* → bấm **＋** để tạo nhãn (đặt tên + chọn màu). Ví dụ: `tiếng-nhật`,
   `đọc-sau`, `ý-tưởng`.
2. **Lưu là vào ngay.** Bôi đen đoạn cần lưu → **chuột phải** → *Save to Neuron Note*
   → menu con hiện danh sách nhãn → bấm nhãn nào là **lưu thẳng vào nhãn đó**, không
   cửa sổ nào bật lên. Đoạn được tô màu của nhãn, và một dòng báo nhỏ *"Đã lưu · #nhãn"*
   hiện ~5 giây (có *Hoàn tác* và *Ghi chú* nếu cần).
3. **Ghi chú "vì sao đáng nhớ" để sau.** Vào Thư viện, bấm **Sửa** ở đoạn đó để thêm
   ghi chú, hoặc bấm thẳng vào đoạn đã tô trên trang.

Đặt một nhãn làm **mặc định** (bấm ★ cạnh nhãn trong Thư viện, hoặc chọn trong popup):
khi đó phím tắt `Alt`+`Shift`+`N` và nút *Lưu* trong popup sẽ lưu thẳng vào nhãn mặc định.

> Nhãn thực chất là *tag* của đoạn. Đoạn có thể mang nhiều tag; nhãn định sẵn chỉ là
> danh sách để gán nhanh. Xoá một nhãn khỏi danh sách **không** xoá các đoạn đang mang
> nhãn đó — chúng vẫn còn, chỉ là nhãn rời khỏi danh sách gán nhanh.

---

## 1. Cài extension

1. Giải nén thư mục `neuron-note/`.
2. Mở `chrome://extensions` (hoặc `edge://extensions`) → bật **Developer mode**.
3. **Load unpacked** → chọn thư mục `neuron-note/`.

> **Khi nâng cấp về sau:** giải nén đè lên **đúng thư mục cũ** rồi bấm nút ⟳ trong
> `chrome://extensions`. Nếu load thư mục mới, extension sẽ có ID mới và **mất toàn bộ
> ghi chú đang lưu**.

## 2. Dùng hằng ngày

| Việc | Cách làm |
|---|---|
| Tạo nhãn | Thư viện → *Nhãn của tôi* → **＋** (tên + màu) |
| Lưu vào một nhãn | Bôi đen → chuột phải → *Save to Neuron Note* → bấm nhãn |
| Lưu bằng phím tắt | Bôi đen → `Alt` + `Shift` + `N` (vào nhãn mặc định) |
| Đặt nhãn mặc định | Bấm ★ cạnh nhãn trong Thư viện, hoặc chọn trong popup |
| Ghi chú sau | Trong Thư viện bấm **Sửa**, hoặc bấm vào đoạn đã tô trên trang |
| Xem lại trên trang | Đoạn đã lưu được tô màu nhãn; bấm vào để mở/sửa |
| Quay lại đúng đoạn | Thư viện → **Mở đoạn**, hoặc **Chép link** rồi dán đi đâu cũng được |
| Thư viện | Bấm icon → **Thư viện** |

Link chép ra có dạng:

```
https://trang-goc.com/bai-viet#nn=nn_abc123:~:text=Các%20nhà-,trí%20nhớ%20là,-Điều%20đó
```

Phần `:~:text=` là chuẩn *text fragment* của trình duyệt — người khác không cài extension
mở link vẫn nhảy đúng chỗ. Phần `#nn=<id>` là để Neuron Note biết đoạn nào cần nháy lên.

### Neo lại đoạn văn hoạt động thế nào

Khi lưu, extension ghi lại đoạn text cùng ~60 ký tự đứng trước và đứng sau. Lúc mở lại
trang, nó dựng chỉ mục toàn bộ text của trang, chuẩn hoá khoảng trắng rồi tìm đoạn đó.
Nếu trang có nhiều chỗ trùng nhau, phần ngữ cảnh trước/sau được chấm điểm để chọn đúng
chỗ ban đầu. Đoạn văn vắt qua nhiều thẻ (`<em>`, `<a>`, `<span>`…) vẫn tô liền mạch.
Trang tải nội dung động thì extension thử lại tối đa 6 lần trong ~5 giây.

## 3. Bật đồng bộ (Google Drive qua Apps Script)

1. Vào [script.google.com](https://script.google.com) → **New project**.
2. Dán toàn bộ `appscript/Code.gs` vào. **Mặc định không cần mật khẩu** (`SECRET = ''`)
   — cứ để nguyên là đồng bộ chạy ngay, ô *Mã bí mật* bên extension để trống. Chỉ khi
   muốn khoá thì đặt `var SECRET = 'chuoi-cua-ban'` và điền đúng chuỗi đó vào extension.
3. **`Ctrl+S` để lưu trước**, rồi **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
4. Copy link kết thúc bằng `/exec`.
5. Trong extension: **Cài đặt** → dán link vào *Link Web App*, điền đúng *Mã bí mật*,
   bật *Tự đồng bộ* → **Lưu cài đặt** → bấm **Đồng bộ**.

**Hai lỗi hay gặp:**
- `Script function not found: doGet` → bạn đã Deploy trước khi Save. Lưu code rồi
  **Deploy → New deployment** (hoặc *Manage deployments* → sửa version) lại.
- Lỗi parse `<!DOCTYPE` → quyền truy cập chưa để **Anyone**.

Dữ liệu nằm trong file `neuron-note-data.json` trên Drive của bạn. Quy tắc trộn:
bản có `updatedAt` mới hơn thắng; xoá được truyền đi bằng "bia mộ" (`deleted: true`)
và tự dọn sau 90 ngày.

## 4. Định dạng dữ liệu (để app Android dùng lại)

```jsonc
{
  "id":        "nn_lz9k2_a7f3x",
  "text":      "đoạn đã bôi đen",
  "note":      "ghi chú của bạn",
  "tags":      ["đọc-sau", "ý-tưởng"],
  "color":     "amber",              // amber | mint | sky | rose | lilac
  "url":       "https://…",          // đã bỏ hash và utm_*
  "fragUrl":   "https://…#nn=…:~:text=…",
  "title":     "tiêu đề trang",
  "prefix":    "60 ký tự đứng trước",
  "suffix":    "60 ký tự đứng sau",
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000,
  "deleted":   false
}
```

Toàn bộ note nằm trong một object `{ id: note }`. App Android chỉ cần:
`POST` tới link `/exec` với `Content-Type: text/plain;charset=utf-8` và body
`{"action":"sync","key":"<SECRET>","notes":{…}}` → nhận lại `{"ok":true,"notes":{…}}`
đã trộn. Dùng `text/plain` để tránh preflight CORS của Apps Script.

## 5. Xuất dữ liệu

Trong thư viện: **Xuất** (Markdown theo nguồn), hoặc Cài đặt → **Sao lưu JSON** /
**Xuất CSV**. **Nhập** nhận lại file JSON và trộn theo đúng quy tắc mới-hơn-thắng.

---

## Cấu trúc file

```
neuron-note/
├── manifest.json
├── background.js      menu chuột phải, phím tắt, lưu note, đồng bộ, huy hiệu
├── content.js         bắt vùng bôi đen, neo & tô lại highlight, thẻ ghi chú nổi
├── content.css        kiểu highlight trên trang gốc
├── shared.js          chuẩn hoá URL, dựng text fragment, trộn dữ liệu, kho lưu
├── notes.html/css/js  thư viện: tìm, lọc theo nhãn/nguồn, sửa, xuất/nhập, cài đặt
├── popup.html/css/js  bảng nhỏ: note trên trang này + lưu nhanh + đồng bộ
├── icons/             icon16/32/48/128 + logo.svg
└── appscript/Code.gs  backend đồng bộ trên Google Apps Script
```

Chỉ dùng `chrome.storage.local` — không có máy chủ nào khác ngoài Apps Script của
chính bạn.
