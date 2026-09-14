'use client'

import { AlertCircle, BookOpenIcon } from 'lucide-react'
import * as React from 'react'

import type { Student } from '@/payload-types'

import { Alert, AlertDescription, AlertTitle } from '@/components/public/ui/alert'

import { ClassRoster } from '@/components/design/blocks/class-roster'
import { CourseCard } from '@/components/design/blocks/course-card'
import { CourseList } from '@/components/design/blocks/course-list'
import { SpotlightTeacher } from '@/components/design/blocks/spotlight-teacher'
import { Stats } from '@/components/design/blocks/stats'
import { ClassAssignForm } from '@/components/design/forms/class-assign-form'
import { CourseForm } from '@/components/design/forms/course-form'
import { FormField } from '@/components/public/forms/field'
import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'
import { ForgotPasswordForm } from '@/components/public/forms/ForgotPasswordForm'
import { LoginForm } from '@/components/public/forms/LoginForm'
import { OtpForm } from '@/components/public/forms/OtpForm'
import { ProfileForm } from '@/components/public/forms/ProfileForm'
import { RegisterForm } from '@/components/public/forms/RegisterForm'
import { ResetPasswordForm } from '@/components/public/forms/ResetPasswordForm'
import { Avatar } from '@/components/public/ui/avatar'
import { EmptyState } from '@/components/public/ui/empty-state'
import { Modal } from '@/components/design/ui/modal'
import { Tabs } from '@/components/design/ui/tabs'
import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { Checkbox } from '@/components/public/ui/checkbox'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/public/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/public/ui/select'
import { Textarea } from '@/components/public/ui/textarea'

/** Where a component lives, which is also whether it can be used yet. */
type Origin = 'public' | 'design'

type Entry = {
  name: string
  /** Rendered as text so a reader can copy it, and asserted by the showcase test. */
  path: string
  origin: Origin
  /** One line on when to reach for it. */
  note?: string
  preview: React.ReactNode
}

const noop = () => {}

/** `ProfileForm` takes a real `Student` — a stand-in for the gallery, not any real account. */
const SHOWCASE_STUDENT: Student = {
  id: 1,
  email: 'mai.tran@example.com',
  fullName: 'Trần Thị Mai',
  phone: '0912345678',
  status: 'ACTIVE',
  collection: 'students',
  verifiedAt: '2026-08-01T00:10:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const COURSES = [
  {
    id: 1,
    title: 'Giao tiếp cho người đi làm',
    excerpt: 'Phản xạ hội thoại trong họp hành, email và thuyết trình ngắn.',
    level: 'beginner' as const,
    duration: '8 tuần',
    price: '2.400.000 ₫',
    href: '#',
  },
  {
    id: 2,
    title: 'IELTS Speaking 6.5+',
    excerpt: 'Chiến lược trả lời Part 2 và Part 3, luyện phát âm theo nhóm nhỏ.',
    level: 'advanced' as const,
    duration: '12 tuần',
    price: '4.900.000 ₫',
    href: '#',
  },
]

/** The eight steps from DESIGN.md's Typography scale, in the order they are declared. */
const TYPE_SCALE = [
  { token: 'display', cls: 'text-3xl', size: 'clamp(30–58px) / 1.08' },
  { token: 'headline-lg', cls: 'text-2xl', size: '30px / 1.1' },
  { token: 'headline-md', cls: 'text-xl', size: '22px / 1.25' },
  { token: 'headline-sm', cls: 'text-lg', size: '18px / 1.45' },
  { token: 'body-lg', cls: 'text-md', size: '15.5px / 1.6' },
  { token: 'body-md', cls: 'text-base', size: '14px / 1.55' },
  { token: 'label-md', cls: 'text-sm', size: '12.5px / 1.5' },
  { token: 'label-sm', cls: 'text-xs', size: '11px / 1.4' },
] as const

function TypeSpecimen() {
  return (
    <div className="flex flex-col gap-4">
      {TYPE_SCALE.map((step) => (
        <div className="flex flex-col gap-0.5" key={step.cls}>
          <div className="text-muted-foreground-subtle flex flex-wrap items-baseline gap-2 font-mono text-xs">
            <span>{step.cls}</span>
            <span>·</span>
            <span>{step.token}</span>
            <span>·</span>
            <span>{step.size}</span>
          </div>
          <p className={step.cls}>Học tiếng Anh cùng người đồng hành</p>
        </div>
      ))}
    </div>
  )
}

/** The four elevation steps. Values differ per theme — toggle dark to see why. */
const ELEVATION = [
  { cls: 'shadow-xs', use: 'Điều khiển ở trạng thái nghỉ' },
  { cls: 'shadow-sm', use: 'Thẻ ở trạng thái nghỉ' },
  { cls: 'shadow-md', use: 'Nhấc lên khi hover, menu select' },
  { cls: 'shadow-lg', use: 'Hộp thoại' },
] as const

function ElevationSpecimen() {
  return (
    <div className="grid grid-cols-2 gap-5.5 sm:grid-cols-4">
      {ELEVATION.map((step) => (
        <div className="flex flex-col gap-2" key={step.cls}>
          <div className={`bg-card border-border h-20 rounded-lg border ${step.cls}`} />
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground-subtle font-mono text-xs">{step.cls}</span>
            <span className="text-muted-foreground text-xs">{step.use}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="flex flex-col gap-4.5">
      <h2 className="text-heading-accent border-border border-b pb-2 text-xl font-semibold">
        {title}
      </h2>
      <div className="flex flex-col gap-5.5">{children}</div>
    </section>
  )
}

function Item({ entry }: { entry: Entry }) {
  return (
    <article className="flex flex-col gap-2.5">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-foreground text-base font-semibold">{entry.name}</h3>
        <Badge variant={entry.origin === 'public' ? 'success' : 'warning'}>
          {entry.origin === 'public' ? 'Dùng được ngay' : 'Đang chờ — cần chuyển sang public/'}
        </Badge>
        <code className="text-muted-foreground-subtle font-mono text-xs">{entry.path}</code>
      </header>
      {entry.note ? <p className="text-muted-foreground text-sm">{entry.note}</p> : null}
      <div className="border-border bg-card rounded-lg border p-4.5">{entry.preview}</div>
    </article>
  )
}

const PRIMITIVES: Entry[] = [
  {
    name: 'Alert',
    path: '@/components/public/ui/alert',
    origin: 'public',
    note: 'Hiển thị thông báo trạng thái, hỗ trợ variant mặc định và destructive.',
    preview: (
      <div className="flex w-full flex-col gap-3">
        <Alert>
          <AlertTitle>Thông báo</AlertTitle>
          <AlertDescription>Hệ thống đang hoạt động bình thường.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>Email hoặc mật khẩu không chính xác.</AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    name: 'Button',
    path: '@/components/public/ui/button',
    origin: 'public',
    note: 'Biến thể link dùng --link, không phải --primary — xem INVARIANTS.md.',
    preview: (
      <div className="flex flex-wrap items-center gap-2">
        <Button>Mặc định</Button>
        <Button variant="brand">Thương hiệu</Button>
        <Button variant="secondary">Phụ</Button>
        <Button variant="outline">Viền</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Liên kết</Button>
        <Button variant="destructive">Xoá</Button>
      </div>
    ),
  },
  {
    name: 'Badge',
    path: '@/components/public/ui/badge',
    origin: 'public',
    note: 'Token nền nhạt + chữ -foreground. Không bao giờ dùng border-success.', // theme-guard-ignore: doc explanation
    preview: (
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Mặc định</Badge>
        <Badge variant="brand">Thương hiệu</Badge>
        <Badge variant="success">Đang học</Badge>
        <Badge variant="warning">Chờ xác nhận</Badge>
        <Badge variant="error">Đã nghỉ</Badge>
        <Badge variant="outline">Viền</Badge>
      </div>
    ),
  },
  {
    name: 'Card',
    path: '@/components/public/ui/card',
    origin: 'public',
    preview: (
      <Card>
        <CardHeader>
          <CardTitle>Lớp Giao tiếp A1</CardTitle>
          <CardDescription>Ca tối Thứ 2 và Thứ 4</CardDescription>
        </CardHeader>
        <CardContent>12 học viên đang theo học.</CardContent>
      </Card>
    ),
  },
  {
    name: 'Input',
    path: '@/components/public/ui/input',
    origin: 'public',
    note: 'Placeholder lấy --muted-foreground-subtle, nền trong suốt để thừa hưởng bề mặt.',
    preview: <Input placeholder="nguyen.van.a@example.com" />,
  },
  {
    name: 'Textarea',
    path: '@/components/public/ui/textarea',
    origin: 'public',
    preview: <Textarea placeholder="Mô tả ngắn về khoá học…" />,
  },
  {
    name: 'Label',
    path: '@/components/public/ui/label',
    origin: 'public',
    preview: <Label htmlFor="showcase-label">Nhãn trường nhập</Label>,
  },
  {
    name: 'Checkbox',
    path: '@/components/public/ui/checkbox',
    origin: 'public',
    preview: (
      <div className="flex items-center gap-2">
        <Checkbox id="showcase-checkbox" />
        <Label htmlFor="showcase-checkbox">Tôi đồng ý với điều khoản</Label>
      </div>
    ),
  },
  {
    name: 'Select',
    path: '@/components/public/ui/select',
    origin: 'public',
    preview: (
      <Select>
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder="Chọn trình độ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="beginner">Cơ bản</SelectItem>
          <SelectItem value="intermediate">Trung cấp</SelectItem>
          <SelectItem value="advanced">Nâng cao</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    name: 'Pagination',
    path: '@/components/public/ui/pagination',
    origin: 'public',
    note: 'Các nút là <button> chứ không phải link — điều hướng do nơi gọi xử lý qua onClick.',
    preview: (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink>1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ),
  },
  {
    name: 'Avatar',
    path: '@/components/public/ui/avatar',
    origin: 'public',
    note: 'Không có ảnh thì hiện chữ cái đầu — không phải trạng thái đang tải.',
    preview: (
      <div className="flex items-center gap-3">
        <Avatar name="Nguyễn Văn Tuấn" size="sm" />
        <Avatar name="Trần Thị Mai" />
        <Avatar name="Lê Quốc Bảo" size="lg" />
      </div>
    ),
  },
  {
    name: 'EmptyState',
    path: '@/components/public/ui/empty-state',
    origin: 'public',
    preview: (
      <EmptyState
        action={<Button variant="outline">Tạo khoá học</Button>}
        description="Khoá học sẽ hiện ở đây ngay khi được xuất bản."
        icon={BookOpenIcon}
        title="Chưa có khoá học nào"
      />
    ),
  },
]

const STAGED_UI: Entry[] = [
  {
    name: 'Modal',
    path: '@/components/design/ui/modal',
    origin: 'design',
    note: 'Radix lo focus trap, Esc và khoá cuộn — bấm nút để mở.',
    preview: (
      <Modal
        description="Thao tác này không thể hoàn tác."
        footer={<Button variant="destructive">Xoá lớp</Button>}
        title="Xoá lớp học?"
        trigger={<Button variant="outline">Mở hộp thoại</Button>}
      >
        <p className="text-muted-foreground text-sm">
          Toàn bộ danh sách học viên của lớp sẽ bị gỡ khỏi lớp này.
        </p>
      </Modal>
    ),
  },
  {
    name: 'Tabs',
    path: '@/components/design/ui/tabs',
    origin: 'design',
    preview: (
      <Tabs
        items={[
          {
            value: 'overview',
            label: 'Tổng quan',
            content: <p className="text-sm">Nội dung tổng quan.</p>,
          },
          {
            value: 'roadmap',
            label: 'Lộ trình',
            content: <p className="text-sm">Nội dung lộ trình.</p>,
          },
          {
            value: 'reviews',
            label: 'Đánh giá',
            content: <p className="text-sm">Chưa có đánh giá.</p>,
            disabled: true,
          },
        ]}
      />
    ),
  },
]

const STAGED_BLOCKS: Entry[] = [
  {
    name: 'CourseCard',
    path: '@/components/design/blocks/course-card',
    origin: 'design',
    preview: (
      <div className="max-w-sm">
        <CourseCard course={COURSES[0]} />
      </div>
    ),
  },
  {
    name: 'CourseList',
    path: '@/components/design/blocks/course-list',
    origin: 'design',
    note: 'Tự xử lý trạng thái rỗng — bên dưới là cả hai trường hợp.',
    preview: (
      <div className="flex flex-col gap-5.5">
        <CourseList courses={COURSES} title="Khoá học nổi bật" />
        <CourseList
          courses={[]}
          emptyDescription="Thử bỏ bớt bộ lọc."
          emptyTitle="Không có khoá học nào khớp bộ lọc"
        />
      </div>
    ),
  },
  {
    name: 'Stats',
    path: '@/components/design/blocks/stats',
    origin: 'design',
    note: 'Giá trị nhận vào đã format sẵn — component không tự format số.',
    preview: (
      <Stats
        items={[
          { label: 'Học viên đang học', value: '1.248', hint: '+12% so với tháng trước' },
          { label: 'Khoá học', value: '36' },
          { label: 'Tỉ lệ hoàn thành', value: '87%' },
        ]}
      />
    ),
  },
  {
    name: 'SpotlightTeacher',
    path: '@/components/design/blocks/spotlight-teacher',
    origin: 'design',
    preview: (
      <SpotlightTeacher
        action={<Button variant="link">Xem hồ sơ</Button>}
        teacher={{
          id: 1,
          name: 'Nguyễn Văn Tuấn',
          headline: 'IELTS 8.5 · 6 năm giảng dạy',
          bio: 'Chuyên luyện phát âm và phản xạ giao tiếp cho người đi làm.',
          specialities: ['Giao tiếp', 'IELTS Speaking', 'Phát âm'],
        }}
      />
    ),
  },
  {
    name: 'ClassRoster',
    path: '@/components/design/blocks/class-roster',
    origin: 'design',
    note: 'Bảng thật, không phải lưới div — trình đọc màn hình cần quan hệ hàng/cột.',
    preview: (
      <ClassRoster
        students={[
          {
            id: 1,
            name: 'Trần Thị Mai',
            email: 'mai@example.com',
            status: 'active',
            joinedAt: '12/03/2026',
          },
          {
            id: 2,
            name: 'Lê Quốc Bảo',
            email: 'bao@example.com',
            status: 'pending',
            joinedAt: '02/04/2026',
          },
          { id: 3, name: 'Phạm Anh Thư', status: 'withdrawn', joinedAt: '18/01/2026' },
        ]}
        title="Lớp Giao tiếp A1 — Ca tối T2/T4"
      />
    ),
  },
]

const READY_FORMS: Entry[] = [
  {
    name: 'FormField',
    path: '@/components/public/forms/field',
    origin: 'public',
    note: 'Nhãn + control + lỗi thành một khối, để bốn form không mô tả trạng thái lỗi khác nhau.',
    preview: (
      <div className="flex max-w-sm flex-col gap-4">
        <FormField hint="Chúng tôi không gửi thư quảng cáo." htmlFor="showcase-field" label="Email">
          <Input id="showcase-field" placeholder="ban@example.com" />
        </FormField>
        <FormField error="Email không hợp lệ" htmlFor="showcase-field-error" label="Email">
          <Input aria-invalid id="showcase-field-error" defaultValue="không-phải-email" />
        </FormField>
      </div>
    ),
  },
  {
    name: 'RegisterForm',
    path: '@/components/public/forms/RegisterForm',
    origin: 'public',
    note: 'Trang /dang-ky. Gọi registerAction trực tiếp — không nhận onSubmit như trước.',
    preview: (
      <div className="max-w-sm">
        <RegisterForm />
      </div>
    ),
  },
  {
    name: 'CourseRegistrationForm',
    path: '@/components/public/forms/CourseRegistrationForm',
    origin: 'public',
    note: 'Form đăng ký khóa học, nhận dữ liệu khóa học động qua react-hook-form.',
    preview: (
      <div className="max-w-sm">
        <CourseRegistrationForm courseId={1} courseTitle="Giao tiếp cho người đi làm" />
      </div>
    ),
  },
  {
    name: 'LoginForm',
    path: '@/components/public/forms/LoginForm',
    origin: 'public',
    note: 'Trang /dang-nhap. Gọi loginAction trực tiếp.',
    preview: (
      <div className="max-w-sm">
        <LoginForm />
      </div>
    ),
  },
  {
    name: 'ForgotPasswordForm',
    path: '@/components/public/forms/ForgotPasswordForm',
    origin: 'public',
    note: 'Trang /quen-mat-khau.',
    preview: (
      <div className="max-w-sm">
        <ForgotPasswordForm />
      </div>
    ),
  },
  {
    name: 'ResetPasswordForm',
    path: '@/components/public/forms/ResetPasswordForm',
    origin: 'public',
    note: 'Trang /dat-lai-mat-khau. Không có token thì hiện thẻ "Liên kết không hợp lệ" thay vì form.',
    preview: (
      <div className="max-w-sm">
        <ResetPasswordForm token="showcase-token" />
      </div>
    ),
  },
  {
    name: 'OtpForm',
    path: '@/components/public/forms/OtpForm',
    origin: 'public',
    note: 'Trang /xac-thuc-otp.',
    preview: (
      <div className="max-w-sm">
        <OtpForm />
      </div>
    ),
  },
  {
    name: 'ProfileForm',
    path: '@/components/public/forms/ProfileForm',
    origin: 'public',
    note: 'Trang /tai-khoan. Học viên minh hoạ, không phải tài khoản thật.',
    preview: (
      <div className="max-w-2xl">
        <ProfileForm user={SHOWCASE_STUDENT} />
      </div>
    ),
  },
]

// Was three, including a staged LoginForm — retired once /dang-nhap built its own real
// one directly (2026-09-14), rather than being promoted from here. See
// src/components/public/forms/LoginForm.tsx under "Biểu mẫu — dùng được ngay".
const STAGED_FORMS: Entry[] = [
  {
    name: 'CourseForm',
    path: '@/components/design/forms/course-form',
    origin: 'design',
    preview: (
      <div className="max-w-xl">
        <CourseForm onSubmit={noop} />
      </div>
    ),
  },
  {
    name: 'ClassAssignForm',
    path: '@/components/design/forms/class-assign-form',
    origin: 'design',
    preview: (
      <div className="max-w-xl">
        <ClassAssignForm
          onSubmit={noop}
          students={[
            { id: '1', label: 'Trần Thị Mai', hint: 'mai@example.com' },
            { id: '2', label: 'Lê Quốc Bảo', hint: 'bao@example.com' },
          ]}
          teachers={[{ id: '1', label: 'Nguyễn Văn Tuấn', hint: 'IELTS 8.5' }]}
        />
      </div>
    ),
  },
]

/**
 * Every component this project has, rendered live.
 *
 * Split by where a component lives, because that is also whether it can be used: anything
 * under `public/` is ready to import, anything under `design/` is finished but staged and
 * has to be moved first. See `src/components/design/README.md`.
 *
 * @example
 * ```tsx
 * // Rendered by the /components route; not intended for use anywhere else.
 * <ComponentGallery />
 * ```
 */
export function ComponentGallery() {
  return (
    <div className="container flex flex-col gap-9 py-9">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading-accent text-3xl font-bold">Thư viện component</h1>
        <p className="text-muted-foreground max-w-prose">
          Mọi component đang có, dựng bằng token trong <code className="font-mono">DESIGN.md</code>.
          Đổi theme bằng ô chọn ở chân trang để xem cả hai chế độ.
        </p>
      </header>

      <Section title="Thang chữ">
        <TypeSpecimen />
      </Section>

      <Section title="Độ nổi">
        <ElevationSpecimen />
      </Section>

      <Section title="Primitive — dùng được ngay">
        {PRIMITIVES.map((entry) => (
          <Item entry={entry} key={entry.path} />
        ))}
      </Section>

      <Section title="Đang chờ — giao diện">
        {STAGED_UI.map((entry) => (
          <Item entry={entry} key={entry.path} />
        ))}
      </Section>

      <Section title="Đang chờ — khối nghiệp vụ">
        {STAGED_BLOCKS.map((entry) => (
          <Item entry={entry} key={entry.path} />
        ))}
      </Section>

      <Section title="Biểu mẫu — dùng được ngay">
        {READY_FORMS.map((entry) => (
          <Item entry={entry} key={entry.path} />
        ))}
      </Section>

      <Section title="Đang chờ — biểu mẫu">
        {STAGED_FORMS.map((entry) => (
          <Item entry={entry} key={entry.path} />
        ))}
      </Section>
    </div>
  )
}
