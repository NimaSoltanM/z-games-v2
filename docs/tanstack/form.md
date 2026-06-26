---
id: quick-start
title: Quick Start
---

TanStack Form is unlike most form libraries you've used before. It's designed for large-scale production usage, with a focus on type safety, performance and composition for an unmatched developer experience.

As a result, we've developed [a philosophy around the library's usage](../../philosophy.md) that values scalability and long-term developer experience over short and sharable code snippets.

Here's an example of a form following many of our best practices, which will allow you to rapidly develop even high-complexity forms after a short onboarding experience:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
// Form components that pre-bind events from the form hook; check our "Form Composition" guide for more
import { TextField, NumberField, SubmitButton } from '~our-app/ui-library'
// We also support Valibot, ArkType, and any other standard schema library
import { z } from 'zod'

const { fieldContext, formContext } = createFormHookContexts()

// Allow us to bind components to the form to keep type safety but reduce production boilerplate
// Define this once to have a generator of consistent form instances throughout your app
const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})

const PeoplePage = () => {
  const form = useAppForm({
    defaultValues: {
      username: '',
      age: 0,
    },
    validators: {
      // Pass a schema or function to validate
      onChange: z.object({
        username: z.string(),
        age: z.number().min(13),
      }),
    },
    onSubmit: ({ value }) => {
      // Do something with form data
      alert(JSON.stringify(value, null, 2))
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h1>Personal Information</h1>
      {/* Components are bound to `form` and `field` to ensure extreme type safety */}
      {/* Use `form.AppField` to render a component bound to a single field */}
      <form.AppField
        name="username"
        children={(field) => <field.TextField label="Full Name" />}
      />
      {/* The "name" property will throw a TypeScript error if typo'd  */}
      <form.AppField
        name="age"
        children={(field) => <field.NumberField label="Age" />}
      />
      {/* Components in `form.AppForm` have access to the form context */}
      <form.AppForm>
        <form.SubmitButton />
      </form.AppForm>
    </form>
  )
}

const rootElement = document.getElementById('root')!
ReactDOM.createRoot(rootElement).render(<PeoplePage />)
```

While we generally suggest using `createFormHook` for reduced boilerplate in the long-run, we also support one-off components and other behaviors using `useForm` and `form.Field`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { useForm } from '@tanstack/react-form'

const PeoplePage = () => {
  const form = useForm({
    defaultValues: {
      username: '',
      age: 0,
    },
    onSubmit: ({ value }) => {
      // Do something with form data
      alert(JSON.stringify(value, null, 2))
    },
  })

  return (
    <form.Field
      name="age"
      validators={{
        // We can choose between form-wide and field-specific validators
        onChange: ({ value }) =>
          value > 13 ? undefined : 'Must be 13 or older',
      }}
      children={(field) => (
        <>
          <input
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            type="number"
            onChange={(e) => field.handleChange(e.target.valueAsNumber)}
          />
          {!field.state.meta.isValid && (
            <em>{field.state.meta.errors.join(',')}</em>
          )}
        </>
      )}
    />
  )
}

const rootElement = document.getElementById('root')!
ReactDOM.createRoot(rootElement).render(<PeoplePage />)
```

All properties from `useForm` can be used in `useAppForm` and all properties from `form.Field` can be used in `form.AppField`.

import * as React from 'react'
import { createRoot } from 'react-dom/client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { useForm } from '@tanstack/react-form'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from '@tanstack/react-query'

import type { AnyFieldApi } from '@tanstack/react-form'

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em>{field.state.meta.errors.join(',')}</em>
      ) : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </>
  )
}

class DB {
  private data: { firstName: string; lastName: string }

  constructor() {
    this.data = { firstName: 'FirstName', lastName: 'LastName' }
  }

  getData(): { firstName: string; lastName: string } {
    return { ...this.data }
  }

  async saveUser(value: { firstName: string; lastName: string }) {
    this.data = value
    return value
  }
}

// Dummy Database to emulate server-side actions
const db = new DB()

export default function App() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return db.getData()
    },
  })

  const saveUserMutation = useMutation({
    mutationFn: async (value: { firstName: string; lastName: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      db.saveUser(value)
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: data?.firstName ?? '',
      lastName: data?.lastName ?? '',
    },
    onSubmit: async ({ formApi, value }) => {
      // Do something with form data
      await saveUserMutation.mutateAsync(value)

      // Invalidating query to recheck fresh data
      await refetch()

      // Reset the form to start-over with a clean state
      formApi.reset()
    },
  })

  if (isLoading) return <p>Loading..</p>

  return (
    <div>
      <h1>Simple Form Example</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div>
          {/* A type-safe field component*/}
          <form.Field
            name="firstName"
            validators={{
              onChange: ({ value }) =>
                !value
                  ? 'A first name is required'
                  : value.length < 3
                    ? 'First name must be at least 3 characters'
                    : undefined,
              onChangeAsyncDebounceMs: 500,
              onChangeAsync: async ({ value }) => {
                await new Promise((resolve) => setTimeout(resolve, 1000))
                return (
                  value.includes('error') && 'No "error" allowed in first name'
                )
              },
            }}
            children={(field) => {
              // Avoid hasty abstractions. Render props are great!
              return (
                <>
                  <label htmlFor={field.name}>First Name:</label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </>
              )
            }}
          />
        </div>
        <div>
          <form.Field
            name="lastName"
            children={(field) => (
              <>
                <label htmlFor={field.name}>Last Name:</label>
                <input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </>
            )}
          />
        </div>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <>
              <button type="submit" disabled={!canSubmit}>
                {isSubmitting ? '...' : 'Submit'}
              </button>
              <button type="reset" onClick={() => form.reset()}>
                Reset
              </button>
            </>
          )}
        />
      </form>
    </div>
  )
}

const rootElement = document.getElementById('root')!

const queryClient = new QueryClient()

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>

    <TanStackDevtools
      config={{ hideUntilHover: true }}
      plugins={[formDevtoolsPlugin()]}
    />
  </React.StrictMode>,
)


import { createRoot } from 'react-dom/client'

import { useForm } from '@tanstack/react-form'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function verifyAgeOnServer(age: number) {
  await sleep(Math.floor(Math.random() * 1000))
  return age >= 13
}

async function checkIfUsernameIsTaken(name: string) {
  await sleep(Math.floor(Math.random() * 500))
  const usernames = ['user-1', 'user-2', 'user-3']
  return !usernames.includes(name)
}

export default function App() {
  const form = useForm({
    defaultValues: {
      username: '',
      age: 0,
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        const [isRightAge, isUsernameAvailable] = await Promise.all([
          // Verify the age on the server
          verifyAgeOnServer(value.age),
          // Verify the availability of the username on the server
          checkIfUsernameIsTaken(value.username),
        ])

        if (!isRightAge || !isUsernameAvailable) {
          return {
            // The `form` key is optional
            form: 'Invalid data',
            fields: {
              ...(!isRightAge ? { age: 'Must be 13 or older to sign' } : {}),
              ...(!isUsernameAvailable
                ? { username: 'Username is taken' }
                : {}),
            },
          }
        }

        return null
      },
    },
  })

  return (
    <div>
      <h1>Field Errors From The Form's validators Example</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="username"
          validators={{
            onSubmit: ({ value }) => (!value ? 'Required field' : null),
          }}
          children={(field) => (
            <div>
              <label htmlFor={field.name}>Username:</label>
              <input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
              />
              {!field.state.meta.isValid ? (
                <em role="alert">{field.state.meta.errors.join(', ')}</em>
              ) : null}
            </div>
          )}
        />

        <form.Field
          name="age"
          validators={{
            onSubmit: ({ value }) => (!value ? 'Required field' : null),
          }}
          children={(field) => (
            <div>
              <label htmlFor={field.name}>Age:</label>
              <input
                id={field.name}
                name={field.name}
                value={field.state.value}
                type="number"
                onChange={(e) => field.handleChange(e.target.valueAsNumber)}
              />
              {!field.state.meta.isValid ? (
                <em role="alert">{field.state.meta.errors.join(', ')}</em>
              ) : null}
            </div>
          )}
        />
        <form.Subscribe
          selector={(state) => [state.errorMap]}
          children={([errorMap]) =>
            errorMap.onSubmit ? (
              <div>
                <em>
                  There was an error on the form: {errorMap.onSubmit.toString()}
                </em>
              </div>
            ) : null
          }
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? '...' : 'Submit'}
            </button>
          )}
        />
      </form>
    </div>
  )
}

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <>
    <App />

    <TanStackDevtools
      config={{ hideUntilHover: true }}
      plugins={[formDevtoolsPlugin()]}
    />
  </>,
)


---
title: TanStack Form
description: Build forms in React using TanStack Form and Zod.
links:
  doc: https://tanstack.com/form
---

import { InfoIcon } from "lucide-react"

This guide explores how to build forms using TanStack Form. You'll learn to create forms with the `<Field />` component, implement schema validation with Zod, handle errors, and ensure accessibility.

## Demo

We'll start by building the following form. It has a simple text input and a textarea. On submit, we'll validate the form data and display any errors.

<Callout icon={<InfoIcon />}>
  **Note:** For the purpose of this demo, we have intentionally disabled browser
  validation to show how schema validation and form errors work in TanStack
  Form. It is recommended to add basic browser validation in your production
  code.
</Callout>

<ComponentPreview
  name="form-tanstack-demo"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

## Approach

This form leverages TanStack Form for powerful, headless form handling. We'll build our form using the `<Field />` component, which gives you **complete flexibility over the markup and styling**.

- Uses TanStack Form's `useForm` hook for form state management.
- `form.Field` component with render prop pattern for controlled inputs.
- `<Field />` components for building accessible forms.
- Client-side validation using Zod.
- Real-time validation feedback.

## Anatomy

Here's a basic example of a form using TanStack Form with the `<Field />` component.

```tsx showLineNumbers {15-31}
<form
  onSubmit={(e) => {
    e.preventDefault()
    form.handleSubmit()
  }}
>
  <FieldGroup>
    <form.Field
      name="title"
      children={(field) => {
        const isInvalid =
          field.state.meta.isTouched && !field.state.meta.isValid
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>Bug Title</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={isInvalid}
              placeholder="Login button not working on mobile"
              autoComplete="off"
            />
            <FieldDescription>
              Provide a concise title for your bug report.
            </FieldDescription>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        )
      }}
    />
  </FieldGroup>
  <Button type="submit">Submit</Button>
</form>
```

## Form

### Create a schema

We'll start by defining the shape of our form using a Zod schema.

<Callout icon={<InfoIcon />}>
  **Note:** This example uses `zod v3` for schema validation. TanStack Form
  integrates seamlessly with Zod and other Standard Schema validation libraries
  through its validators API.
</Callout>

```tsx showLineNumbers title="form.tsx"
import * as z from "zod"

const formSchema = z.object({
  title: z
    .string()
    .min(5, "Bug title must be at least 5 characters.")
    .max(32, "Bug title must be at most 32 characters."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(100, "Description must be at most 100 characters."),
})
```

### Set up the form

Use the `useForm` hook from TanStack Form to create your form instance with Zod validation.

```tsx showLineNumbers title="form.tsx" {10-21}
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import * as z from "zod"

const formSchema = z.object({
  // ...
})

export function BugReportForm() {
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      toast.success("Form submitted successfully")
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* ... */}
    </form>
  )
}
```

We are using `onSubmit` to validate the form data here. TanStack Form supports other validation modes, which you can read about in the [documentation](https://tanstack.com/form/latest/docs/framework/react/guides/dynamic-validation).

### Build the form

We can now build the form using the `form.Field` component from TanStack Form and the `<Field />` component.

<ComponentSource
  src="/registry/new-york-v4/examples/form-tanstack-demo.tsx"
  title="form.tsx"
/>

### Done

That's it. You now have a fully accessible form with client-side validation.

When you submit the form, the `onSubmit` function will be called with the validated form data. If the form data is invalid, TanStack Form will display the errors next to each field.

## Validation

### Client-side Validation

TanStack Form validates your form data using the Zod schema. Validation happens in real-time as the user types.

```tsx showLineNumbers title="form.tsx" {13-15}
import { useForm } from "@tanstack/react-form"

const formSchema = z.object({
  // ...
})

export function BugReportForm() {
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    },
  })

  return <form onSubmit={/* ... */}>{/* ... */}</form>
}
```

### Validation Modes

TanStack Form supports different validation strategies through the `validators` option:

| Mode         | Description                          |
| ------------ | ------------------------------------ |
| `"onChange"` | Validation triggers on every change. |
| `"onBlur"`   | Validation triggers on blur.         |
| `"onSubmit"` | Validation triggers on submit.       |

```tsx showLineNumbers title="form.tsx" {6-9}
const form = useForm({
  defaultValues: {
    title: "",
    description: "",
  },
  validators: {
    onSubmit: formSchema,
    onChange: formSchema,
    onBlur: formSchema,
  },
})
```

## Displaying Errors

Display errors next to the field using `<FieldError />`. For styling and accessibility:

- Add the `data-invalid` prop to the `<Field />` component.
- Add the `aria-invalid` prop to the form control such as `<Input />`, `<SelectTrigger />`, `<Checkbox />`, etc.

```tsx showLineNumbers title="form.tsx" {4,18}
<form.Field
  name="email"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
        <Input
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          type="email"
          aria-invalid={isInvalid}
        />
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    )
  }}
/>
```

## Working with Different Field Types

### Input

- For input fields, use `field.state.value` and `field.handleChange` on the `<Input />` component.
- To show errors, add the `aria-invalid` prop to the `<Input />` component and the `data-invalid` prop to the `<Field />` component.

<ComponentPreview
  name="form-tanstack-input"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {6,11-14,22}
<form.Field
  name="username"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor="form-tanstack-input-username">Username</FieldLabel>
        <Input
          id="form-tanstack-input-username"
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          placeholder="shadcn"
          autoComplete="username"
        />
        <FieldDescription>
          This is your public display name. Must be between 3 and 10 characters.
          Must only contain letters, numbers, and underscores.
        </FieldDescription>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    )
  }}
/>
```

### Textarea

- For textarea fields, use `field.state.value` and `field.handleChange` on the `<Textarea />` component.
- To show errors, add the `aria-invalid` prop to the `<Textarea />` component and the `data-invalid` prop to the `<Field />` component.

<ComponentPreview
  name="form-tanstack-textarea"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {6,13-16,24}
<form.Field
  name="about"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor="form-tanstack-textarea-about">
          More about you
        </FieldLabel>
        <Textarea
          id="form-tanstack-textarea-about"
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          placeholder="I'm a software engineer..."
          className="min-h-[120px]"
        />
        <FieldDescription>
          Tell us more about yourself. This will be used to help us personalize
          your experience.
        </FieldDescription>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    )
  }}
/>
```

### Select

- For select components, use `field.state.value` and `field.handleChange` on the `<Select />` component.
- To show errors, add the `aria-invalid` prop to the `<SelectTrigger />` component and the `data-invalid` prop to the `<Field />` component.

<ComponentPreview
  name="form-tanstack-select"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {6,18-19,23}
<form.Field
  name="language"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field orientation="responsive" data-invalid={isInvalid}>
        <FieldContent>
          <FieldLabel htmlFor="form-tanstack-select-language">
            Spoken Language
          </FieldLabel>
          <FieldDescription>
            For best results, select the language you speak.
          </FieldDescription>
          {isInvalid && <FieldError errors={field.state.meta.errors} />}
        </FieldContent>
        <Select
          name={field.name}
          value={field.state.value}
          onValueChange={field.handleChange}
        >
          <SelectTrigger
            id="form-tanstack-select-language"
            aria-invalid={isInvalid}
            className="min-w-[120px]"
          >
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent position="item-aligned">
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    )
  }}
/>
```

### Checkbox

- For checkbox, use `field.state.value` and `field.handleChange` on the `<Checkbox />` component.
- To show errors, add the `aria-invalid` prop to the `<Checkbox />` component and the `data-invalid` prop to the `<Field />` component.
- For checkbox arrays, use `mode="array"` on the `<form.Field />` component and TanStack Form's array helpers.
- Remember to add `data-slot="checkbox-group"` to the `<FieldGroup />` component for proper styling and spacing.

<ComponentPreview
  name="form-tanstack-checkbox"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {12,17,22-24,44}
<form.Field
  name="tasks"
  mode="array"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <FieldSet>
        <FieldLegend variant="label">Tasks</FieldLegend>
        <FieldDescription>
          Get notified when tasks you&apos;ve created have updates.
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          {tasks.map((task) => (
            <Field
              key={task.id}
              orientation="horizontal"
              data-invalid={isInvalid}
            >
              <Checkbox
                id={`form-tanstack-checkbox-${task.id}`}
                name={field.name}
                aria-invalid={isInvalid}
                checked={field.state.value.includes(task.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.pushValue(task.id)
                  } else {
                    const index = field.state.value.indexOf(task.id)
                    if (index > -1) {
                      field.removeValue(index)
                    }
                  }
                }}
              />
              <FieldLabel
                htmlFor={`form-tanstack-checkbox-${task.id}`}
                className="font-normal"
              >
                {task.label}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldSet>
    )
  }}
/>
```

### Radio Group

- For radio groups, use `field.state.value` and `field.handleChange` on the `<RadioGroup />` component.
- To show errors, add the `aria-invalid` prop to the `<RadioGroupItem />` component and the `data-invalid` prop to the `<Field />` component.

<ComponentPreview
  name="form-tanstack-radiogroup"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {21,29,35}
<form.Field
  name="plan"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <FieldSet>
        <FieldLegend>Plan</FieldLegend>
        <FieldDescription>
          You can upgrade or downgrade your plan at any time.
        </FieldDescription>
        <RadioGroup
          name={field.name}
          value={field.state.value}
          onValueChange={field.handleChange}
        >
          {plans.map((plan) => (
            <FieldLabel
              key={plan.id}
              htmlFor={`form-tanstack-radiogroup-${plan.id}`}
            >
              <Field orientation="horizontal" data-invalid={isInvalid}>
                <FieldContent>
                  <FieldTitle>{plan.title}</FieldTitle>
                  <FieldDescription>{plan.description}</FieldDescription>
                </FieldContent>
                <RadioGroupItem
                  value={plan.id}
                  id={`form-tanstack-radiogroup-${plan.id}`}
                  aria-invalid={isInvalid}
                />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldSet>
    )
  }}
/>
```

### Switch

- For switches, use `field.state.value` and `field.handleChange` on the `<Switch />` component.
- To show errors, add the `aria-invalid` prop to the `<Switch />` component and the `data-invalid` prop to the `<Field />` component.

<ComponentPreview
  name="form-tanstack-switch"
  className="sm:[&_.preview]:h-[500px]"
  chromeLessOnMobile
/>

```tsx showLineNumbers title="form.tsx" {6,14,19-21}
<form.Field
  name="twoFactor"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field orientation="horizontal" data-invalid={isInvalid}>
        <FieldContent>
          <FieldLabel htmlFor="form-tanstack-switch-twoFactor">
            Multi-factor authentication
          </FieldLabel>
          <FieldDescription>
            Enable multi-factor authentication to secure your account.
          </FieldDescription>
          {isInvalid && <FieldError errors={field.state.meta.errors} />}
        </FieldContent>
        <Switch
          id="form-tanstack-switch-twoFactor"
          name={field.name}
          checked={field.state.value}
          onCheckedChange={field.handleChange}
          aria-invalid={isInvalid}
        />
      </Field>
    )
  }}
/>
```

### Complex Forms

Here is an example of a more complex form with multiple fields and validation.

<ComponentPreview
  name="form-tanstack-complex"
  className="sm:[&_.preview]:h-[1100px]"
  chromeLessOnMobile
/>

## Resetting the Form

Use `form.reset()` to reset the form to its default values.

```tsx showLineNumbers
<Button type="button" variant="outline" onClick={() => form.reset()}>
  Reset
</Button>
```

## Array Fields

TanStack Form provides powerful array field management with `mode="array"`. This allows you to dynamically add, remove, and update array items with full validation support.

<ComponentPreview
  name="form-tanstack-array"
  className="sm:[&_.preview]:h-[700px]"
  chromeLessOnMobile
/>

This example demonstrates managing multiple email addresses with array fields. Users can add up to 5 email addresses, remove individual addresses, and each address is validated independently.

### Array Field Structure

Use `mode="array"` on the parent field to enable array field management.

```tsx showLineNumbers title="form.tsx" {3,12-14}
<form.Field
  name="emails"
  mode="array"
  children={(field) => {
    return (
      <FieldSet>
        <FieldLegend variant="label">Email Addresses</FieldLegend>
        <FieldDescription>
          Add up to 5 email addresses where we can contact you.
        </FieldDescription>
        <FieldGroup>
          {field.state.value.map((_, index) => (
            // Nested field for each array item
          ))}
        </FieldGroup>
      </FieldSet>
    )
  }}
/>
```

### Nested Fields

Access individual array items using bracket notation: `fieldName[index].propertyName`. This example uses `InputGroup` to display the remove button inline with the input.

```tsx showLineNumbers title="form.tsx"
<form.Field
  name={`emails[${index}].address`}
  children={(subField) => {
    const isSubFieldInvalid =
      subField.state.meta.isTouched && !subField.state.meta.isValid
    return (
      <Field orientation="horizontal" data-invalid={isSubFieldInvalid}>
        <FieldContent>
          <InputGroup>
            <InputGroupInput
              id={`form-tanstack-array-email-${index}`}
              name={subField.name}
              value={subField.state.value}
              onBlur={subField.handleBlur}
              onChange={(e) => subField.handleChange(e.target.value)}
              aria-invalid={isSubFieldInvalid}
              placeholder="name@example.com"
              type="email"
            />
            {field.state.value.length > 1 && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => field.removeValue(index)}
                  aria-label={`Remove email ${index + 1}`}
                >
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          {isSubFieldInvalid && (
            <FieldError errors={subField.state.meta.errors} />
          )}
        </FieldContent>
      </Field>
    )
  }}
/>
```

### Adding Items

Use `field.pushValue(item)` to add items to an array field. You can disable the button when the array reaches its maximum length.

```tsx showLineNumbers title="form.tsx"
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => field.pushValue({ address: "" })}
  disabled={field.state.value.length >= 5}
>
  Add Email Address
</Button>
```

### Removing Items

Use `field.removeValue(index)` to remove items from an array field. You can conditionally show the remove button only when there's more than one item.

```tsx showLineNumbers title="form.tsx"
{
  field.state.value.length > 1 && (
    <InputGroupButton
      onClick={() => field.removeValue(index)}
      aria-label={`Remove email ${index + 1}`}
    >
      <XIcon />
    </InputGroupButton>
  )
}
```

### Array Validation

Validate array fields using Zod's array methods.

```tsx showLineNumbers title="form.tsx"
const formSchema = z.object({
  emails: z
    .array(
      z.object({
        address: z.string().email("Enter a valid email address."),
      })
    )
    .min(1, "Add at least one email address.")
    .max(5, "You can add up to 5 email addresses."),
})
```
