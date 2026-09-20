/**
 * HỎI GEMINI VỀ MỘT ĐOẠN ĐÃ LƯU — dựng sẵn câu hỏi kèm đủ ngữ cảnh.
 * ==========================================================================
 *
 * Vì sao có tệp này
 * -----------------
 * Một đoạn lưu trong sổ là một mẩu CẮT RỜI khỏi chỗ nó sinh ra. Đọc lại sau ba
 * tuần thì thường vấp đúng chỗ đã khiến mình lưu nó: câu chữ thì hiểu, nhưng
 * "tại sao lại thế", "cái này dùng ở đâu", "nó khác với thứ nghe na ná kia chỗ
 * nào" thì không. Tra Google ra một rừng trang không biết trang nào nói về đúng
 * ngữ cảnh của mình. Một mô hình ngôn ngữ trả lời được — NẾU được đưa cho cái
 * ngữ cảnh ấy.
 *
 * Mà ngữ cảnh ấy app đang giữ sẵn: đoạn văn bao quanh lúc bôi đen, công thức đã
 * chuẩn hoá, nhãn, ghi chú riêng, nguồn và mốc phút video. Gõ tay lại từng ấy
 * thứ thì không ai gõ.
 *
 * Khác NeutronDict ở đâu
 * ----------------------
 * NeutronDict hỏi về TỪ VỰNG một ngoại ngữ: sắc thái, mức trang trọng, phân
 * biệt từ gần nghĩa. Ở đây thì cái lưu vào là kiến thức đủ loại — điện, luật,
 * lịch sử, code, y khoa — nên hỏi "sắc thái của từ này" là lạc đề. Câu hỏi ở
 * đây xoay quanh: ý chính là gì, VÌ SAO nó đúng, dùng vào việc gì, ranh giới
 * chỗ nào, và người ta hay hiểu lầm ra sao.
 *
 * Câu hỏi cũng ĐỔI THEO LOẠI đoạn đã lưu — một đoạn đầy công thức thì đáng hỏi
 * từng ký hiệu nghĩa là gì, còn một đoạn định nghĩa khái niệm thì không.
 *
 * Đường đi: BỘ NHỚ TẠM, không phải thanh địa chỉ
 * ----------------------------------------------
 * gemini.google.com KHÔNG còn đọc `?q=` trên đường dẫn — trang vẫn mở bình
 * thường nhưng ô chat trống trơn, tức là hỏng IM LẶNG, người dùng chỉ thấy nút
 * như bị liệt. Nên chép câu hỏi vào bộ nhớ tạm rồi để người dùng bấm Ctrl+V:
 * thêm đúng một thao tác, đổi lại thì chắc chắn chạy. Được thêm: bộ nhớ tạm
 * không có trần độ dài như URL, nên ngữ cảnh đi ĐỦ, không phải cắt bớt.
 */
(function (root) {
  'use strict';

  const GEMINI_URL = 'https://gemini.google.com/app';

  function sach(x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim(); }

  /** "227" -> "3:47" */
  function giay(t) {
    const s = Math.max(0, Math.round(Number(t) || 0));
    const h = Math.floor(s / 3600), p = Math.floor((s % 3600) / 60), g = s % 60;
    const hai = n => (n < 10 ? '0' : '') + n;
    return (h ? h + ':' + hai(p) : p) + ':' + hai(g);
  }

  /**
   * Đoạn này thuộc loại nào — quyết định hỏi gì.
   *
   * Không đoán chủ đề (điện? luật? sinh học?) vì đoán sai thì câu hỏi lạc hẳn,
   * mà chỉ nhận ra HÌNH DẠNG của đoạn, thứ nhìn là biết chắc.
   */
  /*
   * Có công thức không.
   *
   * KHÔNG dựa vào NN.hasMath trên biến toàn cục: tệp này còn chạy ở nơi shared.js
   * chưa nạp (và trong Node thì không có `self`), mà thiếu nó thì hỏng IM LẶNG —
   * mọi công thức bị xếp nhầm thành đoạn văn thường rồi hỏi sai hẳn bộ câu hỏi.
   * Dùng NN khi có vì nó biết đủ kiểu delimiter, còn không thì tự nhận lấy.
   */
  function coCongThuc(t) {
    if (root.NN && typeof root.NN.hasMath === 'function' && root.NN.hasMath(t)) return true;
    return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(t);
  }

  function loaiCua(n) {
    const t = sach((n && (n.rich || n.text)) || '');
    if (!t) return 'doan';
    if (coCongThuc(t)) return 'congThuc';
    // một cụm ngắn không có dấu câu kết thì là một THUẬT NGỮ, không phải câu
    if (t.length <= 40 && !/[.!?;:]$/.test(t) && t.split(' ').length <= 6) return 'thuatNgu';
    return 'doan';
  }

  function tenLoai(l) {
    if (l === 'congThuc') return 'công thức';
    if (l === 'thuatNgu') return 'thuật ngữ';
    return 'đoạn';
  }

  /**
   * Dựng câu hỏi đầy đủ để chép vào bộ nhớ tạm.
   *
   * @param {object} note một ghi chú, đúng hình dạng đang lưu trong kho.
   * @param {object} [phu] thứ mô-đun này không tự biết: {nhan: [...], so: '...'}
   * @returns {string}
   */
  function loiHoi(note, phu) {
    const n = note || {};
    const p = phu || {};
    const loai = loaiCua(n);
    const ten = tenLoai(loai);
    const than = sach(n.rich || n.text) || '…';
    const ctx = sach(n.ctx);
    const coNguCanh = !!ctx && ctx !== than;

    const khoi = [];
    const them = (chu, tiep) => { if (chu) khoi.push({ chu: chu, tiep: !!tiep }); };

    /* --- lời mở --- */
    const dau = [];
    dau.push('Tôi lưu những đoạn đáng nhớ khi đọc và xem bằng app Neuron Note, rồi ôn lại theo lịch.');
    dau.push('Tôi muốn hiểu cho thật chắc ' + ten + ' dưới đây — hiểu ĐẾN NƠI, không chỉ đọc trôi.');
    dau.push('');
    dau.push('--- ' + ten.toUpperCase() + ' TÔI ĐÃ LƯU ---');
    dau.push('「' + than + '」');
    them(dau.join('\n'));

    /* --- ngữ cảnh: phần quan trọng nhất sau chính mấy câu hỏi --- */
    if (coNguCanh) {
      them('--- ĐOẠN VĂN NÓ NẰM TRONG ---\n' +
           '(app tự cắt lúc tôi bôi đen, có thể cụt đầu cụt đuôi)\n' + ctx);
    }

    /* --- những gì sổ tay đang giữ --- */
    const daLuu = [];
    if (sach(n.note)) daLuu.push('Ghi chú tôi tự viết: ' + sach(n.note));
    const nhan = (p.nhan || n.tags || []).map(sach).filter(Boolean);
    if (nhan.length) daLuu.push('Tôi xếp nó vào nhãn: ' + nhan.join(', '));
    if (n.files && n.files.length) {
      daLuu.push('Tôi có đính kèm ' + n.files.length + ' tệp/ảnh cho mục này ('
        + n.files.map(f => sach(f.name)).filter(Boolean).join(', ') + ') — bạn KHÔNG xem được chúng.');
    }

    /*
     * Nguồn đi CUỐI phần dữ kiện, không đi cùng ngữ cảnh.
     *
     * Link không giúp mô hình hiểu đoạn — nó không mở được trang ấy. Chỗ link có
     * ích là khi ngữ cảnh bị cụt: "phút 3:47 của một video dạy đấu nối tủ điện"
     * cũng đủ để đoán đây là nghĩa nghề nghiệp chứ không phải nghĩa sách vở. Và
     * chính tôi thì mở được — đọc xong câu trả lời thường muốn quay lại đúng chỗ.
     */
    const yt = n.yt || {};
    if (yt.v) {
      daLuu.push('Tôi lưu nó từ: YouTube · phút ' + giay(yt.t)
        + (yt.kenh ? ' · ' + sach(yt.kenh) : '')
        + ' — ' + (sach(n.title) || '(không có tên)')
        + ' (https://www.youtube.com/watch?v=' + yt.v + '&t=' + Math.floor(yt.t || 0) + 's)');
    } else if (n.url) {
      daLuu.push('Tôi lưu nó từ: ' + (sach(n.title) ? sach(n.title) + ' — ' : '') + sach(n.fragUrl || n.url));
    }

    if (daLuu.length) {
      them('--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---');
      daLuu.forEach(d => them(d, true));
    }

    /* --- câu hỏi --- */
    const hoi = ['--- HÃY TRẢ LỜI BẰNG TIẾNG VIỆT ---'];
    let i = 1;
    const tiep = s => hoi.push((i++) + '. ' + s);

    if (coNguCanh) {
      tiep('Trong ĐÚNG đoạn văn ở trên, ' + ten + ' này đang nói gì? Giải thích lại bằng lời dễ hiểu, '
         + 'và nói rõ nó đóng vai trò gì trong mạch lập luận của đoạn.');
    } else {
      // Không có ngữ cảnh thì nói thẳng ra, đừng để mô hình bịa ra một ngữ cảnh
      // rồi trả lời như thể đó là chỗ tôi đã gặp.
      hoi.push('(App CHƯA cắt được đoạn văn xung quanh — đừng đoán là tôi đã gặp nó ở đâu.)');
      tiep(ten.charAt(0).toUpperCase() + ten.slice(1) + ' này nói về cái gì? Giải thích bằng lời dễ hiểu, '
         + 'và cho biết nó thường xuất hiện trong bối cảnh nào.');
    }

    if (loai === 'congThuc') {
      tiep('Giải nghĩa TỪNG ký hiệu trong công thức: nó là đại lượng gì, đơn vị gì, '
         + 'và thay đổi nó thì kết quả đổi theo hướng nào.');
      tiep('Công thức này suy ra từ đâu, và nó chỉ đúng trong điều kiện nào? '
         + 'Nêu rõ giả thiết bị bỏ qua và lúc nào thì KHÔNG được dùng.');
      tiep('Một ví dụ tính bằng số, có thay số cụ thể và ra kết quả kèm đơn vị.');
    } else {
      tiep('VÌ SAO nó đúng (hoặc vì sao người ta làm vậy)? Cho tôi cái lý do gốc, '
         + 'đừng chỉ nhắc lại kết luận.');
      tiep('Nó dùng vào việc gì trong thực tế? Một ví dụ cụ thể, càng đời thường càng tốt.');
      tiep('Ranh giới của nó: trường hợp nào thì KHÔNG còn đúng, hoặc có ngoại lệ gì?');
    }

    tiep('Người mới học hay hiểu lầm chỗ nào ở đây? Nói thẳng cái bẫy.');
    tiep('Nó liên quan thế nào tới những khái niệm sát bên mà dễ bị lẫn? '
       + 'Mỗi cái một câu, chỉ ra chỗ khác nhau thật sự.');
    if (sach(n.note)) {
      tiep('Đọc ghi chú tôi tự viết ở trên: tôi hiểu có chỗ nào sai hoặc thiếu không? Nói thẳng.');
    }
    tiep('Nếu muốn hiểu sâu hơn nữa thì nên tìm hiểu tiếp cái gì? Gợi ý 2–3 hướng.');

    hoi.push('');
    hoi.push('Trả lời gọn, ưu tiên ý chắc hơn ý dài. Đừng chép lại những gì tôi vừa đưa.');
    hoi.push('Chỗ nào bạn không chắc thì nói là không chắc, đừng đoán bừa.');
    them(hoi.join('\n'));

    let r = '';
    khoi.forEach((k, idx) => { r += (idx ? (k.tiep ? '\n' : '\n\n') : '') + k.chu; });
    return r;
  }

  root.HoiGemini = { GEMINI_URL: GEMINI_URL, loiHoi: loiHoi, loaiCua: loaiCua, giay: giay };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.HoiGemini;
})(typeof self !== 'undefined' ? self : this);
