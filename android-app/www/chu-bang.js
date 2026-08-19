/**
 * Bảng dịch giao diện Neuron Note. Xem chu.js.
 *
 * Mã của app có HAI vùng chữ: phần chính viết tiếng Anh, còn bảng lời thoại
 * YouTube bê từ NeutronDict sang nên viết tiếng Việt. Nên mỗi bảng chỉ chứa
 * những dòng THẬT SỰ phải đổi — kể cả bảng "en", vì ở chế độ tiếng Anh vẫn còn
 * mấy trăm chữ tiếng Việt của bảng lời thoại cần dịch.
 *
 * Thiếu một dòng thì chỗ đó giữ nguyên bản, không vỡ gì. Thà bỏ trống còn hơn
 * điền một bản dịch đoán bừa.
 */
(function (goc) {
  "use strict";

  const vi = {
    /* --- phần chính (chữ gốc tiếng Anh) --- */
    "{n} passages":
      "{n} đoạn",
    " (filtered)":
      " (đã lọc)",
    "{n} labels":
      "{n} nhãn",
    "Reviewed {n} passages. ":
      "Đã ôn {n} đoạn. ",
    "{lich} in the schedule, {han} due.":
      "{lich} đoạn trong lịch, {han} đến hạn.",
    "Synced · {n} passages":
      "Đã đồng bộ · {n} đoạn",
    "No labels yet":
      "Chưa có nhãn nào",
    "No labels yet.":
      "Chưa có nhãn nào.",
    "{n}-day streak · ":
      "chuỗi {n} ngày · ",
    "{da}/{dich} today":
      "hôm nay {da}/{dich}",
    "Select text in any app → choose":
      "Bôi đen chữ trong bất kỳ app nào → chọn",
    "tab to paste and save.":
      "để dán và lưu.",
    "All caught up":
      "Xong hết rồi",
    "Add a note":
      "Thêm ghi chú",
    "Note (optional, add later)":
      "Ghi chú (không bắt buộc, thêm sau cũng được)",
    "📋 Paste from clipboard":
      "📋 Dán từ bộ nhớ tạm",
    "Notebook":
      "Sổ tay",
    "Edit note":
      "Sửa ghi chú",
    "Mastered (remove from study)":
      "Đã thuộc (bỏ khỏi lịch ôn)",
    "Sync with desktop":
      "Đồng bộ với máy tính",
    "Paste the exact Apps Script Web App URL you used for the desktop extension.":
      "Dán đúng URL Web App Apps Script mà bạn đã dùng cho extension trên máy tính.",
    "Secret (leave empty if none)":
      "Mã bí mật (để trống nếu không có)",
    "Auto-sync after every change":
      "Tự đồng bộ sau mỗi thay đổi",
    "Sync now":
      "Đồng bộ ngay",
    "Default label for quick save":
      "Nhãn mặc định khi lưu nhanh",
    "Import JSON":
      "Nhập JSON",
    "Merges passages saved more than once (same page & text) into one card.":
      "Gộp những đoạn bị lưu nhiều lần (cùng trang, cùng chữ) làm một thẻ.",
    "Paste or type the passage to save…":
      "Dán hoặc gõ đoạn cần lưu…",
    "Why is it worth remembering?":
      "Vì sao đáng nhớ?",
    "Matches SECRET in Code.gs":
      "Trùng với SECRET trong Code.gs",
    "Study":
      "Học",
    "Add":
      "Thêm",
    "Done":
      "Xong",
    "Save":
      "Lưu",
    "Delete":
      "Xoá",
    "Settings":
      "Cài đặt",
    "Save to #{nhan}":
      "Lưu vào #{nhan}",
    "On this page · {n}":
      "Trên trang này · {n}",
    "Recently saved":
      "Vừa lưu gần đây",
    "No passages yet":
      "Chưa có đoạn nào",
    "No passages saved yet. Select text → right-click → Save to Neuron Note, pick a label.":
      "Chưa lưu đoạn nào. Bôi đen chữ → bấm chuột phải → Lưu vào Neuron Note, rồi chọn nhãn.",
    "Error":
      "Lỗi",
    "Could not connect":
      "Không kết nối được",
    "{n} passages · just synced":
      "{n} đoạn · vừa đồng bộ xong",
    "Review today ·":
      "Ôn hôm nay ·",
    "Open passage":
      "Mở đoạn gốc",
    "Snooze":
      "Hoãn lại",
    "Back to study":
      "Đưa lại vào lịch ôn",
    "Snoozed from study":
      "Đã hoãn khỏi lịch ôn",
    "Marked as mastered":
      "Đã đánh dấu là thuộc",
    "Show note":
      "Hiện ghi chú",
    "Edit note & labels":
      "Sửa ghi chú & nhãn",
    "Mastered":
      "Đã thuộc",
    "just now":
      "vừa xong",
    "{n} min ago":
      "{n} phút trước",
    "{n} h ago":
      "{n} giờ trước",
    "{n} days ago":
      "{n} ngày trước",
    "Attachments":
      "Đính kèm",
    "＋ file":
      "＋ tệp",
    "or paste an image":
      "hoặc dán một ảnh",
    "Retry":
      "Thử lại",
    "level":
      "cấp",
    "Progress · {n}d":
      "Tiến độ · {n} ngày",
    "{da} of {dich} reviews today":
      "Hôm nay {da}/{dich} lượt ôn",
    "Sync is off":
      "Đồng bộ đang tắt",
    "Synced {khi}":
      "Đã đồng bộ {khi}",
    "Ready to sync":
      "Sẵn sàng đồng bộ",
    "Syncing…":
      "Đang đồng bộ…",
    "{n} passages":
      "{n} đoạn",
    "Search results":
      "Kết quả tìm",
    "Saved":
      "Đã lưu",
    "Nothing to save":
      "Không có gì để lưu",
    "Neuron Note":
      "Neuron Note",
    "My labels":
      "Nhãn của tôi",
    "any":
      "bất kỳ",
    "all":
      "tất cả",
    "Sources":
      "Nguồn",
    "Sync is off":
      "Đồng bộ đang tắt",
    "Progress":
      "Tiến độ",
    "Sync":
      "Đồng bộ",
    "Settings":
      "Cài đặt",
    "All":
      "Tất cả",
    "＋ New note":
      "＋ Ghi chú mới",
    "Study":
      "Học",
    "Newest":
      "Mới nhất",
    "Oldest":
      "Cũ nhất",
    "By source":
      "Theo nguồn",
    "Export":
      "Xuất",
    "Import":
      "Nhập",
    "Passage":
      "Đoạn văn",
    "Your note":
      "Ghi chú của bạn",
    "Labels":
      "Nhãn",
    "Add to study schedule":
      "Đưa vào lịch ôn",
    "Save":
      "Lưu",
    "Cancel":
      "Huỷ",
    "No passages here yet":
      "Chưa có đoạn nào ở đây",
    "Select any passage on the web, right-click and choose":
      "Bôi đen một đoạn bất kỳ trên web, bấm chuột phải rồi chọn",
    "Save to Neuron Note":
      "Lưu vào Neuron Note",
    "— or press":
      "— hoặc bấm",
    "Paste the Web App URL of the Apps Script you deployed yourself. The same URL works for the Android app.":
      "Dán URL Web App của Apps Script bạn tự triển khai. Cùng URL đó dùng được cho app Android.",
    "Web App URL":
      "URL Web App",
    "Secret":
      "Mã bí mật",
    "(optional — leave empty if Code.gs has SECRET = '')":
      "(không bắt buộc — để trống nếu Code.gs đặt SECRET = '')",
    "Auto-sync after every change and every 15 minutes":
      "Tự đồng bộ sau mỗi thay đổi và mỗi 15 phút",
    "Create labels here first. Then select text, right-click → Save to Neuron Note, pick a label and it saves instantly, with no popup.":
      "Tạo nhãn ở đây trước. Sau đó bôi đen chữ, bấm chuột phải → Lưu vào Neuron Note, chọn nhãn là lưu ngay, không cần popup.",
    "Add":
      "Thêm",
    "On web pages":
      "Trên trang web",
    "Re-highlight saved passages when reopening a page":
      "Tô sáng lại các đoạn đã lưu khi mở lại trang",
    "Default color when saving without a label":
      "Màu mặc định khi lưu mà không chọn nhãn",
    "Amber":
      "Hổ phách",
    "Mint":
      "Bạc hà",
    "Sky":
      "Da trời",
    "Rose":
      "Hồng",
    "Lilac":
      "Tím nhạt",
    "Data":
      "Dữ liệu",
    "JSON backup":
      "Sao lưu JSON",
    "Export Markdown":
      "Xuất Markdown",
    "Export CSV":
      "Xuất CSV",
    "Maintenance":
      "Bảo trì",
    "Find & merge duplicates":
      "Tìm & gộp bản trùng",
    "Merges passages saved more than once (same page & text) into one, keeping labels, notes, and the best study progress.":
      "Gộp những đoạn bị lưu nhiều lần (cùng trang, cùng chữ) làm một, giữ lại nhãn, ghi chú và tiến độ ôn tốt nhất.",
    "About the author":
      "Về tác giả",
    "Save settings":
      "Lưu cài đặt",
    "Study · spaced repetition":
      "Học · lặp lại ngắt quãng",
    "All caught up for today":
      "Hôm nay xong hết rồi",
    "Done":
      "Xong",
    "Search saved passages…":
      "Tìm trong các đoạn đã lưu…",
    "Add label":
      "Thêm nhãn",
    "Clear filter":
      "Bỏ lọc",
    "Sort":
      "Sắp xếp",
    "Type or paste the passage…":
      "Gõ hoặc dán đoạn văn…",
    "Your note…":
      "Ghi chú của bạn…",
    "Close":
      "Đóng",
    "Leave empty if no password is set":
      "Để trống nếu không đặt mật khẩu",
    "New label name, e.g. japanese":
      "Tên nhãn mới, ví dụ: tiếng nhật",
    "Library":
      "Thư viện",
    "Save selected passage":
      "Lưu đoạn đang bôi đen",
    "due":
      "đến hạn",
    "On this page":
      "Trên trang này",
    "No passages saved from this page yet.":
      "Chưa lưu đoạn nào từ trang này.",
    "Open library":
      "Mở thư viện",
    "Default label":
      "Nhãn mặc định",
    "Remove":
      "Gỡ",
    "Remove attachment":
      "Gỡ tệp đính kèm",
    "＋ label":
      "＋ nhãn",
    "New label name":
      "Tên nhãn mới",
    "The passage itself…":
      "Chính đoạn văn đó…",
    "Not yet":
      "Chưa thuộc",
    "Got it":
      "Đã thuộc",
    "Label name":
      "Tên nhãn",
    "Set as default label":
      "Đặt làm nhãn mặc định",
    "Delete label":
      "Xoá nhãn",
    "Today's goal is done":
      "Hôm nay đã đạt mục tiêu",
    "Note":
      "Ghi chú",
    "Copy link":
      "Chép link",
    "Delete":
      "Xoá",
    "Why is this passage worth remembering?":
      "Vì sao đoạn này đáng nhớ?",
    "Edit":
      "Sửa",
    "No label":
      "Không nhãn",
    "Interface language":
      "Ngôn ngữ giao diện",
  };

  const ja = {
    /* --- phần chính (chữ gốc tiếng Anh) --- */
    "{n} passages":
      "{n} 件",
    " (filtered)":
      "（絞り込み中）",
    "{n} labels":
      "ラベル {n} 件",
    "Reviewed {n} passages. ":
      "{n} 件を復習しました。",
    "{lich} in the schedule, {han} due.":
      "スケジュールに {lich} 件、うち {han} 件が復習時期です。",
    "Synced · {n} passages":
      "同期しました · {n} 件",
    "No labels yet":
      "ラベルはまだありません",
    "No labels yet.":
      "ラベルはまだありません。",
    "{n}-day streak · ":
      "{n} 日連続 · ",
    "{da}/{dich} today":
      "今日 {da}/{dich}",
    "Select text in any app → choose":
      "どのアプリでも文字を選択 → 選ぶ",
    "tab to paste and save.":
      "タブで貼り付けて保存。",
    "All caught up":
      "すべて終わりました",
    "Add a note":
      "メモを追加",
    "Note (optional, add later)":
      "メモ（任意、あとで追加可）",
    "📋 Paste from clipboard":
      "📋 クリップボードから貼り付け",
    "Notebook":
      "ノート",
    "Edit note":
      "メモを編集",
    "Mastered (remove from study)":
      "覚えた（学習から外す）",
    "Sync with desktop":
      "パソコンと同期",
    "Paste the exact Apps Script Web App URL you used for the desktop extension.":
      "パソコンの拡張機能で使っているのと同じ Apps Script ウェブアプリ URL を貼り付けてください。",
    "Secret (leave empty if none)":
      "シークレット（なければ空のままで）",
    "Auto-sync after every change":
      "変更のたびに自動同期",
    "Sync now":
      "今すぐ同期",
    "Default label for quick save":
      "クイック保存の既定ラベル",
    "Import JSON":
      "JSON を読み込み",
    "Merges passages saved more than once (same page & text) into one card.":
      "同じページの同じ文章を二重に保存したものを 1 枚のカードにまとめます。",
    "Paste or type the passage to save…":
      "保存したい文章を貼り付けるか入力…",
    "Why is it worth remembering?":
      "なぜ覚える価値があるのか？",
    "Matches SECRET in Code.gs":
      "Code.gs の SECRET と同じもの",
    "Study":
      "学習",
    "Add":
      "追加",
    "Done":
      "完了",
    "Save":
      "保存",
    "Delete":
      "削除",
    "Settings":
      "設定",
    "Save to #{nhan}":
      "#{nhan} に保存",
    "On this page · {n}":
      "このページ · {n}",
    "Recently saved":
      "最近保存したもの",
    "No passages yet":
      "まだ何もありません",
    "No passages saved yet. Select text → right-click → Save to Neuron Note, pick a label.":
      "まだ何も保存していません。文章を選択 → 右クリック →「Neuron Note に保存」でラベルを選んでください。",
    "Error":
      "エラー",
    "Could not connect":
      "接続できませんでした",
    "{n} passages · just synced":
      "{n} 件 · 同期しました",
    "Review today ·":
      "今日の復習 ·",
    "Open passage":
      "元の文章を開く",
    "Snooze":
      "後回し",
    "Back to study":
      "学習に戻す",
    "Snoozed from study":
      "学習から外しました",
    "Marked as mastered":
      "覚えたことにしました",
    "Show note":
      "メモを見る",
    "Edit note & labels":
      "メモとラベルを編集",
    "Mastered":
      "覚えた",
    "just now":
      "たった今",
    "{n} min ago":
      "{n} 分前",
    "{n} h ago":
      "{n} 時間前",
    "{n} days ago":
      "{n} 日前",
    "Attachments":
      "添付",
    "＋ file":
      "＋ ファイル",
    "or paste an image":
      "または画像を貼り付け",
    "Retry":
      "再試行",
    "level":
      "レベル",
    "Progress · {n}d":
      "学習状況 · {n} 日",
    "{da} of {dich} reviews today":
      "今日 {da}/{dich} 回の復習",
    "Sync is off":
      "同期はオフです",
    "Synced {khi}":
      "同期済み {khi}",
    "Ready to sync":
      "同期の準備ができました",
    "Syncing…":
      "同期中…",
    "{n} passages":
      "{n} 件",
    "Search results":
      "検索結果",
    "Saved":
      "保存しました",
    "Nothing to save":
      "保存するものがありません",
    "Neuron Note":
      "Neuron Note",
    "My labels":
      "自分のラベル",
    "any":
      "いずれか",
    "all":
      "すべて",
    "Sources":
      "出典",
    "Sync is off":
      "同期はオフです",
    "Progress":
      "学習状況",
    "Sync":
      "同期",
    "Settings":
      "設定",
    "All":
      "すべて",
    "＋ New note":
      "＋ 新しいメモ",
    "Study":
      "学習",
    "Newest":
      "新しい順",
    "Oldest":
      "古い順",
    "By source":
      "出典順",
    "Export":
      "書き出し",
    "Import":
      "読み込み",
    "Passage":
      "本文",
    "Your note":
      "自分のメモ",
    "Labels":
      "ラベル",
    "Add to study schedule":
      "学習スケジュールに入れる",
    "Save":
      "保存",
    "Cancel":
      "キャンセル",
    "No passages here yet":
      "ここにはまだ何もありません",
    "Select any passage on the web, right-click and choose":
      "ウェブ上で文章を選択し、右クリックして",
    "Save to Neuron Note":
      "Neuron Note に保存",
    "— or press":
      "——または",
    "Paste the Web App URL of the Apps Script you deployed yourself. The same URL works for the Android app.":
      "自分でデプロイした Apps Script のウェブアプリ URL を貼り付けてください。Android アプリでも同じ URL が使えます。",
    "Web App URL":
      "ウェブアプリの URL",
    "Secret":
      "シークレット",
    "(optional — leave empty if Code.gs has SECRET = '')":
      "（任意——Code.gs で SECRET = '' なら空のままで）",
    "Auto-sync after every change and every 15 minutes":
      "変更のたび、および 15 分ごとに自動同期",
    "Create labels here first. Then select text, right-click → Save to Neuron Note, pick a label and it saves instantly, with no popup.":
      "まずここでラベルを作ります。あとは文章を選択して右クリック →「Neuron Note に保存」でラベルを選べば、ポップアップなしですぐ保存されます。",
    "Add":
      "追加",
    "On web pages":
      "ウェブページ上で",
    "Re-highlight saved passages when reopening a page":
      "ページを開き直したとき、保存済みの箇所を再び強調表示する",
    "Default color when saving without a label":
      "ラベルなしで保存したときの既定の色",
    "Amber":
      "琥珀",
    "Mint":
      "ミント",
    "Sky":
      "空",
    "Rose":
      "ローズ",
    "Lilac":
      "ライラック",
    "Data":
      "データ",
    "JSON backup":
      "JSON バックアップ",
    "Export Markdown":
      "Markdown で書き出し",
    "Export CSV":
      "CSV で書き出し",
    "Maintenance":
      "メンテナンス",
    "Find & merge duplicates":
      "重複を探して統合",
    "Merges passages saved more than once (same page & text) into one, keeping labels, notes, and the best study progress.":
      "同じページの同じ文章を二重に保存したものを 1 つにまとめます。ラベル・メモ・いちばん進んだ学習状況は残ります。",
    "About the author":
      "作者について",
    "Save settings":
      "設定を保存",
    "Study · spaced repetition":
      "学習 · 間隔反復",
    "All caught up for today":
      "今日の分は終わりました",
    "Done":
      "完了",
    "Search saved passages…":
      "保存した文章を検索…",
    "Add label":
      "ラベルを追加",
    "Clear filter":
      "絞り込みを解除",
    "Sort":
      "並び替え",
    "Type or paste the passage…":
      "本文を入力または貼り付け…",
    "Your note…":
      "自分のメモ…",
    "Close":
      "閉じる",
    "Leave empty if no password is set":
      "パスワードを設定していなければ空のままで",
    "New label name, e.g. japanese":
      "新しいラベル名（例：日本語）",
    "Library":
      "ライブラリ",
    "Save selected passage":
      "選択した文章を保存",
    "due":
      "復習時期",
    "On this page":
      "このページから",
    "No passages saved from this page yet.":
      "このページからはまだ何も保存していません。",
    "Open library":
      "ライブラリを開く",
    "Default label":
      "既定のラベル",
    "Remove":
      "外す",
    "Remove attachment":
      "添付を外す",
    "＋ label":
      "＋ ラベル",
    "New label name":
      "新しいラベル名",
    "The passage itself…":
      "本文そのもの…",
    "Not yet":
      "まだ",
    "Got it":
      "覚えた",
    "Label name":
      "ラベル名",
    "Set as default label":
      "既定のラベルにする",
    "Delete label":
      "ラベルを削除",
    "Today's goal is done":
      "今日の目標は達成済み",
    "Note":
      "メモ",
    "Copy link":
      "リンクをコピー",
    "Delete":
      "削除",
    "Why is this passage worth remembering?":
      "この文章はなぜ覚える価値があるのか？",
    "Edit":
      "編集",
    "No label":
      "ラベルなし",
    "Interface language":
      "表示言語",
    /* --- bảng lời thoại YouTube (chữ gốc tiếng Việt) --- */
    " (tự động)":
      "（自動）",
    "Bám":
      "追従",
    "Bản phụ đề này rỗng.":
      "この字幕トラックは空です。",
    "Bấm để nghe lại từ {t}":
      "{t} から再生",
    "Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm.":
      "動画の下の「…」→「文字起こしを表示」を押してください。表示されればこのパネルが自動で読み取ります。",
    "Chọn bản phụ đề":
      "字幕トラックを選択",
    "Cỡ chữ {px}px — bấm để đổi":
      "文字サイズ {px}px——クリックで変更",
    "Cỡ chữ — bấm để đổi":
      "文字サイズ——クリックで変更",
    "Hiện kèm bản dịch tiếng Việt":
      "ベトナム語訳を併記",
    "Không lấy được phụ đề.":
      "字幕を取得できませんでした。",
    "Không tải được lời thoại.":
      "文字起こしを読み込めませんでした。",
    "Không tải được trang video (HTTP {ma})":
      "動画ページを読み込めませんでした（HTTP {ma}）",
    "Không đọc được dữ liệu trình phát":
      "プレーヤーのデータを読み取れません",
    "Lưu":
      "保存",
    "Lưu câu này vào sổ tay":
      "この文を単語帳に保存",
    "Mở ra":
      "展開",
    "Neuron Note · Lời thoại":
      "Neuron Note · 文字起こし",
    "Nạp lại bảng":
      "パネルを再読み込み",
    "Nạp lại bảng (lần {n}/2 — lần nữa sẽ tải lại cả trang)":
      "パネルを再読み込み（{n}/2——もう一度でページ全体を再読み込み）",
    "Song ngữ":
      "二言語",
    "Thu gọn":
      "折りたたむ",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})":
      "YouTube の文字起こしパネルはありますが、1 行も読み取れませんでした——構造が変わったようです。「再試行」を押し、それでも駄目なら報告してください。（フレーム：{kh} · 既知のタグ：{the}）",
    "Thử lại":
      "再試行",
    "Tìm trong lời thoại":
      "文字起こしを検索",
    "Tìm…":
      "検索…",
    "Tự cuộn theo dòng đang nói":
      "話している行に合わせて自動スクロール",
    "Video này không có phụ đề nào.":
      "この動画に字幕はありません。",
    "Video này không có phụ đề — không có gì để đọc.":
      "この動画に字幕はありません——読むものがありません。",
    "Về dòng đang nói":
      "話している行に戻る",
    "YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. ":
      "YouTube が字幕の取得を許さず、文字起こしパネルも開いていません。",
    "YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó":
      "YouTube が字幕の取得を遮断しているため、先方のパネルから読み取っています——トラックの変更はそちらで行ってください",
    "Đang dịch…":
      "翻訳中…",
    "Đang tìm phụ đề…":
      "字幕を探しています…",
    "Đang tải lời thoại…":
      "文字起こしを読み込み中…",
    "Đã lưu":
      "保存しました",
    "Đóng bảng":
      "パネルを閉じる",
  };

  const en = {
    /* --- bảng lời thoại YouTube (chữ gốc tiếng Việt) --- */
    " (tự động)":
      " (auto)",
    "Bám":
      "Follow",
    "Bản phụ đề này rỗng.":
      "This caption track is empty.",
    "Bấm để nghe lại từ {t}":
      "Click to replay from {t}",
    "Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm.":
      "Click “…” under the video → “Show transcript” — once it appears this panel picks it up on its own.",
    "Chọn bản phụ đề":
      "Choose a caption track",
    "Cỡ chữ {px}px — bấm để đổi":
      "Text size {px}px — click to change",
    "Cỡ chữ — bấm để đổi":
      "Text size — click to change",
    "Hiện kèm bản dịch tiếng Việt":
      "Show the Vietnamese translation alongside",
    "Không lấy được phụ đề.":
      "Could not fetch the captions.",
    "Không tải được lời thoại.":
      "Could not load the transcript.",
    "Không tải được trang video (HTTP {ma})":
      "Could not load the video page (HTTP {ma})",
    "Không đọc được dữ liệu trình phát":
      "Could not read the player data",
    "Lưu":
      "Save",
    "Lưu câu này vào sổ tay":
      "Save this sentence to the notebook",
    "Mở ra":
      "Expand",
    "Neuron Note · Lời thoại":
      "Neuron Note · Transcript",
    "Nạp lại bảng":
      "Reload the panel",
    "Nạp lại bảng (lần {n}/2 — lần nữa sẽ tải lại cả trang)":
      "Reload the panel ({n}/2 — once more reloads the whole page)",
    "Song ngữ":
      "Bilingual",
    "Thu gọn":
      "Collapse",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})":
      "YouTube's transcript panel is there but no line could be read — they seem to have changed how it is built. Press Retry; if that fails, report it so it can be fixed. (frames: {kh} · known tags: {the})",
    "Thử lại":
      "Retry",
    "Tìm trong lời thoại":
      "Search the transcript",
    "Tìm…":
      "Search…",
    "Tự cuộn theo dòng đang nói":
      "Scroll along with the line being spoken",
    "Video này không có phụ đề nào.":
      "This video has no captions.",
    "Video này không có phụ đề — không có gì để đọc.":
      "This video has no captions — there is nothing to read.",
    "Về dòng đang nói":
      "Back to the current line",
    "YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. ":
      "YouTube will not serve the captions, and their transcript panel is not open either. ",
    "YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó":
      "YouTube is blocking the caption download, so this reads from their panel instead — change the track there, not here",
    "Đang dịch…":
      "Translating…",
    "Đang tìm phụ đề…":
      "Looking for captions…",
    "Đang tải lời thoại…":
      "Loading the transcript…",
    "Đã lưu":
      "Saved",
    "Đóng bảng":
      "Close the panel",
  };

  goc.CHU_BANG = { vi: vi, ja: ja, en: en };
  if (typeof module !== "undefined" && module.exports) module.exports = goc.CHU_BANG;
})(typeof self !== "undefined" ? self : this);
