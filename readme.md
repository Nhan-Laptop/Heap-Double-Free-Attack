# Heap Double Free Attack

Phân tích lỗi giải phóng cùng một vùng nhớ nhiều lần, làm sai lệch trạng thái quản lý heap và có thể dẫn đến hành vi ngoài dự kiến. Trọng tâm là nguyên nhân, tác động và cách bảo đảm mỗi vùng nhớ chỉ được giải phóng đúng một lần.

## Yêu cầu

- Trình bày khái niệm, nguyên lý và điều kiện phát sinh của lỗ hổng.
- Xác định và giải thích mã CWE tương ứng.
- Nhận diện vị trí lỗ hổng trong mã nguồn hoặc binary và phân tích nguyên nhân gây ra lỗ hổng.
- Liên hệ ít nhất một CVE thực tế có liên quan, bao gồm sản phẩm bị ảnh hưởng, nguyên nhân, tác động, điều kiện khai thác và biện pháp khắc phục. (Phần CVE chỉ yêu cầu nghiên cứu và phân tích thông tin; không bắt buộc reproduce hoặc tái hiện việc khai thác CVE.)
- Giải thích chuỗi khai thác và mối liên hệ giữa lỗ hổng, CWE, CVE và kỹ thuật khai thác.
- Thực hiện demo giải 01 challenge CTF hoặc khai thác 1 lỗ hổng liên quan thuộc mảng Pwnable trong môi trường được cấp phép, cô lập và an toàn bằng 2 hướng: 1/ phương pháp thủ công; 2/ phương pháp có sự hỗ trợ của AI.
- Đề xuất biện pháp khắc phục hoặc phòng ngừa.
- Phân tích các điều kiện, cơ chế bảo vệ và giới hạn ảnh hưởng đến khả năng khai thác thành công.

## Stack và Heap

### Stack

Stack là vùng nhớ lưu biến local, tham số hàm (function parameters) và thông tin về function call (như return addresses).

- Stack hoạt động theo nguyên tắc LIFO — last in, first out (như stack trong cấu trúc dữ liệu).
- Call stack theo dõi các function call: mỗi lần một hàm được gọi, một stack frame được push vào stack; khi thoát khỏi hàm, frame đó được pop ra.
- Dữ liệu trên stack chỉ tồn tại trong thời gian hàm chạy. Stack tự mở rộng và thu hẹp theo lời gọi hàm và khi hàm trả về.
- Khi một hàm trả về, toàn bộ biến stack bị hủy và con trỏ stack (stack pointer) quay về vị trí cũ.
- Bạn không phải tự giải phóng bộ nhớ stack như với heap.
- Con trỏ (pointer) là biến lưu địa chỉ bộ nhớ. Có thể dùng con trỏ để trỏ tới dữ liệu trên stack, nhưng nếu trả về con trỏ tới một biến local thì con trỏ đó sẽ không còn hợp lệ sau khi hàm kết thúc.
- Stack có kích thước cố định do OS quy định (thường vài trăm KB đến vài MB cho mỗi tiến trình).
- Stack overflow xảy ra khi chương trình dùng nhiều bộ nhớ stack hơn mức được cấp.

### Heap

Heap là vùng nhớ lớn dùng cho cấp phát động, chứa dữ liệu mà kích thước hoặc thời điểm xuất hiện chỉ được biết khi chương trình chạy.

- Bạn tự cấp phát bộ nhớ trên heap bằng malloc/free.
- Vòng đời dữ liệu trên heap do người lập trình kiểm soát (hoặc garbage collector, với các ngôn ngữ có cơ chế quản lý bộ nhớ tự động).
- Heap thường lớn hơn stack. Các đối tượng, cấu trúc dữ liệu lớn (như mảng, danh sách liên kết) và dữ liệu cần chia sẻ giữa các hàm hoặc tồn tại lâu hơn một lần gọi hàm đều được lưu trên heap.
- Mỗi thread có stack riêng, nhưng heap dùng chung cho tất cả thread.

## Double free

Đầu tiên, cần biết bản chất lỗ hổng này xuất phát từ đâu:

Giải phóng bộ nhớ nhiều hơn một lần là hành vi không xác định (undefined behavior) và có thể làm hỏng trạng thái cấp phát. Trong glibc (thư viện GNU-C định nghĩa các API tiêu chuẩn, bọc syscall, quản lý bộ nhớ, khởi chạy/kết thúc tiến trình, đa luồng POSIX, sockets...), các bước kiểm tra và đường khai thác phụ thuộc vào phiên bản glibc, bin, chunk size và các cơ chế giảm thiểu rủi ro. Mẫu fastbin dup (duplication) cơ bản là `free(a); free(b); free(a)`: Fastbin ở các phiên bản cũ chỉ kiểm tra và loại bỏ bản trùng ở đầu danh sách, nên các lần `free` xen kẽ vẫn có thể thỏa mãn các bước kiểm tra. Đây không phải là cách bypass tổng quát — tcache có cơ chế phát hiện trùng lặp riêng, và các bản glibc mới còn dùng safe-linking cho singly linked list.

Bây giờ, khi bạn yêu cầu một vùng nhớ mới thông qua malloc, bộ cấp phát có thể trả về chính vùng nhớ đã được giải phóng hai lần. Điều này dẫn đến hai con trỏ cùng trỏ về một vùng nhớ. Nếu attacker kiểm soát được một trong hai con trỏ thì coi như kiểm soát cả vùng nhớ đó, dẫn tới nhiều hệ lụy như chèn malware hoặc thực thi shellcode.

### Điều kiện phát sinh

- **Cốt lõi:** `free()` được gọi hai lần lên cùng một địa chỉ, và giữa hai lần đó vùng nhớ không được cấp phát lại — tức con trỏ không bị set NULL sau `free()`, hoặc có hai con trỏ alias cùng trỏ về một vùng nhớ.
- **Các mẫu code điển hình:**
  - hai con trỏ alias: `p = q = malloc(...); free(p); free(q);`
  - nhánh xử lý lỗi đã `free()`, rồi nhánh cleanup chung `free()` lại
  - copy nông (shallow copy) struct/object chứa con trỏ
  - `free()` xong không NULL hóa → destructor/cleanup gọi lần hai
  - use-after-free (CWE-416) dẫn tới `free()` lần nữa
  - `realloc` hỏng rồi `free()` cả con trỏ cũ lẫn mới
  - đa luồng: hai thread cùng `free()` một object, hoặc sai refcount
- **Lọt qua allocator:** fastbin cũ chỉ so phần tử đầu danh sách; tcache (glibc ≥ 2.26) phát hiện qua `key` và duyệt list, nên phải né bằng cách lấp đầy tcache bin hoặc ghi đè `key`.
- **Nguyên nhân gốc:** quyền sở hữu vùng nhớ không rõ ràng hoặc không được quản lý tại một chỗ duy nhất.

Ví dụ:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUFSIZE1    512
#define BUFSIZE2    ((BUFSIZE1/2) - 8)

int main(int argc, char **argv) {
  char *i;
  char *h;
  char *j;

  i = (char *) malloc(BUFSIZE2);
  h = (char *) malloc(BUFSIZE2);

  free(i);
  free(h);

  j = (char *) malloc(BUFSIZE1);
  strncpy(j, argv[1], BUFSIZE1-1);

  free(h);
  free(j);
}
```

Trước tiên, `free(i)` và `free(h)` giải phóng hai chunk kích thước `BUFSIZE2` (< `BUFSIZE1`). Tiếp theo, `malloc(BUFSIZE1)` cấp phát `j`: vì `BUFSIZE1` lớn hơn hẳn nên `j` được lấy ở vùng khác (top chunk hoặc unsorted bin), hai chunk trong free list vẫn còn nguyên. Sau đó, `free(h)` lần thứ hai không bị phát hiện, khiến free list bị lặp — cùng một chunk xuất hiện hai lần:

```
h → i → h
```




## Tài liệu tham khảo

- Blog cá nhân — Learning Malware for Beginner (Part 1): https://nhan-laptop.github.io/posts/malware-binary/learning-Malware-for-beginner-part-1.html
- HackTricks — Double free: https://hacktricks.wiki/en/binary-exploitation/libc-heap/double-free.html
- OWASP — Doubly freeing memory: https://community.owasp.org/vulnerabilities/Doubly_freeing_memory
