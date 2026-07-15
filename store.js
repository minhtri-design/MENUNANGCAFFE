// ===== Nắng Café — Kho dữ liệu dùng chung (localStorage) =====
// Cấu trúc dữ liệu:
// tables = {
//   "Bàn 1": { guests: 2, items: { "Trà Đào": {qty:2, price:25, unit:null}, ... } },
//   ...
// }
// Trang menu dùng "activeCart" tạm trước khi gán cho bàn.

const STORAGE_KEY = "nangcafe_tables_v1";
const CART_KEY = "nangcafe_active_cart_v1";
const MENU_KEY = "nangcafe_menu_custom_v1";
const SETTINGS_KEY = "nangcafe_settings_v1";
const ORDER_LOG_KEY = "nangcafe_order_log_v1";
const TABLE_LIST = ["Mang về","Bàn 1","Bàn 2","Bàn 3","Bàn 4","Bàn 5","Bàn 6","Bàn 7","Bàn 8"];

// Danh sách ngân hàng phổ biến hỗ trợ VietQR (mã BIN theo chuẩn Napas)
// Nếu ngân hàng của bạn không có trong danh sách, có thể nhập mã BIN thủ công ở trang Cài đặt.
const VIETQR_BANKS = [
  { bin:"970436", name:"Vietcombank" },
  { bin:"970415", name:"VietinBank" },
  { bin:"970418", name:"BIDV" },
  { bin:"970405", name:"Agribank" },
  { bin:"970407", name:"Techcombank" },
  { bin:"970422", name:"MB Bank" },
  { bin:"970416", name:"ACB" },
  { bin:"970432", name:"VPBank" },
  { bin:"970403", name:"Sacombank" },
  { bin:"970423", name:"TPBank" },
  { bin:"970437", name:"HDBank" },
  { bin:"970441", name:"VIB" },
  { bin:"970443", name:"SHB" },
  { bin:"970431", name:"Eximbank" },
  { bin:"970426", name:"MSB" },
  { bin:"970448", name:"OCB" },
  { bin:"970440", name:"SeABank" },
  { bin:"970425", name:"ABBANK" },
  { bin:"970409", name:"Bac A Bank" },
  { bin:"970412", name:"PVcomBank" },
  { bin:"970429", name:"SCB" },
  { bin:"970419", name:"NCB" },
  { bin:"970433", name:"VietBank" },
  { bin:"970439", name:"Public Bank Vietnam" }
];

const Store = {
  escapeHtml(str){
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  // ---------- MENU (có thể chỉnh sửa ở trang Cài đặt) ----------
  getMenu(){
    try{
      const raw = localStorage.getItem(MENU_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    const cloned = JSON.parse(JSON.stringify(MENU_DATA));
    localStorage.setItem(MENU_KEY, JSON.stringify(cloned));
    return cloned;
  },
  saveMenu(menu){
    localStorage.setItem(MENU_KEY, JSON.stringify(menu));
  },
  resetMenu(){
    localStorage.removeItem(MENU_KEY);
  },

  // ---------- CÀI ĐẶT (Telegram + Ngân hàng) ----------
  getSettings(){
    const defaults = {
      telegramEnabled:false, telegramToken:"", telegramChatId:"",
      bankBin:"", bankAccount:"", bankAccountName:""
    };
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? {...defaults, ...JSON.parse(raw)} : defaults;
    }catch(e){ return defaults; }
  },
  saveSettings(s){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  },

  // ---------- VietQR ----------
  buildQrUrl(amount, info){
    const s = this.getSettings();
    if(!s.bankBin || !s.bankAccount) return null;
    const infoEnc = encodeURIComponent(info || "Thanh toan");
    const nameEnc = encodeURIComponent(s.bankAccountName || "");
    // Giá trong hệ thống lưu theo đơn vị "nghìn đồng" (ví dụ 25 = 25.000đ)
    // nên khi tạo QR phải nhân 1000 để ra đúng số tiền thật (VND).
    const amountVnd = Math.round(amount * 1000);
    return `https://img.vietqr.io/image/${s.bankBin}-${s.bankAccount}-compact2.png?amount=${amountVnd}&addInfo=${infoEnc}&accountName=${nameEnc}`;
  },

  // ---------- Telegram ----------
  // newItems: object { "Tên món": {qty, price, unit} } vừa được gọi thêm (dùng để đánh dấu 🆕)
  // table: object { guests, items } hiện tại của bàn đó (đầy đủ, sau khi đã cộng dồn)
  async sendTelegramOrder(tableName, newItems, table){
    const s = this.getSettings();
    if(!s.telegramEnabled || !s.telegramToken || !s.telegramChatId){
      return { ok:false, reason:"not_configured" };
    }
    const total = this.tableTotal(table);
    let text = `🧾 <b>${this.escapeHtml(tableName)}</b>\n`;

    const allEntries = Object.entries(table.items || {});
    if(allEntries.length){
      text += `\n<b>Danh sách món (đầy đủ):</b>\n`;
      allEntries.forEach(([name, it])=>{
        const isNew = newItems && newItems[name];
        const marker = isNew ? "🆕 " : "";
        text += `${marker}${this.escapeHtml(name)} x${it.qty} — ${it.qty*it.price}k\n`;
      });
    }
    text += `\n<b>Tổng hoá đơn hiện tại:</b> ${total.toLocaleString('vi-VN')}k`;

    const qrUrl = this.buildQrUrl(total, `${tableName}`.replace(/[^\w\s]/g,'').trim());
    const base = `https://api.telegram.org/bot${s.telegramToken}`;

    try{
      let resp;
      if(qrUrl){
        resp = await fetch(`${base}/sendPhoto`, {
          method:"POST",
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: s.telegramChatId, photo: qrUrl, caption: text, parse_mode:"HTML" })
        });
      } else {
        resp = await fetch(`${base}/sendMessage`, {
          method:"POST",
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: s.telegramChatId, text, parse_mode:"HTML" })
        });
      }
      const data = await resp.json();
      return { ok: !!data.ok, data };
    }catch(err){
      return { ok:false, reason:"network_error", error: err };
    }
  },
  getTables(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  },
  saveTables(tables){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  },
  getCart(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  },
  saveCart(cart){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },
  clearCart(){
    localStorage.removeItem(CART_KEY);
  },
  cartCount(cart){
    return Object.values(cart).reduce((sum,it)=>sum+it.qty,0);
  },
  cartTotal(cart){
    return Object.values(cart).reduce((sum,it)=>sum+it.qty*it.price,0);
  },
  formatPrice(n){
    return n.toLocaleString('vi-VN') + "k";
  },
  // Gộp giỏ hàng hiện tại vào một bàn đã có (cộng dồn số lượng)
  assignCartToTable(tableName, cart){
    const tables = this.getTables();
    if(!tables[tableName]){
      tables[tableName] = { guests: 1, items: {} };
    }
    for(const name in cart){
      const it = cart[name];
      if(tables[tableName].items[name]){
        tables[tableName].items[name].qty += it.qty;
      } else {
        tables[tableName].items[name] = { ...it };
      }
    }
    this.saveTables(tables);
    return tables[tableName];
  },
  tableTotal(table){
    return Object.values(table.items).reduce((s,it)=>s+it.qty*it.price,0);
  },

  // ---------- NHẬT KÝ ĐƠN HÀNG (để xuất Excel làm chứng từ) ----------
  // Mỗi khi 1 bàn được "Xong / Xoá món" hoặc "Đóng bàn" (còn món chưa thanh toán),
  // ghi lại 1 bản ghi đơn hàng đầy đủ vào localStorage, theo ngày.
  _pad2(n){ return String(n).padStart(2,'0'); },
  todayStr(){
    const now = new Date();
    return `${now.getFullYear()}-${this._pad2(now.getMonth()+1)}-${this._pad2(now.getDate())}`;
  },
  getOrderLog(){
    try{
      const raw = localStorage.getItem(ORDER_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  },
  getOrderLogByDate(dateStr){
    return this.getOrderLog().filter(r => r.date === dateStr);
  },
  logCompletedOrder(tableName, table){
    const items = Object.entries(table.items || {}).map(([name, it])=>({
      name, qty: it.qty, price: it.price, unit: it.unit || "",
      lineTotal: it.qty * it.price
    }));
    if(!items.length) return null; // không có món thì không ghi

    const now = new Date();
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      date: this.todayStr(),
      time: `${this._pad2(now.getHours())}:${this._pad2(now.getMinutes())}:${this._pad2(now.getSeconds())}`,
      table: tableName,
      guests: table.guests || 1,
      items,
      total: items.reduce((s,it)=>s+it.lineTotal, 0)
    };
    const log = this.getOrderLog();
    log.push(record);
    localStorage.setItem(ORDER_LOG_KEY, JSON.stringify(log));
    return record;
  }
};
