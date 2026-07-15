# Nắng Café — Web Order

Web đặt món đơn giản cho quán, gồm 3 trang, giao diện **1 cột** dễ dùng trên điện thoại lẫn máy tính:

1. **index.html** — Trang gọi món: hiển thị toàn bộ menu dạng danh sách 1 cột, có thanh tìm kiếm nhanh ở trên cùng. Bấm vào món = gọi thêm 1 (ly/phần); bấm lại là +1 tiếp. Bấm dấu `−` để giảm bớt. Khi xong, bấm nút **"Gửi bàn"** để chọn bàn — lúc này hệ thống **tự động gửi thông báo qua Telegram** kèm mã QR thanh toán.
2. **tables.html** — Trang quản lý bàn: xem tất cả bàn đang có khách, số lượng từng món, tổng tiền mỗi bàn. Có thể:
   - Tăng/giảm số lượng từng món (khi khách gọi thêm hoặc bớt món)
   - Tăng/giảm số khách của bàn
   - Thêm món mới trực tiếp từ danh sách sổ xuống (cũng tự động báo Telegram)
   - "Xong / Xoá món" khi bàn đã thanh toán (giữ bàn trống để đón khách mới)
   - "Đóng bàn" để xoá hẳn bàn khỏi danh sách
3. **settings.html** — Trang Cài đặt:
   - **Quản lý menu**: sửa tên món, giá, đơn vị ngay trên trang — tự lưu. Thêm món mới, thêm nhóm món mới, xoá món/nhóm, hoặc khôi phục menu gốc.
   - **Telegram**: bật/tắt thông báo tự động, nhập Bot Token + Chat ID, có nút "Gửi thử" để kiểm tra kết nối.
   - **VietQR**: chọn ngân hàng, nhập số tài khoản + tên chủ tài khoản để tự tạo mã QR đúng số tiền mỗi đơn.

Dữ liệu (menu, bàn, cài đặt) được lưu bằng `localStorage` của trình duyệt — **không cần server hay database**, phù hợp để host tĩnh trên GitHub Pages.

⚠️ Lưu ý: vì dùng localStorage, dữ liệu chỉ lưu trên **trình duyệt/thiết bị đang dùng**. Nếu quán dùng chung 1 máy tính bảng/máy tính để order thì mọi thứ hoạt động bình thường. Nếu cần nhiều nhân viên cùng thao tác trên nhiều thiết bị và đồng bộ real-time, sẽ cần nâng cấp lên có backend (mình có thể giúp sau nếu bạn cần).

## Cách bật báo đơn qua Telegram + QR thanh toán

Vào trang **Cài đặt** (settings.html):

1. **Tạo Bot Telegram**: mở Telegram, nhắn `@BotFather` → gõ `/newbot` → đặt tên bot → BotFather sẽ trả về một **Bot Token** dạng `123456789:AAExample...`. Copy token này.
2. **Lấy Chat ID**: thêm bot vào nhóm nhân viên (hoặc chat riêng với bot), gửi thử 1 tin nhắn bất kỳ trong đó. Sau đó mở trình duyệt, vào địa chỉ:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   Tìm số ở mục `"chat":{"id": ...}` — đó là **Chat ID** (thường là số âm nếu là nhóm, ví dụ `-1001234567890`).
3. Dán Bot Token + Chat ID vào trang Cài đặt, bật công tắc, bấm **"Gửi thử tin nhắn"** để kiểm tra.
4. Ở phần **VietQR**: chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản (nên viết hoa không dấu, ví dụ `NGUYEN VAN A`) — đây là tài khoản sẽ nhận tiền khi khách quét mã.
5. Bấm **"Lưu cài đặt"**.

Từ lúc này, mỗi khi có bàn gọi món (từ trang Gọi món hoặc thêm món trực tiếp ở trang Bàn), hệ thống sẽ tự gửi vào Telegram: danh sách món vừa gọi, tổng tiền hoá đơn hiện tại của bàn đó, và **ảnh mã QR VietQR đã điền sẵn đúng số tiền** để khách quét chuyển khoản.

⚠️ Bot Token cho phép gửi tin nhân danh bot của bạn — không chia sẻ token này cho người ngoài. Vì trang web chạy hoàn toàn phía trình duyệt (không có server riêng), token được lưu trong localStorage của máy đang dùng để order.

## Cách đưa lên GitHub Pages

1. Tạo một repository mới trên GitHub (ví dụ: `nang-cafe-order`)
2. Upload toàn bộ các file trong thư mục này lên repo đó:
   - `index.html`
   - `tables.html`
   - `style.css`
   - `store.js`
   - `menu-data.js`
3. Vào **Settings → Pages** của repo, chọn branch `main`, thư mục `/ (root)`, bấm Save
4. Đợi 1-2 phút, GitHub sẽ cho bạn 1 link dạng: `https://<tên-user>.github.io/nang-cafe-order/`

## Cách chỉnh sửa menu sau này

Mở file `menu-data.js`, mỗi món có dạng:

```js
{ name: "Trà Đào", price: 25 }
```

Muốn thêm món mới, thêm dòng tương tự vào đúng nhóm (category). Muốn đổi giá, chỉ cần sửa số ở `price`. Muốn thêm nhóm món mới, copy cả khối `{ category: ..., icon: ..., items: [...] }` và chỉnh lại nội dung.
