// Chạy: NODE_PATH="$(pwd)/node_modules" node build.js
// (NODE_PATH cần cho apply_theme.js ở dưới tìm được jszip đi kèm pptxgenjs)
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/home/nhanlaptop/.claude/skills/synced/df3ae1ac-c245-4ac2-b471-f22cf0221767_0d29d1e3-c793-4701-840f-1109273f0930/pptx/scripts/apply_theme.js");

const ROOT = __dirname + "/";
const OUT = process.argv[2] || ROOT + "Heap-Double-Free-Attack.pptx";

const THEME = {
  name: "Heap Amber Bento",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0C0E0B", lt1: "E9E4D2", dk2: "171A16", lt2: "A29D8E",
    accent1: "FFB000", accent2: "FF4D3D", accent3: "63C59A", accent4: "6FA8FF",
    accent5: "2E332B", accent6: "070807", hlink: "FFB000", folHlink: "BDB8A6",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Heap Double Free Attack";
pres.author = "Nhom 12";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

const C = pres.SchemeColor;
const BG = C.text1, TX = C.background1, TILE = C.text2, DIM = C.background2;
const AMB = C.accent1, RED = C.accent2, GRN = C.accent3, BRD = C.accent5, CODE = C.accent6;
const MONO = "Courier New";
const BGHEX = "0C0E0B";

// ---------- layouts ----------
pres.defineSlideMaster({ title: "TITLE", background: { color: BGHEX }, objects: [] });
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: BGHEX },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 3.35, w: 7.6, h: 1.3, fontSize: 44, bold: true, color: TX, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.75, w: 7.6, h: 1.3, fontSize: 18, color: DIM, valign: "top", margin: 0 }, text: "" } },
    { text: { text: "SEMINAR · LẬP TRÌNH AN TOÀN · CWE-415 · NHÓM 12", options: { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: DIM, fontFace: MONO, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.63, h: 0.3, fontSize: 10, color: "A29D8E", fontFace: MONO, align: "right" },
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: BGHEX },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.62, w: 12.33, h: 0.75, fontSize: 28, bold: true, color: TX, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "SEMINAR · LẬP TRÌNH AN TOÀN · CWE-415 · NHÓM 12", options: { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: DIM, fontFace: MONO, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.63, h: 0.3, fontSize: 10, color: "A29D8E", fontFace: MONO, align: "right" },
});

// ---------- helpers ----------
let curSec = "Mở đầu";
function sec(t) { curSec = t; pres.addSection({ title: t }); }

function S(title, kicker) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: curSec });
  s.addText(title, { placeholder: "title" });
  if (kicker) s.addText(kicker, { x: 0.5, y: 0.3, w: 12.33, h: 0.3, fontSize: 11, fontFace: MONO, color: AMB, bold: true, charSpacing: 1, margin: 0, isTextBox: true });
  return s;
}

// inline markup: `code` -> mono, **bold** -> bold
function rich(t, base, cc) {
  const out = [];
  String(t).split(/(`[^`]+`|\*\*[^*]+\*\*)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith("`")) out.push({ text: p.slice(1, -1), options: Object.assign({}, base, { fontFace: MONO, color: cc || AMB }) });
    else if (p.startsWith("**")) out.push({ text: p.slice(2, -2), options: Object.assign({}, base, { bold: true }) });
    else out.push({ text: p, options: Object.assign({}, base) });
  });
  if (!out.length) out.push({ text: " ", options: Object.assign({}, base) });
  return out;
}
function para(items, { bullet = true, color = TX, cc, space = 5 } = {}) {
  const out = [];
  items.forEach((t, i) => {
    const r = rich(t, { color }, cc);
    Object.assign(r[0].options, { bullet: bullet ? { indent: 14 } : false, paraSpaceAfter: space });
    r[r.length - 1].options.breakLine = i < items.length - 1;
    out.push(...r);
  });
  return out;
}

function box(s, x, y, w, h, fill = TILE, line = BRD, dash = false) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: 0.75, dashType: dash ? "dash" : undefined }, rectRadius: 0.08 });
}

// bento tile. o: label, head, body (string|array), fill, line, tc, lc, cc, size, hs, hh, bullet
function tile(s, x, y, w, h, o = {}) {
  const fill = o.fill || TILE;
  const dark = fill === AMB || fill === RED || fill === GRN;
  box(s, x, y, w, h, fill, o.line || (fill === TILE ? BRD : fill));
  const tc = o.tc || (dark ? BG : TX);
  const lc = o.lc || (dark ? BG : AMB);
  const cc = o.cc || (dark ? BG : AMB);
  const pad = 0.2;
  let yy = y + 0.18;
  if (o.label) {
    s.addText(o.label, { x: x + pad, y: yy, w: w - 2 * pad, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: lc, charSpacing: 1, margin: 0, isTextBox: true });
    yy += 0.32;
  }
  if (o.head) {
    const hh = o.hh || 0.45;
    s.addText(rich(o.head, { color: tc, bold: true }, cc), { x: x + pad, y: yy, w: w - 2 * pad, h: hh, fontSize: o.hs || 18, fontFace: o.hm ? MONO : "Arial", margin: 0, valign: "top", isTextBox: true });
    yy += hh + 0.05;
  }
  if (o.body) {
    const arr = Array.isArray(o.body) ? o.body : [o.body];
    const bullet = Array.isArray(o.body) && o.bullet !== false;
    s.addText(para(arr, { bullet, color: o.bc || tc, cc, space: o.space || 5 }), { x: x + pad, y: yy, w: w - 2 * pad, h: Math.max(0.3, y + h - yy - 0.12), fontSize: o.size || 14, valign: "top", margin: 0, isTextBox: true });
  }
}

// code tile: '!' prefix -> amber bold, '~' prefix -> red bold
function code(s, x, y, w, h, lines, o = {}) {
  box(s, x, y, w, h, CODE, BRD);
  let ty = y + 0.15;
  if (o.cap) {
    s.addText(o.cap, { x: x + 0.2, y: y + 0.12, w: w - 0.4, h: 0.25, fontSize: 10, fontFace: MONO, color: DIM, margin: 0, isTextBox: true });
    ty = y + 0.45;
  }
  const runs = lines.map((l, i) => {
    let color = TX, bold = false, t = l;
    if (l.startsWith("!")) { color = AMB; bold = true; t = l.slice(1); }
    else if (l.startsWith("~")) { color = RED; bold = true; t = l.slice(1); }
    else if (/^\s*(\/\*|\/\/|#\s)/.test(l)) color = DIM;
    return { text: t === "" ? " " : t, options: { color, bold, breakLine: i < lines.length - 1 } };
  });
  s.addText(runs, { x: x + 0.2, y: ty, w: w - 0.4, h: y + h - ty - 0.1, fontSize: o.size || 11, fontFace: MONO, valign: "top", margin: 0, isTextBox: true });
}

function table(s, rows, x, y, w, colW, o = {}) {
  const size = o.size || 12;
  const data = rows.map((r, ri) =>
    r.map((c, ci) => ({
      text: rich(c, { color: ri ? TX : BG, bold: ri === 0 || (o.boldFirst && ci === 0), fontSize: size }),
      options: { fill: { color: ri ? TILE : AMB }, valign: "middle" },
    }))
  );
  s.addTable(data, { x, y, w, colW, fontSize: size, border: { type: "solid", pt: 0.75, color: "2E332B" }, margin: [0.05, 0.1, 0.05, 0.1], autoPage: false });
}

function cell(s, x, y, w, h, text, o = {}) {
  const fill = o.fill || CODE;
  const dark = fill === AMB || fill === RED || fill === GRN;
  s.addText(rich(text, { color: o.color || (dark ? BG : TX), bold: o.bold !== false }, dark ? BG : AMB), {
    shape: o.round ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, rectRadius: o.round ? 0.06 : undefined,
    x, y, w, h, fill: { color: fill }, line: { color: o.line || (dark ? fill : AMB), width: 1, dashType: o.dash ? "dash" : undefined },
    fontSize: o.size || 13, fontFace: o.mono === false ? "Calibri" : MONO, align: o.align || "center", valign: "middle", margin: 0.06,
  });
}

function arrow(s, x1, y1, x2, y2, color = AMB) {
  s.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width: 1.75, endArrowType: "triangle" },
  });
}

function img(s, file, x, y, w, h, ratio) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: BRD, width: 0.75 }, rectRadius: 0.08 });
  const iw = w - 0.3, ih = h - 0.3;
  let dw = iw, dh = iw / ratio;
  if (dh > ih) { dh = ih; dw = ih * ratio; }
  s.addImage({ path: ROOT + file, x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh });
}

function divider(num, title, sub, items) {
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: curSec });
  s.addText(num, { x: 0.8, y: 0.7, w: 5, h: 2.5, fontSize: 140, bold: true, color: AMB, fontFace: "Arial", margin: 0, isTextBox: true });
  s.addText(title, { placeholder: "title" });
  s.addText(sub, { placeholder: "body" });
  box(s, 8.9, 1.0, 3.93, 5.6, TILE, BRD);
  s.addText("NỘI DUNG", { x: 9.15, y: 1.25, w: 3.4, h: 0.3, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText(items.map((t, i) => ({ text: t, options: { color: TX, breakLine: i < items.length - 1, paraSpaceAfter: 10 } })),
    { x: 9.15, y: 1.7, w: 3.45, h: 4.7, fontSize: 14, fontFace: MONO, valign: "top", margin: 0, isTextBox: true });
  return s;
}

// =====================================================================
// MỞ ĐẦU
// =====================================================================
sec("Mở đầu");
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: curSec });
  box(s, 0.5, 0.5, 7.9, 6.5, TILE, BRD);
  s.addText("SEMINAR // LẬP TRÌNH AN TOÀN // CWE-415", { x: 0.85, y: 0.9, w: 7.2, h: 0.35, fontSize: 13, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText([
    { text: "Heap", options: { color: TX, breakLine: true } },
    { text: "Double Free", options: { color: AMB, breakLine: true } },
    { text: "Attack", options: { color: TX } },
  ], { x: 0.85, y: 1.6, w: 7.3, h: 3.2, fontSize: 60, bold: true, fontFace: "Arial", valign: "top", margin: 0, isTextBox: true });
  s.addText("Lỗi giải phóng cùng một vùng nhớ nhiều lần làm sai lệch trạng thái quản lý heap. Trọng tâm: nguyên nhân, tác động, và cách bảo đảm mỗi vùng nhớ chỉ được giải phóng đúng một lần.",
    { x: 0.85, y: 4.95, w: 7.2, h: 1.2, fontSize: 16, color: DIM, valign: "top", margin: 0, isTextBox: true });
  s.addText("NHÓM 12 · UIT", { x: 0.85, y: 6.45, w: 5, h: 0.3, fontSize: 12, fontFace: MONO, color: DIM, margin: 0, isTextBox: true });

  box(s, 8.65, 0.5, 4.18, 4.3, TILE, BRD);
  s.addText("tcache bin 0x100 · glibc 2.27", { x: 8.9, y: 0.75, w: 3.7, h: 0.3, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  cell(s, 8.95, 1.25, 3.1, 0.95, "i · user data", { size: 13 });
  cell(s, 8.95, 2.45, 3.1, 0.95, "h · next → h", { fill: CODE, line: RED, color: RED, size: 13 });
  cell(s, 8.95, 3.65, 3.1, 0.95, "h · next → h", { fill: CODE, line: RED, color: RED, size: 13 });
  arrow(s, 12.35, 3.9, 12.35, 2.95, RED);
  s.addShape(pres.shapes.LINE, { x: 12.05, y: 3.9, w: 0.3, h: 0, line: { color: RED, width: 1.75 } });
  s.addShape(pres.shapes.LINE, { x: 12.05, y: 2.95, w: 0.3, h: 0, line: { color: RED, width: 1.75 } });

  tile(s, 8.65, 5.05, 2.0, 1.95, { fill: AMB, label: "GLIBC 2.26–2.28", head: "tcache dup", hs: 18, body: "free(a); free(a) lọt ngay", bullet: false, size: 12 });
  tile(s, 10.9, 5.05, 1.93, 1.95, { line: RED, label: "GLIBC ≥ 2.29", lc: RED, body: "`free(): double free detected in tcache 2`", bullet: false, size: 11, cc: RED });
}
{
  const s = S("Nội dung bám theo 8 yêu cầu của đề", "MỤC LỤC");
  const items = [
    ["YÊU CẦU 1", "Khái niệm, nguyên lý, điều kiện phát sinh", "Phần 01 nền tảng bộ nhớ · phần 02 arenas · phần 03 double free"],
    ["YÊU CẦU 2", "Mã CWE tương ứng", "CWE-415 Double Free · CWE-416 Use After Free"],
    ["YÊU CẦU 3", "Vị trí lỗ hổng và nguyên nhân", "Source glibc-2.27: __libc_free, _int_free, tcache_put/get · PoC 5.5"],
    ["YÊU CẦU 4", "CVE thực tế liên quan", "Phần 07: CVE-2026-33824, CVE-2026-23918, CVE-2025-62215"],
    ["YÊU CẦU 5", "Chuỗi khai thác và mối liên hệ", "Phần 04: tcache poisoning, sơ đồ lỗ hổng · CWE · kỹ thuật · CVE"],
    ["YÊU CẦU 6", "Demo Pwnable thủ công và có AI", "Phần 05: PoC Sink A / Sink B trong container glibc 2.27"],
    ["YÊU CẦU 7", "Biện pháp khắc phục, phòng ngừa", "Phần 08: mã nguồn, công cụ, allocator, vận hành"],
    ["YÊU CẦU 8", "Điều kiện, cơ chế bảo vệ, giới hạn", "Phần 06: điều kiện cần, 7 tầng bảo vệ, vì sao vẫn có CVE"],
  ];
  const w = (12.33 - 3 * 0.25) / 4, h = 2.5;
  items.forEach(([l, hd, b], i) => {
    const x = 0.5 + (i % 4) * (w + 0.25), y = 1.55 + Math.floor(i / 4) * (h + 0.25);
    tile(s, x, y, w, h, { label: l, head: hd, hs: 16, hh: 0.8, body: b, bullet: false, size: 12.5, tc: TX, fill: i === 0 ? AMB : TILE });
  });
}

// =====================================================================
// 01 NỀN TẢNG
// =====================================================================
sec("01 Nền tảng bộ nhớ");
divider("01", "Nền tảng bộ nhớ", "Yêu cầu 1 · stack, heap, cấu trúc chunk, bin và tcache",
  ["1.1  Stack", "1.2  Heap", "3    Ranh giới OS vs glibc", "3.1  Cấu trúc heap chunk", "3.2  malloc() cấp phát", "3.3  Bins", "4    Tcache"]);
{
  const s = S("Stack và Heap", "1 · HAI VÙNG NHỚ CỦA MỘT TIẾN TRÌNH");
  img(s, "image-1.png", 0.5, 1.55, 6.4, 5.25, 720 / 540);
  tile(s, 7.15, 1.55, 5.68, 2.5, { label: "1.1 STACK", head: "Biến local, tham số, return address", body: ["LIFO: mỗi lời gọi hàm push một stack frame", "Tự hủy khi hàm trả về, không cần free", "Mỗi thread một stack riêng (8 MB mặc định)"] });
  tile(s, 7.15, 4.3, 5.68, 2.5, { label: "1.2 HEAP", head: "Cấp phát động bằng malloc()/free()", body: ["Kích thước, thời điểm chỉ biết lúc chạy", "Vòng đời do lập trình viên kiểm soát", "Dùng chung giữa các thread (main arena)"] });
}
{
  const s = S("Stack: vùng nhớ LIFO của lời gọi hàm", "1.1 · STACK");
  img(s, "image-2.png", 0.5, 1.55, 5.4, 3.8, 545 / 361);
  tile(s, 0.5, 5.6, 5.4, 1.2, { fill: RED, label: "STACK OVERFLOW", body: "Chương trình dùng nhiều stack hơn mức OS cấp", bullet: false, size: 14 });
  tile(s, 6.15, 1.55, 6.68, 5.25, { label: "ĐẶC ĐIỂM", body: [
    "Lưu biến local, tham số hàm và thông tin lời gọi hàm như return address",
    "Theo LIFO: gọi hàm thì push một stack frame, hàm trả về thì pop frame đó",
    "Dữ liệu chỉ sống khi hàm chạy; hàm trả về thì stack pointer quay về vị trí cũ",
    "Không phải tự giải phóng như heap",
    "Con trỏ là biến lưu địa chỉ; trả về con trỏ tới biến local là sai vì nó hết hợp lệ khi hàm kết thúc",
    "Kích thước do OS quy định: 8 MB trên Linux, đổi bằng `ulimit -s`; mỗi thread một stack",
  ], size: 15, space: 8 });
}
{
  const s = S("Heap: vùng nhớ cho cấp phát động", "1.2 · HEAP");
  img(s, "image-3.png", 0.5, 1.55, 4.4, 5.25, 393 / 423);
  tile(s, 5.15, 1.55, 7.68, 1.5, { fill: AMB, head: "Vùng nhớ lớn dùng cho cấp phát động", hs: 20, body: "Chứa dữ liệu mà kích thước hoặc thời điểm xuất hiện chỉ được biết khi chương trình chạy.", bullet: false, size: 14 });
  const w = (7.68 - 0.25) / 2, h = 1.625;
  const t = [
    ["API", "malloc() / free()", "C/C++ cấp phát và giải phóng thủ công"],
    ["VÒNG ĐỜI", "Lập trình viên quyết định", "Trừ ngôn ngữ có garbage collector"],
    ["KÍCH THƯỚC", "Lớn hơn stack", "Object, mảng, danh sách liên kết, dữ liệu sống lâu hơn một lời gọi hàm"],
    ["ĐA LUỒNG", "Heap dùng chung", "Mỗi thread có stack riêng; glibc có thể cấp arena phụ để giảm tranh chấp khóa"],
  ];
  t.forEach(([l, hd, b], i) => tile(s, 5.15 + (i % 2) * (w + 0.25), 3.3 + Math.floor(i / 2) * (h + 0.25), w, h, { label: l, head: hd, hs: 16, hh: 0.35, body: b, bullet: false, size: 13 }));
}

// =====================================================================
// 02 ARENAS
// =====================================================================
sec("02 Arenas");
divider("02", "Arenas", "Yêu cầu 1 · main_arena, non-main arena và cách glibc quản lý heap theo từng thread",
  ["2    Ranh giới OS vs glibc", "2.1  struct malloc_state", "2.2  main vs non-main", "2.3  _int_new_arena()", "2.4  Thread chọn arena", "2.5 2.7  bit A, linked list"]);
{
  const s = S("Ranh giới: OS cấp vùng nhớ, glibc tự quản lý arena", "KHÁI NIỆM · MỤC 2 · OS KHÔNG BIẾT GÌ VỀ \"ARENA\"");
  tile(s, 0.5, 1.55, 6.04, 4.1, { label: "OS / KERNEL", head: "Chỉ cấp VÙNG địa chỉ ảo", hs: 22, hh: 0.55, body: [
    "`brk()`/`sbrk()`: mở rộng heap liền mạch, nối tiếp data segment",
    "`mmap()`: cấp một vùng lớn, riêng, ở địa chỉ khác",
    "OS không biết gì về `malloc()`, `free()` hay \"chunk\" — đó không phải khái niệm của OS",
  ], size: 15, space: 8 });
  tile(s, 6.79, 1.55, 6.04, 4.1, { fill: AMB, label: "GLIBC — USER-SPACE, KHÔNG ĐẶC QUYỀN KERNEL", head: "Arena là lớp quản lý NẰM TRÊN vùng đó", hs: 20, hh: 1.0, body: [
    "`struct malloc_state` (mục 2.1) tổ chức vùng OS vừa cấp thành chunk/bin",
    "main_arena dùng vùng từ `brk()`; non-main arena dùng vùng từ `mmap()` — cả hai do glibc tự quản lý, không phải OS",
  ], size: 15, space: 8 });
  tile(s, 0.5, 5.85, 12.33, 1.0, { body: "Giữ ranh giới này rõ trước khi vào chi tiết: mục 2.1–2.7 nói về cấu trúc `malloc_state` cụ thể mà glibc dùng để quản lý arena.", bullet: false, size: 14 });
}
{
  const s = S("struct malloc_state: sổ sách của một arena", "2.1 · malloc.c:1674–1715");
  code(s, 0.5, 1.55, 6.3, 5.25, [
    "struct malloc_state",
    "{",
    "  __libc_lock_define (, mutex);",
    "  int flags;",
    "  int have_fastchunks;",
    "!  mfastbinptr fastbinsY[NFASTBINS];  /* fastbin (3.3) */",
    "!  mchunkptr top;             /* top chunk, mục 3.1    */",
    "  mchunkptr last_remainder;",
    "!  mchunkptr bins[NBINS * 2 - 2];    /* small+large(3.3)*/",
    "  unsigned int binmap[BINMAPSIZE];",
    "!  struct malloc_state *next;  /* DS liên kết CÁC ARENA */",
    "  struct malloc_state *next_free;",
    "  INTERNAL_SIZE_T attached_threads;",
    "  INTERNAL_SIZE_T system_mem, max_system_mem;",
    "};",
  ], { size: 11 });
  tile(s, 7.05, 1.55, 5.78, 2.3, { line: RED, lc: RED, label: "KHÔNG CÓ TRƯỜNG NÀO TÊN \"TCACHE\"", body: "Tcache (mục 4) là lớp phía trước arena, nằm trong TLS của từng thread — không thuộc malloc_state.", bullet: false, size: 14 });
  tile(s, 7.05, 4.05, 5.78, 2.75, { fill: AMB, label: "MỌI BIN (TRỪ TCACHE) NẰM TRONG STRUCT NÀY", body: "fastbinsY[], bins[] (small+large), top đều được nhân bản theo từng arena — không dùng chung toàn process như tcache.", bullet: false, size: 14 });
}
{
  const s = S("main_arena vs non-main arena", "2.2 · 2.3 · 2.6 · malloc.c:1761–1766 · arena.c:53–64, 685");
  code(s, 0.5, 1.55, 6.04, 2.1, [
    "static struct malloc_state main_arena =",
    "{",
    "!  .mutex = _LIBC_LOCK_INITIALIZER,",
    "!  .next = &main_arena,    /* khép vòng DS liên kết */",
    "  .attached_threads = 1",
    "};",
  ], { size: 11.5, cap: "main_arena: biến static trong .data/.bss libc" });
  code(s, 6.79, 1.55, 6.04, 2.1, [
    "typedef struct _heap_info",
    "{",
    "!  mstate ar_ptr;          /* arena sở hữu heap này */",
    "  struct _heap_info *prev; /* sub-heap trước (nếu có) */",
    "  size_t size;",
    "  size_t mprotect_size;",
    "} heap_info;",
  ], { size: 11.5, cap: "heap_info: header đứng trước malloc_state của non-main arena" });
  table(s, [
    ["Đặc điểm", "main_arena", "non-main arena"],
    ["malloc_state nằm ở đâu", "static trong .data/.bss libc", "trong mmap, ngay sau heap_info (h + 1)"],
    ["Vùng heap lấy từ đâu", "brk()/sbrk() — liền mạch", "mmap(), căn HEAP_MAX_SIZE — thường ở xa"],
    ["Mở rộng khi hết chỗ", "gọi MORECORE/sbrk lần nữa", "grow_heap() rồi new_heap() nếu không đủ"],
    ["Bit A trên chunk", "luôn 0", "luôn 1"],
    ["Số lượng", "đúng 1, suốt tiến trình", "0..mp_.arena_max"],
    ["Sinh ra khi nào", "có sẵn từ lúc nạp libc", "chỉ khi một thread gặp tranh chấp khoá"],
  ], 0.5, 3.75, 12.33, [2.9, 4.33, 5.1], { size: 12, boldFirst: true });
}
{
  const s = S("_int_new_arena(): non-main arena sinh ra khi nào", "2.3 · arena.c:685–749, rút gọn");
  code(s, 0.5, 1.55, 6.9, 5.25, [
    "static mstate",
    "_int_new_arena (size_t size)",
    "{",
    "  mstate a; heap_info *h; ...",
    "!  h = new_heap (size + (sizeof (*h) + sizeof (*a)",
    "!                + MALLOC_ALIGNMENT), mp_.top_pad);",
    "",
    "!  a = h->ar_ptr = (mstate) (h + 1);",
    "!             /* malloc_state nằm NGAY SAU heap_info */",
    "  malloc_init_state (a);",
    "  a->attached_threads = 1;",
    "  a->system_mem = a->max_system_mem = h->size;",
    "  ...",
    "!  top (a) = (mchunkptr) ptr;  /* top chunk arena mới */",
    "  ...",
    "  mstate replaced_arena = thread_arena;",
    "!  thread_arena = a;        /* gán arena mới cho THREAD này */",
    "  ...",
    "!  a->next = main_arena.next;  /* chèn vào đầu DS liên kết */",
    "!  main_arena.next = a;",
    "}",
  ], { size: 10 });
  tile(s, 7.65, 1.55, 5.18, 1.7, { label: "GỌI KHI NÀO", body: "arena_get không lấy được arena nào đang rảnh — mọi arena hiện có đều bị thread khác khoá", bullet: false, size: 13.5 });
  tile(s, 7.65, 3.4, 5.18, 1.6, { fill: AMB, label: "new_heap() CẤP GÌ", body: "Một vùng mmap mới, căn HEAP_MAX_SIZE; malloc_state nằm ngay sau heap_info trong CHÍNH vùng đó", bullet: false, size: 13.5 });
  tile(s, 7.65, 5.15, 5.18, 1.65, { label: "HAI TÁC DỤNG PHỤ CUỐI HÀM", body: [
    "thread_arena (TLS, mục 2.4) được gán arena mới",
    "a->next = main_arena.next rồi main_arena.next = a: arena mới luôn chèn ngay sau main_arena",
  ], size: 12.5, space: 4 });
}
{
  const s = S("Một thread chọn arena nào", "2.4 · arena.c:74, 113, 118");
  code(s, 0.5, 1.55, 6.9, 3.0, [
    "static __thread mstate thread_arena",
    "  attribute_tls_model_ie;      /* arena.c:74 */",
    "",
    "#define arena_get(ptr, size) do {        /* 113 */",
    "!  ptr = thread_arena;  /* dùng lại arena đã cache */",
    "  arena_lock (ptr, size);",
    "} while (0)",
    "",
    "#define arena_lock(ptr, size) do {       /* 118 */",
    "  if (ptr)",
    "    __libc_lock_lock (ptr->mutex);",
    "  else",
    "!    ptr = arena_get2 ((size), NULL);  /* chưa có -> tìm/tạo */",
    "} while (0)",
  ], { size: 10.5 });
  tile(s, 0.5, 4.75, 6.9, 2.05, { label: "thread_arena LÀ CON TRỎ TLS (__thread)", body: "Mỗi thread giữ một bản riêng, không chia sẻ — khác hẳn malloc_state dùng chung trong một arena.", bullet: false, size: 14 });
  tile(s, 7.65, 1.55, 5.18, 2.5, { fill: AMB, label: "LẦN malloc()/free() ĐẦU TIÊN CỦA THREAD", body: "thread_arena == NULL → rơi vào arena_get2: thử tái sử dụng arena rảnh trong free_list (reused_arena, arena.c:811), không có mới gọi _int_new_arena (2.3).", bullet: false, size: 14 });
  tile(s, 7.65, 4.3, 5.18, 2.5, { label: "SAU LẦN ĐẦU", body: "thread_arena đã có giá trị: mọi malloc()/free() kế tiếp của thread này vào thẳng arena đó, chỉ còn khoá mutex, không phải tìm/tạo lại.", bullet: false, size: 14 });
}
{
  const s = S("Hai thread, hai arena, một danh sách liên kết", "2.5 · 2.7 · arena.c:127, 129");
  box(s, 0.5, 1.55, 6.04, 3.1, TILE, BRD);
  s.addText("THREAD 1 (MAIN) — chưa tranh chấp khoá", { x: 0.7, y: 1.73, w: 5.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  cell(s, 0.8, 2.15, 5.44, 0.7, "thread_arena (TLS) = &main_arena", { fill: CODE });
  arrow(s, 3.5, 2.85, 3.5, 3.15);
  cell(s, 0.8, 3.25, 5.44, 0.9, "brk-heap liền mạch · bit A = 0 trên mọi chunk", { fill: CODE, size: 12 });
  box(s, 6.79, 1.55, 6.04, 3.1, TILE, BRD);
  s.addText("THREAD 2 — tranh chấp khoá → _int_new_arena()", { x: 6.99, y: 1.73, w: 5.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  cell(s, 7.09, 2.15, 5.44, 0.7, "thread_arena (TLS) = &Arena#2", { fill: CODE });
  arrow(s, 9.8, 2.85, 9.8, 3.15);
  cell(s, 7.09, 3.25, 5.44, 0.38, "heap_info · ar_ptr ↓  (arena.c:53, mmap mới)", { fill: CODE, size: 10.5 });
  cell(s, 7.09, 3.68, 5.44, 0.47, "malloc_state ngay sau (h + 1) · bit A = 1 trên mọi chunk", { fill: CODE, line: RED, color: RED, size: 10.5 });
  s.addText("main_arena.next →", { x: 5.95, y: 1.37, w: 1.5, h: 0.16, fontSize: 8, fontFace: MONO, bold: true, color: AMB, align: "center", margin: 0, isTextBox: true });
  arrow(s, 6.56, 1.53, 6.77, 1.53, AMB);
  tile(s, 0.5, 4.85, 6.04, 1.95, { label: "DANH SÁCH LIÊN KẾT ARENA (VÒNG TRÒN)", body: "main_arena.next → Arena#2 → main_arena: đơn, vòng tròn qua trường next (mũi tên phía trên là chiều main_arena.next). Arena mới luôn chèn ngay sau main_arena.", bullet: false, size: 13 });
  tile(s, 6.79, 4.85, 6.04, 1.95, { label: "heap_for_ptr / arena_for_chunk", body: [
    "`heap_for_ptr(p) = p & ~(HEAP_MAX_SIZE-1)` → heap_info",
    "bit A = 0 → trả thẳng &main_arena, không cần tính gì",
  ], size: 13 });
}
{
  const s = S("Ranh giới: OS cấp vùng, glibc chia nhỏ thành chunk", "KHÁI NIỆM · MỤC 3 · TRƯỚC KHI VÀO CHI TIẾT CHUNK");
  tile(s, 0.5, 1.55, 6.04, 4.1, { label: "MỤC 2 · OS", head: "Cấp vùng địa chỉ ảo thô", hs: 22, hh: 0.55, body: [
    "`brk()` mở rộng heap liền mạch, hoặc `mmap()` cấp vùng lớn riêng",
    "Không có khái niệm \"chunk\" ở tầng này — chỉ là vùng nhớ thô",
  ], size: 15, space: 8 });
  tile(s, 6.79, 1.55, 6.04, 4.1, { fill: AMB, label: "MỤC 3 · GLIBC (ptmalloc), USER-SPACE", head: "Chia vùng đó thành heap chunk", hs: 20, hh: 0.85, body: [
    "Chạy hoàn toàn trong tiến trình, không đặc quyền kernel",
    "Mỗi lần `malloc()`/`calloc()`/`realloc()` được đóng gói thành một chunk = metadata + user data (mục 3.1), không lưu thuần dữ liệu người dùng",
  ], size: 15, space: 8 });
  tile(s, 0.5, 5.85, 12.33, 1.0, { body: "Cùng một ranh giới như mục 2, áp cho tầng chunk: việc chia nhỏ vùng OS cấp cho từng lần malloc() là công việc của thư viện glibc, không phải OS.", bullet: false, size: 14 });
}
{
  const s = S("Cấu trúc một heap chunk", "3.1 · CHUNK = METADATA + USER DATA");
  box(s, 0.5, 1.55, 6.2, 5.25, TILE, BRD);
  s.addText("Allocated chunk", { x: 0.8, y: 1.75, w: 2.6, h: 0.3, fontSize: 12, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText("Freed chunk", { x: 3.8, y: 1.75, w: 2.6, h: 0.3, fontSize: 12, fontFace: MONO, bold: true, color: RED, margin: 0, isTextBox: true });
  cell(s, 0.8, 2.15, 2.6, 0.5, "prev_size", { size: 11 });
  cell(s, 0.8, 2.65, 2.6, 0.5, "size | A|M|P", { size: 11 });
  cell(s, 0.8, 3.15, 2.6, 2.5, "User Data\n(payload)", { size: 11 });
  cell(s, 3.8, 2.15, 2.6, 0.5, "prev_size", { size: 11 });
  cell(s, 3.8, 2.65, 2.6, 0.5, "size | A|M|P", { size: 11 });
  cell(s, 3.8, 3.15, 2.6, 0.6, "fd (tcache: next)", { size: 11, line: RED, color: RED });
  cell(s, 3.8, 3.75, 2.6, 0.6, "bk (tcache: key)", { size: 11, line: RED, color: RED });
  cell(s, 3.8, 4.35, 2.6, 1.3, "unused...", { size: 11, bold: false });
  s.addText("mem = chunk + 0x10: con trỏ malloc() trả về trỏ vào user data; key có từ glibc 2.29", { x: 0.8, y: 5.85, w: 5.6, h: 0.75, fontSize: 12, color: DIM, valign: "top", margin: 0, isTextBox: true });
  tile(s, 6.95, 1.55, 5.88, 3.3, { label: "CÁC TRƯỜNG", body: [
    "`prev_size`: cỡ chunk liền trước, chỉ có nghĩa khi chunk đó rảnh (bit P = 0)",
    "`size`: tính cả header 0x10, bội số của 16, tối thiểu 0x20 (64-bit)",
    "3 bit cờ: `P` PREV_INUSE · `M` IS_MMAPPED · `A` NON_MAIN_ARENA",
    "Khi free, 16 byte đầu user data thành `fd`/`next` và `bk`/`key`",
  ], size: 13.5, space: 7 });
  const w = (5.88 - 0.25) / 2;
  tile(s, 6.95, 5.1, w, 1.7, { label: "TOP CHUNK", body: "Chunk trống cuối heap; malloc cắt dần, hết thì mở rộng bằng brk/mmap", bullet: false, size: 13 });
  tile(s, 6.95 + w + 0.25, 5.1, w, 1.7, { label: "CONSOLIDATION", body: "Free chunk kề chunk rảnh khác (hoặc top) thì gộp thành chunk lớn hơn", bullet: false, size: 13 });
}
{
  const s = S("malloc() cấp phát trên heap như thế nào", "3.2 · VÍ DỤ TỐI GIẢN: BA LẦN malloc(16)");
  code(s, 0.5, 1.55, 6.3, 2.1, [
    "char *a = malloc(16);   /* nb = 0x20 */",
    "char *b = malloc(16);",
    "char *c = malloc(16);",
  ], { size: 13, cap: "Heap vừa tạo — mọi bin (3.3) đều trống" });
  code(s, 0.5, 3.9, 6.3, 2.9, [
    "use_top:",
    "!  victim = av->top;      /* cắt từ top chunk, 3.1 */",
    "  size = chunksize (victim);",
    "  remainder = chunk_at_offset (victim, nb);",
    "!  av->top = remainder;    /* top CO LẠI đúng nb byte */",
    "  set_head (victim, nb | PREV_INUSE | ...);",
    "",
    "  return chunk2mem (victim);  /* con trỏ malloc() trả về */",
  ], { size: 10.5, cap: "_int_malloc(), nhánh use_top — malloc.c:4074–4104" });
  box(s, 6.95, 1.55, 5.88, 3.3, TILE, BRD);
  s.addText("HÌNH DẠNG HEAP SAU 3 LẦN malloc(16)", { x: 7.15, y: 1.72, w: 5.5, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  const chunks = [["chunk a", "mem=0x010", CODE], ["chunk b", "mem=0x030", CODE], ["chunk c", "mem=0x050", CODE], ["TOP CHUNK", "top=0x060", AMB]];
  let cx = 7.2;
  chunks.forEach(([n, addr, f], i) => {
    const w = i === 3 ? 2.0 : 1.05;
    cell(s, cx, 2.15, w, 0.85, n, { fill: f, size: 11, color: f === AMB ? BG : TX, dash: true });
    s.addText(addr, { x: cx, y: 3.05, w, h: 0.3, fontSize: 9.5, fontFace: MONO, color: DIM, align: "center", margin: 0, isTextBox: true });
    cx += w + 0.12;
  });
  s.addText("0x20 byte / chunk, liền nhau — mỗi malloc() dịch av->top tới ngay sau phần vừa cắt. (Viền nét đứt = sơ đồ minh hoạ, không phải layout byte chính xác như mục 4-c.)", { x: 7.15, y: 3.5, w: 5.5, h: 1.2, fontSize: 12.5, color: DIM, valign: "top", margin: 0, isTextBox: true });
  tile(s, 6.95, 5.05, 5.88, 1.75, { body: [
    "a, b, c liền kề từng 0x20 byte — không phải glibc \"biết\" sẽ có 3 lần gọi, use_top chỉ luôn cắt từ av->top hiện tại",
    "Top không còn đủ nb + MINSIZE mới xin thêm bộ nhớ từ OS (sysmalloc, brk/mmap) — seminar không đi sâu bước này",
  ], size: 13, space: 7 });
}
{
  const s = S("5 loại bin giữ chunk đã free", "3.3 · CHUNK KHÔNG TRẢ NGAY CHO OS MÀ VÀO BIN");
  table(s, [
    ["Bin", "Cấu trúc", "Kích thước chunk (64-bit)", "Thứ tự", "Đặc điểm chính"],
    ["tcache", "liên kết đơn, riêng mỗi thread", "≤ `0x410` (dữ liệu ≤ 1032 B)", "LIFO", "tối đa 7 chunk/bin; không cần lock; có key (2.29+), safe-linking (2.32+)"],
    ["fastbin", "liên kết đơn", "≤ `0x80` (dữ liệu ≤ 120 B)", "LIFO", "không coalesce; khi free chỉ so trùng với phần tử đầu danh sách"],
    ["unsorted bin", "liên kết đôi", "chunk còn lại, chưa phân loại", "FIFO", "trạm trung chuyển khi free; nguồn leak địa chỉ libc phổ biến"],
    ["smallbin", "liên kết đôi", "< `0x400`", "FIFO", "mỗi bin ứng với một kích thước cố định"],
    ["largebin", "liên kết đôi", "≥ `0x400`", "size giảm dần", "tối ưu cho best-fit"],
  ], 0.5, 1.55, 12.33, [1.55, 2.3, 2.55, 1.35, 4.58], { size: 12.5, boldFirst: true });
  const w = (12.33 - 0.5) / 3;
  tile(s, 0.5, 5.1, w, 1.7, { label: "THỨ TỰ KHI FREE", body: "tcache trước; bin đầy (7 chunk) mới xuống fastbin; còn lại vào unsorted bin rồi phân loại về small/large", bullet: false, size: 12.5 });
  tile(s, 0.5 + w + 0.25, 5.1, w, 1.7, { label: "TCACHE RA ĐỜI", body: "glibc 2.26, để giảm tranh chấp khóa giữa các thread vốn dùng chung arena", bullet: false, size: 12.5 });
  tile(s, 0.5 + 2 * (w + 0.25), 5.1, w, 1.7, { label: "TẮT TCACHE KHI NGHIÊN CỨU", body: "Chạy binary với `GLIBC_TUNABLES` = `glibc.malloc.tcache_count=0`", bullet: false, size: 12.5 });
}
{
  const s = S("Vị trí các bin trong một lần malloc()", "3.3 · __libc_malloc → _int_malloc, malloc.c:3520");
  const steps = [
    ["1", "tcache[idx] còn entry?", "__libc_malloc — KHÔNG gọi _int_malloc, không khoá arena", AMB],
    ["2", "nb ≤ 0x80, fastbin còn chunk?", "pop LIFO, trả về ngay", TILE],
    ["3", "nb < 0x400, smallbin còn chunk?", "pop FIFO, trả về ngay", TILE],
    ["4", "Duyệt unsorted bin", "khớp nb trả ngay; không khớp thì xếp vào small/largebin, duyệt tiếp", TILE],
    ["5", "nb ≥ 0x400, largebin có chunk vừa đủ?", "cắt theo best-fit, trả về", TILE],
    ["6", "use_top: cắt từ TOP CHUNK (3.2)", "hoặc sysmalloc nếu top cũng không đủ", RED],
  ];
  const w = (12.33 - 5 * 0.2) / 6;
  steps.forEach(([n, head, body, f], i) => {
    const x = 0.5 + i * (w + 0.2);
    box(s, x, 1.55, w, 3.6, f, f === TILE ? BRD : f, true);
    s.addText(n, { x: x + 0.15, y: 1.65, w: w - 0.3, h: 0.55, fontSize: 28, bold: true, color: f === TILE ? AMB : BG, fontFace: "Arial", margin: 0, isTextBox: true });
    s.addText(head, { x: x + 0.15, y: 2.2, w: w - 0.3, h: 0.95, fontSize: 12, bold: true, color: f === TILE ? TX : BG, valign: "top", margin: 0, isTextBox: true });
    s.addText(body, { x: x + 0.15, y: 3.15, w: w - 0.3, h: 1.9, fontSize: 10.5, color: f === TILE ? DIM : BG, valign: "top", margin: 0, isTextBox: true });
    if (i < steps.length - 1) arrow(s, x + w + 0.02, 3.35, x + w + 0.18, 3.35);
  });
  tile(s, 0.5, 5.35, 12.33, 1.45, { fill: AMB, body: "Bước 1 nằm ở __libc_malloc (mục 5.1) — KHÔNG chạm _int_malloc; bước 2–6 mới nằm trong _int_malloc. Đây là lý do mục 5.4 phân biệt \"free trùng lọt qua tcache\" khác \"lọt qua fastbin\": hai bin đứng ở hai bước đầu tiên, riêng biệt. (Viền nét đứt = từng bước quyết định của malloc(), không phải vùng nhớ thật.)", bullet: false, size: 13 });
}
{
  const s = S("Tcache: cache riêng cho từng thread", "4-a,b · BẢN CHẤT VÀ LÝ DO RA ĐỜI");
  tile(s, 0.5, 1.55, 6.04, 3.4, { label: "a) TRƯỚC GLIBC 2.26 (2017)", head: "Một ổ khóa cho mọi thread", body: [
    "Mọi `malloc()`/`free()` tranh nhau arena, mỗi arena một mutex",
    "Đa luồng cấp phát nhiều object nhỏ thì các thread khóa chờ nhau",
    "Chi phí đồng bộ còn lớn hơn chi phí cấp phát (glibc bug 17195)",
  ] });
  tile(s, 6.79, 1.55, 6.04, 3.4, { label: "b) TỪ GLIBC 2.26", head: "Thread cache không cần khóa", body: [
    "Lớp đệm riêng từng thread, nằm trước arena/bin",
    "`free()` đẩy vào cache của chính thread; `malloc()` rút ra trước khi chạm arena",
    "Khai báo `__thread`: mỗi thread một bản sao độc lập",
  ] });
  tile(s, 0.5, 5.2, 12.33, 1.6, { line: RED, label: "HỆ QUẢ BẢO MẬT", lc: RED, head: "Không khóa nghĩa là không có người gác cổng", hs: 20,
    body: "Ngoài vài dòng trong tcache_put/tcache_get, không có kiểm tra hợp lệ nào. Toàn bộ phần 02 và 03 xoay quanh điểm này.", bullet: false, size: 14 });
}
{
  const s = S("tcache_perthread_struct: sổ sách của tcache", "4-c · malloc.c:2914–2921 · glibc-2.27");
  code(s, 0.5, 1.55, 5.6, 2.3, [
    "typedef struct tcache_perthread_struct",
    "{",
    "  char counts[TCACHE_MAX_BINS];",
    "  tcache_entry *entries[TCACHE_MAX_BINS];",
    "} tcache_perthread_struct;",
    "",
    "!static __thread tcache_perthread_struct *tcache;",
  ], { size: 11.5 });
  table(s, [
    ["Thành phần", "Kiểu", "Ý nghĩa"],
    ["`counts[64]`", "char[64]", "số chunk đang nằm trong bin idx (0–7)"],
    ["`entries[64]`", "tcache_entry*[64]", "chunk đầu danh sách của bin idx, hoặc NULL"],
    ["`tcache`", "con trỏ __thread", "mỗi thread một bản; tcache_put/get đọc ghi biến này"],
  ], 6.35, 1.55, 6.48, [1.5, 1.75, 3.23], { size: 12 });
  box(s, 0.5, 4.1, 12.33, 2.7, TILE, BRD);
  s.addText("LAYOUT BYTE THẬT · tcache_perthread_struct LÀ CHUNK HEAP ĐẦU TIÊN (VÍ DỤ 5.5: i, h)", { x: 0.7, y: 4.25, w: 11.9, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  const bx = 0.8, by = 4.62, bh = 0.95, w0 = 5.1, w1 = 2.0, w2 = 2.0;
  cell(s, bx, by, w0, bh, "tcache_perthread_struct\ncounts[14]=2 · entries[14]=0x360", { fill: AMB, color: BG, size: 10.5 });
  cell(s, bx + w0 + 0.14, by, w1, bh, "chunk i (đã free)\nfd/next = NULL", { size: 10.5 });
  cell(s, bx + w0 + w1 + 0.28, by, w2, bh, "chunk h (đã free)\nfd/next = 0x260", { line: RED, color: RED, size: 10.5 });
  s.addText("heap+0x000", { x: bx, y: by + bh + 0.02, w: w0, h: 0.22, fontSize: 9.5, fontFace: MONO, color: DIM, align: "center", margin: 0, isTextBox: true });
  s.addText("heap+0x250 · mem(i)=0x260", { x: bx + w0 + 0.14, y: by + bh + 0.02, w: w1, h: 0.22, fontSize: 8.5, fontFace: MONO, color: DIM, align: "center", margin: 0, isTextBox: true });
  s.addText("heap+0x350 · mem(h)=0x360", { x: bx + w0 + w1 + 0.28, y: by + bh + 0.02, w: w2, h: 0.22, fontSize: 8.5, fontFace: MONO, color: DIM, align: "center", margin: 0, isTextBox: true });
  const py = by + bh + 0.42;
  s.addText("entries[14]=0x360", { x: bx, y: py, w: 1.95, h: 0.42, fontSize: 11, fontFace: MONO, bold: true, color: AMB, valign: "middle", margin: 0, isTextBox: true });
  arrow(s, 2.78, py + 0.21, 3.08, py + 0.21);
  cell(s, 3.13, py - 0.02, 1.1, 0.46, "h", { line: RED, color: RED, size: 12 });
  s.addText("*(0x360)=0x260", { x: 4.3, y: py, w: 1.75, h: 0.42, fontSize: 10, fontFace: MONO, color: DIM, valign: "middle", margin: 0, isTextBox: true });
  arrow(s, 6.08, py + 0.21, 6.38, py + 0.21);
  cell(s, 6.43, py - 0.02, 1.1, 0.46, "i", { size: 12 });
  s.addText("*(0x260)=NULL", { x: 7.6, y: py, w: 1.75, h: 0.42, fontSize: 10, fontFace: MONO, color: DIM, valign: "middle", margin: 0, isTextBox: true });
  s.addText("Khác \"64 ngăn kéo\" trừu tượng: entries[idx] và next ở trên là ĐỊA CHỈ HEAP THẬT, nằm ngay trong 8 byte đầu user data của từng chunk đã free.", { x: 9.5, y: py - 0.08, w: 3.1, h: 0.75, fontSize: 10.5, color: TX, valign: "top", margin: 0, isTextBox: true });
}
{
  const s = S("Từ kích thước chunk tới chỉ số bin", "4-d,e · malloc.c:2904–2907, 308, 311");
  code(s, 0.5, 1.55, 6.04, 1.9, [
    "typedef struct tcache_entry",
    "{",
    "  struct tcache_entry *next;",
    "  /* glibc >= 2.29 thêm: key */",
    "} tcache_entry;",
  ], { size: 11.5 });
  code(s, 0.5, 3.7, 6.04, 1.6, [
    "#define csize2tidx(x) \\",
    "  (((x) - MINSIZE + MALLOC_ALIGNMENT - 1) / MALLOC_ALIGNMENT)",
    "#define tidx2usize(idx) \\",
    "  (((size_t) idx) * MALLOC_ALIGNMENT + MINSIZE - SIZE_SZ)",
  ], { size: 10.5 });
  tile(s, 0.5, 5.55, 6.04, 1.25, { body: "`next` trỏ chunk kế tiếp trong cùng bin; liên kết đơn vì tcache chỉ push/pop ở đầu", bullet: false, size: 13.5 });
  box(s, 6.79, 1.55, 6.04, 3.0, AMB, AMB);
  s.addText("64-BIT: MINSIZE 0x20 · ALIGN 16 · SIZE_SZ 8", { x: 7.0, y: 1.75, w: 5.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: BG, margin: 0, isTextBox: true });
  s.addText("0x100 → idx 14", { x: 7.0, y: 2.2, w: 5.6, h: 1.0, fontSize: 44, bold: true, color: BG, fontFace: "Arial", margin: 0, isTextBox: true });
  s.addText("(256 − 32 + 15) / 16 = 14", { x: 7.0, y: 3.4, w: 5.6, h: 0.5, fontSize: 18, fontFace: MONO, bold: true, color: BG, margin: 0, isTextBox: true });
  tile(s, 6.79, 4.8, 6.04, 2.0, { label: "CHIỀU NGƯỢC LẠI", head: "tidx2usize(14) = 14×16 + 32 − 8 = 248", hs: 18, hh: 0.45,
    body: "Khớp đúng `BUFSIZE2 = 248` trong ví dụ 5.5: mọi `malloc(248)` quy về cùng `entries[14]`.", bullet: false, size: 14 });
}
{
  const s = S("tcache_init(): tcache cũng là một chunk heap", "4-f,g,h · malloc.c:2977–3002");
  code(s, 0.5, 1.55, 6.3, 5.25, [
    "# define MAYBE_INIT_TCACHE() \\",
    "  if (__glibc_unlikely (tcache == NULL)) \\",
    "    tcache_init();",
    "",
    "static void",
    "tcache_init (void)",
    "{",
    "  mstate ar_ptr;",
    "  const size_t bytes = sizeof (tcache_perthread_struct);",
    "",
    "!  arena_get (ar_ptr, bytes);   /* khóa arena 1 lần */",
    "!  void *victim = _int_malloc (ar_ptr, bytes);",
    "  if (ar_ptr != NULL)",
    "    __libc_lock_unlock (ar_ptr->mutex);",
    "",
    "  if (victim)",
    "    {",
    "      tcache = (tcache_perthread_struct *) victim;",
    "      memset (tcache, 0, sizeof (tcache_perthread_struct));",
    "    }",
    "}",
  ], { size: 10.5 });
  tile(s, 7.05, 1.55, 5.78, 1.95, { label: "KHỞI TẠO LƯỜI", body: [
    "Cấp phát một lần mỗi thread, ở lần `malloc()`/`free()` đầu tiên",
    "Khóa arena chỉ trả giá lúc khởi tạo; tcache_put/get sau đó không lock",
    "Tcache là trạm dừng đầu: bin đầy hoặc chunk quá lớn mới xuống fastbin/unsorted",
  ], size: 12.5, space: 4 });
  table(s, [
    ["Hằng số", "Mặc định", "Ý nghĩa"],
    ["`TCACHE_MAX_BINS`", "64", "số size class quản lý"],
    ["`TCACHE_FILL_COUNT`", "7", "chunk tối đa mỗi bin"],
    ["`tcache_max_bytes`", "1032 B", "request lớn hơn không qua tcache"],
  ], 7.05, 3.7, 5.78, [2.25, 1.1, 2.43], { size: 12 });
  tile(s, 7.05, 5.4, 5.78, 1.4, { line: AMB, label: "HỆ QUẢ CHO PWNABLE", body: "Binary đơn giản: đây thường là chunk heap đầu tiên, tiền đề của tcache metadata attack (6.3). Ba giới hạn trên là tunable.", bullet: false, size: 12.5 });
}

// =====================================================================
// 02 DOUBLE FREE
// =====================================================================
sec("03 Lỗ hổng Double Free");
divider("03", "Lỗ hổng Double Free", "Yêu cầu 1, 2, 3 · khái niệm, CWE, vị trí lỗi trong source glibc và PoC",
  ["5    Bản chất", "5.1  free/malloc trong glibc", "5.2  Điều kiện phát sinh", "5.3  CWE", "5.4  Theo phiên bản glibc", "5.5  Ví dụ & 2 sink"]);
{
  const s = S("Double free: free() hai lần cùng một vùng nhớ", "YÊU CẦU 1 · KHÁI NIỆM VÀ NGUYÊN LÝ");
  tile(s, 0.5, 1.55, 6.04, 2.5, { label: "BẢN CHẤT", body: [
    "Gọi `free()` nhiều lần trên cùng vùng nhớ là undefined behavior",
    "Chunk bị chèn hai lần vào cùng tcache/fastbin, phá linked list allocator dùng để tái sử dụng chunk",
    "Đường khai thác phụ thuộc phiên bản glibc, loại bin, kích thước chunk",
  ], size: 13.5 });
  box(s, 6.79, 1.55, 6.04, 2.5, TILE, BRD);
  s.addText("MẪU KINH ĐIỂN TRÊN FASTBIN (GLIBC CŨ)", { x: 7.0, y: 1.73, w: 5.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText("free(a); free(b); free(a);", { x: 7.0, y: 2.05, w: 5.6, h: 0.4, fontSize: 17, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  cell(s, 7.0, 2.6, 1.0, 0.5, "a"); arrow(s, 8.0, 2.85, 8.45, 2.85);
  cell(s, 8.5, 2.6, 1.0, 0.5, "b"); arrow(s, 9.5, 2.85, 9.95, 2.85);
  cell(s, 10.0, 2.6, 1.0, 0.5, "a", { fill: RED });
  s.addText("fastbin chỉ so với phần tử đầu danh sách, nên free xen kẽ vẫn qua", { x: 7.0, y: 3.25, w: 5.6, h: 0.65, fontSize: 13, color: DIM, valign: "top", margin: 0, isTextBox: true });
  box(s, 0.5, 4.3, 12.33, 2.5, TILE, RED);
  s.addText("HỆ QUẢ", { x: 0.7, y: 4.45, w: 4, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: RED, margin: 0, isTextBox: true });
  const xs = [0.8, 3.85, 6.9, 9.95];
  ["`malloc()` kế tiếp trả lại vùng đã free hai lần", "Hai con trỏ cùng trỏ một vùng nhớ", "Một con trỏ ghi đè dữ liệu / metadata", "Giả mạo con trỏ, ghi tuỳ ý, chiếm luồng thực thi"]
    .forEach((t, i) => cell(s, xs[i], 4.9, 2.7, 1.6, t, { mono: false, size: 14, fill: i === 3 ? RED : CODE, line: i === 3 ? RED : BRD }));
  [3.5, 6.55, 9.6].forEach((x) => arrow(s, x, 5.7, x + 0.35, 5.7, RED));
}
{
  const s = S("Vị trí #1: free() gọi __free_hook trước tiên", "YÊU CẦU 3 · glibc-2.27 malloc/malloc.c:3085");
  code(s, 0.5, 1.55, 6.6, 5.25, [
    "void",
    "__libc_free (void *mem)",
    "{",
    "  mstate ar_ptr;",
    "  mchunkptr p;",
    "",
    "!  void (*hook) (void *, const void *)",
    "!    = atomic_forced_read (__free_hook);",
    "!  if (__builtin_expect (hook != NULL, 0))",
    "!    {",
    "!      (*hook)(mem, RETURN_ADDRESS (0));",
    "!      return;",
    "!    }",
    "",
    "  if (mem == 0)",
    "    return;",
    "",
    "  p = mem2chunk (mem);",
    "  ...",
  ], { size: 12 });
  tile(s, 7.35, 1.55, 5.48, 1.75, { label: "DÒNG ĐẦU TIÊN", body: "Không kiểm tra con trỏ, mà đọc con trỏ hàm toàn cục `__free_hook` (malloc.c:1864).", bullet: false, size: 14 });
  tile(s, 7.35, 3.55, 5.48, 1.6, { label: "NẾU HOOK KHÁC NULL", body: "`free()` gọi thẳng hook rồi return, bỏ qua toàn bộ logic allocator, kể cả `mem2chunk`.", bullet: false, size: 14 });
  tile(s, 7.35, 5.4, 5.48, 1.4, { fill: AMB, label: "MỤC TIÊU GHI ĐÈ KINH ĐIỂN", body: "glibc 2.26–2.28 vẫn còn hook (Sink B). glibc 2.34 gỡ hẳn cơ chế này.", bullet: false, size: 14 });
}
{
  const s = S("Vị trí #2: _int_free chỉ hỏi bin còn chỗ không", "YÊU CẦU 3 · malloc.c:4165–4177 · 2926–2946");
  code(s, 0.5, 1.55, 6.04, 2.85, [
    "#if USE_TCACHE",
    "  {",
    "    size_t tc_idx = csize2tidx (size);",
    "",
    "    if (tcache",
    "        && tc_idx < mp_.tcache_bins",
    "!        && tcache->counts[tc_idx] < mp_.tcache_count)",
    "      {",
    "!        tcache_put (p, tc_idx);",
    "        return;",
    "      }",
    "  }",
    "#endif",
  ], { size: 11 });
  code(s, 0.5, 4.6, 6.04, 2.2, [
    "static void tcache_put (mchunkptr chunk, size_t tc_idx)",
    "{",
    "  tcache_entry *e = (tcache_entry *) chunk2mem (chunk);",
    "  assert (tc_idx < TCACHE_MAX_BINS);",
    "!  e->next = tcache->entries[tc_idx];",
    "  tcache->entries[tc_idx] = e;",
    "  ++(tcache->counts[tc_idx]);",
    "}",
  ], { size: 10.5 });
  tile(s, 6.79, 1.55, 6.04, 2.85, { line: RED, label: "THIẾU KIỂM TRA", lc: RED, head: "Điều kiện duy nhất: counts < 7", hs: 20,
    body: "Không dòng nào hỏi chunk này đã có trong bin chưa. Đây là thiết kế gốc của tcache 2.26, chưa tính tới double free.", bullet: false, size: 14 });
  tile(s, 6.79, 4.6, 6.04, 2.2, { label: "TCACHE_PUT / TCACHE_GET", body: [
    "`e->next` ghi vào đúng 8 byte đầu user data: user data thành con trỏ list",
    "`tcache_get` trả y nguyên `entries[idx]`, không kiểm tra chunk còn sống hay không",
  ], size: 13.5 });
}
{
  const s = S("Vị trí #3: malloc() tin tuyệt đối vào tcache_get()", "YÊU CẦU 3 · malloc.c:3027–3052");
  code(s, 0.5, 1.55, 6.6, 5.25, [
    "void *",
    "__libc_malloc (size_t bytes)",
    "{",
    "  ...",
    "  void *(*hook) (size_t, const void *)",
    "    = atomic_forced_read (__malloc_hook);",
    "  if (__builtin_expect (hook != NULL, 0))",
    "    return (*hook)(bytes, RETURN_ADDRESS (0));",
    "#if USE_TCACHE",
    "  size_t tc_idx = csize2tidx (tbytes);",
    "  MAYBE_INIT_TCACHE ();",
    "",
    "  if (tc_idx < mp_.tcache_bins",
    "      && tcache",
    "!      && tcache->entries[tc_idx] != NULL)",
    "    {",
    "!      return tcache_get (tc_idx);",
    "    }",
    "#endif",
  ], { size: 12 });
  tile(s, 7.35, 1.55, 5.48, 1.6, { label: "CŨNG CÓ HOOK", body: "Kiểm tra `__malloc_hook` trước (malloc.c:1866), giống `free()`.", bullet: false, size: 14 });
  tile(s, 7.35, 3.4, 5.48, 1.75, { label: "ĐƯỜNG TẮT", body: "Bin còn entry thì trả ngay kết quả `tcache_get()`: không chạm `_int_malloc`, không kiểm tra thêm.", bullet: false, size: 14 });
  tile(s, 7.35, 5.4, 5.48, 1.4, { fill: RED, label: "KẾT LUẬN", body: "Từ một `free()` lỗi tới một `malloc()` trả địa chỉ tuỳ ý chỉ cách nhau dòng `tcache_get()`.", bullet: false, size: 14 });
}
{
  const s = S("Điều kiện phát sinh double free", "YÊU CẦU 1 · 5.2");
  tile(s, 0.5, 1.55, 12.33, 1.15, { fill: AMB, label: "CỐT LÕI", body: "`free()` hai lần cùng một địa chỉ, giữa hai lần vùng nhớ không được cấp lại: con trỏ không được gán NULL, hoặc có hai con trỏ alias cùng trỏ một vùng.", bullet: false, size: 14 });
  const w = (12.33 - 0.75) / 4, h = 1.8;
  [["HAI CON TRỎ ALIAS", "`p = q = malloc(n); free(p); free(q);`"],
   ["NHÁNH LỖI + CLEANUP", "Nhánh xử lý lỗi đã free, nhánh cleanup chung free lại"],
   ["SHALLOW COPY", "Copy nông struct/object chứa con trỏ, hai bản cùng free"],
   ["QUÊN GÁN NULL", "free xong không NULL hoá, destructor/cleanup gọi lần hai"],
   ["UAF (CWE-416)", "Dùng con trỏ sau khi free dẫn tới free lần nữa"],
   ["REALLOC HỎNG", "`realloc()` lỗi rồi free cả con trỏ cũ lẫn mới"],
   ["ĐA LUỒNG", "Hai thread cùng free một object, hoặc sai refcount"],
   ["NGUYÊN NHÂN GỐC", "Quyền sở hữu vùng nhớ không rõ ràng, không quản lý tại một chỗ duy nhất"]]
    .forEach(([l, b], i) => tile(s, 0.5 + (i % 4) * (w + 0.25), 2.95 + Math.floor(i / 4) * (h + 0.25), w, h, { label: l, body: b, bullet: false, size: 13.5, fill: i === 7 ? RED : TILE }));
}
{
  const s = S("CWE-415 và CWE-416", "YÊU CẦU 2 · MITRE CWE");
  box(s, 0.5, 1.55, 6.04, 3.6, AMB, AMB);
  s.addText("LỖ HỔNG TRUNG TÂM", { x: 0.75, y: 1.78, w: 5.5, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: BG, margin: 0, isTextBox: true });
  s.addText("CWE-415", { x: 0.75, y: 2.1, w: 5.5, h: 0.9, fontSize: 48, bold: true, color: BG, fontFace: "Arial", margin: 0, isTextBox: true });
  s.addText("Double Free", { x: 0.75, y: 3.0, w: 5.5, h: 0.5, fontSize: 22, bold: true, color: BG, margin: 0, isTextBox: true });
  s.addText("Chương trình gọi free() hai lần trên cùng một địa chỉ bộ nhớ, có thể dẫn tới sửa đổi vùng nhớ ngoài dự kiến. Đây là lỗ hổng trung tâm của seminar.", { x: 0.75, y: 3.6, w: 5.55, h: 1.4, fontSize: 14, color: BG, valign: "top", margin: 0, isTextBox: true });
  box(s, 6.79, 1.55, 6.04, 3.6, TILE, BRD);
  s.addText("LIÊN QUAN TRỰC TIẾP", { x: 7.04, y: 1.78, w: 5.5, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText("CWE-416", { x: 7.04, y: 2.1, w: 5.5, h: 0.9, fontSize: 48, bold: true, color: TX, fontFace: "Arial", margin: 0, isTextBox: true });
  s.addText("Use After Free", { x: 7.04, y: 3.0, w: 5.5, h: 0.5, fontSize: 22, bold: true, color: TX, margin: 0, isTextBox: true });
  s.addText("Dùng con trỏ sau khi vùng nhớ đã được giải phóng. Vừa là tiền đề vừa là hệ quả của double free.", { x: 7.04, y: 3.6, w: 5.55, h: 1.4, fontSize: 14, color: TX, valign: "top", margin: 0, isTextBox: true });
  const w = (12.33 - 0.5) / 3;
  tile(s, 0.5, 5.4, w, 1.4, { label: "416 → 415", body: "Dùng con trỏ đã free rồi free lại lần nữa", bullet: false, size: 13.5 });
  tile(s, 0.5 + w + 0.25, 5.4, w, 1.4, { label: "415 → 416", body: "Double free tạo hai con trỏ cùng trỏ một vùng nhớ, tức là UAF", bullet: false, size: 13.5 });
  tile(s, 0.5 + 2 * (w + 0.25), 5.4, w, 1.4, { label: "362 + 415", body: "Race condition dẫn tới free trùng (CVE-2025-62215)", bullet: false, size: 13.5 });
}
{
  const s = S("Free trùng có lọt qua allocator?", "5.4 · PHỤ THUỘC PHIÊN BẢN GLIBC");
  table(s, [
    ["glibc", "Kiểm tra của allocator", "Hành vi free trùng", "Bản phân phối tiêu biểu"],
    ["≤ 2.25", "chưa có tcache; fastbin chỉ so phần tử đầu", "Lọt nếu free xen kẽ `free(a); free(b); free(a)`", "CentOS 7 (2.17), Ubuntu 16.04 (2.23), Debian 9 (2.24)"],
    ["2.26–2.28", "có tcache, chưa kiểm tra trùng", "`free(a); free(a)` lọt ngay (tcache dup)", "Ubuntu 18.04 (2.27), RHEL 8, Debian 10 (2.28)"],
    ["2.29–2.31", "tcache kiểm tra key + duyệt danh sách", "Phải ghi đè key (qua UAF) hoặc lấp đầy bin để xuống fastbin rồi free xen kẽ", "Ubuntu 20.04, Debian 11 (2.31)"],
    ["≥ 2.32", "thêm safe-linking cho next của tcache/fastbin", "Vẫn lọt như trên, nhưng giả mạo next cần heap leak", "RHEL 9 (2.34), Ubuntu 22.04 (2.35), Debian 12 (2.36), Ubuntu 24.04 (2.39)"],
    ["≥ 2.42", "tcache_max có thể tăng tới 4 MiB", "Giả định chunk > 0x410 vào unsorted bin không còn luôn đúng", "Ubuntu 25.10+, Fedora 43+"],
  ], 0.5, 1.55, 12.33, [1.2, 3.2, 4.2, 3.73], { size: 11.5, boldFirst: true });
  const w = (12.33 - 0.5) / 3;
  tile(s, 0.5, 5.3, w, 1.5, { label: "SAFE-LINKING", body: "Chỉ mã hoá con trỏ next (fd), không chặn double free", bullet: false, size: 13 });
  tile(s, 0.5 + w + 0.25, 5.3, w, 1.5, { label: "THÔNG BÁO ABORT", body: "`double free or corruption (fasttop)` · `free(): double free detected in tcache 2`", bullet: false, size: 11.5 });
  tile(s, 0.5 + 2 * (w + 0.25), 5.3, w, 1.5, { label: "VÍ DỤ 5.5", body: "Chunk 0x100 > 0x80 nên thuộc tcache: kịch bản tcache dup trên 2.26–2.28", bullet: false, size: 13 });
}
{
  const s = S("Vì sao 2.26–2.28 lọt, 2.29 chặn", "5.4 · malloc.c:2904–2909 · 4201–4209 (glibc 2.29)");
  code(s, 0.5, 1.55, 6.04, 2.0, [
    "typedef struct tcache_entry",
    "{",
    "  struct tcache_entry *next;",
    "  /* This field exists to detect double frees.  */",
    "!  struct tcache_perthread_struct *key;",
    "} tcache_entry;",
  ], { size: 10.5 });
  code(s, 0.5, 3.8, 6.04, 3.0, [
    "tcache_entry *e = (tcache_entry *) chunk2mem (p);",
    "",
    "!if (__glibc_unlikely (e->key == tcache))",
    "  {",
    "    tcache_entry *tmp;",
    "    for (tmp = tcache->entries[tc_idx]; tmp;",
    "         tmp = tmp->next)",
    "      if (tmp == e)",
    "~        malloc_printerr (\"free(): double free\"",
    "~                         \" detected in tcache 2\");",
    "  }",
  ], { size: 10.5 });
  tile(s, 6.79, 1.55, 6.04, 1.6, { label: "GLIBC 2.27: KHÔNG CÓ DẤU VẾT", body: "`tcache_put` chỉ ghi `e->next`; không trường nào đánh dấu chunk đã nằm trong tcache.", bullet: false, size: 13.5 });
  tile(s, 6.79, 3.4, 6.04, 2.0, { label: "GLIBC 2.29: TRƯỜNG KEY", body: [
    "`tcache_put` gán `e->key = tcache`",
    "`tcache_get` xoá key về NULL khi cấp lại hợp lệ",
    "`_int_free` thấy key khớp thì duyệt list, gặp lại e thì abort",
  ], size: 13.5 });
  tile(s, 6.79, 5.65, 6.04, 1.15, { label: "VÌ SAO PHẢI DUYỆT LIST", body: "Comment trong source: key có thể trùng dữ liệu ngẫu nhiên, xác suất 1/2^size_t.", bullet: false, size: 13 });
}
{
  const s = S("Ví dụ minh họa: tcache dup trên glibc 2.26–2.28", "YÊU CẦU 3 · 5.5 · BUFSIZE2 = 248 → CHUNK 0x100 → TCACHE");
  code(s, 0.5, 1.55, 6.6, 5.25, [
    "#define BUFSIZE1    512",
    "#define BUFSIZE2    ((BUFSIZE1 / 2) - 8)   /* 248 */",
    "",
    "int main(int argc, char **argv) {",
    "  char *i = (char *) malloc(BUFSIZE2);",
    "  char *h = (char *) malloc(BUFSIZE2);",
    "",
    "  free(i);    /* tcache[0x100] = i    */",
    "  free(h);    /* tcache[0x100]: h → i */",
    "",
    "  char *j = (char *) malloc(BUFSIZE1);  /* 0x210, top */",
    "  strncpy(j, argv[1], BUFSIZE1 - 1);",
    "",
    "~  free(h);    /* không kiểm tra → h->next = h */",
    "  free(j);    /* vào tcache bin khác */",
    "}",
  ], { size: 11.5 });
  const st = [
    ["BƯỚC 1 · free(i), free(h)", "Hai chunk 0x100 vào tcache theo LIFO: danh sách h → i", TILE],
    ["BƯỚC 2 · malloc(512) → j", "Cỡ 0x210 khác size class, cắt từ top chunk; tcache giữ nguyên", TILE],
    ["BƯỚC 3 · free(h) LẦN 2", "Không kiểm tra trùng: h lên đầu bin, h->next = h (self-loop), i rụng khỏi list", RED],
    ["BƯỚC 4 · malloc(248) tiếp theo", "Đều trả về h: nhiều con trỏ hợp lệ cùng trỏ một vùng nhớ", TILE],
  ];
  st.forEach(([l, b, f], i) => tile(s, 7.35, 1.55 + i * 1.375, 5.48, 1.125, { label: l, body: b, bullet: false, size: 13, fill: f }));
}
{
  const s = S("entries[14] sau từng dòng lệnh", "5.5 · SELF-LOOP TẠO RA UAF");
  box(s, 0.5, 1.55, 8.9, 5.25, TILE, BRD);
  const rows = [
    ["free(i)", [["i"]], "", false],
    ["free(h)", [["h"], ["i"]], "LIFO: h lên đầu", false],
    ["malloc(512)→j", [["h"], ["i"]], "khác size class", false],
    ["free(h) lần 2", [["h", true]], "h->next == h; i mất liên kết", true],
    ["malloc(248)#1", [["h", true]], "trả về h; entries không đổi", true],
    ["malloc(248)#2", [["h", true]], "trả về h lần nữa = UAF", true],
  ];
  rows.forEach(([lbl, chain, note, bad], r) => {
    const y = 1.85 + r * 0.8;
    s.addText(lbl, { x: 0.75, y, w: 2.1, h: 0.5, fontSize: 12, fontFace: MONO, bold: true, color: bad ? RED : TX, valign: "middle", margin: 0, isTextBox: true });
    s.addText("entries[14]", { x: 2.85, y, w: 1.4, h: 0.5, fontSize: 11, fontFace: MONO, color: DIM, valign: "middle", margin: 0, isTextBox: true });
    let x = 4.3;
    arrow(s, x, y + 0.25, x + 0.3, y + 0.25, bad ? RED : AMB); x += 0.35;
    chain.forEach(([n, loop], k) => {
      cell(s, x, y + 0.03, 0.6, 0.44, n, { fill: loop ? RED : CODE, size: 12 });
      x += 0.6;
      if (loop) {
        s.addText("↺ next=h", { x: x + 0.05, y, w: 1.05, h: 0.5, fontSize: 11, fontFace: MONO, bold: true, color: RED, valign: "middle", margin: 0, isTextBox: true });
        x += 1.1;
      } else {
        arrow(s, x, y + 0.25, x + 0.3, y + 0.25); x += 0.35;
        if (k === chain.length - 1) { s.addText("NULL", { x, y, w: 0.6, h: 0.5, fontSize: 11, fontFace: MONO, color: DIM, valign: "middle", margin: 0, isTextBox: true }); x += 0.6; }
      }
    });
    if (note) s.addText(note, { x: 7.05, y, w: 2.25, h: 0.5, fontSize: 11, color: bad ? RED : DIM, valign: "middle", margin: 0, isTextBox: true });
  });
  tile(s, 9.65, 1.55, 3.18, 2.9, { label: "GLIBC ≤ 2.25", body: "Chưa có tcache: hai chunk 0x100 vào unsorted bin, hợp nhất với top; free(h) lần 2 đọc metadata rác, thường abort. Muốn minh họa thì dùng fastbin dup, chunk ≤ 0x80.", bullet: false, size: 12.5 });
  tile(s, 9.65, 4.7, 3.18, 2.1, { line: RED, label: "GLIBC ≥ 2.29", lc: RED, body: "free(h) lần 2 bị chặn ngay: `free(): double free detected in tcache 2`", bullet: false, size: 12.5, cc: RED });
}
{
  const s = S("Sink A: ghi đè con trỏ hàm, không cần leak", "5.5 · DOUBLE FREE → UAF WRITE → TCACHE POISONING");
  code(s, 0.5, 1.55, 6.9, 5.25, [
    "struct target {",
    "    void (*action)(void);",
    "    char  pad[BUFSIZE2 - sizeof(void *)];",
    "};                               /* cùng size 0x100 */",
    "",
    "struct target *t = malloc(sizeof(struct target));",
    "t->action = safe;",
    "char *i = malloc(BUFSIZE2), *h = malloc(BUFSIZE2);",
    "free(i); free(h);                /* h -> i         */",
    "char *j = malloc(BUFSIZE1);",
    "strncpy(j, argv[1], BUFSIZE1 - 1);",
    "~free(h);                         /* h -> h         */",
    "!*(struct target **) h = t;       /* next = t       */",
    "malloc(BUFSIZE2);                /* trả về h       */",
    "!struct target *fake = malloc(BUFSIZE2); /* = t     */",
    "!fake->action = win;",
    "t->action();                     /* chạy win()     */",
  ], { size: 11 });
  box(s, 7.65, 1.55, 5.18, 3.55, TILE, BRD);
  s.addText("ENTRIES[14] QUA TỪNG BƯỚC", { x: 7.85, y: 1.72, w: 4.8, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  const steps = [["[h] → h  (self-loop)", RED], ["UAF write: h->next = t", CODE], ["[h] → [t]", CODE], ["malloc #1 = h · malloc #2 = t", CODE], ["fake->action = win → t->action()", AMB]];
  steps.forEach(([t, f], i) => {
    const y = 2.1 + i * 0.6;
    cell(s, 7.9, y, 4.68, 0.42, t, { fill: f, size: 12 });
    if (i < steps.length - 1) arrow(s, 10.24, y + 0.42, 10.24, y + 0.6);
  });
  tile(s, 7.65, 5.35, 5.18, 1.45, { fill: AMB, label: "VÌ SAO KHÔNG CẦN LEAK", body: "t là biến local nằm sẵn trong tay chương trình: không cần địa chỉ tuyệt đối, không cần tắt ASLR.", bullet: false, size: 13.5 });
}
{
  const s = S("Sink B: __free_hook → system() để có shell", "5.5 · CẦN ĐỊA CHỈ TUYỆT ĐỐI CỦA LIBC");
  code(s, 0.5, 1.55, 6.9, 3.6, [
    "extern void (*__free_hook) (void *, const void *);",
    "                          /* chỉ có ở glibc < 2.34 */",
    "...",
    "~free(h);                                 /* h -> h  */",
    "!*(void **) h = (void *) &__free_hook;    /* poison  */",
    "malloc(BUFSIZE2);                         /* = h     */",
    "!void **hook_slot = (void **) malloc(BUFSIZE2);",
    "                               /* = &__free_hook */",
    "!*hook_slot = (void *) system;",
    "free(\"/bin/sh\");          /* = system(\"/bin/sh\") */",
  ], { size: 11 });
  tile(s, 0.5, 5.4, 6.9, 1.4, { label: "VÌ SAO free(\"/bin/sh\") KHÔNG CRASH", body: "`__libc_free` kiểm tra hook trước `mem2chunk`; rdi chứa chuỗi và `system()` chỉ đọc đối số đầu (ABI x86-64).", bullet: false, size: 13 });
  table(s, [
    ["", "Sink A", "Sink B"],
    ["Mục tiêu", "con trỏ hàm của t", "__free_hook trong libc"],
    ["Cần leak", "Không", "libc base khi bật ASLR"],
    ["Kết quả", "gọi win()", "system(\"/bin/sh\")"],
    ["Sai địa chỉ", "—", "segfault hoặc unaligned tcache chunk"],
  ], 7.65, 1.55, 5.18, [1.3, 1.7, 2.18], { size: 12, boldFirst: true });
  tile(s, 7.65, 4.2, 5.18, 2.6, { line: RED, label: "GIỚI HẠN PHIÊN BẢN", lc: RED, body: [
    "Chỉ đi hết chuỗi trên glibc 2.26–2.28 (vd. `ubuntu:18.04`, glibc 2.27)",
    "≥ 2.29: free(h) lần 2 abort tại malloc.c:4201, không tới bước poisoning",
    "≥ 2.34: `__free_hook` bị gỡ, linker báo undefined reference",
  ], size: 13 });
}

// =====================================================================
// 03 KHAI THÁC
// =====================================================================
sec("04 Kỹ thuật khai thác");
divider("04", "Kỹ thuật khai thác", "Yêu cầu 5 · tcache poisoning, biến thể hiện đại, mối liên hệ lỗ hổng · CWE · CVE",
  ["6.1  Cơ chế ghi next", "6.1  Quy trình 4 bước", "6.2  Mục tiêu thực tế", "6.3  Metadata attack", "6.4  Biến thể khác (ngoài phạm vi)", "     Chuỗi khai thác"]);
{
  const s = S("Tcache poisoning: ghi đè next để điều hướng malloc()", "6.1 · KHÔNG FREE TRÙNG NỮA — GHI ĐÈ next CỦA CHUNK ĐÃ FREE");
  tile(s, 0.5, 1.55, 12.33, 1.1, { label: "Ý TƯỞNG", body: "Mục 5.4 cho thấy từ 2.29 free trùng trực tiếp bị chặn. Để malloc() vẫn trả về địa chỉ tự chọn: free một chunk cùng size class với mục tiêu, ghi next trỏ thẳng tới địa chỉ muốn (đúng kỹ thuật Sink A/B ở 5.5 làm bằng tay), rồi malloc() hai lần — lần 2 nhận chunk tại địa chỉ đã chọn (arbitrary allocation).", bullet: false, size: 13.5 });
  box(s, 0.5, 2.85, 7.2, 2.3, AMB, AMB);
  s.addText("2.32+ — CÔNG THỨC SAFE-LINKING", { x: 0.75, y: 3.03, w: 6.7, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: BG, margin: 0, isTextBox: true });
  s.addText([{ text: "stored_next = target ^", options: { breakLine: true } }, { text: "  (address_of_next_field >> 12)" }],
    { x: 0.75, y: 3.35, w: 6.8, h: 0.85, fontSize: 17, fontFace: MONO, bold: true, color: BG, valign: "top", margin: 0, isTextBox: true });
  s.addText("Không biết địa chỉ heap thì không tính được giá trị mã hoá hợp lệ.", { x: 0.75, y: 4.25, w: 6.75, h: 0.75, fontSize: 13, color: BG, valign: "top", margin: 0, isTextBox: true });
  tile(s, 7.95, 2.85, 4.88, 2.3, { line: RED, lc: RED, label: "VÌ SAO SINK A/B (5.5) CHỈ CHẠY TRỌN TRÊN 2.26–2.28", body: "Trước safe-linking: ghi next trần vẫn qua được. Từ 2.32+ phải có heap leak mới tạo được giá trị mã hoá hợp lệ.", bullet: false, size: 13 });
  const w = (12.33 - 0.25) / 2;
  tile(s, 0.5, 5.4, w, 1.4, { label: "MALLOC() KIỂM TRA ALIGNMENT", body: "target sai căn chỉnh → abort `malloc(): unaligned tcache chunk detected` trước khi dữ liệu bị chạm tới.", bullet: false, size: 13 });
  tile(s, 0.5 + w + 0.25, 5.4, w, 1.4, { label: "2.34+ — BỎ __malloc_hook/__free_hook", body: "Ghi đè hook như Sink B (5.5) chỉ còn áp dụng cho target glibc cũ.", bullet: false, size: 13 });
}
{
  const s = S("Quy trình: từ chunk đã free tới arbitrary allocation", "6.1 · 4 BƯỚC THEO THỨ TỰ");
  const st = [
    "free() một chunk cùng size class với mục tiêu",
    "Ghi next trỏ thẳng tới địa chỉ muốn (2.32+: phải mã hoá theo công thức safe-linking)",
    "malloc() lần 1 — tiêu thụ entry bị hỏng",
    "malloc() lần 2 — nhận đúng chunk tại địa chỉ đã chọn (arbitrary allocation)",
  ];
  const w = (12.33 - 3 * 0.25) / 4;
  st.forEach((t, i) => {
    const x = 0.5 + i * (w + 0.25), f = i === 3 ? AMB : TILE;
    box(s, x, 1.55, w, 2.8, f, f === TILE ? BRD : f);
    s.addText(String(i + 1), { x: x + 0.18, y: 1.7, w: w - 0.36, h: 0.7, fontSize: 36, bold: true, color: f === AMB ? BG : AMB, fontFace: "Arial", margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.18, y: 2.5, w: w - 0.36, h: 1.75, fontSize: 13, color: f === AMB ? BG : TX, valign: "top", margin: 0, isTextBox: true });
    if (i < st.length - 1) arrow(s, x + w + 0.03, 2.95, x + w + 0.22, 2.95);
  });
  code(s, 0.5, 4.65, 6.9, 2.15, [
    "// glibc 2.32+: giá trị thật ghi vào next (bước 2)",
    "!fake_next = target ^ (address_of_victim_next_field >> 12)",
    "",
    "// bước 3-4: tiêu thụ entry rồi nhận chunk đích",
    "malloc(n);          /* lần 1 */",
    "p = malloc(n);      /* lần 2: p == target */",
  ], { size: 11, cap: "MÃ HOÁ CON TRỎ THEO SAFE-LINKING (6.1)" });
  tile(s, 7.65, 4.65, 5.18, 2.15, { line: RED, lc: RED, label: "2.29–2.31: VẪN LỌT ĐƯỢC KHÔNG CẦN SAFE-LINKING", body: "Ghi đè key (qua UAF) để bypass kiểm tra key == tcache ở _int_free (5.4), hoặc lấp đầy tcache bin để chunk rơi xuống fastbin rồi free xen kẽ.", bullet: false, size: 13 });
}
{
  const s = S("Mục tiêu thực tế của kỹ thuật", "6.2 · MALLOC() TRẢ VỀ ĐỊA CHỈ TỰ CHỌN ĐỂ LÀM GÌ");
  const w = (12.33 - 0.5) / 3;
  [["OBJECT KHÁC TRÊN HEAP", "Chunk trả về chồng lên một object khác trên heap → đọc/ghi tuỳ ý"],
   ["CẤU TRÚC TOÀN CỤC/ỨNG DỤNG", "Chồng lên cấu trúc toàn cục/ứng dụng → ghi đè con trỏ chương trình dùng về sau (Sink A, mục 5.5)"],
   ["FSOP / ROP", "Chồng lên cấu trúc dùng cho FSOP/ROP → chiếm luồng thực thi (Sink B, mục 5.5)"]]
    .forEach(([hd, b], i) => tile(s, 0.5 + i * (w + 0.25), 1.55, w, 2.6, { fill: i === 2 ? RED : TILE, lc: i === 2 ? RED : undefined, label: "MỤC TIÊU", head: hd, hs: 16, hh: 0.65, body: b, bullet: false, size: 13.5 }));
  tile(s, 0.5, 4.4, 12.33, 2.4, { fill: AMB, label: "ARBITRARY ALLOCATION", head: "Một cơ chế, nhiều đích khác nhau", hs: 20, hh: 0.45,
    body: "malloc() trả về chunk tại địa chỉ đã chọn là nguyên nhân gốc chung — hai PoC đã chạy ở mục 5.5 (Sink A, Sink B) là hai minh hoạ cụ thể của đúng hai mục tiêu giữa và cuối ở trên.", bullet: false, size: 14 });
}
{
  const s = S("Tcache metadata attack: chiếm cả size class", "6.3 · TCACHE_PERTHREAD_STRUCT Ở ĐẦU HEAP");
  tile(s, 0.5, 1.55, 5.0, 3.6, { label: "GHI ĐƯỢC VÀO STRUCT ĐẦU HEAP", body: [
    "Sửa `entries[idx]`: mọi `malloc()` cùng size class sau đó trả địa chỉ ta chọn",
    "Sửa `counts[idx]`: glibc tin bin còn chunk dù thực tế không có",
    "Điều khiển cả lớp kích thước thay vì một chunk đơn lẻ",
  ], size: 14, space: 8 });
  box(s, 0.5, 5.4, 5.0, 1.4, CODE, BRD);
  cell(s, 0.75, 5.65, 2.15, 0.9, "counts[64]", { size: 12 });
  cell(s, 3.1, 5.65, 2.15, 0.9, "entries[64]", { size: 12, fill: AMB });
  const w = (7.08 - 0.25) / 2, h = 2.5;
  [["House of Water", "Biến lỗi UAF/tràn thành quyền kiểm soát tcache_perthread_struct; hướng hiện đại khi safe-linking làm khó việc sửa free list"],
   ["Safe-link double protect", "Sắp xếp con trỏ để các mặt nạ XOR triệt tiêu; XOR hai lần chưa đủ vì mask sinh từ địa chỉ lưu trữ"],
   ["Tcache relative write", "Làm hỏng `mp_.tcache_bins` khiến tc_idx vượt phạm vi, ghi metadata ra ngoài vùng heap dự kiến"],
   ["Metadata hijacking 2.42", "Struct có thể khởi tạo muộn; tràn/UAF trên chunk lớn phía trước ghi thẳng vào entries[]"]]
    .forEach(([hd, b], i) => tile(s, 5.75 + (i % 2) * (w + 0.25), 1.55 + Math.floor(i / 2) * (h + 0.25), w, h, { label: "BIẾN THỂ", head: hd, hs: 16, hh: 0.4, body: b, bullet: false, size: 13 }));
}
{
  const s = S("Biến thể hiện đại khác (ngoài trọng tâm double free)", "6.4 · CHỈ NÊU TÊN ĐỂ BIẾT HƯỚNG TRA CỨU TIẾP");
  tile(s, 0.5, 1.55, 12.33, 1.5, { label: "KHI DOUBLE FREE ĐÃ BỊ CHẶN HOÀN TOÀN", body: "Cần một primitive gốc khác (overflow, UAF do nguyên nhân khác) để vẫn làm hỏng được tcache — các kỹ thuật dưới không còn dựa trực tiếp vào free() kép, nằm ngoài trọng tâm \"double free\" của seminar này.", bullet: false, size: 14 });
  const w = (12.33 - 0.5) / 3, h = 2.0;
  [["House of Botcake", "Consolidation với unsorted bin: chunk vừa nằm trong tcache vừa thuộc vùng free lớn hơn, ghi được vào vùng chồng lấn dù tcache đã chặn free trùng trực tiếp."],
   ["Tcache stashing unlink attack", "Làm hỏng bk của smallbin trước khi glibc tự chuyển chunk sang tcache, khiến nó nhét một chunk giả vào tcache thay vì ghi next trực tiếp."],
   ["Bypass safe-linking", "Leak heap base (đọc/in chunk tcache đã free, hoặc overlap/UAF khác) rồi tự mã hoá next theo công thức ở 6.1, thay vì ghi next trần."]]
    .forEach(([hd, b], i) => tile(s, 0.5 + i * (w + 0.25), 3.3, w, h, { label: "BIẾN THỂ", head: hd, hs: 15, hh: 0.55, body: b, bullet: false, size: 12.5 }));
  tile(s, 0.5, 5.55, 12.33, 1.25, { fill: AMB, body: "Chi tiết: how2heap (shellphish) — mục Tài liệu tham khảo. Không phải phạm vi demo ở phần 05.", bullet: false, size: 14 });
}
{
  const s = S("Lỗ hổng · CWE · kỹ thuật · CVE liên hệ thế nào", "YÊU CẦU 5 · CHUỖI KHAI THÁC");
  const names = ["Double free", "Alias hai con trỏ (UAF)", "Tcache poisoning", "Ghi tuỳ ý", "Chiếm luồng thực thi"];
  const caps = ["free() lần 2", "malloc() trả 2 lần", "sửa next / key", "chunk tại &t, &__free_hook", "win(), system()"];
  const bw = 2.14;
  names.forEach((n, i) => {
    const x = 0.5 + i * (bw + 0.405);
    cell(s, x, 1.55, bw, 1.2, n, { mono: false, size: 15, fill: i === 4 ? RED : i === 0 ? AMB : CODE, line: i === 4 ? RED : i === 0 ? AMB : BRD, round: true });
    s.addText(caps[i], { x, y: 2.85, w: bw, h: 0.4, fontSize: 11, fontFace: MONO, color: DIM, align: "center", margin: 0, isTextBox: true });
    if (i < 4) arrow(s, x + bw + 0.04, 2.15, x + bw + 0.37, 2.15);
  });
  const w = (12.33 - 0.75) / 4;
  [["LỖ HỔNG (TRONG MÃ)", "Lỗi cụ thể", "`free()` hai lần cùng địa chỉ do quyền sở hữu vùng nhớ không rõ (5.2)"],
   ["PHÂN LOẠI", "CWE-415", "Tên chung cho lớp lỗi; liên quan CWE-416 (UAF) và CWE-362 (race)"],
   ["KHAI THÁC", "tcache dup → poisoning", "Biến lỗi thành primitive: arbitrary allocation, ghi đè hook/con trỏ hàm, FSOP"],
   ["THỰC TẾ", "CVE", "Mỗi CVE là một lỗi CWE-415 cụ thể trong sản phẩm: IKEEXT, mod_http2, Windows Kernel"]]
    .forEach(([l, hd, b], i) => tile(s, 0.5 + i * (w + 0.25), 3.55, w, 3.25, { label: l, head: hd, hs: 18, hh: 0.75, body: b, bullet: false, size: 13.5 }));
}

// =====================================================================
// 04 DEMO
// =====================================================================
sec("05 Demo");
divider("05", "Demo khai thác", "Yêu cầu 6 · PoC Sink A / Sink B trên glibc 2.27, hai hướng: thủ công và có AI hỗ trợ",
  ["Môi trường cô lập", "Hướng 1: thủ công", "Hướng 2: có AI hỗ trợ"]);
{
  const s = S("Môi trường demo cô lập", "YÊU CẦU 6 · MỤC TIÊU: POC SINK A / SINK B (5.5)");
  code(s, 0.5, 1.55, 6.6, 3.1, [
    "# Dockerfile",
    "FROM ubuntu:18.04",
    "RUN apt-get update && apt-get install -y gcc gdb",
    "",
    "docker build -t hdf-lab .",
    "docker run --rm -it --network none \\",
    "    -v \"$PWD\":/w -w /w hdf-lab",
    "ldd --version | head -1      # GLIBC 2.27",
    "gcc -g -o sinkA sinkA.c && ./sinkA AAAA",
  ], { size: 11, cap: "[Máy demo] container glibc 2.27, không mạng" });
  tile(s, 0.5, 4.9, 6.6, 1.9, { label: "AN TOÀN", body: [
    "Chỉ chạy PoC tự viết trong container, `--network none`",
    "Không đụng hệ thống thật hay dịch vụ bên ngoài",
  ], size: 14 });
  tile(s, 7.35, 1.55, 5.48, 2.4, { fill: AMB, label: "MONG ĐỢI TRÊN GLIBC 2.27", body: [
    "Sink A in `[win] chiem duoc luong thuc thi qua tcache poisoning` rồi mở `/bin/sh`",
    "Sink B mở shell qua `system(\"/bin/sh\")`",
  ], size: 13.5 });
  tile(s, 7.35, 4.2, 5.48, 2.6, { line: RED, lc: RED, cc: RED, label: "NHÁNH HỎNG HAY GẶP", body: [
    "glibc ≥ 2.29: `free(): double free detected in tcache 2`",
    "glibc ≥ 2.34, Sink B: `undefined reference` tới `__free_hook`",
    "Sai địa chỉ hook: segfault hoặc `malloc(): unaligned tcache chunk detected`",
  ], size: 12.5 });
}
{
  const s = S("Hướng 1: phân tích thủ công bằng gdb", "YÊU CẦU 6 · QUAN SÁT TCACHE TRỰC TIẾP TRONG BỘ NHỚ");
  code(s, 0.5, 1.55, 6.6, 5.25, [
    "(gdb) break free",
    "(gdb) run AAAA",
    "(gdb) finish             # về main sau mỗi free",
    "(gdb) p h",
    "(gdb) x/2gx h            # qword 1 = next, 2 = key",
    "",
    "# sau free(h) lần 2",
    "!(gdb) x/2gx h            # next == h: self-loop",
    "",
    "(gdb) watch *(long *)h   # bắt UAF write",
    "(gdb) continue",
    "!(gdb) x/2gx h            # next == t: poisoned",
    "",
    "(gdb) p fake == t        # malloc #2 trả về t",
    "(gdb) p t->action        # = win",
  ], { size: 11.5, cap: "[Trong container] gdb ./sinkA" });
  const st = [
    ["1 · KHOANH VÙNG", "Đọc source, tìm free(h) không NULL hoá; tính 248 → chunk 0x100 → idx 14"],
    ["2 · QUAN SÁT SELF-LOOP", "Sau free(h) lần 2, qword đầu của h bằng chính địa chỉ h"],
    ["3 · QUAN SÁT POISONING", "Sau `*(struct target **)h = t`, qword đầu đổi thành địa chỉ t"],
    ["4 · XÁC NHẬN CHIẾM LUỒNG", "malloc #2 trả về đúng t; t->action = win, chương trình in [win]"],
  ];
  st.forEach(([l, b], i) => tile(s, 7.35, 1.55 + i * 1.375, 5.48, 1.125, { label: l, body: b, bullet: false, size: 13, fill: i === 3 ? AMB : TILE }));
}
{
  const s = S("Hướng 2: phân tích có AI hỗ trợ", "YÊU CẦU 6 · AI ĐỀ XUẤT, NGƯỜI KIỂM CHỨNG");
  const flow = ["Đưa source / binary cho AI (Claude Code, Ghidra qua ReVa MCP)", "AI chỉ ra cặp free trùng, size class, đường poisoning", "AI sinh script gdb / PoC", "Người chạy lại trong container, đối chiếu bộ nhớ"];
  const w = 2.78;
  flow.forEach((t, i) => {
    const x = 0.5 + i * (w + 0.405);
    cell(s, x, 1.55, w, 1.55, t, { mono: false, bold: false, size: 14, fill: i === 3 ? AMB : CODE, line: i === 3 ? AMB : BRD, round: true });
    if (i < 3) arrow(s, x + w + 0.04, 2.32, x + w + 0.37, 2.32);
  });
  table(s, [
    ["Tiêu chí", "Thủ công", "Có AI hỗ trợ"],
    ["Khoanh vùng lỗi", "Đọc source, đặt breakpoint từng free()", "Hỏi AI dò cặp free không NULL hoá, tính size class"],
    ["Hiểu cơ chế", "Tự thấy next / key đổi trong bộ nhớ", "Có giải thích nhanh, dễ bỏ qua chi tiết"],
    ["Rủi ro", "Chậm, dễ nhầm offset", "AI có thể đoán sai phiên bản glibc, offset, địa chỉ"],
    ["Kiểm chứng", "gdb trực tiếp", "Bắt buộc chạy lại trong gdb trước khi tin kết quả"],
  ], 0.5, 3.4, 12.33, [2.4, 4.6, 5.33], { size: 13, boldFirst: true });
}

// =====================================================================
// 05 ĐIỀU KIỆN & BẢO VỆ
// =====================================================================
sec("06 Điều kiện và cơ chế bảo vệ");
divider("06", "Điều kiện & cơ chế bảo vệ", "Yêu cầu 8 · cần gì để đi hết chuỗi, lớp nào chặn ở đâu, vì sao vẫn có CVE",
  ["7.1  Điều kiện cần", "7.2  Bảo vệ theo tầng", "7.3  Vì sao vẫn có CVE"]);
{
  const s = S("Điều kiện để chuỗi khai thác đi hết", "YÊU CẦU 8 · 7.1 · PHẢI THOẢ ĐỒNG THỜI");
  box(s, 0.5, 1.55, 12.33, 0.8, CODE, BRD);
  s.addText("double free → UAF → tcache poisoning → ghi tuỳ ý → chiếm luồng thực thi", { x: 0.7, y: 1.55, w: 11.9, h: 0.8, fontSize: 16, fontFace: MONO, bold: true, color: AMB, valign: "middle", margin: 0, isTextBox: true });
  table(s, [
    ["Điều kiện", "Vì sao cần"],
    ["Chunk bị free và chunk mục tiêu cùng size class", "tcache/fastbin không coalesce, mỗi bin chỉ phục vụ đúng một khoảng size (mục 4)"],
    ["Có primitive ghi vào chunk đã free (UAF hoặc overflow)", "để sửa next/key của tcache_entry; double free chỉ tạo ra UAF, không tự ghi được gì"],
    ["Biết hoặc leak được địa chỉ heap, nếu glibc ≥ 2.32", "safe-linking mã hoá next theo địa chỉ lưu trữ; không có leak thì không tạo được giá trị hợp lệ"],
    ["Kiểm soát được thứ tự malloc() kế tiếp", "entry bị poison phải được tiêu thụ đúng lúc, không bị malloc() khác cùng size class chen ngang"],
    ["Chunk tại địa chỉ đích overlap với structure có giá trị", "con trỏ hàm, GOT entry, FILE/_IO_* (FSOP); overlap dữ liệu trơ chỉ dừng ở leak/corrupt"],
  ], 0.5, 2.6, 12.33, [4.8, 7.53], { size: 13 });
}
{
  const s = S("Cơ chế bảo vệ theo tầng (1/2)", "YÊU CẦU 8 · 7.2 · ALLOCATOR VÀ OS");
  table(s, [
    ["Tầng", "Cơ chế", "Chặn gì trong chuỗi", "Giới hạn còn lại / cách lọt"],
    ["Allocator (glibc)", "tcache key (2.29+), safe-linking (2.32+), bỏ hook (2.34+), kiểm tra alignment", "Free trùng trực tiếp; giả mạo next không mã hoá; ghi đè hook để nhảy thực thi", "Vẫn lọt nếu có leak heap hoặc overflow đủ lớn để tạo UAF khác"],
    ["OS / loader", "ASLR: random vị trí heap, libc, stack mỗi lần chạy", "Không đoán được địa chỉ tuyệt đối để tính mask hoặc trỏ tới hàm libc", "Chỉ cần leak một địa chỉ là suy ra các offset còn lại: tăng chi phí, không chặn"],
    ["OS / loader", "PIE: code base của binary cũng bị random", "ROP gadget trong binary không còn ở địa chỉ tĩnh", "Cần thêm info leak cho code base"],
    ["CPU / OS", "NX/DEP: stack, heap không executable", "Không nhảy thẳng vào shellcode trên heap/stack", "Buộc chuyển sang ROP hoặc FSOP: đổi hướng kỹ thuật, không chặn hẳn"],
  ], 0.5, 1.55, 12.33, [1.75, 3.3, 3.5, 3.78], { size: 12.5, boldFirst: true });
}
{
  const s = S("Cơ chế bảo vệ theo tầng (2/2)", "YÊU CẦU 8 · 7.2 · LINKER, COMPILER, RUNTIME");
  table(s, [
    ["Tầng", "Cơ chế", "Chặn gì trong chuỗi", "Giới hạn còn lại / cách lọt"],
    ["Linker", "RELRO (Partial/Full)", "Full RELRO: GOT read-only sau khi resolve, chặn ghi đè GOT cổ điển", "Không ảnh hưởng hook overwrite (glibc < 2.34) hay FSOP"],
    ["Compiler", "Stack canary, _FORTIFY_SOURCE", "FORTIFY có thể bắt một số overflow (vd. strcpy tràn) trước khi tạo UAF", "Không bắt lỗi logic thuần: free hai lần một con trỏ hợp lệ"],
    ["Runtime / deploy", "seccomp, sandbox, service quyền thấp", "Giới hạn syscall/tài nguyên sau khi đã chiếm luồng", "Không ngăn khai thác heap; CVE-2026-33824 chạy trong context SYSTEM"],
  ], 0.5, 1.55, 12.33, [1.75, 3.0, 3.8, 3.78], { size: 12.5, boldFirst: true });
  tile(s, 0.5, 5.0, 12.33, 1.8, { fill: AMB, label: "DEFENSE IN DEPTH", body: "Các lớp độc lập nhau theo thiết kế: attacker phải vượt gần hết cùng lúc. Nhưng chỉ một lớp bị tắt hoặc cấu hình sai (binary không PIE, tắt ASLR để debug) là độ khó của cả chuỗi giảm hẳn.", bullet: false, size: 15 });
}
{
  const s = S("Vì sao vẫn có CVE dù đủ lớp bảo vệ", "7.3 · TÁC ĐỘNG KHÁC ĐIỀU KIỆN KHAI THÁC");
  tile(s, 0.5, 1.55, 5.6, 5.25, { fill: AMB, label: "KẾT LUẬN PHẦN 05", head: "Bảo vệ tăng chi phí, không xoá lớp lỗi", hs: 24, hh: 1.3,
    body: "Allocator chặn double free trực tiếp thì attacker chuyển sang tcache poisoning. Có chunk tại địa chỉ tuỳ ý cũng chưa phải chiếm luồng: còn ASLR, PIE, NX, RELRO. Nhưng khi điều kiện ở 7.1 thoả trong một triển khai cụ thể, chuỗi vẫn đi hết.", bullet: false, size: 15 });
  [["CVE-2026-23918", "Cần thêm info leak và heap spray trước khi có RCE, đúng như dự đoán: ASLR chỉ tăng chi phí"],
   ["CẤU HÌNH TRIỂN KHAI", "Điều kiện RCE phụ thuộc APR dùng mmap allocator, không chỉ phụ thuộc bản thân lỗi"],
   ["CÁCH ĐỌC PHẦN 06", "Tách rõ Tác động (worst case) và Điều kiện khai thác (khi nào worst case đạt được)"]]
    .forEach(([l, b], i) => tile(s, 6.35, 1.55 + i * 1.83, 6.48, 1.59, { label: l, body: b, bullet: false, size: 14 }));
}

// =====================================================================
// 06 CVE
// =====================================================================
sec("07 CVE thực tế");
divider("07", "CVE thực tế 2025–2026", "Yêu cầu 4 · sản phẩm, nguyên nhân, tác động, điều kiện khai thác, khắc phục",
  ["CVE-2026-33824", "CVE-2026-23918", "CVE-2025-62215", "Điểm chung"]);
{
  const s = S("Ba CVE double free đã bị khai thác thực tế", "YÊU CẦU 4 · CWE-415 · 2025–2026");
  const w = (12.33 - 0.5) / 3;
  [["2026 · WINDOWS IKE EXTENSION", "CVE-2026-33824", "9.8", "Critical", "double free → RCE từ xa không xác thực", "Đã khai thác · CISA KEV 18/8/2026", RED],
   ["2026 · APACHE HTTPD 2.4.66", "CVE-2026-23918", "8.8", "High", "double free trong mod_http2 → DoS/RCE", "Đã khai thác DoS thực tế", AMB],
   ["2025 · WINDOWS KERNEL", "CVE-2025-62215", "7.0", "High", "race condition → double free → EoP", "Đã khai thác · CISA KEV 12/11/2025", AMB]]
    .forEach(([l, id, sc, sev, ch, st, col], i) => {
      const x = 0.5 + i * (w + 0.25);
      box(s, x, 1.55, w, 5.25, TILE, BRD);
      s.addText(l, { x: x + 0.25, y: 1.8, w: w - 0.5, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
      s.addText(id, { x: x + 0.25, y: 2.15, w: w - 0.5, h: 0.45, fontSize: 20, bold: true, fontFace: MONO, color: TX, margin: 0, isTextBox: true });
      s.addText(sc, { x: x + 0.25, y: 2.75, w: w - 0.5, h: 1.3, fontSize: 72, bold: true, fontFace: "Arial", color: col, margin: 0, isTextBox: true });
      s.addText("CVSS · " + sev, { x: x + 0.25, y: 4.05, w: w - 0.5, h: 0.35, fontSize: 14, bold: true, color: DIM, margin: 0, isTextBox: true });
      s.addText(ch, { x: x + 0.25, y: 4.6, w: w - 0.5, h: 0.9, fontSize: 15, color: TX, valign: "top", margin: 0, isTextBox: true });
      s.addText(st, { x: x + 0.25, y: 5.75, w: w - 0.5, h: 0.8, fontSize: 13, color: col, bold: true, valign: "top", margin: 0, isTextBox: true });
    });
}
{
  const s = S("CVE-2026-33824 · Windows IKE Extension", "YÊU CẦU 4 · CWE-415 · CVSS 3.1 = 9.8 CRITICAL");
  tile(s, 0.5, 1.55, 4.0, 2.5, { fill: AMB, label: "SẢN PHẨM BỊ ẢNH HƯỞNG", body: "`ikeext.dll`, dịch vụ IKEEXT (nền tảng IPsec/IKEv2 VPN) trên Windows 10/11 và Windows Server 2016–2025 chưa vá", bullet: false, size: 13.5 });
  box(s, 0.5, 4.3, 4.0, 2.5, TILE, BRD);
  s.addText("PHÂN LOẠI", { x: 0.7, y: 4.48, w: 3.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText("CWE-415", { x: 0.7, y: 4.8, w: 3.6, h: 0.7, fontSize: 32, bold: true, color: TX, fontFace: "Arial", margin: 0, isTextBox: true });
  s.addText("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", { x: 0.7, y: 5.65, w: 3.6, h: 0.9, fontSize: 11, fontFace: MONO, color: DIM, valign: "top", margin: 0, isTextBox: true });
  tile(s, 4.75, 1.55, 4.04, 3.0, { label: "NGUYÊN NHÂN", body: "Khi lắp ghép thông điệp IKEv2 IKE_AUTH bị phân mảnh, con trỏ tới blob Security Realm (cấu trúc MMSA) bị sao chép nông sang PacketContext. Cả hai ngữ cảnh cùng free một vùng heap (phân tích của TrendAI/ZDI).", bullet: false, size: 13 });
  tile(s, 4.75, 4.8, 4.04, 2.0, { label: "ĐIỀU KIỆN KHAI THÁC", body: "Gửi IKE_SA_INIT có Security Realm Vendor ID tới UDP 500/4500, rồi các fragment IKE_AUTH (RFC 7383); lỗi xảy ra trước khi peer được xác thực", bullet: false, size: 12.5 });
  tile(s, 9.04, 1.55, 3.79, 2.5, { fill: RED, label: "TÁC ĐỘNG", body: "Crash IKEEXT hoặc thực thi mã trong context SYSTEM; RCE từ xa, không xác thực, không cần tương tác: wormable", bullet: false, size: 13 });
  tile(s, 9.04, 4.3, 3.79, 2.5, { line: GRN, lc: GRN, label: "KHẮC PHỤC", body: [
    "Bản vá Microsoft 4/2026 trở đi",
    "Chưa vá: chặn UDP 500/4500 với host không cần IKE, giới hạn peer tin cậy",
    "Không expose VPN/IPsec ra Internet khi không cần",
  ], size: 12 });
}
{
  const s = S("CVE-2026-23918 · Apache HTTP Server mod_http2", "YÊU CẦU 4 · CWE-415 · CVSS 8.8 HIGH");
  tile(s, 0.5, 1.55, 4.0, 2.5, { fill: AMB, label: "SẢN PHẨM BỊ ẢNH HƯỞNG", body: "Apache HTTP Server 2.4.66, `mod_http2`, MPM đa luồng worker/event; prefork không bị ảnh hưởng", bullet: false, size: 13.5 });
  tile(s, 0.5, 4.3, 4.0, 2.5, { line: GRN, lc: GRN, label: "KHẮC PHỤC", body: [
    "Nâng lên 2.4.67",
    "Tạm thời tắt `mod_http2`",
    "Chỉ 2.4.66 bị ảnh hưởng; 2.4.65 và từ 2.4.67 an toàn",
  ], size: 13 });
  box(s, 4.75, 1.55, 4.04, 5.25, TILE, BRD);
  s.addText("NGUYÊN NHÂN (h2_mplx.c)", { x: 4.95, y: 1.73, w: 3.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  const fl = ["HEADERS rồi RST_STREAM (mã ≠ 0) trước khi mplx đăng ký stream", "on_frame_recv_cb và on_stream_close_cb", "cả hai gọi h2_mplx_c1_client_rst", "m_stream_cleanup đẩy cùng h2_stream vào mảng cleanup 2 lần", "h2_stream_destroy free lần 2"];
  fl.forEach((t, i) => {
    const y = 2.15 + i * 0.92;
    cell(s, 5.0, y, 3.54, 0.68, t, { size: 10.5, fill: i === 4 ? RED : CODE, line: i === 4 ? RED : BRD, bold: i === 4 });
    if (i < 4) arrow(s, 6.77, y + 0.68, 6.77, y + 0.92);
  });
  tile(s, 9.04, 1.55, 3.79, 3.0, { fill: RED, label: "TÁC ĐỘNG", body: [
    "DoS từ xa: 1 kết nối TCP, 2 frame, không xác thực",
    "RCE khi APR dùng mmap allocator: fake h2_stream, trỏ cleanup của pool tới system(), payload ở scoreboard",
  ], size: 12 });
  tile(s, 9.04, 4.8, 3.79, 2.0, { label: "ĐIỀU KIỆN KHAI THÁC", body: [
    "HTTP/2 bật + MPM đa luồng",
    "RCE cần thêm info leak và heap spray (đã chứng minh trong lab)",
  ], size: 12.5 });
}
{
  const s = S("CVE-2025-62215 · Windows Kernel", "YÊU CẦU 4 · CWE-362 + CWE-415 · CVSS 3.1 = 7.0 HIGH");
  box(s, 0.5, 1.55, 6.04, 5.25, TILE, BRD);
  s.addText("RACE CONDITION → DOUBLE FREE", { x: 0.7, y: 1.73, w: 5.6, h: 0.25, fontSize: 10, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  cell(s, 0.8, 2.3, 2.4, 0.7, "Thread A", { fill: CODE });
  cell(s, 3.8, 2.3, 2.4, 0.7, "Thread B", { fill: CODE });
  arrow(s, 2.0, 3.0, 2.0, 3.4); arrow(s, 5.0, 3.0, 5.0, 3.4);
  cell(s, 0.8, 3.4, 2.4, 0.7, "free(obj)", { fill: CODE, line: RED, color: RED });
  cell(s, 3.8, 3.4, 2.4, 0.7, "free(obj)", { fill: CODE, line: RED, color: RED });
  arrow(s, 2.0, 4.1, 3.0, 4.6, RED); arrow(s, 5.0, 4.1, 4.0, 4.6, RED);
  cell(s, 2.2, 4.6, 2.6, 0.8, "kernel object", { fill: RED });
  s.addText("Đồng bộ sai: cả hai thread cùng thấy object còn sống và cùng giải phóng nó", { x: 0.8, y: 5.65, w: 5.45, h: 0.95, fontSize: 13, color: DIM, valign: "top", align: "center", margin: 0, isTextBox: true });
  const w = (6.04 - 0.25) / 2;
  tile(s, 6.79, 1.55, w, 1.6, { label: "SẢN PHẨM", body: "Windows Kernel: Windows 10/11, Server 2019–2025 chưa vá", bullet: false, size: 12.5 });
  tile(s, 6.79 + w + 0.25, 1.55, w, 1.6, { fill: RED, label: "TÁC ĐỘNG", body: "Leo quyền cục bộ lên SYSTEM; bị khai thác dạng zero-day", bullet: false, size: 12.5 });
  tile(s, 6.79, 3.4, 6.04, 1.6, { label: "NGUYÊN NHÂN", body: "Đồng bộ sai tài nguyên dùng chung trong kernel (race condition), cho phép cùng một đối tượng kernel bị giải phóng hai lần", bullet: false, size: 13 });
  tile(s, 6.79, 5.25, w, 1.55, { label: "ĐIỀU KIỆN", body: "User cục bộ quyền thấp; phải thắng race, thử lặp nhiều lần", bullet: false, size: 12.5 });
  tile(s, 6.79 + w + 0.25, 5.25, w, 1.55, { line: GRN, lc: GRN, label: "KHẮC PHỤC", body: "Bản vá Patch Tuesday 11/2025; theo dõi CISA KEV", bullet: false, size: 12.5 });
}
{
  const s = S("Điểm chung của ba CVE", "YÊU CẦU 4–5 · CÙNG MỘT CHUỖI VỚI POC USERLAND");
  const st = ["Vùng nhớ / object bị giải phóng hai lần", "Allocator cấp lại cùng vùng cho hai mục đích", "Kẻ tấn công ghi đè cấu trúc / con trỏ", "Chiếm quyền thực thi"];
  const w = 2.78;
  st.forEach((t, i) => {
    const x = 0.5 + i * (w + 0.405);
    cell(s, x, 1.55, w, 1.3, t, { mono: false, size: 15, fill: i === 3 ? RED : CODE, line: i === 3 ? RED : BRD, round: true });
    if (i < 3) arrow(s, x + w + 0.04, 2.2, x + w + 0.37, 2.2);
  });
  table(s, [
    ["CVE", "Nguồn gốc free trùng", "Khớp mẫu ở 5.2", "Kết quả"],
    ["CVE-2026-33824", "Blob Security Realm sao chép nông sang PacketContext", "shallow copy", "RCE trong context SYSTEM"],
    ["CVE-2026-23918", "Hai callback cùng đẩy h2_stream vào mảng cleanup", "hai nơi cùng dọn dẹp", "DoS; RCE khi dùng mmap allocator"],
    ["CVE-2025-62215", "Race condition trên tài nguyên dùng chung trong kernel", "đa luồng / sai đồng bộ", "Leo quyền lên SYSTEM"],
  ], 0.5, 3.15, 12.33, [2.2, 4.6, 2.5, 3.03], { size: 13, boldFirst: true });
  tile(s, 0.5, 5.55, 12.33, 1.25, { fill: AMB, body: "Phần 08 không vá riêng từng CVE mà loại bỏ cả lớp lỗi CWE-415, ở nhiều tầng.", bullet: false, size: 16 });
}

// =====================================================================
// 07 KHẮC PHỤC
// =====================================================================
sec("08 Khắc phục và phòng ngừa");
divider("08", "Khắc phục & phòng ngừa", "Yêu cầu 7 · double free là lỗi quyền sở hữu vùng nhớ, chia theo tầng từ rẻ và sớm nhất",
  ["9.1  Mã nguồn", "9.2  Công cụ", "9.3  Allocator / runtime", "9.4  Hệ thống / vận hành", "9.5  Đối chiếu 3 CVE"]);
{
  const s = S("Tầng mã nguồn: ngăn lỗi phát sinh", "YÊU CẦU 7 · 9.1 · RẺ VÀ SỚM NHẤT");
  code(s, 0.5, 1.55, 5.0, 3.0, [
    "/* Sai */",
    "free(p);",
    "~free(p);          /* double free */",
    "",
    "/* Đúng */",
    "free(p);",
    "!p = NULL;",
    "free(p);          /* free(NULL): không làm gì */",
  ], { size: 11.5 });
  code(s, 0.5, 4.8, 5.0, 2.0, [
    "// C++: vòng đời do compiler quản lý",
    "!auto p = std::make_unique<Obj>();",
    "// ra khỏi scope: giải phóng đúng 1 lần",
  ], { size: 11.5 });
  const w = (7.08 - 0.25) / 2, h = 2.5;
  [["MỘT CON TRỎ, MỘT CHỦ SỞ HỮU", "Xác định rõ hàm/struct nào chịu trách nhiệm free; tránh copy nông (shallow copy) struct chứa con trỏ — đúng nguyên nhân CVE-2026-33824 (9.5), nên deep copy hoặc refcount"],
   ["GÁN NULL NGAY SAU FREE", "`free(NULL)` hợp lệ theo chuẩn C: cách rẻ nhất chặn phần lớn case thực tế"],
   ["MỘT NƠI DỌN DẸP", "Không free trong nhánh lỗi rồi free lại ở cleanup chung; chọn một trong hai"],
   ["C++ VÀ ĐA LUỒNG", "`unique_ptr`/`shared_ptr` thay con trỏ thô; nhiều thread thì refcount atomic hoặc lock quanh free (bài học CVE-2025-62215)"]]
    .forEach(([l, b], i) => tile(s, 5.75 + (i % 2) * (w + 0.25), 1.55 + Math.floor(i / 2) * (h + 0.25), w, h, { label: l, body: b, bullet: false, size: 14, fill: i === 1 ? AMB : TILE }));
}
{
  const s = S("Tầng công cụ: phát hiện trước khi ship", "YÊU CẦU 7 · 9.2");
  const w = (12.33 - 0.5) / 3, h = 2.5;
  [["AddressSanitizer", "`-fsanitize=address`: bắt double free/UAF khi chạy, in stack trace cả hai lần free; nên bật trong CI"],
   ["Valgrind memcheck", "`--tool=memcheck`: chậm hơn ASan nhưng không cần biên dịch lại"],
   ["MALLOC_CHECK_=3", "Kiểm tra heap runtime của glibc, nhẹ hơn ASan, dùng được với binary đã build sẵn"],
   ["Static analysis", "Clang Static Analyzer, Coverity, Cppcheck: bắt pattern tĩnh, hữu ích cho nhánh lỗi chưa có test"],
   ["Fuzzing + ASan", "libFuzzer, AFL++: hiệu quả nhất với double free chỉ lộ ra ở input hoặc lịch trình thread cụ thể"]]
    .forEach(([hd, b], i) => tile(s, 0.5 + (i % 3) * (w + 0.25), 1.55 + Math.floor(i / 3) * (h + 0.25), w, h, { label: "CÔNG CỤ", head: hd, hs: 18, body: b, bullet: false, size: 13.5 }));
  code(s, 0.5 + 2 * (w + 0.25), 4.3, w, 2.5, [
    "gcc -g -fsanitize=address \\",
    "    poc.c -o poc_asan",
    "./poc_asan AAAA",
    "!# ERROR: AddressSanitizer:",
    "!#   attempting double-free",
    "valgrind ./poc AAAA",
    "!# Invalid free()",
  ], { size: 11, cap: "MONG ĐỢI KHI CHẠY POC 5.5" });
}
{
  const s = S("Tầng allocator và tầng vận hành", "YÊU CẦU 7 · 9.3 · 9.4");
  s.addText("9.3 · GIẢM THIỆT HẠI KHI LỖI ĐÃ LỌT", { x: 0.5, y: 1.55, w: 6, h: 0.3, fontSize: 11, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText("9.4 · GIẢM BLAST RADIUS", { x: 6.79, y: 1.55, w: 6, h: 0.3, fontSize: 11, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  const L = [
    ["GLIBC HIỆN ĐẠI", "tcache key + safe-linking nâng chi phí khai thác, không thay được code đúng", TILE],
    ["HARDENED ALLOCATOR", "hardened_malloc, Scudo, tcmalloc dùng drop-in qua `LD_PRELOAD`, kiểm tra chặt hơn glibc", TILE],
    ["KHÔNG PHẢI PHÒNG NGỪA", "`tcache_count=0` chỉ để debug: tắt tcache không sửa lỗi logic, chỉ đổi đường đi", RED],
  ];
  L.forEach(([l, b, f], i) => tile(s, 0.5, 1.95 + i * 1.65, 6.04, 1.45, { label: l, body: b, bullet: false, size: 13.5, fill: f }));
  const R = [
    ["LUÔN BẬT", "ASLR, PIE, NX, Full RELRO ở production: không chặn double free nhưng tăng chi phí chuỗi"],
    ["GIẢM ATTACK SURFACE", "Không expose VPN/IPsec (33824) hay HTTP/2 (23918) ra Internet khi không cần"],
    ["PATCH MANAGEMENT", "Theo dõi CISA KEV/NVD: double free bị khai thác nhanh sau khi PoC công khai"],
    ["QUYỀN THẤP + SECCOMP", "Không ngăn khai thác heap, nhưng giới hạn hệ quả nếu chuỗi đi hết"],
  ];
  R.forEach(([l, b], i) => tile(s, 6.79, 1.95 + i * 1.235, 6.04, 1.06, { label: l, body: b, bullet: false, size: 12.5 }));
}
{
  const s = S("Đối chiếu với ba CVE ở phần 07", "YÊU CẦU 4 · 7 · 9.5 · TỔNG HỢP TỪ BA CASE THÀNH BIỆN PHÁP THEO TẦNG");
  table(s, [
    ["CVE", "Nguyên nhân gốc", "Biện pháp đúng tầng", "Vá chính thức"],
    ["CVE-2026-33824", "Shallow copy con trỏ Security Realm giữa MMSA/PacketContext", "Ownership rõ ràng / deep copy (9.1)", "Bản vá Microsoft 4/2026; tạm chặn UDP 500/4500"],
    ["CVE-2026-23918", "Hai callback độc lập cùng đẩy một h2_stream vào cleanup", "Một đường cleanup duy nhất, idempotent (9.1)", "Nâng Apache lên 2.4.67; tạm tắt mod_http2"],
    ["CVE-2025-62215", "Race condition giữa các luồng kernel cùng chạm một đối tượng", "Đồng bộ hoá free + refcount như một đơn vị (9.1)", "Patch Tuesday 11/2025 của Microsoft"],
  ], 0.5, 1.55, 12.33, [2.1, 4.1, 3.5, 2.63], { size: 12, boldFirst: true });
  tile(s, 0.5, 4.75, 12.33, 2.05, { fill: AMB, label: "KẾT LUẬN", head: "Lỗi không nằm ở một dòng free() lặp lại ngẫu nhiên", hs: 20, hh: 0.45,
    body: "Mà ở quyền sở hữu vùng nhớ không được quản lý tại một chỗ duy nhất khi nhiều ngữ cảnh (struct khác, callback khác, thread khác) cùng chạm tới nó. Biện pháp bền nhất luôn ở tầng 9.1; các tầng 9.2–9.4 chỉ giảm thiệt hại hoặc bắt lỗi sớm hơn, không thay được việc sửa đúng chỗ.", bullet: false, size: 14 });
}

// =====================================================================
// KẾT
// =====================================================================
sec("Kết");
{
  const s = S("Thuật ngữ nhanh", "10 · TRA CỨU KHI TRÌNH BÀY");
  const terms = [
    ["chunk", "Đơn vị cấp phát: header (prev_size, size) + user data"],
    ["arena", "Vùng quản lý heap; main arena dùng chung, thread có thể có arena phụ"],
    ["top chunk", "Phần heap chưa cấp phát còn lại ở cuối heap"],
    ["consolidation", "Gộp các chunk rảnh kề nhau (hoặc với top) khi free"],
    ["tcache_perthread_struct", "Metadata tcache mỗi thread (counts[], entries[]), thường ở đầu heap"],
    ["safe-linking", "Mã hoá next (2.32+): stored = ptr ^ (pos >> 12)"],
    ["PROTECT_PTR / REVEAL_PTR", "Macro mã hoá / giải mã con trỏ của safe-linking"],
    ["heap leak", "Rò rỉ địa chỉ heap/libc qua đọc/in dữ liệu chunk"],
    ["tcache poisoning", "Ghi đè next trong chunk đã free để điều hướng malloc()"],
    ["arbitrary allocation", "Khiến malloc() trả về chunk tại địa chỉ tuỳ ý"],
    ["FSOP", "Lợi dụng cấu trúc FILE/_IO_* để chiếm luồng thực thi"],
    ["use-after-free", "Dùng con trỏ sau khi vùng nhớ đã bị free"],
  ];
  const w = (12.33 - 0.75) / 4, h = (5.25 - 0.5) / 3;
  terms.forEach(([t, d], i) => tile(s, 0.5 + (i % 4) * (w + 0.25), 1.55 + Math.floor(i / 4) * (h + 0.25), w, h, { head: t, hm: true, hs: 13, hh: 0.45, tc: AMB, body: d, bullet: false, size: 12.5, bc: TX }));
}
{
  const s = S("Tài liệu tham khảo", "NGUỒN");
  const refs = [
    ["Malware for Beginners, phần 1 (blog cá nhân)", "https://nhan-laptop.github.io/posts/malware-binary/learning-Malware-for-beginner-part-1.html"],
    ["HackTricks: Double free", "https://hacktricks.wiki/en/binary-exploitation/libc-heap/double-free.html"],
    ["HackTricks: Bins & memory allocations", "https://hacktricks.wiki/en/binary-exploitation/libc-heap/bins-and-memory-allocations.html"],
    ["HackTricks: Tcache bin attack", "https://hacktricks.wiki/en/binary-exploitation/libc-heap/tcache-bin-attack.html"],
    ["OWASP: Doubly freeing memory", "https://owasp.org/www-community/vulnerabilities/Doubly_freeing_memory"],
    ["GeeksforGeeks: Memory Management in OS", "https://www.geeksforgeeks.org/operating-systems/memory-management-in-operating-system/"],
    ["how2heap (shellphish)", "https://github.com/shellphish/how2heap"],
    ["glibc Wiki: MallocInternals", "https://sourceware.org/glibc/wiki/MallocInternals"],
    ["Check Point Research: Safe-Linking", "https://research.checkpoint.com/2020/safe-linking-eliminating-a-20-year-old-malloc-exploit-primitive/"],
    ["corgi.rip: The House of Water", "https://corgi.rip/posts/leakless_heap_1/"],
    ["MITRE CWE-415: Double Free", "https://cwe.mitre.org/data/definitions/415.html"],
    ["MITRE CWE-416: Use After Free", "https://cwe.mitre.org/data/definitions/416.html"],
    ["NVD: CVE-2026-33824", "https://nvd.nist.gov/vuln/detail/CVE-2026-33824"],
    ["NVD: CVE-2026-23918", "https://nvd.nist.gov/vuln/detail/CVE-2026-23918"],
    ["NVD: CVE-2025-62215", "https://nvd.nist.gov/vuln/detail/CVE-2025-62215"],
    ["Microsoft MSRC: CVE-2026-33824", "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-33824"],
    ["ZDI (TrendAI): CVE-2026-33824 RCE in Windows IKEv2", "https://www.thezdi.com/blog/2026/4/22/cve-2026-33824-remote-code-execution-in-windows-ikev2"],
    ["Apache: HTTP Server 2.4 vulnerabilities", "https://httpd.apache.org/security/vulnerabilities_24.html"],
    ["Rescana: phân tích CVE-2026-23918", "https://www.rescana.com/post/critical-apache-http-server-2-4-66-vulnerability-cve-2026-23918-http-2-mod-http2-double-free-enables-dos-and-remote-code"],
    ["CISA: Known Exploited Vulnerabilities Catalog", "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"],
    ["glibc source (Bootlin Elixir)", "https://elixir.bootlin.com/glibc/glibc-2.26/"],
    ["glibc 2.27 malloc.c (bminor/glibc)", "https://github.com/bminor/glibc/blob/glibc-2.27/malloc/malloc.c"],
  ];
  const half = Math.ceil(refs.length / 2);
  [refs.slice(0, half), refs.slice(half)].forEach((col, c) => {
    const x = 0.5 + c * 6.29;
    box(s, x, 1.55, 6.04, 5.25, TILE, BRD);
    s.addText(col.map(([t, u], i) => ({ text: t, options: { hyperlink: { url: u }, color: TX, bullet: { indent: 12 }, breakLine: i < col.length - 1, paraSpaceAfter: 6 } })),
      { x: x + 0.2, y: 1.75, w: 5.64, h: 4.9, fontSize: 13, valign: "top", margin: 0, isTextBox: true });
  });
}
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: curSec });
  box(s, 0.5, 0.5, 7.9, 6.5, TILE, BRD);
  s.addText("NHÓM 12 · UIT", { x: 0.85, y: 0.9, w: 6, h: 0.35, fontSize: 13, fontFace: MONO, bold: true, color: AMB, margin: 0, isTextBox: true });
  s.addText([{ text: "Cảm ơn thầy cô", options: { breakLine: true } }, { text: "và các bạn", options: { color: AMB } }],
    { x: 0.85, y: 1.8, w: 7.3, h: 2.4, fontSize: 54, bold: true, color: TX, fontFace: "Arial", valign: "top", margin: 0, isTextBox: true });
  s.addText("Mỗi vùng nhớ chỉ được giải phóng đúng một lần: một con trỏ, một chủ sở hữu, free xong gán NULL.", { x: 0.85, y: 4.6, w: 7.2, h: 1.2, fontSize: 18, color: DIM, valign: "top", margin: 0, isTextBox: true });
  tile(s, 8.65, 0.5, 4.18, 3.1, { fill: AMB, label: "HỎI ĐÁP", head: "Q & A", hs: 54, hh: 1.2 });
  box(s, 8.65, 3.85, 4.18, 3.15, CODE, BRD);
  s.addText([
    { text: "double free", options: { breakLine: true } },
    { text: "  → UAF", options: { breakLine: true } },
    { text: "  → tcache poisoning", options: { breakLine: true } },
    { text: "  → ghi tuỳ ý", options: { breakLine: true } },
    { text: "  → chiếm luồng", options: { color: RED } },
  ], { x: 8.9, y: 4.1, w: 3.7, h: 2.7, fontSize: 15, fontFace: MONO, bold: true, color: AMB, valign: "top", margin: 0, isTextBox: true });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
