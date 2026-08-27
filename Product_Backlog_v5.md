# Product Backlog v5 — Website Quảng bá và Đăng ký Khóa học

Thay thế `Product_Backlog_Website_Quang_ba_Dang_ky_Khoa_hoc_v4.pdf`.

Quy ước ngôn ngữ: tiêu đề và thuật ngữ kỹ thuật bằng tiếng Anh, nội dung chi tiết bằng
tiếng Việt.

---

## 1. Mục đích của bản viết lại

Nội dung nghiệp vụ của v4 phần lớn đúng. Vấn đề nằm ở **hình dạng của story**: chúng phụ
thuộc nhau quá dày nên ba người không chia việc song song được, và thứ tự ưu tiên có chỗ
ngược (một story P0 chờ một story P1).

v5 tối ưu cho **story độc lập, cắt dọc**. Tiêu chí kiểm tra áp cho từng story:

> **Demo được một mình trên staging.** Nếu phải chờ story khác mới nhìn thấy kết quả thì đó
> không phải một lát cắt — đó là một nửa lát cắt.

Vì vậy mỗi story có một dòng `Demo trên staging`. Nó vừa là bằng chứng độc lập, vừa là tiêu
chí nghiệm thu.

Phụ thuộc còn lại được ghi rõ và luôn là **chuỗi**, không phải mạng. Mỗi story ghi kèm
`Song song với` để chia việc.

### Bốn kỹ thuật đã dùng để gỡ phụ thuộc của v4

| Kỹ thuật                                      | Ví dụ cụ thể từ v4                                                                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cắt dọc thay vì cắt ngang**                 | v4 tách "US-011 Tạo khóa học" khỏi "US-002 Xem danh sách" — không cái nào demo được một mình. v5 gộp thành `US-101`: admin tạo, khách xem được, một lần demo.                                             |
| **Đơn giản hóa yêu cầu để xóa phụ thuộc**     | v4: trang chủ (P0, rank 1) cần "khóa nổi bật", mà quản lý nổi bật là P1 rank 37. v5: trang chủ hiện **N khóa mới nhất** → phụ thuộc biến mất. Chọn nổi bật thủ công tách thành `US-107`, làm sau.         |
| **Quy tắc đi kèm story sinh ra nó**           | v4 tách "US-008 Ngăn đăng ký trùng" (P1) khỏi "US-010 Admin đăng ký trực tiếp" (P0). v5: ràng buộc duy nhất `(student, course)` là một acceptance criterion của `US-301`, không có story riêng.           |
| **Gộp story không tạo giá trị quan sát được** | v4 tách "US-014 Quản lý lớp" khỏi "US-025 Xếp lớp". v5 giữ `US-401` riêng vì nó **tự demo được** (tạo lớp, thấy lớp trong admin) và **không phụ thuộc Enrollment** — nên chạy song song được từ sprint 1. |

---

## 2. Ràng buộc đã chốt

|            |                                                                         |
| ---------- | ----------------------------------------------------------------------- |
| Thời gian  | 2 tuần, 2 sprint mỗi sprint 1 tuần, kết thúc mỗi sprint có staging thật |
| Nhân lực   | 3 dev dùng Claude Code                                                  |
| Quy mô     | 1 giảng viên, ~100 học viên, 10–15 học viên/lớp → khoảng 7–10 lớp       |
| Vận hành   | Một Admin duy nhất, toàn quyền, không có ma trận phân quyền             |
| Thanh toán | Không bao giờ trực tuyến. Admin ghi nhận trạng thái bằng tay.           |
| Email      | SMTP (Gmail app password cho giai đoạn đầu)                             |
| Hạ tầng    | VPS riêng, Docker Compose, Postgres cùng compose                        |
| Moodle     | **Ra khỏi sản phẩm.** Chỉ một link ngoài trên trang giới thiệu.         |

Quy mô nhỏ và chỉ một Admin loại bỏ hai mối lo của v4: không cần đầu tư tìm kiếm / phân
trang / hiệu năng, và tranh chấp khi hai người cùng xếp lớp không xảy ra được. Ràng buộc sức
chứa ở tầng DB vẫn giữ vì nó gần như miễn phí, nhưng không thiết kế quanh nó.

---

## 3. Mô hình dữ liệu

### StudentAccount — collection có auth

| Trường                   | Ghi chú                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `email`                  | Unique. Đây là danh tính đăng nhập.                                                            |
| `password`               | Hash. Tài khoản tạo bằng Google hoặc do Admin tạo thì chưa dùng được cho tới khi đặt mật khẩu. |
| `verified`, `verifiedAt` | Chưa xác minh thì không đăng nhập được.                                                        |
| `googleId`               | Nullable.                                                                                      |

### Student — hồ sơ

| Trường                        | Ghi chú                               |
| ----------------------------- | ------------------------------------- |
| `account`                     | Quan hệ **1–1**, bắt buộc.            |
| `fullName`, `phone`, `avatar` | Có thể rỗng lúc mới tạo, bổ sung sau. |

**Không có trường email trên `Student`.** Mọi Student đều có account, nên email liên hệ luôn
lấy từ account. `StudentAccount` và `Student` **luôn được tạo trong cùng một transaction** —
cả khi người dùng tự đăng ký lẫn khi Admin tạo trực tiếp. Không tồn tại Student mồ côi.

> Hệ quả vận hành: Admin **không tạo được học viên nếu không có email** của họ.

### Course

`title` · `slug` · `shortDescription` · `content` · `image` · `category` (quan hệ tới
`categories` đã có sẵn) · `tags` · `fee` (số, VNĐ) · `objectives` · `duration` ·
`instructor` · trạng thái xuất bản (draft/published) · **`enrollmentOpen`** (xem mục 7)

### Class

`course` (bắt buộc) · `code` · `startDate` · `endDate` · `schedule` · `location` ·
`instructor` · `maxStudents` · `status`: `OPEN` | `CLOSED` | `CANCELLED`

Sĩ số hiện tại **luôn tính từ Enrollment đang gán vào Class**, không có trường đếm nhập tay.

### Enrollment

`student` · `course` · `class` (nullable) · `enrollmentStatus` ·
`registrationSource`: `SELF` | `ADMIN` · `registeredAt` · `amountDue`

- `enrollmentStatus`: `NEW` | `CONFIRMED` | `ATTENDING` | `COMPLETED` | `CANCELLED`
- `amountDue` — học phí tại thời điểm đăng ký. **Chốt từ `Course.fee` ngay lúc tạo
  Enrollment**, sau đó sửa được từng đăng ký để ghi nhận giảm giá. Đây là **con số tham chiếu
  để hiển thị, không phải ràng buộc** — số tiền thực thu không bị kiểm tra theo nó.
- Ràng buộc duy nhất: một Student không thể có hai Enrollment chưa hủy cho cùng một Course.

**`paymentStatus` là giá trị suy ra, không nhập tay:**

| Điều kiện                               | Giá trị    |
| --------------------------------------- | ---------- |
| Chưa có bản ghi `Payment` nào           | `UNPAID`   |
| Có bản ghi `Payment`                    | `PAID`     |
| Bản ghi `Payment` đã đánh dấu hoàn tiền | `REFUNDED` |

> **Trạng thái do sự tồn tại của bản ghi quyết định, không do số tiền quyết định.** Ghi nhận
> 2.000.000 cho một khóa niêm yết 2.500.000 vẫn là `PAID` — chênh lệch là chuyện thỏa thuận
> ngoài hệ thống, website không phán xét.
>
> **Bắt buộc:** `paymentStatus` được **ghi đè bởi hook** mỗi khi `payments` thay đổi, trong
> cùng transaction. Không bao giờ sửa tay, không bao giờ ghi từ chỗ khác. Nó được lưu xuống DB
> thay vì tính lúc đọc chỉ để `US-501` lọc và sắp xếp được — denormalization có chủ đích, không
> phải nguồn dữ liệu thứ hai.
>
> Vi phạm điều này **vỡ hoàn toàn im lặng**: không lỗi, không cảnh báo, chỉ là trạng thái sai
> âm thầm chảy vào danh sách admin và dashboard học viên. Ứng viên cho `INVARIANTS.md` ngay
> khi code xong.

### Payment — bản ghi giao dịch

**Mỗi Enrollment có nhiều nhất một Payment.** Thu một lần, không có trả góp, không có đóng
cọc.

| Trường                     | Ghi chú                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `enrollment`               | Quan hệ, **unique**, bắt buộc. Gắn vào Enrollment chứ không gắn thẳng vào Course — một học viên có thể đăng ký nhiều khóa. |
| `amount`                   | Số tiền **thực thu**. Bắt buộc. **Không kiểm tra theo `amountDue`.**                                                       |
| `paidAt`                   | Ngày giao dịch **thực tế**, không phải ngày nhập liệu. Bắt buộc.                                                           |
| `method`                   | `CASH` \| `BANK_TRANSFER` \| `OTHER`. Bắt buộc.                                                                            |
| `reference`                | Mã giao dịch, số biên lai. Có thể để trống.                                                                                |
| `evidence`                 | Ảnh chụp chuyển khoản, biên lai. Nhiều tệp. Xem `US-508`.                                                                  |
| `note`                     | Ghi chú tự do.                                                                                                             |
| `refundedAt`, `refundNote` | Có thời điểm hoàn tiền thì Enrollment thành `REFUNDED`. Xem giả định 11.                                                   |

> Vẫn là collection riêng chứ không phải vài trường phẳng trên Enrollment, dù quan hệ là 1–1:
> Admin cần một **màn hình danh sách giao dịch** lọc được theo ngày và phương thức để đối soát
> sao kê. Nhồi các trường vào Enrollment thì mất đúng cái đó.

### PaymentEvidence — collection upload riêng, **không công khai**

Bằng chứng thanh toán **không được** dùng chung collection `media` hiện có. Lý do ở `US-508`.

### Notification

`recipientType`: `STUDENT` | `ADMIN` · `recipient` (nullable khi gửi Admin) · `type` ·
`title` · `body` · `link` · `read` · `createdAt`

---

## 4. Phân bổ sprint

Ranh giới hai sprint được đặt **rõ trên mặt giấy** để nếu tuần 2 đuối thì chỗ cắt đã biết
trước, không phát hiện muộn.

| Sprint           | Story                                                            | Kết quả demo được                                                                         |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **1**            | E-01, E-02, US-101 → US-106, US-201 → US-203, US-205, US-401     | Khách xem được khóa học. Học viên tạo được tài khoản. Admin quản lý được Course và Class. |
| **2**            | US-301 → US-304, US-402, US-403, US-501 → US-504, US-508, US-601 | Luồng đăng ký chạy đủ vòng: đăng ký → xác nhận → xếp lớp → học viên thấy lớp của mình.    |
| **Sau 2 sprint** | US-107, US-204, US-404, US-505, US-506, US-507                   | Google sign-in, dashboard Admin, báo cáo, export.                                         |

### Chia việc cho 3 người

|           | Sprint 1                                       | Sprint 2                       |
| --------- | ---------------------------------------------- | ------------------------------ |
| **Dev A** | US-101, US-102, US-103, US-104, US-105, US-106 | US-301, US-302, US-303, US-504 |
| **Dev B** | US-201, US-202, US-203, US-205                 | US-304, US-402, US-403, US-601 |
| **Dev C** | E-01, E-02, US-401                             | US-501, US-502, US-503, US-508 |

Ghi nhận thanh toán kèm bằng chứng (`US-503` + `US-508`) là phần nặng nhất lane admin, nên
Dev C không ôm thêm thông báo.

`US-401` là chìa khóa của cách chia này: quản lý Class **chỉ cần Course, không cần
Enrollment**, nên nó chạy được ngay sprint 1 và gỡ tải cho sprint 2.

### Đường găng — hai story phải xong trước, nếu không cả sprint đứng

Cắt dọc gỡ được phần lớn phụ thuộc, nhưng **collection dùng chung thì không gỡ được**: ai
định nghĩa nó trước thì người sau xây lên trên. Mỗi sprint có đúng một story như vậy.

| Sprint | Đường găng                                      | Ai đang chờ                                                             |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1      | **`US-101`** định nghĩa collection `Course`     | `US-102`, `US-103`, `US-106`, `US-401`, và sang cả sprint 2 là `US-304` |
| 2      | **`US-301`** định nghĩa collection `Enrollment` | `US-302`, `US-304`, `US-402`, `US-501`, `US-601`                        |

Cách xử lý: **để một người làm dứt điểm story đường găng trong 1–2 ngày đầu sprint**, hai
người còn lại bắt đầu bằng phần không đụng tới collection đó — sprint 1 thì `US-104`, `US-105`
và toàn bộ Epic B không cần `Course`; sprint 2 thì `US-401` đã xong từ tuần trước và phần tạo
học viên của `US-304` không cần `Enrollment`.

Nếu muốn gỡ triệt để hơn: tách riêng một task **"định nghĩa schema Course và Enrollment"** làm
ngay ngày đầu sprint 1, rồi mọi story sau chỉ mở rộng. Đổi lại nó là task không demo được —
tôi không đưa vào backlog vì đi ngược tiêu chí cắt dọc, nhưng nếu ba người liên tục giẫm chân
nhau thì đây là cách đổi.

### Cảnh báo phạm vi — đọc trước khi cam kết

11 story ở sprint 1 và 12 ở sprint 2, cho 3 dev, là **giả định lạc quan**. Nếu tốc độ không
đạt, đây là thứ tự bỏ, bỏ từ trên xuống:

1. `US-106` SEO — hoãn được, không chặn ai
2. `US-103` Lọc & tìm kiếm — với ~10 khóa, cuộn tay vẫn dùng được
3. `US-303` Học viên tự hủy — tạm thời nhắn Admin hủy hộ

**Ghi nhận giao dịch làm sprint 2 nặng thêm ~1 ngày.** `US-503` và `US-508` thay cho một
story cũ chỉ bật trạng thái bằng tay. Đổi lại thì đối soát được với sao kê và có bằng chứng
lưu trữ. Phần lớn chi phí nằm ở `US-508` — collection upload riêng — chứ không ở bản thân
việc ghi giao dịch.

**`US-204` Google sign-in đã nằm ngoài 2 sprint.** Bạn có yêu cầu nó, nên nói rõ: muốn kéo
vào MVP thì phải đẩy ba story trên ra. Đây là phép tính, không phải quyết định của tôi.

---

## 5. Enablers — không hướng người dùng, nhưng chặn cả sprint

Hai mục này không phải user story và không demo được cho khách. Che giấu chúng thì tệ hơn,
nên ghi thẳng ra đây.

### E-01 · Email delivery via SMTP

**Sprint** 1 · **Bắt buộc trước** US-201 · **Ưu tiên** P0

- Cài `@payloadcms/email-nodemailer` (repo hiện **chưa có adapter email nào**).
- Cấu hình SMTP qua biến môi trường: host, port, user, pass, địa chỉ gửi.
- Gửi thử được một email từ staging.
- Đổi nhà cung cấp về sau chỉ là đổi biến môi trường, không sửa code.

> Gmail app password chạy được ngay nhưng mail giao dịch từ `@gmail.com` dễ vào spam — mà
> email xác minh vào spam nghĩa là **không ai đăng ký được**. Đặt lịch chuyển sang nhà cung
> cấp mail giao dịch trước go-live.

### E-02 · Staging deployment

**Sprint** 1 · **Bắt buộc trước** mọi demo · **Ưu tiên** P0

- VPS riêng, Docker Compose, Postgres trong cùng compose.
- Repo **đã có sẵn** `Dockerfile` và `docker-compose.yml` từ template — chỉ cần thêm service
  Postgres và biến môi trường cho staging.
- Deploy lại được bằng một lệnh.
- **Thư mục upload phải nằm trên volume gắn ngoài container.** Payload lưu tệp lên đĩa; nếu
  không mount volume thì **mọi ảnh khóa học, avatar và bằng chứng thanh toán biến mất sau mỗi
  lần build lại**. Không có lỗi nào báo — chỉ là ảnh hỏng và bằng chứng mất trắng.

---

## Epic A — Public course catalog

### US-101 · Course catalog page

|               |                                |
| ------------- | ------------------------------ |
| Ưu tiên       | P0 · Sprint 1                  |
| Phụ thuộc     | —                              |
| Song song với | US-201, US-401, US-104, US-105 |

**User story** — Là một khách truy cập, tôi muốn xem danh sách các khóa học đang được cung
cấp để chọn khóa phù hợp với mình.

**Acceptance criteria**

- Admin tạo được Course với: tên, mô tả ngắn, ảnh, học phí, thời lượng, giảng viên.
- Học phí là **trường số**, hiển thị định dạng tiền Việt (ví dụ `2.500.000đ`).
- Course lưu nháp được; **chỉ Course đã xuất bản mới hiện công khai**.
- Trang danh sách hiển thị mỗi Course: ảnh, tên, mô tả ngắn, học phí.
- Bấm vào một Course thì sang trang chi tiết.
- Hiển thị đúng trên mobile, tablet, desktop.

**Demo trên staging** — Tạo một Course trong admin, để nháp: không thấy trên `/courses`.
Xuất bản: thấy ngay, đúng ảnh và đúng học phí.

---

### US-102 · Course detail page

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 1  |
| Phụ thuộc     | US-101         |
| Song song với | US-201, US-401 |

**User story** — Là một khách truy cập, tôi muốn xem thông tin đầy đủ của một khóa học trước
khi quyết định đăng ký.

**Acceptance criteria**

- Hiển thị: tên, mô tả đầy đủ, mục tiêu học tập, ảnh, giảng viên, thời lượng, học phí.
- **Không hiển thị bất kỳ thông tin Class nào**: không danh sách lớp, không lịch, không địa
  điểm, không số chỗ còn lại.
- Có nút "Đăng ký khóa học". Khách chưa đăng nhập bấm vào thì được đưa sang trang đăng nhập,
  và **quay lại đúng khóa này** sau khi đăng nhập xong.
- Khi `enrollmentOpen = false`, nút đổi thành trạng thái "Tạm ngừng nhận đăng ký" và không
  bấm được.

**Demo trên staging** — Mở chi tiết một khóa ở chế độ ẩn danh: thấy đủ thông tin, không thấy
lớp nào. Bấm đăng ký → sang trang đăng nhập → đăng nhập xong quay lại đúng khóa đó.

---

### US-103 · Course categories, tags and filtering

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P1 · Sprint 1  |
| Phụ thuộc     | US-101         |
| Song song với | US-201, US-401 |

**User story** — Là một khách truy cập, tôi muốn lọc và tìm khóa học để không phải đọc hết
danh sách.

**Acceptance criteria**

- Course gán được **một danh mục** (dùng collection `categories` đã có sẵn trong repo) và
  **nhiều tag**.
- Trang danh sách lọc được theo danh mục.
- Tìm được theo tên khóa học.
- Xóa được bộ lọc, quay về danh sách đầy đủ.
- Kết quả chỉ chứa Course đã xuất bản. **Không bao giờ trả về Class.**

**Demo trên staging** — Gán danh mục cho 3 khóa, lọc theo một danh mục: chỉ ra đúng những
khóa thuộc danh mục đó. Gõ tên một khóa vào ô tìm: ra đúng khóa đó.

---

### US-104 · Homepage

|               |                       |
| ------------- | --------------------- |
| Ưu tiên       | P0 · Sprint 1         |
| Phụ thuộc     | —                     |
| Song song với | tất cả story sprint 1 |

**User story** — Là một khách truy cập, tôi muốn hiểu ngay tổ chức này dạy gì và tìm được
đường tới danh sách khóa học.

**Acceptance criteria**

- Có phần giới thiệu tổ chức, Admin sửa được nội dung không cần đụng code.
- Hiển thị **N khóa học mới xuất bản gần nhất** — không cần Admin cấu hình gì.
- Có một **link ngoài sang website Moodle** kèm mô tả ngắn về các khóa trực tuyến miễn phí.
- Có điều hướng tới danh sách khóa học.
- Hiển thị đúng trên mobile, tablet, desktop.

> Cố tình **không** phụ thuộc vào chức năng chọn khóa nổi bật. "Mới nhất" là quy tắc tự động,
> nên story này chạy được ngay từ ngày đầu. Chọn thủ công là `US-107`, làm sau.

**Demo trên staging** — Mở trang chủ: thấy giới thiệu, thấy các khóa mới nhất, bấm link
Moodle sang đúng site Moodle.

---

### US-105 · Static pages

|               |                       |
| ------------- | --------------------- |
| Ưu tiên       | P0 · Sprint 1         |
| Phụ thuộc     | —                     |
| Song song với | tất cả story sprint 1 |

**User story** — Là một Admin, tôi muốn tự quản lý các trang Giới thiệu, Liên hệ, Điều khoản
và Chính sách bảo mật.

**Acceptance criteria**

- Tạo, sửa, xuất bản, ẩn được từng trang.
- Định dạng được văn bản và chèn link.
- Trang chưa xuất bản không hiện công khai.
- Có sẵn bốn trang: Giới thiệu, Liên hệ, Điều khoản, Chính sách bảo mật.

> Collection `pages` của template đã làm gần hết việc này. Chi phí thực tế rất thấp.

**Demo trên staging** — Tạo trang "Giới thiệu", xuất bản, mở bằng URL công khai.

---

### US-106 · SEO for course pages

|               |                                       |
| ------------- | ------------------------------------- |
| Ưu tiên       | P1 · Sprint 1 · **Ứng viên cắt số 1** |
| Phụ thuộc     | US-102                                |
| Song song với | mọi story khác                        |

**User story** — Là người làm marketing, tôi muốn các trang khóa học lên được kết quả tìm
kiếm.

**Acceptance criteria**

- Mỗi Course đặt được SEO title và meta description riêng.
- URL khóa học dễ đọc (slug từ tên).
- Ảnh có alt text.
- Heading đúng cấp bậc, mỗi trang một `h1`.
- Course xuất bản xuất hiện trong sitemap.

> `seoPlugin` và sitemap đã bật sẵn cho `pages`/`posts` — việc chính là mở rộng cho `courses`.

**Demo trên staging** — Xem mã nguồn một trang khóa học: thấy title và meta description đã
đặt. Mở sitemap: thấy URL khóa đó.

---

## Epic B — Student account

### US-201 · Registration with email verification

|               |                        |
| ------------- | ---------------------- |
| Ưu tiên       | P0 · Sprint 1          |
| Phụ thuộc     | **E-01**               |
| Song song với | toàn bộ Epic A, US-401 |

**User story** — Là một khách truy cập, tôi muốn tạo tài khoản và xác minh email để có thể
đăng ký khóa học.

**Acceptance criteria**

- Đăng ký bằng **email + mật khẩu**. **Số điện thoại chưa bắt buộc ở bước này.**
- Email phải hợp lệ và chưa tồn tại trong `StudentAccount`.
- Mật khẩu phải đạt yêu cầu bảo mật, lưu dưới dạng hash.
- Khi tạo tài khoản, hệ thống tạo luôn một **`Student` profile rỗng trong cùng một
  transaction**. Không bao giờ tồn tại account không có profile.
- Hệ thống gửi email xác minh chứa liên kết có thời hạn.
- **Chưa xác minh thì chưa đăng nhập được.**
- Yêu cầu gửi lại email xác minh được khi liên kết cũ hết hạn.

**Demo trên staging** — Đăng ký một email mới, thử đăng nhập ngay → bị từ chối. Mở mail, bấm
liên kết → kích hoạt. Kiểm tra trong admin: có 1 `StudentAccount` và 1 `Student` gắn với nó.

---

### US-202 · Login and logout

|               |                        |
| ------------- | ---------------------- |
| Ưu tiên       | P0 · Sprint 1          |
| Phụ thuộc     | US-201                 |
| Song song với | toàn bộ Epic A, US-401 |

**User story** — Là một học viên đã có tài khoản, tôi muốn đăng nhập và đăng xuất an toàn.

**Acceptance criteria**

- Đăng nhập bằng email và mật khẩu.
- **Chỉ tài khoản đã xác minh mới đăng nhập được.**
- Thông tin sai bị từ chối kèm thông báo rõ ràng, **không tiết lộ email đó có tồn tại hay
  không**.
- Đăng nhập xong tạo phiên an toàn.
- Đăng xuất làm phiên hiện tại mất hiệu lực ngay.
- **Học viên không vào được `/admin`.** Đây là ràng buộc bảo mật bắt buộc kiểm tra.

**Demo trên staging** — Đăng nhập, thấy khu vực học viên. Gõ thẳng `/admin` → bị chặn. Đăng
xuất, quay lại URL cũ → bị đẩy về trang đăng nhập.

---

### US-203 · Forgot and reset password

|               |                        |
| ------------- | ---------------------- |
| Ưu tiên       | P0 · Sprint 1          |
| Phụ thuộc     | US-201, E-01           |
| Song song với | toàn bộ Epic A, US-401 |

**User story** — Là một học viên quên mật khẩu, tôi muốn đặt lại để lấy lại quyền truy cập.

**Acceptance criteria**

- Trang đăng nhập có liên kết "Quên mật khẩu".
- Gửi yêu cầu bằng email đã đăng ký.
- Hệ thống gửi liên kết reset **có thời hạn** và **chỉ dùng được một lần**.
- Mật khẩu mới phải đạt yêu cầu bảo mật.
- Sau khi reset, mật khẩu cũ không dùng được nữa.
- Màn hình phản hồi **giống nhau** dù email có tồn tại hay không.

**Demo trên staging** — Yêu cầu reset, nhận mail, đặt mật khẩu mới, đăng nhập bằng mật khẩu
mới thành công và bằng mật khẩu cũ thất bại. Bấm lại liên kết cũ → bị từ chối.

---

### US-205 · Student profile

|               |                        |
| ------------- | ---------------------- |
| Ưu tiên       | P0 · Sprint 1          |
| Phụ thuộc     | US-202                 |
| Song song với | toàn bộ Epic A, US-401 |

**User story** — Là một học viên đã đăng nhập, tôi muốn xem và cập nhật thông tin cá nhân.

**Acceptance criteria**

- Xem được: họ tên, số điện thoại, avatar, email đăng nhập, trạng thái tài khoản.
- Sửa được **họ tên, số điện thoại, avatar**.
- **Email đăng nhập không đổi được** trong phạm vi hiện tại.
- Dữ liệu được kiểm tra hợp lệ trước khi lưu.
- Không hiển thị mật khẩu hay dữ liệu xác thực nào.
- Học viên chỉ xem và sửa được hồ sơ **của chính mình**.

**Demo trên staging** — Đăng nhập bằng tài khoản A, sửa tên và số điện thoại, tải avatar lên,
tải lại trang thấy đã lưu. Thử mở hồ sơ của tài khoản B qua URL → bị chặn.

---

## Epic C — Enrollment

### US-301 · Student enrolls in a course

|               |                        |
| ------------- | ---------------------- |
| Ưu tiên       | P0 · Sprint 2          |
| Phụ thuộc     | US-102, US-202, US-205 |
| Song song với | US-401, US-501         |

**User story** — Là một học viên đã đăng nhập, tôi muốn đăng ký một khóa học để tổ chức tiếp
nhận và xếp lớp cho tôi.

**Acceptance criteria**

- **Chỉ tài khoản đã đăng nhập và đã xác minh email** mới đăng ký được.
- **Hồ sơ phải đủ họ tên và số điện thoại** trước khi tạo Enrollment. Thiếu thì form bắt điền
  ngay tại chỗ, không bắt người dùng đi sang trang khác rồi quay lại.
- Học viên xem lại thông tin của mình trước khi bấm xác nhận.
- **Học viên chọn Course, không chọn Class.**
- Tạo một Enrollment với `enrollmentStatus = NEW`, `registrationSource = SELF`, `class` để
  trống.
- **`amountDue` được chốt bằng `Course.fee` tại đúng thời điểm tạo Enrollment.** Không đọc
  `Course.fee` lúc hiển thị. Sửa học phí của Course về sau **không được** làm thay đổi số
  tiền của các đăng ký đã tạo.
- **Chặn trùng:** một Student không thể có hai Enrollment chưa hủy cho cùng một Course.
  Ràng buộc này đặt ở tầng cơ sở dữ liệu, không chỉ kiểm tra ở tầng ứng dụng.
- Nếu đã có Enrollment còn hiệu lực cho khóa đó, hiển thị trạng thái hiện tại thay vì tạo mới.
- Không đăng ký được khi `enrollmentOpen = false`.
- Sau khi tạo thành công: màn hình xác nhận nêu rõ tên khóa, trạng thái hiện tại, và
  **việc thanh toán được xử lý riêng ngoài website**.
- Gửi email xác nhận tới email tài khoản.

**Demo trên staging** — Đăng nhập bằng tài khoản chưa có số điện thoại, bấm đăng ký một khóa:
bị bắt điền số điện thoại, điền xong đăng ký được. Bấm đăng ký lại chính khóa đó: bị chặn,
hiện trạng thái đăng ký cũ. Kiểm tra hộp thư: có email xác nhận. Sau đó **sửa học phí của
khóa đó trong admin**: đăng ký vừa tạo vẫn giữ nguyên số tiền cũ.

---

### US-302 · Student dashboard — my enrollments

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-301         |
| Song song với | US-401, US-501 |

**User story** — Là một học viên, tôi muốn xem lại các khóa mình đã đăng ký và tình trạng của
từng đăng ký.

**Acceptance criteria**

- Danh sách mọi Enrollment của chính mình, mới nhất trước.
- Mỗi dòng: tên khóa, ngày đăng ký, **trạng thái đăng ký**, **trạng thái thanh toán**, và
  **học phí** của khóa tại thời điểm đăng ký.
- Học viên **không thấy chi tiết giao dịch** và **không thấy ảnh bằng chứng** — chỉ thấy đã
  thanh toán hay chưa. Mã tham chiếu, phương thức và bằng chứng là dữ liệu vận hành nội bộ.
- Trạng thái hiển thị bằng tiếng Việt dễ hiểu, không phải mã kỹ thuật.
- **Học viên không xem được Enrollment của người khác.** Kiểm tra ở phía server, không chỉ ẩn
  trên giao diện.
- Chưa đăng ký khóa nào thì hiện trạng thái rỗng kèm đường dẫn sang danh sách khóa học.

**Demo trên staging** — Đăng nhập tài khoản A: thấy đúng các khóa A đã đăng ký. Sửa URL sang
id Enrollment của tài khoản B → bị chặn.

---

### US-303 · Student cancels their own enrollment

|               |                                       |
| ------------- | ------------------------------------- |
| Ưu tiên       | P1 · Sprint 2 · **Ứng viên cắt số 3** |
| Phụ thuộc     | US-302                                |
| Song song với | US-401, US-501                        |

**User story** — Là một học viên đổi ý, tôi muốn tự hủy đăng ký mà không phải nhắn cho Admin.

**Acceptance criteria**

- Tự hủy được khi `enrollmentStatus` là `NEW` hoặc `CONFIRMED` — **kể cả khi đã được xếp
  lớp**.
- **Không tự hủy được khi đã có bản ghi thanh toán** — tức `paymentStatus = PAID`. Nút đổi
  thành hướng dẫn liên hệ Admin, vì hoàn tiền là việc ngoài hệ thống.
- **Không tự hủy được sau ngày khai giảng của lớp đã xếp.**
- Có bước xác nhận trước khi hủy.
- Hủy xong: `enrollmentStatus = CANCELLED`, **gỡ `class`, chỗ trong lớp được nhả ra ngay**.
- Enrollment đã hủy vẫn nằm trong lịch sử, không xóa khỏi cơ sở dữ liệu.
- Sinh thông báo cho Admin.

**Demo trên staging** — Hủy một đăng ký đã được xếp lớp: sĩ số lớp giảm đi 1 ngay. Đánh dấu
một giao dịch vào một đăng ký khác: nút hủy biến mất ngay, thay bằng hướng dẫn liên hệ Admin.

---

### US-304 · Admin enrolls a student directly

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-101         |
| Song song với | US-301, US-501 |

**User story** — Là một Admin, tôi muốn đăng ký khóa học trực tiếp cho người liên hệ qua điện
thoại hoặc Zalo, để họ không phải tự thao tác trên website.

**Acceptance criteria**

- Tìm được `Student` đang có theo họ tên, email hoặc số điện thoại.
- Nếu chưa có, tạo mới với **email, họ tên, số điện thoại**. Email là bắt buộc.
- Việc tạo mới sinh ra **`StudentAccount` và `Student` trong cùng một transaction**, giống hệt
  luồng tự đăng ký. Account ở trạng thái chưa xác minh, chưa có mật khẩu dùng được.
- Người đó về sau tự đặt mật khẩu được qua luồng "Quên mật khẩu" và **nhận lại đúng hồ sơ cũ
  kèm toàn bộ lịch sử đăng ký**.
- Admin chọn Course; **không chọn Class ở bước này**.
- Tạo Enrollment với `registrationSource = ADMIN`.
- **Áp dụng đúng ràng buộc chặn trùng** như luồng tự đăng ký.
- Học viên do Admin tạo được xác nhận, ghi nhận thanh toán và xếp lớp **bình thường như mọi
  học viên khác**.

**Demo trên staging** — Tạo một học viên mới từ admin rồi đăng ký khóa cho họ. Kiểm tra: có
đúng 1 account + 1 profile + 1 enrollment. Dùng chính email đó chạy luồng quên mật khẩu, đặt
mật khẩu, đăng nhập → thấy ngay đăng ký mà Admin đã tạo.

---

## Epic D — Class management and assignment

### US-401 · Admin manages classes

|               |                          |
| ------------- | ------------------------ |
| Ưu tiên       | P0 · **Sprint 1**        |
| Phụ thuộc     | US-101                   |
| Song song với | toàn bộ Epic A và Epic B |

**User story** — Là một Admin, tôi muốn tạo và quản lý các lớp của một khóa học, kèm sĩ số tối
đa, để chuẩn bị cho việc xếp lớp.

**Acceptance criteria**

- Tạo, sửa, đóng lớp được. Mỗi Class thuộc **đúng một** Course.
- Mỗi Class có: mã lớp, ngày bắt đầu, ngày kết thúc, khung giờ, địa điểm, giảng viên, trạng
  thái, `maxStudents`.
- `status` nhận một trong ba giá trị: `OPEN`, `CLOSED`, `CANCELLED`.
- Admin xem được **sĩ số hiện tại / sức chứa** của từng lớp. Sĩ số **luôn tính từ Enrollment**,
  không có ô nhập tay.
- Giảm `maxStudents` xuống dưới sĩ số hiện tại: **cảnh báo nhưng vẫn cho lưu**, không đẩy học
  viên nào ra khỏi lớp.
- **Class không hiện ở bất cứ đâu trên website công khai.**

> Story này **chỉ cần Course**, không cần Enrollment — nên chạy được ngay sprint 1 và gỡ tải
> đáng kể cho sprint 2.

**Demo trên staging** — Tạo hai lớp cho một khóa, đặt sức chứa 15. Xem danh sách lớp trong
admin: thấy `0/15`. Mở website ẩn danh, tìm mọi trang liên quan tới khóa đó: không thấy lớp
nào.

---

### US-402 · Admin assigns a student to a class

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-301, US-401 |
| Song song với | US-501, US-601 |

**User story** — Là một Admin, tôi muốn xếp học viên đã được xác nhận vào một lớp phù hợp.

**Acceptance criteria**

- **Chỉ Enrollment có `enrollmentStatus = CONFIRMED` mới xếp lớp được.**
- **Không yêu cầu `paymentStatus = PAID`.** Trạng thái thanh toán không phải điều kiện xếp lớp.
- Danh sách lớp để chọn **chỉ gồm lớp thuộc đúng Course của Enrollment**.
- Lớp phải đang `OPEN` và **sĩ số hiện tại < `maxStudents`**.
- **Hệ thống không cho xếp vượt sức chứa.** Ràng buộc này đặt ở tầng cơ sở dữ liệu.
- Không đủ điều kiện thì chặn và **nói rõ lý do**, không chỉ báo lỗi chung chung.
- Đổi lớp được; khi đổi phải kiểm tra lại đúng Course và sức chứa lớp mới.
- Sinh thông báo cho học viên.

**Demo trên staging** — Xếp học viên vào lớp sức chứa 2 cho tới khi đầy, người thứ ba bị chặn
kèm lý do rõ ràng. Thử xếp một Enrollment còn ở `NEW` → bị chặn. Thử chọn lớp thuộc khóa khác
→ không có trong danh sách.

---

### US-403 · Student sees their assigned class

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-302, US-402 |
| Song song với | US-501         |

**User story** — Là một học viên đã được xếp lớp, tôi muốn biết mình học lớp nào, khi nào và ở
đâu.

**Acceptance criteria**

- Trong dashboard, Enrollment đã được xếp lớp hiển thị: mã lớp, ngày bắt đầu, ngày kết thúc,
  khung giờ, địa điểm, giảng viên.
- Chưa được xếp thì hiển thị rõ "Chưa xếp lớp", **không để trống gây hiểu nhầm**.
- Học viên **chỉ thấy lớp của chính mình**, không thấy danh sách lớp khác, không thấy học viên
  khác trong lớp, không thấy sức chứa.
- Đây là **nơi duy nhất** thông tin Class lộ ra ngoài khu vực admin.

**Demo trên staging** — Đăng nhập bằng học viên đã được xếp lớp: thấy đủ lịch và địa điểm.
Đăng nhập bằng học viên chưa xếp: thấy "Chưa xếp lớp". Dò các URL liên quan tới lớp bằng tài
khoản khác → bị chặn.

---

## Epic E — Enrollment administration

### US-501 · Admin enrollment list

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-301         |
| Song song với | US-401, US-402 |

**User story** — Là một Admin, tôi muốn xem toàn bộ đăng ký ở một chỗ để biết việc gì đang chờ
mình xử lý.

**Acceptance criteria**

- Hiển thị mọi Enrollment, từ cả hai nguồn `SELF` và `ADMIN`.
- Mỗi dòng tối thiểu: học viên, khóa học, lớp đã xếp (nếu có), nguồn đăng ký, ngày đăng ký,
  trạng thái đăng ký, trạng thái thanh toán, **số tiền đã thu**.
- Lọc được theo khóa học, lớp, trạng thái đăng ký, trạng thái thanh toán, nguồn đăng ký.
- Lọc và sắp xếp theo trạng thái thanh toán chạy **trực tiếp trên cơ sở dữ liệu**, không tính
  lại trong bộ nhớ — đó là lý do `paymentStatus` được lưu xuống thay vì tính lúc đọc.
- Tìm được theo tên hoặc email học viên.
- Mặc định sắp xếp mới nhất trước.

**Demo trên staging** — Mở danh sách, lọc `NEW`: chỉ ra đúng các đăng ký chưa xử lý. Tìm theo
email một học viên: ra đúng các đăng ký của người đó.

---

### US-502 · Admin changes enrollment status

|               |               |
| ------------- | ------------- |
| Ưu tiên       | P0 · Sprint 2 |
| Phụ thuộc     | US-501        |
| Song song với | US-503        |

**User story** — Là một Admin, tôi muốn cập nhật trạng thái đăng ký để theo dõi tiến trình và
mở khóa việc xếp lớp.

**Acceptance criteria**

- Đặt được `enrollmentStatus` sang: `NEW`, `CONFIRMED`, `ATTENDING`, `COMPLETED`, `CANCELLED`.
- **`CONFIRMED` là điều kiện duy nhất về trạng thái để được xếp lớp.**
- Chuyển sang `CANCELLED` thì **gỡ `class` và nhả chỗ** trong lớp.
- Chuyển sang `CONFIRMED` sinh thông báo cho học viên.
- Lịch sử thay đổi được lưu lại (dùng cơ chế versions của Payload).

**Demo trên staging** — Đổi một đăng ký từ `NEW` sang `CONFIRMED`: nút xếp lớp mở ra, học viên
nhận được thông báo. Hủy một đăng ký đã xếp lớp: sĩ số lớp giảm ngay.

---

### US-503 · Payment record

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-501         |
| Song song với | US-502, US-508 |

**User story** — Là một Admin, tôi muốn ghi nhận khoản thu của một học viên kèm đầy đủ thông
tin giao dịch, để đối soát được với sao kê ngân hàng.

**Acceptance criteria**

- Admin tạo được bản ghi `Payment` gắn vào một Enrollment, gồm: **số tiền thực thu**, **ngày
  giao dịch thực tế**, **phương thức** (tiền mặt / chuyển khoản / khác), **mã tham chiếu**,
  ghi chú.
- **Mỗi Enrollment nhiều nhất một Payment.** Ràng buộc unique đặt ở tầng cơ sở dữ liệu, không
  chỉ kiểm tra ở tầng ứng dụng. Đã có rồi thì Admin sửa bản ghi đó chứ không tạo bản thứ hai.
- **Số tiền không bị kiểm tra theo học phí.** Thu ít hơn, đúng bằng hay nhiều hơn `amountDue`
  đều ghi nhận bình thường — không cảnh báo, không chặn.
- **Có bản ghi là `PAID`, không có là `UNPAID`.** Trạng thái do **sự tồn tại của bản ghi**
  quyết định, không do số tiền.
- Sau mỗi lần thêm, sửa hoặc xóa Payment, hệ thống ghi lại `paymentStatus` trên Enrollment
  **trong cùng transaction**.
- **`paymentStatus` không đặt được bằng tay.** Không có ô chọn trạng thái thanh toán trong màn
  hình sửa Enrollment.
- Có màn hình **danh sách toàn bộ giao dịch**, lọc theo khoảng ngày và theo phương thức, để
  đối soát với sao kê.
- **`paymentStatus` không bao giờ là điều kiện để xếp lớp.**
- **Website không xử lý thanh toán trực tuyến.** Không tích hợp cổng thanh toán nào.
- Ghi nhận một khoản thu sinh thông báo cho học viên.

> `paymentStatus` là dữ liệu **suy ra**, chỉ được lưu xuống để `US-501` lọc được. Bất kỳ đoạn
> code nào ghi thẳng vào nó — seed script, một lần sửa tay trong admin, một hook khác — sẽ làm
> trạng thái sai mà **không phát ra lỗi nào**. Chốt bằng test và ghi vào `INVARIANTS.md`.

**Demo trên staging** — Một đăng ký chưa có giao dịch: `UNPAID`. Ghi một khoản chuyển khoản
**2.000.000 cho khóa niêm yết 2.500.000**: thành `PAID` ngay, **không cảnh báo gì về chênh
lệch**. Thử tạo giao dịch thứ hai cho cùng đăng ký: **bị chặn**. Xóa bản ghi: quay lại
`UNPAID`.

---

### US-504 · Admin edits and cancels an enrollment

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-501         |
| Song song với | US-502, US-503 |

**User story** — Là một Admin, tôi muốn sửa hoặc hủy một đăng ký để xử lý các thay đổi phát
sinh khi vận hành.

**Acceptance criteria**

- Admin hủy được **bất kỳ** Enrollment nào, **không bị ràng buộc** bởi các quy tắc áp cho học
  viên ở `US-303`.
- Đổi được lớp đã xếp; khi đổi vẫn phải đúng Course và còn chỗ ở lớp mới.
- **Sửa được `amountDue` của từng đăng ký** để ghi nhận giảm giá, ưu đãi nhóm, học viên cũ.
  Sửa nó **không đụng gì tới `paymentStatus`** — hai thứ này độc lập.
- **Không sửa được `paymentStatus`.** Muốn đổi nó thì thêm, sửa hoặc xóa bản ghi giao dịch ở
  `US-503`. Đây là ràng buộc, không phải hạn chế giao diện.
- Enrollment đã hủy **không bị xóa khỏi cơ sở dữ liệu**, vẫn tra cứu được.
- Course bị ẩn đi **không làm mất** các Enrollment hiện có.

**Demo trên staging** — Hủy một đăng ký đã thanh toán và đã xếp lớp: hủy được, sĩ số lớp giảm,
bản ghi vẫn tra cứu được. Ẩn một Course: các đăng ký của khóa đó vẫn còn nguyên.

---

### US-508 · Payment evidence — private file uploads

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | US-503         |
| Song song với | US-502, US-504 |

**User story** — Là một Admin, tôi muốn đính ảnh chụp chuyển khoản hoặc biên lai vào từng giao
dịch, để có bằng chứng khi đối chiếu sổ sách hoặc khi học viên khiếu nại.

**Acceptance criteria**

- Mỗi `Payment` đính được **nhiều tệp**, ảnh hoặc PDF.
- **Bằng chứng thanh toán KHÔNG dùng chung collection `media` hiện có.** Phải là một
  collection upload riêng.
- Collection đó đặt `read` **chỉ cho Admin đã đăng nhập**. Học viên không đọc được, khách
  không đọc được.
- **Thư mục lưu tệp nằm ngoài `public/`**, để tệp đi qua route của Payload và access control
  thực sự có hiệu lực.
- Giới hạn loại tệp và dung lượng tối đa.
- Xóa một `Payment` thì xóa luôn các tệp đính kèm của nó.

> **Vì sao bắt buộc phải tách.** Collection `media` hiện tại đặt `read: anyone`
> (`src/collections/Media.ts:23`) **và** ghi tệp vào `public/media`
> (`src/collections/Media.ts:44`). Cộng lại nghĩa là Next.js phục vụ tệp **tĩnh, trước khi
> Payload kịp kiểm tra quyền**. Comment ngay trong file nói đúng điều đó:
> _"making them publicly accessible even outside of Payload"_.
>
> Nếu để ảnh chuyển khoản vào đó thì **bất kỳ ai biết hoặc đoán được URL đều tải về được**:
> tên học viên, số tài khoản, số tiền, đôi khi cả số điện thoại. **Đổi sang
> `read: authenticated` cũng không cứu được**, vì tệp không hề đi qua Payload. Chỉ có
> collection riêng với thư mục nằm ngoài `public/` mới xử lý được.

**Demo trên staging** — Đính ảnh chuyển khoản vào một giao dịch. Copy URL tệp, mở ở cửa sổ ẩn
danh chưa đăng nhập: **bị từ chối**. Đăng nhập bằng tài khoản học viên rồi mở lại: **vẫn bị từ
chối**. Đăng nhập Admin: xem được.

---

## Epic F — Notifications

### US-601 · Notification centre — in-app and email

|               |                |
| ------------- | -------------- |
| Ưu tiên       | P0 · Sprint 2  |
| Phụ thuộc     | E-01, US-301   |
| Song song với | US-402, US-501 |

**User story** — Là học viên và là Admin, tôi muốn nhận thông báo về những việc liên quan tới
mình, cả trong ứng dụng lẫn qua email.

**Acceptance criteria**

- Có biểu tượng chuông kèm **số thông báo chưa đọc**, cho cả học viên và Admin.
- Danh sách thông báo, mới nhất trước, phân biệt **đã đọc / chưa đọc**.
- Đánh dấu đã đọc từng cái và đánh dấu tất cả.
- Mỗi thông báo dẫn tới đúng đối tượng liên quan.
- **Mỗi sự kiện sinh đồng thời một thông báo trong ứng dụng và một email.**
- **Không có trang cài đặt bật/tắt** trong phạm vi này. Mọi thông báo đều được gửi.
- Học viên **chỉ thấy thông báo của mình**, kiểm tra ở phía server.
- Gửi email thất bại **không được làm hỏng** hành động đã thực hiện — thông báo trong ứng dụng
  vẫn phải xuất hiện.

> **Làm sớm trong sprint.** `US-303`, `US-402`, `US-502` và `US-503` đều gắn sự kiện vào cơ
> chế này. Nếu `US-601` về muộn thì bốn story kia không đạt đủ acceptance criteria, dù phần
> việc chính của chúng đã xong.

**Bảy sự kiện trong phạm vi**

| Sự kiện                                         | Người nhận            |
| ----------------------------------------------- | --------------------- |
| Đăng ký khóa học thành công                     | Học viên              |
| Đăng ký được xác nhận                           | Học viên              |
| Được xếp lớp                                    | Học viên              |
| Ghi nhận một khoản thu hoặc một khoản hoàn tiền | Học viên              |
| Có đăng ký mới trên website                     | Admin                 |
| Học viên tự hủy đăng ký                         | Admin                 |
| Lớp bị đổi lịch hoặc hủy _(cùng `US-404`)_      | Học viên trong lớp đó |

**Demo trên staging** — Học viên đăng ký một khóa: Admin thấy chuông sáng và nhận được email.
Admin xác nhận rồi xếp lớp: học viên thấy hai thông báo mới và nhận hai email. Đánh dấu đã
đọc: số đếm giảm đúng.

---

## 6. Ngoài phạm vi 2 sprint

Vẫn nằm trong sản phẩm, chỉ là không đủ chỗ trong 2 tuần. Thứ tự dưới đây là thứ tự tôi đề
nghị kéo vào khi có thêm thời gian.

| ID       | Tên                                   | Ghi chú                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `US-204` | **Google sign-in**                    | Bạn có yêu cầu. ~1,5–2 ngày, là mảnh auth khó nhất. Chi tiết ở mục 8.                                                                                                                                                                                                                          |
| `US-404` | **Class reschedule and cancellation** | Đổi lịch hoặc hủy lớp, sinh thông báo cho mọi học viên trong lớp.                                                                                                                                                                                                                              |
| `US-505` | **Admin dashboard**                   | Bốn ô, bấm vào ra danh sách đã lọc sẵn: đăng ký chờ xác nhận · đã xác nhận nhưng chưa xếp lớp · lớp sắp khai giảng kèm sĩ số/sức chứa · đăng ký chưa thanh toán. Chọn theo nguyên tắc **việc cần làm**, không phải số liệu đẹp: ở quy mô ~10 khóa thì "số khóa đã xuất bản" là con số vô dụng. |
| `US-506` | **Enrollment and payment reports**    | Lọc theo khóa, lớp, nguồn, ngày, trạng thái. Nhờ có bảng `Payment`, nay tính được **tổng tiền thực thu** theo khoảng ngày và theo phương thức, thay vì chỉ đếm số đăng ký đã đánh dấu là đã trả.                                                                                               |
| `US-507` | **CSV export**                        | Xuất danh sách Enrollment và Student. Cân nhắc `@payloadcms/plugin-import-export`.                                                                                                                                                                                                             |
| `US-107` | **Manual featured courses**           | Cho Admin tự chọn khóa nổi bật trên trang chủ, thay cho quy tắc "mới nhất" của `US-104`.                                                                                                                                                                                                       |

---

## 7. Những chỗ v5 khác v4 — cần bạn duyệt

Đây là các thay đổi tôi chủ động đề xuất khi viết lại. Gạch bất kỳ dòng nào bạn không đồng ý.

1. **`Course.enrollmentOpen`** — trường mới. v4 không có khái niệm đóng nhận đăng ký; vì Class
   ẩn và đăng ký ở cấp Course nên **một khóa sẽ nhận đăng ký vô thời hạn**, kể cả khi không
   còn lớp nào sắp mở.
2. **Thanh toán chuyển từ một cờ trạng thái sang một bản ghi giao dịch.** v4 chỉ có
   `paymentStatus` bật tay, không lưu số tiền, ngày thu, phương thức hay bằng chứng nào. v5
   dùng bảng `Payment` (`US-503`) làm nguồn sự thật, mỗi Enrollment nhiều nhất một bản ghi;
   `paymentStatus` trở thành **giá trị suy ra từ sự tồn tại của bản ghi đó**.
3. **`Enrollment.amountDue` — trường mới, chốt lúc tạo.** v4 chỉ có học phí trên `Course`, mà
   trường đó sửa được bất cứ lúc nào. Nghĩa là sửa học phí kỳ sau sẽ **âm thầm viết lại số
   tiền của mọi đăng ký cũ** — trong danh sách admin, trong dashboard học viên và trong mọi
   báo cáo. Không lỗi, không cảnh báo. Đây là con số **tham chiếu để hiển thị**, không ràng
   buộc số tiền thực thu.
4. **Bằng chứng thanh toán phải có collection upload riêng** (`US-508`). Collection `media`
   hiện tại vừa `read: anyone` vừa ghi vào `public/`, nên ảnh chuyển khoản để ở đó sẽ tải về
   được bằng URL trần.
5. **Bỏ `CourseType`** — hệ quả của việc đưa Moodle ra khỏi sản phẩm. Mọi Course đều là
   offline.
6. **Trang chủ dùng "khóa mới nhất" thay vì "khóa nổi bật"** — để gỡ phụ thuộc P0→P1 của v4.
7. **Học viên tự hủy đăng ký** — v4 không có; chỉ Admin hủy được. Điều kiện chặn là **đã nhận
   bất kỳ khoản tiền nào**, không phải "đã thanh toán đủ".
8. **`ATTENDING` và `COMPLETED` do Admin đặt tay.** Không có story điểm danh hay kết thúc khóa
   nào tự sinh ra hai trạng thái này. Giữ lại theo v4, nhưng nói rõ để không ai chờ tự động.
9. **Không có nhật ký thay đổi riêng.** Lịch sử tiền bạc đã nằm sẵn trong bảng `Payment`; phần
   còn lại dùng cơ chế versions của Payload trên Enrollment.
10. **Không xóa cứng** Course, Class hay Student đang có ràng buộc dữ liệu. Dùng ẩn hoặc hủy.
    v4 nhắc "CRUD" nhưng không story nào định nghĩa hành vi xóa; với Postgres thì xóa sẽ hoặc
    cascade mất dữ liệu, hoặc lỗi khóa ngoại.

---

## 8. US-204 · Google sign-in — chi tiết

Ngoài 2 sprint, nhưng ghi đủ ở đây để khỏi phải phỏng vấn lại.

**Phạm vi** — Google chỉ dùng để **lấy thông tin và tạo tài khoản**. **Phiên đăng nhập do hệ
thống của mình phát hành và quản lý**, không dùng token của Google làm phiên.

**Vì sao đắt** — Payload không có sẵn OAuth cho collection auth tùy biến. Phải tự viết route
callback, đổi authorization code lấy token, gọi userinfo, rồi **tự phát hành phiên Payload cho
một tài khoản không có mật khẩu** — đây là chỗ lắt léo nhất.

**Bốn quy tắc bắt buộc**

- Email đã có tài khoản mật khẩu, nay đăng nhập bằng Google → **gắn vào đúng tài khoản đó**,
  không tạo tài khoản thứ hai, vì Google đã xác minh email.
- Google trả `email_verified = false` → **vẫn bắt xác minh email** như luồng thường.
- Tài khoản tạo bằng Google chưa có mật khẩu → muốn đăng nhập bằng mật khẩu thì dùng luồng
  "Quên mật khẩu" để đặt lần đầu.
- Đăng nhập Google trùng email một `Student` do Admin tạo → **gắn vào đúng Student đó** kèm
  toàn bộ lịch sử đăng ký.

**Demo trên staging** — Đăng nhập bằng Google với email mới: tạo được account + profile, vào
thẳng dashboard. Đăng xuất, đăng nhập lại bằng Google: vào đúng tài khoản cũ. Với email đã có
mật khẩu: gắn vào tài khoản cũ, không sinh tài khoản thứ hai.

---

## 9. Giả định — tôi tự đặt, bạn duyệt hoặc gạch

Những mục này không được hỏi trong lúc phỏng vấn. Tôi đặt mặc định để không chặn tiến độ.

| #   | Giả định                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Hiệu năng nằm ngoài phạm vi.** Theo quyết định của bạn. Không có tiêu chí, không có story. Con số "dưới 0,5 giây" của v4 bị bỏ vì không đo được nên không nghiệm thu được.                                                                                                                                                 |
| 2   | **Backup do đội hạ tầng lo**, ngoài backlog.                                                                                                                                                                                                                                                                                 |
| 3   | **Giao diện chỉ tiếng Việt.** Không cài thư viện i18n, không bật localization của Payload. ⚠️ `CLAUDE.md` đang đánh dấu việc này là `[UNDECIDED]` và yêu cầu chốt **trước màn hình đầu tiên có chữ** — tức là trước `US-101`. **Cần bạn xác nhận dứt khoát.**                                                                |
| 4   | **Không có mạng xã hội nào khác ngoài Google.**                                                                                                                                                                                                                                                                              |
| 5   | **Trình duyệt**: các trình duyệt evergreen hiện hành. Thiết kế mobile-first. Không hỗ trợ IE.                                                                                                                                                                                                                                |
| 6   | **Quyền riêng tư**: trang Chính sách bảo mật do Admin quản lý; chỉ Admin đọc được dữ liệu Student và Enrollment; yêu cầu xóa dữ liệu xử lý thủ công.                                                                                                                                                                         |
| 7   | **Bảo mật cơ sở**: HTTPS, hash mật khẩu, kiểm tra quyền ở phía server, token xác minh và reset có thời hạn dùng một lần, validate và sanitize dữ liệu đầu vào.                                                                                                                                                               |
| 8   | **Giới hạn tần suất** cho gửi lại email xác minh và quên mật khẩu, để tránh bị lợi dụng gửi thư rác.                                                                                                                                                                                                                         |
| 9   | **Không di trú dữ liệu** từ Zalo hay Excel. Thiết kế thẳng cho luồng đích.                                                                                                                                                                                                                                                   |
| 10  | **Báo cáo và export** (`US-506`, `US-507`) chưa được đặc tả chi tiết vì đã nằm ngoài 2 sprint. Cần một vòng làm rõ trước khi triển khai.                                                                                                                                                                                     |
| 11  | **Hoàn tiền vẫn ghi nhận được**, qua `refundedAt` trên chính bản ghi giao dịch — không xóa bản ghi, vì xóa là mất bằng chứng. Bạn không nói tới hoàn tiền; tôi thêm vì `US-303` đã bắt học viên liên hệ Admin khi đã trả tiền, nên nghiệp vụ này chắc chắn xảy ra. **Không cần thì gạch dòng này** — bỏ đi còn đơn giản hơn. |
| 12  | **Học phí sửa được theo từng đăng ký** qua `amountDue` (`US-504`), để ghi nhận giảm giá và ưu đãi. Thuần túy là con số hiển thị — không ràng buộc số tiền thực thu, không ảnh hưởng trạng thái thanh toán.                                                                                                                   |
| 13  | **Không có duyệt hai bước cho giao dịch.** Một Admin nhập là ghi nhận luôn. Với một người vận hành thì duyệt chéo không có ý nghĩa.                                                                                                                                                                                          |
| 14  | **Tiền chỉ có một đơn vị là VNĐ.** Không đa tiền tệ, không tỷ giá.                                                                                                                                                                                                                                                           |
| 15  | **Ảnh bằng chứng không tự động xóa theo thời gian.** Đây là dữ liệu tài chính cá nhân; nếu tổ chức có chính sách lưu trữ thì cần thêm một story riêng.                                                                                                                                                                       |

---

## 10. Bảng tra cứu — v4 sang v5

| v4                                  | v5                           | Ghi chú                                                                                                                                                            |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| US-001 Trang chủ                    | `US-104`                     | Bỏ phụ thuộc vào quản lý khóa nổi bật                                                                                                                              |
| US-002 Danh sách khóa học           | `US-101`                     | Gộp với US-011 thành một lát cắt dọc                                                                                                                               |
| US-003 Lọc theo loại                | `US-103`                     | Lọc theo **danh mục**, vì `CourseType` không còn                                                                                                                   |
| US-004 Chi tiết khóa học            | `US-102`                     |                                                                                                                                                                    |
| US-005, US-006 Moodle               | —                            | **Bỏ.** Moodle ra khỏi sản phẩm                                                                                                                                    |
| US-007 Học viên đăng ký             | `US-301`                     | Đã bao gồm quy tắc chặn trùng                                                                                                                                      |
| US-008 Ngăn đăng ký trùng           | —                            | Thành acceptance criterion của `US-301`, không còn là story                                                                                                        |
| US-009 Xác nhận đăng ký             | `US-301`                     | Gộp vào                                                                                                                                                            |
| US-010 Admin đăng ký hộ             | `US-304`                     | Nay tạo cả account, trong một transaction                                                                                                                          |
| US-011, US-013 Quản lý Course       | `US-101`                     | Gộp                                                                                                                                                                |
| US-012 Phân loại khóa học           | —                            | **Bỏ** cùng `CourseType`                                                                                                                                           |
| US-014 Quản lý lớp                  | `US-401`                     | Đẩy lên sprint 1 vì không phụ thuộc Enrollment                                                                                                                     |
| US-015 Đăng ký tài khoản            | `US-201`                     | Thêm việc tạo profile rỗng trong cùng transaction                                                                                                                  |
| US-016, US-017 Đăng nhập, đăng xuất | `US-202`                     | Gộp                                                                                                                                                                |
| US-018, US-019 Thông tin tài khoản  | `US-205`                     | Gộp, thêm avatar                                                                                                                                                   |
| US-020 Reset mật khẩu               | `US-203`                     |                                                                                                                                                                    |
| US-021 Danh sách đăng ký            | `US-501`                     |                                                                                                                                                                    |
| US-022 Trạng thái đăng ký           | `US-502`                     |                                                                                                                                                                    |
| US-023 Trạng thái thanh toán        | `US-503`                     | **Thay bằng bản ghi giao dịch.** Một cờ bật tay → bảng `Payment` với số tiền, ngày, phương thức, mã tham chiếu và bằng chứng; `paymentStatus` thành giá trị suy ra |
| US-024 Sửa đăng ký                  | `US-504`                     |                                                                                                                                                                    |
| US-025 Xếp lớp                      | `US-402`                     |                                                                                                                                                                    |
| US-026 Export                       | `US-507`                     | Ngoài 2 sprint                                                                                                                                                     |
| US-027 Nội dung trang chủ           | `US-107`                     | Ngoài 2 sprint                                                                                                                                                     |
| US-028 Trang tĩnh                   | `US-105`                     |                                                                                                                                                                    |
| US-029 Tin tức                      | —                            | **Bỏ** theo yêu cầu                                                                                                                                                |
| US-030, US-031, US-032 Admin        | —                            | Payload đã cho sẵn. Một vai Admin duy nhất, không có ma trận quyền                                                                                                 |
| US-033 Dashboard Admin              | `US-505`                     | Ngoài 2 sprint. Rút còn 4 ô hướng hành động                                                                                                                        |
| US-034, US-035 Báo cáo              | `US-506`                     | Ngoài 2 sprint                                                                                                                                                     |
| US-036, US-037 Thông báo            | `US-601`                     | Mở rộng thành trung tâm thông báo, 7 sự kiện                                                                                                                       |
| US-038 Tìm kiếm                     | `US-103`                     | Gộp với lọc                                                                                                                                                        |
| US-039 SEO                          | `US-106`                     |                                                                                                                                                                    |
| US-040 Responsive                   | —                            | Thành acceptance criterion của từng story giao diện                                                                                                                |
| US-041 Hiệu năng                    | —                            | **Bỏ** theo quyết định của bạn                                                                                                                                     |
| US-042 Bảo mật                      | —                            | Thành giả định số 7 và các criterion trong `US-202`, `US-203`                                                                                                      |
| US-043 Privacy                      | —                            | Thành giả định số 6                                                                                                                                                |
| —                                   | `US-302`, `US-303`, `US-403` | **Mới.** Dashboard học viên — lỗ hổng lớn nhất của v4                                                                                                              |
| —                                   | `US-204`                     | **Mới.** Google sign-in                                                                                                                                            |
| —                                   | `US-508`                     | **Mới.** Bằng chứng thanh toán, lưu ở collection riêng không công khai                                                                                             |
| —                                   | `E-01`, `E-02`               | **Mới.** Hạ tầng email và staging, v4 không có story nào phụ trách                                                                                                 |
