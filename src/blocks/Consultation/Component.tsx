'use client'

import React, { useCallback, useState } from 'react'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { useForm, FormProvider } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import RichText from '@/components/public/RichText'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { fields } from '@/blocks/Form/fields'
import { getClientSideURL } from '@/utilities/getURL'

export type ConsultationBlockProps = {
  badge?: string | null
  title?: string | null
  description?: string | null
  steps?: { text?: string; id?: string }[] | null
  note?: string | null
  form?: FormType | null
  hotline?: string | null
  disableInnerContainer?: boolean
}

export const ConsultationBlock: React.FC<ConsultationBlockProps> = ({
  badge = 'ĐĂNG KÝ TƯ VẤN',
  title = 'Nhận lộ trình học riêng trong 24 giờ',
  description = 'Để lại thông tin, chuyên viên học vụ sẽ gọi lại, kiểm tra trình độ nói miễn phí 15 phút và đề xuất khóa học phù hợp.',
  steps = [
    { text: 'Kiểm tra trình độ nói miễn phí với giảng viên' },
    { text: 'Nhận lộ trình & lịch lớp phù hợp giờ làm của bạn' },
    { text: 'Học thử 1 buổi trước khi quyết định đăng ký' },
  ],
  note = 'Trung tâm không thu học phí trực tuyến. Học phí được xác nhận và thanh toán tại quầy học vụ sau khi bạn chốt lớp.',
  form: formFromProps,
  hotline = '1900 6789',
}) => {
  const formObj = typeof formFromProps === 'object' && formFromProps !== null ? formFromProps : null
  const {
    id: formID,
    confirmationMessage,
    confirmationType,
    redirect,
    submitButtonLabel,
    title: formTitle,
  } = formObj || {}

  const formMethods = useForm({
    defaultValues: formObj?.fields,
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods

  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>()
  const [error, setError] = useState<{ message: string; status?: string } | undefined>()
  const router = useRouter()

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      if (!formID) return

      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value,
        }))

        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          const res = await req.json()

          clearTimeout(loadingTimerID)

          if (req.status >= 400) {
            setIsLoading(false)
            setError({
              message: res.errors?.[0]?.message || 'Internal Server Error',
              status: res.status,
            })
            return
          }

          setIsLoading(false)
          setHasSubmitted(true)

          if (confirmationType === 'redirect' && redirect?.url) {
            router.push(redirect.url)
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError({
            message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.',
          })
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType],
  )

  return (
    <section className="container mx-auto px-4 my-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
        {/* Cột trái: giới thiệu */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {badge && (
              <span className="text-brand-accent text-sm font-semibold tracking-wide uppercase">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
            )}
            {description && <p className="text-muted-foreground text-base">{description}</p>}
          </div>

          {steps && steps.length > 0 && (
            <ol className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <li className="flex items-start gap-3" key={step.id || i}>
                  <span className="bg-brand-accent text-brand-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-foreground text-sm">{step.text}</span>
                </li>
              ))}
            </ol>
          )}

          {note && (
            <p className="border-border bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
              {note}
            </p>
          )}
        </div>

        {/* Cột phải: form đăng ký động */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{formTitle || 'Đăng ký tư vấn miễn phí'}</CardTitle>
            <CardDescription>
              Chúng tôi liên hệ trong giờ hành chính, thứ 2 – thứ 7.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formObj ? (
              <FormProvider {...formMethods}>
                {!isLoading && hasSubmitted && confirmationType === 'message' && (
                  <div className="py-6 text-center">
                    <RichText data={confirmationMessage} />
                  </div>
                )}
                {isLoading && !hasSubmitted && (
                  <p className="py-6 text-center text-muted-foreground">
                    Đang gửi thông tin, vui lòng chờ...
                  </p>
                )}
                {error && (
                  <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
                    {error.message}
                  </div>
                )}
                {!hasSubmitted && (
                  <form
                    className="flex flex-col gap-4"
                    id={formID}
                    onSubmit={handleSubmit(onSubmit)}
                  >
                    <div className="flex flex-wrap -mx-2 gap-y-4">
                      {formObj.fields?.map((field, index) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const Field: React.FC<any> =
                          fields?.[field.blockType as keyof typeof fields]
                        if (Field) {
                          const width =
                            'width' in field && typeof field.width === 'number' ? field.width : 100
                          return (
                            <div key={index} className="px-2 w-full" style={{ width: `${width}%` }}>
                              <Field
                                form={formObj}
                                {...field}
                                {...formMethods}
                                control={control}
                                errors={errors}
                                register={register}
                              />
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>

                    <Button className="w-full mt-2" form={formID} type="submit">
                      {submitButtonLabel || 'Gửi thông tin đăng ký'}
                    </Button>
                  </form>
                )}
              </FormProvider>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                Chưa chọn Form nào trong cài đặt Block.
                <br />
                Vui lòng vào trang Admin để liên kết một Biểu mẫu.
              </div>
            )}

            {hotline && (
              <p className="text-muted-foreground text-center text-xs mt-4">
                Hoặc gọi ngay <span className="text-foreground font-semibold">{hotline}</span> để
                được tư vấn trực tiếp
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
