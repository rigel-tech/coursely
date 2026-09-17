# Feature Specification: Admin Assigns a Student to a Class

**Feature Branch**: `feat/admin-assign-student-to-class`

**Created**: 2026-09-17

**Status**: Draft

**Input**: Luồng do người dùng mô tả: admin vào khóa học → gán lớp cho khóa học → vào lớp học →
thấy danh sách học viên đã đăng ký khóa đó → xếp học viên vào lớp. Ý tưởng ban đầu là hai card
kéo-thả; đã chốt **chưa làm kéo-thả** ở đợt này. Bốn quyết định nghiệp vụ đã chốt: chỉ xếp lớp
cho đơn `CONFIRMED`; chặn cứng khi vượt `maxStudents`; xếp lớp **không** đổi `enrollmentStatus`;
có làm luôn chiều "bỏ khỏi lớp".

**Note**: Toàn bộ đặc tả, kế hoạch kỹ thuật và danh sách việc nằm trong **một file này**, theo
quy ước của repo cho feature này (không tách `plan.md`/`tasks.md`/`research.md`/`checklists/`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Xếp nhiều học viên vào lớp trong một thao tác (Priority: P1)

Nhân sự trung tâm mở một lớp học đã tạo, thấy ngay danh sách học viên đang thuộc lớp, và thêm
được nhiều học viên đã đăng ký khóa học đó vào lớp chỉ trong một thao tác — không phải mở từng
đơn đăng ký ra sửa tay.

**Why this priority**: Đây là toàn bộ giá trị của tính năng. Hiện tại xếp lớp nghĩa là mở từng
`enrollment` một, chọn lớp trong dropdown — với lớp 30 người là 30 lần mở/lưu.

**Independent Test**: Tạo một lớp cho một khóa học có sẵn vài đơn `CONFIRMED` chưa xếp lớp; mở
lớp đó, chọn nhiều học viên một lượt, xác nhận cả nhóm xuất hiện trong danh sách lớp.

**Acceptance Scenarios**:

1. **Given** một lớp thuộc khóa X và ba đơn `CONFIRMED` của khóa X chưa xếp lớp, **When** nhân sự
   chọn cả ba và xếp vào lớp, **Then** cả ba thuộc lớp đó và biến mất khỏi danh sách "chưa xếp lớp".
2. **Given** một lớp chưa có ai, **When** nhân sự mở trang lớp, **Then** danh sách học viên hiện
   trạng thái rỗng rõ ràng, không phải lỗi hay khoảng trắng.
3. **Given** danh sách chọn học viên đang mở, **When** nhân sự tìm/lọc trong đó, **Then** chỉ thấy
   đơn của **đúng khóa học của lớp này**, đang `CONFIRMED`, và chưa thuộc lớp nào.

---

### User Story 2 - Không bao giờ xếp vượt sĩ số (Priority: P1)

Nhân sự chọn nhiều học viên hơn số chỗ còn lại của lớp.

**Why this priority**: Đây là ràng buộc vận hành thật — lớp vượt sĩ số là phòng học không đủ chỗ.
Phải đi cùng Story 1 trong cùng đợt, không phải vá sau.

**Independent Test**: Lớp `maxStudents = 5` đã có 2 người; chọn 8 người để xếp; xác nhận thao tác
bị từ chối, báo rõ còn 3 chỗ, và **không ai** bị xếp vào.

**Acceptance Scenarios**:

1. **Given** lớp còn 3 chỗ, **When** nhân sự chọn 8 học viên, **Then** thao tác bị từ chối kèm số
   chỗ còn lại, và số học viên trong lớp không đổi.
2. **Given** lớp đã đầy, **When** nhân sự mở danh sách chọn, **Then** hệ thống nói rõ lớp đã đầy
   thay vì để nhân sự chọn rồi mới báo lỗi.
3. **Given** một người cố xếp lớp bằng đường khác (sửa thẳng đơn đăng ký, sửa hàng loạt ở list
   view, gọi API), **When** lớp đã đủ `maxStudents`, **Then** thao tác đó cũng bị từ chối — ràng
   buộc không nằm riêng ở màn hình mới.

---

### User Story 3 - Bỏ học viên khỏi lớp (Priority: P2)

Nhân sự xếp nhầm, hoặc học viên xin đổi lớp, nên cần gỡ một học viên ra khỏi lớp.

**Why this priority**: Xếp nhầm là chuyện thường; không có chiều ngược lại thì nhân sự phải mở
từng đơn sửa tay — đúng cái việc tính năng này sinh ra để bỏ đi. Xếp vào (P1) phải có trước.

**Independent Test**: Gỡ một học viên khỏi lớp ngay trên trang lớp, xác nhận họ rời danh sách lớp
và quay lại được nhóm "chưa xếp lớp".

**Acceptance Scenarios**:

1. **Given** một học viên đang thuộc lớp, **When** nhân sự bỏ họ khỏi lớp, **Then** đơn đăng ký
   không còn thuộc lớp nào và mốc thời gian xếp lớp được xóa theo.
2. **Given** vừa bỏ một học viên khỏi lớp, **When** nhân sự mở lại danh sách chọn, **Then** học
   viên đó xuất hiện lại như một đơn chưa xếp lớp.
3. **Given** một học viên bị bỏ khỏi lớp, **When** kiểm tra lại đơn, **Then** `enrollmentStatus`
   giữ nguyên — bỏ khỏi lớp không phải là hủy đăng ký.

---

### User Story 4 - Không xếp được sang lớp của khóa học khác (Priority: P1)

Nhân sự mở một đơn đăng ký và chọn lớp bằng dropdown có sẵn của Payload.

**Why this priority**: Đây là lỗi **đang tồn tại hôm nay**, không phải rủi ro tương lai: dropdown
`class` hiện liệt kê mọi lớp trong hệ thống, kể cả lớp của khóa học khác — xếp nhầm không có gì
cảnh báo. Sửa cùng đợt này vì cùng một field.

**Independent Test**: Mở một đơn đăng ký của khóa X, mở dropdown chọn lớp, xác nhận không có lớp
nào của khóa Y trong danh sách.

**Acceptance Scenarios**:

1. **Given** một đơn đăng ký của khóa X, **When** nhân sự mở dropdown lớp, **Then** chỉ thấy lớp
   của khóa X.
2. **Given** một lớp đã `CANCELLED` hoặc `COMPLETED`, **When** nhân sự mở dropdown lớp, **Then**
   lớp đó không được chào mời.

### Edge Cases

- Hai nhân sự cùng xếp người vào một lớp gần như đồng thời: mỗi lần ghi đều tự đếm lại sĩ số nên
  không ai xếp được vào lớp đã đầy; nhưng hai lô chạy song song vẫn có thể cùng đọc "còn 3 chỗ"
  rồi cùng ghi — giới hạn đã biết, xem mục Assumptions.
- Đơn đăng ký bị hủy (`CANCELLED`) sau khi đã xếp lớp: nằm ngoài phạm vi đợt này — không tự gỡ
  khỏi lớp, vì luồng hủy hiện tại không đụng tới field lớp.
- Lớp có `maxStudents` bị sửa xuống thấp hơn số người đang có: không tự đẩy ai ra; ràng buộc chỉ
  áp cho lần xếp tiếp theo (lúc đó sẽ luôn bị từ chối vì đã vượt).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Trang chi tiết của một lớp đã lưu MUST hiển thị danh sách học viên hiện đang thuộc
  lớp đó, kèm trạng thái rỗng rõ ràng khi chưa có ai.
- **FR-002**: Từ trang đó, nhân sự MUST mở được danh sách chọn học viên, đã lọc sẵn: cùng khóa học
  với lớp, `enrollmentStatus = CONFIRMED`, và chưa thuộc lớp nào.
- **FR-003**: Nhân sự MUST chọn được nhiều học viên và xếp tất cả vào lớp trong một thao tác.
- **FR-004**: Hệ thống MUST từ chối thao tác xếp lớp nếu nó làm vượt `maxStudents`, nêu rõ số chỗ
  còn lại, và KHÔNG xếp ai trong lô đó.
- **FR-005**: Ràng buộc sĩ số MUST được áp ở tầng dữ liệu, cho mọi đường ghi (màn hình mới, sửa
  từng đơn, sửa hàng loạt ở list view, REST API) — không chỉ ở màn hình mới.
- **FR-006**: Mỗi lần xếp lớp thành công MUST ghi lại mốc thời gian xếp lớp.
- **FR-007**: Xếp lớp MUST KHÔNG thay đổi `enrollmentStatus`.
- **FR-008**: Nhân sự MUST bỏ được một học viên khỏi lớp ngay trên trang lớp; thao tác đó xóa cả
  liên kết lớp lẫn mốc thời gian xếp lớp, và không đổi `enrollmentStatus`.
- **FR-009**: Ở mọi màn hình, một đơn đăng ký MUST chỉ chọn được lớp **thuộc đúng khóa học của
  chính đơn đó**.
- **FR-010**: Lớp đã `CANCELLED` hoặc `COMPLETED` MUST KHÔNG được chào mời khi chọn lớp.

### Key Entities

- **Enrollment**: Đơn đăng ký của học viên cho một khóa học. Liên kết `class` của nó là thứ tính
  năng này đọc/ghi; `classAssignedAt` là mốc thời gian đi kèm.
- **Class**: Một lớp mở của một khóa học, có `maxStudents` (trần sĩ số) và `status`. Trang chi
  tiết của nó là nơi đặt toàn bộ thao tác xếp lớp.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Nhân sự xếp được N học viên vào lớp trong **một** thao tác, không rời trang lớp.
- **SC-002**: Không lớp nào vượt `maxStudents` qua bất kỳ đường ghi nào.
- **SC-003**: Không đơn đăng ký nào bị xếp vào lớp của khóa học khác — kể cả qua màn hình sửa đơn
  thông thường.
- **SC-004**: 100% lần xếp lớp thành công đều có mốc thời gian xếp lớp (hôm nay là 0%, vì không có
  gì ghi field đó).
- **SC-005**: `enrollmentStatus` không bị thay đổi bởi bất kỳ thao tác xếp/bỏ lớp nào.

## Assumptions

- **Lớp `DRAFT` vẫn xếp lớp được.** Chỉ `CANCELLED`/`COMPLETED` bị loại. Lý do: trung tâm thường
  chuẩn bị danh sách trước rồi mới mở lớp; chặn `DRAFT` sẽ buộc phải mở lớp trước khi xếp người.
- **Đơn `NEW` không xếp lớp được** (đã chốt). Nhân sự phải xác nhận đơn trước — nên trạng thái
  `CONFIRMED` giữ đúng ý nghĩa của nó.
- **Ràng buộc sĩ số được đóng kín bằng advisory lock, không phải "chấp nhận khe hở".** Xem mục
  "Đóng khe hở sĩ số" trong kế hoạch: mọi lần kiểm tra sĩ số đều nằm sau
  `pg_advisory_xact_lock(<ns>, classId)` trong cùng transaction với lần ghi, nên hai nhân sự xếp
  cùng một lớp bị tuần tự hóa và không thể cùng vượt trần. Không cần trigger, không cần migration.
- **Không có màn hình "gán lớp cho khóa học" riêng**: `Classes.course` đã là quan hệ bắt buộc, nên
  bước 2 trong luồng bạn mô tả chính là việc tạo lớp và chọn khóa học — đã có sẵn, không cần làm gì.
- **Không đổi phân quyền**: `Enrollments`/`Classes` đều đang `authenticated` (chỉ staff). Component
  admin gọi thẳng REST API của Payload bằng phiên đăng nhập sẵn có của staff — đúng pattern
  `NotificationBell` đã dùng (specs/011).

---

## Implementation Plan

### Summary

Không thêm field, **không cần migration** — `Enrollments.class` và `classAssignedAt` đã tồn tại.
Việc chia làm hai nửa: nửa **ràng buộc** nằm trong collection `Enrollments` (áp cho mọi đường ghi),
nửa **giao diện** là một component admin nhỏ gắn vào trang chi tiết `Classes`.

### Phát hiện then chốt (đã kiểm chứng trong `node_modules`)

`@payloadcms/ui` export sẵn `useListDrawer`, nhận `filterOptions` + `enableRowSelections` và trả
kết quả qua `onBulkSelect(selected, collectionSlug)`
(`node_modules/@payloadcms/ui/dist/elements/ListDrawer/{types,Provider}.d.ts`). Nghĩa là mở được
**nguyên list view của Payload trong drawer**, đã lọc sẵn, có đủ cột/tìm kiếm/lọc/phân trang/tick
chọn nhiều dòng — và nhận về tập id đã chọn. Vì vậy **không cần tự viết panel trái**, chỉ cần một
nút mở drawer. Đây là lý do kế hoạch này nhỏ hơn nhiều so với ý tưởng hai card ban đầu, và drawer
còn hơn card tĩnh ở chỗ có sẵn tìm kiếm/phân trang khi danh sách dài.

Mô hình tương tác cuối cùng, so với ý tưởng ban đầu của bạn:

| Ý tưởng 2 card                | Thực tế đề xuất                                          |
| ----------------------------- | -------------------------------------------------------- |
| Card phải: học viên trong lớp | Danh sách ngay trên trang lớp, có nút gỡ từng người      |
| Card trái: học viên chưa xếp  | Drawer list view của Payload, mở khi bấm "Thêm học viên" |
| Kéo từ trái sang phải         | Tick nhiều dòng → bấm xác nhận                           |
| Kéo từ phải sang trái         | Nút "Bỏ khỏi lớp" trên từng dòng                         |

### Đóng khe hở sĩ số (điểm kỹ thuật chính của đợt này)

Vấn đề: đếm-rồi-ghi mà không khóa thì hai transaction song song cùng đọc "còn 3 chỗ" rồi cùng ghi
→ lớp vượt trần, không có gì báo. Bốn dữ kiện đã xác minh trong `node_modules` quyết định cách sửa:

1. **Hook `beforeChange` chạy trong transaction.** `initTransaction(req)` được gọi ở đầu
   `updateByID` (dòng 21) và `update` (dòng 31), trước mọi hook. Nên hook có `req.transactionID`.
2. **Truy cập được drizzle client của đúng transaction đó**: `payload.db.sessions[transactionID].db`
   (`@payloadcms/drizzle/dist/types.d.ts:333`, được set ở `transactions/beginTransaction.js:44`).
   Từ đó chạy được SQL thô trên đúng transaction đang ghi.
3. **`payload.count()` nhận `req`** (`collections/operations/count.d.ts:8`), nên lần đếm cũng nằm
   trong cùng transaction và **thấy được các bản ghi vừa ghi trong chính lô đó**.
4. **Bulk PATCH của Payload KHÔNG rollback cả lô**: `update.js:200-210` bắt lỗi từng document, đẩy
   vào mảng `errors` rồi đi tiếp. Nên không được dựa vào bulk PATCH để có ngữ nghĩa "tất cả hoặc
   không gì cả" — 8 người vào lớp còn 5 chỗ sẽ thành 3 thành công + 5 lỗi.

**Cơ chế**: `SELECT pg_advisory_xact_lock(<namespace>, <classId>)` ngay trước khi đếm, trên
drizzle client của transaction hiện tại.

- Khóa gắn với transaction → tự nhả khi commit/rollback, không có code dọn dẹp nào để quên.
- Chỉ tuần tự hóa thao tác **trên cùng một lớp**; hai nhân sự xếp hai lớp khác nhau không chặn nhau.
- Không khóa hàng `classes` → sửa thông tin lớp vẫn chạy bình thường.
- Sau khi giữ khóa, con số đếm là số thật: transaction cạnh tranh hoặc đã commit (nên được đếm),
  hoặc còn chưa tới lượt kiểm tra.
- **Không đổi schema → không cần migration**, và tránh được cái bẫy "định nghĩa hai nơi" mà
  INVARIANTS đã ghi cho partial unique index (`afterSchemaInit` + migration tay phải khớp nhau).
  Trigger Postgres sẽ dính đúng cái bẫy đó, advisory lock thì không.

**Hai bề mặt ghi, hai vai trò khác nhau:**

| Bề mặt                                         | Cơ chế                                           | Ngữ nghĩa khi vượt trần                        |
| ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Endpoint xếp lô (màn hình mới)                 | 1 transaction tường minh + lock + kiểm tra cả lô | Từ chối **cả lô**, báo số chỗ còn lại (FR-004) |
| Mọi đường khác (sửa từng đơn, bulk edit, REST) | hook `beforeChange` + lock + đếm                 | Từ chối **từng document** (FR-005)             |

Hook là _bất biến_ — không đường nào lách được. Endpoint là _lời hứa UX_ — không xếp dở dang.
Hook chạy lồng trong transaction của endpoint cũng vô hại: advisory lock tái nhập được trong cùng
session, và lần đếm vẫn nhất quán (đã xếp 3/5 thì đơn thứ 4 vẫn thấy `count < maxStudents`).

**Giới hạn còn lại, nói thẳng**: nếu ai đó gọi với `disableTransaction: true` thì xact lock nhả
ngay và chỉ còn lại lần đếm không khóa (đúng mức an toàn như hôm nay, không tệ hơn). Repo hiện
**không dùng `disableTransaction` ở đâu cả** (đã grep `src/`, `tests/`), nên đây là lối thoát lý
thuyết; hook sẽ ghi chú rõ điều kiện này thay vì im lặng.

### Nửa 1 — Ràng buộc dữ liệu (`src/collections/Enrollments/`)

Phần này quan trọng hơn phần giao diện: nó là thứ FR-005/FR-009 dựa vào, và nó sửa hai lỗi đang
tồn tại.

1. **`filterOptions` cho field `class`** (`index.ts`) — chỉ lớp có `course` bằng `course` của chính
   đơn đăng ký, và `status` không thuộc `CANCELLED`/`COMPLETED`. Sửa FR-009/FR-010, đồng thời vá
   lỗi hiện tại: dropdown đang liệt kê mọi lớp của mọi khóa.
2. **Hook `setClassAssignedAt`** (`hooks/setClassAssignedAt.ts`, `beforeChange`) — mirror
   `setCreatedBy` đang có: khi `class` chuyển từ rỗng → có giá trị thì stamp `classAssignedAt`; khi
   chuyển về rỗng thì xóa. Sửa FR-006/FR-008 và vá lỗi hiện tại: field này readOnly nhưng **không
   có gì ghi nó**, nên luôn rỗng.
3. **Hook `guardClassCapacity`** (`hooks/guardClassCapacity.ts`, `beforeChange`) — khi `class` được
   set và khác giá trị cũ: lấy drizzle client của transaction hiện tại
   (`payload.db.sessions[req.transactionID]?.db`), chạy
   `SELECT pg_advisory_xact_lock(<ns>, classId)`, rồi
   `payload.count({ collection:'enrollments', where:{ class:{equals}, enrollmentStatus:{not_equals:'CANCELLED'} }, req })`
   và so với `maxStudents`; vượt thì `throw ClassFull`. Truyền `req` là bắt buộc — thiếu nó lần đếm
   rơi ra ngoài transaction và không thấy các bản ghi trong cùng lô. Áp cho **mọi** đường ghi (FR-005).
4. **`src/lib/errors/enrollment.ts`** — thêm `ClassFull` (và `ClassCourseMismatch` nếu muốn chặn
   cứng ở tầng hook chứ không chỉ lọc dropdown; `filterOptions` chỉ giới hạn UI, REST vẫn gửi được
   id lớp bất kỳ → nên có cả hai). Theo đúng mục INVARIANTS "A refusal must be _returned_, not
   thrown" ở phía action; ở tầng hook thì throw là đúng, Payload biến thành lỗi API.

### Nửa 1b — Xếp lô nguyên tử (`src/services/class-assignment.ts` + endpoint)

Vì bulk PATCH của Payload không rollback cả lô (dữ kiện 4 ở trên), chiều "xếp nhiều người" đi qua
một service riêng, dùng đúng idiom transaction **repo đã có sẵn** ở
`src/services/student-profile.ts:50-78` (`payload.db.beginTransaction()` → `commitTransaction` /
`rollbackTransaction`):

```
assignStudentsToClass({ classId, enrollmentIds, req })
  mở transaction
  → pg_advisory_xact_lock(<ns>, classId)        // tuần tự hóa theo lớp
  → đọc lớp (maxStudents, course, status)
  → đếm sĩ số hiện tại (trong transaction)
  → xác thực từng đơn: đúng course, CONFIRMED, chưa có lớp
  → nếu (đang có + số chọn) > maxStudents → rollback, throw ClassFull(còn N chỗ)   // không ai bị xếp
  → update từng đơn (truyền req → chung transaction, hook per-doc vẫn chạy và vẫn hợp lệ)
  → commit
```

Gọi từ admin panel bằng **endpoint của collection `Classes`** (`endpoints: [{ path: '/:id/assign-students', method: 'post' }]`):
phiên đăng nhập staff sẵn có xác thực luôn, handler chỉ cần kiểm tra `req.user?.collection === 'users'`
(đúng predicate `authenticated`). Đây là endpoint tùy biến **đầu tiên** của repo — chọn nó thay vì
server action vì nó nằm cùng collection, dùng lại `req`/transaction của Payload, và phía client gọi
bằng `requests.post(...)` y hệt cách `NotificationBell` đang gọi REST (specs/011 Decision 1).

Chiều ngược lại ("bỏ khỏi lớp") không cần endpoint: một `PATCH /api/enrollments/<id>` với
`{ class: null }` là đủ, không có ràng buộc sĩ số nào để bảo vệ.

### Nửa 2 — Giao diện trên trang lớp (`src/collections/Classes/` + `src/components/admin/`)

5. **Field `ui` trong `Classes`** — một slot không lưu dữ liệu, trỏ tới component bằng đường dẫn
   chuỗi (`'@/components/admin/ClassRoster#ClassRoster'`), đúng kiểu `NotificationBell`/`RowLabel`
   đang làm. **Bắt buộc chạy `pnpm generate:importmap`** sau đó — xem INVARIANTS, thiếu bước này
   component im lặng không render.
6. **`src/components/admin/ClassRoster/index.tsx`** (`'use client'`) —
   - Lấy id/dữ liệu lớp hiện tại bằng `useDocumentInfo()`; `config.routes.api` bằng `useConfig()`.
   - Danh sách lớp: `GET /api/enrollments?where[class][equals]=<id>` (dùng `requests` của
     `@payloadcms/ui/utilities/api`, y như bell).
   - Nút "Thêm học viên": mở `useListDrawer` với `collectionSlugs: ['enrollments']`,
     `enableRowSelections: true`, `filterOptions` = cùng khóa + `CONFIRMED` + chưa có lớp.
   - `onBulkSelect` → `POST /api/classes/<id>/assign-students` với danh sách id (endpoint ở Nửa 1b).
     Client **không** tự quyết định đủ chỗ hay không: nó chỉ hiển thị số chỗ còn lại cho dễ nhìn,
     còn phán quyết nằm ở server trong transaction có khóa. Lý do: kiểm tra phía client không chặn
     được hai nhân sự song song, mà đó chính là tình huống đợt này phải đóng.
   - Nút "Bỏ khỏi lớp" từng dòng → `PATCH /api/enrollments/<id>` với `{ class: null }`.
   - Chỉ render khi document đã có id (lớp chưa lưu thì chưa xếp được ai) — cùng nguyên tắc
     join-field của Payload.
   - Dựng bằng primitive của `@payloadcms/ui` (`Button`, `Pill`, `Drawer`…), không tự chế control
     — theo `CLAUDE.md`. Không đụng token màu vì đây là admin UI (ngoài phạm vi theme-guard).

**Đánh đổi đã cân nhắc**: dùng field `join` sẵn có của Payload cho danh sách lớp thì khỏi viết
code, nhưng join field không có hành động "gỡ khỏi lớp" trên từng dòng, và đặt cạnh component thì
danh sách hiện hai lần. Nên gộp cả hai chiều vào một component.

### Không làm ở đợt này

- Kéo-thả (đã chốt). Nếu sau này cần, cấu trúc dữ liệu và API không đổi — chỉ thay lớp tương tác.
- Màn hình "gán lớp cho khóa học" riêng — `Classes.course` đã lo việc đó.
- Tự gỡ khỏi lớp khi đơn bị hủy; trigger Postgres cho ràng buộc sĩ số tuyệt đối.

### Bản nháp danh sách test (sẽ chốt qua `AskUserQuestion` trước khi viết code)

**Có khả năng là bắt buộc**

- Unit: `Enrollments.class` có `filterOptions`, và hàm đó trả về `where` lọc đúng theo `course` của
  đơn + loại lớp `CANCELLED`/`COMPLETED`.
- Unit: `setClassAssignedAt` — stamp khi gán lớp, xóa khi bỏ lớp, không đụng khi field khác đổi.
- Int: xếp một đơn `CONFIRMED` vào lớp còn chỗ → `class` và `classAssignedAt` được ghi,
  `enrollmentStatus` không đổi.
- Int: xếp vào lớp đã đủ `maxStudents` → bị từ chối (`ClassFull`), đơn không đổi — kể cả khi gọi
  thẳng Local API, không qua màn hình mới.
- Int: bỏ khỏi lớp → `class` và `classAssignedAt` đều rỗng, `enrollmentStatus` không đổi.
- Int (**đóng khe hở sĩ số**): `assignStudentsToClass` với số người vượt số chỗ còn lại → không ai
  bị xếp (rollback thật, đếm lại sau lỗi phải bằng đúng con số trước đó), và thông điệp nêu số chỗ
  còn lại.
- Int (**đua thật, không giả lập**): chạy song song hai lệnh `assignStudentsToClass` vào cùng một
  lớp còn đúng 1 chỗ bằng `Promise.all` → đúng một lệnh thành công, một lệnh `ClassFull`, sĩ số
  cuối cùng bằng `maxStudents`. Đây là test chứng minh advisory lock có tác dụng; bỏ khóa đi thì
  nó phải đỏ.

**Có khả năng là đề xuất thêm**

- Int: gán lớp thuộc khóa học khác qua Local API → bị từ chối (chỉ có nếu làm `ClassCourseMismatch`).
- Component: `ClassRoster` từ chối tại chỗ khi số người chọn vượt số chỗ còn lại và không gọi PATCH.

### Chữ ký API đã xác minh (không phải phỏng đoán)

| Thứ cần dùng                | Chữ ký thật                                                                              | Nguồn                                        |
| --------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| `filterOptions`             | `({ data, id, relationTo, req, siblingData, user }) => Where \| boolean \| Promise<...>` | `fields/config/types.d.ts:134,161`           |
| Endpoint của collection     | `{ path, method, handler: (req: PayloadRequest) => Response \| Promise<Response> }`      | `config/types.d.ts:254,266`                  |
| Tham số `:id` trong handler | `req.routeParams`                                                                        | `types/index.d.ts:56`                        |
| Gọi API từ component admin  | `requests.post/patch/get(url, options)`                                                  | `@payloadcms/ui/dist/utilities/api.d.ts`     |
| Lấy document đang mở        | `useDocumentInfo() → { id, savedDocumentData, docConfig }`                               | `providers/DocumentInfo/types.d.ts:27,46,62` |
| Drizzle của transaction     | `payload.db.sessions[transactionID].db`                                                  | `@payloadcms/drizzle/dist/types.d.ts:333`    |
| Đếm trong transaction       | `payload.count({ ..., req })`                                                            | `collections/operations/count.d.ts:8`        |

**Một cảnh báo nằm ngay trong type của Payload**: `filterOptions` nhận `data` là **object rỗng khi
được gọi từ component Filter ở list view** (ghi rõ trong doc-comment của `FilterOptionsProps`).
Nghĩa là bộ lọc "chỉ lớp cùng khóa học" chỉ chắc chắn đúng ở **màn hình sửa đơn**; ở bộ lọc của
list view nó suy biến. Đây chính là lý do FR-009 không được phép chỉ dựa vào `filterOptions` —
phải có thêm chặn ở tầng hook (`ClassCourseMismatch`), nếu không sẽ có một đường ghi âm thầm lọt.

### Danh sách việc, theo thứ tự

Mỗi bước dừng được: chạy test xanh rồi mới sang bước sau.

**Chặng A — ràng buộc dữ liệu (làm mọi màn hình an toàn, kể cả khi dừng ở đây)**

- [ ] A1. `src/lib/errors/enrollment.ts`: thêm `ClassFull` (constructor nhận số chỗ còn lại để
      đưa vào thông điệp) và `ClassCourseMismatch`.
- [ ] A2. `src/collections/Enrollments/hooks/setClassAssignedAt.ts` (`beforeChange`): stamp
      `classAssignedAt` khi `class` rỗng → có; xóa khi có → rỗng; không đụng khi field khác đổi.
- [ ] A3. `src/collections/Enrollments/hooks/guardClassCapacity.ts` (`beforeChange`): advisory
      lock → `payload.count({..., req})` → so `maxStudents` → `throw ClassFull`. Kèm chặn
      `ClassCourseMismatch` (lớp phải cùng `course` với đơn) vì `filterOptions` không phủ hết.
- [ ] A4. `src/collections/Enrollments/index.ts`: gắn hai hook vào `beforeChange` (sau
      `setCreatedBy`), thêm `filterOptions` cho field `class`.
- [ ] A5. Chạy test chặng A → xanh.

**Chặng B — xếp lô nguyên tử**

- [ ] B1. `src/services/class-assignment.ts`: `assignStudentsToClass({ classId, enrollmentIds, req })`
      theo đúng idiom transaction ở `student-profile.ts:50-78`.
- [ ] B2. `src/collections/Classes/endpoints/assign-students.ts` + đăng ký vào `Classes.endpoints`;
      handler kiểm tra `req.user?.collection === 'users'`, đọc `req.routeParams.id`, parse body,
      map lỗi typed → HTTP status + thông điệp.
- [ ] B3. Test chặng B, **gồm test đua song song bằng `Promise.all`** → xanh.

**Chặng C — giao diện**

- [ ] C1. `src/components/admin/ClassRoster/index.tsx` (+ `index.css` nếu cần) — danh sách lớp,
      nút gỡ từng người, nút "Thêm học viên" mở `useListDrawer` đã lọc sẵn, gọi endpoint ở B2.
- [ ] C2. `src/collections/Classes/index.ts`: thêm field `type: 'ui'` trỏ tới component bằng
      đường dẫn chuỗi.
- [ ] C3. **`pnpm generate:importmap`** — thiếu bước này component im lặng không render, không có
      lỗi nào (xem INVARIANTS).
- [ ] C4. `pnpm generate:types` nếu schema đổi (dự kiến **không**, vì không thêm field lưu trữ).
- [ ] C5. `pnpm lint` + `pnpm typecheck` + `pnpm test:unit` + `pnpm test:int` → xanh hết.

**Chặng D — xác nhận bằng mắt (cần bạn làm)**

- [ ] D1. Mở `/admin`, vào một lớp: thấy danh sách học viên, nút "Thêm học viên" mở drawer đã lọc
      đúng (chỉ đơn `CONFIRMED`, cùng khóa, chưa có lớp).
- [ ] D2. Xếp vượt sĩ số → bị từ chối, **không ai** bị xếp, thông điệp nêu số chỗ còn lại.
- [ ] D3. Gỡ một người khỏi lớp → họ quay lại danh sách chọn.
- [ ] D4. Mở một đơn đăng ký bất kỳ → dropdown lớp không còn lớp của khóa học khác.

Tôi không có công cụ trình duyệt trong phiên này nên chặng D phải do bạn xác nhận — tôi sẽ nói rõ
điều đó khi báo cáo xong, không tuyên bố là đã kiểm tra.

### Rủi ro đã biết, và cách xử lý

| Rủi ro                                                      | Xử lý                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `filterOptions` suy biến ở list-view filter (`data` rỗng)   | Không dựa vào nó cho FR-009; chặn thật ở hook `ClassCourseMismatch`                                  |
| Bulk PATCH của Payload không rollback cả lô                 | Chiều xếp lô không dùng bulk PATCH, đi qua endpoint có transaction riêng                             |
| `disableTransaction: true` làm xact lock vô hiệu            | Repo không dùng cờ này (đã grep); hook ghi chú rõ điều kiện thay vì im lặng                          |
| Endpoint tùy biến là thứ đầu tiên của repo, chưa có tiền lệ | Bám sát type `Endpoint` chính thức; auth bằng chính predicate `authenticated` đang dùng ở collection |
| Component admin không render vì quên `generate:importmap`   | Là bước C3 tách riêng trong danh sách việc, không gộp vào bước khác                                  |
