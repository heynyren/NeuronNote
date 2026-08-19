/**
 * Ngôn ngữ giao diện: tiếng Anh (gốc), tiếng Việt, tiếng Nhật.
 *
 * Chữ gốc của app này là TIẾNG ANH, nên bảng tra lấy chính chuỗi tiếng Anh làm
 * khoá. Thiếu bản dịch thì rơi về tiếng Anh — người dùng thấy một dòng chưa
 * dịch chứ không thấy một cái khoá trần trụi.
 *
 * Cách áp khác với bên NeutronDict, vì hình dạng mã khác hẳn: ở đây giao diện
 * được dựng bằng chuỗi mẫu HTML rồi gán vào innerHTML, chứ không phải gọi hàm
 * dựng từng phần tử. Đi sửa vài trăm chỗ trong chuỗi mẫu là vừa lâu vừa dễ làm
 * hỏng, nên thay vào đó QUÉT lại cây DOM sau mỗi lượt vẽ và đổi những đoạn chữ
 * có trong bảng tra.
 *
 * Quét thì phải chừa nội dung của người dùng ra. Một ghi chú chỉ vỏn vẹn chữ
 * "Edit" mà bị dịch thành "Sửa" là chuyện không ai tha thứ được, nên mọi vùng
 * chứa chữ của người dùng đều nằm trong danh sách chừa.
 */
(function (goc) {
  "use strict";

  const DS = ["en", "vi", "ja"];
  const GOC = "en";
  const TEN = { en: "English", vi: "Tiếng Việt", ja: "日本語" };

  /** Vùng chứa chữ của NGƯỜI DÙNG — tuyệt đối không quét vào. */
  const CHUA = ".quote, .mynote, .st-quote, .st-note, .tagrow, .t, .lchip, .file-name," +
    " .lbl-picker, .label-editor, input, textarea, .ln, .sv, .vi, .find, .lb-name," +
    // Tên app là tên riêng: "Neuron Note" dịch thành "Neuron Ghi chú" thì buồn cười.
    " .wordmark, .srcline, .src, .meta .sep";

  let ma = GOC;

  function hopLe(x) { return DS.indexOf(x) >= 0 ? x : GOC; }
  function bang() { return goc.CHU_BANG || {}; }

  /**
   * Dịch một chuỗi. Không có bản dịch thì trả về nguyên bản.
   *
   * KHÔNG có lối tắt "đang ở ngôn ngữ gốc thì trả về luôn": mã của app này có
   * hai vùng chữ khác nhau — phần chính viết tiếng Anh, còn bảng lời thoại
   * YouTube bê từ NeutronDict sang nên viết tiếng Việt. Nghĩa là ngay ở chế độ
   * tiếng Anh vẫn có chuỗi cần dịch. Mỗi bảng chỉ chứa những dòng THẬT SỰ phải
   * đổi; dòng nào đã đúng thứ tiếng rồi thì không cần có mặt.
   */
  function T(en) {
    const b = bang()[ma];
    const k = String(en == null ? "" : en);
    return (b && b[k]) || k;
  }

  /** Dịch câu có chỗ trống: T2("{n} passages", { n: 12 }). */
  function T2(en, thay) {
    let r = T(en);
    for (const k in (thay || {})) r = r.split("{" + k + "}").join(thay[k]);
    return r;
  }

  /**
   * Quét một cây DOM: đổi mọi đoạn chữ và mọi placeholder/title có trong bảng.
   *
   * Chỉ đụng vào chuỗi CÓ TRONG BẢNG, nên chữ lạ thì để nguyên. Chạy lại nhiều
   * lần trên cùng một cây cũng không sao: bản đã dịch không còn nằm trong bảng
   * nên lượt sau không tìm thấy gì để đổi nữa.
   */
  function quet(root) {
    const r = root || (typeof document !== "undefined" ? document : null);
    if (!r || !r.querySelectorAll) return;
    const b = bang()[ma] || {};

    const di = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const cha = n.parentElement;
        if (!cha) return NodeFilter.FILTER_REJECT;
        if (cha.closest(CHUA)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const can = [];
    let n;
    while ((n = di.nextNode())) can.push(n);
    can.forEach(function (nut) {
      const chu = nut.nodeValue;
      const goc2 = chu.trim();
      if (!b[goc2]) return;
      nut.nodeValue = chu.slice(0, chu.indexOf(goc2)) + b[goc2]
        + chu.slice(chu.indexOf(goc2) + goc2.length);
    });

    ["placeholder", "title", "aria-label"].forEach(function (t) {
      r.querySelectorAll("[" + t + "]").forEach(function (el) {
        const v = (el.getAttribute(t) || "").trim();
        if (b[v]) el.setAttribute(t, b[v]);
      });
    });
  }

  function dat(x, root) {
    ma = hopLe(x);
    try { document.documentElement.lang = ma; } catch (e) {}
    quet(root);
    return ma;
  }

  goc.Chu = { DS: DS, GOC: GOC, TEN: TEN, hopLe: hopLe, dang: function () { return ma; },
              t: T, t2: T2, dat: dat, quet: quet };
  goc.T = T;
  goc.T2 = T2;
  if (typeof module !== "undefined" && module.exports) module.exports = goc.Chu;
})(typeof self !== "undefined" ? self : this);
