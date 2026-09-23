# Feature Specification: Response mang cookie phiên không bao giờ được cache dùng chung

**Feature Branch**: `fix/cookies-token-cache` (nhánh đang làm việc — không tạo nhánh mới)

**Created**: 2026-09-22

**Status**: Draft

**Input**: BUG-08 trên ClickUp — "Phiên đăng nhập của user bị lộ sang người dùng khác qua cache
dùng chung" (urgent, Sprint 3). `src/proxy.ts` gắn `Set-Cookie: coursely-access=<JWT>` (nhánh
`renew`) và xóa cặp cookie (nhánh `clear`) lên response của trang tĩnh vốn mang
`Cache-Control: s-maxage=31536000`. Next 16 không tự hạ header đó xuống `private/no-store`, nên
bất kỳ cache dùng chung nào phía trước (Cloudflare "Cache Everything", `proxy_cache` của nginx)
lưu lại response kèm token rồi phát lại cho mọi khách tiếp theo → chiếm phiên / account takeover.
Đã tái hiện 100% trên prod build cục bộ + proxy cache mô phỏng CDN.

**Note**: Toàn bộ đặc tả, kế hoạch kỹ thuật và danh sách việc nằm trong **một file này**, theo
quy ước của repo (không tách `plan.md`/`tasks.md`/`research.md`/`checklists/`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Khách mới vào site luôn là khách, không bao giờ là người khác (Priority: P1)

Một người chưa từng đăng nhập mở trang chủ. Dù trước đó bao nhiêu học viên đã đi qua đúng URL ấy
và được gia hạn phiên, người này vẫn thấy mình là khách: header mời đăng nhập, không có cookie
phiên nào trong trình duyệt, `/tai-khoan` vẫn đẩy về trang đăng nhập.

**Why this priority**: Đây là toàn bộ lỗ hổng. Mọi thứ khác trong đợt này chỉ là hệ quả.

**Independent Test**: Một học viên ACTIVE có `coursely-refresh` còn hạn, `coursely-access` đã hết
hạn, mở `/` qua một cache dùng chung. Sau đó một trình duyệt sạch (cookie rỗng) mở đúng `/`. Xác
nhận trình duyệt sạch không nhận `Set-Cookie` nào và `/next/auth-status` trả `authenticated:false`.

**Acceptance Scenarios**:

1. **Given** một học viên có refresh còn hạn và access đã hết hạn, **When** người đó mở một trang
   tĩnh, **Then** response gia hạn phiên mang `Cache-Control: private, no-store` và không cache
   dùng chung nào được phép lưu nó.
2. **Given** response gia hạn ở kịch bản trên đã đi qua cache dùng chung, **When** một trình duyệt
   sạch mở đúng URL đó, **Then** trình duyệt sạch không nhận cookie `coursely-*` nào.
3. **Given** một người có refresh token không verify được (hỏng, hết hạn, sai khóa), **When** người
   đó mở một trang bất kỳ, **Then** response xóa cookie — kể cả khi là response redirect — cũng
   mang `private, no-store`.

---

### User Story 2 - Khách vãng lai vẫn được phục vụ từ cache như trước (Priority: P1)

Một người không đăng nhập duyệt trang chủ, danh sách khóa học, blog. Tốc độ không đổi: cache dùng
chung vẫn phục vụ các trang tĩnh cho họ y như trước bản vá.

**Why this priority**: Phải đi cùng Story 1 trong cùng đợt. Một bản vá "an toàn" bằng cách tắt
cache cho tất cả mọi người là đổi một lỗi bảo mật lấy một lỗi hiệu năng trên toàn site — và sẽ bị
gỡ ra sau vài tuần, mang lỗ hổng quay lại.

**Independent Test**: Gọi một trang tĩnh với request hoàn toàn không cookie, và với request mang
access token còn hạn. Xác nhận cả hai response giữ nguyên `Cache-Control` do Next sinh ra, không
bị hệ thống chèn `no-store`.

**Acceptance Scenarios**:

1. **Given** một request ẩn danh (không cookie), **When** người đó mở trang tĩnh, **Then** hệ
   thống không ghi `Set-Cookie` và không đụng tới `Cache-Control` của trang.
2. **Given** một học viên có access token còn hạn, **When** người đó mở trang tĩnh, **Then** không
   có gia hạn nào xảy ra, không `Set-Cookie`, và `Cache-Control` của trang giữ nguyên.

---

### Edge Cases

- **Response redirect mang cookie**: nhánh `clear` vừa xóa cookie vừa trả redirect về `/dang-nhap`.
  Redirect là response cache được và nó mang `Set-Cookie` — phải `no-store` như mọi response khác.
- **`/admin`**: là đường dẫn bình thường với `proxy`, phiên học viên vẫn được gia hạn/xóa ở đó
  (đã pin trong `tests/int/proxy-session.spec.ts`). Quy tắc cache áp dụng y hệt, không có ngoại lệ.
- **Server Action POST**: không đi qua nhánh `decideRoute` nhưng vẫn có thể được gia hạn. POST vốn
  không cache được, nhưng quy tắc gắn vào **việc ghi cookie**, không gắn vào method — nên nhánh
  này cũng được phủ mà không cần điều kiện riêng.
- **Cache đã bị nhiễm từ trước**: bản vá chỉ ngăn nhiễm mới. Cache staging đang giữ response cũ
  kèm token vẫn phát nó ra cho tới khi bị purge — xem mục "Ngoài phạm vi repo".

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Mỗi response mà lớp bảo vệ phiên ghi `Set-Cookie` lên (gia hạn access token, hoặc
  xóa cặp cookie) MUST mang `Cache-Control: private, no-store`.
- **FR-002**: FR-001 MUST áp dụng cho cả response phục vụ trang (`next`) lẫn response chuyển hướng
  (`redirect`) — không có nhánh nào được miễn trừ.
- **FR-003**: Response mà lớp bảo vệ phiên **không** ghi cookie MUST giữ nguyên `Cache-Control` do
  framework sinh ra; hệ thống không được đặt, sửa hay xóa header đó.
- **FR-004**: Giá trị header MUST hạ được `s-maxage` của một trang đã prerender — nghĩa là header
  do lớp bảo vệ đặt phải thắng header mặc định của trang, không bị ghi đè ngược lại.
- **FR-005**: Ràng buộc FR-001 MUST được ghi vào `INVARIANTS.md` trong **cùng commit** với bản vá,
  vì nó vỡ im lặng (không lỗi, không cảnh báo) và ràng buộc mọi code ghi cookie phiên về sau.

### Key Entities

- **Cặp cookie phiên** (`coursely-access`, `coursely-refresh`): credential cá nhân của đúng một
  trình duyệt. Chỉ `students` id nằm trong đó (xem INVARIANTS). Không bao giờ được rời khỏi trình
  duyệt sở hữu nó.
- **Response cache được**: response của một trang tĩnh/ISR, mang `s-maxage` và vì thế được phép
  lưu bởi cache **dùng chung** — nơi không phân biệt người dùng.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 0 trên 100 lượt truy cập từ trình duyệt sạch nhận được cookie phiên của người khác,
  trong kịch bản tái hiện của BUG-08 (hiện tại: 100/100 nhận được).
- **SC-002**: 100% response mang `Set-Cookie` phiên đều không-cache-được bởi cache dùng chung.
- **SC-003**: Tỷ lệ cache hit cho khách ẩn danh trên các trang tĩnh không giảm so với trước bản vá.
- **SC-004**: Kịch bản tái hiện trong task (prod build + proxy cache mô phỏng CDN) chạy lại và
  không tái hiện được lỗi.

## Assumptions

- Ứng dụng chạy self-hosted qua Node server (`next start` trong Docker trên VPS), không phải
  runtime edge của Vercel. Đường đi header của hai môi trường này khác nhau — xem "Phát hiện then
  chốt". Staging `coursely.digifund.tech` đúng là self-hosted.
- `private, no-store` là đủ; không cần thêm `no-cache, max-age=0, must-revalidate`. `no-store` đã
  cấm mọi cache lưu response, `private` là lớp diễn đạt thừa nhưng vô hại và đọc rõ ý định.
- Lớp cache phía trước (nginx/Cloudflare) tôn trọng `no-store`. Đây là hành vi HTTP chuẩn; nếu một
  cache cụ thể không tôn trọng thì phải sửa ở lớp đó, và đó là lý do tồn tại của lớp phòng thủ thứ
  hai ghi ở "Ngoài phạm vi repo".
- Không có route handler nào khác trong `src/app/(frontend)` đang ghi cookie phiên lên một response
  cache được. (Các action đăng nhập/OTP/logout ghi cookie qua Server Action POST — không cache được.)

## Implementation Plan

### Summary

Một dòng trong `src/proxy.ts`: khi và chỉ khi có ghi cookie, đặt `Cache-Control: private, no-store`
lên response. Kèm một entry `INVARIANTS.md`. Không có file mới, không có abstraction mới.

### Phát hiện then chốt (đã kiểm chứng trong `node_modules`, Next 16.3.0)

Task để ngỏ câu hỏi: _Next có tôn trọng `Cache-Control` do proxy đặt, đè lên `s-maxage` của trang
tĩnh không?_ **Có**, trên đường Node self-hosted. Chuỗi ba bước:

1. `server/lib/router-utils/resolve-routes.js:462` — mọi header proxy trả về được copy vào
   `resHeaders`. Danh sách lọc `ipcForbiddenHeaders`
   (`server/lib/server-ipc/utils.js:31`) gồm `accept-encoding`, `keepalive`, `keep-alive`,
   `content-encoding`, `transfer-encoding`, `connection`, `expect` — **không** có `cache-control`.
2. `server/lib/router-server.js:395` — `resHeaders` được `res.setHeader(...)` **trước khi** render.
3. `server/send-payload.js:60` — `if (cacheControl && !res.getHeader('Cache-Control'))`. Next chỉ
   đặt `s-maxage` của trang **khi header chưa tồn tại**.

→ Header của proxy đã nằm sẵn trên `res` ở bước 2, nên bước 3 bỏ qua. Không cần phương án dự phòng
"tách endpoint gia hạn riêng" mà task đề xuất.

**Giới hạn của phát hiện này**: runtime edge đi nhánh khác (`server/next-server.js:1374`), dùng
`appendHeader` chứ không `setHeader` — hai giá trị `Cache-Control` sẽ cùng tồn tại và hành vi tùy
cache đọc cái nào. Đây là lý do "self-hosted Node" nằm trong Assumptions, và là lý do lớp phòng thủ
thứ hai ở nginx/CDN vẫn cần thiết chứ không phải thừa.

### Bản vá

`src/proxy.ts`, ngay sau hai nhánh ghi cookie hiện có:

```ts
if (renew) await refreshAccessCookie(response.cookies, renew)
if (clear) clearSessionCookies(response.cookies)
if (renew || clear) response.headers.set('Cache-Control', 'private, no-store')
```

Điều kiện `renew || clear` chính là "response này có `Set-Cookie`" — `resolveIdentity` không bao
giờ đặt cả hai, và không có đường nào khác trong file ghi cookie. Không dùng điều kiện theo method
hay theo path: quy tắc gắn vào việc ghi cookie, nên nó tự phủ nhánh redirect, `/admin` và Server
Action POST mà không cần liệt kê.

Kèm một comment `why` trên dòng đó — Next không tự hạ cache khi middleware set cookie, và chính
điều đó là BUG-08. Không phải comment mô tả dòng code; là comment ghi lại cái vỡ nếu ai đó bỏ nó đi.

### Danh sách test — đã chốt qua `AskUserQuestion` 2026-09-22

Bắt buộc, viết vào `tests/int/proxy-session.spec.ts` (module `src/proxy.ts` đã có spec riêng ở đó),
**đỏ trước, chụp output đỏ, rồi mới vá**:

1. **Nhánh `renew` → `no-store`**: request có refresh còn hạn, không access → response mang
   `Cache-Control: private, no-store` cùng với `Set-Cookie: coursely-access`. Đây đúng là kịch bản
   tái hiện của BUG-08.
2. **Nhánh `clear` → `no-store`**: refresh token không verify → response redirect về `/dang-nhap`,
   xóa cả hai cookie, và cũng mang `private, no-store`.
3. **Không ghi cookie → không đụng `Cache-Control`**: hai case — access token còn hạn, và hoàn
   toàn không cookie → `res.headers.get('cache-control')` là `null`.

Đề xuất thêm (**đã bị từ chối**, không làm ở đợt này): e2e trên prod build với cache mô phỏng; test
quét toàn bộ route public tìm `Set-Cookie` thiếu `no-store`.

**Điều test bắt buộc KHÔNG chứng minh**: rằng Next thực sự tôn trọng header ấy đè lên `s-maxage`.
Ba test trên chốt hợp đồng phía `proxy`; phần còn lại dựa trên việc đọc source Next 16.3.0 ở trên,
và được xác nhận lần cuối bằng kịch bản tái hiện có sẵn của task (`repro/watch.mjs`). Ghi rõ ở đây
để không ai đọc nhầm phạm vi bằng chứng.

### Danh sách việc, theo thứ tự

1. Viết ba test bắt buộc vào `tests/int/proxy-session.spec.ts`. Chạy `pnpm test:int` (cần
   `docker compose up -d`). **Xem và chụp output đỏ** — thất bại phải là assertion về
   `cache-control`, không phải import sai hay runner hỏng.
2. Vá `src/proxy.ts` (một dòng + comment). Chạy lại `pnpm test:int` → xanh.
3. Thêm entry `INVARIANTS.md`: _"Một response mang `Set-Cookie` phiên phải là `private, no-store`"_
   — nêu quy tắc, vì sao vỡ im lặng, nơi áp dụng (`src/proxy.ts`), test nào pin nó.
4. `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` xanh.
5. Chạy lại kịch bản tái hiện của task trên prod build cục bộ để đóng SC-004.
6. Commit (một commit: vá + test + invariant), mở PR, dán link PR vào custom field "PR link" của
   task, comment kết quả kiểm chứng vào ClickUp.

### Ngoài phạm vi repo — cần task riêng cho ops

Repo này chỉ có `Dockerfile` và `docker-compose.yml`; không có config nginx/Cloudflare để sửa.

- **Lớp phòng thủ thứ hai**: cấu hình nginx/Cloudflare không cache response có `Set-Cookie`, và
  bypass cache khi request mang cookie `coursely-*`. Độc lập với app, và là thứ duy nhất còn đứng
  vững nếu ai đó sau này chạy trên runtime edge.
- **Khắc phục hậu quả staging**: purge toàn bộ cache CDN. Cân nhắc xoay `PAYLOAD_SECRET` để vô
  hiệu mọi token đang lưu hành — theo INVARIANTS _"A session cannot be revoked"_, xoay secret là
  cách duy nhất; nó đăng xuất toàn bộ người dùng, nên là quyết định của chủ sản phẩm chứ không
  phải của bản vá này.

### Rủi ro đã biết, và cách xử lý

| Rủi ro                                                                  | Xử lý                                                                                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next đổi thứ tự đặt header ở bản sau, `send-payload` chuyển sang ghi đè | Entry INVARIANTS ghi rõ chuỗi ba bước và số dòng, để lần nâng cấp Next sau có chỗ kiểm lại. Test #1 sẽ vẫn xanh dù hành vi thật đã vỡ — đây là lý do lớp nginx/CDN không được bỏ. |
| Ai đó thêm nhánh ghi cookie mới trong `proxy` và quên header            | Điều kiện đặt ở một chỗ duy nhất, ngay dưới hai nhánh ghi cookie. Entry INVARIANTS là thứ chặn ở review.                                                                          |
| `no-store` vô tình lan sang response ẩn danh, giết cache toàn site      | Test bắt buộc #3 pin đúng việc đó.                                                                                                                                                |
| Triển khai lên runtime edge trong tương lai                             | Ghi trong Assumptions và trong entry INVARIANTS. Hành vi `appendHeader` ở nhánh edge khác hẳn, phải kiểm lại trước khi đổi hạ tầng.                                               |

## Đợt 2 — sau review BUG-08 (2026-09-23)

Review xác nhận bản vá đúng trên prod build, và nêu ba điểm còn hở. Ghi thẳng vào spec này, không
mở spec mới.

### Phát hiện

1. **Chưa có e2e tái hiện.** `tests/e2e/session-on-public-pages.spec.ts` xanh cả trên main — nó
   kiểm việc gia hạn vẫn chạy, không kiểm rò cookie. Assertion reviewer đề xuất (`GET /` không trả
   `Set-Cookie: coursely-*`) đỏ trên main, xanh trên PR. Nó pin matcher của `proxy`
   (`62f93a4`); phần `no-store` (`594793a`) vẫn do `tests/int/proxy-session.spec.ts` pin.
2. **Banner `next/notifications-count/route.ts` tự mâu thuẫn**: "Pure read, no side effect"
   trong khi route gia hạn phiên.
3. **`/khoa-hoc/:slug` vẫn động trên prod build** (`ƒ`, `private, no-cache, no-store`). Nguyên
   nhân theo tài liệu Next 16.3.0 (`generate-static-params.md:302`): thiếu `generateStaticParams`
   thì route động. `posts/[slug]` cũng gọi `draftMode()` nhưng có `generateStaticParams`, nên
   `draftMode()` không phải thủ phạm — xác nhận cuối bằng prod build. Hệ quả: `perf(courses)`
   chưa có tác dụng, `course-page-static.spec.ts` không chứng minh điều nó mô tả, và banner
   "không cập nhật trên production" nói về rủi ro chưa tồn tại.
4. **Chọn hướng (a): cho trang thật sự được cache.** Khi đó khóa học sửa xong phải được
   revalidate. Có rewrite `/khoa-hoc/:slug → /courses/:slug`, nên `revalidatePath` phải nhận
   đường dẫn **đích** `/courses/<slug>` (`revalidatePath.md:55-57`) — truyền `/khoa-hoc/…` không
   lỗi, chỉ lặng lẽ không làm gì. Trang còn hiển thị `course-objectives` và `course-phases`, nên
   sửa hai collection này cũng phải revalidate trang của khóa học cha.

### Danh sách test — đã chốt qua `AskUserQuestion` 2026-09-23

Bắt buộc:

1. **e2e `/` không `Set-Cookie`**: trong `session-on-public-pages.spec.ts`, sau `dropAccessCookie`,
   `GET /` không trả `Set-Cookie` nào bắt đầu bằng `coursely-`.
2. **Hook `Courses`** (unit): publish → `/courses/<slug>`; unpublish hoặc đổi slug → cả đường dẫn
   cũ; delete; `context.disableRevalidate` → không gọi; không bao giờ `/khoa-hoc/…`.
3. **Hook `CourseObjectives` / `CoursePhases`** (unit): tạo/sửa/xóa → revalidate
   `/courses/<slug>` của khóa học cha.
4. **`course-page-static`** (unit): `page.tsx` export `generateStaticParams`.

Đề xuất — **đã chọn cả hai**:

5. **int: hook với Payload thật**: update/delete khóa học qua Local API, `next/cache` mock, kiểm
   `revalidatePath` được gọi đúng đường dẫn.
6. **e2e prod build**: trên `next build && next start` (user tự dựng), `/khoa-hoc/:slug` không mang
   `no-store`. Bỏ qua khi chạy trên `next dev`, vì dev luôn ép `no-cache`.

### Danh sách việc, theo giai đoạn — dừng chờ duyệt sau mỗi giai đoạn

1. **GĐ1** — test #1; đỏ bằng cách tạm khôi phục matcher cũ của `proxy` (báo trước file/dòng),
   hoàn nguyên, xanh.
2. **GĐ2** — sửa banner `notifications-count`. Không có test (chỉ comment).
3. **GĐ3** — hook revalidate cho `Courses`, `CourseObjectives`, `CoursePhases` + test #2, #3, #5.
   Entry INVARIANTS: `revalidatePath` trên route bị rewrite nhận đường dẫn đích.
   _Phát hiện khi làm_: ngoài request của Next, `revalidatePath` ném
   `static generation store missing` và rollback lệnh ghi. Cleanup `.catch(() => {})` trong
   `tests/int/` nuốt lỗi đó và để lại 10 khóa học rác (đã xóa bằng SQL). Chốt 2026-09-23:
   caller ngoài Next truyền `context: { disableRevalidate: true }` — hai seed khóa học và
   cleanup trong 9 file int test; hook không tự nuốt lỗi.
4. **GĐ4** — `generateStaticParams` cho `courses/[slug]/page.tsx`, viết lại banner trang, sửa
   `course-page-static.spec.ts`, viết lại entry INVARIANTS về trang khóa học + test #4, #6.
   Kiểm chứng cuối trên prod build do user chạy: route thành `○`/`●`, publish một chỉnh sửa thì
   trang cập nhật.
   _Kết quả 2026-09-23_: test #4 đỏ → xanh. Test #6 đã viết, tự bỏ qua trên `next dev`; build
   cục bộ treo ở câu hỏi migration của Payload (`prodMigrations` + DB dev được tạo bằng push),
   nên user chốt lấy bằng chứng đỏ/xanh cho #6 và `ƒ` → `●` trực tiếp trên production.
5. **GĐ5** — `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:int` xanh. Commit khi
   user yêu cầu.
