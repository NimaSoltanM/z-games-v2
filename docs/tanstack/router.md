---
title: Routing Concepts
---

TanStack Router supports a number of powerful routing concepts that allow you to build complex and dynamic routing systems with ease.

Each of these concepts is useful and powerful, and we'll dive into each of them in the following sections.

## Anatomy of a Route

All other routes, other than the [Root Route](#the-root-route), are configured using the `createFileRoute` function, which provides type safety when using file-based routing:

<!-- ::start:framework -->

# React

```tsx title="src/routes/index.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: PostsComponent,
})
```

# Solid

```tsx title="src/routes/index.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/')({
  component: PostsComponent,
})
```

<!-- ::end:framework -->

The `createFileRoute` function takes a single argument, the file-route's path as a string.

**❓❓❓ "Wait, you're making me pass the path of the route file to `createFileRoute`?"**

Yes! But don't worry, this path is **automatically written and managed by the router for you via the TanStack Router Bundler Plugin or Router CLI.** So, as you create new routes, move routes around or rename routes, the path will be updated for you automatically.

The reason for this pathname has everything to do with the magical type safety of TanStack Router. Without this pathname, TypeScript would have no idea what file we're in! (We wish TypeScript had a built-in for this, but they don't yet 🤷‍♂️)

## The Root Route

The root route is the top-most route in the entire tree and encapsulates all other routes as children.

- It has no path
- It is **always** matched
- Its `component` is **always** rendered

Even though it doesn't have a path, the root route has access to all of the same functionality as other routes including:

- components
- loaders
- search param validation
- etc.

To create a root route, call the `createRootRoute()` function and export it as the `Route` variable in your route file:

<!-- ::start:framework -->

# React

```tsx
// Standard root route
import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute()

// Root route with Context
import { createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export interface MyRouterContext {
  queryClient: QueryClient
}
export const Route = createRootRouteWithContext<MyRouterContext>()
```

# Solid

```tsx
// Standard root route
import { createRootRoute } from '@tanstack/solid-router'

export const Route = createRootRoute()

// Root route with Context
import { createRootRouteWithContext } from '@tanstack/solid-router'
import type { QueryClient } from '@tanstack/solid-query'

export interface MyRouterContext {
  queryClient: QueryClient
}
export const Route = createRootRouteWithContext<MyRouterContext>()
```

<!-- ::end:framework -->

To learn more about Context in TanStack Router, see the [Router Context](../guide/router-context.md) guide.

## Basic Routes

Basic routes match a specific path, for example `/about`, `/settings`, `/settings/notifications` are all basic routes, as they match the path exactly.

Let's take a look at an `/about` route:

<!-- ::start:framework -->

# React

```tsx title="src/routes/about.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return <div>About</div>
}
```

# Solid

```tsx title="src/routes/about.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return <div>About</div>
}
```

<!-- ::end:framework -->

Basic routes are simple and straightforward. They match the path exactly and render the provided component.

## Index Routes

Index routes specifically target their parent route when it is **matched exactly and no child route is matched**.

Let's take a look at an index route for a `/posts` URL:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.index.tsx"
import { createFileRoute } from '@tanstack/react-router'

// Note the trailing slash, which is used to target index routes
export const Route = createFileRoute('/posts/')({
  component: PostsIndexComponent,
})

function PostsIndexComponent() {
  return <div>Please select a post!</div>
}
```

# Solid

```tsx title="src/routes/posts.index.tsx"
import { createFileRoute } from '@tanstack/solid-router'

// Note the trailing slash, which is used to target index routes
export const Route = createFileRoute('/posts/')({
  component: PostsIndexComponent,
})

function PostsIndexComponent() {
  return <div>Please select a post!</div>
}
```

<!-- ::end:framework -->

This route will be matched when the URL is `/posts` exactly.

## Dynamic Route Segments

Route path segments that start with a `$` followed by a label are dynamic and capture that section of the URL into the `params` object for use in your application. For example, a pathname of `/posts/123` would match the `/posts/$postId` route, and the `params` object would be `{ postId: '123' }`.

These params are then usable in your route's configuration and components! Let's look at a `posts.$postId.tsx` route:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts/$postId.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  // In a loader
  loader: ({ params }) => fetchPost(params.postId),
  // Or in a component
  component: PostComponent,
})

function PostComponent() {
  // In a component!
  const { postId } = Route.useParams()
  return <div>Post ID: {postId}</div>
}
```

# Solid

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts/$postId')({
  // In a loader
  loader: ({ params }) => fetchPost(params.postId),
  // Or in a component
  component: PostComponent,
})

function PostComponent() {
  // In a component!
  const { postId } = Route.useParams()
  return <div>Post ID: {postId()}</div>
}
```

<!-- ::end:framework -->

> 🧠 Dynamic segments work at **each** segment of the path. For example, you could have a route with the path of `/posts/$postId/$revisionId` and each `$` segment would be captured into the `params` object.

## Splat / Catch-All Routes

A route with a path of only `$` is called a "splat" route because it _always_ captures _any_ remaining section of the URL pathname from the `$` to the end. The captured pathname is then available in the `params` object under the special `_splat` property.

For example, a route targeting the `files/$` path is a splat route. If the URL pathname is `/files/documents/hello-world`, the `params` object would contain `documents/hello-world` under the special `_splat` property:

```js
{
  '_splat': 'documents/hello-world'
}
```

> ⚠️ In v1 of the router, splat routes are also denoted with a `*` instead of a `_splat` key for backwards compatibility. This will be removed in v2.

> 🧠 Why use `$`? Thanks to tools like Remix, we know that despite `*`s being the most common character to represent a wildcard, they do not play nice with filenames or CLI tools, so just like them, we decided to use `$` instead.

## Optional Path Parameters

Optional path parameters allow you to define route segments that may or may not be present in the URL. They use the `{-$paramName}` syntax and provide flexible routing patterns where certain parameters are optional.

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.{-$category}.tsx"
// The `-$category` segment is optional, so this route matches both `/posts` and `/posts/tech`
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/{-$category}')({
  component: PostsComponent,
})

function PostsComponent() {
  const { category } = Route.useParams()

  return <div>{category ? `Posts in ${category}` : 'All Posts'}</div>
}
```

# Solid

```tsx title="src/routes/posts.{-$category}.tsx"
// The `-$category` segment is optional, so this route matches both `/posts` and `/posts/tech`
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts/{-$category}')({
  component: PostsComponent,
})

function PostsComponent() {
  const { category } = Route.useParams()

  return <div>{category ? `Posts in ${category()}` : 'All Posts'}</div>
}
```

<!-- ::end:framework -->

This route will match both `/posts` (category is `undefined`) and `/posts/tech` (category is `"tech"`).

You can also define multiple optional parameters in a single route:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.{-$category}.${-$slug}.tsx"
// The `-$category` segment is optional, so this route matches both `/posts` and `/posts/tech`
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/{-$category}/{-$slug}')({
  component: PostsComponent,
})
```

# Solid

```tsx title="src/routes/posts.{-$category}.${-$slug}.tsx"
// The `-$category` segment is optional, so this route matches both `/posts` and `/posts/tech`
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts/{-$category}/{-$slug}')({
  component: PostsComponent,
})
```

<!-- ::end:framework -->

This route matches `/posts`, `/posts/tech`, and `/posts/tech/hello-world`.

> 🧠 Routes with optional parameters are ranked lower in priority than exact matches, ensuring that more specific routes like `/posts/featured` are matched before `/posts/{-$category}`.

## Layout Routes

Layout routes are used to wrap child routes with additional components and logic. They are useful for:

- Wrapping child routes with a layout component
- Enforcing a `loader` requirement before displaying any child routes
- Validating and providing search params to child routes
- Providing fallbacks for error components or pending elements to child routes
- Providing shared context to all child routes
- And more!

Let's take a look at an example layout route called `app.tsx`:

```
routes/
├── app.tsx
├── app.dashboard.tsx
├── app.settings.tsx
```

In the tree above, `app.tsx` is a layout route that wraps two child routes, `app.dashboard.tsx` and `app.settings.tsx`.

This tree structure is used to wrap the child routes with a layout component:

<!-- ::start:framework -->

# React

```tsx title="src/routes/app.tsx"
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: AppLayoutComponent,
})

function AppLayoutComponent() {
  return (
    <div>
      <h1>App Layout</h1>
      <Outlet />
    </div>
  )
}
```

# Solid

```tsx title="src/routes/app.tsx"
import { Outlet, createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/app')({
  component: AppLayoutComponent,
})

function AppLayoutComponent() {
  return (
    <div>
      <h1>App Layout</h1>
      <Outlet />
    </div>
  )
}
```

<!-- ::end:framework -->

The following table shows which component(s) will be rendered based on the URL:

| URL Path         | Component                |
| ---------------- | ------------------------ |
| `/app`           | `<AppLayout>`            |
| `/app/dashboard` | `<AppLayout><Dashboard>` |
| `/app/settings`  | `<AppLayout><Settings>`  |

Since TanStack Router supports mixed flat and directory routes, you can also express your application's routing using layout routes within directories:

```
routes/
├── app/
│   ├── route.tsx
│   ├── dashboard.tsx
│   ├── settings.tsx
```

In this nested tree, the `app/route.tsx` file is a configuration for the layout route that wraps two child routes, `app/dashboard.tsx` and `app/settings.tsx`.

Layout Routes also let you enforce component and loader logic for Dynamic Route Segments:

```
routes/
├── app/users/
│   ├── $userId/
|   |   ├── route.tsx
|   |   ├── index.tsx
|   |   ├── edit.tsx
```

## Pathless Layout Routes

Like [Layout Routes](#layout-routes), Pathless Layout Routes are used to wrap child routes with additional components and logic. However, pathless layout routes do not require a matching `path` in the URL and are used to wrap child routes with additional components and logic without requiring a matching `path` in the URL.

Pathless Layout Routes are prefixed with an underscore (`_`) to denote that they are "pathless".

> 🧠 The part of the path after the `_` prefix is used as the route's ID and is required because every route must be uniquely identifiable, especially when using TypeScript so as to avoid type errors and accomplish autocomplete effectively.

Let's take a look at an example route called `_pathlessLayout.tsx`:

```

routes/
├── _pathlessLayout.tsx
├── _pathlessLayout.a.tsx
├── _pathlessLayout.b.tsx

```

In the tree above, `_pathlessLayout.tsx` is a pathless layout route that wraps two child routes, `_pathlessLayout.a.tsx` and `_pathlessLayout.b.tsx`.

The `_pathlessLayout.tsx` route is used to wrap the child routes with a Pathless layout component:

<!-- ::start:framework -->

# React

```tsx title="src/routes/_pathlessLayout.tsx"
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_pathlessLayout')({
  component: PathlessLayoutComponent,
})

function PathlessLayoutComponent() {
  return (
    <div>
      <h1>Pathless layout</h1>
      <Outlet />
    </div>
  )
}
```

# Solid

```tsx title="src/routes/_pathlessLayout.tsx"
import { Outlet, createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/_pathlessLayout')({
  component: PathlessLayoutComponent,
})

function PathlessLayoutComponent() {
  return (
    <div>
      <h1>Pathless layout</h1>
      <Outlet />
    </div>
  )
}
```

<!-- ::end:framework -->

The following table shows which component will be rendered based on the URL:

| URL Path | Component             |
| -------- | --------------------- |
| `/`      | `<Index>`             |
| `/a`     | `<PathlessLayout><A>` |
| `/b`     | `<PathlessLayout><B>` |

Since TanStack Router supports mixed flat and directory routes, you can also express your application's routing using pathless layout routes within directories:

```
routes/
├── _pathlessLayout/
│   ├── route.tsx
│   ├── a.tsx
│   ├── b.tsx
```

However, unlike Layout Routes, since Pathless Layout Routes do not match based on URL path segments, this means that these routes do not support [Dynamic Route Segments](#dynamic-route-segments) as part of their path and therefore cannot be matched in the URL.

This means that you cannot do this:

```
routes/
├── _$postId/ ❌
│   ├── ...
```

Rather, you'd have to do this:

```
routes/
├── $postId/
├── _postPathlessLayout/ ✅
│   ├── ...
```

## Non-Nested Routes

Non-nested routes can be created by suffixing a parent file route segment with a `_` and are used to **un-nest** a route from its parents and render its own component tree.

Consider the following flat route tree:

```
routes/
├── posts.tsx
├── posts.$postId.tsx
├── posts_.$postId.edit.tsx
```

The following table shows which component will be rendered based on the URL:

| URL Path          | Component                    |
| ----------------- | ---------------------------- |
| `/posts`          | `<Posts>`                    |
| `/posts/123`      | `<Posts><Post postId="123">` |
| `/posts/123/edit` | `<PostEditor postId="123">`  |

- The `posts.$postId.tsx` route is nested as normal under the `posts.tsx` route and will render `<Posts><Post>`.
- The `posts_.$postId.edit.tsx` route **does not share** the same `posts` prefix as the other routes and therefore will be treated as if it is a top-level route and will render `<PostEditor>`.

## Excluding Files and Folders from Routes

Files and folders can be excluded from route generation with a `-` prefix attached to the file name. This gives you the ability to colocate logic in the route directories.

Consider the following route tree:

```
routes/
├── posts.tsx
├── -posts-table.tsx // 👈🏼 ignored
├── -components/ // 👈🏼 ignored
│   ├── header.tsx // 👈🏼 ignored
│   ├── footer.tsx // 👈🏼 ignored
│   ├── ...
```

We can import from the excluded files into our posts route

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/react-router'
import { PostsTable } from './-posts-table'
import { PostsHeader } from './-components/header'
import { PostsFooter } from './-components/footer'

export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  component: PostComponent,
})

function PostComponent() {
  const posts = Route.useLoaderData()

  return (
    <div>
      <PostsHeader />
      <PostsTable posts={posts} />
      <PostsFooter />
    </div>
  )
}
```

# Solid

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/solid-router'
import { PostsTable } from './-posts-table'
import { PostsHeader } from './-components/header'
import { PostsFooter } from './-components/footer'

export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  component: PostComponent,
})

function PostComponent() {
  const posts = Route.useLoaderData()

  return (
    <div>
      <PostsHeader />
      <PostsTable posts={posts} />
      <PostsFooter />
    </div>
  )
}
```

<!-- ::end:framework -->

The excluded files will not be added to `routeTree.gen.ts`.

## Pathless Route Group Directories

Pathless route group directories use `()` as a way to group routes files together regardless of their path. They are purely organizational and do not affect the route tree or component tree in any way.

```
routes/
├── index.tsx
├── (app)/
│   ├── dashboard.tsx
│   ├── settings.tsx
│   ├── users.tsx
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
```

In the example above, the `app` and `auth` directories are purely organizational and do not affect the route tree or component tree in any way. They are used to group related routes together for easier navigation and organization.

The following table shows which component will be rendered based on the URL:

| URL Path     | Component     |
| ------------ | ------------- |
| `/`          | `<Index>`     |
| `/dashboard` | `<Dashboard>` |
| `/settings`  | `<Settings>`  |
| `/users`     | `<Users>`     |
| `/login`     | `<Login>`     |
| `/register`  | `<Register>`  |

As you can see, the `app` and `auth` directories are purely organizational and do not affect the route tree or component tree in any way.


---
title: Code Splitting
---

Code splitting and lazy loading is a powerful technique for improving the bundle size and load performance of an application.

- Reduces the amount of code that needs to be loaded on initial page load
- Code is loaded on-demand when it is needed
- Results in more chunks that are smaller in size that can be cached more easily by the browser.

## How does TanStack Router split code?

TanStack Router separates code into two categories:

- **Critical Route Configuration** - The code that is required to render the current route and kick off the data loading process as early as possible.
  - Path Parsing/Serialization
  - Search Param Validation
  - Loaders, Before Load
  - Route Context
  - Static Data
  - Links
  - Scripts
  - Styles
  - All other route configuration not listed below

- **Non-Critical/Lazy Route Configuration** - The code that is not required to match the route, and can be loaded on-demand.
  - Route Component
  - Error Component
  - Pending Component
  - Not-found Component

> 🧠 **Why is the loader not split?**
>
> - The loader is already an asynchronous boundary, so you pay double to both get the chunk _and_ wait for the loader to execute.
> - Categorically, it is less likely to contribute to a large bundle size than a component.
> - The loader is one of the most important preloadable assets for a route, especially if you're using a default preload intent, like hovering over a link, so it's important for the loader to be available without any additional async overhead.
>
>   Knowing the disadvantages of splitting the loader, if you still want to go ahead with it, head over to the [Data Loader Splitting](#data-loader-splitting) section.

## Encapsulating a route's files into a directory

Since TanStack Router's file-based routing system is designed to support both flat and nested file structures, it's possible to encapsulate a route's files into a single directory without any additional configuration.

To encapsulate a route's files into a directory, move the route file itself into a `.route` file within a directory with the same name as the route file.

For example, if you have a route file named `posts.tsx`, you would create a new directory named `posts` and move the `posts.tsx` file into that directory, renaming it to `route.tsx`.

**Before**

- `posts.tsx`

**After**

- `posts`
  - `route.tsx`

## Approaches to code splitting

TanStack Router supports multiple approaches to code splitting. If you are using code-based routing, skip to the [Code-Based Splitting](#code-based-splitting) section.

When you are using file-based routing, you can use the following approaches to code splitting:

- [Using automatic code-splitting ✨](#using-automatic-code-splitting)
- [Using the `.lazy.tsx` suffix](#using-the-lazytsx-suffix)
- [Using Virtual Routes](#using-virtual-routes)

## Using automatic code-splitting✨

This is the easiest and most powerful way to code split your route files.

When using the `autoCodeSplitting` feature, TanStack Router will automatically code split your route files based on the non-critical route configuration mentioned above.

> [!IMPORTANT]
> The automatic code-splitting feature is **ONLY** available when you are using file-based routing with one of our [supported bundlers](../routing/file-based-routing.md#getting-started-with-file-based-routing).
> This will **NOT** work if you are **only** using the CLI (`@tanstack/router-cli`).

To enable automatic code-splitting, you just need to add the following to the configuration of your TanStack Router Bundler Plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      // ...
      autoCodeSplitting: true,
    }),
    react(), // Make sure to add this plugin after the TanStack Router Bundler plugin
  ],
})
```

That's it! TanStack Router will automatically code-split all your route files by their critical and non-critical route configurations.

If you want more control over the code-splitting process, head over to the [Automatic Code Splitting](./automatic-code-splitting.md) guide to learn more about the options available.

## Using the `.lazy.tsx` suffix

If you are not able to use the automatic code-splitting feature, you can still code-split your route files using the `.lazy.tsx` suffix. It is **as easy as moving your code into a separate file with a `.lazy.tsx` suffix** and using the `createLazyFileRoute` function instead of `createFileRoute`.

> [!IMPORTANT]
> The `__root.tsx` route file, using either `createRootRoute` or `createRootRouteWithContext`, does not support code splitting, since it's always rendered regardless of the current route.

These are the only options that `createLazyFileRoute` supports:

| Export Name         | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `component`         | The component to render for the route.                                |
| `errorComponent`    | The component to render when an error occurs while loading the route. |
| `pendingComponent`  | The component to render while the route is loading.                   |
| `notFoundComponent` | The component to render if a not-found error gets thrown.             |

### Example code splitting with `.lazy.tsx`

When you are using `.lazy.tsx` you can split your route into two files to enable code splitting:

**Before (Single File)**

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/react-router'
import { fetchPosts } from './api'

export const Route = createFileRoute('/posts')({
  loader: fetchPosts,
  component: Posts,
})

function Posts() {
  // ...
}
```

# Solid

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/solid-router'
import { fetchPosts } from './api'

export const Route = createFileRoute('/posts')({
  loader: fetchPosts,
  component: Posts,
})

function Posts() {
  // ...
}
```

<!-- ::end:framework -->

**After (Split into two files)**

This file would contain the critical route configuration:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/react-router'
import { fetchPosts } from './api'

export const Route = createFileRoute('/posts')({
  loader: fetchPosts,
})
```

# Solid

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/solid-router'
import { fetchPosts } from './api'

export const Route = createFileRoute('/posts')({
  loader: fetchPosts,
})
```

<!-- ::end:framework -->

With the non-critical route configuration going into the file with the `.lazy.tsx` suffix:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

# Solid

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/solid-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

<!-- ::end:framework -->

## Using Virtual Routes

You might run into a situation where you end up splitting out everything from a route file, leaving it empty! In this case, simply **delete the route file entirely**! A virtual route will automatically be generated for you to serve as an anchor for your code split files. This virtual route will live directly in the generated route tree file.

**Before (Virtual Routes)**

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  // Hello?
})
```

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts')({
  // Hello?
})
```

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/solid-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

**After (Virtual Routes)**

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

# Solid

```tsx title="src/routes/posts.lazy.tsx"
import { createLazyFileRoute } from '@tanstack/solid-router'

export const Route = createLazyFileRoute('/posts')({
  component: Posts,
})

function Posts() {
  // ...
}
```

<!-- ::end:framework -->

Tada! 🎉

## Code-Based Splitting

If you are using code-based routing, you can still code-split your routes using the `Route.lazy()` method and the `createLazyRoute` function. You'll need to split your route configuration into two parts:

Create a lazy route using the `createLazyRoute` function.

```tsx title="src/posts.lazy.tsx"
export const Route = createLazyRoute('/posts')({
  component: MyComponent,
})

function MyComponent() {
  return <div>My Component</div>
}
```

Then, call the `.lazy` method on the route definition in your `app.tsx` to import the lazy/code-split route with the non-critical route configuration.

```tsx title="src/app.tsx"
const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
}).lazy(() => import('./posts.lazy').then((d) => d.Route))
```

## Data Loader Splitting

**Be warned!!!** Splitting a route loader is a dangerous game.

It can be a powerful tool to reduce bundle size, but it comes with a cost as mentioned in the [How does TanStack Router split code?](#how-does-tanstack-router-split-code) section.

You can code split your data loading logic using the Route's `loader` option. While this process makes it difficult to maintain type-safety with the parameters passed to your loader, you can always use the generic `LoaderContext` type to get you most of the way there:

<!-- ::start:framework -->

# React

```tsx
import { lazyFn } from '@tanstack/react-router'

const route = createRoute({
  path: '/my-route',
  component: MyComponent,
  loader: lazyFn(() => import('./loader'), 'loader'),
})

// In another file...a
export const loader = async (context: LoaderContext) => {
  /// ...
}
```

# Solid

```tsx
import { lazyFn } from '@tanstack/solid-router'

const route = createRoute({
  path: '/my-route',
  component: MyComponent,
  loader: lazyFn(() => import('./loader'), 'loader'),
})

// In another file...a
export const loader = async (context: LoaderContext) => {
  /// ...
}
```

<!-- ::end:framework -->

If you are using file-based routing, you'll only be able to split your `loader` if you are using [Automatic Code Splitting](#using-automatic-code-splitting) with customized bundling options.

## Manually accessing Route APIs in other files with the `getRouteApi` helper

As you might have guessed, placing your component code in a separate file than your route can make it difficult to consume the route itself. To help with this, TanStack Router exports a handy `getRouteApi` function that you can use to access a route's type-safe APIs in a file without importing the route itself.

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title="src/my-route.tsx"
import { createRoute } from '@tanstack/react-router'
import { MyComponent } from './MyComponent'

const route = createRoute({
  path: '/my-route',
  loader: () => ({
    foo: 'bar',
  }),
  component: MyComponent,
})
```

```tsx title="src/MyComponent.tsx"
import { getRouteApi } from '@tanstack/react-router'

const route = getRouteApi('/my-route')

export function MyComponent() {
  const loaderData = route.useLoaderData()
  //    ^? { foo: string }

  return <div>...</div>
}
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title="src/my-route.tsx"
import { createRoute } from '@tanstack/solid-router'
import { MyComponent } from './MyComponent'

const route = createRoute({
  path: '/my-route',
  loader: () => ({
    foo: 'bar',
  }),
  component: MyComponent,
})
```

```tsx title="src/MyComponent.tsx"
import { getRouteApi } from '@tanstack/solid-router'

const route = getRouteApi('/my-route')

export function MyComponent() {
  const loaderData = route.useLoaderData()
  //    ^? { foo: string }

  return <div>...</div>
}
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

The `getRouteApi` function is useful for accessing other type-safe APIs:

- `useLoaderData`
- `useLoaderDeps`
- `useMatch`
- `useParams`
- `useRouteContext`
- `useSearch`

---
title: Outlets
---

Nested routing means that routes can be nested within other routes, including the way they render. So how do we tell our routes where to render this nested content?

## The `Outlet` Component

The `Outlet` component is used to render the next potentially matching child route. `<Outlet />` doesn't take any props and can be rendered anywhere within a route's component tree. If there is no matching child route, `<Outlet />` will render `null`.

> [!TIP]
> If a route's `component` is left undefined, it will render an `<Outlet />` automatically.

A great example is configuring the root route of your application. Let's give our root route a component that renders a title, then an `<Outlet />` for our top-level routes to render.

<!-- ::start:framework -->

# React

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div>
      <h1>My App</h1>
      <Outlet /> {/* This is where child routes will render */}
    </div>
  )
}
```

# Solid

```tsx
import { createRootRoute, Outlet } from '@tanstack/solid-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div>
      <h1>My App</h1>
      <Outlet /> {/* This is where child routes will render */}
    </div>
  )
}
```

<!-- ::end:framework -->

---
title: Navigation
---

## Everything is Relative

Believe it or not, every navigation within an app is **relative**, even if you aren't using explicit relative path syntax (`../../somewhere`). Any time a link is clicked or an imperative navigation call is made, you will always have an **origin** path and a **destination** path which means you are navigating **from** one route **to** another route.

TanStack Router keeps this constant concept of relative navigation in mind for every navigation, so you'll constantly see two properties in the API:

- `from` - The origin route path
- `to` - The destination route path

> ⚠️ If a `from` route path isn't provided the router will assume you are navigating from the root `/` route and only auto-complete absolute paths. After all, you need to know where you are from in order to know where you're going 😉.

## Shared Navigation API

Every navigation and route matching API in TanStack Router uses the same core interface with minor differences depending on the API. This means that you can learn navigation and route matching once and use the same syntax and concepts across the library.

### `ToOptions` Interface

This is the core `ToOptions` interface that is used in every navigation and route matching API:

```ts
type ToOptions<
  TRouteTree extends AnyRoute = AnyRoute,
  TFrom extends RoutePaths<TRouteTree> | string = string,
  TTo extends string = '',
> = {
  // `from` is an optional route ID or path. If it is not supplied, only absolute paths will be auto-completed and type-safe. It's common to supply the route.fullPath of the origin route you are rendering from for convenience. If you don't know the origin route, leave this empty and work with absolute paths or unsafe relative paths.
  from?: string
  // `to` can be an absolute route path or a relative path from the `from` option to a valid route path. ⚠️ Do not interpolate path params, hash or search params into the `to` options. Use the `params`, `search`, and `hash` options instead.
  to: string
  // `params` is either an object of path params to interpolate into the `to` option or a function that supplies the previous params and allows you to return new ones. This is the only way to interpolate dynamic parameters into the final URL. Depending on the `from` and `to` route, you may need to supply none, some or all of the path params. TypeScript will notify you of the required params if there are any.
  params:
    | Record<string, unknown>
    | ((prevParams: Record<string, unknown>) => Record<string, unknown>)
  // `search` is either an object of query params or a function that supplies the previous search and allows you to return new ones. Depending on the `from` and `to` route, you may need to supply none, some or all of the query params. TypeScript will notify you of the required search params if there are any.
  search:
    | Record<string, unknown>
    | ((prevSearch: Record<string, unknown>) => Record<string, unknown>)
  // `hash` is either a string or a function that supplies the previous hash and allows you to return a new one.
  hash?: string | ((prevHash: string) => string)
  // `state` is either an object of state or a function that supplies the previous state and allows you to return a new one. State is stored in the history API and can be useful for passing data between routes that you do not want to permanently store in URL search params.
  state?:
    | Record<string, any>
    | ((prevState: Record<string, unknown>) => Record<string, unknown>)
  // `mask` is another navigation object used to mask the URL shown in the browser for this navigation.
  mask?: ToMaskOptions<TRouteTree>
}

type ToMaskOptions<TRouteTree extends AnyRoute = AnyRoute> = {
  // `from`, `to`, `params`, `search`, `hash`, and `state` behave the same as in `ToOptions`.
  // `mask` itself is not allowed inside `ToMaskOptions`.
  from?: string
  to: string
  params:
    | Record<string, unknown>
    | ((prevParams: Record<string, unknown>) => Record<string, unknown>)
  search:
    | Record<string, unknown>
    | ((prevSearch: Record<string, unknown>) => Record<string, unknown>)
  hash?: string | ((prevHash: string) => string)
  state?:
    | Record<string, any>
    | ((prevState: Record<string, unknown>) => Record<string, unknown>)
  // If true, the URL will unmask on page reload.
  unmaskOnReload?: boolean
}
```

> 🧠 Every route object has a `to` property, which can be used as the `to` for any navigation or route matching API. Where possible, this will allow you to avoid plain strings and use type-safe route references instead:

```tsx
import { Route as aboutRoute } from './routes/about.tsx'

function Comp() {
  return <Link to={aboutRoute.to}>About</Link>
}
```

### `NavigateOptions` Interface

This is the core `NavigateOptions` interface that extends `ToOptions`. Any API that is actually performing a navigation will use this interface:

```ts
export type NavigateOptions<
  TRouteTree extends AnyRoute = AnyRoute,
  TFrom extends RoutePaths<TRouteTree> | string = string,
  TTo extends string = '',
> = ToOptions<TRouteTree, TFrom, TTo> & {
  // `replace` is a boolean that determines whether the navigation should replace the current history entry or push a new one.
  replace?: boolean
  // `resetScroll` is a boolean that determines whether scroll position will be reset to 0,0 after the location is committed to browser history.
  resetScroll?: boolean
  // `hashScrollIntoView` is a boolean or object that determines whether an id matching the hash will be scrolled into view after the location is committed to history.
  hashScrollIntoView?: boolean | ScrollIntoViewOptions
  // `viewTransition` is either a boolean or function that determines if and how the browser will call document.startViewTransition() when navigating.
  viewTransition?: boolean | ViewTransitionOptions
  // `ignoreBlocker` is a boolean that determines if navigation should ignore any blockers that might prevent it.
  ignoreBlocker?: boolean
  // `reloadDocument` is a boolean that determines if navigation to a route inside of router will trigger a full page load instead of the traditional SPA navigation.
  reloadDocument?: boolean
  // `href` is a string that can be used in place of `to` to navigate to a full built href, e.g. pointing to an external target.
  href?: string
}
```

`NavigateOptions` includes all `ToOptions` fields, including `mask`.

### `LinkOptions` Interface

Anywhere an actual `<a>` tag the `LinkOptions` interface which extends `NavigateOptions` will be available:

```tsx
export type LinkOptions<
  TRouteTree extends AnyRoute = AnyRoute,
  TFrom extends RoutePaths<TRouteTree> | string = string,
  TTo extends string = '',
> = NavigateOptions<TRouteTree, TFrom, TTo> & {
  // The standard anchor tag target attribute
  target?: HTMLAnchorElement['target']
  // Defaults to `{ exact: false, includeHash: false }`
  activeOptions?: {
    exact?: boolean
    includeHash?: boolean
    includeSearch?: boolean
    explicitUndefined?: boolean
  }
  // If set, will preload the linked route on hover and cache it for this many milliseconds in hopes that the user will eventually navigate there.
  preload?: false | 'intent'
  // Delay intent preloading by this many milliseconds. If the intent exits before this delay, the preload will be cancelled.
  preloadDelay?: number
  // If true, will render the link without the href attribute
  disabled?: boolean
}
```

Since `LinkOptions` extends `NavigateOptions`, it also supports `mask`.

## Navigation API

With relative navigation and all of the interfaces in mind now, let's talk about the different flavors of navigation API at your disposal:

- The `<Link>` component
  - Generates an actual `<a>` tag with a valid `href` which can be click or even cmd/ctrl + clicked to open in a new tab
- The `useNavigate()` hook
  - When possible, `Link` component should be used for navigation, but sometimes you need to navigate imperatively as a result of a side-effect. `useNavigate` returns a function that can be called to perform an immediate client-side navigation.
- The `<Navigate>` component
  - Renders nothing and performs an immediate client-side navigation.
- The `Router.navigate()` method
  - This is the most powerful navigation API in TanStack Router. Similar to `useNavigate`, it imperatively navigates, but is available everywhere you have access to your router.

⚠️ None of these APIs are a replacement for server-side redirects. If you need to redirect a user immediately from one route to another before mounting your application, use a server-side redirect instead of a client-side navigation.

## `<Link>` Component

The `Link` component is the most common way to navigate within an app. It renders an actual `<a>` tag with a valid `href` attribute which can be clicked or even cmd/ctrl + clicked to open in a new tab. It also supports any normal `<a>` attributes including `target` to open links in new windows, etc.

In addition to the [`LinkOptions`](#linkoptions-interface) interface, the `Link` component also supports the following props:

```tsx
export type LinkProps<
  TFrom extends RoutePaths<RegisteredRouter['routeTree']> | string = string,
  TTo extends string = '',
> = LinkOptions<RegisteredRouter['routeTree'], TFrom, TTo> & {
  // A function that returns additional props for the `active` state of this link. These props override other props passed to the link (`style`'s are merged, `className`'s are concatenated)
  activeProps?:
    | FrameworkHTMLAnchorTagAttributes
    | (() => FrameworkHTMLAnchorAttributes)
  // A function that returns additional props for the `inactive` state of this link. These props override other props passed to the link (`style`'s are merged, `className`'s are concatenated)
  inactiveProps?:
    | FrameworkHTMLAnchorAttributes
    | (() => FrameworkHTMLAnchorAttributes)
}
```

### Absolute Links

Let's make a simple static link!

<!-- ::start:framework -->

# React

```tsx
import { Link } from '@tanstack/react-router'

const link = <Link to="/about">About</Link>
```

# Solid

```tsx
import { Link } from '@tanstack/solid-router'

const link = <Link to="/about">About</Link>
```

<!-- ::end:framework -->

### Dynamic Links

Dynamic links are links that have dynamic segments in them. For example, a link to a blog post might look like this:

```tsx
const link = (
  <Link
    to="/blog/post/$postId"
    params={{
      postId: 'my-first-blog-post',
    }}
  >
    Blog Post
  </Link>
)
```

Keep in mind that normally dynamic segment params are `string` values, but they can also be any other type that you parse them to in your route options. Either way, the type will be checked at compile time to ensure that you are passing the correct type.

### Relative Links

By default, all links are absolute unless a `from` route path is provided. This means that the above link will always navigate to the `/about` route regardless of what route you are currently on.

Relative links can be combined with a `from` route path. If a from route path isn't provided, relative paths default to the current active location.

> [!NOTE]
> Keep in mind that when calling useNavigate as a method on the route, for example `Route.useNavigate`, then the `from` location is predefined to be the route it's called on.
>
> Another common pitfall is when using this in a pathless layout route, since the pathless layout route does not have an actual path, the `from` location is regarded as the parent of the pathless layout route. Hence relative routing will be resolved from this parent.

```tsx
const postIdRoute = createRoute({
  path: '/blog/post/$postId',
})

const link = (
  <Link from={postIdRoute.fullPath} to="../categories">
    Categories
  </Link>
)
```

As seen above, it's common to provide the `route.fullPath` as the `from` route path. This is because the `route.fullPath` is a reference that will update if you refactor your application. However, sometimes it's not possible to import the route directly, in which case it's fine to provide the route path directly as a string. It will still get type-checked as per usual!

### Special relative paths: `"."` and `".."`

Quite often you might want to reload the current location or another `from` path, for example, to rerun the loaders on the current and/or parent routes, or maybe navigate back to a parent route. This can be achieved by specifying a `to` route path of `"."` which will reload the current location or provided `from` path.

Another common need is to navigate one route back relative to the current location or another path. By specifying a `to` route path of `".."` navigation will be resolved to the first parent route preceding the current location.

```tsx
export const Route = createFileRoute('/posts/$postId')({
  component: PostComponent,
})

function PostComponent() {
  return (
    <div>
      <Link to=".">Reload the current route of /posts/$postId</Link>
      <Link to="..">Navigate back to /posts</Link>
      // the below are all equivalent
      <Link to="/posts">Navigate back to /posts</Link>
      <Link from="/posts" to=".">
        Navigate back to /posts
      </Link>
      // the below are all equivalent
      <Link to="/">Navigate to root</Link>
      <Link from="/posts" to="..">
        Navigate to root
      </Link>
    </div>
  )
}
```

### Search Param Links

Search params are a great way to provide additional context to a route. For example, you might want to provide a search query to a search page:

```tsx
const link = (
  <Link
    to="/search"
    search={{
      query: 'tanstack',
    }}
  >
    Search
  </Link>
)
```

It's also common to want to update a single search param without supplying any other information about the existing route. For example, you might want to update the page number of a search result:

```tsx
const link = (
  <Link
    to="."
    search={(prev) => ({
      ...prev,
      page: prev.page + 1,
    })}
  >
    Next Page
  </Link>
)
```

### Search Param Type Safety

Search params are a highly dynamic state management mechanism, so it's important to ensure that you are passing the correct types to your search params. We'll see in a later section in detail how to validate and ensure search params typesafety, among other great features!

### Hash Links

Hash links are a great way to link to a specific section of a page. For example, you might want to link to a specific section of a blog post:

```tsx
const link = (
  <Link
    to="/blog/post/$postId"
    params={{
      postId: 'my-first-blog-post',
    }}
    hash="section-1"
  >
    Section 1
  </Link>
)
```

> ⚠️ When directly navigating to a URL with a hash fragment, the fragment is only available on the client; the browser does not send the fragment to the server as part of the request URL.
>
> This means that if you are using a server-side rendering approach, the hash fragment will not be available on the server-side, and hydration mismatches can occur when using the hash for rendering markup.
>
> Examples of this would be:
>
> - returning the hash value in the markup,
> - conditional rendering based on the hash value, or
> - setting the Link as active based on the hash value.

### Navigating with Optional Parameters

Optional path parameters provide flexible navigation patterns where you can include or omit parameters as needed. Optional parameters use the `{-$paramName}` syntax and offer fine-grained control over URL structure.

#### Parameter Inheritance vs Removal

When navigating with optional parameters, you have two main strategies:

**Inheriting Current Parameters**
Use `params: {}` to inherit all current route parameters:

```tsx
// Inherits current route parameters
<Link to="/posts/{-$category}" params={{}}>
  All Posts
</Link>
```

**Removing Parameters**  
Set parameters to `undefined` to explicitly remove them:

```tsx
// Removes the category parameter
<Link to="/posts/{-$category}" params={{ category: undefined }}>
  All Posts
</Link>
```

#### Basic Optional Parameter Navigation

```tsx
// Navigate with optional parameter
<Link
  to="/posts/{-$category}"
  params={{ category: 'tech' }}
>
  Tech Posts
</Link>

// Navigate without optional parameter
<Link
  to="/posts/{-$category}"
  params={{ category: undefined }}
>
  All Posts
</Link>

// Navigate using parameter inheritance
<Link
  to="/posts/{-$category}"
  params={{}}
>
  Current Category
</Link>
```

#### Function-Style Parameter Updates

Function-style parameter updates are particularly useful with optional parameters:

```tsx
// Remove a parameter using function syntax
<Link
  to="/posts/{-$category}"
  params={(prev) => ({ ...prev, category: undefined })}
>
  Clear Category
</Link>

// Update a parameter while keeping others
<Link
  to="/articles/{-$category}/{-$slug}"
  params={(prev) => ({ ...prev, category: 'news' })}
>
  News Articles
</Link>

// Conditionally set parameters
<Link
  to="/posts/{-$category}"
  params={(prev) => ({
    ...prev,
    category: someCondition ? 'tech' : undefined
  })}
>
  Conditional Category
</Link>
```

#### Multiple Optional Parameters

When working with multiple optional parameters, you can mix and match which ones to include:

```tsx
// Navigate with some optional parameters
<Link
  to="/posts/{-$category}/{-$slug}"
  params={{ category: 'tech', slug: undefined }}
>
  Tech Posts
</Link>

// Remove all optional parameters
<Link
  to="/posts/{-$category}/{-$slug}"
  params={{ category: undefined, slug: undefined }}
>
  All Posts
</Link>

// Set multiple parameters
<Link
  to="/posts/{-$category}/{-$slug}"
  params={{ category: 'tech', slug: 'react-tips' }}
>
  Specific Post
</Link>
```

#### Mixed Required and Optional Parameters

Optional parameters work seamlessly with required parameters:

```tsx
// Required 'id', optional 'tab'
<Link
  to="/users/$id/{-$tab}"
  params={{ id: '123', tab: 'settings' }}
>
  User Settings
</Link>

// Remove optional parameter while keeping required
<Link
  to="/users/$id/{-$tab}"
  params={{ id: '123', tab: undefined }}
>
  User Profile
</Link>

// Use function style with mixed parameters
<Link
  to="/users/$id/{-$tab}"
  params={(prev) => ({ ...prev, tab: 'notifications' })}
>
  User Notifications
</Link>
```

#### Advanced Optional Parameter Patterns

**Prefix and Suffix Parameters**
Optional parameters with prefix/suffix work with navigation:

```tsx
// Navigate to file with optional name
<Link
  to="/files/prefix{-$name}.txt"
  params={{ name: 'document' }}
>
  Document File
</Link>

// Navigate to file without optional name
<Link
  to="/files/prefix{-$name}.txt"
  params={{ name: undefined }}
>
  Default File
</Link>
```

**All Optional Parameters**
Routes where all parameters are optional:

```tsx
// Navigate to specific date
<Link
  to="/{-$year}/{-$month}/{-$day}"
  params={{ year: '2023', month: '12', day: '25' }}
>
  Christmas 2023
</Link>

// Navigate to partial date
<Link
  to="/{-$year}/{-$month}/{-$day}"
  params={{ year: '2023', month: '12', day: undefined }}
>
  December 2023
</Link>

// Navigate to root with all parameters removed
<Link
  to="/{-$year}/{-$month}/{-$day}"
  params={{ year: undefined, month: undefined, day: undefined }}
>
  Home
</Link>
```

#### Navigation with Search Params and Optional Parameters

Optional parameters work great in combination with search params:

```tsx
// Combine optional path params with search params
<Link
  to="/posts/{-$category}"
  params={{ category: 'tech' }}
  search={{ page: 1, sort: 'newest' }}
>
  Tech Posts - Page 1
</Link>

// Remove path param but keep search params
<Link
  to="/posts/{-$category}"
  params={{ category: undefined }}
  search={(prev) => prev}
>
  All Posts - Same Filters
</Link>
```

#### Imperative Navigation with Optional Parameters

All the same patterns work with imperative navigation:

```tsx
function Component() {
  const navigate = useNavigate()

  const clearFilters = () => {
    navigate({
      to: '/posts/{-$category}/{-$tag}',
      params: { category: undefined, tag: undefined },
    })
  }

  const setCategory = (category: string) => {
    navigate({
      to: '/posts/{-$category}/{-$tag}',
      params: (prev) => ({ ...prev, category }),
    })
  }

  const applyFilters = (category?: string, tag?: string) => {
    navigate({
      to: '/posts/{-$category}/{-$tag}',
      params: { category, tag },
    })
  }
}
```

### Active & Inactive Props

The `Link` component supports two additional props: `activeProps` and `inactiveProps`. These props are functions that return additional props for the `active` and `inactive` states of the link. All props other than styles and classes passed here will override the original props passed to `Link`. Any styles or classes passed are merged together.

Here's an example:

```tsx
const link = (
  <Link
    to="/blog/post/$postId"
    params={{
      postId: 'my-first-blog-post',
    }}
    activeProps={{
      style: {
        fontWeight: 'bold',
      },
    }}
  >
    Section 1
  </Link>
)
```

### The `data-status` attribute

In addition to the `activeProps` and `inactiveProps` props, the `Link` component also adds a `data-status` attribute to the rendered element when it is in an active state. This attribute will be `active` or `undefined` depending on the current state of the link. This can come in handy if you prefer to use data-attributes to style your links instead of props.

### Active Options

The `Link` component comes with an `activeOptions` property that offers a few options of determining if a link is active or not. The following interface describes those options:

```tsx
export interface ActiveOptions {
  // If true, the link will be active if the current route matches the `to` route path exactly (no children routes)
  // Defaults to `false`
  exact?: boolean
  // If true, the link will only be active if the current URL hash matches the `hash` prop
  // Defaults to `false`
  includeHash?: boolean // Defaults to false
  // If true, the link will only be active if the current URL search params inclusively match the `search` prop
  // Defaults to `true`
  includeSearch?: boolean
  // This modifies the `includeSearch` behavior.
  // If true,  properties in `search` that are explicitly `undefined` must NOT be present in the current URL search params for the link to be active.
  // defaults to `false`
  explicitUndefined?: boolean
}
```

By default, it will check if the resulting **pathname** is a prefix of the current route. If any search params are provided, it will check that they _inclusively_ match those in the current location. Hashes are not checked by default.

For example, if you are on the `/blog/post/my-first-blog-post` route, the following links will be active:

```tsx
const link1 = (
  <Link to="/blog/post/$postId" params={{ postId: 'my-first-blog-post' }}>
    Blog Post
  </Link>
)
const link2 = <Link to="/blog/post">Blog Post</Link>
const link3 = <Link to="/blog">Blog Post</Link>
```

However, the following links will not be active:

```tsx
const link4 = (
  <Link to="/blog/post/$postId" params={{ postId: 'my-second-blog-post' }}>
    Blog Post
  </Link>
)
```

It's common for some links to only be active if they are an exact match. A good example of this would be a link to the home page. In scenarios like these, you can pass the `exact: true` option:

```tsx
const link = (
  <Link to="/" activeOptions={{ exact: true }}>
    Home
  </Link>
)
```

This will ensure that the link is not active when you are a child route.

A few more options to be aware of:

- If you want to include the hash in your matching, you can pass the `includeHash: true` option
- If you do **not** want to include the search params in your matching, you can pass the `includeSearch: false` option

### Passing `isActive` to children

The `Link` component accepts a function for its children, allowing you to propagate its `isActive` property to children. For example, you could style a child component based on whether the parent link is active:

```tsx
const link = (
  <Link to="/blog/post">
    {({ isActive }) => {
      return (
        <>
          <span>My Blog Post</span>
          <icon className={isActive ? 'active' : 'inactive'} />
        </>
      )
    }}
  </Link>
)
```

### Link Preloading

The `Link` component supports automatically preloading routes on intent (hovering or touchstart for now). This can be configured as a default in the router options (which we'll talk more about soon) or by passing a `preload='intent'` prop to the `Link` component. Here's an example:

```tsx
const link = (
  <Link to="/blog/post/$postId" preload="intent">
    Blog Post
  </Link>
)
```

With preloading enabled and relatively quick asynchronous route dependencies (if any), this simple trick can increase the perceived performance of your application with very little effort.

What's even better is that by using a cache-first library like `@tanstack/query`, preloaded routes will stick around and be ready for a stale-while-revalidate experience if the user decides to navigate to the route later on.

### Link Preloading Delay

Along with preloading is a configurable delay which determines how long a user must hover over a link to trigger the intent-based preloading. The default delay is 50 milliseconds, but you can change this by passing a `preloadDelay` prop to the `Link` component with the number of milliseconds you'd like to wait:

```tsx
const link = (
  <Link to="/blog/post/$postId" preload="intent" preloadDelay={100}>
    Blog Post
  </Link>
)
```

## `useNavigate`

> ⚠️ Because of the `Link` component's built-in affordances around `href`, cmd/ctrl + click-ability, and active/inactive capabilities, it's recommended to use the `Link` component instead of `useNavigate` for anything the user can interact with (e.g. links, buttons). However, there are some cases where `useNavigate` is necessary to handle side-effect navigations (e.g. a successful async action that results in a navigation).

The `useNavigate` hook returns a `navigate` function that can be called to imperatively navigate. It's a great way to navigate to a route from a side-effect (e.g. a successful async action). Here's an example:

```tsx
function Component() {
  const navigate = useNavigate({ from: '/posts/$postId' })

  const handleSubmit = async (e: FrameworkFormEvent) => {
    e.preventDefault()

    const response = await fetch('/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'My First Post' }),
    })

    const { id: postId } = await response.json()

    if (response.ok) {
      navigate({ to: '/posts/$postId', params: { postId } })
    }
  }
}
```

> 🧠 As shown above, you can pass the `from` option to specify the route to navigate from in the hook call. While this is also possible to pass in the resulting `navigate` function each time you call it, it's recommended to pass it here to reduce on potential error and also not type as much!

### `navigate` Options

The `navigate` function returned by `useNavigate` accepts the [`NavigateOptions` interface](#navigateoptions-interface)

## `Navigate` Component

Occasionally, you may find yourself needing to navigate immediately when a component mounts. Your first instinct might be to reach for `useNavigate` and an immediate side-effect (e.g. useEffect), but this is unnecessary. Instead, you can render the `Navigate` component to achieve the same result:

```tsx
function Component() {
  return <Navigate to="/posts/$postId" params={{ postId: 'my-first-post' }} />
}
```

Think of the `Navigate` component as a way to navigate to a route immediately when a component mounts. It's a great way to handle client-only redirects. It is _definitely not_ a substitute for handling server-aware redirects responsibly on the server.

## `router.navigate`

The `router.navigate` method is the same as the `navigate` function returned by `useNavigate` and accepts the same [`NavigateOptions` interface](#navigateoptions-interface). Unlike the `useNavigate` hook, it is available anywhere your `router` instance is available and is thus a great way to navigate imperatively from anywhere in your application, including outside of your framework.

## `useMatchRoute` and `<MatchRoute>`

The `useMatchRoute` hook and `<MatchRoute>` component are the same thing, but the hook is a bit more flexible. They both accept the standard navigation `ToOptions` interface either as options or props and return `true/false` if that route is currently matched. It also has a handy `pending` option that will return `true` if the route is currently pending (e.g. a route is currently transitioning to that route). This can be extremely useful for showing optimistic UI around where a user is navigating:

```tsx
function Component() {
  return (
    <div>
      <Link to="/users">
        Users
        <MatchRoute to="/users" pending>
          <Spinner />
        </MatchRoute>
      </Link>
    </div>
  )
}
```

The component version `<MatchRoute>` can also be used with a function as children to render something when the route is matched:

```tsx
function Component() {
  return (
    <div>
      <Link to="/users">
        Users
        <MatchRoute to="/users" pending>
          {(match) => {
            return <Spinner show={match} />
          }}
        </MatchRoute>
      </Link>
    </div>
  )
}
```

The hook version `useMatchRoute` returns a function that can be called programmatically to check if a route is matched:

```tsx
function Component() {
  const matchRoute = useMatchRoute()

  useEffect(() => {
    if (matchRoute({ to: '/users', pending: true })) {
      console.info('The /users route is matched and pending')
    }
  })

  return (
    <div>
      <Link to="/users">Users</Link>
    </div>
  )
}
```

---

Phew! That's a lot of navigating! That said, hopefully you're feeling pretty good about getting around your application now. Let's move on!

---
title: Router Events
---

TanStack Router exposes router lifecycle events through `router.subscribe`. This is useful for imperative side effects like analytics, resetting external state, or running DOM-dependent logic after navigation.

## Basic usage

`router.subscribe` takes an event name and a listener, then returns an unsubscribe function:

```tsx
const unsubscribe = router.subscribe('onResolved', (event) => {
  console.info('Navigation finished:', event.toLocation.href)
})

// Later, clean up the listener
unsubscribe()
```

## When to use it

`router.subscribe` is best for imperative integrations that need to observe navigation without driving rendering:

- Analytics and pageview tracking
- Resetting external caches or mutation state
- Logging navigation timing and transitions
- Running DOM-dependent logic after routes render

If you need reactive UI updates, prefer framework hooks like `useRouterState`, `useSearch`, and `useParams` instead of subscribing manually.

## Available events

TanStack Router emits these lifecycle events:

- `onBeforeNavigate` - right before a navigation begins
- `onBeforeLoad` - before route loading starts
- `onLoad` - after the next location has committed and route matches have loaded
- `onBeforeRouteMount` - after loading finishes, just before route components mount
- `onResolved` - after the navigation has fully resolved
- `onRendered` - after the route has rendered

For the full event payload types, see the [`RouterEvents` type](../api/router/RouterEventsType.md).

## Typical event flow

For a normal navigation, the events usually flow like this:

1. `onBeforeNavigate`
2. `onBeforeLoad`
3. `onLoad`
4. `onBeforeRouteMount`
5. `onResolved`
6. `onRendered`

You usually do not need every event. A good rule of thumb is:

- Use `onBeforeNavigate` or `onBeforeLoad` to observe navigation start
- Use `onResolved` for analytics and cleanup after navigation finishes
- Use `onRendered` for DOM-dependent work

## Event payload

Navigation events receive location change metadata describing what changed:

```tsx
const unsubscribe = router.subscribe('onBeforeNavigate', (event) => {
  console.info({
    from: event.fromLocation?.href,
    to: event.toLocation.href,
    pathChanged: event.pathChanged,
    hrefChanged: event.hrefChanged,
    hashChanged: event.hashChanged,
  })
})
```

A few useful details:

- `fromLocation` can be `undefined` on the initial load
- `pathChanged` tells you whether the pathname changed
- `hrefChanged` includes pathname, search, and hash changes
- `hashChanged` is useful for distinguishing hash-only navigations

## Common patterns

### Track pageviews

`onResolved` is a good default for analytics because it fires after navigation finishes:

```tsx
const unsubscribe = router.subscribe('onResolved', ({ toLocation }) => {
  analytics.track('page_view', {
    path: toLocation.pathname,
    href: toLocation.href,
  })
})
```

### Clear external mutation state

If you use a mutation library without keyed mutation state, clear it after navigation:

```tsx
const unsubscribe = router.subscribe('onResolved', ({ pathChanged }) => {
  if (pathChanged) {
    mutationCache.clear()
  }
})
```

### Run DOM-dependent logic

Use `onRendered` when your side effect depends on the new route content already being in the DOM:

```tsx
const unsubscribe = router.subscribe('onRendered', ({ toLocation }) => {
  focusPageHeading(toLocation.pathname)
})
```

## Unsubscribing in components

If you subscribe from a component or framework effect, always return the unsubscribe function from your cleanup so the listener is removed when the component unmounts.

## Related APIs

- [`Router` type](../api/router/RouterType.md)
- [`RouterEvents` type](../api/router/RouterEventsType.md)
- [Data Mutations](./data-mutations.md)

---
title: Path Params
---

Path params are used to match a single segment (the text until the next `/`) and provide its value back to you as a **named** variable. They are defined by using the `$` character prefix in the path, followed by the key variable to assign it to. The following are valid path param paths:

- `$postId`
- `$name`
- `$teamId`
- `about/$name`
- `team/$teamId`
- `blog/$postId`

Because path param routes only match to the next `/`, child routes can be created to continue expressing hierarchy:

Let's create a post route file that uses a path param to match the post ID:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.$postId.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId)
  },
})
```

# Solid

```tsx title="src/routes/posts.$postId.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId)
  },
})
```

<!-- ::end:framework -->

## Path Params can be used by child routes

Once a path param has been parsed, it is available to all child routes. This means that if we define a child route to our `postRoute`, we can use the `postId` variable from the URL in the child route's path!

## Path Params in Loaders

Path params are passed to the loader as a `params` object. The keys of this object are the names of the path params, and the values are the values that were parsed out of the actual URL path. For example, if we were to visit the `/blog/123` URL, the `params` object would be `{ postId: '123' }`:

```tsx title="src/routes/posts.$postId.tsx"
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId)
  },
})
```

The `params` object is also passed to the `beforeLoad` option:

```tsx title="src/routes/posts.$postId.tsx"
export const Route = createFileRoute('/posts/$postId')({
  beforeLoad: async ({ params }) => {
    // do something with params.postId
  },
})
```

## Path Params in Components

If we add a component to our `postRoute`, we can access the `postId` variable from the URL by using the route's `useParams` hook:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts.$postId.tsx"
export const Route = createFileRoute('/posts/$postId')({
  component: PostComponent,
})

function PostComponent() {
  const { postId } = Route.useParams()
  return <div>Post {postId}</div>
}
```

# Solid

```tsx title="src/routes/posts.$postId.tsx"
export const Route = createFileRoute('/posts/$postId')({
  component: PostComponent,
})

function PostComponent() {
  const params = Route.useParams()
  return <div>Post {params().postId}</div>
}
```

<!-- ::end:framework -->

> 🧠 Quick tip: If your component is code-split, you can use the [getRouteApi function](./code-splitting.md#manually-accessing-route-apis-in-other-files-with-the-getrouteapi-helper) to avoid having to import the `Route` configuration to get access to the typed `useParams()` hook.

## Path Params outside of Routes

You can also use the globally exported `useParams` hook to access any parsed path params from any component in your app. You'll need to pass the `strict: false` option to `useParams`, denoting that you want to access the params from an ambiguous location:

<!-- ::start:framework -->

# React

```tsx title="src/components/PostComponent.tsx"
function PostComponent() {
  const { postId } = useParams({ strict: false })
  return <div>Post {postId}</div>
}
```

# Solid

```tsx title="src/components/PostComponent.tsx"
function PostComponent() {
  const params = useParams({ strict: false })
  return <div>Post {params().postId}</div>
}
```

<!-- ::end:framework -->

## Prioritizing Parsed Path Param Routes

When multiple dynamic, optional, or wildcard routes can match the same URL, routes with `params.parse` are tried before equivalent routes without it. If multiple matching candidates use `params.parse`, you can use `params.priority` to control which candidate is tried first.

Higher `params.priority` values are tried first. The default priority is `0`, and if a higher-priority route's `params.parse` returns `false`, matching continues to the next candidate route.

```tsx title="src/routes/posts.$postId.tsx"
export const Route = createFileRoute('/posts/$postId')({
  params: {
    priority: 10,
    parse: ({ postId }) => {
      if (!/^\d+$/.test(postId)) return false
      return { postId: Number(postId) }
    },
    stringify: ({ postId }) => ({ postId: String(postId) }),
  },
})
```

With a fallback `/posts/$slug` route, `/posts/123` can match the parsed numeric route first, while `/posts/hello-world` can fall through to the slug route when `params.parse` returns `false`.

`params.priority` only affects competing candidates that use `params.parse`. It does not override normal route specificity, so static routes still match before dynamic, optional, or wildcard routes.

## Navigating with Path Params

When navigating to a route with path params, TypeScript will require you to pass the params either as an object or as a function that returns an object of params.

Let's see what an object style looks like:

```tsx
function Component() {
  return (
    <Link to="/blog/$postId" params={{ postId: '123' }}>
      Post 123
    </Link>
  )
}
```

And here's what a function style looks like:

```tsx
function Component() {
  return (
    <Link to="/blog/$postId" params={(prev) => ({ ...prev, postId: '123' })}>
      Post 123
    </Link>
  )
}
```

Notice that the function style is useful when you need to persist params that are already in the URL for other routes. This is because the function style will receive the current params as an argument, allowing you to modify them as needed and return the final params object.

## Prefixes and Suffixes for Path Params

You can also use **prefixes** and **suffixes** with path params to create more complex routing patterns. This allows you to match specific URL structures while still capturing the dynamic segments.

When using either prefixes or suffixes, you can define them by wrapping the path param in curly braces `{}` and placing the prefix or suffix before or after the variable name.

### Defining Prefixes

Prefixes are defined by placing the prefix text outside the curly braces before the variable name. For example, if you want to match a URL that starts with `post-` followed by a post ID, you can define it like this:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts/post-{$postId}.tsx"
export const Route = createFileRoute('/posts/post-{$postId}')({
  component: PostComponent,
})

function PostComponent() {
  const { postId } = Route.useParams()
  // postId will be the value after 'post-'
  return <div>Post ID: {postId}</div>
}
```

# Solid

```tsx title="src/routes/posts/post-{$postId}.tsx"
export const Route = createFileRoute('/posts/post-{$postId}')({
  component: PostComponent,
})

function PostComponent() {
  const params = Route.useParams()
  // postId will be the value after 'post-'
  return <div>Post ID: {params().postId}</div>
}
```

<!-- ::end:framework -->

You can even combines prefixes with wildcard routes to create more complex patterns:

<!-- ::start:framework -->

# React

```tsx title="src/routes/on-disk/storage-{$postId}/$.tsx"
export const Route = createFileRoute('/on-disk/storage-{$postId}/$')({
  component: StorageComponent,
})

function StorageComponent() {
  const { _splat } = Route.useParams()
  // _splat, will be value after 'storage-'
  // i.e. my-drive/documents/foo.txt
  return <div>Storage Location: /{_splat}</div>
}
```

# Solid

```tsx title="src/routes/on-disk/storage-{$postId}/$.tsx"
export const Route = createFileRoute('/on-disk/storage-{$postId}/$')({
  component: StorageComponent,
})

function StorageComponent() {
  const params = Route.useParams()
  // _splat, will be value after 'storage-'
  // i.e. my-drive/documents/foo.txt
  return <div>Storage Location: /{params()._splat}</div>
}
```

<!-- ::end:framework -->

### Defining Suffixes

Suffixes are defined by placing the suffix text outside the curly braces after the variable name. For example, if you want to match a URL a filename that ends with `txt`, you can define it like this:

<!-- ::start:framework -->

# React

```tsx title="src/routes/files/{$fileName}[.]txt.tsx"
export const Route = createFileRoute('/files/{$fileName}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const { fileName } = Route.useParams()
  // fileName will be the value before 'txt'
  return <div>File Name: {fileName}</div>
}
```

# Solid

```tsx title="src/routes/files/{$fileName}[.]txt.tsx"
export const Route = createFileRoute('/files/{$fileName}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const params = Route.useParams()
  // fileName will be the value before 'txt'
  return <div>File Name: {params().fileName}</div>
}
```

<!-- ::end:framework -->

You can also combine suffixes with wildcards for more complex routing patterns:

<!-- ::start:framework -->

# React

```tsx title="src/routes/files/{$}[.]txt.tsx"
export const Route = createFileRoute('/files/{$}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const { _splat } = Route.useParams()
  // _splat will be the value before '.txt'
  return <div>File Splat: {_splat}</div>
}
```

# Solid

```tsx title="src/routes/files/{$}[.]txt.tsx"
export const Route = createFileRoute('/files/{$}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const params = Route.useParams()
  // _splat will be the value before '.txt'
  return <div>File Splat: {params()._splat}</div>
}
```

<!-- ::end:framework -->

### Combining Prefixes and Suffixes

You can combine both prefixes and suffixes to create very specific routing patterns. For example, if you want to match a URL that starts with `user-` and ends with `.json`, you can define it like this:

<!-- ::start:framework -->

# React

```tsx title="src/routes/users/user-{$userId}[.]json.tsx"
export const Route = createFileRoute('/users/user-{$userId}.json')({
  component: UserComponent,
})

function UserComponent() {
  const { userId } = Route.useParams()
  // userId will be the value between 'user-' and '.json'
  return <div>User ID: {userId}</div>
}
```

# Solid

```tsx title="src/routes/users/user-{$userId}[.]json.tsx"
export const Route = createFileRoute('/users/user-{$userId}.json')({
  component: UserComponent,
})

function UserComponent() {
  const params = Route.useParams()
  // userId will be the value between 'user-' and '.json'
  return <div>User ID: {params().userId}</div>
}
```

<!-- ::end:framework -->

Similar to the previous examples, you can also use wildcards with prefixes and suffixes. Go wild!

## Optional Path Parameters

Optional path parameters allow you to define route segments that may or may not be present in the URL. They use the `{-$paramName}` syntax and provide flexible routing patterns where certain parameters are optional.

### Defining Optional Parameters

Optional path parameters are defined using curly braces with a dash prefix: `{-$paramName}`

```tsx
// Single optional parameter
// src/routes/posts/{-$category}.tsx
export const Route = createFileRoute('/posts/{-$category}')({
  component: PostsComponent,
})

// Multiple optional parameters
// src/routes/posts/{-$category}/{-$slug}.tsx
export const Route = createFileRoute('/posts/{-$category}/{-$slug}')({
  component: PostComponent,
})

// Mixed required and optional parameters
// src/routes/users/$id/{-$tab}.tsx
export const Route = createFileRoute('/users/$id/{-$tab}')({
  component: UserComponent,
})
```

### How Optional Parameters Work

Optional parameters create flexible URL patterns:

- `/posts/{-$category}` matches both `/posts` and `/posts/tech`
- `/posts/{-$category}/{-$slug}` matches `/posts`, `/posts/tech`, and `/posts/tech/hello-world`
- `/users/$id/{-$tab}` matches `/users/123` and `/users/123/settings`

When an optional parameter is not present in the URL, its value will be `undefined` in your route handlers and components.

### Accessing Optional Parameters

Optional parameters work exactly like regular parameters in your components, but their values may be `undefined`:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts/{-$category}.tsx"
function PostsComponent() {
  const { category } = Route.useParams()

  return <div>{category ? `Posts in ${category}` : 'All Posts'}</div>
}
```

# Solid

```tsx title="src/routes/posts/{-$category}.tsx"
function PostsComponent() {
  const params = Route.useParams()

  return (
    <div>
      {params().category ? `Posts in ${params().category}` : 'All Posts'}
    </div>
  )
}
```

<!-- ::end:framework -->

### Optional Parameters in Loaders

Optional parameters are available in loaders and may be `undefined`:

```tsx
export const Route = createFileRoute('/posts/{-$category}')({
  loader: async ({ params }) => {
    // params.category might be undefined
    return fetchPosts({ category: params.category })
  },
})
```

### Optional Parameters in beforeLoad

Optional parameters work in `beforeLoad` handlers as well:

```tsx
export const Route = createFileRoute('/posts/{-$category}')({
  beforeLoad: async ({ params }) => {
    if (params.category) {
      // Validate category exists
      await validateCategory(params.category)
    }
  },
})
```

### Advanced Optional Parameter Patterns

#### With Prefix and Suffix

Optional parameters support prefix and suffix patterns:

<!-- ::start:framework -->

# React

```tsx title="src/routes/files/prefix{-$name}[.]txt.tsx"
// Route: /files/prefix{-$name}.txt
// Matches: /files/prefix.txt and /files/prefixdocument.txt
export const Route = createFileRoute('/files/prefix{-$name}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const { name } = Route.useParams()
  return <div>File: {name || 'default'}</div>
}
```

# Solid

```tsx title="src/routes/files/prefix{-$name}[.]txt.tsx"
// Route: /files/prefix{-$name}.txt
// Matches: /files/prefix.txt and /files/prefixdocument.txt
export const Route = createFileRoute('/files/prefix{-$name}.txt')({
  component: FileComponent,
})

function FileComponent() {
  const params = Route.useParams()
  return <div>File: {params().name || 'default'}</div>
}
```

<!-- ::end:framework -->

#### All Optional Parameters

You can create routes where all parameters are optional:

<!-- ::start:framework -->

# React

```tsx title="src/routes/{-$year}/{-$month}/{-$day}.tsx"
// Route: /{-$year}/{-$month}/{-$day}
// Matches: /, /2023, /2023/12, /2023/12/25
export const Route = createFileRoute('/{-$year}/{-$month}/{-$day}')({
  component: DateComponent,
})

function DateComponent() {
  const { year, month, day } = Route.useParams()

  if (!year) return <div>Select a year</div>
  if (!month) return <div>Year: {year}</div>
  if (!day)
    return (
      <div>
        Month: {year}/{month}
      </div>
    )

  return (
    <div>
      Date: {year}/{month}/{day}
    </div>
  )
}
```

# Solid

```tsx title="src/routes/{-$year}/{-$month}/{-$day}.tsx"
// Route: /{-$year}/{-$month}/{-$day}
// Matches: /, /2023, /2023/12, /2023/12/25
export const Route = createFileRoute('/{-$year}/{-$month}/{-$day}')({
  component: DateComponent,
})

function DateComponent() {
  const params = Route.useParams()

  if (!params().year) return <div>Select a year</div>
  if (!params().month) return <div>Year: {params().year}</div>
  if (!params().day)
    return (
      <div>
        Month: {params().year}/{params().month}
      </div>
    )

  return (
    <div>
      Date: {params().year}/{params().month}/{params().day}
    </div>
  )
}
```

<!-- ::end:framework -->

#### Optional Parameters with Wildcards

Optional parameters can be combined with wildcards for complex routing patterns:

<!-- ::start:framework -->

# React

```tsx title="src/routes/docs/{-$version}/$.tsx"
// Route: /docs/{-$version}/$
// Matches: /docs/extra/path, /docs/v2/extra/path
export const Route = createFileRoute('/docs/{-$version}/$')({
  component: DocsComponent,
})

function DocsComponent() {
  const { version } = Route.useParams()
  const { _splat } = Route.useParams()

  return (
    <div>
      Version: {version || 'latest'}
      Path: {_splat}
    </div>
  )
}
```

# Solid

```tsx title="src/routes/docs/{-$version}/$.tsx"
// Route: /docs/{-$version}/$
// Matches: /docs/extra/path, /docs/v2/extra/path
export const Route = createFileRoute('/docs/{-$version}/$')({
  component: DocsComponent,
})

function DocsComponent() {
  const params = Route.useParams()

  return (
    <div>
      Version: {params().version || 'latest'}
      Path: {params()._splat}
    </div>
  )
}
```

<!-- ::end:framework -->

### Navigating with Optional Parameters

When navigating to routes with optional parameters, you have fine-grained control over which parameters to include:

```tsx
function Navigation() {
  return (
    <div>
      {/* Navigate with optional parameter */}
      <Link to="/posts/{-$category}" params={{ category: 'tech' }}>
        Tech Posts
      </Link>

      {/* Navigate without optional parameter */}
      <Link to="/posts/{-$category}" params={{ category: undefined }}>
        All Posts
      </Link>

      {/* Navigate with multiple optional parameters */}
      <Link
        to="/posts/{-$category}/{-$slug}"
        params={{ category: 'tech', slug: 'react-tips' }}
      >
        Specific Post
      </Link>
    </div>
  )
}
```

### Type Safety with Optional Parameters

TypeScript provides full type safety for optional parameters:

<!-- ::start:framework -->

# React

```tsx title="src/routes/posts/{-$category}.tsx"
function PostsComponent() {
  // TypeScript knows category might be undefined
  const { category } = Route.useParams() // category: string | undefined

  // Safe navigation
  const categoryUpper = category?.toUpperCase()

  return <div>{categoryUpper || 'All Categories'}</div>
}

// Navigation is type-safe and flexible
<Link
  to="/posts/{-$category}"
  params={{ category: 'tech' }} // ✅ Valid - string
>
  Tech Posts
</Link>

<Link
  to="/posts/{-$category}"
  params={{ category: 123 }} // ✅ Valid - number (auto-stringified)
>
  Category 123
</Link>
```

# Solid

```tsx title="src/routes/posts/{-$category}.tsx"
function PostsComponent() {
  // TypeScript knows category might be undefined
  const params = Route.useParams() // category: string | undefined

  // Safe navigation
  const categoryUpper = params().category?.toUpperCase()

  return <div>{categoryUpper || 'All Categories'}</div>
}

// Navigation is type-safe and flexible
<Link
  to="/posts/{-$category}"
  params={{ category: 'tech' }} // ✅ Valid - string
>
  Tech Posts
</Link>

<Link
  to="/posts/{-$category}"
  params={{ category: 123 }} // ✅ Valid - number (auto-stringified)
>
  Category 123
</Link>
```

<!-- ::end:framework -->

## Internationalization (i18n) with Optional Path Parameters

Optional path parameters are excellent for implementing internationalization (i18n) routing patterns. You can use prefix patterns to handle multiple languages while maintaining clean, SEO-friendly URLs.

### Prefix-based i18n

Use optional language prefixes to support URLs like `/en/about`, `/fr/about`, or just `/about` (default language):

<!-- ::start:framework -->

# React

```tsx title="src/routes/{-$locale}/about.tsx"
// Route: /{-$locale}/about
export const Route = createFileRoute('/{-$locale}/about')({
  component: AboutComponent,
})

function AboutComponent() {
  const { locale } = Route.useParams()
  const currentLocale = locale || 'en' // Default to English

  const content = {
    en: { title: 'About Us', description: 'Learn more about our company.' },
    fr: {
      title: 'À Propos',
      description: 'En savoir plus sur notre entreprise.',
    },
    es: {
      title: 'Acerca de',
      description: 'Conoce más sobre nuestra empresa.',
    },
  }

  return (
    <div>
      <h1>{content[currentLocale]?.title}</h1>
      <p>{content[currentLocale]?.description}</p>
    </div>
  )
}
```

# Solid

```tsx title="src/routes/{-$locale}/about.tsx"
// Route: /{-$locale}/about
export const Route = createFileRoute('/{-$locale}/about')({
  component: AboutComponent,
})

function AboutComponent() {
  const params = Route.useParams()
  const currentLocale = params().locale || 'en' // Default to English

  const content = {
    en: { title: 'About Us', description: 'Learn more about our company.' },
    fr: {
      title: 'À Propos',
      description: 'En savoir plus sur notre entreprise.',
    },
    es: {
      title: 'Acerca de',
      description: 'Conoce más sobre nuestra empresa.',
    },
  }

  return (
    <div>
      <h1>{content[currentLocale]?.title}</h1>
      <p>{content[currentLocale]?.description}</p>
    </div>
  )
}
```

<!-- ::end:framework -->

This pattern matches:

- `/about` (default locale)
- `/en/about` (explicit English)
- `/fr/about` (French)
- `/es/about` (Spanish)

### Complex i18n Patterns

Combine optional parameters for more sophisticated i18n routing:

<!-- ::start:framework -->

# React

```tsx title="src/routes/{-$locale}/blog/{-$category}/$slug.tsx"
// Route: /{-$locale}/blog/{-$category}/$slug
export const Route = createFileRoute('/{-$locale}/blog/{-$category}/$slug')({
  beforeLoad: async ({ params }) => {
    const locale = params.locale || 'en'
    const category = params.category

    // Validate locale and category
    const validLocales = ['en', 'fr', 'es', 'de']
    if (locale && !validLocales.includes(locale)) {
      throw new Error('Invalid locale')
    }

    return { locale, category }
  },
  loader: async ({ params, context }) => {
    const { locale } = context
    const { slug, category } = params

    return fetchBlogPost({ slug, category, locale })
  },
  component: BlogPostComponent,
})

function BlogPostComponent() {
  const { locale, category, slug } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <article>
      <h1>{data.title}</h1>
      <p>
        Category: {category || 'All'} | Language: {locale || 'en'}
      </p>
      <div>{data.content}</div>
    </article>
  )
}
```

# Solid

```tsx title="src/routes/{-$locale}/blog/{-$category}/$slug.tsx"
// Route: /{-$locale}/blog/{-$category}/$slug
export const Route = createFileRoute('/{-$locale}/blog/{-$category}/$slug')({
  beforeLoad: async ({ params }) => {
    const locale = params.locale || 'en'
    const category = params.category

    // Validate locale and category
    const validLocales = ['en', 'fr', 'es', 'de']
    if (locale && !validLocales.includes(locale)) {
      throw new Error('Invalid locale')
    }

    return { locale, category }
  },
  loader: async ({ params, context }) => {
    const { locale } = context
    const { slug, category } = params

    return fetchBlogPost({ slug, category, locale })
  },
  component: BlogPostComponent,
})

function BlogPostComponent() {
  const params = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <article>
      <h1>{data.title}</h1>
      <p>
        Category: {params().category || 'All'} | Language:{' '}
        {params().locale || 'en'}
      </p>
      <div>{data.content}</div>
    </article>
  )
}
```

<!-- ::end:framework -->

This supports URLs like:

- `/blog/tech/my-post` (default locale, tech category)
- `/fr/blog/my-post` (French, no category)
- `/en/blog/tech/my-post` (explicit English, tech category)
- `/es/blog/tecnologia/mi-post` (Spanish, Spanish category)

### Language Navigation

Create language switchers using optional i18n parameters with function-style params:

<!-- ::start:framework -->

# React

```tsx title="src/components/LanguageSwitcher.tsx"
function LanguageSwitcher() {
  const currentParams = useParams({ strict: false })

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ]

  return (
    <div className="language-switcher">
      {languages.map(({ code, name }) => (
        <Link
          key={code}
          to="/{-$locale}/blog/{-$category}/$slug"
          params={(prev) => ({
            ...prev,
            locale: code === 'en' ? undefined : code, // Remove 'en' for clean URLs
          })}
          className={currentParams.locale === code ? 'active' : ''}
        >
          {name}
        </Link>
      ))}
    </div>
  )
}
```

# Solid

```tsx title="src/components/LanguageSwitcher.tsx"
function LanguageSwitcher() {
  const currentParams = useParams({ strict: false })

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ]

  return (
    <div class="language-switcher">
      {languages.map(({ code, name }) => (
        <Link
          to="/{-$locale}/blog/{-$category}/$slug"
          params={(prev) => ({
            ...prev,
            locale: code === 'en' ? undefined : code, // Remove 'en' for clean URLs
          })}
          class={currentParams().locale === code ? 'active' : ''}
        >
          {name}
        </Link>
      ))}
    </div>
  )
}
```

<!-- ::end:framework -->

You can also create more sophisticated language switching logic:

<!-- ::start:framework -->

# React

```tsx
function AdvancedLanguageSwitcher() {
  const currentParams = useParams({ strict: false })

  const handleLanguageChange = (newLocale: string) => {
    return (prev: any) => {
      // Preserve all existing params but update locale
      const updatedParams = { ...prev }

      if (newLocale === 'en') {
        // Remove locale for clean English URLs
        delete updatedParams.locale
      } else {
        updatedParams.locale = newLocale
      }

      return updatedParams
    }
  }

  return (
    <div className="language-switcher">
      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('fr')}
      >
        Français
      </Link>

      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('es')}
      >
        Español
      </Link>

      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('en')}
      >
        English
      </Link>
    </div>
  )
}
```

# Solid

```tsx
function AdvancedLanguageSwitcher() {
  const currentParams = useParams({ strict: false })

  const handleLanguageChange = (newLocale: string) => {
    return (prev: any) => {
      // Preserve all existing params but update locale
      const updatedParams = { ...prev }

      if (newLocale === 'en') {
        // Remove locale for clean English URLs
        delete updatedParams.locale
      } else {
        updatedParams.locale = newLocale
      }

      return updatedParams
    }
  }

  return (
    <div class="language-switcher">
      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('fr')}
      >
        Français
      </Link>

      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('es')}
      >
        Español
      </Link>

      <Link
        to="/{-$locale}/blog/{-$category}/$slug"
        params={handleLanguageChange('en')}
      >
        English
      </Link>
    </div>
  )
}
```

<!-- ::end:framework -->

### Advanced i18n with Optional Parameters

Organize i18n routes using optional parameters for flexible locale handling:

<!-- ::start:framework -->

# React

```tsx
// Route structure:
// routes/
//   {-$locale}/
//     index.tsx        // /, /en, /fr
//     about.tsx        // /about, /en/about, /fr/about
//     blog/
//       index.tsx      // /blog, /en/blog, /fr/blog
//       $slug.tsx      // /blog/post, /en/blog/post, /fr/blog/post

// routes/{-$locale}/index.tsx
export const Route = createFileRoute('/{-$locale}/')({
  component: HomeComponent,
})

function HomeComponent() {
  const { locale } = Route.useParams()
  const isRTL = ['ar', 'he', 'fa'].includes(locale || '')

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>Welcome ({locale || 'en'})</h1>
      {/* Localized content */}
    </div>
  )
}

// routes/{-$locale}/about.tsx
export const Route = createFileRoute('/{-$locale}/about')({
  component: AboutComponent,
})
```

# Solid

```tsx
// Route structure:
// routes/
//   {-$locale}/
//     index.tsx        // /, /en, /fr
//     about.tsx        // /about, /en/about, /fr/about
//     blog/
//       index.tsx      // /blog, /en/blog, /fr/blog
//       $slug.tsx      // /blog/post, /en/blog/post, /fr/blog/post

// routes/{-$locale}/index.tsx
export const Route = createFileRoute('/{-$locale}/')({
  component: HomeComponent,
})

function HomeComponent() {
  const params = Route.useParams()
  const isRTL = ['ar', 'he', 'fa'].includes(params().locale || '')

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>Welcome ({params().locale || 'en'})</h1>
      {/* Localized content */}
    </div>
  )
}

// routes/{-$locale}/about.tsx
export const Route = createFileRoute('/{-$locale}/about')({
  component: AboutComponent,
})
```

<!-- ::end:framework -->

### SEO and Canonical URLs

Handle SEO for i18n routes properly:

<!-- ::start:framework -->

# React

```tsx title="src/routes/{-$locale}/products/$id.tsx"
export const Route = createFileRoute('/{-$locale}/products/$id')({
  component: ProductComponent,
  head: ({ params, loaderData }) => {
    const locale = params.locale || 'en'
    const product = loaderData

    return {
      title: product.title[locale] || product.title.en,
      meta: [
        {
          name: 'description',
          content: product.description[locale] || product.description.en,
        },
        {
          property: 'og:locale',
          content: locale,
        },
      ],
      links: [
        // Canonical URL (always use default locale format)
        {
          rel: 'canonical',
          href: `https://example.com/products/${params.id}`,
        },
        // Alternate language versions
        {
          rel: 'alternate',
          hreflang: 'en',
          href: `https://example.com/products/${params.id}`,
        },
        {
          rel: 'alternate',
          hreflang: 'fr',
          href: `https://example.com/fr/products/${params.id}`,
        },
        {
          rel: 'alternate',
          hreflang: 'es',
          href: `https://example.com/es/products/${params.id}`,
        },
      ],
    }
  },
})
```

# Solid

```tsx title="src/routes/{-$locale}/products/$id.tsx"
export const Route = createFileRoute('/{-$locale}/products/$id')({
  component: ProductComponent,
  head: ({ params, loaderData }) => {
    const locale = params.locale || 'en'
    const product = loaderData

    return {
      title: product.title[locale] || product.title.en,
      meta: [
        {
          name: 'description',
          content: product.description[locale] || product.description.en,
        },
        {
          property: 'og:locale',
          content: locale,
        },
      ],
      links: [
        // Canonical URL (always use default locale format)
        {
          rel: 'canonical',
          href: `https://example.com/products/${params.id}`,
        },
        // Alternate language versions
        {
          rel: 'alternate',
          hreflang: 'en',
          href: `https://example.com/products/${params.id}`,
        },
        {
          rel: 'alternate',
          hreflang: 'fr',
          href: `https://example.com/fr/products/${params.id}`,
        },
        {
          rel: 'alternate',
          hreflang: 'es',
          href: `https://example.com/es/products/${params.id}`,
        },
      ],
    }
  },
})
```

<!-- ::end:framework -->

### Type Safety for i18n

Ensure type safety for your i18n implementations:

<!-- ::start:framework -->

# React

```tsx title="src/routes/{-$locale}/shop/{-$category}.tsx"
// Define supported locales
type Locale = 'en' | 'fr' | 'es' | 'de'

// Type-safe locale validation
function validateLocale(locale: string | undefined): locale is Locale {
  return ['en', 'fr', 'es', 'de'].includes(locale as Locale)
}

export const Route = createFileRoute('/{-$locale}/shop/{-$category}')({
  beforeLoad: async ({ params }) => {
    const { locale } = params

    // Type-safe locale validation
    if (locale && !validateLocale(locale)) {
      throw redirect({
        to: '/shop/{-$category}',
        params: { category: params.category },
      })
    }

    return {
      locale: (locale as Locale) || 'en',
      isDefaultLocale: !locale || locale === 'en',
    }
  },
  component: ShopComponent,
})

function ShopComponent() {
  const { locale, category } = Route.useParams()
  const { isDefaultLocale } = Route.useRouteContext()

  // TypeScript knows locale is Locale | undefined
  // and we have validated it in beforeLoad

  return (
    <div>
      <h1>Shop {category ? `- ${category}` : ''}</h1>
      <p>Language: {locale || 'en'}</p>
      {!isDefaultLocale && (
        <Link to="/shop/{-$category}" params={{ category }}>
          View in English
        </Link>
      )}
    </div>
  )
}
```

# Solid

```tsx title="src/routes/{-$locale}/shop/{-$category}.tsx"
// Define supported locales
type Locale = 'en' | 'fr' | 'es' | 'de'

// Type-safe locale validation
function validateLocale(locale: string | undefined): locale is Locale {
  return ['en', 'fr', 'es', 'de'].includes(locale as Locale)
}

export const Route = createFileRoute('/{-$locale}/shop/{-$category}')({
  beforeLoad: async ({ params }) => {
    const { locale } = params

    // Type-safe locale validation
    if (locale && !validateLocale(locale)) {
      throw redirect({
        to: '/shop/{-$category}',
        params: { category: params.category },
      })
    }

    return {
      locale: (locale as Locale) || 'en',
      isDefaultLocale: !locale || locale === 'en',
    }
  },
  component: ShopComponent,
})

function ShopComponent() {
  const params = Route.useParams()
  const routeContext = Route.useRouteContext()

  // TypeScript knows locale is Locale | undefined
  // and we have validated it in beforeLoad

  return (
    <div>
      <h1>Shop {params().category ? `- ${params().category}` : ''}</h1>
      <p>Language: {params().locale || 'en'}</p>
      {!routeContext().isDefaultLocale && (
        <Link to="/shop/{-$category}" params={{ category: params().category }}>
          View in English
        </Link>
      )}
    </div>
  )
}
```

<!-- ::end:framework -->

Optional path parameters provide a powerful and flexible foundation for implementing internationalization in your TanStack Router applications. Whether you prefer prefix-based or combined approaches, you can create clean, SEO-friendly URLs while maintaining excellent developer experience and type safety.

## Allowed Characters

By default, path params are escaped with `encodeURIComponent`. If you want to allow other valid URI characters (e.g. `@` or `+`), you can specify that in your [RouterOptions](../api/router/RouterOptionsType.md#pathparamsallowedcharacters-property).

Example usage:

```tsx
const router = createRouter({
  // ...
  pathParamsAllowedCharacters: ['@'],
})
```

The following is the list of accepted allowed characters:

- `;`
- `:`
- `@`
- `&`
- `=`
- `+`
- `$`
- `,`

---
title: Search Params
---

Similar to how TanStack Query made handling server-state in your React and Solid applications a breeze, TanStack Router aims to unlock the power of URL search params in your applications.

> 🧠 If you are on a really old browser, like IE11, you may need to use a polyfill for `URLSearchParams`.

## Why not just use `URLSearchParams`?

We get it, you've been hearing a lot of "use the platform" lately and for the most part, we agree. However, we also believe it's important to recognize where the platform falls short for more advanced use-cases and we believe `URLSearchParams` is one of these circumstances.

Traditional Search Param APIs usually assume a few things:

- Search params are always strings
- They are _mostly_ flat
- Serializing and deserializing using `URLSearchParams` is good enough (Spoiler alert: it's not.)
- Search params modifications are tightly coupled with the URL's pathname and must be updated together, even if the pathname is not changing.

Reality is very different from these assumptions though.

- Search params represent application state, so inevitably, we will expect them to have the same DX associated with other state managers. This means having the capability of distinguishing between primitive value types and efficiently storing and manipulating complex data structures like nested arrays and objects.
- There are many ways to serialize and deserialize state with different tradeoffs. You should be able to choose the best one for your application or at the very least get a better default than `URLSearchParams`.
- Immutability & Structural Sharing. Every time you stringify and parse url search params, referential integrity and object identity is lost because each new parse creates a brand new data structure with a unique memory reference. If not properly managed over its lifetime, this constant serialization and parsing can result in unexpected and undesirable performance issues, especially in frameworks like React that choose to track reactivity via immutability or in Solid that normally relies on reconciliation to detect changes from deserialized data sources.
- Search params, while an important part of the URL, do frequently change independently of the URL's pathname. For example, a user may want to change the page number of a paginated list without touching the URL's pathname.

## Search Params, the "OG" State Manager

You've probably seen search params like `?page=3` or `?filter-name=tanner` in the URL. There is no question that this is truly **a form of global state** living inside of the URL. It's valuable to store specific pieces of state in the URL because:

- Users should be able to:
  - Cmd/Ctrl + Click to open a link in a new tab and reliably see the state they expected
  - Bookmark and share links from your application with others with assurances that they will see exactly the state as when the link was copied.
  - Refresh your app or navigate back and forth between pages without losing their state
- Developers should be able to easily:
  - Add, remove or modify state in the URL with the same great DX as other state managers
  - Easily validate search params coming from the URL in a format and type that is safe for their application to consume
  - Read and write to search params without having to worry about the underlying serialization format

## JSON-first Search Params

To achieve the above, the first step built in to TanStack Router is a powerful search param parser that automatically converts the search string of your URL to structured JSON. This means that you can store any JSON-serializable data structure in your search params and it will be parsed and serialized as JSON. This is a huge improvement over `URLSearchParams` which has limited support for array-like structures and nested data.

For example, navigating to the following route:

```tsx
const link = (
  <Link
    to="/shop"
    search={{
      pageIndex: 3,
      includeCategories: ['electronics', 'gifts'],
      sortBy: 'price',
      desc: true,
    }}
  />
)
```

Will result in the following URL:

```
/shop?pageIndex=3&includeCategories=%5B%22electronics%22%2C%22gifts%22%5D&sortBy=price&desc=true
```

When this URL is parsed, the search params will be accurately converted back to the following JSON:

```json
{
  "pageIndex": 3,
  "includeCategories": ["electronics", "gifts"],
  "sortBy": "price",
  "desc": true
}
```

If you noticed, there are a few things going on here:

- The first level of the search params is flat and string based, just like `URLSearchParams`.
- First level values that are not strings are accurately preserved as actual numbers and booleans.
- Nested data structures are automatically converted to URL-safe JSON strings

> 🧠 It's common for other tools to assume that search params are always flat and string-based which is why we've chosen to keep things URLSearchParam compliant at the first level. This ultimately means that even though TanStack Router is managing your nested search params as JSON, other tools will still be able to write to the URL and read first-level params normally.

## Validating and Typing Search Params

Despite TanStack Router being able to parse search params into reliable JSON, they ultimately still came from **a user-facing raw-text input**. Similar to other serialization boundaries, this means that before you consume search params, they should be validated into a format that your application can trust and rely on.

### Enter Validation + TypeScript!

TanStack Router provides convenient APIs for validating and typing search params. This all starts with the `Route`'s `validateSearch` option:

```tsx title="src/routes/shop/products.tsx"
type ProductSearchSortOptions = 'newest' | 'oldest' | 'price'

type ProductSearch = {
  page: number
  filter: string
  sort: ProductSearchSortOptions
}

export const Route = createFileRoute('/shop/products')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => {
    // validate and parse the search params into a typed state
    return {
      page: Number(search?.page ?? 1),
      filter: (search.filter as string) || '',
      sort: (search.sort as ProductSearchSortOptions) || 'newest',
    }
  },
})
```

In the above example, we're validating the search params of the `Route` and returning a typed `ProductSearch` object. This typed object is then made available to this route's other options **and any child routes, too!**

### Validating Search Params

The `validateSearch` option is a function that is provided the JSON parsed (but non-validated) search params as a `Record<string, unknown>` and returns a typed object of your choice. It's usually best to provide sensible fallbacks for malformed or unexpected search params so your users' experience stays non-interrupted.

Here's an example:

```tsx title="src/routes/shop/products.tsx"
type ProductSearchSortOptions = 'newest' | 'oldest' | 'price'

type ProductSearch = {
  page: number
  filter: string
  sort: ProductSearchSortOptions
}

export const Route = createFileRoute('/shop/products')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => {
    // validate and parse the search params into a typed state
    return {
      page: Number(search?.page ?? 1),
      filter: (search.filter as string) || '',
      sort: (search.sort as ProductSearchSortOptions) || 'newest',
    }
  },
})
```

Here's an example using the [Zod](https://zod.dev/) library (but feel free to use any validation library you want) to both validate and type the search params in a single step:

```tsx title="src/routes/shop/products.tsx"
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().catch(1),
  filter: z.string().catch(''),
  sort: z.enum(['newest', 'oldest', 'price']).catch('newest'),
})

type ProductSearch = z.infer<typeof productSearchSchema>

export const Route = createFileRoute('/shop/products')({
  validateSearch: (search) => productSearchSchema.parse(search),
})
```

Because `validateSearch` also accepts an object with the `parse` property, this can be shortened to:

```tsx
validateSearch: productSearchSchema
```

In the above example, we used Zod's `.catch()` modifier instead of `.default()` to avoid showing an error to the user because we firmly believe that if a search parameter is malformed, you probably don't want to halt the user's experience through the app to show a big fat error message. That said, there may be times that you **do want to show an error message**. In that case, you can use `.default()` instead of `.catch()`.

The underlying mechanics why this works relies on the `validateSearch` function throwing an error. If an error is thrown, the route's `onError` option will be triggered (and `error.routerCode` will be set to `VALIDATE_SEARCH` and the `errorComponent` will be rendered instead of the route's `component` where you can handle the search param error however you'd like.

#### Adapters

When using a library like [Zod](https://zod.dev/) to validate search params you might want to `transform` search params before committing the search params to the URL. A common `zod` `transform` is `default` for example.

```tsx
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().default(1),
  filter: z.string().default(''),
  sort: z.enum(['newest', 'oldest', 'price']).default('newest'),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

It might be surprising that when you try to navigate to this route, `search` is required. The following `Link` will type error as `search` is missing.

```tsx
<Link to="/shop/products" />
```

For validation libraries we recommend using adapters which infer the correct `input` and `output` types.

### Zod

An adapter is provided for [Zod](https://zod.dev/) which will pipe through the correct `input` type and `output` type.

For Zod v3:

```tsx
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().default(1),
  filter: z.string().default(''),
  sort: z.enum(['newest', 'oldest', 'price']).default('newest'),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: zodValidator(productSearchSchema),
})
```

With Zod v4, you should directly use the schema in `validateSearch`:

```tsx
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().default(1),
  filter: z.string().default(''),
  sort: z.enum(['newest', 'oldest', 'price']).default('newest'),
})

export const Route = createFileRoute('/shop/products/')({
  // With Zod v4, we can use the schema without the adapter
  validateSearch: productSearchSchema,
})
```

The important part here is the following use of `Link` no longer requires `search` params:

```tsx
<Link to="/shop/products" />
```

In Zod v3, the use of `catch` here overrides the types and makes `page`, `filter` and `sort` `unknown` causing type loss. We have handled this case by providing a `fallback` generic function which retains the types but provides a `fallback` value when validation fails:

```tsx
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), '').default(''),
  sort: fallback(z.enum(['newest', 'oldest', 'price']), 'newest').default(
    'newest',
  ),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: zodValidator(productSearchSchema),
})
```

Therefore when navigating to this route, `search` is optional and retains the correct types.

In Zod v4, schemas may use `catch` instead of the fallback and will retain type inference throughout.

While not recommended, it is also possible to configure `input` and `output` type in case the `output` type is more accurate than the `input` type:

```tsx
const productSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), '').default(''),
  sort: fallback(z.enum(['newest', 'oldest', 'price']), 'newest').default(
    'newest',
  ),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: zodValidator({
    schema: productSearchSchema,
    input: 'output',
    output: 'input',
  }),
})
```

This provides flexibility in which type you want to infer for navigation and which types you want to infer for reading search params.

### Valibot

> [!WARNING]
> Router expects the valibot 1.0 package to be installed.

When using [Valibot](https://valibot.dev/) an adapter is not needed to ensure the correct `input` and `output` types are used for navigation and reading search params. This is because `valibot` implements [Standard Schema](https://github.com/standard-schema/standard-schema)

```tsx
import * as v from 'valibot'

const productSearchSchema = v.object({
  page: v.optional(v.fallback(v.number(), 1), 1),
  filter: v.optional(v.fallback(v.string(), ''), ''),
  sort: v.optional(
    v.fallback(v.picklist(['newest', 'oldest', 'price']), 'newest'),
    'newest',
  ),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

### Arktype

> [!WARNING]
> Router expects the arktype 2.0-rc package to be installed.

When using [ArkType](https://arktype.io/) an adapter is not needed to ensure the correct `input` and `output` types are used for navigation and reading search params. This is because [ArkType](https://arktype.io/) implements [Standard Schema](https://github.com/standard-schema/standard-schema)

```tsx
import { type } from 'arktype'

const productSearchSchema = type({
  page: 'number = 1',
  filter: 'string = ""',
  sort: '"newest" | "oldest" | "price" = "newest"',
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

### Effect/Schema

When using [Effect/Schema](https://effect.website/docs/schema/introduction/) an adapter is not needed to ensure the correct `input` and `output` types are used for navigation and reading search params. This is because [Effect/Schema](https://effect.website/docs/schema/standard-schema/) implements [Standard Schema](https://github.com/standard-schema/standard-schema)

```tsx
import { Schema as S } from 'effect'

const productSearchSchema = S.standardSchemaV1(
  S.Struct({
    page: S.NumberFromString.pipe(
      S.optional,
      S.withDefaults({
        constructor: () => 1,
        decoding: () => 1,
      }),
    ),
    filter: S.String.pipe(
      S.optional,
      S.withDefaults({
        constructor: () => '',
        decoding: () => '',
      }),
    ),
    sort: S.Literal('newest', 'oldest', 'price').pipe(
      S.optional,
      S.withDefaults({
        constructor: () => 'newest' as const,
        decoding: () => 'newest' as const,
      }),
    ),
  }),
)

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

## Reading Search Params

Once your search params have been validated and typed, you're finally ready to start reading and writing to them. There are a few ways to do this in TanStack Router, so let's check them out.

### Using Search Params in Loaders

Please read the [Search Params in Loaders](./data-loading.md#using-loaderdeps-to-access-search-params) section for more information about how to read search params in loaders with the `loaderDeps` option.

### Search Params are inherited from Parent Routes

The search parameters and types of parents are merged as you go down the route tree, so child routes also have access to their parent's search params:

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/shop/products.tsx"
const productSearchSchema = z.object({
  page: z.number().catch(1),
  filter: z.string().catch(''),
  sort: z.enum(['newest', 'oldest', 'price']).catch('newest'),
})

type ProductSearch = z.infer<typeof productSearchSchema>

export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,
})
```

```tsx title="src/routes/shop/products/$productId.tsx"
export const Route = createFileRoute('/shop/products/$productId')({
  beforeLoad: ({ search }) => {
    search
    // ^? ProductSearch ✅
  },
})
```

<!-- ::end:tabs -->

### Search Params in Components

You can access your route's validated search params in your route's `component` via the `useSearch` hook.

```tsx title="src/routes/shop/products.tsx"
export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,
})

const ProductList = () => {
  const { page, filter, sort } = Route.useSearch()

  return <div>...</div>
}
```

> [!TIP]
> If your component is code-split, you can use the [getRouteApi function](./code-splitting.md#manually-accessing-route-apis-in-other-files-with-the-getrouteapi-helper) to avoid having to import the `Route` configuration to get access to the typed `useSearch()` hook.

### Search Params outside of Route Components

You can access your route's validated search params anywhere in your app using the `useSearch` hook. By passing the `from` id/path of your origin route, you'll get even better type safety:

```tsx
// src/routes/shop.products.tsx
export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,
  // ...
})

// Somewhere else...

// src/components/product-list-sidebar.tsx
const routeApi = getRouteApi('/shop/products')

const ProductList = () => {
  const routeSearch = routeApi.useSearch()

  // OR

  const { page, filter, sort } = useSearch({
    from: Route.fullPath,
  })

  return <div>...</div>
}
```

Or, you can loosen up the type-safety and get an optional `search` object by passing `strict: false`:

```tsx
function ProductList() {
  const search = useSearch({
    strict: false,
  })
  // {
  //   page: number | undefined
  //   filter: string | undefined
  //   sort: 'newest' | 'oldest' | 'price' | undefined
  // }

  return <div>...</div>
}
```

## Writing Search Params

Now that you've learned how to read your route's search params, you'll be happy to know that you've already seen the primary APIs to modify and update them. Let's remind ourselves a bit

### `<Link search />`

The best way to update search params is to use the `search` prop on the `<Link />` component.

If the search for the current page shall be updated and the `from` prop is specified, the `to` prop can be omitted.
Here's an example:

```tsx title="src/routes/shop/products.tsx"
export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,
})

const ProductList = () => {
  return (
    <div>
      <Link from={Route.fullPath} search={(prev) => ({ page: prev.page + 1 })}>
        Next Page
      </Link>
    </div>
  )
}
```

If you want to update the search params in a generic component that is rendered on multiple routes, specifying `from` can be challenging.

In this scenario you can set `to="."` which will give you access to loosely typed search params.
Here is an example that illustrates this:

```tsx
// `page` is a search param that is defined in the __root route and hence available on all routes.
const PageSelector = () => {
  return (
    <div>
      <Link to="." search={(prev) => ({ ...prev, page: prev.page + 1 })}>
        Next Page
      </Link>
    </div>
  )
}
```

If the generic component is only rendered in a specific subtree of the route tree, you can specify that subtree using `from`. Here you can omit `to='.'` if you want.

```tsx
// `page` is a search param that is defined in the /posts route and hence available on all of its child routes.
const PageSelector = () => {
  return (
    <div>
      <Link
        from="/posts"
        to="."
        search={(prev) => ({ ...prev, page: prev.page + 1 })}
      >
        Next Page
      </Link>
    </div>
  )
```

### `useNavigate(), navigate({ search })`

The `navigate` function also accepts a `search` option that works the same way as the `search` prop on `<Link />`:

```tsx title="src/routes/shop/products.tsx"
export const Route = createFileRoute('/shop/products/$productId')({
  validateSearch: productSearchSchema,
})

const ProductList = () => {
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <div>
      <button
        onClick={() => {
          navigate({
            search: (prev) => ({ page: prev.page + 1 }),
          })
        }}
      >
        Next Page
      </button>
    </div>
  )
}
```

### `router.navigate({ search })`

The `router.navigate` function works exactly the same way as the `useNavigate`/`navigate` hook/function above.

### `<Navigate search />`

The `<Navigate search />` component works exactly the same way as the `useNavigate`/`navigate` hook/function above, but accepts its options as props instead of a function argument.

## Transforming search with search middlewares

When link hrefs are built, by default the only thing that matters for the query string part is the `search` property of a `<Link>`.

TanStack Router provides a way to manipulate search params before the href is generated via **search middlewares**.
Search middlewares are functions that transform the search parameters when generating new links for a route or its descendants.
They are also executed upon navigation after search validation to allow manipulation of the query string.

The following example shows how to make sure that for **every** link that is being built, the `rootValue` search param is added _if_ it is part of the current search params. If a link specifies `rootValue` inside `search`, then that value is used for building the link.

```tsx
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-adapter'

const searchSchema = z.object({
  rootValue: z.string().optional(),
})

export const Route = createRootRoute({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [
      ({ search, next }) => {
        const result = next(search)
        return {
          rootValue: search.rootValue,
          ...result,
        }
      },
    ],
  },
})
```

Since this specific use case is quite common, TanStack Router provides a generic implementation to retain search params via `retainSearchParams`:

<!-- ::start:framework -->

# React

```tsx
import { z } from 'zod'
import { createFileRoute, retainSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

const searchSchema = z.object({
  rootValue: z.string().optional(),
})

export const Route = createRootRoute({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(['rootValue'])],
  },
})
```

# Solid

```tsx
import { z } from 'zod'
import { createFileRoute, retainSearchParams } from '@tanstack/solid-router'
import { zodValidator } from '@tanstack/zod-adapter'

const searchSchema = z.object({
  rootValue: z.string().optional(),
})

export const Route = createRootRoute({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(['rootValue'])],
  },
})
```

<!-- ::end:framework -->

Another common use case is to strip out search params from links if their default value is set. TanStack Router provides a generic implementation for this use case via `stripSearchParams`:

<!-- ::start:framework -->

# React

```tsx
import { z } from 'zod'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

const defaultValues = {
  one: 'abc',
  two: 'xyz',
}

const searchSchema = z.object({
  one: z.string().default(defaultValues.one),
  two: z.string().default(defaultValues.two),
})

export const Route = createFileRoute('/hello')({
  validateSearch: zodValidator(searchSchema),
  search: {
    // strip default values
    middlewares: [stripSearchParams(defaultValues)],
  },
})
```

# Solid

```tsx
import { z } from 'zod'
import { createFileRoute, stripSearchParams } from '@tanstack/solid-router'
import { zodValidator } from '@tanstack/zod-adapter'

const defaultValues = {
  one: 'abc',
  two: 'xyz',
}

const searchSchema = z.object({
  one: z.string().default(defaultValues.one),
  two: z.string().default(defaultValues.two),
})

export const Route = createFileRoute('/hello')({
  validateSearch: zodValidator(searchSchema),
  search: {
    // strip default values
    middlewares: [stripSearchParams(defaultValues)],
  },
})
```

<!-- ::end:framework -->

Multiple middlewares can be chained. The following example shows how to combine both `retainSearchParams` and `stripSearchParams`.

<!-- ::start:framework -->

# React

```tsx
import {
  Link,
  createFileRoute,
  retainSearchParams,
  stripSearchParams,
} from '@tanstack/react-router'
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-adapter'

const defaultValues = ['foo', 'bar']

export const Route = createFileRoute('/search')({
  validateSearch: zodValidator(
    z.object({
      retainMe: z.string().optional(),
      arrayWithDefaults: z.string().array().default(defaultValues),
      required: z.string(),
    }),
  ),
  search: {
    middlewares: [
      retainSearchParams(['retainMe']),
      stripSearchParams({ arrayWithDefaults: defaultValues }),
    ],
  },
})
```

# Solid

```tsx
import {
  Link,
  createFileRoute,
  retainSearchParams,
  stripSearchParams,
} from '@tanstack/solid-router'
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-adapter'

const defaultValues = ['foo', 'bar']

export const Route = createFileRoute('/search')({
  validateSearch: zodValidator(
    z.object({
      retainMe: z.string().optional(),
      arrayWithDefaults: z.string().array().default(defaultValues),
      required: z.string(),
    }),
  ),
  search: {
    middlewares: [
      retainSearchParams(['retainMe']),
      stripSearchParams({ arrayWithDefaults: defaultValues }),
    ],
  },
})
```

<!-- ::end:framework -->

---
title: Link Options
---

You may want to reuse options that are intended to be passed to `Link`, `redirect` or `navigate`. In which case you may decide an object literal is a good way to represent options passed to `Link`.

```tsx
const dashboardLinkOptions = {
  to: '/dashboard',
  search: { search: '' },
}

function DashboardComponent() {
  return <Link {...dashboardLinkOptions} />
}
```

There are a few problems here. `dashboardLinkOptions.to` is inferred as `string` which by default will resolve to every route when passed to `Link`, `navigate` or `redirect` (this particular issue could be fixed by `as const`). The other issue here is we do not know `dashboardLinkOptions` even passes the type checker until it is spread into `Link`. We could very easily create incorrect navigation options and only when the options are spread into `Link` do we know there is a type error.

### Using `linkOptions` function to create re-usable options

`linkOptions` is a function which type checks an object literal and returns the inferred input as is. This provides type safety on options exactly like `Link` before it is used allowing for easier maintenance and re-usability. Our above example using `linkOptions` looks like this:

```tsx
const dashboardLinkOptions = linkOptions({
  to: '/dashboard',
  search: { search: '' },
})

function DashboardComponent() {
  return <Link {...dashboardLinkOptions} />
}
```

This allows eager type checking of `dashboardLinkOptions` which can then be re-used anywhere

```tsx
const dashboardLinkOptions = linkOptions({
  to: '/dashboard',
  search: { search: '' },
})

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
  validateSearch: (input) => ({ search: input.search }),
  beforeLoad: () => {
    // can used in redirect
    throw redirect(dashboardLinkOptions)
  },
})

function DashboardComponent() {
  const navigate = useNavigate()

  return (
    <div>
      {/** can be used in navigate */}
      <button onClick={() => navigate(dashboardLinkOptions)} />

      {/** can be used in Link */}
      <Link {...dashboardLinkOptions} />
    </div>
  )
}
```

### An array of `linkOptions`

When creating navigation you might loop over an array to construct a navigation bar. In which case `linkOptions` can be used to type check an array of object literals which are intended for `Link` props

```tsx
const options = linkOptions([
  {
    to: '/dashboard',
    label: 'Summary',
    activeOptions: { exact: true },
  },
  {
    to: '/dashboard/invoices',
    label: 'Invoices',
  },
  {
    to: '/dashboard/users',
    label: 'Users',
  },
])

function DashboardComponent() {
  return (
    <>
      <div className="flex items-center border-b">
        <h2 className="text-xl p-2">Dashboard</h2>
      </div>

      <div className="flex flex-wrap divide-x">
        {options.map((option) => {
          return (
            <Link
              {...option}
              key={option.to}
              activeProps={{ className: `font-bold` }}
              className="p-2"
            >
              {option.label}
            </Link>
          )
        })}
      </div>
      <hr />

      <Outlet />
    </>
  )
}
```

The input of `linkOptions` is inferred and returned, as shown with the use of `label` as this does not exist on `Link` props

---
id: external-data-loading
title: External Data Loading
---

> [!IMPORTANT]
> This guide is geared towards external state management libraries and their integration with TanStack Router for data fetching, ssr, hydration/dehydration and streaming. If you haven't read the standard [Data Loading](./data-loading.md) guide, please do so first.

## To **Store** or to **Coordinate**?

While Router is very capable of storing and managing most data needs out of the box, sometimes you just might want something more robust!

Router is designed to be a perfect **coordinator** for external data fetching and caching libraries. This means that you can use any data fetching/caching library you want, and the router will coordinate the loading of your data in a way that aligns with your users' navigation and expectations of freshness.

## What data fetching libraries are supported?

Any data fetching library that supports asynchronous promises can be used with TanStack Router. This includes:

- [TanStack Query](https://tanstack.com/query/latest/docs/react/overview)
- [SWR](https://swr.vercel.app/)
- [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)
- [urql](https://formidable.com/open-source/urql/)
- [Relay](https://relay.dev/)
- [Apollo](https://www.apollographql.com/docs/react/)

Or, even...

- [Zustand](https://zustand-demo.pmnd.rs/)
- [Jotai](https://jotai.org/)
- [Recoil](https://recoiljs.org/)
- [Redux](https://redux.js.org/)

Literally any library that **can return a promise and read/write data** can be integrated.

## Using Loaders to ensure data is loaded

The easiest way to integrate external caching/data library into Router is to use `route.loader`s to ensure that the data required inside of a route has been loaded and is ready to be displayed.

> ⚠️ BUT WHY? It's very important to preload your critical render data in the loader for a few reasons:
>
> - No "flash of loading" states
> - No waterfall data fetching, caused by component based fetching
> - Better for SEO. If your data is available at render time, it will be indexed by search engines.

Here is a naive illustration (don't do this) of using a Route's `loader` option to seed the cache for some data:

```tsx
// src/routes/posts.tsx
let postsCache = []

export const Route = createFileRoute('/posts')({
  loader: async () => {
    postsCache = await fetchPosts()
  },
  component: () => {
    return (
      <div>
        {postsCache.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    )
  },
})
```

This example is **obviously flawed**, but illustrates the point that you can use a route's `loader` option to seed your cache with data. Let's take a look at a more realistic example using TanStack Query.

- Replace `fetchPosts` with your preferred data fetching library's prefetching API
- Replace `postsCache` with your preferred data fetching library's read-or-fetch API or hook

## A more realistic example using TanStack Query

Let's take a look at a more realistic example using TanStack Query.

```tsx
// src/routes/posts.tsx
const postsQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: () => fetchPosts(),
})

export const Route = createFileRoute('/posts')({
  // Use the `loader` option to ensure that the data is loaded
  loader: () => queryClient.ensureQueryData(postsQueryOptions),
  component: () => {
    // Read the data from the cache and subscribe to updates
    const {
      data: { posts },
    } = useSuspenseQuery(postsQueryOptions)

    return (
      <div>
        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    )
  },
})
```

### Error handling with TanStack Query

When an error occurs while using `suspense` with `TanStack Query`, you need to let queries know that you want to try again when re-rendering. This can be done by using the `reset` function provided by the `useQueryErrorResetBoundary` hook. You can invoke this function in an effect as soon as the error component mounts. This will make sure that the query is reset and will try to fetch data again when the route component is rendered again. This will also cover cases where users navigate away from the route instead of clicking the `retry` button.

```tsx
export const Route = createFileRoute('/')({
  loader: () => queryClient.ensureQueryData(postsQueryOptions),
  errorComponent: ({ error, reset }) => {
    const router = useRouter()
    const queryErrorResetBoundary = useQueryErrorResetBoundary()

    useEffect(() => {
      // Reset the query error boundary
      queryErrorResetBoundary.reset()
    }, [queryErrorResetBoundary])

    return (
      <div>
        {error.message}
        <button
          onClick={() => {
            // Invalidate the route to reload the loader, and reset any router error boundaries
            router.invalidate()
          }}
        >
          retry
        </button>
      </div>
    )
  },
})
```

## SSR Dehydration/Hydration

Tools that are able can integrate with TanStack Router's convenient Dehydration/Hydration APIs to shuttle dehydrated data between the server and client and rehydrate it where needed. Let's go over how to do this with both 3rd party critical data and 3rd party deferred data.

## Critical Dehydration/Hydration

**For critical data needed for the first render/paint**, TanStack Router supports **`dehydrate` and `hydrate`** options when configuring the `Router`. These callbacks are functions that are automatically called on the server and client when the router dehydrates and hydrates normally and allow you to augment the dehydrated data with your own data.

The `dehydrate` function can return any serializable JSON data which will get merged and injected into the dehydrated payload that is sent to the client.

For example, let's dehydrate and hydrate a TanStack Query `QueryClient` so that our data we fetched on the server will be available for hydration on the client.

```tsx
// src/router.tsx

export function createRouter() {
  // Make sure you create your loader client or similar data
  // stores inside of your `createRouter` function. This ensures
  // that your data stores are unique to each request and
  // always present on both server and client.
  const queryClient = new QueryClient()

  return createRouter({
    routeTree,
    // Optionally provide your loaderClient to the router context for
    // convenience (you can provide anything you want to the router
    // context!)
    context: {
      queryClient,
    },
    // On the server, dehydrate the loader client so the router
    // can serialize it and send it to the client for us
    dehydrate: () => {
      return {
        queryClientState: dehydrate(queryClient),
      }
    },
    // On the client, hydrate the loader client with the data
    // we dehydrated on the server
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated.queryClientState)
    },
    // Optionally, we can use `Wrap` to wrap our router in the loader client provider
    Wrap: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
  })
}
```

---
title: Type Safety
---

TanStack Router is built to be as type-safe as possible within the limits of the TypeScript compiler and runtime. This means that it's not only written in TypeScript, but that it also **fully infers the types it's provided and tenaciously pipes them through the entire routing experience**.

Ultimately, this means that you write **less types as a developer** and have **more confidence in your code** as it evolves.

## Route Definitions

### File-based Routing

Routes are hierarchical, and so are their definitions. If you're using file-based routing, much of the type-safety is already taken care of for you.

### Code-based Routing

If you're using the `Route` class directly, you'll need to be aware of how to ensure your routes are typed properly using the `Route`'s `getParentRoute` option. This is because child routes need to be aware of **all** of their parent routes types. Without this, those precious search params you parsed out of your _layout_ and _pathless layout_ routes, 3 levels up, would be lost to the JS void.

So, don't forget to pass the parent route to your child routes!

```tsx
const parentRoute = createRoute({
  getParentRoute: () => parentRoute,
})
```

## Exported Hooks, Components, and Utilities

For the types of your router to work with top-level exports like `Link`, `useNavigate`, `useParams`, etc. they must permeate the TypeScript module boundary and be registered right into the library. To do this, we use declaration merging on the exported `Register` interface.

<!-- ::start:framework -->

# React

```ts
const router = createRouter({
  // ...
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

# Solid

```ts
const router = createRouter({
  // ...
})

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router
  }
}
```

<!-- ::end:framework -->

By registering your router with the module, you can now use the exported hooks, components, and utilities with your router's exact types.

## Fixing the Component Context Problem

Component context is a wonderful tool in React and other frameworks for providing dependencies to components. However, if that context is changing types as it moves throughout your component hierarchy, it becomes impossible for TypeScript to know how to infer those changes. To get around this, context-based hooks and components require that you give them a hint on how and where they are being used.

```tsx
export const Route = createFileRoute('/posts')({
  component: PostsComponent,
})

function PostsComponent() {
  // Each route has type-safe versions of most of the built-in hooks from TanStack Router
  const params = Route.useParams()
  const search = Route.useSearch()

  // Some hooks require context from the *entire* router, not just the current route. To achieve type-safety here,
  // we must pass the `from` param to tell the hook our relative position in the route hierarchy.
  const navigate = useNavigate({ from: Route.fullPath })
  // ... etc
}
```

Every hook and component that requires a context hint will have a `from` param where you can pass the ID or path of the route you are rendering within.

> 🧠 Quick tip: If your component is code-split, you can use the [getRouteApi function](./code-splitting.md#manually-accessing-route-apis-in-other-files-with-the-getrouteapi-helper) to avoid having to pass in the `Route.fullPath` to get access to the typed `useParams()` and `useSearch()` hooks.

### What if I don't know the route? What if it's a shared component?

The `from` property is optional, which means if you don't pass it, you'll get the router's best guess on what types will be available. Usually, that means you'll get a union of all of the types of all of the routes in the router.

### What if I pass the wrong `from` path?

It's technically possible to pass a `from` that satisfies TypeScript, but may not match the actual route you are rendering within at runtime. In this case, each hook and component that supports `from` will detect if your expectations don't match the actual route you are rendering within, and will throw a runtime error.

### What if I don't know the route, or it's a shared component, and I can't pass `from`?

If you are rendering a component that is shared across multiple routes, or you are rendering a component that is not within a route, you can pass `strict: false` instead of a `from` option. This will not only silence the runtime error, but will also give you relaxed, but accurate types for the potential hook you are calling. A good example of this is calling `useSearch` from a shared component:

```tsx
function MyComponent() {
  const search = useSearch({ strict: false })
}
```

In this case, the `search` variable will be typed as a union of all possible search params from all routes in the router.

## Router Context

Router context is so extremely useful as it's the ultimate hierarchical dependency injection. You can supply context to the router and to each and every route it renders. As you build up this context, TanStack Router will merge it down with the hierarchy of routes, so that each route has access to the context of all of its parents.

The `createRootRouteWithContext` factory creates a new router with the instantiated type, which then creates a requirement for you to fulfill the same type contract to your router, and will also ensure that your context is properly typed throughout the entire route tree.

```tsx
const rootRoute = createRootRouteWithContext<{ whateverYouWant: true }>()({
  component: App,
})

const routeTree = rootRoute.addChildren([
  // ... all child routes will have access to `whateverYouWant` in their context
])

const router = createRouter({
  routeTree,
  context: {
    // This will be required to be passed now
    whateverYouWant: true,
  },
})
```

## Performance Recommendations

As your application scales, TypeScript check times will naturally increase. There are a few things to keep in mind when your application scales to keep your TS check times down.

### Only infer types you need

A great pattern with client side data caches (TanStack Query, etc.) is to prefetch data. For example with TanStack Query you might have a route which calls `queryClient.ensureQueryData` in a `loader`.

```tsx
export const Route = createFileRoute('/posts/$postId/deep')({
  loader: ({ context: { queryClient }, params: { postId } }) =>
    queryClient.ensureQueryData(postQueryOptions(postId)),
  component: PostDeepComponent,
})

function PostDeepComponent() {
  const params = Route.useParams()
  const data = useSuspenseQuery(postQueryOptions(params.postId))

  return <></>
}
```

This may look fine and for small route trees and you may not notice any TS performance issues. However in this case TS has to infer the loader's return type, despite it never being used in your route. If the loader data is a complex type with many routes that prefetch in this manner, it can slow down editor performance. In this case, the change is quite simple and let typescript infer Promise<void>.

```tsx
export const Route = createFileRoute('/posts/$postId/deep')({
  loader: async ({ context: { queryClient }, params: { postId } }) => {
    await queryClient.ensureQueryData(postQueryOptions(postId))
  },
  component: PostDeepComponent,
})

function PostDeepComponent() {
  const params = Route.useParams()
  const data = useSuspenseQuery(postQueryOptions(params.postId))

  return <></>
}
```

This way the loader data is never inferred and it moves the inference out of the route tree to the first time you use `useSuspenseQuery`.

### Narrow to relevant routes as much as you possibly can

Consider the following usage of `Link`

```tsx
<Link to=".." search={{ page: 0 }} />
<Link to="." search={{ page: 0 }} />
```

**These examples are bad for TS performance**. That's because `search` resolves to a union of all `search` params for all routes and TS has to check whatever you pass to the `search` prop against this potentially big union. As your application grows, this check time will increase linearly to number of routes and search params. We have done our best to optimize for this case (TypeScript will typically do this work once and cache it) but the initial check against this large union is expensive. This also applies to `params` and other API's such as `useSearch`, `useParams`, `useNavigate` etc.

Instead you should try to narrow to relevant routes with `from` or `to`.

```tsx
<Link from={Route.fullPath} to=".." search={{page: 0}} />
<Link from="/posts" to=".." search={{page: 0}} />
```

Remember you can always pass a union to `to` or `from` to narrow the routes you're interested in.

```tsx
const from: '/posts/$postId/deep' | '/posts/' = '/posts/'
<Link from={from} to='..' />
```

You can also pass branches to `from` to only resolve `search` or `params` to be from any descendants of that branch:

```tsx
const from = '/posts'
<Link from={from} to='..' />
```

`/posts` could be a branch with many descendants which share the same `search` or `params`

### Consider using the object syntax of `addChildren`

It's typical of routes to have `params` `search`, `loaders` or `context` that can even reference external dependencies which are also heavy on TS inference. For such applications, using objects for creating the route tree can be more performant than tuples.

`createChildren` also can accept an object. For large route trees with complex routes and external libraries, objects can be much faster for TS to type check as opposed to large tuples. The performance gains depend on your project, what external dependencies you have and how the types for those libraries are written

```tsx
const routeTree = rootRoute.addChildren({
  postsRoute: postsRoute.addChildren({ postRoute, postsIndexRoute }),
  indexRoute,
})
```

Note this syntax is more verbose but has better TS performance. With file based routing, the route tree is generated for you so a verbose route tree is not a concern

### Avoid internal types without narrowing

It's common you might want to re-use types exposed. For example you might be tempted to use `LinkProps` like so

```tsx
const props: LinkProps = {
  to: '/posts/',
}

return (
  <Link {...props}>
)
```

**This is VERY bad for TS Performance**. The problem here is `LinkProps` has no type arguments and is therefore an extremely large type. It includes `search` which is a union of all `search` params, it contains `params` which is a union of all `params`. When merging this object with `Link` it will do a structural comparison of this huge type.

Instead you can use `as const satisfies` to infer a precise type and not `LinkProps` directly to avoid the huge check

```tsx
const props = {
  to: '/posts/',
} as const satisfies LinkProps

return (
  <Link {...props}>
)
```

As `props` is not of type `LinkProps` and therefore this check is cheaper because the type is much more precise. You can also improve type checking further by narrowing `LinkProps`

```tsx
const props = {
  to: '/posts/',
} as const satisfies LinkProps<RegisteredRouter, string '/posts/'>

return (
  <Link {...props}>
)
```

This is even faster as we're checking against the narrowed `LinkProps` type.

You can also use this to narrow the type of `LinkProps` to a specific type to be used as a prop or parameter to a function

```tsx
export const myLinkProps = [
  {
    to: '/posts',
  },
  {
    to: '/posts/$postId',
    params: { postId: 'postId' },
  },
] as const satisfies ReadonlyArray<LinkProps>

export type MyLinkProps = (typeof myLinkProps)[number]

const MyComponent = (props: { linkProps: MyLinkProps }) => {
  return <Link {...props.linkProps} />
}
```

This is faster than using `LinkProps` directly in a component because `MyLinkProps` is a much more precise type

Another solution is not to use `LinkProps` and to provide inversion of control to render a `Link` component narrowed to a specific route. Render props are a good method of inverting control to the user of a component

```tsx
export interface MyComponentProps {
  readonly renderLink: () => React.ReactNode
}

const MyComponent = (props: MyComponentProps) => {
  return <div>{props.renderLink()}</div>
}

const Page = () => {
  return <MyComponent renderLink={() => <Link to="/absolute" />} />
}
```

This particular example is very fast as we've inverted control of where we're navigating to the user of the component. The `Link` is narrowed to the exact route
we want to navigate to

---
id: type-utilities
title: Type Utilities
---

Most types exposed by TanStack Router are internal, subject to breaking changes and not always easy to use. That is why TanStack Router has a subset of exposed types focused on ease of use with the intension to be used externally. These types provide the same type safe experience from TanStack Router's runtime concepts on the type level, with flexibility of where to provide type checking

## Type checking Link options with `ValidateLinkOptions`

`ValidateLinkOptions` type checks object literal types to ensure they conform to `Link` options at inference sites. For example, you may have a generic `HeadingLink` component which accepts a `title` prop along with `linkOptions`, the idea being this component can be re-used for any navigation.

<!-- ::start:framework -->

# React

```tsx
export interface HeaderLinkProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
> {
  title: string
  linkOptions: ValidateLinkOptions<TRouter, TOptions>
}

export function HeadingLink<TRouter extends RegisteredRouter, TOptions>(
  props: HeaderLinkProps<TRouter, TOptions>,
): React.ReactNode
export function HeadingLink(props: HeaderLinkProps): React.ReactNode {
  return (
    <>
      <h1>{props.title}</h1>
      <Link {...props.linkOptions} />
    </>
  )
}
```

# Solid

```tsx
export interface HeaderLinkProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
> {
  title: string
  linkOptions: ValidateLinkOptions<TRouter, TOptions>
}

export function HeadingLink<TRouter extends RegisteredRouter, TOptions>(
  props: HeaderLinkProps<TRouter, TOptions>,
): Solid.JSX.Element
export function HeadingLink(props: HeaderLinkProps): Solid.JSX.Element {
  return (
    <>
      <h1>{props.title}</h1>
      <Link {...props.linkOptions} />
    </>
  )
}
```

<!-- ::end:framework -->

A more permissive overload of `HeadingLink` is used to avoid type assertions you would otherwise have to do with the generic signature. Using a looser signature without type parameters is an easy way to avoid type assertions in the implementation of `HeadingLink`

All type parameters for utilities are optional but for the best TypeScript performance `TRouter` should always be specified for the public facing signature. And `TOptions` should always be used at inference sites like `HeadingLink` to infer the `linkOptions` to correctly narrow `params` and `search`

The result of this is that `linkOptions` in the following is completely type-safe

```tsx
<HeadingLink title="Posts" linkOptions={{ to: '/posts' }} />
<HeadingLink title="Post" linkOptions={{ to: '/posts/$postId', params: {postId: 'postId'} }} />
```

## Type checking an array of Link options with `ValidateLinkOptionsArray`

All navigation type utilities have an array variant. `ValidateLinkOptionsArray` enables type checking of an array of `Link` options. For example, you might have a generic `Menu` component where each item is a `Link`.

<!-- ::start:framework -->

# React

```tsx
export interface MenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> {
  items: ValidateLinkOptionsArray<TRouter, TItems>
}

export function Menu<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown>,
>(props: MenuProps<TRouter, TItems>): React.ReactNode
export function Menu(props: MenuProps): React.ReactNode {
  return (
    <ul>
      {props.items.map((item) => (
        <li>
          <Link {...item} />
        </li>
      ))}
    </ul>
  )
}
```

# Solid

```tsx
import { For } from 'solid-js'

export interface MenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> {
  items: ValidateLinkOptionsArray<TRouter, TItems>
}

export function Menu<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown>,
>(props: MenuProps<TRouter, TItems>): Solid.JSX.Element
export function Menu(props: MenuProps): Solid.JSX.Element {
  return (
    <ul>
      <For each={props.items}>
        {(item) => (
          <li>
            <Link {...item} />
          </li>
        )}
      </For>
    </ul>
  )
}
```

<!-- ::end:framework -->

This of course allows the following `items` prop to be completely type-safe

```tsx
<Menu
  items={[
    { to: '/posts' },
    { to: '/posts/$postId', params: { postId: 'postId' } },
  ]}
/>
```

It is also possible to fix `from` for each `Link` options in the array. This would allow all `Menu` items to navigate relative to `from`. Additional type checking of `from` can be provided by the `ValidateFromPath` utility

<!-- ::start:framework -->

# React

```ts
export interface MenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
  TFrom extends string = string,
> {
  from: ValidateFromPath<TRouter, TFrom>
  items: ValidateLinkOptionsArray<TRouter, TItems, TFrom>
}

export function Menu<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown>,
  TFrom extends string = string,
>(props: MenuProps<TRouter, TItems, TFrom>): React.ReactNode
export function Menu(props: MenuProps): React.ReactNode {
  return (
    <ul>
      {props.items.map((item) => (
        <li>
          <Link {...item} from={props.from} />
        </li>
      ))}
    </ul>
  )
}
```

# Solid

```ts
import { For } from 'solid-js'

export interface MenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
  TFrom extends string = string,
> {
  from: ValidateFromPath<TRouter, TFrom>
  items: ValidateLinkOptionsArray<TRouter, TItems, TFrom>
}

export function Menu<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown>,
  TFrom extends string = string,
>(props: MenuProps<TRouter, TItems, TFrom>): Solid.JSX.Element
export function Menu(props: MenuProps): Solid.JSX.Element {
  return (
    <ul>
      <For each={props.items}>
        {(item) => (
          <li>
            <Link {...item} from={props.from} />
          </li>
        )}
      </For>
    </ul>
  )
}
```

<!-- ::end:framework -->

`ValidateLinkOptionsArray` allows you to fix `from` by providing an extra type parameter. The result is a type safe array of `Link` options providing navigation relative to `from`

```tsx
<Menu
  from="/posts"
  items={[{ to: '.' }, { to: './$postId', params: { postId: 'postId' } }]}
/>
```

## Type checking redirect options with `ValidateRedirectOptions`

`ValidateRedirectOptions` type checks object literal types to ensure they conform to redirect options at inference sites. For example, you may need a generic `fetchOrRedirect` function which accepts a `url` along with `redirectOptions`, the idea being this function will redirect when the `fetch` fails.

```tsx
export async function fetchOrRedirect<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions,
>(
  url: string,
  redirectOptions: ValidateRedirectOptions<TRouter, TOptions>,
): Promise<unknown>
export async function fetchOrRedirect(
  url: string,
  redirectOptions: ValidateRedirectOptions,
): Promise<unknown> {
  const response = await fetch(url)

  if (!response.ok && response.status === 401) {
    throw redirect(redirectOptions)
  }

  return await response.json()
}
```

The result is that `redirectOptions` passed to `fetchOrRedirect` is completely type-safe

```tsx
fetchOrRedirect('http://example.com/', { to: '/login' })
```

## Type checking navigate options with `ValidateNavigateOptions`

`ValidateNavigateOptions` type checks object literal types to ensure they conform to navigate options at inference sites. For example, you may want to write a custom hook to enable/disable navigation.

<!-- ::start:framework -->

# React

```tsx
export interface UseConditionalNavigateResult {
  enable: () => void
  disable: () => void
  navigate: () => void
}

export function useConditionalNavigate<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions,
>(
  navigateOptions: ValidateNavigateOptions<TRouter, TOptions>,
): UseConditionalNavigateResult
export function useConditionalNavigate(
  navigateOptions: ValidateNavigateOptions,
): UseConditionalNavigateResult {
  const [enabled, setEnabled] = useState(false)
  const navigate = useNavigate()
  return {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    navigate: () => {
      if (enabled) {
        navigate(navigateOptions)
      }
    },
  }
}
```

# Solid

```tsx
import { createSignal } from 'solid-js'

export interface UseConditionalNavigateResult {
  enable: () => void
  disable: () => void
  navigate: () => void
}

export function useConditionalNavigate<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
>(
  navigateOptions: ValidateNavigateOptions<TRouter, TOptions>,
): UseConditionalNavigateResult
export function useConditionalNavigate(
  navigateOptions: ValidateNavigateOptions,
): UseConditionalNavigateResult {
  const [enabled, setEnabled] = createSignal(false)
  const navigate = useNavigate()
  return {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    navigate: () => {
      if (enabled()) {
        navigate(navigateOptions)
      }
    },
  }
}
```

<!-- ::end:framework -->

The result of this is that `navigateOptions` passed to `useConditionalNavigate` is completely type-safe and we can enable/disable navigation based on react state

```tsx
const { enable, disable, navigate } = useConditionalNavigate({
  to: '/posts/$postId',
  params: { postId: 'postId' },
})
```

---
title: Preloading
---

Preloading in TanStack Router is a way to load a route before the user actually navigates to it. This is useful for routes that are likely to be visited by the user next. For example, if you have a list of posts and the user is likely to click on one of them, you can preload the post route so that it's ready to go when the user clicks on it.

## Supported Preloading Strategies

- Intent
  - Preloading by **"intent"** works by using hover and touch start events on `<Link>` components to preload the dependencies for the destination route.
  - This strategy is useful for preloading routes that the user is likely to visit next.
- Viewport Visibility
  - Preloading by **"viewport**" works by using the Intersection Observer API to preload the dependencies for the destination route when the `<Link>` component is in the viewport.
  - This strategy is useful for preloading routes that are below the fold or off-screen.
- Render
  - Preloading by **"render"** works by preloading the dependencies for the destination route as soon as the `<Link>` component is rendered in the DOM.
  - This strategy is useful for preloading routes that are always needed.

## How long does preloaded data stay in memory?

Preloaded route matches are temporarily cached in memory with a few important caveats:

- **Unused preloaded data is removed after 30 seconds by default.** This can be configured by setting the `defaultPreloadMaxAge` option on your router.
- **Obviously, when a route is loaded, its preloaded version is promoted to the router's normal pending matches state.**

If you need more control over preloading, caching and/or garbage collection of preloaded data, you should use an external caching library like [TanStack Query](https://tanstack.com/query).

The simplest way to preload routes for your application is to set the `defaultPreload` option to `intent` for your entire router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreload: 'intent',
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreload: 'intent',
})
```

<!-- ::end:framework -->

This will turn on `intent` preloading by default for all `<Link>` components in your application. You can also set the `preload` prop on individual `<Link>` components to override the default behavior.

## Preload Delay

By default, preloading will start after **50ms** of the user hovering or touching a `<Link>` component. You can change this delay by setting the `defaultPreloadDelay` option on your router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadDelay: 100,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadDelay: 100,
})
```

<!-- ::end:framework -->

You can also set the `preloadDelay` prop on individual `<Link>` components to override the default behavior on a per-link basis.

## Built-in Preloading & `preloadStaleTime`

If you're using the built-in loaders, you can control how long preloaded data is considered fresh until another preload is triggered by setting either `routerOptions.defaultPreloadStaleTime` or `routeOptions.preloadStaleTime` to a number of milliseconds. **By default, preloaded data is considered fresh for 30 seconds.**.

To change this, you can set the `defaultPreloadStaleTime` option on your router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 10_000,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 10_000,
})
```

<!-- ::end:framework -->

Or, you can use the `routeOptions.preloadStaleTime` option on individual routes:

```tsx
// src/routes/posts.$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  // Preload the route again if the preload cache is older than 10 seconds
  preloadStaleTime: 10_000,
})
```

## Preloading with External Libraries

When integrating external caching libraries like React Query, which have their own mechanisms for determining stale data, you may want to override the default preloading and stale-while-revalidate logic of TanStack Router. These libraries often use options like staleTime to control the freshness of data.

To customize the preloading behavior in TanStack Router and fully leverage your external library's caching strategy, you can bypass the built-in caching by setting routerOptions.defaultPreloadStaleTime or routeOptions.preloadStaleTime to 0. This ensures that all preloads are marked as stale internally, and loaders are always invoked, allowing your external library, such as React Query, to manage data loading and caching.

For example:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 0,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 0,
})
```

<!-- ::end:framework -->

This would then allow you, for instance, to use an option like React Query's `staleTime` to control the freshness of your preloads.

## Preloading Manually

If you need to manually preload a route, you can use the router's `preloadRoute` method. It accepts a standard TanStack `NavigateOptions` object and returns a promise that resolves when the route is preloaded.

<!-- ::start:framework -->

# React

```tsx
function Component() {
  const router = useRouter()

  useEffect(() => {
    async function preload() {
      try {
        const matches = await router.preloadRoute({
          to: postRoute,
          params: { id: 1 },
        })
      } catch (err) {
        // Failed to preload route
      }
    }

    preload()
  }, [router])

  return <div />
}
```

# Solid

```tsx
function Component() {
  const router = useRouter()

  createEffect(() => {
    async function preload() {
      try {
        const matches = await router.preloadRoute({
          to: postRoute,
          params: { id: 1 },
        })
      } catch (err) {
        // Failed to preload route
      }
    }

    preload()
  })

  return <div />
}
```

<!-- ::end:framework -->

If you need to preload only the JS chunk of a route, you can use the router's `loadRouteChunk` method. It accepts a route object and returns a promise that resolves when the route chunk is loaded.

<!-- ::start:framework -->

# React

```tsx
function Component() {
  const router = useRouter()

  useEffect(() => {
    async function preloadRouteChunks() {
      try {
        const postsRoute = router.routesByPath['/posts']
        await Promise.all([
          router.loadRouteChunk(router.routesByPath['/']),
          router.loadRouteChunk(postsRoute),
          router.loadRouteChunk(postsRoute.parentRoute),
        ])
      } catch (err) {
        // Failed to preload route chunk
      }
    }

    preloadRouteChunks()
  }, [router])

  return <div />
}
```

# Solid

```tsx
function Component() {
  const router = useRouter()

  createEffect(() => {
    async function preloadRouteChunks() {
      try {
        const postsRoute = router.routesByPath['/posts']
        await Promise.all([
          router.loadRouteChunk(router.routesByPath['/']),
          router.loadRouteChunk(postsRoute),
          router.loadRouteChunk(postsRoute.parentRoute),
        ])
      } catch (err) {
        // Failed to preload route chunk
      }
    }

    preloadRouteChunks()
  })

  return <div />
}
```

<!-- ::end:framework -->

---
title: Document Head Management
---

Document head management is the process of managing the head, title, meta, link, and script tags of a document and TanStack Router provides a robust way to manage the document head for full-stack applications that use Start and for single-page applications that use TanStack Router. It provides:

- Automatic deduping of `title` and `meta` tags
- Automatic loading/unloading of tags based on route visibility
- A composable way to merge `title` and `meta` tags from nested routes

For full-stack applications that use Start, and even for single-page applications that use TanStack Router, managing the document head is a crucial part of any application for the following reasons:

- SEO
- Social media sharing
- Analytics
- CSS and JS loading/unloading

To manage the document head, it's required that you render both the `<HeadContent />` and `<Scripts />` components and use the `routeOptions.head` property to manage the head of a route, which returns an object with `title`, `meta`, `links`, `styles`, and `scripts` properties.

## Managing the Document Head

```tsx
export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        name: 'description',
        content: 'My App is a web application',
      },
      {
        title: 'My App',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
    styles: [
      {
        media: 'all and (max-width: 500px)',
        children: `p {
                  color: blue;
                  background-color: yellow;
                }`,
      },
    ],
    scripts: [
      {
        src: 'https://www.google-analytics.com/analytics.js',
      },
    ],
  }),
})
```

### Deduping

Out of the box, TanStack Router will dedupe `title` and `meta` tags, preferring the **last** occurrence of each tag found in nested routes.

- `title` tags defined in nested routes will override a `title` tag defined in a parent route (but you can compose them together, which is covered in a future section of this guide)
- `meta` tags with the same `name` or `property` will be overridden by the last occurrence of that tag found in nested routes

### `<HeadContent />`

The `<HeadContent />` component is **required** to render the head, title, meta, link, and head-related script tags of a document.

It should be **rendered either in the `<head>` tag of your root layout or as high up in the component tree as possible** if your application doesn't or can't manage the `<head>` tag.

For manifest-managed assets, you can also set `crossorigin` values on emitted
script preload and stylesheet links:

```tsx
<HeadContent assetCrossOrigin="anonymous" />

<HeadContent
  assetCrossOrigin={{
    script: 'anonymous',
    stylesheet: 'use-credentials',
  }}
/>
```

`assetCrossOrigin` only applies to manifest-managed asset links emitted by Start.
If you also set `crossOrigin` via `transformAssets` (either the object shorthand
or a callback return value), `assetCrossOrigin` wins.

### Start/Full-Stack Applications

<!-- ::start:framework -->

# React

```tsx
import { HeadContent } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  ),
})
```

# Solid

```tsx
import { HeadContent } from '@tanstack/solid-router'

export const Route = createRootRoute({
  component: () => (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  ),
})
```

<!-- ::end:framework -->

### Single-Page Applications

First, remove the `<title>` tag from the index.html if you have set any.

<!-- ::start:framework -->

# React

```tsx
import { HeadContent } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
})
```

# Solid

```tsx
import { HeadContent } from '@tanstack/solid-router'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
})
```

<!-- ::end:framework -->

## Managing Body Scripts

In addition to scripts that can be rendered in the `<head>` tag, you can also render scripts in the `<body>` tag using the `routeOptions.scripts` property. This is useful for loading scripts (even inline scripts) that require the DOM to be loaded, but before the main entry point of your application (which includes hydration if you're using Start or a full-stack implementation of TanStack Router).

To do this, you must:

- Use the `scripts` property of the `routeOptions` object
- [Render the `<Scripts />` component](#scripts)

```tsx
export const Route = createRootRoute({
  scripts: () => [
    {
      children: 'console.log("Hello, world!")',
    },
  ],
})
```

### `<Scripts />`

The `<Scripts />` component is **required** to render the body scripts of a document. It should be rendered either in the `<body>` tag of your root layout or as high up in the component tree as possible if your application doesn't or can't manage the `<body>` tag.

### Example

<!-- ::start:framework -->

# React

```tsx
import { createRootRoute, Scripts } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  component: () => (
    <html>
      <head />
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

# Solid

```tsx
import { createFileRoute, Scripts } from '@tanstack/solid-router'
export const Route = createRootRoute('/')({
  component: () => (
    <html>
      <head />
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

<!-- ::end:framework -->

## Inline Scripts with ScriptOnce

For scripts that must run before React hydrates (like theme detection), use `ScriptOnce`. This is particularly useful for avoiding flash of unstyled content (FOUC) or theme flicker.

<!-- ::start:framework -->

# React

```tsx
import { ScriptOnce } from '@tanstack/react-router'

const themeScript = `(function() {
  try {
    const theme = localStorage.getItem('theme') || 'auto';
    const resolved = theme === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.add(resolved);
  } catch (e) {}
})();`

function ThemeProvider({ children }) {
  return (
    <>
      <ScriptOnce children={themeScript} />
      {children}
    </>
  )
}
```

# Solid

```tsx
import { ScriptOnce } from '@tanstack/solid-router'

const themeScript = `(function() {
  try {
    const theme = localStorage.getItem('theme') || 'auto';
    const resolved = theme === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.add(resolved);
  } catch (e) {}
})();`

function ThemeProvider({ children }) {
  return (
    <>
      <ScriptOnce children={themeScript} />
      {children}
    </>
  )
}
```

<!-- ::end:framework -->

### How ScriptOnce Works

1. During SSR, renders a `<script>` tag with the provided code
2. The script executes immediately when the browser parses the HTML (before React hydrates)
3. After execution, the script removes itself from the DOM
4. On client-side navigation, nothing is rendered (prevents duplicate execution)

<!-- ::start:framework -->

# React

### Preventing Hydration Warnings

If your script modifies the DOM before hydration (like adding a class to `<html>`), use `suppressHydrationWarning` to prevent React warnings:

```tsx
export const Route = createRootRoute({
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  ),
})
```

<!-- ::end:framework -->

### Common Use Cases

- **Theme/dark mode detection** - Apply theme class before hydration to prevent flash
- **Feature detection** - Check browser capabilities before rendering
- **Analytics initialization** - Initialize tracking before user interaction
- **Critical path setup** - Any JavaScript that must run before hydration

---
title: Navigation Blocking
---

Navigation blocking is a way to prevent navigation from happening. This is typical if a user attempts to navigate while they:

- Have unsaved changes
- Are in the middle of a form
- Are in the middle of a payment

In these situations, a prompt or custom UI should be shown to the user to confirm they want to navigate away.

- If the user confirms, navigation will continue as normal
- If the user cancels, all pending navigations will be blocked

## How does navigation blocking work?

Navigation blocking adds one or more layers of "blockers" to the entire underlying history API. If any blockers are present, navigation will be paused via one of the following ways:

- Custom UI
  - If the navigation is triggered by something we control at the router level, we can allow you to perform any task or show any UI you'd like to the user to confirm the action. Each blocker's `blocker` function will be asynchronously and sequentially executed. If any blocker function resolves or returns `true`, the navigation will be allowed and all other blockers will continue to do the same until all blockers have been allowed to proceed. If any single blocker resolves or returns `false`, the navigation will be canceled and the rest of the `blocker` functions will be ignored.
- The `onbeforeunload` event
  - For page events that we cannot control directly, we rely on the browser's `onbeforeunload` event. If the user attempts to close the tab or window, refresh, or "unload" the page assets in any way, the browser's generic "Are you sure you want to leave?" dialog will be shown. If the user confirms, all blockers will be bypassed and the page will unload. If the user cancels, the unload will be cancelled, and the page will remain as is.

## How do I use navigation blocking?

There are 2 ways to use navigation blocking:

- Hook/logical-based blocking
- Component-based blocking

## Hook/logical-based blocking

Let's imagine we want to prevent navigation if a form is dirty. We can do this by using the `useBlocker` hook:

<!-- ::start:framework -->

# React

```tsx
import { useBlocker } from '@tanstack/react-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  useBlocker({
    shouldBlockFn: () => {
      if (!formIsDirty) return false

      const shouldLeave = confirm('Are you sure you want to leave?')
      return !shouldLeave
    },
  })

  // ...
}
```

# Solid

```tsx
import { useBlocker } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = createSignal(false)

  useBlocker({
    shouldBlockFn: () => {
      if (!formIsDirty()) return false

      const shouldLeave = confirm('Are you sure you want to leave?')
      return !shouldLeave
    },
  })

  // ...
}
```

<!-- ::end:framework -->

`shouldBlockFn` gives you type safe access to the `current` and `next` location:

<!-- ::start:framework -->

# React

```tsx
import { useBlocker } from '@tanstack/react-router'

function MyComponent() {
  // always block going from /foo to /bar/123?hello=world
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      return (
        current.routeId === '/foo' &&
        next.fullPath === '/bar/$id' &&
        next.params.id === 123 &&
        next.search.hello === 'world'
      )
    },
    withResolver: true,
  })

  // ...
}
```

# Solid

```tsx
import { useBlocker } from '@tanstack/solid-router'

function MyComponent() {
  // always block going from /foo to /bar/123?hello=world
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      return (
        current.routeId === '/foo' &&
        next.fullPath === '/bar/$id' &&
        next.params.id === 123 &&
        next.search.hello === 'world'
      )
    },
    withResolver: true,
  })

  // ...
}
```

<!-- ::end:framework -->

Note that even if `shouldBlockFn` returns `false`, the browser's `beforeunload` event may still be triggered on page reloads or tab closing. To gain control over this, you can use the `enableBeforeUnload` option to conditionally register the `beforeunload` handler:

<!-- ::start:framework -->

# React

```tsx
import { useBlocker } from '@tanstack/react-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  useBlocker({
    {/* ... */}
    enableBeforeUnload: formIsDirty, // or () => formIsDirty
  })

  // ...
}
```

# Solid

```tsx
import { useBlocker } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  useBlocker({
    {/* ... */}
    enableBeforeUnload: formIsDirty(),
  })

  // ...
}
```

<!-- ::end:framework -->

You can find more information about the `useBlocker` hook in the [API reference](../api/router/useBlockerHook.md).

## Component-based blocking

In addition to logical/hook based blocking, you can use the `Block` component to achieve similar results:

<!-- ::start:framework -->

# React

```tsx
import { Block } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  return (
    <Block
      shouldBlockFn={() => {
        if (!formIsDirty) return false

        const shouldLeave = confirm('Are you sure you want to leave?')
        return !shouldLeave
      }}
      enableBeforeUnload={formIsDirty}
    />
  )

  // OR

  return (
    <Block
      shouldBlockFn={() => formIsDirty}
      enableBeforeUnload={formIsDirty}
      withResolver
    >
      {({ status, proceed, reset }) => <>{/* ... */}</>}
    </Block>
  )
}
```

# Solid

```tsx
import { Block } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = createSignal(false)

  return (
    <Block
      shouldBlockFn={() => {
        if (!formIsDirty()) return false

        const shouldLeave = confirm('Are you sure you want to leave?')
        return !shouldLeave
      }}
    />
  )

  // OR

  return (
    <Block shouldBlockFn={() => !formIsDirty} withResolver>
      {({ status, proceed, reset }) => <>{/* ... */}</>}
    </Block>
  )
}
```

<!-- ::end:framework -->

## How can I show a custom UI?

In most cases, using `window.confirm` in the `shouldBlockFn` function with `withResolver: false` in the hook is enough since it will clearly show the user that the navigation is being blocked and resolve the blocking based on their response.

However, in some situations, you might want to show a custom UI that is intentionally less disruptive and more integrated with your app's design.

**Note:** The return value of `shouldBlockFn` does not resolve the blocking if `withResolver` is `true`.

### Hook/logical-based custom UI with resolver

<!-- ::start:framework -->

# React

```tsx
import { useBlocker } from '@tanstack/react-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => formIsDirty,
    withResolver: true,
  })

  // ...

  return (
    <>
      {/* ... */}
      {status === 'blocked' && (
        <div>
          <p>Are you sure you want to leave?</p>
          <button onClick={proceed}>Yes</button>
          <button onClick={reset}>No</button>
        </div>
      )}
    </>
}
```

# Solid

```tsx
import { useBlocker } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = createSignal(false)

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => formIsDirty(),
    withResolver: true,
  })

  // ...

  return (
    <>
      {/* ... */}
      {status === 'blocked' && (
        <div>
          <p>Are you sure you want to leave?</p>
          <button onClick={proceed}>Yes</button>
          <button onClick={reset}>No</button>
        </div>
      )}
    </>
}
```

<!-- ::end:framework -->

### Hook/logical-based custom UI without resolver

<!-- ::start:framework -->

# React

```tsx
import { useBlocker } from '@tanstack/react-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  useBlocker({
    shouldBlockFn: () => {
      if (!formIsDirty) {
        return false
      }

      const shouldBlock = new Promise<boolean>((resolve) => {
        // Using a modal manager of your choice
        modals.open({
          title: 'Are you sure you want to leave?',
          children: (
            <SaveBlocker
              confirm={() => {
                modals.closeAll()
                resolve(false)
              }}
              reject={() => {
                modals.closeAll()
                resolve(true)
              }}
            />
          ),
          onClose: () => resolve(true),
        })
      })
      return shouldBlock
    },
  })

  // ...
}
```

# Solid

```tsx
import { useBlocker } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = createSignal(false)

  useBlocker({
    shouldBlockFn: () => {
      if (!formIsDirty()) {
        return false
      }

      const shouldBlock = new Promise<boolean>((resolve) => {
        // Using a modal manager of your choice
        modals.open({
          title: 'Are you sure you want to leave?',
          children: (
            <SaveBlocker
              confirm={() => {
                modals.closeAll()
                resolve(false)
              }}
              reject={() => {
                modals.closeAll()
                resolve(true)
              }}
            />
          ),
          onClose: () => resolve(true),
        })
      })
      return shouldBlock
    },
  })

  // ...
}
```

<!-- ::end:framework -->

### Component-based custom UI

Similarly to the hook, the `Block` component returns the same state and functions as render props:

<!-- ::start:framework -->

# React

```tsx
import { Block } from '@tanstack/react-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  return (
    <Block shouldBlockFn={() => formIsDirty} withResolver>
      {({ status, proceed, reset }) => (
        <>
          {/* ... */}
          {status === 'blocked' && (
            <div>
              <p>Are you sure you want to leave?</p>
              <button onClick={proceed}>Yes</button>
              <button onClick={reset}>No</button>
            </div>
          )}
        </>
      )}
    </Block>
  )
}
```

# Solid

```tsx
import { Block } from '@tanstack/solid-router'

function MyComponent() {
  const [formIsDirty, setFormIsDirty] = createSignal(false)

  return (
    <Block shouldBlockFn={() => formIsDirty()} withResolver>
      {({ status, proceed, reset }) => (
        <>
          {/* ... */}
          {status === 'blocked' && (
            <div>
              <p>Are you sure you want to leave?</p>
              <button onClick={proceed}>Yes</button>
              <button onClick={reset}>No</button>
            </div>
          )}
        </>
      )}
    </Block>
  )
}
```

<!-- ::end:framework -->

---
title: History Types
---

While it's not required to know the `@tanstack/history` API itself to use TanStack Router, it's a good idea to understand how it works. Under the hood, TanStack Router requires and uses a `history` abstraction to manage the routing history.

If you don't create a history instance, a browser-oriented instance of this API is created for you when the router is initialized. If you need a special history API type, You can use the `@tanstack/history` package to create your own:

- `createBrowserHistory`: The default history type.
- `createHashHistory`: A history type that uses a hash to track history.
- `createMemoryHistory`: A history type that keeps the history in memory.

Once you have a history instance, you can pass it to the `Router` constructor:

<!-- ::start:framework -->

# React

```ts
import { createMemoryHistory, createRouter } from '@tanstack/react-router'

const memoryHistory = createMemoryHistory({
  initialEntries: ['/'], // Pass your initial url
})

const router = createRouter({ routeTree, history: memoryHistory })
```

# Solid

```ts
import { createMemoryHistory, createRouter } from '@tanstack/solid-router'

const memoryHistory = createMemoryHistory({
  initialEntries: ['/'], // Pass your initial url
})

const router = createRouter({ routeTree, history: memoryHistory })
```

<!-- ::end:framework -->

## Browser Routing

The `createBrowserHistory` is the default history type. It uses the browser's history API to manage the browser history.

## Hash Routing

Hash routing can be helpful if your server doesn't support rewrites to index.html for HTTP requests (among other environments that don't have a server).

<!-- ::start:framework -->

# React

```ts
import { createHashHistory, createRouter } from '@tanstack/react-router'

const hashHistory = createHashHistory()

const router = createRouter({ routeTree, history: hashHistory })
```

# Solid

```ts
import { createHashHistory, createRouter } from '@tanstack/solid-router'

const hashHistory = createHashHistory()

const router = createRouter({ routeTree, history: hashHistory })
```

<!-- ::end:framework -->

## Memory Routing

Memory routing is useful in environments that are not a browser or when you do not want components to interact with the URL.

<!-- ::start:framework -->

# React

```ts
import { createMemoryHistory, createRouter } from '@tanstack/react-router'

const memoryHistory = createMemoryHistory({
  initialEntries: ['/'], // Pass your initial url
})

const router = createRouter({ routeTree, history: memoryHistory })
```

# Solid

```ts
import { createMemoryHistory, createRouter } from '@tanstack/solid-router'

const memoryHistory = createMemoryHistory({
  initialEntries: ['/'], // Pass your initial url
})

const router = createRouter({ routeTree, history: memoryHistory })
```

<!-- ::end:framework -->

Refer to the [SSR Guide](./ssr.md#automatic-server-history) for usage on the server for server-side rendering.

---
title: Router Context
---

TanStack Router's router context is a very powerful tool that can be used for dependency injection among many other things. Aptly named, the router context is passed through the router and down through each matching route. At each route in the hierarchy, the context can be modified or added to. Here's a few ways you might use the router context practically:

- Dependency Injection
  - You can supply dependencies (e.g. a loader function, a data fetching client, a mutation service) which the route and all child routes can access and use without importing or creating directly.
- Breadcrumbs
  - While the main context object for each route is merged as it descends, each route's unique context is also stored making it possible to attach breadcrumbs or methods to each route's context.
- Dynamic meta tag management
  - You can attach meta tags to each route's context and then use a meta tag manager to dynamically update the meta tags on the page as the user navigates the site.

These are just suggested uses of the router context. You can use it for whatever you want!

## Typed Router Context

Like everything else, the root router context is strictly typed. This type can be augmented via any route's `beforeLoad` option as it is merged down the route match tree. To constrain the type of the root router context, you must use the `createRootRouteWithContext<YourContextTypeHere>()(routeOptions)` function to create a new router context instead of the `createRootRoute()` function to create your root route. Here's an example:

<!-- ::start:framework -->

# React

```tsx
import {
  createRootRouteWithContext,
  createRouter,
} from '@tanstack/react-router'

interface MyRouterContext {
  user: User
}

// Use the routerContext to create your root route
const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})

const routeTree = rootRoute.addChildren([
  // ...
])

// Use the routerContext to create your router
const router = createRouter({
  routeTree,
})
```

# Solid

```tsx
import {
  createRootRouteWithContext,
  createRouter,
} from '@tanstack/solid-router'

interface MyRouterContext {
  user: User
}

// Use the routerContext to create your root route
const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})

const routeTree = rootRoute.addChildren([
  // ...
])

// Use the routerContext to create your router
const router = createRouter({
  routeTree,
})
```

<!-- ::end:framework -->

> [!TIP]
> `MyRouterContext` only needs to contain content that will be passed directly to `createRouter` below. All other context added in `beforeLoad` will be inferred.

## Passing the initial Router Context

The router context is passed to the router at instantiation time. You can pass the initial router context to the router via the `context` option:

> [!TIP]
> If your context has any required properties, you will see a TypeScript error if you don't pass them in the initial router context. If all of your context properties are optional, you will not see a TypeScript error and passing the context will be optional. If you don't pass a router context, it defaults to `{}`.

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

// Use the routerContext you created to create your router
const router = createRouter({
  routeTree,
  context: {
    user: {
      id: '123',
      name: 'John Doe',
    },
  },
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

// Use the routerContext you created to create your router
const router = createRouter({
  routeTree,
  context: {
    user: {
      id: '123',
      name: 'John Doe',
    },
  },
})
```

<!-- ::end:framework -->

### Invalidating the Router Context

If you need to invalidate the context state you are passing into the router, you can call the `invalidate` method to tell the router to recompute the context. This is useful when you need to update the context state and have the router recompute the context for all routes.

<!-- ::start:framework -->

# React

```tsx
function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      router.invalidate()
    })

    return unsubscribe
  }, [])

  return user
}
```

# Solid

```tsx
function useAuth() {
  const router = useRouter()
  const [user, setUser] = createSignal<User | null>(null)

  createEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      router.invalidate()
    })

    return unsubscribe
  }, [])

  return user()
}
```

<!-- ::end:framework -->

## Using the Router Context

Once you have defined the router context type, you can use it in your route definitions:

```tsx
// src/routes/todos.tsx
export const Route = createFileRoute('/todos')({
  component: Todos,
  loader: ({ context }) => fetchTodosByUserId(context.user.id),
})
```

You can even inject data fetching and mutation implementations themselves! In fact, this is highly recommended 😜

Let's try this with a simple function to fetch some todos:

```tsx
const fetchTodosByUserId = async ({ userId }) => {
  const response = await fetch(`/api/todos?userId=${userId}`)
  const data = await response.json()
  return data
}

const router = createRouter({
  routeTree: rootRoute,
  context: {
    userId: '123',
    fetchTodosByUserId,
  },
})
```

Then, in your route:

```tsx
// src/routes/todos.tsx
export const Route = createFileRoute('/todos')({
  component: Todos,
  loader: ({ context }) => context.fetchTodosByUserId(context.userId),
})
```

### How about an external data fetching library?

<!-- ::start:framework -->

# React

```tsx
import {
  createRootRouteWithContext,
  createRouter,
} from '@tanstack/react-router'

interface MyRouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})

const queryClient = new QueryClient()

const router = createRouter({
  routeTree: rootRoute,
  context: {
    queryClient,
  },
})
```

# Solid

```tsx
import {
  createRootRouteWithContext,
  createRouter,
} from '@tanstack/solid-router'

interface MyRouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})

const queryClient = new QueryClient()

const router = createRouter({
  routeTree: rootRoute,
  context: {
    queryClient,
  },
})
```

<!-- ::end:framework -->

Then, in your route:

```tsx
// src/routes/todos.tsx
export const Route = createFileRoute('/todos')({
  component: Todos,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['todos', { userId: user.id }],
      queryFn: fetchTodos,
    })
  },
})
```

<!-- ::start:framework -->

# React

## How about using React Context/Hooks?

When trying to use React Context or Hooks in your route's `beforeLoad` or `loader` functions, it's important to remember React's [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks). You can't use hooks in a non-React function, so you can't use hooks in your `beforeLoad` or `loader` functions.

So, how do we use React Context or Hooks in our route's `beforeLoad` or `loader` functions? We can use the router context to pass down the React Context or Hooks to our route's `beforeLoad` or `loader` functions.

Let's look at the setup for an example, where we pass down a `useNetworkStrength` hook to our route's `loader` function:

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/__root.tsx"
// First, make sure the context for the root route is typed
import { createRootRouteWithContext } from '@tanstack/react-router'
import { useNetworkStrength } from '@/hooks/useNetworkStrength'

interface MyRouterContext {
  networkStrength: ReturnType<typeof useNetworkStrength>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})
```

<!-- ::end:tabs -->

In this example, we'd instantiate the hook before rendering the router using the `<RouterProvider />`. This way, the hook would be called in React-land, therefore adhering to the Rules of Hooks.

<!-- ::start:tabs variant="files" -->

```tsx title="src/router.tsx"
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    networkStrength: undefined!, // We'll set this in React-land
  },
})
```

<!-- ::end:tabs -->

Then, we can call the `useNetworkStrength` hook in our `App` component and pass the returned value into the router context via the `<RouterProvider />`:

<!-- ::start:tabs variant="files" -->

```tsx title="src/main.tsx"
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

import { useNetworkStrength } from '@/hooks/useNetworkStrength'

function App() {
  const networkStrength = useNetworkStrength()
  // Inject the returned value from the hook into the router context
  return <RouterProvider router={router} context={{ networkStrength }} />
}

// ...
```

<!-- ::end:tabs -->

So, now in our route's `loader` function, we can access the `networkStrength` hook from the router context:

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/posts.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  component: Posts,
  loader: ({ context }) => {
    if (context.networkStrength === 'STRONG') {
      // Do something
    }
  },
})
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

## Modifying the Router Context

The router context is passed down the route tree and is merged at each route. This means that you can modify the context at each route and the modifications will be available to all child routes. Here's an example:

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/__root.tsx"
import { createRootRouteWithContext } from '@tanstack/react-router'

interface MyRouterContext {
  foo: boolean
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title="src/router.tsx"
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: {
    foo: true,
  },
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/todos.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/todos')({
  component: Todos,
  beforeLoad: () => {
    return {
      bar: true,
    }
  },
  loader: ({ context }) => {
    context.foo // true
    context.bar // true
  },
})
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/__root.tsx"
import { createRootRouteWithContext } from '@tanstack/solid-router'

interface MyRouterContext {
  foo: boolean
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title="src/router.tsx"
import { createRouter } from '@tanstack/solid-router'

import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: {
    foo: true,
  },
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/todos.tsx"
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/todos')({
  component: Todos,
  beforeLoad: () => {
    return {
      bar: true,
    }
  },
  loader: ({ context }) => {
    context.foo // true
    context.bar // true
  },
})
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

## Processing Accumulated Route Context

Context, especially the isolated route `context` objects, make it trivial to accumulate and process the route context objects for all matched routes. Here's an example where we use all of the matched route contexts to generate a breadcrumb trail:

```tsx title="src/routes/__root.tsx"
export const Route = createRootRoute({
  component: () => {
    const matches = useRouterState({ select: (s) => s.matches })

    const breadcrumbs = matches
      .filter((match) => match.context.getTitle)
      .map(({ pathname, context }) => {
        return {
          title: context.getTitle(),
          path: pathname,
        }
      })

    // ...
  },
})
```

Using that same route context, we could also generate a title tag for our page's `<head>`:

```tsx title="src/routes/__root.tsx"
export const Route = createRootRoute({
  component: () => {
    const matches = useRouterState({ select: (s) => s.matches })

    const matchWithTitle = [...matches]
      .reverse()
      .find((d) => d.context.getTitle)

    const title = matchWithTitle?.context.getTitle() || 'My App'

    return (
      <html>
        <head>
          <title>{title}</title>
        </head>
        <body>{/* ... */}</body>
      </html>
    )
  },
})
```

---
title: Not Found Errors
---

> ⚠️ This page covers the newer `notFound` function and `notFoundComponent` API for handling not found errors. The `NotFoundRoute` route is deprecated and will be removed in a future release. See [Migrating from `NotFoundRoute`](#migrating-from-notfoundroute) for more information.

## Overview

There are 2 uses for not-found errors in TanStack Router:

- **Non-matching route paths**: When a path does not match any known route matching pattern **OR** when it partially matches a route, but with extra path segments
  - The **router** will automatically throw a not-found error when a path does not match any known route matching pattern
  - If the router's `notFoundMode` is set to `fuzzy`, the nearest matching route with a `notFoundComponent` will handle the error. If the router's `notFoundMode` is set to `root`, the root route will handle the error.
  - Examples:
    - Attempting to access `/users` when there is no `/users` route
    - Attempting to access `/posts/1/edit` when the route tree only handles `/posts/$postId`
- **Missing resources**: When a resource cannot be found, such as a post with a given ID or any asynchronous data that is not available or does not exist
  - **You, the developer** must throw a not-found error when a resource cannot be found. This can be done in the `beforeLoad` or `loader` functions using the `notFound` utility.
  - Will be handled by the nearest matching route with a `notFoundComponent` (when `notFound` is called within `loader`) or the root route.
  - Examples:
    - Attempting to access `/posts/1` when the post with ID 1 does not exist
    - Attempting to access `/docs/path/to/document` when the document does not exist

Under the hood, both of these cases are implemented using the same `notFound` function and `notFoundComponent` API.

## The `notFoundMode` option

When TanStack Router encounters a **pathname** that doesn't match any known route pattern **OR** partially matches a route pattern but with extra trailing pathname segments, it will automatically throw a not-found error.

Depending on the `notFoundMode` option, the router will handle these automatic errors differently:

- ["fuzzy" mode](#notfoundmode-fuzzy) (default): The router will intelligently find the closest matching suitable route and display the `notFoundComponent`.
- ["root" mode](#notfoundmode-root): All not-found errors will be handled by the root route's `notFoundComponent`, regardless of the nearest matching route.

### `notFoundMode: 'fuzzy'`

By default, the router's `notFoundMode` is set to `fuzzy`, which indicates that if a pathname doesn't match any known route, the router will attempt to use the closest matching route with a configured `notFoundComponent`.

> **❓ Why is this the default?** Fuzzy matching to preserve as much parent layout as possible for the user gives them more context to navigate to a useful location based on where they thought they would arrive.

The nearest suitable route is found using the following criteria:

- The route must have a `notFoundComponent` configured or the router must have a `defaultNotFoundComponent` configured

For example, consider the following route tree:

- `__root__` (has a `notFoundComponent` configured)
  - `posts` (has a `notFoundComponent` configured)
    - `$postId` (has a `notFoundComponent` configured)

If provided the path of `/posts/1/edit`, the following component structure will be rendered:

- `<Root>`
  - `<Posts>`
    - `<Post>`
      - `<Post.notFoundComponent>`

The `notFoundComponent` of the `$postId` route will be rendered because it is the **nearest matching route with a `notFoundComponent` configured**.

### `notFoundMode: 'root'`

When `notFoundMode` is set to `root`, all not-found errors will be handled by the root route's `notFoundComponent` instead of bubbling up from the nearest fuzzy-matched route.

For example, consider the following route tree:

- `__root__` (has a `notFoundComponent` configured)
  - `posts` (has a `notFoundComponent` configured)
    - `$postId` (has a `notFoundComponent` configured)

If provided the path of `/posts/1/edit`, the following component structure will be rendered:

- `<Root>`
  - `<Root.notFoundComponent>`

The `notFoundComponent` of the `__root__` route will be rendered because the `notFoundMode` is set to `root`.

## Configuring a route's `notFoundComponent`

To handle both types of not-found errors, you can attach a `notFoundComponent` to a route. This component will be rendered when a not-found error is thrown.

For example, configuring a `notFoundComponent` for a `/settings` route to handle non-existing settings pages:

```tsx
export const Route = createFileRoute('/settings')({
  component: () => {
    return (
      <div>
        <p>Settings page</p>
        <Outlet />
      </div>
    )
  },
  notFoundComponent: () => {
    return <p>This setting page doesn't exist!</p>
  },
})
```

Or configuring a `notFoundComponent` for a `/posts/$postId` route to handle posts that don't exist:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    const post = await getPost(postId)
    if (!post) throw notFound()
    return { post }
  },
  component: ({ post }) => {
    return (
      <div>
        <h1>{post.title}</h1>
        <p>{post.body}</p>
      </div>
    )
  },
  notFoundComponent: () => {
    return <p>Post not found!</p>
  },
})
```

## Default Router-Wide Not Found Handling

You may want to provide a default not-found component for every route in your app with child routes.

> Why only routes with children? **Leaf-node routes (routes without children) will never render an `Outlet` and therefore are not able to handle not-found errors.**

To do this, pass a `defaultNotFoundComponent` to the `createRouter` function:

```tsx
const router = createRouter({
  defaultNotFoundComponent: () => {
    return (
      <div>
        <p>Not found!</p>
        <Link to="/">Go home</Link>
      </div>
    )
  },
})
```

## Throwing your own `notFound` errors

You can manually throw not-found errors in loader methods and components using the `notFound` function. This is useful when you need to signal that a resource cannot be found.

The `notFound` function works in a similar fashion to the `redirect` function. To cause a not-found error, you can **throw a `notFound()`**.

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    // Returns `null` if the post doesn't exist
    const post = await getPost(postId)
    if (!post) {
      throw notFound()
      // Alternatively, you can make the notFound function throw:
      // notFound({ throw: true })
    }
    // Post is guaranteed to be defined here because we threw an error
    return { post }
  },
})
```

The not-found error above will be handled by the same route or nearest parent route that has either a `notFoundComponent` route option or the `defaultNotFoundComponent` router option configured.

If neither the route nor any suitable parent route is found to handle the error, the root route will handle it using TanStack Router's **extremely basic (and purposefully undesirable)** default not-found component that simply renders `<p>Not Found</p>`. It's highly recommended to either attach at least one `notFoundComponent` to the root route or configure a router-wide `defaultNotFoundComponent` to handle not-found errors.

> ⚠️ When you throw `notFound()` in `beforeLoad`, TanStack Router resolves it the same way as other not-found errors:
>
> - If you pass `routeId`, that route (or the nearest valid ancestor boundary) handles it.
> - If you don't pass `routeId`, the nearest route/ancestor with a `notFoundComponent` handles it (based on the router's mode and matching rules).
> - If no suitable boundary is found, handling falls back to the root/default not-found behavior.
>
> For `beforeLoad`-thrown not-found errors, TanStack Router still runs required parent loaders so the selected not-found boundary can render with the loader data it depends on.

## Specifying Which Routes Handle Not Found Errors

Sometimes you may want to trigger a not-found on a specific parent route and bypass the normal not-found component propagation. To do this, pass in a route id to the `route` option in the `notFound` function.

```tsx
// _pathlessLayout.tsx
export const Route = createFileRoute('/_pathlessLayout')({
  // This will render
  notFoundComponent: () => {
    return <p>Not found (in _pathlessLayout)</p>
  },
  component: () => {
    return (
      <div>
        <p>This is a pathless layout route!</p>
        <Outlet />
      </div>
    )
  },
})

// _pathlessLayout/route-a.tsx
export const Route = createFileRoute('/_pathless/route-a')({
  loader: async () => {
    // This will make LayoutRoute handle the not-found error
    throw notFound({ routeId: '/_pathlessLayout' })
    //                      ^^^^^^^^^ This will autocomplete from the registered router
  },
  // This WILL NOT render
  notFoundComponent: () => {
    return <p>Not found (in _pathlessLayout/route-a)</p>
  },
})
```

### Manually targeting the root route

You can also target the root route by passing the exported `rootRouteId` variable to the `notFound` function's `route` property:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    const post = await getPost(postId)
    if (!post) throw notFound({ routeId: rootRouteId })
    return { post }
  },
})
```

### Throwing Not Found Errors in Components

You can also throw not-found errors in components. However, **it is recommended to throw not-found errors in loader methods instead of components in order to correctly type loader data and prevent flickering.**

TanStack Router exposes a `CatchNotFound` component similar to `CatchBoundary` that can be used to catch not-found errors in components and display UI accordingly.

### Data Loading Inside `notFoundComponent`

`notFoundComponent` is a special case when it comes to data loading. **`SomeRoute.useLoaderData` may not be defined depending on which route you are trying to access and where the not-found error gets thrown**. However, `Route.useParams`, `Route.useSearch`, `Route.useRouteContext`, etc. will return a defined value.

**If you need to pass incomplete loader data to `notFoundComponent`,** pass the data via the `data` option in the `notFound` function and validate it in `notFoundComponent`.

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    const post = await getPost(postId)
    if (!post)
      throw notFound({
        // Forward some data to the notFoundComponent
        // data: someIncompleteLoaderData
      })
    return { post }
  },
  // `data: unknown` is passed to the component via the `data` option when calling `notFound`
  notFoundComponent: ({ data }) => {
    // ❌ useLoaderData is not valid here: const { post } = Route.useLoaderData()

    // ✅:
    const { postId } = Route.useParams()
    const search = Route.useSearch()
    const context = Route.useRouteContext()

    return <p>Post with id {postId} not found!</p>
  },
})
```

## Usage With SSR

See [SSR guide](./ssr.md) for more information.

## Migrating from `NotFoundRoute`

The `NotFoundRoute` API is deprecated in favor of `notFoundComponent`. The `NotFoundRoute` API will be removed in a future release.

**The `notFound` function and `notFoundComponent` will not work when using `NotFoundRoute`.**

The main differences are:

- `NotFoundRoute` is a route that requires an `<Outlet>` on its parent route to render. `notFoundComponent` is a component that can be attached to any route.
- When using `NotFoundRoute`, you can't use layouts. `notFoundComponent` can be used with layouts.
- When using `notFoundComponent`, path matching is strict. This means that if you have a route at `/post/$postId`, a not-found error will be thrown if you try to access `/post/1/2/3`. With `NotFoundRoute`, `/post/1/2/3` would match the `NotFoundRoute` and only render it if there is an `<Outlet>`.

To migrate from `NotFoundRoute` to `notFoundComponent`, you'll just need to make a few changes:

```tsx title='src/router.tsx'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen.'
- import { notFoundRoute } from './notFoundRoute'  // [!code --]

export const router = createRouter({
  routeTree,
- notFoundRoute // [!code --]
})

// routes/__root.tsx
import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  // ...
+ notFoundComponent: () => {  // [!code ++]
+   return <p>Not found!</p>  // [!code ++]
+ } // [!code ++]
})
```

Important changes:

- A `notFoundComponent` is added to the root route for global not-found handling.
  - You can also add a `notFoundComponent` to any other route in your route tree to handle not-found errors for that specific route.
- The `notFoundComponent` does not support rendering an `<Outlet>`.

---
id: authenticated-routes
title: Authenticated Routes
---

Authentication is an extremely common requirement for web applications. In this guide, we'll walk through how to use TanStack Router to build protected routes, and how to redirect users to login if they try to access them.

> **A route guard is not a data authorization boundary.** This guide shows how to gate a route's UI behind `beforeLoad`. Any server function, server route, or API endpoint that returns private data must authorize the request itself, because it can be requested independently of the route that calls it. See [Authentication Server Primitives](../../start/framework/react/guide/authentication-server-primitives.md) in the Start docs.

## The `route.beforeLoad` Option

The `route.beforeLoad` option allows you to specify a function that will be called before a route is loaded. It receives all of the same arguments that the `route.loader` function does. This is a great place to check if a user is authenticated, and redirect them to a login page if they are not.

The `beforeLoad` function runs in relative order to these other route loading functions:

- Route Matching (Top-Down)
  - `route.params.parse`
  - `route.validateSearch`
- Route Loading (including Preloading)
  - **`route.beforeLoad`**
  - `route.onError`
- Route Loading (Parallel)
  - `route.component.preload?`
  - `route.load`

**It's important to know that the `beforeLoad` function for a route is called _before any of its child routes' `beforeLoad` functions_.** It is essentially a middleware function for the route and all of its children.

**If you throw an error in `beforeLoad`, none of its children will attempt to load**.

## Redirecting

While not required, some authentication flows require redirecting to a login page. To do this, you can **throw a `redirect()`** from `beforeLoad`:

```tsx
// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: {
          // Use the current location to power a redirect after login
          // (Do not use `router.state.resolvedLocation` as it can
          // potentially lag behind the actual current location)
          redirect: location.href,
        },
      })
    }
  },
})
```

> [!TIP]
> The `redirect()` function takes all of the same options as the `navigate` function, so you can pass options like `replace: true` if you want to replace the current history entry instead of adding a new one.

### Handling Auth Check Failures

If your authentication check can throw errors (network failures, token validation, etc.), wrap it in try/catch:

<!-- ::start:framework -->

# React

```tsx
import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'

// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      const user = await verifySession() // might throw on network error
      if (!user) {
        throw redirect({
          to: '/login',
          search: { redirect: location.href },
        })
      }
      return { user }
    } catch (error) {
      // Re-throw redirects (they're intentional, not errors)
      if (isRedirect(error)) throw error

      // Auth check failed (network error, etc.) - redirect to login
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})
```

# Solid

```tsx
import { createFileRoute, redirect, isRedirect } from '@tanstack/solid-router'

// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      const user = await verifySession() // might throw on network error
      if (!user) {
        throw redirect({
          to: '/login',
          search: { redirect: location.href },
        })
      }
      return { user }
    } catch (error) {
      // Re-throw redirects (they're intentional, not errors)
      if (isRedirect(error)) throw error

      // Auth check failed (network error, etc.) - redirect to login
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})
```

<!-- ::end:framework -->

The [`isRedirect()`](../api/router/isRedirectFunction.md) helper distinguishes between actual errors and intentional redirects.

Once you have authenticated a user, it's also common practice to redirect them back to the page they were trying to access. To do this, you can utilize the `redirect` search param that we added in our original redirect. Since we'll be replacing the entire URL with what it was, `router.history.push` is better suited for this than `router.navigate`:

```tsx
router.history.push(search.redirect)
```

## Non-Redirected Authentication

Some applications choose to not redirect users to a login page, and instead keep the user on the same page and show a login form that either replaces the main content or hides it via a modal. This is also possible with TanStack Router by simply short circuiting rendering the `<Outlet />` that would normally render the child routes:

```tsx
// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  component: () => {
    if (!isAuthenticated()) {
      return <Login />
    }

    return <Outlet />
  },
})
```

This keeps the user on the same page, but still allows you to render a login form. Once the user is authenticated, you can simply render the `<Outlet />` and the child routes will be rendered.

## Authentication using React context/hooks

If your authentication flow relies on interactions with React context and/or hooks, you'll need to pass down your authentication state to TanStack Router using `router.context` option.

> [!IMPORTANT]
> React hooks are not meant to be consumed outside of React components. If you need to use a hook outside of a React component, you need to extract the returned state from the hook in a component that wraps your `<RouterProvider />` and then pass the returned value down to TanStack Router.

We'll cover the `router.context` options in-detail in the [Router Context](./router-context.md) section.

Here's an example that uses React context and hooks for protecting authenticated routes in TanStack Router. See the entire working setup in the [Authenticated Routes example](https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes).

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/__root.tsx"
import { createRootRouteWithContext } from '@tanstack/react-router'

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthState
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
})
```

```tsx title="src/router.tsx"
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    // auth will initially be undefined
    // We'll be passing down the auth state from within a React component
    auth: undefined!,
  },
})
```

```tsx title="src/App.tsx"
import { RouterProvider } from '@tanstack/react-router'

import { AuthProvider, useAuth } from './auth'

import { router } from './router'

function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}

function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  )
}
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title="src/routes/__root.tsx"
import { createRootRouteWithContext } from '@tanstack/solid-router'

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthState
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
})
```

```tsx title="src/router.tsx"
import { createRouter } from '@tanstack/solid-router'

import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    // auth will initially be undefined
    // We'll be passing down the auth state from within a React component
    auth: undefined!,
  },
})
```

```tsx title="src/App.tsx"
import { RouterProvider } from '@tanstack/solid-router'

import { AuthProvider, useAuth } from './auth'

import { router } from './router'

function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}

function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  )
}
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

Then in the authenticated route, you can check the auth state using the `beforeLoad` function, and **throw a `redirect()`** to your **Login route** if the user is not signed-in.

<!-- ::start:framework -->

# React

```tsx title="src/routes/dashboard.route.tsx"
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})
```

# Solid

```tsx title="src/routes/dashboard.route.tsx"
import { createFileRoute, redirect } from '@tanstack/solid-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})
```

<!-- ::end:framework -->

You can _optionally_, also use the [Non-Redirected Authentication](#non-redirected-authentication) approach to show a login form instead of calling a **redirect**.

This approach can also be used in conjunction with Pathless or Layout Route to protect all routes under their parent route.

## Related How-To Guides

For detailed, step-by-step implementation guides, see:

- [How to Set Up Basic Authentication](../how-to/setup-authentication.md) - Complete setup with React Context and protected routes
- [How to Integrate Authentication Providers](../how-to/setup-auth-providers.md) - Use Auth0, Clerk, or Supabase
- [How to Set Up Role-Based Access Control](../how-to/setup-rbac.md) - Implement permissions and role-based routing

## Examples

Working authentication examples are available in the repository:

- [Basic Authentication Example](https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes) - Simple authentication with context
- [Firebase Authentication](https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes-firebase) - Firebase Auth integration
- [TanStack Start Auth Examples](https://github.com/TanStack/router/tree/main/examples/react) - Various auth implementations with TanStack Start
---
title: Static Route Data
---

When creating routes, you can optionally specify a `staticData` property in the route's options. This object can literally contain anything you want as long as it's synchronously available when you create your route.

In addition to being able to access this data from the route itself, you can also access it from any match under the `match.staticData` property.

## Example

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/posts.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  staticData: {
    customData: 'Hello!',
  },
})
```

<!-- ::end:tabs -->

You can then access this data anywhere you have access to your routes, including matches that can be mapped back to their routes.

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/__root.tsx'
import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => {
    const matches = useMatches()

    return (
      <div>
        {matches.map((match) => {
          return <div key={match.id}>{match.staticData.customData}</div>
        })}
      </div>
    )
  },
})
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/posts.tsx'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/posts')({
  staticData: {
    customData: 'Hello!',
  },
})
```

<!-- ::end:tabs -->

You can then access this data anywhere you have access to your routes, including matches that can be mapped back to their routes.

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/__root.tsx'
import { createRootRoute, useMatches } from '@tanstack/solid-router'
import { For } from 'solid-js'

export const Route = createRootRoute({
  component: () => {
    const matches = useMatches()

    return (
      <div>
        <For each={matches()}>
          {(match) => <div>{match.staticData.customData}</div>}
        </For>
      </div>
    )
  },
})
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

## Enforcing Static Data

If you want to enforce that a route has static data, you can use declaration merging to add a type to the route's static option:

<!-- ::start:framework -->

# React

```tsx
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    customData: string
  }
}
```

# Solid

```tsx
declare module '@tanstack/solid-router' {
  interface StaticDataRouteOption {
    customData: string
  }
}
```

<!-- ::end:framework -->

Now, if you try to create a route without the `customData` property, you'll get a type error:

```tsx
export const Route = createFileRoute('/posts')({
  staticData: {
    // Property 'customData' is missing in type '{ customData: number; }' but required in type 'StaticDataRouteOption'.ts(2741)
  },
})
```

## Optional Static Data

If you want to make static data optional, simply add a `?` to the property:

<!-- ::start:framework -->

# React

```tsx
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    customData?: string
  }
}
```

# Solid

```tsx
declare module '@tanstack/solid-router' {
  interface StaticDataRouteOption {
    customData?: string
  }
}
```

<!-- ::end:framework -->

As long as there are any required properties on the `StaticDataRouteOption`, you'll be required to pass in an object.

## Common Patterns

### Controlling Layout Visibility

Use staticData to control which routes show or hide layout elements:

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/admin/route.tsx'
export const Route = createFileRoute('/admin')({
  staticData: { showNavbar: false },
  component: AdminLayout,
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx
// routes/__root.tsx
function RootComponent() {
  const showNavbar = useMatches({
    select: (matches) =>
      !matches.some((m) => m.staticData?.showNavbar === false),
  })

  return showNavbar ? (
    <Navbar>
      <Outlet />
    </Navbar>
  ) : (
    <Outlet />
  )
}
```

<!-- ::end:tabs -->

### Route Titles for Breadcrumbs

<!-- ::start:framework -->

# React

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/posts/$postId.tsx'
export const Route = createFileRoute('/posts/$postId')({
  staticData: {
    getTitle: () => 'Post Details',
  },
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title='src/components/Breadcrumbs.tsx'
function Breadcrumbs() {
  const matches = useMatches()

  return (
    <nav>
      {matches
        .filter((m) => m.staticData?.getTitle)
        .map((m) => (
          <span key={m.id}>{m.staticData.getTitle()}</span>
        ))}
    </nav>
  )
}
```

<!-- ::end:tabs -->

# Solid

<!-- ::start:tabs variant="files" -->

```tsx title='src/routes/posts/$postId.tsx'
export const Route = createFileRoute('/posts/$postId')({
  staticData: {
    getTitle: () => 'Post Details',
  },
})
```

<!-- ::end:tabs -->

<!-- ::start:tabs variant="files" -->

```tsx title='src/components/Breadcrumbs.tsx'
import { useMatches } from '@tanstack/solid-router'
import { For } from 'solid-js'

function Breadcrumbs() {
  const matches = useMatches()

  return (
    <nav>
      <For each={matches().filter((m) => m.staticData?.getTitle)}>
        {(m) => <span>{m.staticData.getTitle()}</span>}
      </For>
    </nav>
  )
}
```

<!-- ::end:tabs -->

<!-- ::end:framework -->

### When to Use staticData vs Context

| staticData                             | context                         |
| -------------------------------------- | ------------------------------- |
| Synchronous, defined at route creation | Can be async (via `beforeLoad`) |
| Available before loading starts        | Can depend on params/search     |
| Same for all instances of a route      | Passed down to child routes     |

Use staticData for static route metadata. Use context for dynamic data or auth state that varies per request.
