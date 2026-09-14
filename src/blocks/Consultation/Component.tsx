'use client'

import React, { useCallback, useState } from 'react'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { useForm, FormProvider, type FieldValues } from 'react-hook-form'
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
import { submitFormAction } from '@/actions/forms/submit-form'

export type ConsultationBlockProps = {
  badge: string
  title: string
  description?: string | null
  steps?: { text?: string; id?: string }[]
  note?: string | null
  form?: FormType | null
  hotline?: string | null
  disableInnerContainer?: boolean
}

export const ConsultationBlock: React.FC<ConsultationBlockProps> = ({
  badge,
  title,
  description,
  steps,
  note,
  form,
  hotline,
}) => {
  const isFormObject = form !== null
  const {
    id: formID,
    confirmationMessage,
    confirmationType,
    redirect,
    submitButtonLabel,
    title: formTitle,
    fields: formFields,
  } = form || {}

  const formMethods = useForm({
    defaultValues: formFields,
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
    (data: FieldValues) => {
      if (!formID) return
      const submitForm = async () => {
        setError(undefined)
        setIsLoading(true)
        try {
          const res = await submitFormAction({
            formID: Number(formID),
            formData: data,
          })
          setIsLoading(false)
          if (!res.success) {
            setError({ message: res.message })
            return
          }
          setHasSubmitted(true)
          if (confirmationType === 'redirect' && redirect?.url) {
            router.push(redirect.url)
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError({ message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' })
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
          </CardHeader>
          <CardContent>
            {isFormObject ? (
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
                    id={String(formID)}
                    onSubmit={handleSubmit(onSubmit)}
                  >
                    <div className="flex flex-wrap -mx-2 gap-y-4">
                      {formFields?.map((field, index) => {
                        const Field: React.FC<any> =
                          fields?.[field.blockType as keyof typeof fields]
                        if (Field) {
                          const width =
                            'width' in field && typeof field.width === 'number' ? field.width : 100
                          return (
                            <div key={index} className="px-2 w-full" style={{ width: `${width}%` }}>
                              <Field
                                form={form}
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

                    <Button className="w-full mt-2" form={String(formID)} type="submit">
                      {submitButtonLabel || 'Gửi thông tin đăng ký'}
                    </Button>
                  </form>
                )}
              </FormProvider>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                Chưa chọn Form nào trong cài đặt Block.
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
