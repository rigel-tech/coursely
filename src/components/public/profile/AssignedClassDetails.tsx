import { Calendar, Clock, MapPin, School } from 'lucide-react'
import { Badge } from '@/components/public/ui/badge'
import { formatDate } from '@/utilities/formatDateTime'
import type { AssignedClassSummary, StudentEnrollmentItem } from '@/services/student-enrollment'

interface AssignedClassDetailsProps {
  assignedClass?: AssignedClassSummary | null
  enrollmentStatus: StudentEnrollmentItem['enrollmentStatus']
}

export function AssignedClassDetails({
  assignedClass,
  enrollmentStatus,
}: AssignedClassDetailsProps) {
  if (assignedClass) {
    return (
      <div className="rounded-md border border-border/80 bg-muted/30 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <School className="size-4 text-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lớp học:
            </span>
            <span className="font-semibold text-foreground text-sm font-mono bg-muted border border-border px-2 py-0.5 rounded">
              {assignedClass.code}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            Đã xếp lớp
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              Thời gian:{' '}
              <strong className="text-foreground font-medium">
                {formatDate(assignedClass.startDate)}
                {assignedClass.endDate ? ` – ${formatDate(assignedClass.endDate)}` : ''}
              </strong>
            </span>
          </div>

          {assignedClass.scheduleTime && (
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span>
                Khung giờ:{' '}
                <strong className="text-foreground font-medium">
                  {assignedClass.scheduleTime}
                </strong>
              </span>
            </div>
          )}

          {assignedClass.location && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span>
                Địa điểm:{' '}
                <strong className="text-foreground font-medium">{assignedClass.location}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (enrollmentStatus !== 'CANCELLED') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border/70 bg-muted/15 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <School className="size-4 text-muted-foreground/70" />
          <span>Thông tin lớp học:</span>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            Chưa xếp lớp
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground/80 hidden sm:inline">
          Coursely sẽ thông báo khi có lịch xếp lớp
        </span>
      </div>
    )
  }

  return null
}
