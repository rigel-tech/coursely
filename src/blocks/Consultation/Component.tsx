'use client'

import React, { useActionState, startTransition, useEffect } from 'react'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { useForm, FormProvider, type FieldValues } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import RichText from '@/components/public/RichText'
import { Button } from '@/components/public/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { submitFormAction } from '@/actions/forms/submit-form'
import { fields } from '@/blocks/Form/fields'

export type ConsultationBlockProps = {
  badge: string
  title: string
  description?: string | null
  steps?: { text?: string; id?: string }[] | null
  note?: string | null
  form?: FormType | null
  hotline?: string | null
  disableInnerContainer?: boolean
}

const ConsultationForm: React.FC<{ form: FormType; hotline?: string | null }> = ({
  form,
  hotline,
}) => {
  const {
    id,
    confirmationMessage,
    confirmationType,
    redirect,
    submitButtonLabel,
    title: formTitle,
    fields: formFields,
  } = form

  const formMethods = useForm({ defaultValues: formFields })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods
  const router = useRouter()

  const [state, formAction, isPending] = useActionState((_prev: unknown, data: FieldValues) => {
    return submitFormAction({ formID: Number(id), formData: data })
  }, null)

  useEffect(() => {
    if (state?.success && confirmationType === 'redirect' && redirect?.url) {
      router.push(redirect.url)
    }
  }, [state])

  return (
    <Card className="shadow-md">
      {formTitle && (
        <CardHeader>
          <CardTitle className="text-xl">{formTitle}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <FormProvider {...formMethods}>
          {!isPending && state?.success && confirmationType === 'message' && (
            <div className="py-6 text-center">
              <RichText data={confirmationMessage} />
            </div>
          )}
          {isPending && (
            <p className="py-6 text-center text-muted-foreground">
              Đang gửi thông tin, vui lòng chờ...
            </p>
          )}
          {state && !state.success && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {state.message}
            </div>
          )}
          {!state?.success && (
            <form
              className="flex flex-col gap-4"
              id={String(id)}
              onSubmit={handleSubmit((data) => startTransition(() => formAction(data)))}
            >
              <div className="flex flex-wrap -mx-2 gap-y-4">
                {formFields?.map((field, index) => {
                  const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]
                  if (!Field) return null
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
                })}
              </div>
              <Button className="w-full mt-2" disabled={isPending} type="submit">
                {isPending ? 'Đang gửi...' : submitButtonLabel || 'Gửi thông tin đăng ký'}
              </Button>
            </form>
          )}
        </FormProvider>

        {hotline && (
          <p className="text-muted-foreground text-center text-xs mt-4">
            Hoặc gọi ngay <span className="text-foreground font-semibold">{hotline}</span> để được
            tư vấn trực tiếp
          </p>
        )}
      </CardContent>
    </Card>
  )
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
  const hasForm = form && typeof form === 'object'

  return (
    <section className="container mx-auto px-4 my-16">
      <div
        className={`grid gap-10 ${hasForm ? 'lg:grid-cols-2 lg:items-start lg:gap-16' : 'max-w-3xl mx-auto'}`}
      >
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

          {!hasForm && hotline && (
            <p className="text-base">
              Hotline tư vấn trực tiếp:{' '}
              <span className="text-brand-accent font-bold">{hotline}</span>
            </p>
          )}
        </div>

        {hasForm && <ConsultationForm form={form} hotline={hotline} />}
      </div>
    </section>
  )
}
