# Product Backlog — Website Quảng bá và Đăng ký Khóa học

> Nguồn: `Product_Backlog_Website_Quang_ba_Dang_ky_Khoa_hoc_v4.pdf` (v4).
> Bản Markdown này là bản trích xuất nguyên văn, giữ nguyên tiếng Việt của tài liệu gốc.

---

## 1. Tầm nhìn sản phẩm

Xây dựng một website đóng vai trò là nền tảng trung tâm để quảng bá và tiếp nhận đăng ký khóa học:

- **Khóa học Moodle miễn phí** — người học xem thông tin trên website và được chuyển hướng sang hệ thống Moodle bên ngoài để đăng ký/học.
- **Khóa học offline** — học viên xem thông tin Course công khai và đăng ký Course trên website sau khi đăng nhập; học viên không chọn Class. Admin xác nhận đăng ký và xếp học viên vào Class phù hợp.
- **Nội dung khóa học và website** — Admin có thể tạo, cập nhật, xuất bản và quản lý Course, Class, nội dung và đăng ký.

### Nguyên tắc nghiệp vụ chính

- Website không thực hiện thanh toán trực tuyến.
- Trạng thái thanh toán của Enrollment offline được Admin cập nhật trên hệ thống và không phải là điều kiện để xếp lớp.
- Khóa học Moodle được lưu trữ trên một website Moodle riêng biệt; trong phạm vi hiện tại website chỉ lưu liên kết và chuyển hướng.
- Học viên tự đăng ký Course offline trên website bắt buộc phải có tài khoản đã xác minh email và đăng nhập.
- Admin có thể đăng ký Course offline trực tiếp cho học viên không có tài khoản website.
- Website công khai chỉ hiển thị Course; thông tin Class không hiển thị trên public.
- Khóa học offline được tổ chức theo mô hình **Course → Enrollment → Class Assignment**. Mỗi đăng ký Course tạo một Enrollment; Class chỉ được Admin gán sau.
- Enrollment chỉ cần có trạng thái đăng ký "Đã xác nhận" để đủ điều kiện xếp lớp, với điều kiện Class thuộc đúng Course và còn chỗ.
- Mỗi Class có số lượng học viên tối đa do Admin cấu hình.
- Chỉ có một loại Admin và Admin có toàn quyền quản trị hệ thống.

---

## 2. Mức độ ưu tiên MVP

| Priority | Ý nghĩa                           |
| -------- | --------------------------------- |
| P0       | Bắt buộc phải có trong MVP        |
| P1       | Quan trọng, nên triển khai        |
| P2       | Có thể triển khai ở giai đoạn sau |

---

## Epic 1 — Website công khai & Tìm kiếm khóa học

### US-001 — Trang chủ

**Priority:** P0

**User Story:** Là một khách truy cập, tôi muốn xem trang chủ rõ ràng để hiểu các khóa học đang được cung cấp và nhanh chóng tìm được khóa học phù hợp.

**Acceptance Criteria:**

- Trang chủ hiển thị thông tin giới thiệu về tổ chức.
- Hiển thị các khóa học nổi bật.
- Phân biệt rõ khóa học Moodle miễn phí và khóa học offline.
- Có menu điều hướng đến danh sách khóa học.
- Có CTA phù hợp cho từng loại khóa học.
- Hoạt động tốt trên desktop, tablet và mobile.

### US-002 — Xem danh sách khóa học

**Priority:** P0

**User Story:** Là một khách truy cập, tôi muốn xem danh sách các khóa học để tìm khóa học phù hợp với nhu cầu của mình.

**Acceptance Criteria:**

- Khách truy cập có thể xem danh sách các Course đã được xuất bản.
- Mỗi Course hiển thị tối thiểu: tên, loại, mô tả ngắn, hình ảnh và trạng thái.
- Course chưa được xuất bản không hiển thị trên website công khai.
- Khách truy cập có thể chọn Course để xem chi tiết.

### US-003 — Lọc khóa học theo loại

**Priority:** P1

**User Story:** Là một khách truy cập, tôi muốn lọc khóa học theo loại để nhanh chóng tìm được loại khóa học mình muốn.

**Acceptance Criteria:**

- Có thể lọc khóa học Moodle miễn phí.
- Có thể lọc khóa học offline.
- Kết quả được cập nhật chính xác.
- Có thể xóa bộ lọc.

### US-004 — Trang chi tiết khóa học

**Priority:** P0

**User Story:** Là một khách truy cập, tôi muốn xem thông tin chi tiết về Course trước khi quyết định đăng ký.

**Acceptance Criteria:**

- Hiển thị tên, mô tả, mục tiêu học tập, hình ảnh, thông tin giảng viên, loại khóa học và thời lượng.
- Đối với Course offline, không hiển thị danh sách Class, lịch Class, địa điểm Class hoặc số chỗ của Class trên public.
- Có hướng dẫn đăng ký và nút hành động phù hợp.
- Nếu người dùng chưa đăng nhập và chọn đăng ký Course offline, hệ thống yêu cầu đăng nhập hoặc đăng ký tài khoản.
- Nội dung có thể được quản lý bởi Admin.

---

## Epic 2 — Đăng ký khóa học Moodle

### US-005 — Nút đăng ký khóa học Moodle

**Priority:** P0

**User Story:** Là một người học, tôi muốn truy cập khóa học Moodle miễn phí để có thể học trực tuyến.

**Acceptance Criteria:**

- Course Moodle có nút "Đăng ký / Bắt đầu học".
- Khi nhấn nút, người học được chuyển hướng đến URL Moodle tương ứng.
- Link dẫn đến đúng khóa học trên Moodle.
- Website không xử lý thanh toán hoặc enrollment Moodle trong phạm vi hiện tại.

### US-006 — Quản lý liên kết Moodle

**Priority:** P0

**User Story:** Là một Admin, tôi muốn cấu hình URL Moodle cho từng Course để người học được chuyển đến đúng khóa học.

**Acceptance Criteria:**

- Admin có thể nhập/cập nhật URL Moodle.
- Hệ thống kiểm tra URL đã được nhập.
- Admin có thể mở thử URL Moodle.
- Thay đổi được cập nhật trên website công khai.

---

## Epic 3 — Đăng ký khóa học offline

### US-007 — Học viên đăng ký Course offline

**Priority:** P0

**User Story:** Là một học viên đã có tài khoản, tôi muốn đăng ký một Course offline để tổ chức tiếp nhận đăng ký và xếp lớp cho tôi.

**Acceptance Criteria:**

- Chỉ người dùng đã đăng nhập bằng tài khoản đã xác minh email mới được đăng ký Course offline.
- Nếu chưa đăng nhập, hệ thống yêu cầu đăng nhập hoặc đăng ký tài khoản trước khi tiếp tục.
- Đăng ký được thực hiện từ trang chi tiết Course offline.
- Hệ thống sử dụng thông tin học viên đã liên kết với tài khoản; học viên có thể kiểm tra thông tin trước khi xác nhận đăng ký.
- Học viên chọn Course, không chọn Class.
- Sau khi gửi thành công, hệ thống tạo một Enrollment cho Student + Course; Class chưa được gán.
- Enrollment ghi nhận nguồn đăng ký là học viên tự đăng ký trên website.
- Học viên nhận được thông báo xác nhận đã tiếp nhận đăng ký.

### US-008 — Ngăn đăng ký trùng

**Priority:** P1

**User Story:** Là một Admin, tôi muốn hạn chế các bản đăng ký trùng để dữ liệu đăng ký chính xác.

**Acceptance Criteria:**

- Hệ thống kiểm tra Enrollment hiện có dựa trên Student + Course.
- Nếu phát hiện Enrollment đang còn hiệu lực cho cùng Student và Course, hệ thống cảnh báo hoặc ngăn tạo trùng theo quy tắc cấu hình.
- Kiểm tra áp dụng cho cả học viên tự đăng ký và Admin đăng ký trực tiếp.
- Admin vẫn có thể xử lý trường hợp ngoại lệ theo quy trình vận hành nếu cần.

### US-009 — Xác nhận đã tiếp nhận đăng ký

**Priority:** P0

**User Story:** Là một học viên, tôi muốn nhận xác nhận sau khi đăng ký Course để biết đăng ký của mình đã được hệ thống tiếp nhận.

**Acceptance Criteria:**

- Hiển thị thông báo sau khi tạo Enrollment thành công.
- Thông báo chứa thông tin Course và trạng thái đăng ký hiện tại.
- Không hiển thị hoặc yêu cầu chọn Class tại thời điểm đăng ký.
- Đối với học viên có tài khoản, email xác nhận được gửi đến email tài khoản.
- Thông báo nêu rõ việc thanh toán được thực hiện riêng/offline.

### US-010 — Admin đăng ký Course trực tiếp cho học viên

**Priority:** P0

**User Story:** Là một Admin, tôi muốn đăng ký Course offline trực tiếp cho học viên để tiếp nhận các trường hợp đăng ký qua điện thoại, trực tiếp hoặc kênh ngoài website.

**Acceptance Criteria:**

- Admin có thể tìm Student hiện có theo họ tên, email hoặc số điện thoại.
- Nếu Student chưa tồn tại, Admin có thể tạo Student mới với thông tin tối thiểu gồm họ tên, email và số điện thoại.
- Không yêu cầu tạo UserAccount, mật khẩu hoặc tài khoản website cho Student do Admin nhập trực tiếp.
- Admin chọn Course offline cần đăng ký; không chọn Class tại bước tạo đăng ký.
- Hệ thống tạo Enrollment cho Student + Course và ghi nhận nguồn đăng ký là Admin tạo trực tiếp.
- Hệ thống áp dụng kiểm tra đăng ký trùng trước khi tạo Enrollment.
- Student không có UserAccount vẫn được quản lý, xác nhận đăng ký, cập nhật thanh toán và xếp Class bình thường.

---

## Epic 4 — Khóa học & Lớp học

### US-011 — Tạo và quản lý khóa học

**Priority:** P0

**User Story:** Là một Admin, tôi muốn tạo và quản lý Course để đăng tải và quảng bá trên website.

**Acceptance Criteria:**

- Admin có thể tạo, chỉnh sửa, lưu bản nháp và xuất bản Course.
- Có thể nhập tên, mô tả, loại khóa học, hình ảnh, giảng viên, thời lượng, mục tiêu và trạng thái.
- Course chưa xuất bản không hiển thị công khai.

### US-012 — Phân loại khóa học

**Priority:** P0

**User Story:** Là một Admin, tôi muốn xác định Course là Moodle hay offline để hệ thống áp dụng đúng quy trình.

**Acceptance Criteria:**

- Mỗi Course có một loại: Moodle hoặc Offline.
- Course Moodle có URL Moodle.
- Course Offline có thể có nhiều Class được Admin quản lý nội bộ.
- Loại Course quyết định CTA và quy trình đăng ký.

### US-013 — Chỉnh sửa và xuất bản khóa học

**Priority:** P0

**User Story:** Là một Admin, tôi muốn chỉnh sửa và xuất bản/ẩn Course để kiểm soát nội dung hiển thị.

**Acceptance Criteria:**

- Admin có thể chỉnh sửa Course.
- Có thể lưu thay đổi.
- Có thể xuất bản/hủy xuất bản.
- Course chưa xuất bản không hiển thị công khai.
- Các Enrollment hiện có không bị xóa khi Course bị ẩn.

### US-014 — Quản lý lớp học và sức chứa

**Priority:** P0

**User Story:** Là một Admin, tôi muốn tạo và quản lý các Class thuộc một Course offline, bao gồm số lượng học viên tối đa, để phục vụ việc xếp lớp.

**Acceptance Criteria:**

- Admin có thể tạo, chỉnh sửa, kích hoạt/đóng Class.
- Mỗi Class thuộc đúng một Course offline.
- Class có tối thiểu: tên/mã lớp, ngày bắt đầu, ngày kết thúc, thời gian, địa điểm, giảng viên và trạng thái.
- Admin có thể thiết lập và chỉnh sửa số lượng học viên tối đa (MaxStudents) cho từng Class.
- Hệ thống hiển thị trong Admin số học viên đã được xếp và số lượng tối đa của Class.
- Class và thông tin vận hành của Class không hiển thị trên website công khai.
- Việc giảm MaxStudents không được làm mất Enrollment đã được xếp; nếu số hiện tại vượt mức mới, hệ thống cảnh báo Admin.

---

## Epic 5 — Tài khoản người dùng

### US-015 — Đăng ký tài khoản và xác minh email

**Priority:** P0

**User Story:** Là một khách truy cập, tôi muốn đăng ký và xác minh tài khoản để có thể đăng nhập và đăng ký Course offline.

**Acceptance Criteria:**

- Người dùng đăng ký bằng họ tên, email, số điện thoại và mật khẩu.
- Email phải hợp lệ và không được trùng với UserAccount đã tồn tại.
- Mật khẩu phải đáp ứng yêu cầu bảo mật và được lưu trữ dưới dạng hash an toàn.
- Sau khi gửi đăng ký tài khoản, hệ thống gửi email xác minh có liên kết hoặc mã có thời hạn.
- Tài khoản chỉ được kích hoạt sau khi email được xác minh thành công.
- Người dùng có thể yêu cầu gửi lại email xác minh khi liên kết/mã cũ hết hạn.
- Khi tài khoản được kích hoạt, hệ thống tạo hoặc liên kết Student tương ứng với UserAccount.

### US-016 — Đăng nhập người dùng

**Priority:** P0

**User Story:** Là một người dùng đã có tài khoản, tôi muốn đăng nhập bằng email và mật khẩu để sử dụng các chức năng dành cho học viên.

**Acceptance Criteria:**

- Người dùng có thể đăng nhập bằng email và mật khẩu đã đăng ký.
- Chỉ tài khoản đang hoạt động và đã xác minh email mới được đăng nhập.
- Thông tin đăng nhập không hợp lệ bị từ chối và hệ thống hiển thị thông báo phù hợp.
- Sau khi đăng nhập thành công, hệ thống tạo phiên đăng nhập an toàn.
- Người dùng đã đăng nhập có thể đăng ký Course offline.

### US-017 — Đăng xuất người dùng

**Priority:** P0

**User Story:** Là một người dùng đã đăng nhập, tôi muốn đăng xuất để kết thúc phiên sử dụng an toàn.

**Acceptance Criteria:**

- Người dùng đã đăng nhập có chức năng đăng xuất.
- Sau khi đăng xuất, phiên đăng nhập hiện tại không còn hiệu lực.
- Người dùng được chuyển về khu vực website công khai và vẫn có thể xem thông tin Course.

### US-018 — Xem thông tin tài khoản

**Priority:** P1

**User Story:** Là một người dùng đã đăng nhập, tôi muốn xem thông tin tài khoản cơ bản để kiểm tra dữ liệu đang được lưu.

**Acceptance Criteria:**

- Người dùng có thể xem họ tên, email, số điện thoại và trạng thái tài khoản.
- Chỉ người dùng đã đăng nhập mới có thể xem thông tin tài khoản của chính mình.
- Không hiển thị mật khẩu hoặc dữ liệu xác thực nhạy cảm.

### US-019 — Chỉnh sửa thông tin tài khoản

**Priority:** P1

**User Story:** Là một người dùng đã đăng nhập, tôi muốn cập nhật thông tin cá nhân để thông tin phục vụ đăng ký khóa học luôn chính xác.

**Acceptance Criteria:**

- Người dùng có thể chỉnh sửa họ tên và số điện thoại.
- Email đăng nhập không thay đổi trong phạm vi hiện tại.
- Dữ liệu được kiểm tra hợp lệ trước khi lưu.
- Thông tin mới được cập nhật vào Student liên kết để sử dụng cho các đăng ký trong tương lai.
- Việc cập nhật tài khoản không tự động thay đổi dữ liệu lịch sử đã lưu trên Enrollment nếu hệ thống lưu snapshot.

### US-020 — Quên và reset mật khẩu người dùng

**Priority:** P0

**User Story:** Là một người dùng, tôi muốn đặt lại mật khẩu khi quên mật khẩu để có thể tiếp tục truy cập tài khoản.

**Acceptance Criteria:**

- Trang đăng nhập có chức năng "Quên mật khẩu".
- Người dùng có thể yêu cầu reset bằng email đã đăng ký.
- Hệ thống gửi liên kết hoặc mã reset có thời hạn.
- Liên kết hoặc mã reset chỉ sử dụng được một lần.
- Người dùng đặt mật khẩu mới đáp ứng yêu cầu bảo mật.
- Sau khi reset thành công, mật khẩu cũ không còn sử dụng được.

---

## Epic 6 — Quản lý đăng ký, xếp lớp & thanh toán offline

### US-021 — Danh sách đăng ký

**Priority:** P0

**User Story:** Là một Admin, tôi muốn xem danh sách Enrollment để quản lý học viên đăng ký Course và quá trình xếp lớp.

**Acceptance Criteria:**

- Admin có thể xem tất cả Enrollment từ cả website và đăng ký trực tiếp bởi Admin.
- Danh sách hiển thị tối thiểu: học viên, Course, Class được xếp nếu có, nguồn đăng ký, ngày đăng ký, trạng thái đăng ký và trạng thái thanh toán.
- Admin có thể tìm kiếm và lọc dữ liệu.

### US-022 — Trạng thái đăng ký

**Priority:** P0

**User Story:** Là một Admin, tôi muốn quản lý trạng thái Enrollment để theo dõi quá trình đăng ký và xác định điều kiện xếp lớp.

**Acceptance Criteria:**

- Tối thiểu hỗ trợ: Mới đăng ký, Đã xác nhận, Đã tham gia, Hoàn thành, Đã hủy.
- Admin có thể thay đổi trạng thái đăng ký.
- Trạng thái được hiển thị trong Enrollment.
- Enrollment có trạng thái "Đã xác nhận" được xem là đủ điều kiện về trạng thái để xếp Class.

### US-023 — Cập nhật trạng thái thanh toán

**Priority:** P0

**User Story:** Là một Admin, tôi muốn cập nhật trạng thái thanh toán của Enrollment để theo dõi tình trạng thanh toán.

**Acceptance Criteria:**

- Mỗi Enrollment offline có trạng thái thanh toán.
- Chỉ có: Chưa thanh toán, Đã thanh toán, Đã hủy.
- Admin có thể cập nhật trạng thái.
- Trạng thái hiển thị trong danh sách Enrollment.
- PaymentStatus không phải điều kiện để xếp Class.
- MVP không tích hợp cổng thanh toán trực tuyến.

### US-024 — Chỉnh sửa đăng ký

**Priority:** P0

**User Story:** Là một Admin, tôi muốn chỉnh sửa Enrollment để xử lý các thay đổi trong quá trình vận hành.

**Acceptance Criteria:**

- Admin có thể chỉnh sửa thông tin vận hành của Enrollment theo quyền được phép.
- Có thể thay đổi trạng thái đăng ký.
- Có thể thay đổi trạng thái thanh toán.
- Có thể hủy Enrollment.
- Nếu Enrollment đã được xếp Class, việc đổi Class phải tuân thủ quy tắc cùng Course và sức chứa của Class mới.

### US-025 — Xếp lớp cho học viên

**Priority:** P0

**User Story:** Là một Admin, tôi muốn xếp học viên có Enrollment đã xác nhận vào một Class phù hợp để tổ chức học offline.

**Acceptance Criteria:**

- Chỉ Enrollment có trạng thái đăng ký "Đã xác nhận" mới được xếp Class.
- Không yêu cầu trạng thái thanh toán "Đã thanh toán" để xếp Class.
- Class được chọn phải thuộc đúng Course của Enrollment.
- Class phải đang ở trạng thái cho phép xếp học viên và chưa đạt MaxStudents.
- Hệ thống không cho xếp vượt quá MaxStudents.
- Sau khi xếp Class, thông tin Class được lưu trên Enrollment.
- Admin có thể đổi Class khi cần; hệ thống kiểm tra lại Course và sức chứa Class mới.
- Nếu không đủ điều kiện, hệ thống không cho xếp và hiển thị lý do.

### US-026 — Export dữ liệu

**Priority:** P1

**User Story:** Là một Admin, tôi muốn export dữ liệu học viên, Enrollment và thanh toán để phục vụ công việc vận hành.

**Acceptance Criteria:**

- Có thể export danh sách Enrollment.
- Có thể export dữ liệu Student tối thiểu được lưu trong hệ thống.
- Có thể export Course, Class đã xếp, nguồn đăng ký, trạng thái đăng ký và trạng thái thanh toán.
- Chức năng export tuân thủ quyền Admin.

---

## Epic 7 — Quản lý nội dung website

### US-027 — Quản lý nội dung trang chủ

**Priority:** P1

**User Story:** Là một Admin, tôi muốn chỉnh sửa nội dung trang chủ mà không cần thay đổi code.

**Acceptance Criteria:**

- Admin có thể chỉnh sửa các section trên trang chủ.
- Có thể quản lý Course nổi bật.
- Có thể thay đổi hình ảnh/nội dung.
- Có thể xuất bản thay đổi.

### US-028 — Quản lý các trang tĩnh

**Priority:** P0

**User Story:** Là một Admin, tôi muốn quản lý các trang như Giới thiệu, Liên hệ, Điều khoản và Chính sách bảo mật.

**Acceptance Criteria:**

- Admin có thể tạo/chỉnh sửa trang.
- Có thể xuất bản/ẩn trang.
- Có thể định dạng văn bản và thêm link.

### US-029 — Tin tức

**Priority:** P1

**User Story:** Là một Admin, tôi muốn đăng tin tức để cung cấp thông tin mới cho người truy cập website.

**Acceptance Criteria:**

- Admin có thể tạo tin tức.
- Có thể xuất bản/ẩn tin tức.
- Website công khai hiển thị các tin tức đã xuất bản.

---

## Epic 8 — Đăng nhập & quản trị Admin

### US-030 — Đăng nhập Admin

**Priority:** P0

**User Story:** Là một Admin, tôi muốn đăng nhập an toàn vào trang quản trị để ngăn người không có quyền truy cập hệ thống.

**Acceptance Criteria:**

- Đăng nhập bằng email/username và password.
- Thông tin đăng nhập không hợp lệ bị từ chối.
- Mật khẩu được lưu trữ an toàn.
- Admin có thể đăng xuất.
- Session tự hết hạn sau khoảng thời gian phù hợp.

### US-031 — Reset mật khẩu Admin

**Priority:** P0

**User Story:** Là một Admin, tôi muốn đặt lại mật khẩu khi quên mật khẩu để khôi phục quyền truy cập trang quản trị an toàn.

**Acceptance Criteria:**

- Trang đăng nhập Admin có chức năng "Quên mật khẩu".
- Admin có thể yêu cầu reset bằng email của tài khoản Admin.
- Hệ thống gửi liên kết hoặc mã reset có thời hạn.
- Liên kết hoặc mã reset chỉ được sử dụng một lần.
- Admin có thể đặt mật khẩu mới đáp ứng yêu cầu bảo mật.
- Sau khi reset thành công, mật khẩu cũ không còn sử dụng được.

### US-032 — Quản trị một Admin

**Priority:** P0

**User Story:** Là chủ hệ thống, tôi muốn chỉ có một loại Admin có toàn quyền quản trị để hệ thống đơn giản và dễ vận hành.

**Acceptance Criteria:**

- Hệ thống chỉ có một loại vai trò Admin.
- Admin có quyền quản lý Course, Class, Student, Enrollment, thanh toán, nội dung và Moodle URL.
- Không cần role/permission matrix cho nhiều loại Admin.
- Các chức năng quản trị được bảo vệ bằng authentication/authorization.

---

## Epic 9 — Dashboard & Báo cáo

### US-033 — Dashboard Admin

**Priority:** P0

**User Story:** Là một Admin, tôi muốn xem dashboard với các chỉ số chính để nhanh chóng nắm được tình trạng Course, Enrollment và Class.

**Acceptance Criteria:**

- Hiển thị số Course đã xuất bản.
- Hiển thị số Course Moodle và offline.
- Hiển thị số Class đang hoạt động.
- Hiển thị số Enrollment mới và đã xác nhận.
- Hiển thị số Enrollment chưa thanh toán và đã thanh toán.
- Có thể hiển thị các Class sắp diễn ra và mức sử dụng sức chứa của Class.

### US-034 — Báo cáo đăng ký

**Priority:** P1

**User Story:** Là một Admin, tôi muốn tạo báo cáo Enrollment để phân tích tình hình đăng ký khóa học.

**Acceptance Criteria:**

- Có thể lọc theo Course, Class, nguồn đăng ký, ngày và trạng thái.
- Kết quả hiển thị thông tin đăng ký tối thiểu.
- Có thể export CSV/Excel.

### US-035 — Báo cáo thanh toán

**Priority:** P1

**User Story:** Là một Admin, tôi muốn xem báo cáo trạng thái thanh toán để theo dõi tình hình thu tiền từ Course offline.

**Acceptance Criteria:**

- Có thể lọc theo Course, Class, ngày và trạng thái thanh toán.
- Báo cáo hiển thị số lượng/chỉ số theo trạng thái thanh toán.
- Không tính doanh thu dự kiến hoặc số tiền còn phải thu vì website không quản lý học phí.
- Có thể export báo cáo trạng thái thanh toán.

---

## Epic 10 — Thông báo

### US-036 — Thông báo đăng ký mới cho Admin

**Priority:** P0

**User Story:** Là một Admin, tôi muốn nhận thông báo khi có học viên tự đăng ký Course offline trên website để có thể xử lý đăng ký.

**Acceptance Criteria:**

- Enrollment mới do học viên tự đăng ký tạo email thông báo cho Admin.
- Email chứa thông tin học viên và Course.
- Người nhận là Admin.
- Enrollment do chính Admin tạo trực tiếp không bắt buộc gửi thông báo đăng ký mới cho Admin.

### US-037 — Thông báo thay đổi trạng thái thanh toán

**Priority:** P2

**User Story:** Là một học viên có tài khoản, tôi muốn nhận thông báo khi trạng thái thanh toán thay đổi để biết tình trạng đăng ký của mình.

**Acceptance Criteria:**

- Admin có thể bật/tắt thông báo.
- Học viên có UserAccount nhận email khi trạng thái thay đổi nếu chức năng được bật.
- Email chứa thông tin Course và trạng thái mới.
- Đối với Student không có UserAccount, việc gửi email phụ thuộc vào email liên hệ được lưu và cấu hình thông báo.

---

## Epic 11 — Tìm kiếm & SEO

### US-038 — Tìm kiếm khóa học

**Priority:** P1

**User Story:** Là một khách truy cập, tôi muốn tìm kiếm Course để nhanh chóng tìm được khóa học phù hợp.

**Acceptance Criteria:**

- Có thể tìm kiếm theo tên Course và nội dung liên quan.
- Kết quả chỉ hiển thị Course công khai phù hợp.
- Không trả về Class trong kết quả public.
- Hoạt động trên mobile và desktop.

### US-039 — SEO cho trang khóa học

**Priority:** P1

**User Story:** Là một nhân viên marketing, tôi muốn tối ưu các trang Course cho công cụ tìm kiếm để người học có thể tìm thấy khóa học.

**Acceptance Criteria:**

- Mỗi Course có SEO title.
- Có meta description.
- URL Course dễ đọc.
- Trang sử dụng heading phù hợp.
- Hình ảnh có alt text.
- Website có sitemap.

---

## Epic 12 — Yêu cầu phi chức năng

### US-040 — Responsive Website

**Priority:** P0

**User Story:** Là một người dùng, tôi muốn website hoạt động tốt trên các thiết bị để có trải nghiệm nhất quán.

**Acceptance Criteria:**

- Website hoạt động trên mobile, tablet và desktop.
- Form và luồng tài khoản có thể sử dụng dễ dàng trên mobile.
- Trang Course hiển thị tốt trên màn hình nhỏ.

### US-041 — Hiệu năng

**Priority:** P0

**User Story:** Là một người dùng, tôi muốn website có hiệu năng tốt để truy cập và sử dụng thuận tiện.

**Acceptance Criteria:**

- Các trang công khai tải trong thời gian dưới 0,5 giây trong điều kiện vận hành mục tiêu.
- Hình ảnh được tối ưu.
- Danh sách Course không tải dữ liệu không cần thiết.
- Trang Admin vẫn hoạt động tốt khi số lượng Course, Student, Enrollment và Class tăng.

### US-042 — Bảo mật

**Priority:** P0

**User Story:** Là chủ hệ thống, tôi muốn website bảo vệ tài khoản Admin, tài khoản người dùng và dữ liệu học viên.

**Acceptance Criteria:**

- Website sử dụng HTTPS.
- Mật khẩu được hash an toàn.
- Authentication/authorization được kiểm tra phía server.
- Email verification và password reset sử dụng token/mã có thời hạn và cơ chế an toàn.
- Dữ liệu người dùng được validate/sanitize.
- Thông tin cá nhân được bảo vệ.
- Phòng chống các lỗ hổng web phổ biến.
- Có cơ chế backup định kỳ.

### US-043 — Privacy & Consent

**Priority:** P0

**User Story:** Là chủ hệ thống, tôi muốn việc thu thập và xử lý thông tin học viên tuân thủ yêu cầu về privacy và consent.

**Acceptance Criteria:**

- Luồng đăng ký tài khoản và đăng ký Course có thông tin privacy/consent phù hợp.
- Admin có thể nhập Student trực tiếp theo quy trình vận hành được tổ chức phê duyệt.
- Chỉ Admin mới có thể truy cập dữ liệu Student/Enrollment trong trang quản trị.
- Chính sách bảo mật có thể được quản lý bởi Admin.
- Có thể triển khai chính sách lưu trữ/xóa dữ liệu theo yêu cầu.

---

## 3. Phạm vi MVP đề xuất

Đối với phiên bản đầu tiên, nên tập trung vào các quy trình nghiệp vụ chính sau:

### MVP — Bắt buộc

- Website công khai: Trang chủ, danh sách Course, trang chi tiết Course; không hiển thị Class trên public.
- Đăng ký tài khoản người dùng có xác minh email; đăng nhập, đăng xuất và reset mật khẩu.
- Học viên tự đăng ký Course offline bắt buộc phải đăng nhập; học viên không chọn Class.
- Admin có thể tạo Student và đăng ký Course trực tiếp cho học viên mà không cần tạo UserAccount.
- Mỗi đăng ký Course tạo một Enrollment; Enrollment có nguồn đăng ký từ website hoặc Admin.
- Course offline có nhiều Class; Admin quản lý Class và MaxStudents.
- Admin xác nhận Enrollment và có thể xếp Class khi Enrollment ở trạng thái "Đã xác nhận", không phụ thuộc PaymentStatus.
- Hệ thống không cho xếp vượt quá MaxStudents và Class phải thuộc đúng Course.
- Quản lý trạng thái đăng ký và trạng thái thanh toán: Chưa thanh toán / Đã thanh toán / Đã hủy.
- Chuyển hướng đến Moodle bằng Moodle URL.
- Admin đăng nhập, reset mật khẩu và quản trị toàn hệ thống; chỉ một loại Admin.
- CRUD Course, Class, Student và Enrollment.
- Quản lý nội dung cơ bản và các trang tĩnh.
- Dashboard cơ bản.
- Email notification cho Admin khi học viên tự đăng ký Course mới.
- Responsive, Security, Privacy/Consent và backup cơ bản.

### Post-MVP / P1-P2

- Lọc/tìm kiếm/SEO nâng cao.
- Xem và chỉnh sửa thông tin tài khoản nâng cao.
- Ngăn đăng ký trùng nâng cao và quy trình xử lý ngoại lệ.
- Export dữ liệu và báo cáo nâng cao.
- Quản lý nội dung trang chủ và Tin tức nâng cao.
- Email tự động khi thay đổi trạng thái thanh toán.
- Analytics nâng cao.
- Tích hợp/sync Moodle, SSO hoặc API nếu phát sinh nhu cầu trong tương lai.

---

## 4. Mô hình dữ liệu cốt lõi đề xuất

### AdminUser

- Chỉ có một loại Admin.
- Email/username và PasswordHash.
- Email dùng cho chức năng reset mật khẩu.

### UserAccount

- FullName
- Email (unique)
- Phone
- PasswordHash
- Status
- EmailVerified / thời điểm xác minh email
- Liên kết tới Student tương ứng.

### Student

- FullName
- Email
- Phone
- UserAccountID (nullable) — Student do Admin tạo trực tiếp có thể không có tài khoản website.

### Course

- CourseType: MOODLE hoặc OFFLINE
- CourseContent
- MoodleURL (đối với Course Moodle)
- Trạng thái xuất bản

### Class

- CourseID
- Tên/mã lớp
- Schedule
- Location
- Instructor
- Status
- MaxStudents — số học viên tối đa do Admin cấu hình.
- Số học viên đã xếp nên được tính từ Enrollment đang gán vào Class thay vì nhập thủ công.

### Enrollment

- StudentID
- CourseID
- ClassID (nullable khi mới đăng ký; Admin gán sau)
- EnrollmentStatus
- PaymentStatus
- RegistrationSource: SELF_REGISTRATION hoặc ADMIN_CREATED
- RegisteredAt
- Có thể lưu snapshot thông tin liên hệ tại thời điểm đăng ký nếu cần bảo toàn lịch sử.

### Quan hệ và nguyên tắc dữ liệu

- Một UserAccount liên kết với một Student; tuy nhiên Student có thể tồn tại mà không có UserAccount khi được Admin nhập trực tiếp.
- Một Student có thể có nhiều Enrollment theo các Course khác nhau.
- Mỗi lần đăng ký Course thành công tạo một Enrollment mới; không tạo Course hoặc Class mới.
- Enrollment được tạo trước khi có Class. ClassID có thể để trống cho đến khi Admin xếp lớp.
- Điều kiện xếp Class: EnrollmentStatus = "Đã xác nhận", Class thuộc đúng Course, Class đang cho phép xếp và số học viên hiện tại < MaxStudents.
- PaymentStatus được quản lý độc lập và không phải điều kiện xếp Class.
- Class là dữ liệu vận hành nội bộ, không hiển thị trên website public.

---

## 5. Thứ tự ưu tiên Product Backlog

| Rank | User Story | Tên                                         | Priority |
| ---- | ---------- | ------------------------------------------- | -------- |
| 1    | US-001     | Trang chủ                                   | P0       |
| 2    | US-002     | Xem danh sách khóa học                      | P0       |
| 3    | US-004     | Trang chi tiết khóa học                     | P0       |
| 4    | US-015     | Đăng ký tài khoản và xác minh email         | P0       |
| 5    | US-016     | Đăng nhập người dùng                        | P0       |
| 6    | US-017     | Đăng xuất người dùng                        | P0       |
| 7    | US-020     | Quên và reset mật khẩu người dùng           | P0       |
| 8    | US-007     | Học viên đăng ký Course offline             | P0       |
| 9    | US-009     | Xác nhận đã tiếp nhận đăng ký               | P0       |
| 10   | US-010     | Admin đăng ký Course trực tiếp cho học viên | P0       |
| 11   | US-011     | Tạo và quản lý khóa học                     | P0       |
| 12   | US-012     | Phân loại khóa học                          | P0       |
| 13   | US-013     | Chỉnh sửa và xuất bản khóa học              | P0       |
| 14   | US-014     | Quản lý lớp học và sức chứa                 | P0       |
| 15   | US-005     | Nút đăng ký khóa học Moodle                 | P0       |
| 16   | US-006     | Quản lý liên kết Moodle                     | P0       |
| 17   | US-021     | Danh sách đăng ký                           | P0       |
| 18   | US-022     | Trạng thái đăng ký                          | P0       |
| 19   | US-023     | Cập nhật trạng thái thanh toán              | P0       |
| 20   | US-024     | Chỉnh sửa đăng ký                           | P0       |
| 21   | US-025     | Xếp lớp cho học viên                        | P0       |
| 22   | US-030     | Đăng nhập Admin                             | P0       |
| 23   | US-031     | Reset mật khẩu Admin                        | P0       |
| 24   | US-032     | Quản trị một Admin                          | P0       |
| 25   | US-033     | Dashboard Admin                             | P0       |
| 26   | US-036     | Thông báo đăng ký mới cho Admin             | P0       |
| 27   | US-028     | Quản lý các trang tĩnh                      | P0       |
| 28   | US-040     | Responsive Website                          | P0       |
| 29   | US-041     | Hiệu năng                                   | P0       |
| 30   | US-042     | Bảo mật                                     | P0       |
| 31   | US-043     | Privacy & Consent                           | P0       |
| 32   | US-003     | Lọc khóa học theo loại                      | P1       |
| 33   | US-008     | Ngăn đăng ký trùng                          | P1       |
| 34   | US-018     | Xem thông tin tài khoản                     | P1       |
| 35   | US-019     | Chỉnh sửa thông tin tài khoản               | P1       |
| 36   | US-026     | Export dữ liệu                              | P1       |
| 37   | US-027     | Quản lý nội dung trang chủ                  | P1       |
| 38   | US-029     | Tin tức                                     | P1       |
| 39   | US-034     | Báo cáo đăng ký                             | P1       |
| 40   | US-035     | Báo cáo thanh toán                          | P1       |
| 41   | US-038     | Tìm kiếm khóa học                           | P1       |
| 42   | US-039     | SEO cho trang khóa học                      | P1       |
| 43   | US-037     | Thông báo thay đổi trạng thái thanh toán    | P2       |
