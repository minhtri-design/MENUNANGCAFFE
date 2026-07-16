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

// UUID máy in Xprinter XP-58IIB (dò được bằng app nRF Connect) — dùng cho in qua Bluetooth Low Energy (BLE)
const BLE_PRINTER_SERVICE_UUID = "49535343-fe7d-4ae5-8fa9-9fafd205e455";
const BLE_PRINTER_WRITE_CHAR_UUID = "49535343-8841-43f4-a8d4-ecbe34729bb3"; // Write / Write Without Response

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

// ---------- ĐỒNG BỘ TRỰC TUYẾN (Firebase Realtime Database) ----------
// Toàn bộ dữ liệu dùng chung (bàn, cài đặt, menu, lịch sử hoá đơn) được đồng bộ
// TỨC THỜI giữa mọi thiết bị qua Firebase — không cần xuất/nhập file thủ công nữa.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjIxne2AM-3cglJmSgq3DHA4T6CyUKLiU",
  authDomain: "nang-cafe.firebaseapp.com",
  databaseURL: "https://nang-cafe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nang-cafe",
  storageBucket: "nang-cafe.firebasestorage.app",
  messagingSenderId: "584860026252",
  appId: "1:584860026252:web:f36dd7c41eb58435eb82a9"
};
const MIGRATED_FLAG_KEY = "nangcafe_migrated_to_firebase_v1";

let _fbDb = null;
let _tablesCache = {};
let _settingsCache = null;
let _menuCache = null;
let _orderLogCache = {};
let _onSyncChange = null;

// Nếu Firebase còn trống (lần đầu bật đồng bộ) mà máy này đang có dữ liệu cũ trong localStorage,
// tự động đẩy dữ liệu cũ đó lên Firebase 1 lần duy nhất để không bị mất.
function _migrateLocalDataIfNeeded(){
  if(localStorage.getItem(MIGRATED_FLAG_KEY)) return;
  localStorage.setItem(MIGRATED_FLAG_KEY, "1");
  try{
    const localTables = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const localLogArr = JSON.parse(localStorage.getItem(ORDER_LOG_KEY) || 'null');
    const localMenu = JSON.parse(localStorage.getItem(MENU_KEY) || 'null');
    const localSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');

    _fbDb.ref('tables').once('value').then(snap=>{
      if(!snap.exists() && localTables && Object.keys(localTables).length) _fbDb.ref('tables').set(localTables);
    });
    _fbDb.ref('orderLog').once('value').then(snap=>{
      if(!snap.exists() && localLogArr && localLogArr.length){
        const map = {};
        localLogArr.forEach(r => map[r.id] = r);
        _fbDb.ref('orderLog').set(map);
      }
    });
    _fbDb.ref('menu').once('value').then(snap=>{
      if(!snap.exists() && localMenu) _fbDb.ref('menu').set(localMenu);
    });
    _fbDb.ref('settings').once('value').then(snap=>{
      if(!snap.exists() && localSettings) _fbDb.ref('settings').set(localSettings);
    });
  }catch(e){ console.error("Lỗi chuyển dữ liệu cũ lên Firebase:", e); }
}

const Store = {
  escapeHtml(str){
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  // Gọi 1 LẦN DUY NHẤT ở mỗi trang, ngay khi tải trang xong, TRƯỚC lần render đầu tiên.
  // callback sẽ được gọi lại mỗi khi có bất kỳ thay đổi nào — kể cả từ thiết bị/nhân viên khác —
  // để trang tự render lại, tạo cảm giác "đồng bộ trực tuyến" thật sự.
  initSync(callback){
    _onSyncChange = callback;
    let firedOnce = false;
    const safeFire = () => { firedOnce = true; if(_onSyncChange) _onSyncChange(); };

    // Lưới an toàn: nếu sau 2.5 giây Firebase vẫn chưa phản hồi (lỗi mạng, Rules chưa đúng,
    // config sai...), vẫn render trang bằng dữ liệu mặc định/đang có, KHÔNG để trang treo trắng.
    setTimeout(()=>{ if(!firedOnce) safeFire(); }, 2500);

    if(typeof firebase === 'undefined'){
      console.error("Không tìm thấy Firebase SDK — kiểm tra lại thẻ <script> trong file HTML (có thể do mạng chặn gstatic.com).");
      safeFire();
      return;
    }
    if(!_fbDb){
      firebase.initializeApp(FIREBASE_CONFIG);
      _fbDb = firebase.database();
      _migrateLocalDataIfNeeded();
    }
    const onErr = (label) => (err) => {
      console.error(`Firebase lỗi đọc "${label}":`, err && err.message ? err.message : err,
        "— Kiểm tra lại Realtime Database Rules trong Firebase Console (mục Rules) đã cho phép đọc/ghi chưa.");
      safeFire();
    };
    _fbDb.ref('tables').on('value', snap=>{
      _tablesCache = snap.val() || {};
      safeFire();
    }, onErr('tables'));
    _fbDb.ref('settings').on('value', snap=>{
      _settingsCache = snap.val() || null;
      safeFire();
    }, onErr('settings'));
    _fbDb.ref('menu').on('value', snap=>{
      _menuCache = snap.val() || null;
      safeFire();
    }, onErr('menu'));
    _fbDb.ref('orderLog').on('value', snap=>{
      _orderLogCache = snap.val() || {};
      safeFire();
    }, onErr('orderLog'));
  },

  // ---------- MENU (có thể chỉnh sửa ở trang Cài đặt) ----------
  getMenu(){
    if(_menuCache) return JSON.parse(JSON.stringify(_menuCache));
    return JSON.parse(JSON.stringify(MENU_DATA));
  },
  saveMenu(menu){
    _menuCache = menu;
    if(_fbDb) _fbDb.ref('menu').set(menu);
  },
  resetMenu(){
    _menuCache = null;
    if(_fbDb) _fbDb.ref('menu').remove();
  },

  // ---------- CÀI ĐẶT (Telegram + Ngân hàng) ----------
  getSettings(){
    const defaults = {
      telegramEnabled:false, telegramToken:"", telegramChatId:"",
      bankBin:"", bankAccount:"", bankAccountName:""
    };
    return _settingsCache ? {...defaults, ..._settingsCache} : defaults;
  },
  saveSettings(s){
    _settingsCache = s;
    if(_fbDb) _fbDb.ref('settings').set(s);
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
    return JSON.parse(JSON.stringify(_tablesCache || {}));
  },
  saveTables(tables){
    _tablesCache = tables;
    if(_fbDb) _fbDb.ref('tables').set(tables);
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

  // ---------- IN HOÁ ĐƠN (qua app RawBT trên Android, kết nối Bluetooth/USB) ----------
  // In bằng ẢNH (không phải text ESC/POS thô) để tiếng Việt có dấu luôn hiển thị đúng,
  // không phụ thuộc bảng mã (codepage) của từng dòng máy in.
  _wrapCanvasText(ctx, text, maxWidth){
    const words = String(text).split(' ');
    const lines = [];
    let current = '';
    words.forEach(w=>{
      const test = current ? current + ' ' + w : w;
      if(ctx.measureText(test).width > maxWidth && current){
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    });
    if(current) lines.push(current);
    return lines;
  },

  buildReceiptCanvas(tableName, table){
    const W = 384; // 58mm ở ~203dpi — đúng khổ giấy máy in nhiệt 58mm
    const PAD = 14;
    const contentW = W - PAD*2;
    const now = new Date();

    // canvas nháp chỉ để đo chữ (chưa vẽ thật)
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');

    const items = Object.entries(table.items || {});
    const lines = []; // { text, font, align, gapAfter }

    lines.push({ text:"NẮNG CAFÉ", font:"bold 30px Arial", align:"center", gap:6 });
    lines.push({ text:"Food and Drink", font:"bold 16px Arial", align:"center", gap:10 });
    lines.push({ text:"-".repeat(32), font:"bold 14px Arial", align:"center", gap:8 });
    lines.push({ text:tableName, font:"bold 24px Arial", align:"left", gap:4 });
    lines.push({ text:`${now.toLocaleDateString('vi-VN')}  ${now.toLocaleTimeString('vi-VN')}`, font:"bold 15px Arial", align:"left", gap:10 });
    lines.push({ text:"-".repeat(32), font:"bold 14px Arial", align:"center", gap:10 });

    if(items.length === 0){
      lines.push({ text:"(Chưa có món)", font:"bold 16px Arial", align:"center", gap:10 });
    }
    items.forEach(([name, it])=>{
      mctx.font = "bold 18px Arial";
      const nameLines = this._wrapCanvasText(mctx, name, contentW);
      nameLines.forEach((nl,i)=>{
        lines.push({ text:nl, font:"bold 18px Arial", align:"left", gap: i===nameLines.length-1?2:0 });
      });
      const unitTxt = it.unit ? ` / ${it.unit}` : '';
      lines.push({ text:`${it.qty} x ${it.price}k${unitTxt}  =  ${it.qty*it.price}k`, font:"bold 17px Arial", align:"right", gap:10 });
    });

    lines.push({ text:"-".repeat(32), font:"bold 14px Arial", align:"center", gap:10 });
    const total = this.tableTotal(table);
    lines.push({ text:`TỔNG CỘNG:  ${total.toLocaleString('vi-VN')}k`, font:"bold 26px Arial", align:"right", gap:16 });
    lines.push({ text:"Cảm ơn quý khách!", font:"bold 15px Arial", align:"center", gap:6 });
    lines.push({ text:"Hẹn gặp lại ☀️", font:"bold 15px Arial", align:"center", gap:20 });

    // Tính chiều cao dựa trên font-size từng dòng
    let y = 14;
    lines.forEach(l=>{
      const sizeMatch = l.font.match(/(\d+)px/);
      const fontSize = sizeMatch ? parseInt(sizeMatch[1],10) : 14;
      y += fontSize + 8 + (l.gap||0);
    });
    const H = y + 10;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#000";
    ctx.textBaseline = "top";

    let cy = 14;
    lines.forEach(l=>{
      ctx.font = l.font;
      const sizeMatch = l.font.match(/(\d+)px/);
      const fontSize = sizeMatch ? parseInt(sizeMatch[1],10) : 14;
      if(l.align === 'center'){ ctx.textAlign='center'; ctx.fillText(l.text, W/2, cy); }
      else if(l.align === 'right'){ ctx.textAlign='right'; ctx.fillText(l.text, W-PAD, cy); }
      else { ctx.textAlign='left'; ctx.fillText(l.text, PAD, cy); }
      cy += fontSize + 8 + (l.gap||0);
    });

    return canvas;
  },

  // Mở app RawBT (Android) để gửi ảnh hoá đơn tới máy in Bluetooth/USB đã ghép nối.
  // Cần cài app "RawBT inkless print service" trên CH Play và ghép nối máy in trước.
  printReceipt(tableName, table){
    const canvas = this.buildReceiptCanvas(tableName, table);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const rawbtUrl = `rawbt:data:image/png;base64,${base64}`;
    window.location.href = rawbtUrl;
  },

  // ---------- IN QUA BLUETOOTH LOW ENERGY (BLE) — dùng được trên iPhone (qua app Bluefy) ----------
  // Chuyển canvas hoá đơn (ảnh) thành ảnh đen trắng 1-bit (1 = có mực), theo đúng chuẩn
  // lệnh "GS v 0" của ESC/POS, rồi gửi thẳng qua Bluetooth tới máy in — không cần cài app trung gian.
  _canvasToRasterBytes(canvas){
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h).data;
    const bytesPerRow = Math.ceil(w / 8);
    const raster = new Uint8Array(bytesPerRow * h);
    for(let y = 0; y < h; y++){
      for(let x = 0; x < w; x++){
        const idx = (y * w + x) * 4;
        const lum = 0.299*img[idx] + 0.587*img[idx+1] + 0.114*img[idx+2];
        if(lum < 235){ // pixel tối => in ra (bit = 1) — ngưỡng nới rộng để chữ in đậm, rõ hơn
          const byteIndex = y * bytesPerRow + (x >> 3);
          raster[byteIndex] |= (1 << (7 - (x % 8)));
        }
      }
    }
    return { bytesPerRow, height: h, data: raster };
  },

  _buildEscPosFromCanvas(canvas){
    const { bytesPerRow, height, data } = this._canvasToRasterBytes(canvas);
    const header = new Uint8Array([
      0x1B, 0x40, // ESC @  — khởi động máy in
      0x1D, 0x76, 0x30, 0x00, // GS v 0 0 — lệnh in ảnh raster
      bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF,
      height & 0xFF, (height >> 8) & 0xFF
    ]);
    const feed = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]); // chừa giấy để xé
    const full = new Uint8Array(header.length + data.length + feed.length);
    full.set(header, 0);
    full.set(data, header.length);
    full.set(feed, header.length + data.length);
    return full;
  },

  // In hoá đơn của 1 bàn qua BLE. tableName + table giống định dạng buildReceiptCanvas.
  async printReceiptBLE(tableName, table){
    if(!navigator.bluetooth){
      throw new Error("Trình duyệt này không hỗ trợ Bluetooth (Web Bluetooth). Trên iPhone, hãy mở trang web này bằng app \"Bluefy – Web BLE Browser\" (tải miễn phí trên App Store) thay vì Safari.");
    }
    const canvas = this.buildReceiptCanvas(tableName, table);
    const bytes = this._buildEscPosFromCanvas(canvas);

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [BLE_PRINTER_SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_PRINTER_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(BLE_PRINTER_WRITE_CHAR_UUID);

    const CHUNK_SIZE = 180; // an toàn với MTU mặc định của hầu hết máy in BLE giá rẻ
    for(let i = 0; i < bytes.length; i += CHUNK_SIZE){
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if(characteristic.writeValueWithoutResponse){
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      await new Promise(r => setTimeout(r, 20)); // chờ nhẹ để máy in kịp xử lý từng gói
    }

    try{ device.gatt.disconnect(); }catch(e){}
    return { ok: true };
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
    return Object.values(_orderLogCache || {});
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
    _orderLogCache = { ..._orderLogCache, [record.id]: record };
    if(_fbDb) _fbDb.ref('orderLog/' + record.id).set(record);
    return record;
  },
  deleteOrderRecord(id){
    const log = { ..._orderLogCache };
    delete log[id];
    _orderLogCache = log;
    if(_fbDb) _fbDb.ref('orderLog/' + id).remove();
  },
  clearOrderLog(){
    _orderLogCache = {};
    if(_fbDb) _fbDb.ref('orderLog').remove();
  },
  // In lại hoá đơn từ 1 bản ghi trong lịch sử (record.table là TÊN bàn, không phải object bàn)
  printReceiptFromRecord(record){
    const tableObj = { guests: record.guests, items: {} };
    record.items.forEach(it=>{
      tableObj.items[it.name] = { qty: it.qty, price: it.price, unit: it.unit || null };
    });
    this.printReceipt(record.table, tableObj);
  },
  async printReceiptFromRecordBLE(record){
    const tableObj = { guests: record.guests, items: {} };
    record.items.forEach(it=>{
      tableObj.items[it.name] = { qty: it.qty, price: it.price, unit: it.unit || null };
    });
    return this.printReceiptBLE(record.table, tableObj);
  },

  // ---------- SAO LƯU / PHỤC HỒI DỮ LIỆU (phòng hờ, không còn dùng để đồng bộ nữa) ----------
  // Từ khi có Firebase, dữ liệu đã tự đồng bộ trực tuyến giữa mọi thiết bị.
  // 2 hàm dưới đây chỉ còn để tải file sao lưu về máy (đề phòng sự cố) hoặc phục hồi khi cần.
  exportAllDataJson(){
    const payload = {
      exportedAt: new Date().toISOString(),
      tables: this.getTables(),
      orderLog: this.getOrderLog(),
      menu: this.getMenu(),
      settings: this.getSettings()
    };
    return JSON.stringify(payload, null, 2);
  },
  // Trả về {ok, error?}. merge=true: chỉ ghi đè các bàn/hoá đơn có trong file nhập (giữ lại dữ liệu cũ không trùng).
  // merge=false: THAY THẾ HOÀN TOÀN dữ liệu hiện có bằng dữ liệu trong file.
  importAllDataJson(jsonStr, merge){
    let payload;
    try{
      payload = JSON.parse(jsonStr);
    }catch(e){
      return { ok:false, error:"File/dữ liệu không đúng định dạng JSON" };
    }
    try{
      if(merge){
        const currentTables = this.getTables();
        const incomingTables = payload.tables || {};
        for(const name in incomingTables){
          if(!currentTables[name]){
            currentTables[name] = incomingTables[name];
          } else {
            for(const itemName in incomingTables[name].items){
              const incIt = incomingTables[name].items[itemName];
              if(currentTables[name].items[itemName]){
                currentTables[name].items[itemName].qty += incIt.qty;
              } else {
                currentTables[name].items[itemName] = { ...incIt };
              }
            }
          }
        }
        this.saveTables(currentTables);

        const currentLogMap = { ..._orderLogCache };
        const incomingLog = payload.orderLog || [];
        incomingLog.forEach(r => { if(!currentLogMap[r.id]) currentLogMap[r.id] = r; });
        _orderLogCache = currentLogMap;
        if(_fbDb) _fbDb.ref('orderLog').set(currentLogMap);
      } else {
        if(payload.tables) this.saveTables(payload.tables);
        if(payload.orderLog){
          const map = {};
          payload.orderLog.forEach(r => map[r.id] = r);
          _orderLogCache = map;
          if(_fbDb) _fbDb.ref('orderLog').set(map);
        }
      }
      if(payload.menu) this.saveMenu(payload.menu);
      if(payload.settings) this.saveSettings(payload.settings);
      return { ok:true };
    }catch(e){
      return { ok:false, error: String(e) };
    }
  }
};
