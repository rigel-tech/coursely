import type { Payload } from 'payload'
import { lexicalDoc, heading, paragraph, list } from './lexical'

// ---------------------------------------------------------------------------
// Mục tiêu đầu ra (Course Objectives) – mỗi khóa 4–5 mục tiêu
// ---------------------------------------------------------------------------
const OBJECTIVES: Record<string, { title: string; description?: string }[]> = {
  'chuyen-doi-so-toan-dien-doanh-nghiep': [
    {
      title: 'Xây dựng chiến lược chuyển đổi số',
      description:
        'Hiểu rõ mô hình trưởng thành số (Digital Maturity Model) và biết cách đánh giá mức độ sẵn sàng chuyển đổi số của tổ chức.',
    },
    {
      title: 'Tối ưu quy trình vận hành',
      description:
        'Ứng dụng BPM và Lean Digital để loại bỏ lãng phí, số hóa 80% quy trình nội bộ trong 90 ngày.',
    },
    {
      title: 'Lãnh đạo văn hóa số',
      description:
        'Xây dựng lộ trình quản trị sự thay đổi (Change Management) để toàn bộ nhân sự thích ứng với công nghệ mới.',
    },
    {
      title: 'Đo lường ROI chuyển đổi số',
      description:
        'Thiết lập bộ KPI / OKR và dashboard theo dõi hiệu quả đầu tư vào chuyển đổi số.',
    },
  ],
  'ung-dung-genai-chatgpt-hieu-suat': [
    {
      title: 'Thành thạo Prompt Engineering',
      description:
        'Viết prompt chuyên sâu cho ChatGPT, Claude, Gemini để tạo nội dung, phân tích dữ liệu và giải quyết bài toán kinh doanh.',
    },
    {
      title: 'Tự động hóa soạn thảo tài liệu',
      description:
        'Dùng AI tạo báo cáo, email, đề xuất dự án chất lượng cao, giảm 70% thời gian soạn thảo.',
    },
    {
      title: 'Phân tích dữ liệu bằng AI',
      description:
        'Sử dụng Code Interpreter / Advanced Data Analysis để xử lý bảng tính, trực quan hóa dữ liệu và rút insight.',
    },
    {
      title: 'Tạo hình ảnh & nội dung đa phương tiện',
      description:
        'Ứng dụng Midjourney, DALL·E để thiết kế hình ảnh marketing, slide trình bày chuyên nghiệp.',
    },
    {
      title: 'Xây dựng AI Workflow cá nhân',
      description:
        'Thiết kế quy trình làm việc tích hợp nhiều công cụ AI, tăng năng suất 3–5 lần so với phương pháp truyền thống.',
    },
  ],
  'tu-dong-hoa-quy-trinh-no-code': [
    {
      title: 'Nắm vững nền tảng No-Code',
      description:
        'Hiểu kiến trúc và khả năng của Zapier, Make (Integromat), Power Automate để chọn đúng công cụ cho từng bài toán.',
    },
    {
      title: 'Thiết kế luồng tự động hóa CRM',
      description:
        'Tự động hoá lead nurturing, follow-up khách hàng, đồng bộ dữ liệu giữa CRM, Email Marketing và Google Sheets.',
    },
    {
      title: 'Tích hợp ERP & kế toán',
      description:
        'Kết nối hệ thống quản trị tài chính, kho hàng, đơn hàng tự động giữa các nền tảng.',
    },
    {
      title: 'Xử lý lỗi & giám sát',
      description:
        'Cài đặt error handling, retry logic và dashboard giám sát để đảm bảo luồng tự động chạy ổn định 24/7.',
    },
  ],
  'phan-tich-du-lieu-power-bi-sql': [
    {
      title: 'Truy vấn dữ liệu với SQL',
      description:
        'Viết truy vấn SQL từ cơ bản đến nâng cao (JOIN, Subquery, Window Functions) để khai thác dữ liệu kinh doanh.',
    },
    {
      title: 'Xây dựng Data Model chuẩn',
      description:
        'Thiết kế mô hình dữ liệu Star Schema / Snowflake trong Power BI để tối ưu hiệu suất báo cáo.',
    },
    {
      title: 'Tạo Dashboard quản trị',
      description:
        'Xây dựng dashboard tương tác với DAX, drill-through, bookmarks phục vụ ra quyết định chiến lược.',
    },
    {
      title: 'Storytelling bằng dữ liệu',
      description:
        'Trình bày insight từ dữ liệu một cách thuyết phục, biến con số thành câu chuyện kinh doanh có sức ảnh hưởng.',
    },
    {
      title: 'Triển khai báo cáo tự động',
      description:
        'Cấu hình lịch refresh, chia sẻ report trên Power BI Service và quản lý phân quyền truy cập.',
    },
  ],
  'quan-tri-du-an-so-agile-scrum': [
    {
      title: 'Hiểu bản chất Agile & Scrum',
      description:
        'Phân biệt Agile, Scrum, Kanban, SAFe và biết khi nào nên áp dụng phương pháp nào.',
    },
    {
      title: 'Quản lý Product Backlog',
      description:
        'Viết User Story chuẩn INVEST, phân ưu tiên bằng MoSCoW, quản lý backlog hiệu quả.',
    },
    {
      title: 'Điều hành Sprint & Ceremony',
      description:
        'Chủ trì Sprint Planning, Daily Standup, Sprint Review và Retrospective chuyên nghiệp.',
    },
    {
      title: 'Theo dõi tiến độ & rủi ro',
      description:
        'Sử dụng Burndown chart, Velocity, Cumulative Flow Diagram để dự báo và xử lý chệch hướng.',
    },
  ],
  'bao-mat-thong-tin-quan-tri-rui-ro': [
    {
      title: 'Nhận diện mối đe dọa an ninh mạng',
      description:
        'Phân loại các hình thức tấn công phổ biến: Phishing, Ransomware, Social Engineering, Zero-Day.',
    },
    {
      title: 'Xây dựng chính sách bảo mật',
      description:
        'Thiết lập Information Security Policy theo chuẩn ISO 27001, NIST Cybersecurity Framework.',
    },
    {
      title: 'Quản trị rủi ro dữ liệu',
      description:
        'Đánh giá rủi ro (Risk Assessment), xếp hạng ưu tiên và xây dựng kế hoạch xử lý rủi ro.',
    },
    {
      title: 'Ứng phó sự cố an ninh',
      description:
        'Xây dựng quy trình Incident Response, Business Continuity Plan (BCP) và Disaster Recovery.',
    },
    {
      title: 'Tuân thủ pháp luật & bảo vệ dữ liệu cá nhân',
      description:
        'Hiểu Luật An toàn thông tin mạng Việt Nam, GDPR và các quy định bảo vệ dữ liệu cá nhân.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Lộ trình học tập (Course Phases) – mỗi khóa 3–4 giai đoạn
// ---------------------------------------------------------------------------
const PHASES: Record<string, { title: string; bullets: string[] }[]> = {
  'chuyen-doi-so-toan-dien-doanh-nghiep': [
    {
      title: 'Nền tảng & Đánh giá hiện trạng',
      bullets: [
        'Khảo sát mức độ trưởng thành số (Digital Maturity Assessment)',
        'Phân tích SWOT chuyển đổi số của doanh nghiệp',
        'Nghiên cứu case study chuyển đổi số thành công tại Việt Nam',
      ],
    },
    {
      title: 'Xây dựng chiến lược & lộ trình',
      bullets: [
        'Thiết kế Blueprint chuyển đổi số 12–24 tháng',
        'Lập ngân sách và timeline triển khai theo giai đoạn',
        'Xác định công nghệ cốt lõi: Cloud, ERP, CRM, Data Platform',
      ],
    },
    {
      title: 'Triển khai & quản trị thay đổi',
      bullets: [
        'Pilot chuyển đổi trên 1–2 phòng ban trọng điểm',
        'Đào tạo đội ngũ Champion (người tiên phong nội bộ)',
        'Thiết lập Change Management framework',
      ],
    },
    {
      title: 'Đo lường & mở rộng',
      bullets: [
        'Xây dựng bộ KPI/OKR đo lường hiệu quả chuyển đổi',
        'Tổng kết bài học, nhân rộng sang toàn tổ chức',
        'Xây dựng roadmap giai đoạn tiếp theo',
      ],
    },
  ],
  'ung-dung-genai-chatgpt-hieu-suat': [
    {
      title: 'Làm quen & tư duy AI',
      bullets: [
        'Hiểu cách hoạt động của Large Language Models (LLM)',
        'So sánh ChatGPT, Claude, Gemini, Copilot — chọn công cụ phù hợp',
        'Thực hành Prompt Engineering cơ bản',
      ],
    },
    {
      title: 'Ứng dụng AI trong công việc hàng ngày',
      bullets: [
        'Soạn thảo email, báo cáo, đề xuất dự án bằng AI',
        'Phân tích file Excel / CSV với Code Interpreter',
        'Tóm tắt tài liệu dài, dịch thuật chuyên ngành',
      ],
    },
    {
      title: 'Nâng cao & tích hợp workflow',
      bullets: [
        'Tạo Custom GPTs / Claude Projects cho phòng ban',
        'Tích hợp AI vào Notion, Slack, Google Workspace',
        'Thiết kế AI Workflow tự động với Zapier + ChatGPT API',
      ],
    },
  ],
  'tu-dong-hoa-quy-trinh-no-code': [
    {
      title: 'Khởi đầu No-Code',
      bullets: [
        'Giới thiệu Zapier, Make, Power Automate và so sánh',
        'Tạo Zap / Scenario đầu tiên: auto-sync Google Form → Sheet → Email',
        'Hiểu Trigger, Action, Filter, Path logic',
      ],
    },
    {
      title: 'Tự động hóa Marketing & Sales',
      bullets: [
        'Lead capture từ Facebook Ads → CRM tự động',
        'Nurturing sequence qua Email & Zalo OA',
        'Auto-tạo báo cáo doanh số hàng tuần',
      ],
    },
    {
      title: 'Tích hợp vận hành & ERP',
      bullets: [
        'Đồng bộ đơn hàng, kho hàng giữa web → ERP',
        'Tự động hoá quy trình duyệt nội bộ (approval workflow)',
        'Kết nối hệ thống kế toán & xuất hóa đơn',
      ],
    },
    {
      title: 'Nâng cao & giám sát',
      bullets: [
        'Error handling, retry logic và dead-letter queue',
        'Dashboard giám sát luồng tự động real-time',
        'Bảo mật API keys và quản lý quyền truy cập',
      ],
    },
  ],
  'phan-tich-du-lieu-power-bi-sql': [
    {
      title: 'SQL Fundamentals',
      bullets: [
        'Cài đặt môi trường thực hành (PostgreSQL / MySQL)',
        'SELECT, WHERE, GROUP BY, HAVING, ORDER BY',
        'JOIN, Subquery và Common Table Expressions (CTE)',
      ],
    },
    {
      title: 'SQL nâng cao & Data Modeling',
      bullets: [
        'Window Functions: ROW_NUMBER, RANK, LAG, LEAD',
        'Thiết kế Star Schema cho Data Warehouse',
        'ETL cơ bản: Extract, Transform, Load data pipeline',
      ],
    },
    {
      title: 'Power BI — Xây dựng Dashboard',
      bullets: [
        'Kết nối data source, Power Query và Data Model',
        'Viết DAX: CALCULATE, FILTER, Time Intelligence',
        'Thiết kế dashboard UX tốt: layout, màu sắc, tương tác',
      ],
    },
    {
      title: 'Data Storytelling & Triển khai',
      bullets: [
        'Trình bày insight thuyết phục cho lãnh đạo',
        'Publish lên Power BI Service, thiết lập auto-refresh',
        'Row-Level Security (RLS) và quản lý workspace',
      ],
    },
  ],
  'quan-tri-du-an-so-agile-scrum': [
    {
      title: 'Tư duy Agile & Framework',
      bullets: [
        'Agile Manifesto và 12 nguyên tắc cốt lõi',
        'So sánh Waterfall vs Agile vs Hybrid',
        'Scrum Framework: Roles, Events, Artifacts',
      ],
    },
    {
      title: 'Thực hành Scrum Sprint',
      bullets: [
        'Viết User Story, Acceptance Criteria chuẩn INVEST',
        'Sprint Planning: ước lượng Story Points, Sprint Goal',
        'Daily Standup 15 phút hiệu quả',
      ],
    },
    {
      title: 'Công cụ & đo lường',
      bullets: [
        'Thực hành trên Jira / Trello / ClickUp',
        'Burndown Chart, Velocity, Cumulative Flow Diagram',
        'Sprint Review & Retrospective thực tế',
      ],
    },
  ],
  'bao-mat-thong-tin-quan-tri-rui-ro': [
    {
      title: 'An ninh mạng căn bản',
      bullets: [
        'Bối cảnh an ninh mạng Việt Nam & thế giới',
        'Phishing, Ransomware, Social Engineering — cách nhận diện',
        'Demo mô phỏng tấn công và phòng thủ',
      ],
    },
    {
      title: 'Khung chính sách & tiêu chuẩn',
      bullets: [
        'ISO 27001, NIST CSF — tổng quan và áp dụng',
        'Xây dựng Information Security Policy cho doanh nghiệp',
        'Kiểm soát truy cập, xác thực đa yếu tố (MFA)',
      ],
    },
    {
      title: 'Quản trị rủi ro & đánh giá',
      bullets: [
        'Risk Assessment: xác định, phân tích, xếp hạng rủi ro',
        'Vulnerability Assessment & Penetration Testing (VA/PT)',
        'Xây dựng Risk Treatment Plan',
      ],
    },
    {
      title: 'Ứng phó sự cố & tuân thủ',
      bullets: [
        'Incident Response Plan: phát hiện, ngăn chặn, khôi phục',
        'Business Continuity & Disaster Recovery Planning',
        'Luật ATTT Việt Nam, GDPR và bảo vệ dữ liệu cá nhân',
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
export async function seedCourseDetails(payload: Payload) {
  const courses = await payload.find({
    collection: 'courses',
    limit: 100,
    pagination: false,
  })

  for (const course of courses.docs) {
    const slug = course.slug
    if (!slug) continue

    // --- Seed Objectives ---
    const objectives = OBJECTIVES[slug]
    if (objectives) {
      const existingObj = await payload.find({
        collection: 'course-objectives',
        where: { course: { equals: course.id } },
        limit: 1,
      })

      if (existingObj.docs.length === 0) {
        for (let i = 0; i < objectives.length; i++) {
          await payload.create({
            collection: 'course-objectives',
            context: { disableRevalidate: true },
            data: {
              title: objectives[i].title,
              description: objectives[i].description,
              course: course.id,
              sortOrder: i + 1,
            },
          })
        }
        payload.logger.info(`  ✓ ${objectives.length} mục tiêu → ${course.title}`)
      }
    }

    // --- Seed Phases ---
    const phases = PHASES[slug]
    if (phases) {
      const existingPhase = await payload.find({
        collection: 'course-phases',
        where: { course: { equals: course.id } },
        limit: 1,
      })

      if (existingPhase.docs.length === 0) {
        for (let i = 0; i < phases.length; i++) {
          await payload.create({
            collection: 'course-phases',
            context: { disableRevalidate: true },
            data: {
              title: phases[i].title,
              description: lexicalDoc([heading(phases[i].title, 'h3'), list(phases[i].bullets)]),
              course: course.id,
              sortOrder: i + 1,
            } as any,
          })
        }
        payload.logger.info(`  ✓ ${phases.length} giai đoạn → ${course.title}`)
      }
    }
  }
}
