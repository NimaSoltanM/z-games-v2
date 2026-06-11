---
slug: fiber-cli
title: The Fiber CLI
authors: [fiber-team]
tags: [fiber, v3, cli, tooling, development, go]
description: "Live reload, project scaffolding, static file server, version migration  -  the Fiber CLI handles the tasks around your code so you can focus on the code itself."
---

Most Go web frameworks give you a library and send you on your way. Fiber ships a CLI tool that handles the repetitive tasks around development: live reload when files change, project scaffolding from templates, serving static files with one command, and migrating between Fiber versions automatically.

You do not need the CLI to use Fiber. But once you try `fiber dev` instead of manually restarting your server after every change, you will not go back.

<!-- truncate -->

## Installation

```bash
go install github.com/gofiber/cli/fiber@latest
```

Requires a recent Go version. After installation, `fiber` is available in your terminal.

## fiber dev  -  Live Reload

The most-used command. It watches your project files and restarts the server whenever something changes:

```bash
fiber dev
```

That is it. Edit a `.go` file, save, and your server restarts automatically. No external tools like Air or nodemon needed.

### Customizing the Watch

By default, `fiber dev` watches `.go`, `.tmpl`, `.tpl`, and `.html` files. You can adjust this:

```bash
# Watch additional file types
fiber dev -e go,tmpl,html,css,js

# Ignore specific directories
fiber dev -D assets,tmp,vendor,node_modules,dist

# Set a delay before restarting (avoid rapid restarts during save-all)
fiber dev -d 2s

# Run commands before each restart
fiber dev --pre-run="go generate ./..."

# Pass arguments to your app
fiber dev -a "-port=8080,-debug=true"
```

The `--pre-run` flag is powerful. If your project uses code generation, template compilation, or asset building, those commands run automatically before each restart.

### Watch a Specific Target

If your `main.go` is not in the project root:

```bash
fiber dev -t ./cmd/server
```

## fiber new  -  Project Scaffolding

Generate a new Fiber project from templates:

```bash
# Basic project structure
fiber new myapp

# With a custom Go module name
fiber new myapp github.com/yourname/myapp

# Complex project structure with more boilerplate
fiber new myapp -t complex
```

The **basic** template gives you a minimal Fiber project: `main.go`, `go.mod`, and a simple route. The **complex** template includes directory structure, configuration, middleware setup, and more.

### Custom Templates

You can generate projects from any GitHub repository:

```bash
# From a specific GitHub repo
fiber new myapp -t complex -r your-org/your-template

# From any Git URL
fiber new myapp -t complex -r https://gitlab.com/team/fiber-template.git

# SSH-based repo
fiber new myapp -t complex -r git@github.com:team/template.git
```

This lets your team maintain a standard project template and generate new services from it in seconds.

## fiber serve  -  Static File Server

Need to serve static files quickly? Maybe you are developing a frontend, reviewing a build output, or hosting documentation:

```bash
# Serve the current directory on :3000
fiber serve

# Serve a specific directory on a custom port
fiber serve --dir ./dist --addr :8080

# Enable directory browsing
fiber serve --browse

# Enable compression and CORS
fiber serve --compress --cors

# Serve with TLS
fiber serve --cert ./cert.pem --key ./key.pem
```

This is a full-featured static file server with caching, compression, CORS, health checks, byte-range requests, and optional TLS  -  all without writing a single line of Go code.

### All serve options

| Flag | Default | Description |
|------|---------|-------------|
| `--addr` | `:3000` | Listen address |
| `--dir` | `.` | Directory to serve |
| `--browse` | `false` | Enable directory listing |
| `--compress` | `false` | Enable gzip/brotli compression |
| `--cors` | `false` | Enable CORS headers |
| `--cache` | `10s` | Cache duration |
| `--index` | `index.html` | Index file names |
| `--cert` / `--key` |  -  | TLS certificate and key |
| `--prefork` | `false` | Enable prefork mode |
| `--download` | `false` | Force file downloads |
| `--range` | `false` | Enable byte-range requests |

## fiber migrate  -  Version Migration

Upgrading Fiber versions usually means finding breaking changes, updating import paths, and adjusting API calls. The CLI automates this:

```bash
# Migrate to Fiber v3
fiber migrate --to 3.0.0

# Also refresh third-party modules (contrib, storage, template)
fiber migrate --to 3.0.0 --third-party contrib,storage,template

# Verbose output for debugging
fiber migrate --to 3.0.0 --verbose
```

The migration tool updates your `go.mod`, adjusts import paths, and runs `go mod tidy` automatically. It covers the mechanical work of migration so you can focus on the API changes that need manual attention.

## fiber upgrade  -  Self-Update

Keep the CLI itself up to date:

```bash
fiber upgrade
```

Checks for the latest release and updates in place.

## fiber version

Check your CLI and Fiber versions:

```bash
fiber version
```

Shows both the CLI version and the latest available version, so you know when an update is available.

## The Development Workflow

A typical development session with the Fiber CLI:

```bash
# Scaffold a new project
fiber new my-api github.com/myorg/my-api
cd my-api

# Start developing with live reload
fiber dev

# In another terminal, serve the frontend
fiber serve --dir ./frontend/dist --addr :8080 --cors
```

The CLI handles the infrastructure. You write the code.

## Internal References

- [Fiber CLI Repository](https://github.com/gofiber/cli)
- [Recipes  -  for more project examples](/recipes/)
- [What's New in v3](/whats_new)


---
id: app
title: 🚀 App
description: The `App` type represents your Fiber application.
sidebar_position: 2
toc_max_heading_level: 4
---

import Reference from '@site/src/components/reference';

## Routing

import RoutingHandler from './../partials/routing/handler.md';
import RoutingUse from './../partials/routing/use.md';

### Route Handlers

<RoutingHandler />

Beyond the native `func(fiber.Ctx)` forms, Fiber also adapts Express-style, `net/http`, and `fasthttp` handlers. See [Handler types](../guide/routing.md#handler-types) in the routing guide for the full list of supported shapes.

### Use

<RoutingUse />

### Mounting

Mount another Fiber instance with [`app.Use`](#use), similar to Express's [`router.use`](https://expressjs.com/en/api.html#router.use).

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()
    micro := fiber.New()

    // Mount the micro app on the "/john" route
    app.Use("/john", micro) // GET /john/doe -> 200 OK

    micro.Get("/doe", func(c fiber.Ctx) error {
        return c.SendStatus(fiber.StatusOK)
    })

    log.Fatal(app.Listen(":3000"))
}
```

:::caution
Unlike Express, Fiber does not strip the mount prefix. Inside the mounted app, `c.Path()` still returns the full request path (`/john/doe`, not `/doe`); there is no `req.baseUrl` equivalent.
:::

### MountPath

The `MountPath` property contains one or more path patterns on which a sub-app was mounted.

```go title="Signature"
func (app *App) MountPath() string
```

```go title="Example"
package main

import (
    "fmt"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()
    one := fiber.New()
    two := fiber.New()
    three := fiber.New()

    two.Use("/three", three)
    one.Use("/two", two)
    app.Use("/one", one)

    fmt.Println("Mount paths:")
    fmt.Println("one.MountPath():", one.MountPath())       // "/one"
    fmt.Println("two.MountPath():", two.MountPath())       // "/one/two"
    fmt.Println("three.MountPath():", three.MountPath())   // "/one/two/three"
    fmt.Println("app.MountPath():", app.MountPath())       // ""
}
```

:::caution
Mounting order is important for `MountPath`. To get mount paths properly, you should start mounting from the deepest app.
:::

### Group

You can group routes by creating a `*Group` struct.

```go title="Signature"
func (app *App) Group(prefix string, handlers ...any) Router
```

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    api := app.Group("/api", handler)  // /api

    v1 := api.Group("/v1", handler)    // /api/v1
    v1.Get("/list", handler)           // /api/v1/list
    v1.Get("/user", handler)           // /api/v1/user

    v2 := api.Group("/v2", handler)    // /api/v2
    v2.Get("/list", handler)           // /api/v2/list
    v2.Get("/user", handler)           // /api/v2/user

    log.Fatal(app.Listen(":3000"))
}

func handler(c fiber.Ctx) error {
    return c.SendString("Handler response")
}
```

### RouteChain

Returns an instance of a single route, which you can then use to handle HTTP verbs with optional middleware.

Similar to [`Express`](https://expressjs.com/en/api.html#app.route).

```go title="Signature"
func (app *App) RouteChain(path string) Register
```

<details>
<summary>Click here to see the `Register` interface</summary>

```go
type Register interface {
    All(handler any, handlers ...any) Register
    Get(handler any, handlers ...any) Register
    Head(handler any, handlers ...any) Register
    Post(handler any, handlers ...any) Register
    Put(handler any, handlers ...any) Register
    Delete(handler any, handlers ...any) Register
    Connect(handler any, handlers ...any) Register
    Options(handler any, handlers ...any) Register
    Trace(handler any, handlers ...any) Register
    Patch(handler any, handlers ...any) Register

    Add(methods []string, handler any, handlers ...any) Register

    RouteChain(path string) Register
}
```

</details>

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    // Use `RouteChain` as a chainable route declaration method
    app.RouteChain("/test").Get(func(c fiber.Ctx) error {
        return c.SendString("GET /test")
    })

    app.RouteChain("/events").All(func(c fiber.Ctx) error {
        // Runs for all HTTP verbs first
        // Think of it as route-specific middleware!
        return c.Next()
    }).
    Get(func(c fiber.Ctx) error {
        return c.SendString("GET /events")
    }).
    Post(func(c fiber.Ctx) error {
        // Maybe add a new event...
        return c.SendString("POST /events")
    })

    // Combine multiple routes
    app.RouteChain("/reports").RouteChain("/daily").Get(func(c fiber.Ctx) error {
        return c.SendString("GET /reports/daily")
    })

    // Use multiple methods
    app.RouteChain("/api").Get(func(c fiber.Ctx) error {
        return c.SendString("GET /api")
    }).Post(func(c fiber.Ctx) error {
        return c.SendString("POST /api")
    })

    log.Fatal(app.Listen(":3000"))
}
```

### Route

Defines routes with a common prefix inside the supplied function. Internally it uses [`Group`](#group) to create a sub-router and accepts an optional name prefix.

```go title="Signature"
func (app *App) Route(prefix string, fn func(router Router), name ...string) Router
```

```go title="Example"
app.Route("/test", func(api fiber.Router) {
    api.Get("/foo", handler).Name("foo") // /test/foo (name: test.foo)
    api.Get("/bar", handler).Name("bar") // /test/bar (name: test.bar)
}, "test.")
```

### Domain

Creates a router scoped to a specific hostname pattern. Routes registered through the returned `Router` only match requests whose hostname (from `c.Hostname()`) matches the pattern. Domain names are matched case-insensitively per [RFC 4343](https://www.rfc-editor.org/rfc/rfc4343).

When `TrustProxy` is enabled and the proxy is trusted, the hostname may be derived from the `X-Forwarded-Host` header instead of the `Host` header. To prevent header spoofing, you must both enable `TrustProxy` and configure [`TrustProxyConfig`](https://docs.gofiber.io/api/fiber#trustproxyconfig) with the IPs or ranges of your trusted proxies. See the [TrustProxy documentation](https://docs.gofiber.io/api/fiber#trustproxy) for details.

The pattern can contain parameters prefixed with `:`. Use [`DomainParam`](#domainparam) to retrieve them inside handlers.

Domain routing has **zero performance impact** on routes that don't use it — the hostname check is applied as a handler wrapper, not a change to the core router.

:::note
Because domain filtering is applied at handler-execution time (not during route matching), Fiber's `405 Method Not Allowed` logic may advertise methods from domain-scoped routes even when the requesting host does not match the domain pattern. This is a known trade-off of the handler-wrapping approach — it avoids core router changes while keeping non-domain routes unaffected.
:::

:::note
When mounting sub-applications via `Domain(...).Use(*fiber.App)`, routes are cloned from the sub-app at mount time. This means the same sub-app can safely be mounted on multiple domains without double-wrapping, but routes registered on the sub-app **after** mounting will not inherit domain filtering. Register all sub-app routes before mounting.
:::

```go title="Signature"
func (app *App) Domain(host string) Router
```

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    // Static domain — only matches requests to api.example.com
    app.Domain("api.example.com").Get("/users", func(c fiber.Ctx) error {
        return c.SendString("API users list")
    })

    // Domain with parameter
    app.Domain(":user.blog.example.com").Get("/", func(c fiber.Ctx) error {
        user := fiber.DomainParam(c, "user")
        return c.SendString(user + "'s blog")
    })

    // Composable with groups and middleware
    admin := app.Domain("admin.example.com")
    admin.Use(func(c fiber.Ctx) error {
        // Only runs for admin.example.com
        c.Set("X-Admin", "true")
        return c.Next()
    })
    admin.Get("/dashboard", func(c fiber.Ctx) error {
        return c.SendString("Admin Dashboard")
    })

    // Mount sub-applications on domain routers
    subApp := fiber.New()
    subApp.Get("/users", func(c fiber.Ctx) error {
        return c.SendString("Users list")
    })
    app.Domain("api.example.com").Use("/api", subApp)

    // Fallback for unmatched domains
    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString("Default site")
    })

    log.Fatal(app.Listen(":3000"))
}
```

#### DomainParam

Returns the value of a domain parameter captured by a [`Domain`](#domain) pattern. If the key is not found, the optional default value is returned.

```go title="Signature"
func DomainParam(c Ctx, key string, defaultValue ...string) string
```

```go title="Example"
// Pattern: ":tenant.example.com"
// Request Host: acme.example.com

app.Domain(":tenant.example.com").Get("/", func(c fiber.Ctx) error {
    tenant := fiber.DomainParam(c, "tenant")           // "acme"
    missing := fiber.DomainParam(c, "missing", "none") // "none"
    return c.SendString(tenant + " " + missing)
})
```

### HandlersCount

Returns the number of registered handlers.

```go title="Signature"
func (app *App) HandlersCount() uint32
```

### Stack

Returns the underlying router stack.

```go title="Signature"
func (app *App) Stack() [][]*Route
```

```go title="Example"
package main

import (
    "encoding/json"
    "fmt"
    "log"

    "github.com/gofiber/fiber/v3"
)

var handler = func(c fiber.Ctx) error { return nil }

func main() {
    app := fiber.New()

    app.Get("/john/:age", handler)
    app.Post("/register", handler)

    data, _ := json.MarshalIndent(app.Stack(), "", "  ")
    fmt.Println(string(data))

    log.Fatal(app.Listen(":3000"))
}
```

<details>
<summary>Click here to see the result</summary>

```json
[
  [
    {
      "method": "GET",
      "path": "/john/:age",
      "params": [
        "age"
      ]
    }
  ],
  [
    {
      "method": "HEAD",
      "path": "/john/:age",
      "params": [
        "age"
      ]
    }
  ],
  [
    {
      "method": "POST",
      "path": "/register",
      "params": null
    }
  ]
]
```

</details>

### Name

This method assigns the name to the latest created route.

```go title="Signature"
func (app *App) Name(name string) Router
```

```go title="Example"
package main

import (
    "encoding/json"
    "fmt"
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    var handler = func(c fiber.Ctx) error { return nil }

    app := fiber.New()

    app.Get("/", handler)
    app.Name("index")
    app.Get("/doe", handler).Name("home")
    app.Trace("/tracer", handler).Name("tracert")
    app.Delete("/delete", handler).Name("delete")

    a := app.Group("/a")
    a.Name("fd.")

    a.Get("/test", handler).Name("test")

    data, _ := json.MarshalIndent(app.Stack(), "", "  ")
    fmt.Println(string(data))

    log.Fatal(app.Listen(":3000"))
}
```

<details>
<summary>Click here to see the result</summary>

```json
[
  [
    {
      "method": "GET",
      "name": "index",
      "path": "/",
      "params": null
    },
    {
      "method": "GET",
      "name": "home",
      "path": "/doe",
      "params": null
    },
    {
      "method": "GET",
      "name": "fd.test",
      "path": "/a/test",
      "params": null
    }
  ],
  [
    {
      "method": "HEAD",
      "name": "",
      "path": "/",
      "params": null
    },
    {
      "method": "HEAD",
      "name": "",
      "path": "/doe",
      "params": null
    },
    {
      "method": "HEAD",
      "name": "",
      "path": "/a/test",
      "params": null
    }
  ],
  null,
  null,
  [
    {
      "method": "DELETE",
      "name": "delete",
      "path": "/delete",
      "params": null
    }
  ],
  null,
  null,
  [
    {
      "method": "TRACE",
      "name": "tracert",
      "path": "/tracer",
      "params": null
    }
  ],
  null
]
```

</details>

### GetRoute

This method retrieves a route by its name.

The returned `Route` can be inspected or used to generate a URL directly with `route.URL(params)`.

```go title="Signature"
func (app *App) GetRoute(name string) Route
```

```go title="Example"
package main

import (
    "encoding/json"
    "fmt"
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Get("/", handler).Name("index")
    app.Get("/user/:name/:id", handler).Name("user")

    route := app.GetRoute("index")

    data, _ := json.MarshalIndent(route, "", "  ")
    fmt.Println(string(data))

    userRoute := app.GetRoute("user")
    location, _ := userRoute.URL(fiber.Map{"name": "john", "id": 1})
    fmt.Println(location) // /user/john/1

    log.Fatal(app.Listen(":3000"))
}
```

<details>
<summary>Click here to see the result</summary>

```json
{
  "method": "GET",
  "name": "index",
  "path": "/",
  "params": null
}
```

</details>

### GetRoutes

This method retrieves all routes.

```go title="Signature"
func (app *App) GetRoutes(filterUseOption ...bool) []Route
```

When `filterUseOption` is set to `true`, it filters out routes registered by middleware.

```go title="Example"
package main

import (
    "encoding/json"
    "fmt"
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Post("/", func(c fiber.Ctx) error {
        return c.SendString("Hello, World!")
    }).Name("index")

    routes := app.GetRoutes(true)

    data, _ := json.MarshalIndent(routes, "", "  ")
    fmt.Println(string(data))

    log.Fatal(app.Listen(":3000"))
}
```

<details>
<summary>Click here to see the result</summary>

```json
[
    {
        "method": "POST",
        "name": "index",
        "path": "/",
        "params": null
    }
]
```

</details>

## Config

`Config` returns the [app config](./fiber.md#config) as a value (read-only).

```go title="Signature"
func (app *App) Config() Config
```

## Handler

`Handler` returns the server handler that can be used to serve custom [`*fasthttp.RequestCtx`](https://pkg.go.dev/github.com/valyala/fasthttp#RequestCtx) requests.

```go title="Signature"
func (app *App) Handler() fasthttp.RequestHandler
```

## ErrorHandler

`ErrorHandler` executes the process defined for the application in case of errors. This is used in some cases in middlewares.

```go title="Signature"
func (app *App) ErrorHandler(ctx Ctx, err error) error
```

## NewWithCustomCtx

`NewWithCustomCtx` creates a new `*App` and sets the custom context factory
function at construction time.

```go title="Signature"
func NewWithCustomCtx(fn func(app *App) CustomCtx, config ...Config) *App
```

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

type CustomCtx struct {
    fiber.DefaultCtx
}

func (c *CustomCtx) Params(key string, defaultValue ...string) string {
    return "prefix_" + c.DefaultCtx.Params(key)
}

func main() {
    app := fiber.NewWithCustomCtx(func(app *fiber.App) fiber.CustomCtx {
        return &CustomCtx{
            DefaultCtx: *fiber.NewDefaultCtx(app),
        }
    })

    app.Get("/:id", func(c fiber.Ctx) error {
        return c.SendString(c.Params("id"))
    })

    log.Fatal(app.Listen(":3000"))
}
```

## RegisterCustomBinder

You can register custom binders to use with [`Bind().Custom("name")`](bind.md#custom). They should be compatible with the `CustomBinder` interface.

```go title="Signature"
func (app *App) RegisterCustomBinder(binder CustomBinder)
```

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
    "gopkg.in/yaml.v2"
)

type User struct {
    Name string `yaml:"name"`
}

type customBinder struct{}

func (*customBinder) Name() string {
    return "custom"
}

func (*customBinder) MIMETypes() []string {
    return []string{"application/yaml"}
}

func (*customBinder) Parse(c fiber.Ctx, out any) error {
    // Parse YAML body
    return yaml.Unmarshal(c.Body(), out)
}

func main() {
    app := fiber.New()

    // Register custom binder
    app.RegisterCustomBinder(&customBinder{})

    app.Post("/custom", func(c fiber.Ctx) error {
        var user User
        // Use Custom binder by name
        if err := c.Bind().Custom("custom", &user); err != nil {
            return err
        }
        return c.JSON(user)
    })

    app.Post("/normal", func(c fiber.Ctx) error {
        var user User
        // Custom binder is used by the MIME type
        if err := c.Bind().Body(&user); err != nil {
            return err
        }
        return c.JSON(user)
    })

    log.Fatal(app.Listen(":3000"))
}
```

## RegisterCustomConstraint

`RegisterCustomConstraint` allows you to register custom constraints.

```go title="Signature"
func (app *App) RegisterCustomConstraint(constraint CustomConstraint)
```

See the [Custom Constraint](../guide/routing.md#custom-constraint) section for more information.

## SetTLSHandler

Use `SetTLSHandler` to set [`ClientHelloInfo`](https://datatracker.ietf.org/doc/html/rfc8446#section-4.1.2) when using TLS with a `Listener`.

```go title="Signature"
func (app *App) SetTLSHandler(tlsHandler *TLSHandler)
```

## State / SharedState

`State()` returns in-process state (local to the current process).  
`SharedState()` returns storage-backed state intended for prefork/multi-process sharing.

```go title="Signature"
func (app *App) State() *State
func (app *App) SharedState() *SharedState
```

See [State Management](./state.md) for usage and examples.

## Test

Testing your application is done with the `Test` method. Use this method for creating `_test.go` files or when you need to debug your routing logic. The default timeout is `1s`; to disable a timeout altogether, pass a `TestConfig` struct with `Timeout: 0`.

```go title="Signature"
func (app *App) Test(req *http.Request, config ...TestConfig) (*http.Response, error)
```

```go title="Example"
package main

import (
    "fmt"
    "io"
    "log"
    "net/http"
    "net/http/httptest"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    // Create route with GET method for test:
    app.Get("/", func(c fiber.Ctx) error {
        fmt.Println(c.BaseURL())              // => http://google.com
        fmt.Println(c.Get("X-Custom-Header")) // => hi
        return c.SendString("hello, World!")
    })

    // Create http.Request
    req := httptest.NewRequest("GET", "http://google.com", nil)
    req.Header.Set("X-Custom-Header", "hi")

    // Perform the test
    resp, _ := app.Test(req)

    // Do something with the results:
    if resp.StatusCode == fiber.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        fmt.Println(string(body)) // => hello, World!
    }
}
```

If not provided, TestConfig is set to the following defaults:

```go title="Default TestConfig"
config := fiber.TestConfig{
  Timeout:      time.Second,
  FailOnTimeout: true,
}
```

:::caution

Calling `app.Test(req)` uses the defaults above. Supplying an empty `fiber.TestConfig{}` instead is **not** equivalent; it is the same as supplying:

```go title="Empty TestConfig"
cfg := fiber.TestConfig{
  Timeout:      0,
  FailOnTimeout: false,
}
```

This would make a Test that has no timeout.

:::

## Hooks

`Hooks` is a method to return the [hooks](./hooks.md) property.

```go title="Signature"
func (app *App) Hooks() *Hooks
```

## Route Management

Routes are normally defined before the app starts. You can also add or remove them at runtime with the methods below, but these operations are **not thread-safe** and are performance-intensive, so use them sparingly and only in development.

### RebuildTree

The `RebuildTree` method is designed to rebuild the route tree and enable dynamic route registration. It returns a pointer to the `App` instance.

```go title="Signature"
func (app *App) RebuildTree() *App
```

**Note:** Use this method with caution. It is **not** thread-safe and calling it can be very performance-intensive, so it should be used sparingly and only in development mode. Avoid using it concurrently.

Here’s an example of how to define and register routes dynamically:

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Get("/define", func(c fiber.Ctx) error {
        // Define a new route dynamically
        app.Get("/dynamically-defined", func(c fiber.Ctx) error {
            return c.SendStatus(fiber.StatusOK)
        })

        // Rebuild the route tree to register the new route
        app.RebuildTree()

        return c.SendStatus(fiber.StatusOK)
    })

    log.Fatal(app.Listen(":3000"))
}
```

In this example, a new route is defined and then `RebuildTree()` is called to ensure the new route is registered and available.

### RemoveRoute

This method removes a route by path. You must call the `RebuildTree()` method after the removal to finalize the update and rebuild the routing tree.
If no methods are specified, the route will be removed for all HTTP methods defined in the app. To limit removal to specific methods, provide them as additional arguments.

```go title="Signature"
func (app *App) RemoveRoute(path string, methods ...string)
```

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Get("/api/feature-a", func(c fiber.Ctx) error {
           app.RemoveRoute("/api/feature", fiber.MethodGet)
           app.RebuildTree()
           // Redefine route
           app.Get("/api/feature", func(c fiber.Ctx) error {
                   return c.SendString("Testing feature-a")
           })

           app.RebuildTree()
           return c.SendStatus(fiber.StatusOK)
    })
    app.Get("/api/feature-b", func(c fiber.Ctx) error {
           app.RemoveRoute("/api/feature", fiber.MethodGet)
           app.RebuildTree()
           // Redefine route
           app.Get("/api/feature", func(c fiber.Ctx) error {
                   return c.SendString("Testing feature-b")
           })

           app.RebuildTree()
           return c.SendStatus(fiber.StatusOK)
    })

    log.Fatal(app.Listen(":3000"))
}
```

### RemoveRouteByName

This method removes a route by name.
If no methods are specified, the route will be removed for all HTTP methods defined in the app. To limit removal to specific methods, provide them as additional arguments.

```go title="Signature"
func (app *App) RemoveRouteByName(name string, methods ...string)
```

### RemoveRouteFunc

This method removes a route by function having `*Route` parameter.
If no methods are specified, the route will be removed for all HTTP methods defined in the app. To limit removal to specific methods, provide them as additional arguments.

```go title="Signature"
func (app *App) RemoveRouteFunc(matchFunc func(r *Route) bool, methods ...string)
```

## Helpers

### GetString

Returns `s` unchanged when [`Immutable`](./fiber.md#immutable) is disabled or `s` resides in read-only memory. Otherwise, it returns a detached copy using `strings.Clone`.

```go title="Signature"
func (app *App) GetString(s string) string
```

### GetBytes

Returns `b` unchanged when [`Immutable`](./fiber.md#immutable) is disabled or `b` resides in read-only memory. Otherwise, it returns a detached copy.

```go title="Signature"
func (app *App) GetBytes(b []byte) []byte
```

### ReloadViews

Reloads the configured view engine on demand by calling its `Load` method. Use this helper in development workflows (e.g., file watchers or debug-only routes) to pick up template changes without restarting the server. Returns an error if no view engine is configured or reloading fails.

```go title="Signature"
func (app *App) ReloadViews() error
```

```go title="Example"
app := fiber.New(fiber.Config{Views: engine})

app.Get("/dev/reload", func(c fiber.Ctx) error {
    if err := app.ReloadViews(); err != nil {
        return err
    }
    return c.SendString("Templates reloaded")
})
```

---
id: bind
title: 📎 Bind
description: Binds the request and response items to a struct.
sidebar_position: 4
toc_max_heading_level: 4
---

Bindings parse request and response bodies, query parameters, cookies, and more into structs.

:::info
Binder-returned values are valid only within the handler. To keep them, copy the data
or enable the [**`Immutable`**](./ctx.md) setting. [Read more...](../#zero-allocation)
:::

## Binders

- [All](#all)
- [Body](#body)
  - [CBOR](#cbor)
  - [Form](#form)
  - [JSON](#json)
  - [MsgPack](#msgpack)
  - [XML](#xml)
- [Cookie](#cookie)
- [Header](#header)
- [Query](#query)
- [RespHeader](#respheader)
- [URI](#uri)

### All

The `All` function binds data from URL parameters, the request body, query parameters, headers, and cookies into `out`. Sources are applied in the following order using struct field tags.

#### Precedence Order

The binding sources have the following precedence:

1. **URL Parameters (URI)**
2. **Request Body (e.g., JSON or form data)**
3. **Query Parameters**
4. **Request Headers**
5. **Cookies**

:::info
The request body is only included as a binding source when the request has both a non-empty body **and** a non-empty `Content-Type` header.
:::

```go title="Signature"
func (b *Bind) All(out any) error
```

```go title="Example"
type User struct {
    Name      string                `query:"name" json:"name" form:"name"`
    Email     string                `json:"email" form:"email"`
    Role      string                `header:"X-User-Role"`
    SessionID string                `json:"session_id" cookie:"session_id"`
    ID        int                   `uri:"id" query:"id" json:"id" form:"id"`
}

app.Post("/users", func(c fiber.Ctx) error {
    user := new(User)

    if err := c.Bind().All(user); err != nil {
        return err
    }

    // All available data is now bound to the user struct
    return c.JSON(user)
})
```

### Body

Binds the request body to a struct.

Use tags that match the content type. For example, to parse a JSON body with a `Pass` field, declare `json:"pass"`.

| Content-Type                        | Struct Tag |
| ----------------------------------- | ---------- |
| `application/x-www-form-urlencoded` | `form`     |
| `multipart/form-data`               | `form`     |
| `application/json`                  | `json`     |
| `application/xml`                   | `xml`      |
| `text/xml`                          | `xml`      |
| `application/vnd.msgpack`           | `msgpack`  |

```go title="Signature"
func (b *Bind) Body(out any) error
```

```go title="Example"
type Person struct {
    Name string `json:"name" xml:"name" form:"name" msgpack:"name"`
    Pass string `json:"pass" xml:"pass" form:"pass" msgpack:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Body(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Test the handler with these `curl` commands:

```bash
# JSON
curl -X POST -H "Content-Type: application/json" --data "{\"name\":\"john\",\"pass\":\"doe\"}" localhost:3000

# MsgPack
curl -X POST -H "Content-Type: application/vnd.msgpack" --data-binary $'\x82\xa4name\xa4john\xa4pass\xa3doe'  localhost:3000

# XML
curl -X POST -H "Content-Type: application/xml" --data "<login><name>john</name><pass>doe</pass></login>" localhost:3000

# Form URL-Encoded
curl -X POST -H "Content-Type: application/x-www-form-urlencoded" --data "name=john&pass=doe" localhost:3000

# Multipart Form
curl -X POST -F name=john -F pass=doe http://localhost:3000
```

### CBOR

> **Note:** Before using any CBOR-related features, make sure to follow the [CBOR setup instructions](../guide/advance-format.md#cbor).

Binds the request CBOR body to a struct.

It is important to specify the correct struct tag based on the content type to be parsed. For example, if you want to parse a CBOR body with a field called `Pass`, you would use a struct field with `cbor:"pass"`.

```go title="Signature"
func (b *Bind) CBOR(out any) error
```

```go title="Example"
// Field names should start with an uppercase letter
type Person struct {
    Name string `cbor:"name"`
    Pass string `cbor:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().CBOR(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Test the defaults with this `curl` command:

```bash
curl -X POST -H "Content-Type: application/cbor" --data "\xa2dnamedjohndpasscdoe" localhost:3000
```

### Form

Binds the request or multipart form body data to a struct.

It is important to specify the correct struct tag based on the content type to be parsed. For example, if you want to parse a form body with a field called `Pass`, you would use a struct field with `form:"pass"`.

```go title="Signature"
func (b *Bind) Form(out any) error
```

```go title="Example"
type Person struct {
    Name string `form:"name"`
    Pass string `form:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Form(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Run tests with the following `curl` commands for both `application/x-www-form-urlencoded` and `multipart/form-data`:

```bash
curl -X POST -H "Content-Type: application/x-www-form-urlencoded" --data "name=john&pass=doe" localhost:3000
```

```bash
curl -X POST -H "Content-Type: multipart/form-data" -F "name=john" -F "pass=doe" localhost:3000
```

:::info
If you need to bind multipart file, you can use `*multipart.FileHeader`, `*[]*multipart.FileHeader` or `[]*multipart.FileHeader` as a field type.
:::

```go title="Example"
type Person struct {
    Name string                `form:"name"`
    Pass string                `form:"pass"`
    Avatar *multipart.FileHeader `form:"avatar"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Form(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe
    log.Println(p.Avatar.Filename) // file.txt

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl -X POST -H "Content-Type: multipart/form-data" -F "name=john" -F "pass=doe" -F 'avatar=@filename' localhost:3000
```

### JSON

Binds the request JSON body to a struct.

It is important to specify the correct struct tag based on the content type to be parsed. For example, if you want to parse a JSON body with a field called `Pass`, you would use a struct field with `json:"pass"`.

```go title="Signature"
func (b *Bind) JSON(out any) error
```

```go title="Example"
type Person struct {
    Name string `json:"name"`
    Pass string `json:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().JSON(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl -X POST -H "Content-Type: application/json" --data "{\"name\":\"john\",\"pass\":\"doe\"}" localhost:3000
```

### MsgPack

> **Note:** Before using any MsgPack-related features, make sure to follow the [MsgPack setup instructions](../guide/advance-format.md#msgpack).

Binds the request MsgPack body to a struct.

It is important to specify the correct struct tag based on the content type to be parsed. For example, if you want to parse a Msgpack body with a field called `Pass`, you would use a struct field with `msgpack:"pass"`.

> Our library uses [shamaton-msgpack](https://github.com/shamaton/msgpack) which uses `msgpack` struct tags by default. If you want to use other libraries, you may need to update the struct tags accordingly.

```go title="Signature"
func (b *Bind) MsgPack(out any) error
```

```go title="Example"
type Person struct {
    Name string `msgpack:"name"`
    Pass string `msgpack:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().MsgPack(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl -X POST -H "Content-Type: application/vnd.msgpack" --data-binary $'\x82\xa4name\xa4john\xa4pass\xa3doe'  localhost:3000
```

### XML

Binds the request XML body to a struct.

It is important to specify the correct struct tag based on the content type to be parsed. For example, if you want to parse an XML body with a field called `Pass`, you would use a struct field with `xml:"pass"`.

```go title="Signature"
func (b *Bind) XML(out any) error
```

```go title="Example"
// Field names should start with an uppercase letter
type Person struct {
    Name string `xml:"name"`
    Pass string `xml:"pass"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().XML(p); err != nil {
        return err
    }

    log.Println(p.Name) // john
    log.Println(p.Pass) // doe

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl -X POST -H "Content-Type: application/xml" --data "<login><name>john</name><pass>doe</pass></login>" localhost:3000
```

### Cookie

This method is similar to [Body Binding](#body), but for cookie parameters.
It is important to use the struct tag `cookie`. For example, if you want to parse a cookie with a field called `Age`, you would use a struct field with `cookie:"age"`.

```go title="Signature"
func (b *Bind) Cookie(out any) error
```

```go title="Example"
type Person struct {
    Name string `cookie:"name"`
    Age  int    `cookie:"age"`
    Job  bool   `cookie:"job"`
}

app.Get("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Cookie(p); err != nil {
        return err
    }

    log.Println(p.Name)  // Joseph
    log.Println(p.Age)   // 23
    log.Println(p.Job)   // true
})
```

Run tests with the following `curl` command:

```bash
curl --cookie "name=Joseph; age=23; job=true" http://localhost:8000/
```

### Header

This method is similar to [Body Binding](#body), but for request headers.
It is important to use the struct tag `header`. For example, if you want to parse a request header with a field called `Pass`, you would use a struct field with `header:"pass"`.

```go title="Signature"
func (b *Bind) Header(out any) error
```

```go title="Example"
type Person struct {
    Name     string   `header:"name"`
    Pass     string   `header:"pass"`
    Products []string `header:"products"`
}

app.Get("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Header(p); err != nil {
        return err
    }

    log.Println(p.Name)     // john
    log.Println(p.Pass)     // doe
    log.Println(p.Products) // [shoe hat]

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl "http://localhost:3000/" -H "name: john" -H "pass: doe" -H "products: shoe,hat"
```

### Query

This method is similar to [Body Binding](#body), but for query parameters.
It is important to use the struct tag `query`. For example, if you want to parse a query parameter with a field called `Pass`, you would use a struct field with `query:"pass"`.

```go title="Signature"
func (b *Bind) Query(out any) error
```

```go title="Example"
type Person struct {
    Name     string   `query:"name"`
    Pass     string   `query:"pass"`
    Products []string `query:"products"`
}

app.Get("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Query(p); err != nil {
        return err
    }

    log.Println(p.Name)     // john
    log.Println(p.Pass)     // doe
    // Depending on fiber.Config{EnableSplittingOnParsers: false} - default
    log.Println(p.Products) // ["shoe,hat"]
    // With fiber.Config{EnableSplittingOnParsers: true}
    // log.Println(p.Products) // ["shoe", "hat"]

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl "http://localhost:3000/?name=john&pass=doe&products=shoe,hat"
```

:::info
For more parser settings, please refer to [Config](fiber.md#enablesplittingonparsers)
:::

#### Array Query Parameters

Fiber supports several formats for passing array values via query parameters. The following table gives an overview:

| Format                   | Example                                        | Requires `EnableSplittingOnParsers` |
| ------------------------ | ---------------------------------------------- | ----------------------------------- |
| Repeated key             | `?colors=red&colors=blue`                      | No                                  |
| Bracket notation         | `?colors[]=red&colors[]=blue`                  | No                                  |
| Comma-separated          | `?colors=red,blue`                             | **Yes**                             |
| Indexed bracket notation | `?posts[0][title]=Hello&posts[1][title]=World` | No                                  |
| Nested bracket notation  | `?preferences[tags]=golang,api`                | No (comma splitting: **Yes**)       |

##### Repeated Key

The most common approach. Repeat the same query key for each value:

```text
GET /api?colors=red&colors=blue&colors=green
```

```go title="Struct"
type Filter struct {
    Colors []string `query:"colors"`
}
// Result: Colors = ["red", "blue", "green"]
```

```bash title="curl"
curl "http://localhost:3000/api?colors=red&colors=blue&colors=green"
```

##### Bracket Notation

Append `[]` to the key name. This is common in PHP-style and JavaScript frameworks:

```text
GET /api?colors[]=red&colors[]=blue&colors[]=green
```

```go title="Struct"
type Filter struct {
    Colors []string `query:"colors"`
}
// Result: Colors = ["red", "blue", "green"]
```

```bash title="curl"
curl "http://localhost:3000/api?colors[]=red&colors[]=blue&colors[]=green"
```

:::note
The struct field tag stays `query:"colors"` (without brackets). Fiber strips the `[]` automatically.
:::

##### Comma-Separated Values

Pass multiple values in a single parameter, separated by commas. This format requires [`EnableSplittingOnParsers`](fiber.md#enablesplittingonparsers) to be set to `true`.

```text
GET /api?colors=red,blue,green
```

```go title="Struct"
type Filter struct {
    Colors []string `query:"colors"`
}
```

```go title="App Setup"
// EnableSplittingOnParsers is required for comma splitting
app := fiber.New(fiber.Config{
    EnableSplittingOnParsers: true,
})
// Result: Colors = ["red", "blue", "green"]
```

Without `EnableSplittingOnParsers`, the entire string `"red,blue,green"` is treated as a **single** element.

```go title="Default behavior (EnableSplittingOnParsers: false)"
// GET /api?colors=red,blue,green
// Result: Colors = ["red,blue,green"]  ← single element
```

```bash title="curl"
curl "http://localhost:3000/api?colors=red,blue,green"
```

You can also mix comma-separated values with repeated keys when splitting is enabled:

```text
GET /api?hobby=soccer&hobby=basketball,football
```

```go
type Query struct {
    Hobby []string `query:"hobby"`
}
// With EnableSplittingOnParsers: true
// Result: Hobby = ["soccer", "basketball", "football"]  ← 3 elements
```

##### Indexed Bracket Notation (Nested Structs)

Use indexed brackets to bind arrays of nested structs:

```text
GET /api?posts[0][title]=Hello&posts[0][author]=Alice&posts[1][title]=World&posts[1][author]=Bob
```

```go title="Struct"
type Post struct {
    Title  string `query:"title"`
    Author string `query:"author"`
}

type Request struct {
    Posts []Post `query:"posts"`
}
// Result: Posts = [{Title: "Hello", Author: "Alice"}, {Title: "World", Author: "Bob"}]
```

```bash title="curl"
curl "http://localhost:3000/api?posts[0][title]=Hello&posts[0][author]=Alice&posts[1][title]=World&posts[1][author]=Bob"
```

##### Nested Bracket Notation (Without Index)

Use bracket notation to access fields of a nested struct:

```text
GET /api?preferences[tags]=golang,api
```

```go title="Struct"
type Preferences struct {
    Tags *[]string `query:"tags"`
}

type Profile struct {
    Prefs *Preferences `query:"preferences"`
}
// With EnableSplittingOnParsers: true
// Result: *Prefs.Tags = ["golang", "api"]
```

```bash title="curl"
curl "http://localhost:3000/api?preferences[tags]=golang,api"
```

:::note
Pointer fields (`*[]string`, `*Preferences`) let you distinguish between a missing parameter (`nil`) and an empty one. When the parameter is present, Fiber allocates the pointer automatically.
:::

### RespHeader

This method is similar to [Body Binding](#body), but for response headers.
It is important to use the struct tag `respHeader`. For example, if you want to parse a response header with a field called `Pass`, you would use a struct field with `respHeader:"pass"`.

```go title="Signature"
func (b *Bind) RespHeader(out any) error
```

```go title="Example"
type Person struct {
    Name     string   `respHeader:"name"`
    Pass     string   `respHeader:"pass"`
    Products []string `respHeader:"products"`
}

app.Get("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().RespHeader(p); err != nil {
        return err
    }

    log.Println(p.Name)     // john
    log.Println(p.Pass)     // doe
    log.Println(p.Products) // [shoe hat]

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl "http://localhost:3000/" -H "name: john" -H "pass: doe" -H "products: shoe,hat"
```

### URI

This method is similar to [Body Binding](#body), but for path parameters.
It is important to use the struct tag `uri`. For example, if you want to parse a path parameter with a field called `Pass`, you would use a struct field with `uri:"pass"`.

```go title="Signature"
func (b *Bind) URI(out any) error
```

```go title="Example"
// GET http://example.com/user/111
app.Get("/user/:id", func(c fiber.Ctx) error {
    param := struct {
        ID uint `uri:"id"`
    }{}

    if err := c.Bind().URI(&param); err != nil {
        return err
    }

    // ...
    return c.SendString(fmt.Sprintf("User ID: %d", param.ID))
})
```

## BindError

When a bind method fails to parse (e.g. invalid JSON, bad type conversion), the behavior depends on the error-handling mode. In **manual handling** (the default), the binder returns a `*BindError` wrapping the underlying error — use `errors.As` to extract it and branch on the binding source or field. In **automatic handling** (enabled via `WithAutoHandling`), parse failures are instead converted to a `*fiber.Error` with HTTP status 400; `*BindError` is never surfaced to the caller in that mode. If you are using `WithAutoHandling`, check for `*fiber.Error` or an HTTP 400 response rather than using `errors.As` for `*BindError`.

```go
type BindError struct {
    Source string // "uri", "query", "body", "header", "cookie", or "respHeader"
    Field  string // struct field or tag key that failed (best-effort, may be empty)
    Err    error  // underlying error; use errors.As to inspect
}
```

Source constants: `BindSourceURI`, `BindSourceQuery`, `BindSourceHeader`, `BindSourceCookie`, `BindSourceBody`, `BindSourceRespHeader`.

### Branching on source

Use `errors.As` to extract `*BindError` and branch on `Source` for RFC-correct status codes (e.g. 404 for URI failures vs 400 for body/query):

```go title="Example"
// With manual handling mode (default behavior)
// Will not work with WithAutoHandling()
var req struct {
    ID   int    `uri:"id"`
    Name string `json:"name"`
}
if err := c.Bind().All(&req); err != nil {
    var be *fiber.BindError
    if errors.As(err, &be) && be.Source == fiber.BindSourceURI {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
    }
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
}
```

### Validation vs binding errors

Validation errors (from `StructValidator`) are **not** wrapped in `BindError`. Use `errors.As(err, &be)` to distinguish: it succeeds only for parsing/binding failures, not for validation failures.

## Custom

To use custom binders, you have to use this method.

You can register them using the [RegisterCustomBinder](./app.md#registercustombinder) method of the Fiber instance.

```go title="Signature"
func (b *Bind) Custom(name string, dest any) error
```

```go title="Example"
app := fiber.New()

// My custom binder
type customBinder struct{}

func (cb *customBinder) Name() string {
    return "custom"
}

func (cb *customBinder) MIMETypes() []string {
    return []string{"application/yaml"}
}

func (cb *customBinder) Parse(c fiber.Ctx, out any) error {
    // parse YAML body
    return yaml.Unmarshal(c.Body(), out)
}

// Register custom binder
app.RegisterCustomBinder(&customBinder{})

type User struct {
    Name string `yaml:"name"`
}

// curl -X POST http://localhost:3000/custom -H "Content-Type: application/yaml" -d "name: John"
app.Post("/custom", func(c fiber.Ctx) error {
    var user User
    // Use Custom binder by name
    if err := c.Bind().Custom("custom", &user); err != nil {
        return err
    }
    return c.JSON(user)
})
```

Internally, custom binders are also used in the [Body](#body) method.
The `MIMETypes` method is used to check if the custom binder should be used for the given content type.

## Options

For more control over error handling, you can use the following methods.

### WithAutoHandling

If you want to handle binder errors automatically, you can use `WithAutoHandling`.
If there's an error, it will return the error and set HTTP status to `400 Bad Request`.
This function does NOT panic therefore you must still return on error explicitly

```go title="Signature"
func (b *Bind) WithAutoHandling() *Bind
```

### WithoutAutoHandling

To handle binder errors manually, you can use the `WithoutAutoHandling` method.
It's the default behavior of the binder.

```go title="Signature"
func (b *Bind) WithoutAutoHandling() *Bind
```

### SkipValidation

To enable or disable validation for the current bind chain, use `SkipValidation`.
By default, validation is enabled (`skip = false`).

```go title="Signature"
func (b *Bind) SkipValidation(skip bool) *Bind
```

## SetParserDecoder

Allows you to configure the BodyParser/QueryParser decoder based on schema options, providing the possibility to add custom types for parsing.

```go title="Signature"
func SetParserDecoder(parserConfig binder.ParserConfig)
```

`binder.ParserConfig` has the following fields:

```go
type ParserConfig struct {
    IgnoreUnknownKeys bool
    ParserType        []ParserType
    ZeroEmpty         bool
    SetAliasTag       string
}

type ParserType struct {
    CustomType any
    Converter  func(string) reflect.Value
}
```

```go title="Example"

type CustomTime time.Time

// String returns the time in string format
func (ct *CustomTime) String() string {
    t := time.Time(*ct).String()
    return t
}

// Converter for CustomTime type with format "2006-01-02"
var timeConverter = func(value string) reflect.Value {
    fmt.Println("timeConverter:", value)
    if v, err := time.Parse("2006-01-02", value); err == nil {
        return reflect.ValueOf(CustomTime(v))
    }
    return reflect.Value{}
}

customTime := binder.ParserType{
    CustomType: CustomTime{},
    Converter:  timeConverter,
}

// Add custom type to the Decoder settings
binder.SetParserDecoder(binder.ParserConfig{
    IgnoreUnknownKeys: true,
    ParserType:        []binder.ParserType{customTime},
    ZeroEmpty:         true,
})

// Example using CustomTime with non-RFC3339 format
type Demo struct {
    Date  CustomTime `form:"date" query:"date"`
    Title string     `form:"title" query:"title"`
    Body  string     `form:"body" query:"body"`
}

app.Post("/body", func(c fiber.Ctx) error {
    var d Demo
    if err := c.Bind().Body(&d); err != nil {
        return err
    }
    fmt.Println("d.Date:", d.Date.String())
    return c.JSON(d)
})

app.Get("/query", func(c fiber.Ctx) error {
    var d Demo
    if err := c.Bind().Query(&d); err != nil {
        return err
    }
    fmt.Println("d.Date:", d.Date.String())
    return c.JSON(d)
})

// Run tests with the following curl commands:

# Body Binding
curl -X POST -F title=title -F body=body -F date=2021-10-20 http://localhost:3000/body

# Query Binding
curl -X GET "http://localhost:3000/query?title=title&body=body&date=2021-10-20"
```

## Validation

Validation is also possible with the binding methods. You can specify your validation rules using the `validate` struct tag.

Specify your struct validator in the [config](./fiber.md#structvalidator).

The validator must implement the `StructValidator` interface, which requires a `Validate` method that takes an `any` type and returns an error.

```go title="Interface"
type StructValidator interface {
    Validate(out any) error
}
```

### Setup Your Validator in the Config

```go title="Example"
import "github.com/go-playground/validator/v10"

type structValidator struct {
    validate *validator.Validate
}

// Validate method implementation
func (v *structValidator) Validate(out any) error {
    return v.validate.Struct(out)
}

// Setup your validator in the Fiber config
app := fiber.New(fiber.Config{
    StructValidator: &structValidator{validate: validator.New()},
})
```

Fiber only runs `StructValidator` for struct destinations (or pointers to structs).
Binding into maps and other non-struct types skips the validator step.

### Usage of Validation in Binding Methods

```go title="Example"
type Person struct {
    Name string `json:"name" validate:"required"`
    Age  int    `json:"age" validate:"gte=18,lte=60"`
}

app.Post("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().JSON(p); err != nil { // Receives validation errors
        return err
    }
})
```

## Default Fields

You can set default values for fields in the struct by using the `default` struct tag. Supported types:

- `bool`
- Float variants (`float32`, `float64`)
- Int variants (`int`, `int8`, `int16`, `int32`, `int64`)
- Uint variants (`uint`, `uint8`, `uint16`, `uint32`, `uint64`)
- `string`
- A slice of the above types. Use `|` to separate slice items.
- A pointer to one of the above types (**pointers to slices and slices of pointers are not supported**).

```go title="Example"
type Person struct {
    Name     string     `query:"name,default:john"`
    Pass     string     `query:"pass"`
    Products []string   `query:"products,default:shoe|hat"`
}

app.Get("/", func(c fiber.Ctx) error {
    p := new(Person)

    if err := c.Bind().Query(p); err != nil {
        return err
    }

    log.Println(p.Name)     // john
    log.Println(p.Pass)     // doe
    log.Println(p.Products) // ["shoe", "hat"]

    // ...
})
```

Run tests with the following `curl` command:

```bash
curl "http://localhost:3000/?pass=doe"
```

---
id: constants
title: 📋 Constants
description: Core HTTP constants used throughout Fiber.
sidebar_position: 10
---

### HTTP methods (mirrors `net/http`)

```go
const (
    MethodGet     = "GET"     // RFC 7231, 4.3.1
    MethodHead    = "HEAD"    // RFC 7231, 4.3.2
    MethodPost    = "POST"    // RFC 7231, 4.3.3
    MethodPut     = "PUT"     // RFC 7231, 4.3.4
    MethodPatch   = "PATCH"   // RFC 5789
    MethodDelete  = "DELETE"  // RFC 7231, 4.3.5
    MethodConnect = "CONNECT" // RFC 7231, 4.3.6
    MethodOptions = "OPTIONS" // RFC 7231, 4.3.7
    MethodTrace   = "TRACE"   // RFC 7231, 4.3.8
    methodUse     = "USE"
)
```

### Common MIME types

```go
const (
    MIMETextXML                          = "text/xml"
    MIMETextHTML                         = "text/html"
    MIMETextPlain                        = "text/plain"
    MIMETextJavaScript                   = "text/javascript"
    MIMETextCSS                          = "text/css"
    MIMETextEventStream                  = "text/event-stream"
    MIMEApplicationXML                   = "application/xml"
    MIMEApplicationJSON                  = "application/json"
    MIMEApplicationCBOR                  = "application/cbor"
    MIMEApplicationForm                  = "application/x-www-form-urlencoded"
    MIMEOctetStream                      = "application/octet-stream"
    MIMEMultipartForm                    = "multipart/form-data"

    MIMETextXMLCharsetUTF8               = "text/xml; charset=utf-8"
    MIMETextHTMLCharsetUTF8              = "text/html; charset=utf-8"
    MIMETextPlainCharsetUTF8             = "text/plain; charset=utf-8"
    MIMETextJavaScriptCharsetUTF8        = "text/javascript; charset=utf-8"
    MIMETextCSSCharsetUTF8               = "text/css; charset=utf-8"
    MIMEApplicationXMLCharsetUTF8        = "application/xml; charset=utf-8"
    MIMEApplicationJSONCharsetUTF8       = "application/json; charset=utf-8"
)
```

### HTTP status codes (mirrors `net/http`)

```go
const (
    StatusContinue                      = 100 // RFC 7231, 6.2.1
    StatusSwitchingProtocols            = 101 // RFC 7231, 6.2.2
    StatusProcessing                    = 102 // RFC 2518, 10.1
    StatusEarlyHints                    = 103 // RFC 8297
    StatusOK                            = 200 // RFC 7231, 6.3.1
    StatusCreated                       = 201 // RFC 7231, 6.3.2
    StatusAccepted                      = 202 // RFC 7231, 6.3.3
    StatusNonAuthoritativeInformation   = 203 // RFC 7231, 6.3.4
    StatusNoContent                     = 204 // RFC 7231, 6.3.5
    StatusResetContent                  = 205 // RFC 7231, 6.3.6
    StatusPartialContent                = 206 // RFC 7233, 4.1
    StatusMultiStatus                   = 207 // RFC 4918, 11.1
    StatusAlreadyReported               = 208 // RFC 5842, 7.1
    StatusIMUsed                        = 226 // RFC 3229, 10.4.1
    StatusMultipleChoices               = 300 // RFC 7231, 6.4.1
    StatusMovedPermanently              = 301 // RFC 7231, 6.4.2
    StatusFound                         = 302 // RFC 7231, 6.4.3
    StatusSeeOther                      = 303 // RFC 7231, 6.4.4
    StatusNotModified                   = 304 // RFC 7232, 4.1
    StatusUseProxy                      = 305 // RFC 7231, 6.4.5
    StatusSwitchProxy                   = 306 // RFC 9110, 15.4.7 (Unused)
    StatusTemporaryRedirect             = 307 // RFC 7231, 6.4.7
    StatusPermanentRedirect             = 308 // RFC 7538, 3
    StatusBadRequest                    = 400 // RFC 7231, 6.5.1
    StatusUnauthorized                  = 401 // RFC 7235, 3.1
    StatusPaymentRequired               = 402 // RFC 7231, 6.5.2
    StatusForbidden                     = 403 // RFC 7231, 6.5.3
    StatusNotFound                      = 404 // RFC 7231, 6.5.4
    StatusMethodNotAllowed              = 405 // RFC 7231, 6.5.5
    StatusNotAcceptable                 = 406 // RFC 7231, 6.5.6
    StatusProxyAuthRequired             = 407 // RFC 7235, 3.2
    StatusRequestTimeout                = 408 // RFC 7231, 6.5.7
    StatusConflict                      = 409 // RFC 7231, 6.5.8
    StatusGone                          = 410 // RFC 7231, 6.5.9
    StatusLengthRequired                = 411 // RFC 7231, 6.5.10
    StatusPreconditionFailed            = 412 // RFC 7232, 4.2
    StatusRequestEntityTooLarge         = 413 // RFC 7231, 6.5.11
    StatusRequestURITooLong             = 414 // RFC 7231, 6.5.12
    StatusUnsupportedMediaType          = 415 // RFC 7231, 6.5.13
    StatusRequestedRangeNotSatisfiable  = 416 // RFC 7233, 4.4
    StatusExpectationFailed             = 417 // RFC 7231, 6.5.14
    StatusTeapot                        = 418 // RFC 7168, 2.3.3
    StatusMisdirectedRequest            = 421 // RFC 7540, 9.1.2
    StatusUnprocessableEntity           = 422 // RFC 4918, 11.2
    StatusLocked                        = 423 // RFC 4918, 11.3
    StatusFailedDependency              = 424 // RFC 4918, 11.4
    StatusTooEarly                      = 425 // RFC 8470, 5.2.
    StatusUpgradeRequired               = 426 // RFC 7231, 6.5.15
    StatusPreconditionRequired          = 428 // RFC 6585, 3
    StatusTooManyRequests               = 429 // RFC 6585, 4
    StatusRequestHeaderFieldsTooLarge   = 431 // RFC 6585, 5
    StatusUnavailableForLegalReasons    = 451 // RFC 7725, 3
    StatusInternalServerError           = 500 // RFC 7231, 6.6.1
    StatusNotImplemented                = 501 // RFC 7231, 6.6.2
    StatusBadGateway                    = 502 // RFC 7231, 6.6.3
    StatusServiceUnavailable            = 503 // RFC 7231, 6.6.4
    StatusGatewayTimeout                = 504 // RFC 7231, 6.6.5
    StatusHTTPVersionNotSupported       = 505 // RFC 7231, 6.6.6
    StatusVariantAlsoNegotiates         = 506 // RFC 2295, 8.1
    StatusInsufficientStorage           = 507 // RFC 4918, 11.5
    StatusLoopDetected                  = 508 // RFC 5842, 7.2
    StatusNotExtended                   = 510 // RFC 2774, 7
    StatusNetworkAuthenticationRequired = 511 // RFC 6585, 6
)
```

### Errors

```go
var (
    ErrBadRequest                    = NewError(StatusBadRequest)                    // RFC 7231, 6.5.1
    ErrUnauthorized                  = NewError(StatusUnauthorized)                  // RFC 7235, 3.1
    ErrPaymentRequired               = NewError(StatusPaymentRequired)               // RFC 7231, 6.5.2
    ErrForbidden                     = NewError(StatusForbidden)                     // RFC 7231, 6.5.3
    ErrNotFound                      = NewError(StatusNotFound)                      // RFC 7231, 6.5.4
    ErrMethodNotAllowed              = NewError(StatusMethodNotAllowed)              // RFC 7231, 6.5.5
    ErrNotAcceptable                 = NewError(StatusNotAcceptable)                 // RFC 7231, 6.5.6
    ErrProxyAuthRequired             = NewError(StatusProxyAuthRequired)             // RFC 7235, 3.2
    ErrRequestTimeout                = NewError(StatusRequestTimeout)                // RFC 7231, 6.5.7
    ErrConflict                      = NewError(StatusConflict)                      // RFC 7231, 6.5.8
    ErrGone                          = NewError(StatusGone)                          // RFC 7231, 6.5.9
    ErrLengthRequired                = NewError(StatusLengthRequired)                // RFC 7231, 6.5.10
    ErrPreconditionFailed            = NewError(StatusPreconditionFailed)            // RFC 7232, 4.2
    ErrRequestEntityTooLarge         = NewError(StatusRequestEntityTooLarge)         // RFC 7231, 6.5.11
    ErrRequestURITooLong             = NewError(StatusRequestURITooLong)             // RFC 7231, 6.5.12
    ErrUnsupportedMediaType          = NewError(StatusUnsupportedMediaType)          // RFC 7231, 6.5.13
    ErrRequestedRangeNotSatisfiable  = NewError(StatusRequestedRangeNotSatisfiable)  // RFC 7233, 4.4
    ErrExpectationFailed             = NewError(StatusExpectationFailed)             // RFC 7231, 6.5.14
    ErrTeapot                        = NewError(StatusTeapot)                        // RFC 7168, 2.3.3
    ErrMisdirectedRequest            = NewError(StatusMisdirectedRequest)            // RFC 7540, 9.1.2
    ErrUnprocessableEntity           = NewError(StatusUnprocessableEntity)           // RFC 4918, 11.2
    ErrLocked                        = NewError(StatusLocked)                        // RFC 4918, 11.3
    ErrFailedDependency              = NewError(StatusFailedDependency)              // RFC 4918, 11.4
    ErrTooEarly                      = NewError(StatusTooEarly)                      // RFC 8470, 5.2.
    ErrUpgradeRequired               = NewError(StatusUpgradeRequired)               // RFC 7231, 6.5.15
    ErrPreconditionRequired          = NewError(StatusPreconditionRequired)          // RFC 6585, 3
    ErrTooManyRequests               = NewError(StatusTooManyRequests)               // RFC 6585, 4
    ErrRequestHeaderFieldsTooLarge   = NewError(StatusRequestHeaderFieldsTooLarge)   // RFC 6585, 5
    ErrUnavailableForLegalReasons    = NewError(StatusUnavailableForLegalReasons)    // RFC 7725, 3
    ErrInternalServerError           = NewError(StatusInternalServerError)           // RFC 7231, 6.6.1
    ErrNotImplemented                = NewError(StatusNotImplemented)                // RFC 7231, 6.6.2
    ErrBadGateway                    = NewError(StatusBadGateway)                    // RFC 7231, 6.6.3
    ErrServiceUnavailable            = NewError(StatusServiceUnavailable)            // RFC 7231, 6.6.4
    ErrGatewayTimeout                = NewError(StatusGatewayTimeout)                // RFC 7231, 6.6.5
    ErrHTTPVersionNotSupported       = NewError(StatusHTTPVersionNotSupported)       // RFC 7231, 6.6.6
    ErrVariantAlsoNegotiates         = NewError(StatusVariantAlsoNegotiates)         // RFC 2295, 8.1
    ErrInsufficientStorage           = NewError(StatusInsufficientStorage)           // RFC 4918, 11.5
    ErrLoopDetected                  = NewError(StatusLoopDetected)                  // RFC 5842, 7.2
    ErrNotExtended                   = NewError(StatusNotExtended)                   // RFC 2774, 7
    ErrNetworkAuthenticationRequired = NewError(StatusNetworkAuthenticationRequired) // RFC 6585, 6
)
```

HTTP Headers were copied from net/http.

```go
const (
    HeaderAuthorization                      = "Authorization"
    HeaderProxyAuthenticate                  = "Proxy-Authenticate"
    HeaderProxyAuthorization                 = "Proxy-Authorization"
    HeaderWWWAuthenticate                    = "WWW-Authenticate"
    HeaderAge                                = "Age"
    HeaderCacheControl                       = "Cache-Control"
    HeaderClearSiteData                      = "Clear-Site-Data"
    HeaderExpires                            = "Expires"
    HeaderPragma                             = "Pragma"
    HeaderWarning                            = "Warning"
    HeaderAcceptCH                           = "Accept-CH"
    HeaderAcceptCHLifetime                   = "Accept-CH-Lifetime"
    HeaderContentDPR                         = "Content-DPR"
    HeaderDPR                                = "DPR"
    HeaderEarlyData                          = "Early-Data"
    HeaderSaveData                           = "Save-Data"
    HeaderViewportWidth                      = "Viewport-Width"
    HeaderWidth                              = "Width"
    HeaderETag                               = "ETag"
    HeaderIfMatch                            = "If-Match"
    HeaderIfModifiedSince                    = "If-Modified-Since"
    HeaderIfNoneMatch                        = "If-None-Match"
    HeaderIfUnmodifiedSince                  = "If-Unmodified-Since"
    HeaderLastModified                       = "Last-Modified"
    HeaderVary                               = "Vary"
    HeaderConnection                         = "Connection"
    HeaderKeepAlive                          = "Keep-Alive"
    HeaderAccept                             = "Accept"
    HeaderAcceptCharset                      = "Accept-Charset"
    HeaderAcceptEncoding                     = "Accept-Encoding"
    HeaderAcceptLanguage                     = "Accept-Language"
    HeaderCookie                             = "Cookie"
    HeaderExpect                             = "Expect"
    HeaderMaxForwards                        = "Max-Forwards"
    HeaderSetCookie                          = "Set-Cookie"
    HeaderAccessControlAllowCredentials      = "Access-Control-Allow-Credentials"
    HeaderAccessControlAllowHeaders          = "Access-Control-Allow-Headers"
    HeaderAccessControlAllowMethods          = "Access-Control-Allow-Methods"
    HeaderAccessControlAllowOrigin           = "Access-Control-Allow-Origin"
    HeaderAccessControlExposeHeaders         = "Access-Control-Expose-Headers"
    HeaderAccessControlMaxAge                = "Access-Control-Max-Age"
    HeaderAccessControlRequestHeaders        = "Access-Control-Request-Headers"
    HeaderAccessControlRequestMethod         = "Access-Control-Request-Method"
    HeaderOrigin                             = "Origin"
    HeaderTimingAllowOrigin                  = "Timing-Allow-Origin"
    HeaderXPermittedCrossDomainPolicies      = "X-Permitted-Cross-Domain-Policies"
    HeaderDNT                                = "DNT"
    HeaderTk                                 = "Tk"
    HeaderContentDisposition                 = "Content-Disposition"
    HeaderContentEncoding                    = "Content-Encoding"
    HeaderContentLanguage                    = "Content-Language"
    HeaderContentLength                      = "Content-Length"
    HeaderContentLocation                    = "Content-Location"
    HeaderContentType                        = "Content-Type"
    HeaderForwarded                          = "Forwarded"
    HeaderVia                                = "Via"
    HeaderXForwardedFor                      = "X-Forwarded-For"
    HeaderXForwardedHost                     = "X-Forwarded-Host"
    HeaderXForwardedProto                    = "X-Forwarded-Proto"
    HeaderXForwardedProtocol                 = "X-Forwarded-Protocol"
    HeaderXForwardedSsl                      = "X-Forwarded-Ssl"
    HeaderXUrlScheme                         = "X-Url-Scheme"
    HeaderLocation                           = "Location"
    HeaderFrom                               = "From"
    HeaderHost                               = "Host"
    HeaderReferer                            = "Referer"
    HeaderReferrerPolicy                     = "Referrer-Policy"
    HeaderUserAgent                          = "User-Agent"
    HeaderAllow                              = "Allow"
    HeaderServer                             = "Server"
    HeaderAcceptRanges                       = "Accept-Ranges"
    HeaderContentRange                       = "Content-Range"
    HeaderIfRange                            = "If-Range"
    HeaderRange                              = "Range"
    HeaderContentSecurityPolicy              = "Content-Security-Policy"
    HeaderContentSecurityPolicyReportOnly    = "Content-Security-Policy-Report-Only"
    HeaderCrossOriginResourcePolicy          = "Cross-Origin-Resource-Policy"
    HeaderExpectCT                           = "Expect-CT"
    HeaderFeaturePolicy                      = "Feature-Policy"
    HeaderPublicKeyPins                      = "Public-Key-Pins"
    HeaderPublicKeyPinsReportOnly            = "Public-Key-Pins-Report-Only"
    HeaderStrictTransportSecurity            = "Strict-Transport-Security"
    HeaderUpgradeInsecureRequests            = "Upgrade-Insecure-Requests"
    HeaderXContentTypeOptions                = "X-Content-Type-Options"
    HeaderXDownloadOptions                   = "X-Download-Options"
    HeaderXFrameOptions                      = "X-Frame-Options"
    HeaderXPoweredBy                         = "X-Powered-By"
    HeaderXXSSProtection                     = "X-XSS-Protection"
    HeaderLastEventID                        = "Last-Event-ID"
    HeaderNEL                                = "NEL"
    HeaderPingFrom                           = "Ping-From"
    HeaderPingTo                             = "Ping-To"
    HeaderReportTo                           = "Report-To"
    HeaderTE                                 = "TE"
    HeaderTrailer                            = "Trailer"
    HeaderTransferEncoding                   = "Transfer-Encoding"
    HeaderSecWebSocketAccept                 = "Sec-WebSocket-Accept"
    HeaderSecWebSocketExtensions             = "Sec-WebSocket-Extensions"
    HeaderSecWebSocketKey                    = "Sec-WebSocket-Key"
    HeaderSecWebSocketProtocol               = "Sec-WebSocket-Protocol"
    HeaderSecWebSocketVersion                = "Sec-WebSocket-Version"
    HeaderAcceptPatch                        = "Accept-Patch"
    HeaderAcceptPushPolicy                   = "Accept-Push-Policy"
    HeaderAcceptSignature                    = "Accept-Signature"
    HeaderAltSvc                             = "Alt-Svc"
    HeaderDate                               = "Date"
    HeaderIndex                              = "Index"
    HeaderLargeAllocation                    = "Large-Allocation"
    HeaderLink                               = "Link"
    HeaderPushPolicy                         = "Push-Policy"
    HeaderRetryAfter                         = "Retry-After"
    HeaderServerTiming                       = "Server-Timing"
    HeaderSignature                          = "Signature"
    HeaderSignedHeaders                      = "Signed-Headers"
    HeaderSourceMap                          = "SourceMap"
    HeaderUpgrade                            = "Upgrade"
    HeaderXDNSPrefetchControl                = "X-DNS-Prefetch-Control"
    HeaderXPingback                          = "X-Pingback"
    HeaderXRequestID                         = "X-Request-ID"
    HeaderXRequestedWith                     = "X-Requested-With"
    HeaderXRobotsTag                         = "X-Robots-Tag"
    HeaderXUACompatible                      = "X-UA-Compatible"
    HeaderAccessControlAllowPrivateNetwork   = "Access-Control-Allow-Private-Network"
    HeaderAccessControlRequestPrivateNetwork = "Access-Control-Request-Private-Network"
)
```

---
id: ctx
title: 🧠 Ctx
description: >-
  The Ctx interface represents the Context which holds the HTTP request and
  response. It has methods for the request query string, parameters, body, HTTP
  headers, and so on.
sidebar_position: 3
---

### Abandon

Marks the context as abandoned. An abandoned context will not be returned to the pool when `ReleaseCtx` is called. This is used internally by the [timeout middleware](../middleware/timeout.md) to return immediately while the handler goroutine continues safely.

```go title="Signature"
func (c fiber.Ctx) Abandon()
func (c fiber.Ctx) IsAbandoned() bool
func (c fiber.Ctx) ForceRelease()
```

| Method         | Description                                                                 |
|:---------------|:----------------------------------------------------------------------------|
| `Abandon()`    | Marks the context as abandoned. ReleaseCtx becomes a no-op for this context. |
| `IsAbandoned()`| Returns `true` if `Abandon()` was called on this context.                   |
| `ForceRelease()`| Releases an abandoned context back to the pool. Must only be called after the handler has completely finished. |

:::caution
These methods are primarily for internal use and advanced middleware development. Most applications should not need to call them directly.
:::

### App

Returns the [\*App](app.md) reference so you can easily access all application settings.

```go title="Signature"
func (c fiber.Ctx) App() *App
```

```go title="Example"
app.Get("/stack", func(c fiber.Ctx) error {
  return c.JSON(c.App().Stack())
})
```

### Bind

Bind returns a helper for decoding the request body, query string, headers, cookies, and more.

For full details, see the [Bind](./bind.md) documentation.

```go title="Signature"
func (c fiber.Ctx) Bind() *Bind
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  user := new(User)
  // Bind the request body to a struct:
  return c.Bind().Body(user)
})
```

### Context

Returns a `context.Context` that was previously set with [`SetContext`](#setcontext).
If no context was set, it returns `context.Background()`. Unlike `fiber.Ctx` itself,
the returned context is safe to use after the handler completes.

```go title="Signature"
func (c fiber.Ctx) Context() context.Context
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  ctx := c.Context()
  go doWork(ctx)
  return nil
})
```

### context.Context

`Ctx` implements `context.Context`. However due to [current limitations in how fasthttp](https://github.com/valyala/fasthttp/issues/965#issuecomment-777268945) works, `Deadline()`, `Done()` and `Err()` are no-ops. The `fiber.Ctx` instance is reused after the handler returns and must not be used for asynchronous operations once the handler has completed. Call [`Context`](#context) within the handler to obtain a `context.Context` that can be used outside the handler.

```go title="Signature"
func (c fiber.Ctx) Deadline() (deadline time.Time, ok bool)
func (c fiber.Ctx) Done() <-chan struct{}
func (c fiber.Ctx) Err() error
func (c fiber.Ctx) Value(key any) any
```

```go title="Example"

func doSomething(ctx context.Context) {
  // ...
}

app.Get("/", func(c fiber.Ctx) error {
  doSomething(c)
})
```

#### Value

Value can be used to retrieve [**`Locals`**](#locals).

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Locals(userKey, "admin")
  user := c.Value(userKey) // returns "admin"
})
```

### Drop

Terminates the client connection silently without sending any HTTP headers or response body.

This can be used for scenarios where you want to block certain requests without notifying the client, such as mitigating
DDoS attacks or protecting sensitive endpoints from unauthorized access.

```go title="Signature"
func (c fiber.Ctx) Drop() error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  if c.IP() == "192.168.1.1" {
    return c.Drop()
  }

  return c.SendString("Hello World!")
})
```

### FullPath

Returns the full path of the matched route. This includes any prefixes that were added by [groups](../guide/routing.md#grouping) or mounts.

```go title="Signature"
func (c fiber.Ctx) FullPath() string
```

```go title="Example"
api := app.Group("/api")
api.Get("/users/:id", func(c fiber.Ctx) error {
  return c.JSON(fiber.Map{
    "route": c.FullPath(), // "/api/users/:id"
  })
})

app.Use(func(c fiber.Ctx) error {
  beforeNext := c.FullPath() // "/"

  if err := c.Next(); err != nil {
    return err
  }

  afterNext := c.FullPath() // "/api/users/:id"
  // ... react to the downstream handler's route path
  return nil
})
```

### GetReqHeaders

Returns the HTTP request headers as a map. Because a header can appear multiple times in a request, each key maps to a slice with all values for that header.

```go title="Signature"
func (c fiber.Ctx) GetReqHeaders() map[string][]string
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### GetRespHeader

Returns the HTTP response header specified by the field.

:::tip
The match is **case-insensitive**.
:::

```go title="Signature"
func (c fiber.Ctx) GetRespHeader(key string, defaultValue ...string) string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.GetRespHeader("X-Request-Id")       // "8d7ad5e3-aaf3-450b-a241-2beb887efd54"
  c.GetRespHeader("Content-Type")       // "text/plain"
  c.GetRespHeader("something", "john")  // "john"
  // ..
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### GetRespHeaders

Returns the HTTP response headers as a map. Since a header can be set multiple times in a single request, the values of the map are slices of strings containing all the different values of the header.

```go title="Signature"
func (c fiber.Ctx) GetRespHeaders() map[string][]string
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### GetRouteURL

Generates URLs to named routes, with parameters. URLs are relative, for example: "/user/1831"

```go title="Signature"
func (c fiber.Ctx) GetRouteURL(routeName string, params Map) (string, error)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
    return c.SendString("Home page")
}).Name("home")

app.Get("/user/:id", func(c fiber.Ctx) error {
    return c.SendString(c.Params("id"))
}).Name("user.show")

app.Get("/test", func(c fiber.Ctx) error {
    location, _ := c.GetRouteURL("user.show", fiber.Map{"id": 1})
    return c.SendString(location)
})

// /test returns "/user/1"
```

### HasBody

Returns `true` if the incoming request contains a body or a `Content-Length` header greater than zero.

```go title="Signature"
func (c fiber.Ctx) HasBody() bool
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  if !c.HasBody() {
    return c.SendStatus(fiber.StatusBadRequest)
  }
  return c.SendString("OK")
})
```

### IsMiddleware

Returns `true` if the current request handler was registered as middleware.

```go title="Signature"
func (c fiber.Ctx) IsMiddleware() bool
```

```go title="Example"
app.Get("/route", func(c fiber.Ctx) error {
  fmt.Println(c.IsMiddleware()) // true
  return c.Next()
}, func(c fiber.Ctx) error {
  fmt.Println(c.IsMiddleware()) // false
  return c.SendStatus(fiber.StatusOK)
})
```

### IsPreflight

Returns `true` if the request is a CORS preflight (`OPTIONS` + `Access-Control-Request-Method` + `Origin`).

```go title="Signature"
func (c fiber.Ctx) IsPreflight() bool
```

```go title="Example"
app.Use(func(c fiber.Ctx) error {
  if c.IsPreflight() {
    return c.SendStatus(fiber.StatusNoContent)
  }
  return c.Next()
})
```

### IsWebSocket

Returns `true` if the request includes a WebSocket upgrade handshake.

```go title="Signature"
func (c fiber.Ctx) IsWebSocket() bool
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  if c.IsWebSocket() {
    // handle websocket
  }
  return c.Next()
})
```

### Locals

Stores variables scoped to the request, making them available only to matching routes. The variables are removed after the request completes. If a stored value implements `io.Closer`, Fiber calls its `Close` method before removal.

:::tip
This is useful if you want to pass some **specific** data to the next middleware. Remember to perform type assertions when retrieving the data to ensure it is of the expected type. You can also use a non-exported type as a key to avoid collisions.
:::

```go title="Signature"
func (c fiber.Ctx) Locals(key any, value ...any) any
```

```go title="Example"

// keyType is an unexported type for keys defined in this package.
// This prevents collisions with keys defined in other packages.
type keyType int

// userKey is the key for user.User values in Contexts. It is
// unexported; clients use user.NewContext and user.FromContext
// instead of using this key directly.
var userKey keyType

app.Use(func(c fiber.Ctx) error {
  c.Locals(userKey, "admin") // Stores the string "admin" under a non-exported type key
  return c.Next()
})

app.Get("/admin", func(c fiber.Ctx) error {
  user, ok := c.Locals(userKey).(string) // Retrieves the data stored under the key and performs a type assertion
  if ok && user == "admin" {
    return c.Status(fiber.StatusOK).SendString("Welcome, admin!")
  }
  return c.SendStatus(fiber.StatusForbidden)
})
```

An alternative version of the `Locals` method that takes advantage of Go's generics feature is also available. This version allows for the manipulation and retrieval of local values within a request's context with a more specific data type.

```go title="Signature"
func Locals[V any](c fiber.Ctx, key any, value ...V) V
```

```go title="Example"
app.Use(func(c fiber.Ctx) error {
  fiber.Locals[string](c, "john", "doe")
  fiber.Locals[int](c, "age", 18)
  fiber.Locals[bool](c, "isHuman", true)
  return c.Next()
})

app.Get("/test", func(c fiber.Ctx) error {
  fiber.Locals[string](c, "john")    // "doe"
  fiber.Locals[int](c, "age")        // 18
  fiber.Locals[bool](c, "isHuman")   // true
  return nil
})
```

Make sure to understand and correctly implement the `Locals` method in both its standard and generic form for better control over route-specific data within your application.

### Matched

Returns `true` if the current request path was matched by the router.

```go title="Signature"
func (c fiber.Ctx) Matched() bool
```

```go title="Example"
app.Use(func(c fiber.Ctx) error {
  if c.Matched() {
    return c.Next()
  }
  return c.Status(fiber.StatusNotFound).SendString("Not Found")
})
```

### Next

When **Next** is called, it executes the next method in the stack that matches the current route. You can pass an error struct within the method that will end the chaining and call the [error handler](../guide/error-handling).

```go title="Signature"
func (c fiber.Ctx) Next() error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  fmt.Println("1st route!")
  return c.Next()
})

app.Get("*", func(c fiber.Ctx) error {
  fmt.Println("2nd route!")
  return c.Next()
})

app.Get("/", func(c fiber.Ctx) error {
  fmt.Println("3rd route!")
  return c.SendString("Hello, World!")
})
```

### OverrideParam

Overwrites the value of an existing route parameter.

:::note
If the parameter does not exist, this method does nothing.
:::

```go title="Signature"
func (c fiber.Ctx) OverrideParam(name, value string)
```

```go title="Example"
// GET http://example.com/user
app.Get("/user/:name", func(c fiber.Ctx) error {
  // mutate parameter
  c.OverrideParam("name", "new value")
  return c.SendString(c.Params("name")) // sends "new value"
})
// GET http://example.com/shop/tech/1
app.Get("/shop/*", func(c fiber.Ctx) error {
  // mutate parameter
  c.OverrideParam("*", "new tech") // replaces "tech/1" with "new tech"
  return c.SendString(c.Params("*")) // sends "new tech"
})

```

Unnamed route parameters can be accessed by their character (`*` or `+`) followed by their position index (e.g., `*1` for the first wildcard, `*2` for the second).

```go title="Example"
// GET /v1/brand/4/shop/blue/xs
app.Get("/v1/*/shop/*", func(c fiber.Ctx) error {
  // mutate parameter
  c.OverrideParam("*1", "updated brand")
  c.OverrideParam("*2", "updated data")

  param1 := c.Params("*1") // "updated brand"
  param2 := c.Params("*2") // "updated data"

  // ...
})
```

### Redirect

Returns the Redirect reference.

For detailed information, check the [Redirect](./redirect.md) documentation.

```go title="Signature"
func (c fiber.Ctx) Redirect() *Redirect
```

```go title="Example"
app.Get("/coffee", func(c fiber.Ctx) error {
    return c.Redirect().To("/teapot")
})

app.Get("/teapot", func(c fiber.Ctx) error {
    return c.Status(fiber.StatusTeapot).Send("🍵 short and stout 🍵")
})
```

### Request

Returns the [*fasthttp.Request](https://pkg.go.dev/github.com/valyala/fasthttp#Request) pointer.

```go title="Signature"
func (c fiber.Ctx) Request() *fasthttp.Request
```

:::info
Returns `nil` if the context has been released (e.g., after the handler completes and the context is returned to the pool).
:::

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Request().Header.Method()
  // => []byte("GET")
})
```

### RequestCtx

Returns [\*fasthttp.RequestCtx](https://pkg.go.dev/github.com/valyala/fasthttp#RequestCtx) that is compatible with the `context.Context` interface that requires a deadline, a cancellation signal, and other values across API boundaries.

```go title="Signature"
func (c fiber.Ctx) RequestCtx() *fasthttp.RequestCtx
```

:::info
Please read the [Fasthttp Documentation](https://pkg.go.dev/github.com/valyala/fasthttp?tab=doc) for more information.
:::

### Reset

Resets the context fields by the given request when using server handlers.

```go title="Signature"
func (c fiber.Ctx) Reset(fctx *fasthttp.RequestCtx)
```

It is used outside of the Fiber Handlers to reset the context for the next request.

### Response

Returns the [\*fasthttp.Response](https://pkg.go.dev/github.com/valyala/fasthttp#Response) pointer.

```go title="Signature"
func (c fiber.Ctx) Response() *fasthttp.Response
```

:::info
Returns `nil` if the context has been released (e.g., after the handler completes and the context is returned to the pool).
:::

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Response().BodyWriter().Write([]byte("Hello, World!"))
  // => "Hello, World!"
  return nil
})
```

### RestartRouting

Instead of executing the next method when calling [Next](ctx.md#next), **RestartRouting** restarts execution from the first method that matches the current route. This may be helpful after overriding the path, i.e., an internal redirect. Note that handlers might be executed again, which could result in an infinite loop.

```go title="Signature"
func (c fiber.Ctx) RestartRouting() error
```

```go title="Example"
app.Get("/new", func(c fiber.Ctx) error {
  return c.SendString("From /new")
})

app.Get("/old", func(c fiber.Ctx) error {
  c.Path("/new")
  return c.RestartRouting()
})
```

### Route

Returns the matched [Route](https://pkg.go.dev/github.com/gofiber/fiber?tab=doc#Route) struct.

```go title="Signature"
func (c fiber.Ctx) Route() *Route
```

```go title="Example"
// http://localhost:8080/hello

app.Get("/hello/:name", func(c fiber.Ctx) error {
  r := c.Route()
  fmt.Println(r.Method, r.Path, r.Params, r.Handlers)
  // GET /hello/:name handler [name]

  // ...
})
```

:::caution
Do not rely on `c.Route()` in middlewares **before** calling `c.Next()` - `c.Route()` returns the **last executed route**.
:::

```go title="Example"
func MyMiddleware() fiber.Handler {
  return func(c fiber.Ctx) error {
    beforeNext := c.Route().Path // Will be '/'
    err := c.Next()
    afterNext := c.Route().Path // Will be '/hello/:name'
    return err
  }
}
```

### SetContext

Sets the base `context.Context` used by [`Context`](#context). Use this to
propagate deadlines, cancellation signals, or values to asynchronous operations.

```go title="Signature"
func (c fiber.Ctx) SetContext(ctx context.Context)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.SetContext(context.WithValue(context.Background(), "user", "alice"))
  ctx := c.Context()
  go doWork(ctx)
  return nil
})
```

### String

Returns a unique string representation of the context.

```go title="Signature"
func (c fiber.Ctx) String() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.String() // => "#0000000100000001 - 127.0.0.1:3000 <-> 127.0.0.1:61516 - GET http://localhost:3000/"

  // ...
})
```

### ViewBind

Adds variables to the default view variable map binding to the template engine.
Variables are read by the `Render` method and may be overwritten.

```go title="Signature"
func (c fiber.Ctx) ViewBind(vars Map) error
```

```go title="Example"
app.Use(func(c fiber.Ctx) error {
  c.ViewBind(fiber.Map{
    "Title": "Hello, World!",
  })
  return c.Next()
})

app.Get("/", func(c fiber.Ctx) error {
  return c.Render("xxx.tmpl", fiber.Map{}) // Render will use the Title variable
})
```

## Request

Methods which operate on the incoming request.

:::tip
Use `c.Req()` to limit gopls suggestions to only these methods!
:::

### AcceptEncoding

Returns the `Accept-Encoding` request header.

```go title="Signature"
func (c fiber.Ctx) AcceptEncoding() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.AcceptEncoding() // "gzip, br"
  return nil
})
```

### AcceptLanguage

Returns the `Accept-Language` request header.

```go title="Signature"
func (c fiber.Ctx) AcceptLanguage() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.AcceptLanguage() // "en-US,en;q=0.9"
  return nil
})
```

### Accepts

Checks if the specified **extensions** or **content** **types** are acceptable.

:::info
Based on the request’s [Accept](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) HTTP header.
:::

```go title="Signature"
func (c fiber.Ctx) Accepts(offers ...string) string
func (c fiber.Ctx) AcceptsCharsets(offers ...string) string
func (c fiber.Ctx) AcceptsEncodings(offers ...string) string
func (c fiber.Ctx) AcceptsLanguages(offers ...string) string
func (c fiber.Ctx) AcceptsLanguagesExtended(offers ...string) string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Accepts("html")             // "html"
  c.Accepts("text/html")        // "text/html"
  c.Accepts("json", "text")     // "json"
  c.Accepts("application/json") // "application/json"
  c.Accepts("text/plain", "application/json") // "application/json", due to quality
  c.Accepts("image/png")        // ""
  c.Accepts("png")              // ""
  // ...
})
```

```go title="Example 2"
// Accept: text/html, text/*, application/json, */*; q=0

app.Get("/", func(c fiber.Ctx) error {
  c.Accepts("text/plain", "application/json") // "application/json", due to specificity
  c.Accepts("application/json", "text/html") // "text/html", due to first match
  c.Accepts("image/png")                      // "", due to */* with q=0 is Not Acceptable
  // ...
})
```

Media-Type parameters are supported.

```go title="Example 3"
// Accept: text/plain, application/json; version=1; foo=bar

app.Get("/", func(c fiber.Ctx) error {
  // Extra parameters in the accept are ignored
  c.Accepts("text/plain;format=flowed") // "text/plain;format=flowed"

  // An offer must contain all parameters present in the Accept type
  c.Accepts("application/json") // ""

  // Parameter order and capitalization do not matter. Quotes on values are stripped.
  c.Accepts(`application/json;foo="bar";VERSION=1`) // "application/json;foo="bar";VERSION=1"
})
```

```go title="Example 4"
// Accept: text/plain;format=flowed;q=0.9, text/plain
// i.e., "I prefer text/plain;format=flowed less than other forms of text/plain"

app.Get("/", func(c fiber.Ctx) error {
  // Beware: the order in which offers are listed matters.
  // Although the client specified they prefer not to receive format=flowed,
  // the text/plain Accept matches with "text/plain;format=flowed" first, so it is returned.
  c.Accepts("text/plain;format=flowed", "text/plain") // "text/plain;format=flowed"

  // Here, things behave as expected:
  c.Accepts("text/plain", "text/plain;format=flowed") // "text/plain"
})
```

Fiber provides similar functions for the other accept headers.

For `Accept-Language`, Fiber uses the [Basic Filtering](https://www.rfc-editor.org/rfc/rfc4647#section-3.3.1) algorithm. A language range matches an offer only if it exactly equals the tag or is a prefix followed by a hyphen. For example, the range `en` matches `en-US`, but `en-US` does not match `en`.

`AcceptsLanguagesExtended` applies [Extended Filtering](https://www.rfc-editor.org/rfc/rfc4647#section-3.3.2) where `*` may match zero or more subtags and wildcard matches can slide across subtags unless blocked by a singleton like `x`.

```go
// Accept-Charset: utf-8, iso-8859-1;q=0.2
// Accept-Encoding: gzip, compress;q=0.2
// Accept-Language: en;q=0.8, nl, ru

app.Get("/", func(c fiber.Ctx) error {
  c.AcceptsCharsets("utf-16", "iso-8859-1")
  // "iso-8859-1"

  c.AcceptsEncodings("compress", "br")
  // "compress"

  c.AcceptsLanguages("pt", "nl", "ru")
  // "nl"

  c.AcceptsLanguagesExtended("en-US", "fr-CA")
  // depends on extended ranges in the request header
  // ...
})
```

### AcceptsEventStream

Returns `true` when the `Accept` header allows `text/event-stream`.

```go title="Signature"
func (c fiber.Ctx) AcceptsEventStream() bool
```

```go title="Example"
// Accept: text/html, application/json;q=0.9

app.Get("/", func(c fiber.Ctx) error {
  c.AcceptsEventStream() // false
  return nil
})
```

### AcceptsHTML

Returns `true` when the `Accept` header allows HTML.

```go title="Signature"
func (c fiber.Ctx) AcceptsHTML() bool
```

```go title="Example"
// Accept: text/html, application/json;q=0.9

app.Get("/", func(c fiber.Ctx) error {
  c.AcceptsHTML() // true
  return nil
})
```

### AcceptsJSON

Returns `true` when the `Accept` header allows JSON.

```go title="Signature"
func (c fiber.Ctx) AcceptsJSON() bool
```

```go title="Example"
// Accept: text/html, application/json;q=0.9

app.Get("/", func(c fiber.Ctx) error {
  c.AcceptsJSON() // true
  return nil
})
```

### AcceptsXML

Returns `true` when the `Accept` header allows XML.

```go title="Signature"
func (c fiber.Ctx) AcceptsXML() bool
```

```go title="Example"
// Accept: text/html, application/json;q=0.9

app.Get("/", func(c fiber.Ctx) error {
  c.AcceptsXML() // false
  return nil
})
```

### BaseURL

Returns the base URL (**protocol** + **host**) as a `string`.

```go title="Signature"
func (c fiber.Ctx) BaseURL() string
```

```go title="Example"
// GET https://example.com/page#chapter-1

app.Get("/", func(c fiber.Ctx) error {
  c.BaseURL() // "https://example.com"
  // ...
})
```

### Body

As per the header `Content-Encoding`, this method will try to perform a file decompression from the **body** bytes. In case no `Content-Encoding` header is sent (or when it is set to `identity`), it will perform as [BodyRaw](#bodyraw). If an unknown or unsupported encoding is encountered, the response status will be `415 Unsupported Media Type` or `501 Not Implemented`. Decompression is bounded by the app [BodyLimit](./fiber.md#bodylimit).

```go title="Signature"
func (c fiber.Ctx) Body() []byte
```

```go title="Example"
// echo 'user=john' | gzip | curl -v -i --data-binary @- -H "Content-Encoding: gzip" http://localhost:8080

app.Post("/", func(c fiber.Ctx) error {
  // Decompress body from POST request based on the Content-Encoding and return the raw content:
  return c.Send(c.Body()) // []byte("user=john")
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### BodyRaw

Returns the raw request **body**.

```go title="Signature"
func (c fiber.Ctx) BodyRaw() []byte
```

```go title="Example"
// curl -X POST http://localhost:8080 -d user=john

app.Post("/", func(c fiber.Ctx) error {
  // Get raw body from POST request:
  return c.Send(c.BodyRaw()) // []byte("user=john")
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### Charset

Returns the `charset` parameter from the `Content-Type` header.

```go title="Signature"
func (c fiber.Ctx) Charset() string
```

```go title="Example"
// Content-Type: application/json; charset=utf-8

app.Post("/", func(c fiber.Ctx) error {
  c.Charset() // "utf-8"
  return nil
})
```

### ClientHelloInfo

`ClientHelloInfo` contains information from a ClientHello message to guide application logic in the `GetCertificate` and `GetConfigForClient` callbacks.
Refer to the [ClientHelloInfo](https://golang.org/pkg/crypto/tls/#ClientHelloInfo) struct documentation for details on the returned struct.

```go title="Signature"
func (c fiber.Ctx) ClientHelloInfo() *tls.ClientHelloInfo
```

```go title="Example"
// GET http://example.com/hello
app.Get("/hello", func(c fiber.Ctx) error {
  chi := c.ClientHelloInfo()
  // ...
})
```

### Cookies

Gets a cookie value by key. You can pass an optional default value that will be returned if the cookie key does not exist.

```go title="Signature"
func (c fiber.Ctx) Cookies(key string, defaultValue ...string) string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // Get cookie by key:
  c.Cookies("name")         // "john"
  c.Cookies("empty", "doe") // "doe"
  // ...
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Use [`App.GetString`](./app.md#getstring) or [`App.GetBytes`](./app.md#getbytes) when immutability is enabled, or manually copy values (for example with [`utils.CopyString`](https://github.com/gofiber/utils) / `utils.CopyBytes`) when it's disabled. [Read more...](../#zero-allocation)
:::

### FormFile

MultipartForm files can be retrieved by name, the **first** file from the given key is returned.

```go title="Signature"
func (c fiber.Ctx) FormFile(key string) (*multipart.FileHeader, error)
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  // Get first file from form field "document":
  file, err := c.FormFile("document")

  // Save file to root directory:
  return c.SaveFile(file, fmt.Sprintf("./%s", file.Filename))
})
```

### FormValue

Form values can be retrieved by name, the **first** value for the given key is returned.

```go title="Signature"
func (c fiber.Ctx) FormValue(key string, defaultValue ...string) string
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  // Get first value from form field "name":
  c.FormValue("name")
  // => "john" or "" if not exist

  // ..
})
```

:::info

The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)

:::

### Fresh

When the response is still **fresh** in the client's cache **true** is returned; otherwise, **false** is returned to indicate that the client cache is now stale and the full response should be sent.

When a client sends the Cache-Control: no-cache request header to indicate an end-to-end reload request, `Fresh` will return false to make handling these requests transparent.

Read more on [https://expressjs.com/en/4x/api.html\#req.fresh](https://expressjs.com/en/4x/api.html#req.fresh)

```go title="Signature"
func (c fiber.Ctx) Fresh() bool
```

### FullURL

Returns the full request URL (protocol + host + original URL).

```go title="Signature"
func (c fiber.Ctx) FullURL() string
```

```go title="Example"
// GET http://example.com/search?q=fiber

app.Get("/", func(c fiber.Ctx) error {
  c.FullURL() // "http://example.com/search?q=fiber"
  return nil
})
```

### Get

Returns the HTTP request header specified by the field.

:::tip
The match is **case-insensitive**.
:::

```go title="Signature"
func (c fiber.Ctx) Get(key string, defaultValue ...string) string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Get("Content-Type")       // "text/plain"
  c.Get("CoNtEnT-TypE")       // "text/plain"
  c.Get("something", "john")  // "john"
  // ..
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### HasHeader

Reports whether the request includes a header with the given key.

```go title="Signature"
func (c fiber.Ctx) HasHeader(key string) bool
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.HasHeader("X-Trace-Id")
  return nil
})
```

### Host

Returns the host derived from the [Host](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host) HTTP header.

In a network context, [`Host`](#host) refers to the combination of a hostname and potentially a port number used for connecting, while [`Hostname`](#hostname) refers specifically to the name assigned to a device on a network, excluding any port information.

```go title="Signature"
func (c fiber.Ctx) Host() string
```

```go title="Example"
// GET http://google.com:8080/search

app.Get("/", func(c fiber.Ctx) error {
  c.Host()      // "google.com:8080"
  c.Hostname()  // "google.com"

  // ...
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### Hostname

Returns the hostname derived from the [Host](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host) HTTP header.

```go title="Signature"
func (c fiber.Ctx) Hostname() string
```

```go title="Example"
// GET http://google.com/search

app.Get("/", func(c fiber.Ctx) error {
  c.Hostname() // "google.com"

  // ...
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### IP

Returns the remote IP address of the request.

```go title="Signature"
func (c fiber.Ctx) IP() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.IP() // "127.0.0.1"

  // ...
})
```

:::info
By default, `c.IP()` returns the remote IP address from the TCP connection. When your Fiber app is behind a reverse proxy (like Nginx, Traefik, or a load balancer), you need to configure **both** [`TrustProxy`](fiber.md#trustproxy) and [`ProxyHeader`](fiber.md#proxyheader) to read the client IP from proxy headers like `X-Forwarded-For`.

**Important:** You must enable `TrustProxy` and configure trusted proxy IPs to prevent header spoofing. Simply setting `ProxyHeader` alone will not work.

**Note:** When using a proxy header such as `X-Forwarded-For`, `c.IP()` returns the raw header value unless [`EnableIPValidation`](fiber.md#enableipvalidation) is enabled.

**Chain parsing with `EnableIPValidation`:** For `X-Forwarded-For`, the raw value is a comma-separated chain that grows from left to right as the request passes through each proxy. With validation enabled, `c.IP()` walks the chain from right to left, skipping every IP that matches the configured `TrustProxyConfig` (exact IPs, CIDR ranges, loopback, private or link-local) and returns the first non-trusted IP it finds. This matches the behavior recommended by [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For#selecting_an_ip_address) and the convention used by Nginx (`set_real_ip_from` + `real_ip_recursive`), Apache `mod_remoteip`, and Envoy (`xff_num_trusted_hops`).

If every IP in the chain matches the trusted set, the leftmost IP is returned as a fallback. If the chain is empty, `c.IP()` falls back to the TCP remote address.
:::

#### Configuration for apps behind a reverse proxy

```go title="Example - Basic Configuration"
app := fiber.New(fiber.Config{
  // Enable proxy support
  TrustProxy: true,
  // Specify which header contains the real client IP
  ProxyHeader: fiber.HeaderXForwardedFor,
  // Configure which proxy IPs to trust
  TrustProxyConfig: fiber.TrustProxyConfig{
    // Trust private IP ranges (for internal load balancers)
    Private: true,
    // Or specify exact proxy IPs/ranges
    // Proxies: []string{"10.10.0.58", "192.168.0.0/24"},
  },
})
```

```go title="Example - Specific Proxy IPs"
app := fiber.New(fiber.Config{
  TrustProxy: true,
  ProxyHeader: fiber.HeaderXForwardedFor,
  TrustProxyConfig: fiber.TrustProxyConfig{
    // Trust only specific proxy IP addresses
    Proxies: []string{"10.10.0.58", "192.168.1.0/24"},
  },
})
```

See [`TrustProxy`](fiber.md#trustproxy) and [`TrustProxyConfig`](fiber.md#trustproxyconfig) for more details on security considerations and configuration options.

### IPs

Returns an array of IP addresses specified in the [X-Forwarded-For](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For) request header.

```go title="Signature"
func (c fiber.Ctx) IPs() []string
```

```go title="Example"
// X-Forwarded-For: proxy1, 127.0.0.1, proxy3

app.Get("/", func(c fiber.Ctx) error {
  c.IPs() // ["proxy1", "127.0.0.1", "proxy3"]

  // ...
})
```

:::caution
Improper use of the X-Forwarded-For header can be a security risk. For details, see the [Security and privacy concerns](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For#security_and_privacy_concerns) section.
:::

### Is

Returns the matching **content type**, if the incoming request’s [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type) HTTP header field matches the [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) specified by the type parameter.

:::info
If the request has **no** body, it returns **false**.
:::

```go title="Signature"
func (c fiber.Ctx) Is(extension string) bool
```

```go title="Example"
// Content-Type: text/html; charset=utf-8

app.Get("/", func(c fiber.Ctx) error {
  c.Is("html")  // true
  c.Is(".html") // true
  c.Is("json")  // false

  // ...
})
```

### IsForm

Reports whether the `Content-Type` header is form-encoded.

```go title="Signature"
func (c fiber.Ctx) IsForm() bool
```

```go title="Example"
// Content-Type: application/x-www-form-urlencoded

app.Post("/", func(c fiber.Ctx) error {
  c.IsForm() // true
  return nil
})
```

### IsFromLocal

Returns `true` if the request came from localhost.

```go title="Signature"
func (c fiber.Ctx) IsFromLocal() bool
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // If request came from localhost, return true; else return false
  c.IsFromLocal()

  // ...
})
```

### IsFromUnixSocket

Returns `true` if the request came in over a Unix domain socket.

```go title="Signature"
func (c fiber.Ctx) IsFromUnixSocket() bool
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  if c.IsFromUnixSocket() {
    return c.SendString("Connected via Unix socket")
  }
  return c.SendString("Connected via TCP")
})
```

### IsJSON

Reports whether the `Content-Type` header is JSON.

```go title="Signature"
func (c fiber.Ctx) IsJSON() bool
```

```go title="Example"
// Content-Type: application/json; charset=utf-8

app.Post("/", func(c fiber.Ctx) error {
  c.IsJSON() // true
  return nil
})
```

### IsMultipart

Reports whether the `Content-Type` header is multipart form data.

```go title="Signature"
func (c fiber.Ctx) IsMultipart() bool
```

```go title="Example"
// Content-Type: multipart/form-data; boundary=abc123

app.Post("/", func(c fiber.Ctx) error {
  c.IsMultipart() // true
  return nil
})
```

### IsProxyTrusted

Checks the trustworthiness of the remote IP.
If [`TrustProxy`](fiber.md#trustproxy) is `false`, it returns `true`.
`IsProxyTrusted` can check the remote IP by proxy ranges and IP map.

```go title="Signature"
func (c fiber.Ctx) IsProxyTrusted() bool
```

```go title="Example"
app := fiber.New(fiber.Config{
  // TrustProxy enables the trusted proxy check
  TrustProxy: true,
  // TrustProxyConfig allows for configuring trusted proxies.
  // Proxies is a list of trusted proxy IP ranges/addresses
  TrustProxyConfig: fiber.TrustProxyConfig{
    Proxies: []string{"0.8.0.0", "1.1.1.1/30"}, // IP address or IP address range
    Loopback: true,   // Trust loopback addresses (127.0.0.0/8, ::1/128)
    UnixSocket: true, // Trust Unix domain socket connections
  },
})

app.Get("/", func(c fiber.Ctx) error {
  // If request came from trusted proxy, return true; else return false
  c.IsProxyTrusted()

  // ...
})
```

### MediaType

Returns the MIME type from the `Content-Type` header without parameters.

```go title="Signature"
func (c fiber.Ctx) MediaType() string
```

```go title="Example"
// Content-Type: application/json; charset=utf-8

app.Post("/", func(c fiber.Ctx) error {
  c.MediaType() // "application/json"
  return nil
})
```

### Method

Returns a string corresponding to the HTTP method of the request: `GET`, `POST`, `PUT`, and so on.
Optionally, you can override the method by passing a string.

```go title="Signature"
func (c fiber.Ctx) Method(override ...string) string
```

```go title="Example"
app.Post("/override", func(c fiber.Ctx) error {
  c.Method()          // "POST"

  c.Method("GET")
  c.Method()          // "GET"

  // ...
})
```

### MultipartForm

To access multipart form entries, you can parse the binary with `MultipartForm()`. This returns a `*multipart.Form`, allowing you to access form values and files. Parsing is bounded by the app [BodyLimit](./fiber.md#bodylimit).

```go title="Signature"
func (c fiber.Ctx) MultipartForm() (*multipart.Form, error)
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  // Parse the multipart form:
  if form, err := c.MultipartForm(); err == nil {
    // => *multipart.Form

    if token := form.Value["token"]; len(token) > 0 {
      // Get key value:
      fmt.Println(token[0])
    }

    // Get all files from "documents" key:
    files := form.File["documents"]
    // => []*multipart.FileHeader

    // Loop through files:
    for _, file := range files {
      fmt.Println(file.Filename, file.Size, file.Header["Content-Type"][0])
      // => "tutorial.pdf" 360641 "application/pdf"

      // Save the files to disk:
      if err := c.SaveFile(file, fmt.Sprintf("./%s", file.Filename)); err != nil {
        return err
      }
    }
  }

  return nil
})
```

### OriginalURL

Returns the original request URL.

```go title="Signature"
func (c fiber.Ctx) OriginalURL() string
```

```go title="Example"
// GET http://example.com/search?q=something

app.Get("/", func(c fiber.Ctx) error {
  c.OriginalURL() // "/search?q=something"

  // ...
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

### Params

This method can be used to get the route parameters. You can pass an optional default value that will be returned if the param key does not exist.

:::info
Defaults to an empty string \(`""`\) if the param **doesn't** exist.
:::

```go title="Signature"
func (c fiber.Ctx) Params(key string, defaultValue ...string) string
```

```go title="Example"
// GET http://example.com/user/fenny
app.Get("/user/:name", func(c fiber.Ctx) error {
  c.Params("name") // "fenny"

  // ...
})

// GET http://example.com/user/fenny/123
app.Get("/user/*", func(c fiber.Ctx) error {
  c.Params("*")  // "fenny/123"
  c.Params("*1") // "fenny/123"

  // ...
})
```

Unnamed route parameters \(\*, +\) can be fetched by the **character** and the **counter** in the route.

```go title="Example"
// ROUTE: /v1/*/shop/*
// GET:   /v1/brand/4/shop/blue/xs
c.Params("*1")  // "brand/4"
c.Params("*2")  // "blue/xs"
```

For reasons of **downward compatibility**, the first parameter segment for the parameter character can also be accessed without the counter.

```go title="Example"
app.Get("/v1/*/shop/*", func(c fiber.Ctx) error {
  c.Params("*") // outputs the value of the first wildcard segment
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

In certain scenarios, it can be useful to have an alternative approach to handle different types of parameters, not
just strings. This can be achieved using a generic `Params` function known as `Params[V GenericType](c fiber.Ctx, key string, defaultValue ...V) V`.
This function is capable of parsing a route parameter and returning a value of a type that is assumed and specified by `V GenericType`.

```go title="Signature"
func Params[V GenericType](c fiber.Ctx, key string, defaultValue ...V) V
```

```go title="Example"
// GET http://example.com/user/114
app.Get("/user/:id", func(c fiber.Ctx) error{
  fiber.Params[string](c, "id") // returns "114" as string.
  fiber.Params[int](c, "id")    // returns 114 as integer
  fiber.Params[string](c, "number") // returns "" (default string type)
  fiber.Params[int](c, "number")    // returns 0 (default integer value type)
})
```

The generic `Params` function supports returning the following data types based on `V GenericType`:

- Integer: `int`, `int8`, `int16`, `int32`, `int64`
- Unsigned integer: `uint`, `uint8`, `uint16`, `uint32`, `uint64`
- Floating-point numbers: `float32`, `float64`
- Boolean: `bool`
- String: `string`
- Byte array: `[]byte`

### Path

Contains the path part of the request URL. Optionally, you can override the path by passing a string. For internal redirects, you might want to call [RestartRouting](ctx.md#restartrouting) instead of [Next](ctx.md#next).

```go title="Signature"
func (c fiber.Ctx) Path(override ...string) string
```

```go title="Example"
// GET http://example.com/users?sort=desc

app.Get("/users", func(c fiber.Ctx) error {
  c.Path()       // "/users"

  c.Path("/john")
  c.Path()       // "/john"

  // ...
})
```

### Port

Returns the remote port of the request.

```go title="Signature"
func (c fiber.Ctx) Port() string
```

```go title="Example"
// GET http://example.com:8080

app.Get("/", func(c fiber.Ctx) error {
  c.Port() // "8080"

  // ...
})
```

### Protocol

Contains the request protocol string: `http` or `https` for **TLS** requests.

```go title="Signature"
func (c fiber.Ctx) Protocol() string
```

```go title="Example"
// GET http://example.com

app.Get("/", func(c fiber.Ctx) error {
  c.Protocol() // "http"

  // ...
})
```

### Queries

`Queries` is a function that returns an object containing a property for each query string parameter in the route.

```go title="Signature"
func (c fiber.Ctx) Queries() map[string]string
```

```go title="Example"
// GET http://example.com/?name=alex&want_pizza=false&id=

app.Get("/", func(c fiber.Ctx) error {
    m := c.Queries()
    m["name"]        // "alex"
    m["want_pizza"]  // "false"
    m["id"]          // ""
    // ...
})
```

```go title="Example"
// GET http://example.com/?field1=value1&field1=value2&field2=value3

app.Get("/", func (c fiber.Ctx) error {
    m := c.Queries()
    m["field1"] // "value2"
    m["field2"] // "value3"
})
```

```go title="Example"
// GET http://example.com/?list_a=1&list_a=2&list_a=3&list_b[]=1&list_b[]=2&list_b[]=3&list_c=1,2,3

app.Get("/", func(c fiber.Ctx) error {
    m := c.Queries()
    m["list_a"] // "3"
    m["list_b[]"] // "3"
    m["list_c"] // "1,2,3"
})
```

```go title="Example"
// GET /api/posts?filters.author.name=John&filters.category.name=Technology

app.Get("/", func(c fiber.Ctx) error {
    m := c.Queries()
    m["filters.author.name"] // John
    m["filters.category.name"] // Technology
})
```

```go title="Example"
// GET /api/posts?tags=apple,orange,banana&filters[tags]=apple,orange,banana&filters[category][name]=fruits&filters.tags=apple,orange,banana&filters.category.name=fruits

app.Get("/", func(c fiber.Ctx) error {
    m := c.Queries()
    m["tags"] // apple,orange,banana
    m["filters[tags]"] // apple,orange,banana
    m["filters[category][name]"] // fruits
    m["filters.tags"] // apple,orange,banana
    m["filters.category.name"] // fruits
})
```

### Query

This method returns a string corresponding to a query string parameter by name. You can pass an optional default value that will be returned if the query key does not exist.

:::info
If there is **no** query string, it returns an **empty string**.
:::

```go title="Signature"
func (c fiber.Ctx) Query(key string, defaultValue ...string) string
```

```go title="Example"
// GET http://example.com/?order=desc&brand=nike

app.Get("/", func(c fiber.Ctx) error {
  c.Query("order")         // "desc"
  c.Query("brand")         // "nike"
  c.Query("empty", "nike") // "nike"

  // ...
})
```

:::info
The returned value is valid only within the handler. Do not store references.
Make copies or use the [**`Immutable`**](./fiber.md#immutable) setting instead. [Read more...](../#zero-allocation)
:::

In certain scenarios, it can be useful to have an alternative approach to handle different types of query parameters, not
just strings. This can be achieved using a generic `Query` function known as `Query[V GenericType](c fiber.Ctx, key string, defaultValue ...V) V`.
This function is capable of parsing a query string and returning a value of a type that is assumed and specified by `V GenericType`.

Here is the signature for the generic `Query` function:

```go title="Signature"
func Query[V GenericType](c fiber.Ctx, key string, defaultValue ...V) V
```

```go title="Example"
// GET http://example.com/?page=1&brand=nike&new=true

app.Get("/", func(c fiber.Ctx) error {
  fiber.Query[int](c, "page")     // 1
  fiber.Query[string](c, "brand") // "nike"
  fiber.Query[bool](c, "new")     // true

  // ...
})
```

In this case, `Query[V GenericType](c Ctx, key string, defaultValue ...V) V` can retrieve `page` as an integer, `brand` as a string, and `new` as a boolean. The function uses the appropriate parsing function for each specified type to ensure the correct type is returned. This simplifies the retrieval process of different types of query parameters, making your controller actions cleaner.
The generic `Query` function supports returning the following data types based on `V GenericType`:

- Integer: `int`, `int8`, `int16`, `int32`, `int64`
- Unsigned integer: `uint`, `uint8`, `uint16`, `uint32`, `uint64`
- Floating-point numbers: `float32`, `float64`
- Boolean: `bool`
- String: `string`
- Byte array: `[]byte`

### Range

Returns a struct containing the type and a slice of ranges.
Only the canonical `bytes` unit is recognized and any optional
whitespace around range specifiers will be ignored, as specified
in RFC 9110.
If none of the requested ranges are satisfiable, the method automatically
sets the HTTP status code to **416 Range Not Satisfiable** and populates the
`Content-Range` header with the current representation size.

```go title="Signature"
func (c fiber.Ctx) Range(size int64) (Range, error)
```

```go title="Example"
// Range: bytes=500-700, 700-900
app.Get("/", func(c fiber.Ctx) error {
  r := c.Range(1000)
  if r.Type == "bytes" {
      for _, rng := range r.Ranges {
      fmt.Println(rng)
      // [500, 700]
    }
  }
})
```

### Referer

Returns the `Referer` request header.

```go title="Signature"
func (c fiber.Ctx) Referer() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Referer() // "https://example.com"
  return nil
})
```

### RequestID

```go title="Signature"
func (c fiber.Ctx) RequestID() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.RequestID() // "8d7ad5e3-aaf3-450b-a241-2beb887efd54"
  return nil
})
```

### SaveFile

Method is used to save **any** multipart file to disk.

```go title="Signature"
func (c fiber.Ctx) SaveFile(fh *multipart.FileHeader, path string) error
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  // Parse the multipart form:
  if form, err := c.MultipartForm(); err == nil {
    // => *multipart.Form

    // Get all files from "documents" key:
    files := form.File["documents"]
    // => []*multipart.FileHeader

    // Loop through files:
    for _, file := range files {
      fmt.Println(file.Filename, file.Size, file.Header["Content-Type"][0])
      // => "tutorial.pdf" 360641 "application/pdf"

      // Save the files to disk:
      if err := c.SaveFile(file, fmt.Sprintf("./%s", file.Filename)); err != nil {
        return err
      }
    }
    return err
  }
})
```

### SaveFileToStorage

Method is used to save **any** multipart file to an external storage system.

```go title="Signature"
func (c fiber.Ctx) SaveFileToStorage(fileheader *multipart.FileHeader, path string, storage Storage) error
```

```go title="Example"
storage := memory.New()

app.Post("/", func(c fiber.Ctx) error {
  // Parse the multipart form:
  if form, err := c.MultipartForm(); err == nil {
    // => *multipart.Form

    // Get all files from "documents" key:
    files := form.File["documents"]
    // => []*multipart.FileHeader

    // Loop through files:
    for _, file := range files {
      fmt.Println(file.Filename, file.Size, file.Header["Content-Type"][0])
      // => "tutorial.pdf" 360641 "application/pdf"

      // Save the files to storage:
      if err := c.SaveFileToStorage(file, fmt.Sprintf("./%s", file.Filename), storage); err != nil {
        return err
      }
    }
    return err
  }
})
```

### Schema

Contains the request protocol string: `http` or `https` for TLS requests.

:::info
Please use [`Config.TrustProxy`](fiber.md#trustproxy) to prevent header spoofing if your app is behind a proxy.
:::

```go title="Signature"
func (c fiber.Ctx) Schema() string
```

```go title="Example"
// GET http://example.com

app.Get("/", func(c fiber.Ctx) error {
  c.Schema() // "http"

  // ...
})
```

### Secure

A boolean property that is `true` if a **TLS** connection is established.

```go title="Signature"
func (c fiber.Ctx) Secure() bool
```

```go title="Example"
// Secure() method is equivalent to:
c.Protocol() == "https"
```

### Stale

When the client's cached response is **stale**, this method returns **true**. It
is the logical complement of [`Fresh`](#fresh), which checks whether the cached
representation is still valid.

[https://expressjs.com/en/4x/api.html#req.stale](https://expressjs.com/en/4x/api.html#req.stale)

```go title="Signature"
func (c fiber.Ctx) Stale() bool
```

### Subdomains

Returns a slice with the host’s sub-domain labels. The dot-separated parts that precede the registrable domain (`example`) and the top-level domain (ex: `com`).

The `subdomain offset` (default `2`) tells Fiber how many labels, counting from the right-hand side, are always discarded.
Passing an `offset` argument lets you override that value for a single call.

```go
func (c fiber.Ctx) Subdomains(offset ...int) []string
```

| `offset`               | Result                                  | Meaning                                       |
| ---------------------- | --------------------------------------- | --------------------------------------------- |
| *omitted* → **2**      | trim 2 right-most labels                | drop the registrable domain **and** the TLD   |
| `1` to `len(labels)-1` | trim exactly `offset` right-most labels | custom trimming of available labels           |
| `>= len(labels)`       | **return `[]`**                         | offset exceeds available labels → empty slice |
| `0`                    | **return every label**                  | keep the entire host unchanged                |
| `< 0`                  | **return `[]`**                         | negative offsets are invalid → empty slice    |

#### Example

```go
// Host: "tobi.ferrets.example.com"

app.Get("/", func(c fiber.Ctx) error {
  c.Subdomains()    // ["tobi", "ferrets"]
  c.Subdomains(1)   // ["tobi", "ferrets", "example"]
  c.Subdomains(0)   // ["tobi", "ferrets", "example", "com"]
  c.Subdomains(-1)  // []
  // ...
})
```

### UserAgent

Returns the `User-Agent` request header.

```go title="Signature"
func (c fiber.Ctx) UserAgent() string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.UserAgent() // "Mozilla/5.0 ..."
  return nil
})
```

### XHR

A boolean property that is `true` if the request’s [X-Requested-With](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) header field is [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest), indicating that the request was issued by a client library (such as [jQuery](https://api.jquery.com/jQuery.ajax/)).

```go title="Signature"
func (c fiber.Ctx) XHR() bool
```

```go title="Example"
// X-Requested-With: XMLHttpRequest

app.Get("/", func(c fiber.Ctx) error {
  c.XHR() // true

  // ...
})
```

## Response

Methods which modify the response object.

:::tip
Use `c.Res()` to limit gopls suggestions to only these methods!
:::

### Append

Appends the specified **value** to the HTTP response header field.

:::caution
If the header is **not** already set, it creates the header with the specified value.
:::

```go title="Signature"
func (c fiber.Ctx) Append(field string, values ...string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Append("Link", "http://google.com", "http://localhost")
  // => Link: http://google.com, http://localhost

  c.Append("Link", "Test")
  // => Link: http://google.com, http://localhost, Test

  // ...
})
```

### Attachment

Sets the HTTP response [Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition) header field to `attachment`.

```go title="Signature"
func (c fiber.Ctx) Attachment(filename ...string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Attachment()
  // => Content-Disposition: attachment

  c.Attachment("./upload/images/logo.png")
  // => Content-Disposition: attachment; filename="logo.png"
  // => Content-Type: image/png

  // ...
})
```

Non-ASCII filenames are encoded using the `filename*` parameter as defined in
[RFC 6266](https://www.rfc-editor.org/rfc/rfc6266) and
[RFC 8187](https://www.rfc-editor.org/rfc/rfc8187):

```go title="Example"
app.Get("/non-ascii", func(c fiber.Ctx) error {
  c.Attachment("./files/文件.txt")
  // => Content-Disposition: attachment; filename="文件.txt"; filename*=UTF-8''%E6%96%87%E4%BB%B6.txt
  return nil
})
```

### AutoFormat

Performs content-negotiation on the [Accept](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) HTTP header. It uses [Accepts](ctx.md#accepts) to select a proper format.
The supported content types are `text/html`, `text/plain`, `application/json`, `application/vnd.msgpack`, `application/xml`, and `application/cbor`.
For more flexible content negotiation, use [Format](ctx.md#format).

:::info
If the header is **not** specified or there is **no** proper format, **text/plain** is used.
:::

```go title="Signature"
func (c fiber.Ctx) AutoFormat(body any) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // Accept: text/plain
  c.AutoFormat("Hello, World!")
  // => Hello, World!

  // Accept: text/html
  c.AutoFormat("Hello, World!")
  // => <p>Hello, World!</p>

  type User struct {
    Name string
  }
  user := User{"John Doe"}

  // Accept: application/json
  c.AutoFormat(user)
  // => {"Name":"John Doe"}

  // Accept: application/vnd.msgpack
  c.AutoFormat(user)
  // => 82 a4 6e 61 6d 65 a4 6a 6f 68 6e a4 70 61 73 73 a3 64 6f 65

  // Accept: application/cbor
  c.AutoFormat(user)
  // => a1 64 4e 61 6d 65 68 4a 6f 68 6e 20 44 6f 65

  // Accept: application/xml
  c.AutoFormat(user)
  // => <User><Name>John Doe</Name></User>
  // ..
})
```

### CBOR

CBOR converts any interface or string to CBOR encoded bytes.

> **Note:** Before using any CBOR-related features, make sure to follow the [CBOR setup instructions](../guide/advance-format.md#cbor).

:::info
CBOR also sets the content header to the `ctype` parameter. If no `ctype` is passed in, the header is set to `application/cbor`.
:::

```go title="Signature"
func (c fiber.Ctx) CBOR(data any, ctype ...string) error
```

```go title="Example"
type SomeStruct struct {
  Name string `cbor:"name"`
  Age  uint8 `cbor:"age"`
}

app.Get("/cbor", func(c fiber.Ctx) error {
  // Create data struct:
  data := SomeStruct{
    Name: "Grame",
    Age:  20,
  }

  return c.CBOR(data)
  // => Content-Type: application/cbor
  // => \xa2dnameeGramecage\x14

  return c.CBOR(fiber.Map{
    "name": "Grame",
    "age":  20,
  })
  // => Content-Type: application/cbor
  // => \xa2dnameeGramecage\x14

  return c.CBOR(fiber.Map{
    "type":     "https://example.com/probs/out-of-credit",
    "title":    "You do not have enough credit.",
    "status":   403,
    "detail":   "Your current balance is 30, but that costs 50.",
    "instance": "/account/12345/msgs/abc",
  })
  // => Content-Type: application/cbor
  // => \xa5dtypex'https://example.com/probs/out-of-creditetitlex\x1eYou do not have enough credit.fstatus\x19\x01\x93fdetailx.Your current balance is 30, but that costs 50.hinstancew/account/12345/msgs/abc
})
```

### ClearCookie

Expires a client cookie (or all cookies if left empty).

```go title="Signature"
func (c fiber.Ctx) ClearCookie(key ...string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // Clears all cookies:
  c.ClearCookie()

  // Expire specific cookie by name:
  c.ClearCookie("user")

  // Expire multiple cookies by names:
  c.ClearCookie("token", "session", "track_id", "version")
  // ...
})
```

:::caution
Web browsers and other compliant clients will only clear the cookie if the given options are identical to those when creating the cookie, excluding `Expires` and `MaxAge`. `ClearCookie` will not set these values for you - a technique similar to the one shown below should be used to ensure your cookie is deleted.
:::

```go title="Example"
app.Get("/set", func(c fiber.Ctx) error {
    c.Cookie(&fiber.Cookie{
        Name:     "token",
        Value:    "randomvalue",
        Expires:  time.Now().Add(24 * time.Hour),
        HTTPOnly: true,
        SameSite: "Lax",
    })

    // ...
})

app.Get("/delete", func(c fiber.Ctx) error {
    c.Cookie(&fiber.Cookie{
        Name:     "token",
        Expires:  fasthttp.CookieExpireDelete, // Use fasthttp's built-in constant
        HTTPOnly: true,
        SameSite: "Lax",
    })

    // ...
})
```

You can also use `c.Cookie()` to expire cookies with specific `Path` or `Domain` attributes:

```go title="Example"
app.Get("/logout", func(c fiber.Ctx) error {
    // Expire a cookie with path and domain
    c.Cookie(&fiber.Cookie{
        Name:    "token",
        Path:    "/api",
        Domain:  "example.com",
        Expires: fasthttp.CookieExpireDelete,
    })

    return c.SendStatus(fiber.StatusOK)
})
```

### Cookie

Sets a cookie.

```go title="Signature"
func (c fiber.Ctx) Cookie(cookie *Cookie)
```

```go
type Cookie struct {
    Name        string    `json:"name"`         // The name of the cookie
    Value       string    `json:"value"`        // The value of the cookie
    Path        string    `json:"path"`         // Specifies a URL path which is allowed to receive the cookie
    Domain      string    `json:"domain"`       // Specifies the domain which is allowed to receive the cookie
    MaxAge      int       `json:"max_age"`      // The maximum age (in seconds) of the cookie
    Expires     time.Time `json:"expires"`      // The expiration date of the cookie
    Secure      bool      `json:"secure"`       // Indicates that the cookie should only be transmitted over a secure HTTPS connection
    HTTPOnly    bool      `json:"http_only"`    // Indicates that the cookie is accessible only through the HTTP protocol
    SameSite    string    `json:"same_site"`    // Controls whether or not a cookie is sent with cross-site requests
    Partitioned bool      `json:"partitioned"`  // Indicates if the cookie is stored in a partitioned cookie jar
    SessionOnly bool      `json:"session_only"` // Indicates if the cookie is a session-only cookie
}
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // Create cookie
  cookie := new(fiber.Cookie)
  cookie.Name = "john"
  cookie.Value = "doe"
  cookie.Expires = time.Now().Add(24 * time.Hour)

  // Set cookie
  c.Cookie(cookie)
  // ...
})
```

:::info
When setting a cookie with `SameSite=None`, Fiber automatically sets `Secure=true` as required by RFC 6265bis and modern browsers. This ensures compliance with the "None" SameSite policy which mandates that cookies must be sent over secure connections.

For more information, see:

- [Mozilla Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#none)
- [Chrome Documentation](https://developers.google.com/search/blog/2020/01/get-ready-for-new-samesitenone-secure)

:::

:::info
Partitioned cookies allow partitioning the cookie jar by top-level site, enhancing user privacy by preventing cookies from being shared across different sites. This feature is particularly useful in scenarios where a user interacts with embedded third-party services that should not have access to the main site's cookies. You can check out [CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips) for more information.
:::

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // Create a new partitioned cookie
  cookie := new(fiber.Cookie)
  cookie.Name = "user_session"
  cookie.Value = "abc123"
  cookie.Partitioned = true  // This cookie will be stored in a separate jar when it's embedded into another website

  // Set the cookie in the response
  c.Cookie(cookie)
  return c.SendString("Partitioned cookie set")
})
```

### Download

Transfers the file from the given path as an `attachment`.

Typically, browsers will prompt the user to download. By default, the [Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition) header `filename=` parameter is the file path (this typically appears in the browser dialog).
Override this default with the `filename` parameter.

```go title="Signature"
func (c fiber.Ctx) Download(file string, filename ...string) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.Download("./files/report-12345.pdf")
  // => Download report-12345.pdf

  return c.Download("./files/report-12345.pdf", "report.pdf")
  // => Download report.pdf
})
```

For filenames containing non-ASCII characters, a `filename*` parameter is added
according to [RFC 6266](https://www.rfc-editor.org/rfc/rfc6266) and
[RFC 8187](https://www.rfc-editor.org/rfc/rfc8187):

```go title="Example"
app.Get("/non-ascii", func(c fiber.Ctx) error {
  return c.Download("./files/文件.txt")
  // => Content-Disposition: attachment; filename="文件.txt"; filename*=UTF-8''%E6%96%87%E4%BB%B6.txt
})
```

### End

End immediately flushes the current response and closes the underlying connection.

```go title="Signature"
func (c fiber.Ctx) End() error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
    c.SendString("Hello World!")
    return c.End()
})
```

:::caution
Calling `c.End()` will disallow further writes to the underlying connection.
:::

:::warning
`c.End()` does **not** work in streaming mode (e.g. when using `fasthttp`'s `HijackConn` or `SendStream`).
In streaming mode the connection is managed asynchronously and `ctx.Conn()` may return `nil`,
so `c.End()` will return `nil` without flushing or closing the connection.
:::

End can be used to stop a middleware from modifying a response of a handler/other middleware down the method chain
when they regain control after calling `c.Next()`.

```go title="Example"
// Error Logging/Responding middleware
app.Use(func(c fiber.Ctx) error {
    err := c.Next()

    // Log errors & write the error to the response
    if err != nil {
        log.Printf("Got error in middleware: %v", err)
        return c.Writef("(got error %v)", err)
    }

    // No errors occurred
    return nil
})

// Handler with simulated error
app.Get("/", func(c fiber.Ctx) error {
    // Closes the connection instantly after writing from this handler
    // and disallow further modification of its response
    defer c.End()

    c.SendString("Hello, ... I forgot what comes next!")
    return errors.New("some error")
})
```

### Format

Performs content-negotiation on the [Accept](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) HTTP header. It uses [Accepts](ctx.md#accepts) to select a proper format from the supplied offers. A default handler can be provided by setting the `MediaType` to `"default"`. If no offers match and no default is provided, a 406 (Not Acceptable) response is sent. The Content-Type is automatically set when a handler is selected.

:::info
If the Accept header is **not** specified, the first handler will be used.
:::

```go title="Signature"
func (c fiber.Ctx) Format(handlers ...ResFmt) error
```

```go title="Example"
// Accept: application/json => {"command":"eat","subject":"fruit"}
// Accept: text/plain => Eat Fruit!
// Accept: application/xml => Not Acceptable
app.Get("/no-default", func(c fiber.Ctx) error {
  return c.Format(
    fiber.ResFmt{"application/json", func(c fiber.Ctx) error {
      return c.JSON(fiber.Map{
        "command": "eat",
        "subject": "fruit",
      })
    }},
    fiber.ResFmt{"text/plain", func(c fiber.Ctx) error {
      return c.SendString("Eat Fruit!")
    }},
  )
})

// Accept: application/json => {"command":"eat","subject":"fruit"}
// Accept: text/plain => Eat Fruit!
// Accept: application/xml => Eat Fruit!
app.Get("/default", func(c fiber.Ctx) error {
  textHandler := func(c fiber.Ctx) error {
    return c.SendString("Eat Fruit!")
  }

  handlers := []fiber.ResFmt{
    {"application/json", func(c fiber.Ctx) error {
      return c.JSON(fiber.Map{
        "command": "eat",
        "subject": "fruit",
      })
    }},
    {"text/plain", textHandler},
    {"default", textHandler},
  }

  return c.Format(handlers...)
})
```

### JSON

Converts any **interface** or **string** to JSON using the [encoding/json](https://pkg.go.dev/encoding/json) package.

:::info
JSON also sets the content header to the `ctype` parameter. If no `ctype` is passed in, the header is set to `application/json; charset=utf-8` by default.
:::

```go title="Signature"
func (c fiber.Ctx) JSON(data any, ctype ...string) error
```

```go title="Example"
type SomeStruct struct {
  Name string
  Age  uint8
}

app.Get("/json", func(c fiber.Ctx) error {
  // Create data struct:
  data := SomeStruct{
    Name: "Grame",
    Age:  20,
  }

  return c.JSON(data)
  // => Content-Type: application/json; charset=utf-8
  // => {"Name": "Grame", "Age": 20}

  return c.JSON(fiber.Map{
    "name": "Grame",
    "age":  20,
  })
  // => Content-Type: application/json; charset=utf-8
  // => {"name": "Grame", "age": 20}

  return c.JSON(fiber.Map{
    "type":     "https://example.com/probs/out-of-credit",
    "title":    "You do not have enough credit.",
    "status":   403,
    "detail":   "Your current balance is 30, but that costs 50.",
    "instance": "/account/12345/msgs/abc",
  }, "application/problem+json")
  // => Content-Type: application/problem+json
  // => "{
  // =>     "type": "https://example.com/probs/out-of-credit",
  // =>     "title": "You do not have enough credit.",
  // =>     "status": 403,
  // =>     "detail": "Your current balance is 30, but that costs 50.",
  // =>     "instance": "/account/12345/msgs/abc",
  // => }"
})
```

### JSONP

Sends a JSON response with JSONP support. This method is identical to [JSON](ctx.md#json), except that it opts-in to JSONP callback support. By default, the callback name is simply `callback`.

Override this by passing a **named string** in the method.

```go title="Signature"
func (c fiber.Ctx) JSONP(data any, callback ...string) error
```

```go title="Example"
type SomeStruct struct {
  Name string
  Age  uint8
}

app.Get("/", func(c fiber.Ctx) error {
  // Create data struct:
  data := SomeStruct{
    Name: "Grame",
    Age:  20,
  }

  return c.JSONP(data)
  // => callback({"Name": "Grame", "Age": 20})

  return c.JSONP(data, "customFunc")
  // => customFunc({"Name": "Grame", "Age": 20})
})
```

### Links

Joins the links followed by the property to populate the response’s [Link HTTP header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link) field.

```go title="Signature"
func (c fiber.Ctx) Links(link ...string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Links(
    "http://api.example.com/users?page=2", "next",
    "http://api.example.com/users?page=5", "last",
  )
  // Link: <http://api.example.com/users?page=2>; rel="next",
  //       <http://api.example.com/users?page=5>; rel="last"

  // ...
})
```

### Location

Sets the response [Location](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location) HTTP header to the specified path parameter.

```go title="Signature"
func (c fiber.Ctx) Location(path string)
```

```go title="Example"
app.Post("/", func(c fiber.Ctx) error {
  c.Location("http://example.com")

  c.Location("/foo/bar")

  return nil
})
```

### MsgPack

> **Note:** Before using any MsgPack-related features, make sure to follow the [MsgPack setup instructions](../guide/advance-format.md#msgpack).

A compact binary alternative to [JSON](#json) for efficient data transfer between micro-services or from server to client. MessagePack serializes faster and yields smaller payloads than plain JSON.

Converts any **interface** or **string** to MsgPack using the [shamaton/msgpack](https://pkg.go.dev/github.com/shamaton/msgpack/v3) package.

:::info
MsgPack also sets the content header to the `ctype` parameter. If no `ctype` is passed in, the header is set to `application/vnd.msgpack`.
:::

```go title="Signature"
func (c fiber.Ctx) MsgPack(data any, ctype ...string) error
```

```go title="Example"
type SomeStruct struct {
  Name string
  Age  uint8
}

app.Get("/msgpack", func(c fiber.Ctx) error {
  // Create data struct:
  data := SomeStruct{
    Name: "Grame",
    Age:  20,
  }

  return c.MsgPack(data)
  // => Content-Type: application/vnd.msgpack
  // => 82 A4 4E 61 6D 65 A5 47 72 61 6D 65 A3 41 67 65 14

  return c.MsgPack(fiber.Map{
    "name": "Grame",
    "age":  20,
  })
  // => Content-Type: application/vnd.msgpack
  // => 82 A4 6E 61 6D 65 A5 47 72 61 6D 65 A3 61 67 65 14

  return c.MsgPack(fiber.Map{
    "type":     "https://example.com/probs/out-of-credit",
    "title":    "You do not have enough credit.",
    "status":   403,
    "detail":   "Your current balance is 30, but that costs 50.",
    "instance": "/account/12345/msgs/abc",
  }, "application/problem+msgpack")
})

// => Content-Type: application/problem+msgpack
// 85 A4 74 79 70 65 D9 27 68 74 74 70 73 3A 2F 2F 65 78 61 6D 70 6C 65 2E 63 6F 6D 2F 70 72 6F 62 73 2F 6F 75 74 2D 6F 66 2D 63 72 65 64 69 74 A5 74 69 74 6C 65 BE 59 6F 75 20 64 6F 20 6E 6F 74 20 68 61 76 65 20 65 6E 6F 75 67 68 20 63 72 65 64 69 74 2E A6 73 74 61 74 75 73 CD 01 93 A6 64 65 74 61 69 6C D9 2E 59 6F 75 72 20 63 75 72 72 65 6E 74 20 62 61 6C 61 6E 63 65 20 69 73 20 33 30 2C 20 62 75 74 20 74 68 61 74 20 63 6F 73 74 73 20 35 30 2E A8 69 6E 73 74 61 6E 63 65 B7 2F 61 63 63 6F 75 6E 74 2F 31 32 33 34 35 2F 6D 73 67 73 2F 61 62 63
```

### Render

Renders a view with data and sends a `text/html` response. By default, `Render` uses the default [**Go Template engine**](https://pkg.go.dev/html/template/). If you want to use another view engine, please take a look at our [**Template middleware**](https://docs.gofiber.io/template).

```go title="Signature"
func (c fiber.Ctx) Render(name string, bind any, layouts ...string) error
```

### Send

Sets the HTTP response body.

```go title="Signature"
func (c fiber.Ctx) Send(body []byte) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.Send([]byte("Hello, World!")) // => "Hello, World!"
})
```

Fiber also provides `SendString` and `SendStream` methods for raw inputs.

:::tip
Use this if you **don't need** type assertion, recommended for **faster** performance.
:::

```go title="Signature"
func (c fiber.Ctx) SendString(body string) error
func (c fiber.Ctx) SendStream(stream io.Reader, size ...int) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.SendString("Hello, World!")
  // => "Hello, World!"

  return c.SendStream(bytes.NewReader([]byte("Hello, World!")))
  // => "Hello, World!"
})
```

### SendEarlyHints

Sends an informational `103 Early Hints` response with one or more
[`Link` headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Link)
before the final response. This allows the browser to start preloading
resources while the server prepares the full response.

:::caution
This feature requires HTTP/2 or newer. Some legacy HTTP/1.1 clients may not support sendEarlyHints.
Early Hints (`103` responses) are supported in HTTP/2 and newer. Older HTTP/1.1 clients may ignore these interim responses or misbehave when receiving them.
See [Enabling HTTP/2](../guide/reverse-proxy#enabling-http2) for instructions on how to use a reverse proxy (e.g. Nginx or Traefik) to enable HTTP/2 support.
:::

```go title="Signature"
func (c fiber.Ctx) SendEarlyHints(hints []string) error
```

```go title="Example"
hints := []string{"<https://cdn.com/app.js>; rel=preload; as=script"}
app.Get("/early", func(c fiber.Ctx) error {
  if err := c.SendEarlyHints(hints); err != nil {
    return err
  }
  return c.SendString("done")
})
```

### SendFile

Transfers the file from the given path. Sets the [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type) response HTTP header field based on the **file** extension or format.

```go title="Config" title="Config"
// SendFile defines configuration options when to transfer file with SendFile.
type SendFile struct {
  // FS is the file system to serve the static files from.
  // You can use interfaces compatible with fs.FS like embed.FS, os.DirFS etc.
  //
  // Optional. Default: nil
  FS fs.FS

  // When set to true, the server tries minimizing CPU usage by caching compressed files.
  // This works differently than the github.com/gofiber/compression middleware.
  // You have to set Content-Encoding header to compress the file.
  // Available compression methods are gzip, br, and zstd.
  //
  // Optional. Default: false
  Compress bool `json:"compress"`

  // When set to true, enables byte range requests.
  //
  // Optional. Default: false
  ByteRange bool `json:"byte_range"`

  // When set to true, enables direct download.
  //
  // Optional. Default: false
  Download bool `json:"download"`

  // Expiration duration for inactive file handlers.
  // Use a negative time.Duration to disable it.
  //
  // Optional. Default: 10 * time.Second
  CacheDuration time.Duration `json:"cache_duration"`

  // The value for the Cache-Control HTTP-header
  // that is set on the file response. MaxAge is defined in seconds.
  //
  // Optional. Default: 0
  MaxAge int `json:"max_age"`
}
```

```go title="Signature" title="Signature"
func (c fiber.Ctx) SendFile(file string, config ...SendFile) error
```

```go title="Example"
app.Get("/not-found", func(c fiber.Ctx) error {
  return c.SendFile("./public/404.html")

  // Disable compression
  return c.SendFile("./static/index.html", fiber.SendFile{
    Compress: false,
  })
})
```

:::info
If the file contains a URL-specific character, you have to escape it before passing the file path into the `SendFile` function.
:::

```go title="Example"
app.Get("/file-with-url-chars", func(c fiber.Ctx) error {
  return c.SendFile(url.PathEscape("hash_sign_#.txt"))
})
```

:::info
You can set the `CacheDuration` config property to `-1` to disable caching.
:::

```go title="Example"
app.Get("/file", func(c fiber.Ctx) error {
  return c.SendFile("style.css", fiber.SendFile{
    CacheDuration: -1,
  })
})
```

:::info
You can use multiple `SendFile` calls with different configurations in a single route. Fiber creates different filesystem handlers per config.
:::

```go title="Example"
app.Get("/file", func(c fiber.Ctx) error {
  switch c.Query("config") {
    case "filesystem":
      return c.SendFile("style.css", fiber.SendFile{
        FS: os.DirFS(".")
      })
    case "filesystem-compress":
      return c.SendFile("style.css", fiber.SendFile{
        FS: os.DirFS("."),
        Compress: true,
      })
    case "compress":
      return c.SendFile("style.css", fiber.SendFile{
        Compress: true,
      })
    default:
      return c.SendFile("style.css")
  }

  return nil
})
```

:::info
For sending multiple files from an embedded file system, [this functionality](../middleware/static.md#serving-files-using-embedfs) can be used.
:::

### SendStatus

Sets the status code and the correct status message in the body if the response body is **empty**.

:::tip
You can find all used status codes and messages [in the Fiber source code](https://github.com/gofiber/fiber/blob/dffab20bcdf4f3597d2c74633a7705a517d2c8c2/utils.go#L183-L244).
:::

```go title="Signature"
func (c fiber.Ctx) SendStatus(status int) error
```

```go title="Example"
app.Get("/not-found", func(c fiber.Ctx) error {
  return c.SendStatus(415)
  // => 415 "Unsupported Media Type"

  c.SendString("Hello, World!")
  return c.SendStatus(415)
  // => 415 "Hello, World!"
})
```

### SendStream

Sets the response body to a stream of data and adds an optional body size.

```go title="Signature"
func (c fiber.Ctx) SendStream(stream io.Reader, size ...int) error
```

:::info
`SendStream` operates asynchronously. The handler returns immediately after setting up the stream,
but the actual reading and sending of data happens **after** the handler completes. This is handled
by the underlying `fasthttp` library.

If the provided stream implements `io.Closer`, it will be automatically closed by `fasthttp` after
the response is fully sent or if an error occurs.
:::

:::caution
When passing `fiber.Ctx` as a `context.Context` to libraries that spawn goroutines (e.g., for streaming operations),
those goroutines may attempt to access the context after the handler returns. Since `fiber.Ctx` is recycled and
released after the handler completes, this can cause issues.

**Recommended approach**: Use `c.Context()` or `c.RequestCtx()` instead of passing `c` directly to such libraries.
See the [Context Guide](../guide/context.md) for more details.
:::

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.SendStream(bytes.NewReader([]byte("Hello, World!")))
  // => "Hello, World!"
})
```

```go title="Example with file streaming"
app.Get("/download", func(c fiber.Ctx) error {
  file, err := os.Open("large-file.zip")
  if err != nil {
    return err
  }
  // File will be automatically closed by fasthttp after streaming completes
  
  stat, err := file.Stat()
  if err != nil {
    file.Close()
    return err
  }
  
  return c.SendStream(file, int(stat.Size()))
})
```

### SendStreamWriter

Sets the response body stream writer.

:::note
The argument `streamWriter` represents a function that populates
the response body using a buffered stream writer.
:::

```go title="Signature"
func (c Ctx) SendStreamWriter(streamWriter func(*bufio.Writer)) error
```

```go title="Example"
app.Get("/", func (c fiber.Ctx) error {
  return c.SendStreamWriter(func(w *bufio.Writer) {
    fmt.Fprintf(w, "Hello, World!\n")
  })
  // => "Hello, World!"
})
```

:::info
To send data before `streamWriter` returns, you can call `w.Flush()`
on the provided writer. Otherwise, the buffered stream flushes after
`streamWriter` returns.
:::

:::note
`w.Flush()` will return an error if the client disconnects before `streamWriter` finishes writing a response.
:::

```go title="Example"
app.Get("/wait", func(c fiber.Ctx) error {
  return c.SendStreamWriter(func(w *bufio.Writer) {
    // Begin Work
    fmt.Fprintf(w, "Please wait for 10 seconds\n")
    if err := w.Flush(); err != nil {
      log.Print("Client disconnected!")
      return
    }

    // Send progress over time
    time.Sleep(time.Second)
    for i := 0; i < 9; i++ {
      fmt.Fprintf(w, "Still waiting...\n")
      if err := w.Flush(); err != nil {
        // If client disconnected, cancel work and finish
        log.Print("Client disconnected!")
        return
      }
      time.Sleep(time.Second)
    }

    // Finish
    fmt.Fprintf(w, "Done!\n")
  })
})
```

### SendString

Sets the response body to a string.

```go title="Signature"
func (c fiber.Ctx) SendString(body string) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.SendString("Hello, World!")
  // => "Hello, World!"
})
```

### Set

Sets the response’s HTTP header field to the specified `key`, `value`.

```go title="Signature"
func (c fiber.Ctx) Set(key string, val string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Set("Content-Type", "text/plain")
  // => "Content-Type: text/plain"

  // ...
})
```

### Status

Sets the HTTP status for the response.

:::info
This method is **chainable**.
:::

```go title="Signature"
func (c fiber.Ctx) Status(status int) fiber.Ctx
```

```go title="Example"
app.Get("/fiber", func(c fiber.Ctx) error {
  c.Status(fiber.StatusOK)
  return nil
})

app.Get("/hello", func(c fiber.Ctx) error {
  return c.Status(fiber.StatusBadRequest).SendString("Bad Request")
})

app.Get("/world", func(c fiber.Ctx) error {
  return c.Status(fiber.StatusNotFound).SendFile("./public/gopher.png")
})
```

### Type

Sets the [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type) HTTP header to the MIME type listed [in the Nginx MIME types configuration](https://github.com/nginx/nginx/blob/master/conf/mime.types) specified by the file **extension**.

:::info
This method is **chainable**.
:::

```go title="Signature"
func (c fiber.Ctx) Type(ext string, charset ...string) fiber.Ctx
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Type(".html") // => "text/html"
  c.Type("html")  // => "text/html"
  c.Type("png")   // => "image/png"

  c.Type("json", "utf-8")  // => "application/json; charset=utf-8"

  // ...
})
```

### Vary

Adds the given header field to the [Vary](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary) response header. This will append the header if not already listed; otherwise, it leaves it listed in the current location.

:::info
Multiple fields are **allowed**.
:::

```go title="Signature"
func (c fiber.Ctx) Vary(fields ...string)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Vary("Origin")     // => Vary: Origin
  c.Vary("User-Agent") // => Vary: Origin, User-Agent

  // No duplicates
  c.Vary("Origin") // => Vary: Origin, User-Agent

  c.Vary("Accept-Encoding", "Accept")
  // => Vary: Origin, User-Agent, Accept-Encoding, Accept

  // ...
})
```

### Write

Adopts the `Writer` interface.

```go title="Signature"
func (c fiber.Ctx) Write(p []byte) (n int, err error)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  c.Write([]byte("Hello, World!")) // => "Hello, World!"

  fmt.Fprintf(c, "%s\n", "Hello, World!") // => "Hello, World!"
})
```

### Writef

Writes a formatted string using a format specifier.

```go title="Signature"
func (c fiber.Ctx) Writef(format string, a ...any) (n int, err error)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  world := "World!"
  c.Writef("Hello, %s", world) // => "Hello, World!"

  fmt.Fprintf(c, "%s\n", "Hello, World!") // => "Hello, World!"
})
```

### WriteString

Writes a string to the response body.

```go title="Signature"
func (c fiber.Ctx) WriteString(s string) (n int, err error)
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.WriteString("Hello, World!")
  // => "Hello, World!"
})
```

### XML

Converts any **interface** or **string** to XML using the standard `encoding/xml` package.

:::info
XML also sets the content header to `application/xml; charset=utf-8`.
:::

```go title="Signature"
func (c fiber.Ctx) XML(data any) error
```

```go title="Example"
type SomeStruct struct {
  XMLName xml.Name `xml:"Fiber"`
  Name    string   `xml:"Name"`
  Age     uint8    `xml:"Age"`
}

app.Get("/", func(c fiber.Ctx) error {
  // Create data struct:
  data := SomeStruct{
    Name: "Grame",
    Age:  20,
  }

  return c.XML(data)
  // <Fiber>
  //     <Name>Grame</Name>
  //     <Age>20</Age>
  // </Fiber>
})
```
---
id: fiber
title: 📦 Fiber
description: Fiber represents the fiber package where you start to create an instance.
sidebar_position: 1
---

import Reference from '@site/src/components/reference';

## Server start

### New

This method creates a new **App** named instance. You can pass optional [config](#config) when creating a new instance.

```go title="Signature"
func New(config ...Config) *App
```

```go title="Example"
// Default config
app := fiber.New()

// ...
```

### Config

You can pass an optional Config when creating a new Fiber instance.

```go title="Example"
// Custom config
app := fiber.New(fiber.Config{
    CaseSensitive: true,
    StrictRouting: true,
    ServerHeader:  "Fiber",
    AppName: "Test App v1.0.1",
})

// ...
```

#### Config fields

| Property                                                                              | Type                                                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Default                                                                |
|---------------------------------------------------------------------------------------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| <Reference id="appname">AppName</Reference>                                           | `string`                                                        | Sets the application name used in logs and the Server header                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `""`                                                                   |
| <Reference id="bodylimit">BodyLimit</Reference>                                       | `int`                                                           | Sets the maximum allowed size for a request body. Zero or negative values fall back to the default limit. If the size exceeds the configured limit, it sends `413 - Request Entity Too Large` response. This limit also applies when running Fiber through the adaptor middleware from `net/http`, when decoding compressed request bodies via [`Ctx.Body()`](./ctx.md#body), and when parsing multipart form data via [`Ctx.MultipartForm()`](./ctx.md#multipartform).                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `4 * 1024 * 1024`                                                      |
| <Reference id="casesensitive">CaseSensitive</Reference>                               | `bool`                                                          | When enabled, `/Foo` and `/foo` are different routes. When disabled, `/Foo` and `/foo` are treated the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `false`                                                                |
| <Reference id="cbordecoder">CBORDecoder</Reference>                                   | `utils.CBORUnmarshal`                                           | Allowing for flexibility in using another cbor library for decoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `binder.UnimplementedCborUnmarshal`                                   |
| <Reference id="cborencoder">CBOREncoder</Reference>                                   | `utils.CBORMarshal`                                             | Allowing for flexibility in using another cbor library for encoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `binder.UnimplementedCborMarshal`                                     |
| <Reference id="colorscheme">ColorScheme</Reference>                                   | [`Colors`](https://github.com/gofiber/fiber/blob/main/color.go) | You can define custom color scheme. They'll be used for startup message, route list and some middlewares.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [`DefaultColors`](https://github.com/gofiber/fiber/blob/main/color.go) |
| <Reference id="compressedfilesuffixes">CompressedFileSuffixes</Reference>             | `map[string]string`                                             | Adds a suffix to the original file name and tries saving the resulting compressed file under the new file name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `{"gzip": ".fiber.gz", "br": ".fiber.br", "zstd": ".fiber.zst"}`       |
| <Reference id="concurrency">Concurrency</Reference>                                   | `int`                                                           | Maximum number of concurrent connections.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `256 * 1024`                                                           |
| <Reference id="disabledefaultcontenttype">DisableDefaultContentType</Reference>       | `bool`                                                          | When true, omits the default Content-Type header from the response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `false`                                                                |
| <Reference id="disabledefaultdate">DisableDefaultDate</Reference>                     | `bool`                                                          | When true, omits the Date header from the response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `false`                                                                |
| <Reference id="disableheadautoregister">DisableHeadAutoRegister</Reference>           | `bool`                          | Prevents Fiber from automatically registering `HEAD` routes for each `GET` route so you can supply custom `HEAD` handlers; manual `HEAD` routes still override the generated ones. | `false`                                                                |
| <Reference id="disableheadernormalizing">DisableHeaderNormalizing</Reference>         | `bool`                                                          | By default all header names are normalized: conteNT-tYPE -&gt; Content-Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `false`                                                                |
| <Reference id="disablekeepalive">DisableKeepalive</Reference>                         | `bool`                                                          | Disables keep-alive connections so the server closes each connection after the first response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `false`                                                                |
| <Reference id="disablepreparsemultipartform">DisablePreParseMultipartForm</Reference> | `bool`                                                          | Will not pre parse Multipart Form data if set to true. This option is useful for servers that desire to treat multipart form data as a binary blob, or choose when to parse the data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `false`                                                                |
| <Reference id="enableipvalidation">EnableIPValidation</Reference>                     | `bool`                                                          | If set to true, `c.IP()` and `c.IPs()` will validate IP addresses before returning them. Also, `c.IP()` will return only the first valid IP rather than just the raw header value that may be a comma separated string.<br /><br />**WARNING:** There is a small performance cost to doing this validation. Keep disabled if speed is your only concern and your application is behind a trusted proxy that already validates this header.                                                                                                                                                                                                                                                                                                                                                                         | `false`                                                                |
| <Reference id="enablesplittingonparsers">EnableSplittingOnParsers</Reference>         | `bool`                                                          | Splits query, body, and header parameters on commas when enabled.<br /><br />For example, `/api?foo=bar,baz` becomes `foo[]=bar&foo[]=baz`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `false`                                                                |
| <Reference id="errorhandler">ErrorHandler</Reference>                                 | `ErrorHandler`                                                  | ErrorHandler is executed when an error is returned from fiber.Handler. Mounted fiber error handlers are retained by the top-level app and applied on prefix associated requests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `DefaultErrorHandler`                                                  |
| <Reference id="getonly">GETOnly</Reference>                                           | `bool`                                                          | Rejects all non-GET requests if set to true. This option is useful as anti-DoS protection for servers accepting only GET requests. The request size is limited by ReadBufferSize if GETOnly is set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `false`                                                                |
| <Reference id="idletimeout">IdleTimeout</Reference>                                   | `time.Duration`                                                 | The maximum amount of time to wait for the next request when keep-alive is enabled. If IdleTimeout is zero, the value of ReadTimeout is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `0`                                                                    |
| <Reference id="immutable">Immutable</Reference>                                       | `bool`                                                          | When enabled, all values returned by context methods are immutable. By default, they are valid until you return from the handler; see issue [\#185](https://github.com/gofiber/fiber/issues/185).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `false`                                                                |
| <Reference id="jsondecoder">JSONDecoder</Reference>                                   | `utils.JSONUnmarshal`                                           | Allowing for flexibility in using another json library for decoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `json.Unmarshal`                                                       |
| <Reference id="jsonencoder">JSONEncoder</Reference>                                   | `utils.JSONMarshal`                                             | Allowing for flexibility in using another json library for encoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `json.Marshal`                                                         |
| <Reference id="maxranges">MaxRanges</Reference>                                       | `int`                                                           | Sets the maximum number of ranges parsed from a `Range` header. Zero or negative values fall back to the default limit. If the limit is exceeded, the request is rejected with `416 - Requested Range Not Satisfiable` and `Content-Range: bytes */<size>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `16`                                                                   |
| <Reference id="msgpackdecoder">MsgPackDecoder</Reference>                             | `utils.MsgPackUnmarshal`                                        | Allowing for flexibility in using another msgpack library for decoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `binder.UnimplementedMsgpackUnmarshal`                                 |
| <Reference id="msgpackencoder">MsgPackEncoder</Reference>                             | `utils.MsgPackMarshal`                                          | Allowing for flexibility in using another msgpack library for encoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `binder.UnimplementedMsgpackMarshal`                                   |
| <Reference id="passlocalstocontext">PassLocalsToContext</Reference>                   | `bool`                                                          | Controls whether `StoreInContext` also propagates values into the request `context.Context` for Fiber-backed contexts. `StoreInContext` always writes to `c.Locals()`. `ValueFromContext` for Fiber-backed contexts always reads from `c.Locals()`. | `false`                                                                |
| <Reference id="passlocalstoviews">PassLocalsToViews</Reference>                       | `bool`                                                          | PassLocalsToViews Enables passing of the locals set on a fiber.Ctx to the template engine. See our **Template Middleware** for supported engines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `false`                                                                |
| <Reference id="proxyheader">ProxyHeader</Reference>                                   | `string`                                                        | Specifies the header name to read the client's real IP address from when behind a reverse proxy. Common values: `fiber.HeaderXForwardedFor`, `"X-Real-IP"`, `"CF-Connecting-IP"` (Cloudflare). <br /><br />**Important:** This setting **requires** `TrustProxy` to be enabled; `TrustProxyConfig` controls which proxy IPs are trusted for reading this header. Without `TrustProxy`, this setting has no effect and `c.IP()` will always return the remote IP from the TCP connection. <br /><br />**Behavior note:** `X-Forwarded-For` often contains a comma-separated chain of IP addresses. With the default `EnableIPValidation = false`, `c.IP()` will return the raw header value (the whole chain) rather than a single parsed client IP. With `EnableIPValidation = true`, `c.IP()` parses the header and returns the **first syntactically valid IP address** it finds; it does **not** walk the chain to find the first non-proxy hop. For a reliable client IP, configure your reverse proxy to overwrite or sanitize this header and/or to provide a single-IP header such as `"X-Real-IP"` or a provider-specific header like `"CF-Connecting-IP"`. <br /><br />**Security Warning:** Headers can be easily spoofed. Always configure `TrustProxyConfig` to validate the proxy IP address, otherwise malicious clients can forge headers to bypass IP-based access controls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `""`                                                                   |
| <Reference id="readbuffersize">ReadBufferSize</Reference>                             | `int`                                                           | per-connection buffer size for requests' reading. This also limits the maximum header size. Increase this buffer if your clients send multi-KB RequestURIs and/or multi-KB headers \(for example, BIG cookies\).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `4096`                                                                 |
| <Reference id="readtimeout">ReadTimeout</Reference>                                   | `time.Duration`                                                 | The amount of time allowed to read the full request, including the body. The default timeout is unlimited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `0`                                                                    |
| <Reference id="reducememoryusage">ReduceMemoryUsage</Reference>                       | `bool`                                                          | Aggressively reduces memory usage at the cost of higher CPU usage if set to true.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `false`                                                                |
| <Reference id="regexhandler">RegexHandler</Reference>                                 | `any`                                                           | Configures the compiler used for `regex()` route constraints. Assign `regexp.MustCompile` or `coregex.MustCompile` directly to switch engines. Fiber reuses the compiled matcher across requests, so the returned value must be safe for concurrent use. Fiber may invoke `RegexHandler` more than once per route while parsing raw and normalized route patterns during registration.                                                                                                                                                                                                                                                                                                                                                                                | `regexp.MustCompile`                                                   |
| <Reference id="requestmethods">RequestMethods</Reference>                             | `[]string`                                                      | RequestMethods provides customizability for HTTP methods. You can add/remove methods as you wish.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `DefaultMethods`                                                       |
| <Reference id="serverheader">ServerHeader</Reference>                                 | `string`                                                        | Enables the `Server` HTTP header with the given value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `""`                                                                   |
| <Reference id="streamrequestbody">StreamRequestBody</Reference>                       | `bool`                                                          | StreamRequestBody enables request body streaming, and calls the handler sooner when given body is larger than the current limit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `false`                                                                |
| <Reference id="strictrouting">StrictRouting</Reference>                               | `bool`                                                          | When enabled, the router treats `/foo` and `/foo/` as different. Otherwise, the router treats `/foo` and `/foo/` as the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `false`                                                                |
| <Reference id="structvalidator">StructValidator</Reference>                           | `StructValidator`                                               | If you want to validate header/form/query... automatically when to bind, you can define struct validator. Fiber doesn't have default validator, so it'll skip validator step if you don't use any validator.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `nil`                                                                  |
| <Reference id="trustproxy">TrustProxy</Reference>                                     | `bool` | Enables trust of reverse proxy headers. When enabled, Fiber will check if the request is coming from a trusted proxy (configured in `TrustProxyConfig`) before reading values from proxy headers. <br /><br />**Required for**: Using `ProxyHeader` to read client IP from headers like `X-Forwarded-For`. <br /><br />**Behavior when enabled:** If the remote IP is trusted (matches `TrustProxyConfig`), then `c.IP()` reads from `ProxyHeader` (when configured; otherwise it uses `RemoteIP()`), `c.Scheme()` first checks standard proxy scheme headers (`X-Forwarded-Proto`, `X-Forwarded-Protocol`, `X-Forwarded-Ssl`, `X-Url-Scheme`) and falls back to the actual connection scheme if none are set, and `c.Hostname()` prefers `X-Forwarded-Host` but falls back to the request Host header when the proxy header is not present. If the remote IP is NOT trusted, these methods ignore proxy headers and use the actual connection values instead. <br /><br />**Security:** This prevents header spoofing by validating the proxy's IP address. Always configure `TrustProxyConfig` when enabling this option and set `ProxyHeader` if you want `c.IP()` to use a specific header. | `false`                                                                |
| <Reference id="trustproxyconfig">TrustProxyConfig</Reference>                         | `TrustProxyConfig`                                              | Configures which proxy IP addresses or ranges to trust. Only effective when `TrustProxy` is enabled. <br /><br />**Fields:** <br />• `Proxies` - List of trusted proxy IPs or CIDR ranges (e.g., `[]string{"10.10.0.58", "192.168.0.0/24"}`) <br />• `Loopback` - Trust loopback addresses (127.0.0.0/8, ::1/128) <br />• `Private` - Trust all private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7) <br />• `LinkLocal` - Trust link-local addresses (169.254.0.0/16, fe80::/10) <br />• `UnixSocket` - Trust Unix domain socket connections <br /><br />**Example:** For an app behind Nginx at 10.10.0.58, use `TrustProxyConfig{Proxies: []string{"10.10.0.58"}}` or `TrustProxyConfig{Private: true}` if using private network IPs.                                                                                                                                                                                                                                                                                                                                                | `{}`                                                                  |
| <Reference id="unescapepath">UnescapePath</Reference>                                 | `bool`                                                          | Converts all encoded characters in the route back before setting the path for the context, so that the routing can also work with URL encoded special characters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `false`                                                                |
| <Reference id="views">Views</Reference>                                               | `Views`                                                         | Views is the interface that wraps the Render function. See our **Template Middleware** for supported engines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `nil`                                                                  |
| <Reference id="viewslayout">ViewsLayout</Reference>                                   | `string`                                                        | Views Layout is the global layout for all template render until override on Render function. See our **Template Middleware** for supported engines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `""`                                                                   |
| <Reference id="writebuffersize">WriteBufferSize</Reference>                           | `int`                                                           | Per-connection buffer size for responses' writing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `4096`                                                                 |
| <Reference id="writetimeout">WriteTimeout</Reference>                                 | `time.Duration`                                                 | The maximum duration before timing out writes of the response. The default timeout is unlimited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `0`                                                                    |
| <Reference id="xmldecoder">XMLDecoder</Reference>                                     | `utils.XMLUnmarshal`                                            | Allowing for flexibility in using another XML library for decoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `xml.Unmarshal`                                                        |
| <Reference id="xmlencoder">XMLEncoder</Reference>                                     | `utils.XMLMarshal`                                              | Allowing for flexibility in using another XML library for encoding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `xml.Marshal`                                                          |

## Server listening

### Config

You can pass an optional ListenConfig when calling the [`Listen`](#listen) or [`Listener`](#listener) method.

```go title="Example"
// Custom config
app.Listen(":8080", fiber.ListenConfig{
    EnablePrefork: true,
    DisableStartupMessage: true,
})
```

#### Config fields

| Property                                                                | Type                          | Description                                                                                                                                                                                                                                                                                                                  | Default            |
|-------------------------------------------------------------------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| <Reference id="beforeservefunc">BeforeServeFunc</Reference>             | `func(app *App) error`        | Allows customizing and accessing fiber app before serving the app.                                                                                                                                                                                                                                                           | `nil`              |
| <Reference id="certclientfile">CertClientFile</Reference>               | `string`                      | Path of the client certificate. If you want to use mTLS, you must enter this field.                                                                                                                                                                                                                                          | `""`               |
| <Reference id="certfile">CertFile</Reference>                           | `string`                      | Path of the certificate file. If you want to use TLS, you must enter this field.                                                                                                                                                                                                                                             | `""`               |
| <Reference id="certkeyfile">CertKeyFile</Reference>                     | `string`                      | Path of the certificate's private key. If you want to use TLS, you must enter this field.                                                                                                                                                                                                                                    | `""`               |
| <Reference id="disablestartupmessage">DisableStartupMessage</Reference> | `bool`                        | When set to true, it will not print out the «Fiber» ASCII art and listening address.                                                                                                                                                                                                                                         | `false`            |
| <Reference id="enableprefork">EnablePrefork</Reference>                 | `bool`                        | When set to true, this will spawn multiple Go processes listening on the same port.                                                                                                                                                                                                                                          | `false`            |
| <Reference id="enableprintroutes">EnablePrintRoutes</Reference>         | `bool`                        | If set to true, will print all routes with their method, path, and handler.                                                                                                                                                                                                                                                  | `false`            |
| <Reference id="gracefulcontext">GracefulContext</Reference>             | `context.Context`             | Field to shutdown Fiber by given context gracefully.                                                                                                                                                                                                                                                                         | `nil`              |
| <Reference id="ShutdownTimeout">ShutdownTimeout</Reference>             | `time.Duration`               | Specifies the maximum duration to wait for the server to gracefully shutdown. When the timeout is reached, the graceful shutdown process is interrupted and forcibly terminated, and the `context.DeadlineExceeded` error is passed to the `OnPostShutdown` callback. Set to 0 to disable the timeout and wait indefinitely. | `10 * time.Second` |
| <Reference id="listeneraddrfunc">ListenerAddrFunc</Reference>           | `func(addr net.Addr)`         | Allows accessing and customizing `net.Listener`.                                                                                                                                                                                                                                                                             | `nil`              |
| <Reference id="listenernetwork">ListenerNetwork</Reference>             | `string`                      | Known networks are "tcp", "tcp4" (IPv4-only), "tcp6" (IPv6-only), "unix" (Unix Domain Sockets). WARNING: When prefork is set to true, only "tcp4" and "tcp6" can be chosen.                                                                                                                                                  | `tcp4`             |
| <Reference id="preforkrecoverthreshold">PreforkRecoverThreshold</Reference> | `int`                      | Defines the maximum number of child process restarts after crashes before the prefork master exits with an error. Only applies when prefork is enabled.                                                                                                                                                                        | `max(1, runtime.GOMAXPROCS(0) / 2)` |
| <Reference id="preforklogger">PreforkLogger</Reference>                 | `PreforkLogger`      | Sets a custom logger for the prefork process manager. Only applies when prefork is enabled.                                                                                                                                                                                                                                  | Fiber logger       |
| <Reference id="unixsocketfilemode">UnixSocketFileMode</Reference>       | `os.FileMode`                 | FileMode to set for Unix Domain Socket (ListenerNetwork must be "unix")                                                                                                                                                                                                                                                      | `0770`             |
| <Reference id="tlsconfigfunc">TLSConfigFunc</Reference>                 | `func(tlsConfig *tls.Config)` | Allows customizing `tls.Config` as you want. Ignored when `TLSConfig` is set.                                                                                                                                                                                                                                                | `nil`              |
| <Reference id="tlsconfig">TLSConfig</Reference>                         | `*tls.Config`                 | Recommended base TLS configuration (cloned). Use for external certificate providers via `GetCertificate`. When set, other TLS fields are ignored.                                                                                                                                                                             | `nil`              |
| <Reference id="autocertmanager">AutoCertManager</Reference>             | `*autocert.Manager`           | Manages TLS certificates automatically using the ACME protocol. Enables integration with Let's Encrypt or other ACME-compatible providers.                                                                                                                                                                                   | `nil`              |
| <Reference id="tlsminversion">TLSMinVersion</Reference>                 | `uint16`                      | Allows customizing the TLS minimum version.                                                                                                                                                                                                                                                                                  | `tls.VersionTLS12` |

### Listen

Listen serves HTTP requests from the given address.

```go title="Signature"
func (app *App) Listen(addr string, config ...ListenConfig) error
```

```go title="Basic Listen usage"
// Listen on port :8080
app.Listen(":8080")

// Listen on port :8080 with Prefork
app.Listen(":8080", fiber.ListenConfig{EnablePrefork: true})

// Custom host
app.Listen("127.0.0.1:8080")
```

#### Prefork

Prefork is a feature that allows you to spawn multiple Go processes listening on the same port. This can be useful for scaling across multiple CPU cores.

```go title="Prefork listener"
app.Listen(":8080", fiber.ListenConfig{EnablePrefork: true})
```

Depending on the operating system, prefork can distribute incoming connections between the spawned processes and allow more requests to be handled simultaneously.

On Linux, prefork typically relies on the `SO_REUSEPORT` socket option for kernel-assisted load distribution across workers. On Windows, Fiber falls back to `SO_REUSEADDR`; this is not a functional equivalent to Linux `SO_REUSEPORT` as it lacks native load balancing and may allow other processes to bind to the same port. Operators should validate this behavior against their security and availability requirements.

##### Security Considerations

Prefork changes the port-ownership model from strict single-owner binding to an intentional multi-listener setup. In shared hosts, a local co-resident attacker with sufficient privileges may be able to race for shared binds or receive a portion of traffic, depending on platform behavior and user boundaries.

- Run prefork only within a trusted boundary (same deployment unit / same trust domain).
- Use a dedicated service account for Fiber workers; avoid broad shared-user deployments.
- Prefer container or VM isolation and avoid shared host namespaces for unrelated workloads.
- If strict single-owner port semantics are required, run Fiber without prefork.

#### TLS

Prefer `TLSConfig` for TLS configuration so you can fully control certificates and settings. When `TLSConfig` is set, Fiber ignores `CertFile`, `CertKeyFile`, `CertClientFile`, `TLSMinVersion`, `AutoCertManager`, and `TLSConfigFunc`.

TLS serves HTTPs requests from the given address using certFile and keyFile paths as TLS certificate and key file.

```go title="TLS with cert and key files"
app.Listen(":443", fiber.ListenConfig{CertFile: "./cert.pem", CertKeyFile: "./cert.key"})
```

#### TLS with client CA certificate

`CertClientFile` only configures the client CA for mTLS when using `CertFile`/`CertKeyFile`. If `TLSConfig` is set, `CertClientFile` is ignored, so configure client CAs in the provided `tls.Config` instead.

```go title="TLS with client CA certificate"
app.Listen(":443", fiber.ListenConfig{
    CertFile:       "./cert.pem",
    CertKeyFile:    "./cert.key",
    CertClientFile: "./ca-chain-cert.pem",
})
```

#### TLS AutoCert support (ACME / Let's Encrypt)

Provides automatic access to certificates management from Let's Encrypt and any other ACME-based providers.

```go title="AutoCert (ACME) configuration"
// Certificate manager
certManager := &autocert.Manager{
    Prompt: autocert.AcceptTOS,
    // Replace with your domain name
    HostPolicy: autocert.HostWhitelist("example.com"),
    // Folder to store the certificates
    Cache: autocert.DirCache("./certs"),
}

app.Listen(":444", fiber.ListenConfig{
    AutoCertManager:    certManager,
})
```

#### Precedence and conflicts

- `TLSConfig` is preferred and ignores `CertFile`/`CertKeyFile`, `CertClientFile`, `AutoCertManager`, `TLSMinVersion`, and `TLSConfigFunc`.
- `AutoCertManager` cannot be combined with `CertFile`/`CertKeyFile`.

#### TLS with external certificate provider

Use `TLSConfig` to supply a base `tls.Config` that can fetch certificates at runtime. `TLSConfig` is cloned and used as-is.

```go title="TLSConfig with dynamic certificate provider"
app.Listen(":443", fiber.ListenConfig{
    TLSConfig: &tls.Config{
        GetCertificate: func(info *tls.ClientHelloInfo) (*tls.Certificate, error) {
            return myProvider.Certificate(info.ServerName)
        },
    },
})
```

#### Mutual TLS with TLSConfig

Use `TLSConfig` to configure mutual TLS by setting `ClientAuth` and `ClientCAs`. This replaces `CertClientFile` when you manage TLS configuration directly.

```go title="TLSConfig with client CA pool"
certPEM := []byte(certPEMString)
keyPEM := []byte(keyPEMString)
caPEM := []byte(caPEMString)

cert, err := tls.X509KeyPair(certPEM, keyPEM)
if err != nil {
    log.Fatal(err)
}

clientCAs := x509.NewCertPool()
if ok := clientCAs.AppendCertsFromPEM(caPEM); !ok {
    log.Fatal("failed to append client CA")
}

app.Listen(":443", fiber.ListenConfig{
    TLSConfig: &tls.Config{
        Certificates: []tls.Certificate{cert},
        ClientAuth:   tls.RequireAndVerifyClientCert,
        ClientCAs:    clientCAs,
    },
})
```

Load certificates from memory or environment variables and provide them via `TLSConfig`.

```go title="TLSConfig with in-memory certificate"
certPEM := []byte(certPEMString)
keyPEM := []byte(keyPEMString)

cert, err := tls.X509KeyPair(certPEM, keyPEM)
if err != nil {
    log.Fatal(err)
}

app.Listen(":443", fiber.ListenConfig{
    TLSConfig: &tls.Config{
        Certificates: []tls.Certificate{cert},
    },
})
```

```go title="TLSConfig with certificate from environment"
certPEM := []byte(os.Getenv("TLS_CERT_PEM"))
keyPEM := []byte(os.Getenv("TLS_KEY_PEM"))

cert, err := tls.X509KeyPair(certPEM, keyPEM)
if err != nil {
    log.Fatal(err)
}

app.Listen(":443", fiber.ListenConfig{
    TLSConfig: &tls.Config{
        Certificates: []tls.Certificate{cert},
    },
})
```

### Listener

You can pass your own [`net.Listener`](https://pkg.go.dev/net/#Listener) using the `Listener` method. This method can be used to enable **TLS/HTTPS** with a custom tls.Config.

```go title="Signature"
func (app *App) Listener(ln net.Listener, config ...ListenConfig) error
```

```go title="Examples"
ln, _ := net.Listen("tcp", ":3000")

cer, _:= tls.LoadX509KeyPair("server.crt", "server.key")

ln = tls.NewListener(ln, &tls.Config{Certificates: []tls.Certificate{cer}})

app.Listener(ln)
```

## Server

Server returns the underlying [fasthttp server](https://godoc.org/github.com/valyala/fasthttp#Server)

```go title="Signature"
func (app *App) Server() *fasthttp.Server
```

```go title="Examples"
func main() {
    app := fiber.New()

    app.Server().MaxConnsPerIP = 1

    // ...
}
```

## Server Shutdown

Shutdown gracefully shuts down the server without interrupting any active connections. Shutdown works by first closing all open listeners and then waits indefinitely for all connections to return to idle before shutting down.

ShutdownWithTimeout will forcefully close any active connections after the timeout expires.

ShutdownWithContext shuts down the server including by force if the context's deadline is exceeded. Shutdown hooks will still be executed, even if an error occurs during the shutdown process, as they are deferred to ensure cleanup happens regardless of errors.

```go
func (app *App) Shutdown() error
func (app *App) ShutdownWithTimeout(timeout time.Duration) error
func (app *App) ShutdownWithContext(ctx context.Context) error
```

## Helper functions

### NewError

NewError creates a new HTTPError instance with an optional message.

```go title="Signature"
func NewError(code int, message ...string) *Error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
    return fiber.NewError(782, "Custom error message")
})
```

### NewErrorf

NewErrorf creates a new HTTPError instance with an optional formatted message.

```go title="Signature"
func NewErrorf(code int, message ...any) *Error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
    return fiber.NewErrorf(782, "Custom error %s", "message")
})
```

### IsChild

IsChild determines if the current process is a result of Prefork.

```go title="Signature"
func IsChild() bool
```

```go title="Example"
// Config app
app := fiber.New()

app.Get("/", func(c fiber.Ctx) error {
    if !fiber.IsChild() {
        fmt.Println("I'm the parent process")
    } else {
        fmt.Println("I'm a child process")
    }
    return c.SendString("Hello, World!")
})

// ...

// With prefork enabled, the parent process will spawn child processes
app.Listen(":8080", fiber.ListenConfig{EnablePrefork: true})
```
---
id: hooks
title: 🎣 Hooks
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Fiber lets you run custom callbacks at specific points in the routing lifecycle. Available hooks include:

- [OnRoute](#onroute)
- [OnName](#onname)
- [OnGroup](#ongroup)
- [OnGroupName](#ongroupname)
- [OnListen](#onlisten)
- [OnPreStartupMessage/OnPostStartupMessage](#onprestartupmessageonpoststartupmessage)
  - [ListenData](#listendata)
- [OnFork](#onfork)
- [OnPreShutdown](#onpreshutdown)
- [OnPostShutdown](#onpostshutdown)
- [OnMount](#onmount)

## Constants

```go
// Handlers define functions to create hooks for Fiber.
type OnRouteHandler = func(Route) error
type OnNameHandler = OnRouteHandler
type OnGroupHandler = func(Group) error
type OnGroupNameHandler = OnGroupHandler
type OnListenHandler = func(ListenData) error
type OnForkHandler = func(int) error
type OnPreStartupMessageHandler  = func(*PreStartupMessageData) error
type OnPostStartupMessageHandler = func(*PostStartupMessageData) error
type OnPreShutdownHandler  = func() error
type OnPostShutdownHandler = func(error) error
type OnMountHandler = func(*App) error
```

## OnRoute

Runs after each route is registered. The callback receives the route so you can inspect its properties.

```go title="Signature"
func (h *Hooks) OnRoute(handler ...OnRouteHandler)
```

## OnName

Runs when a route is named. The callback receives the route.

:::caution
`OnName` only works with named routes, not groups.
:::

```go title="Signature"
func (h *Hooks) OnName(handler ...OnNameHandler)
```

<Tabs>
<TabItem value="onname-example" label="OnName Example">

```go
package main

import (
    "fmt"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString(c.Route().Name)
    }).Name("index")

    app.Hooks().OnName(func(r fiber.Route) error {
        fmt.Print("Name: " + r.Name + ", ")
        return nil
    })

    app.Hooks().OnName(func(r fiber.Route) error {
        fmt.Print("Method: " + r.Method + "\n")
        return nil
    })

    app.Get("/add/user", func(c fiber.Ctx) error {
        return c.SendString(c.Route().Name)
    }).Name("addUser")

    app.Delete("/destroy/user", func(c fiber.Ctx) error {
        return c.SendString(c.Route().Name)
    }).Name("destroyUser")

    app.Listen(":5000")
}

// Results:
// Name: addUser, Method: GET
// Name: destroyUser, Method: DELETE
```

</TabItem>
</Tabs>

## OnGroup

Runs after each group is registered. The callback receives the group.

```go title="Signature"
func (h *Hooks) OnGroup(handler ...OnGroupHandler)
```

## OnGroupName

Runs when a group is named. The callback receives the group.

:::caution
`OnGroupName` only works with named groups, not routes.
:::

```go title="Signature"
func (h *Hooks) OnGroupName(handler ...OnGroupNameHandler)
```

## OnListen

Runs when the app starts listening via `Listen` or `Listener`.

```go title="Signature"
func (h *Hooks) OnListen(handler ...OnListenHandler)
```

<Tabs>
<TabItem value="onlisten-example" label="OnListen Example">

```go
package main

import (
    "log"
    "os"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/log"
)

func main() {
    app := fiber.New(fiber.Config{
        DisableStartupMessage: true,
    })

    app.Hooks().OnListen(func(listenData fiber.ListenData) error {
        if fiber.IsChild() {
            return nil
        }
        scheme := "http"
        if listenData.TLS {
            scheme = "https"
        }
        log.Println(scheme + "://" + listenData.Host + ":" + listenData.Port)
        return nil
    })

    app.Listen(":5000")
}
```

</TabItem>
</Tabs>

## OnPreStartupMessage/OnPostStartupMessage

Use `OnPreStartupMessage` to tweak the banner before Fiber prints it, and `OnPostStartupMessage` to run logic after the banner is printed (or skipped). You can use some helper functions to customize the banner inside the `OnPreStartupMessage` hook.

```go title="Signatures"
// AddInfo adds an informational entry to the startup message with "INFO" label.
func (sm *PreStartupMessageData) AddInfo(key, title, value string, priority ...int)

// AddWarning adds a warning entry to the startup message with "WARNING" label.
func (sm *PreStartupMessageData) AddWarning(key, title, value string, priority ...int)

// AddError adds an error entry to the startup message with "ERROR" label.
func (sm *PreStartupMessageData) AddError(key, title, value string, priority ...int)

// EntryKeys returns all entry keys currently present in the startup message.
func (sm *PreStartupMessageData) EntryKeys() []string

// ResetEntries removes all existing entries from the startup message.
func (sm *PreStartupMessageData) ResetEntries()

// DeleteEntry removes a specific entry from the startup message by its key.
func (sm *PreStartupMessageData) DeleteEntry(key string)
```

- Assign `sm.BannerHeader` to override the ASCII art banner. Leave it empty to use the default banner provided by Fiber.
- Set `sm.PreventDefault = true` to suppress the built-in banner without affecting other hooks.
- `PostStartupMessageData` reports whether the banner was skipped via the `Disabled`, `IsChild`, and `Prevented` flags.

### Startup Message Customization

```go title="Customize the startup message"
package main

import (
    "fmt"
    "os"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Hooks().OnPreStartupMessage(func(sm *fiber.PreStartupMessageData) error {
        sm.BannerHeader = "FOOBER " + sm.Version + "\n-------"

        // Optional: you can also remove old entries
        // sm.ResetEntries()

        sm.AddInfo("git-hash", "Git hash", os.Getenv("GIT_HASH"))
        sm.AddInfo("prefork", "Prefork", fmt.Sprintf("%v", sm.Prefork), 15)
        return nil
    })

    app.Hooks().OnPostStartupMessage(func(sm fiber.PostStartupMessageData) error {
        if !sm.Disabled && !sm.IsChild && !sm.Prevented {
            fmt.Println("startup completed")
        }
        return nil
    })

    app.Listen(":5000")
}
```

### ListenData

`ListenData` exposes runtime metadata about the listener:

| Field | Type | Description |
| --- | --- | --- |
| `Host` | `string` | Resolved hostname or IP address. |
| `Port` | `string` | The bound port. |
| `TLS` | `bool` | Indicates whether TLS is enabled. |
| `Version` | `string` | Fiber version reported in the startup banner. |
| `AppName` | `string` | Application name from the configuration. |
| `HandlerCount` | `int` | Total registered handler count. |
| `ProcessCount` | `int` | Number of processes Fiber will use. |
| `PID` | `int` | Current process identifier. |
| `Prefork` | `bool` | Whether prefork is enabled. |
| `ChildPIDs` | `[]int` | Child process identifiers when preforking. |
| `ColorScheme` | [`Colors`](https://github.com/gofiber/fiber/blob/main/color.go) | Active color scheme for the startup message. |

## OnFork

Runs in the child process after a fork.

```go title="Signature"
func (h *Hooks) OnFork(handler ...OnForkHandler)
```

## OnPreShutdown

Runs before the server shuts down.

```go title="Signature"
func (h *Hooks) OnPreShutdown(handler ...OnPreShutdownHandler)
```

## OnPostShutdown

Runs after the server shuts down.

```go title="Signature"
func (h *Hooks) OnPostShutdown(handler ...OnPostShutdownHandler)
```

## OnMount

Fires after a sub-app is mounted on a parent. The parent app is passed to the callback and it works for both app and group mounts.

```go title="Signature"
func (h *Hooks) OnMount(handler ...OnMountHandler)
```

<Tabs>
<TabItem value="onmount-example" label="OnMount Example">

```go
package main

import (
    "fmt"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()
    app.Get("/", testSimpleHandler).Name("x")

    subApp := fiber.New()
    subApp.Get("/test", testSimpleHandler)

    subApp.Hooks().OnMount(func(parent *fiber.App) error {
        fmt.Print("Mount path of parent app: " + parent.MountPath())
        // Additional custom logic...
        return nil
    })

    app.Use("/sub", subApp)
}

func testSimpleHandler(c fiber.Ctx) error {
    return c.SendString("Hello, Fiber!")
}

// Result:
// Mount path of parent app: /sub
```

</TabItem>
</Tabs>

:::caution
OnName, OnRoute, OnGroup, and OnGroupName are mount-sensitive. When you mount a sub-app that registers these hooks, route and group paths include the mount prefix.
:::
---
id: log
title: 📃 Log
description: Fiber's built-in log package
sidebar_position: 6
---

Logs help you observe program behavior, diagnose issues, and trigger alerts. Structured logs improve searchability and speed up troubleshooting.

Fiber logs to standard output by default and exposes global helpers such as `log.Info`, `log.Errorf`, and `log.Warnw`.

## Log Levels

```go
const (
    LevelTrace Level = iota
    LevelDebug
    LevelInfo
    LevelWarn
    LevelError
    LevelFatal
    LevelPanic
)
```

## Custom Log

Fiber provides the generic `AllLogger[T]` interface for adapting various log libraries.

```go
type CommonLogger interface {
    Logger
    FormatLogger
    WithLogger
}

type ConfigurableLogger[T any] interface {
    // SetLevel sets logging level.
    SetLevel(level Level)

    // SetOutput sets the logger output.
    SetOutput(w io.Writer)

    // Logger returns the logger instance.
    Logger() T
}

type AllLogger[T any] interface {
    CommonLogger
    ConfigurableLogger[T]

    // WithContext returns a new logger with the given context.
    WithContext(ctx any) CommonLogger
}
```

## Print Log

**Note:** The Fatal level method will terminate the program after printing the log message. Please use it with caution.

### Basic Logging

Call level-specific methods directly; entries use the `messageKey` (default `msg`).

```go
log.Info("Hello, World!")
log.Debug("Are you OK?")
log.Info("42 is the answer to life, the universe, and everything")
log.Warn("We are under attack!")
log.Error("Houston, we have a problem.")
log.Fatal("So Long, and Thanks for All the Fish.")
log.Panic("The system is down.")
```

### Formatted Logging

Append `f` to format the message.

```go
log.Debugf("Hello %s", "boy")
log.Infof("%d is the answer to life, the universe, and everything", 42)
log.Warnf("We are under attack, %s!", "boss")
log.Errorf("%s, we have a problem.", "John Smith")
log.Fatalf("So Long, and Thanks for All the %s.", "fish")
```

### Key-Value Logging

Key-value helpers log structured fields; mismatched pairs emit `KEYVALS UNPAIRED`.

```go
log.Debugw("", "greeting", "Hello", "target", "boy")
log.Infow("", "number", 42)
log.Warnw("", "job", "boss")
log.Errorw("", "name", "John Smith")
log.Fatalw("", "fruit", "fish")
```

## Global Log

Fiber also exposes a global logger for quick messages.

```go
import "github.com/gofiber/fiber/v3/log"

log.Info("info")
log.Warn("warn")
```

The example uses `log.DefaultLogger`, which writes to stdout. The [contrib](https://github.com/gofiber/contrib) repo offers adapters like `fiberzap` and `fiberzerolog`, or you can register your own with `log.SetLogger`.

Here's an example using a custom logger:

```go
import (
    "log"
    fiberlog "github.com/gofiber/fiber/v3/log"
)

var _ fiberlog.AllLogger[*log.Logger] = (*customLogger)(nil)

type customLogger struct {
    stdlog *log.Logger
}

// Implement required methods for the AllLogger interface...

// Inject your custom logger
fiberlog.SetLogger[*log.Logger](&customLogger{
    stdlog: log.New(os.Stdout, "CUSTOM ", log.LstdFlags),
})

// Retrieve the underlying *log.Logger for direct use
std := fiberlog.DefaultLogger[*log.Logger]().Logger()
std.Println("custom logging")
```

## Set Level

`log.SetLevel` sets the minimum level that will be output. The default is `LevelTrace`.

**Note:** This method is not concurrent safe.

```go
import "github.com/gofiber/fiber/v3/log"

log.SetLevel(log.LevelInfo)
```

Setting the log level allows you to control the verbosity of the logs, filtering out messages below the specified level.

## Set Output

`log.SetOutput` sets where logs are written. By default, they go to the console.

### Writing Logs to Stderr

`log.SetOutput(os.Stderr)` redirects the default logger to standard error.

```go
import (
    "os"

    fiberlog "github.com/gofiber/fiber/v3/log"
)

fiberlog.SetOutput(os.Stderr)
```

This lets you route logs to a file, service, or any destination.

### Writing Logs to a File

To write to a file such as `test.log`:

```go
// Output to ./test.log file
f, err := os.OpenFile("test.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
if err != nil {
    log.Fatal("Failed to open log file:", err)
}
log.SetOutput(f)
```

### Writing Logs to Both Console and File

Write to both `test.log` and `stdout`:

```go
// Output to ./test.log file
file, err := os.OpenFile("test.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
if err != nil {
    log.Fatal("Failed to open log file:", err)
}
iw := io.MultiWriter(os.Stdout, file)
log.SetOutput(iw)
```

## Bind Context

Bind a logger to a context with `log.WithContext`, which returns a `CommonLogger` tied to that context.

```go
commonLogger := log.WithContext(ctx)
commonLogger.Info("info")
```

Context binding can render request-specific data for easier tracing. The default context format is `log.DefaultFormat` (the empty string), so `log.WithContext(ctx)` adds no fields until you configure a format with `log.SetContextTemplate` (or its `MustSetContextTemplate` panic-on-error variant).

`SetContextTemplate` configures Fiber's built-in default logger. Custom loggers registered with `SetLogger` keep full control over their own `WithContext` behavior and should implement equivalent enrichment themselves when needed.

```go
import (
    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/log"
    "github.com/gofiber/fiber/v3/middleware/requestid"
)

app.Use(requestid.New())

log.MustSetContextTemplate(log.ContextConfig{Format: log.RequestIDFormat})

app.Get("/", func(c fiber.Ctx) error {
    log.WithContext(c).Info("start")
    return c.SendString("Hello, World!")
})
```

Middleware that stores request values registers its log context tags automatically. For example, importing `requestid` makes `${requestid}` and `${request-id}` available; the actual value is filled in once `requestid.New()` runs in your handler stack. Until then the tag renders as an empty string, so a format that references `${requestid}` still compiles without `requestid.New()` in the chain.

Use `log.WithContext(c)` inside handlers when you want tags to read values stored by Fiber middleware. Passing `c.Context()` only exposes values propagated into the standard request context.

:::tip
Cross-reference: the access-log integration uses the same tag names — see [middleware/logger](../middleware/logger.md#config) for the request-time format.
:::

### Glossary

- **Format** — the string with `${...}` placeholders, e.g. `"[${requestid}] "`.
- **Template** — the compiled, reusable form of a format produced by `SetContextTemplate`.
- **Tag** — a single `${name}` (bare) or `${name:param}` (parametric) placeholder inside a format.

### Signatures

```go
// Configure the active context template (or pass log.ContextConfig{} to disable).
func SetContextTemplate(config ContextConfig) error
func MustSetContextTemplate(config ContextConfig)

// Register a tag globally; the new renderer becomes available to subsequent
// SetContextTemplate calls. The reserved TagContextValue ("value:") name
// cannot be registered.
func RegisterContextTag(tag string, fn ContextTagFunc) error
func MustRegisterContextTag(tag string, fn ContextTagFunc)

// Bind a context to the default logger. ctx accepts fiber.Ctx,
// *fasthttp.RequestCtx, context.Context, or any value exposing
// Value(key any)/UserValue(key any).
func WithContext(ctx any) CommonLogger

// Public types referenced by the API above.
type ContextConfig struct {
    CustomTags map[string]ContextTagFunc
    Format     string
}
type ContextData struct{}
type ContextTagFunc = logtemplate.Func[any, ContextData]
type Buffer        = logtemplate.Buffer

// Format constants.
const (
    DefaultFormat   = ""
    RequestIDFormat = "[${requestid}] "
    KeyValueFormat  = "request-id=${request-id} username=${username} api-key=${api-key} csrf-token=${csrf-token} session-id=${session-id} "
    TagContextValue = "value:"
)
```

### Context Formats

| Format Constant | Format String | Description |
| :-- | :-- | :-- |
| `DefaultFormat` | `""` | Disables contextual fields. |
| `RequestIDFormat` | `"[${requestid}] "` | Prepends the request ID when the requestid middleware is used. |
| `KeyValueFormat` | `"request-id=${request-id} username=${username} api-key=${api-key} csrf-token=${csrf-token} session-id=${session-id} "` | Prepends common middleware context values as key/value fields. Sensitive values are redacted by the registering middleware. |

### Context Tags

| Tag | Source |
| :-- | :-- |
| `${requestid}` / `${request-id}` | `requestid` middleware |
| `${username}` | `basicauth` middleware — written **in clear text** for audit-log use cases. Avoid this tag if your usernames are PII. |
| `${api-key}` | `keyauth` middleware, redacted to a 4-byte prefix |
| `${csrf-token}` | `csrf` middleware, redacted to a 4-byte prefix |
| `${session-id}` | `session` middleware, redacted to a 4-byte prefix |
| `${value:key}` | Any bound value with `Value(key)` or `UserValue(key)` lookup methods |

:::caution
`${value:KEY}` looks up arbitrary context values. CR, LF, NUL, and other ASCII control bytes (except tab) are replaced with spaces before they reach the log line, so attacker-controlled values cannot forge log lines via header smuggling. The lookup still writes the value verbatim apart from that scrub — strip or hash sensitive fields before storing them on the context if you do not want them in operator logs.
:::

### Custom Context Tags

Register custom tags with `log.RegisterContextTag`, then reference them from a format passed to `SetContextTemplate`. The built-in `${value:key}` tag is reserved for context-value lookups and cannot be overridden.

```go
type tenantContextKey struct{}

var tenantKey tenantContextKey

log.MustRegisterContextTag("tenant", func(output log.Buffer, ctx any, _ *log.ContextData, _ string) (int, error) {
    tenant, _ := fiber.ValueFromContext[string](ctx, tenantKey)
    return output.WriteString(tenant)
})

log.MustSetContextTemplate(log.ContextConfig{Format: "[${tenant}] "})

app.Use(func(c fiber.Ctx) error {
    fiber.StoreInContext(c, tenantKey, "acme")
    return c.Next()
})
```

:::note
Register tags **before** referencing them in `SetContextTemplate`. Compiling a format that references an unregistered name returns `*logtemplate.UnknownTagError` (or panics from `MustSetContextTemplate`).
:::

## Logger

Use `Logger` to access the underlying logger and call its native methods:

```go
logger := fiberlog.DefaultLogger[*log.Logger]() // Get the default logger instance

stdlogger := logger.Logger() // stdlogger is *log.Logger
stdlogger.SetFlags(0) // Hide timestamp by setting flags to 0
```
---
id: redirect
title: 🔄 Redirect
description: Fiber's built-in redirect package
sidebar_position: 5
toc_max_heading_level: 5
---

Redirect helpers send the client to another URL or route.

## Redirect Methods

### To

Redirects to a URL built from the given path. Optionally set an HTTP [status](#status).

:::info
If unspecified, status defaults to **303 See Other**.
:::

```go title="Signature"
func (r *Redirect) To(location string) error
```

```go title="Example"
app.Get("/coffee", func(c fiber.Ctx) error {
  // => HTTP - GET 301 /teapot
  return c.Redirect().Status(fiber.StatusMovedPermanently).To("/teapot")
})

app.Get("/teapot", func(c fiber.Ctx) error {
  return c.Status(fiber.StatusTeapot).Send("🍵 short and stout 🍵")
})
```

```go title="More examples"
app.Get("/", func(c fiber.Ctx) error {
  // => HTTP - GET 303 /foo/bar
  return c.Redirect().To("/foo/bar")
  // => HTTP - GET 303 ../login
  return c.Redirect().To("../login")
  // => HTTP - GET 303 http://example.com
  return c.Redirect().To("http://example.com")
  // => HTTP - GET 301 https://example.com
  return c.Redirect().Status(301).To("http://example.com")
})
```

### Route

Redirects to a named route with parameters and queries.

:::info
To send params and queries to a route, use the [`RedirectConfig`](#redirectconfig) struct.
:::

```go title="Signature"
func (r *Redirect) Route(name string, config ...RedirectConfig) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  // /user/fiber
  return c.Redirect().Route("user", fiber.RedirectConfig{
    Params: fiber.Map{
      "name": "fiber",
    },
  })
})

app.Get("/with-queries", func(c fiber.Ctx) error {
  // /user/fiber?data[0][name]=john&data[0][age]=10&test=doe
  return c.Redirect().Route("user", fiber.RedirectConfig{
    Params: fiber.Map{
      "name": "fiber",
    },
    Queries: map[string]string{
      "data[0][name]": "john",
      "data[0][age]":  "10",
      "test":          "doe",
    },
  })
})

app.Get("/user/:name", func(c fiber.Ctx) error {
  return c.SendString(c.Params("name"))
}).Name("user")
```

### Back

Redirects to the referer. If it's missing, fall back to the provided URL. You can also set the status code.

:::info
If unspecified, status defaults to **303 See Other**.
:::

```go title="Signature"
func (r *Redirect) Back(fallback string) error
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  return c.SendString("Home page")
})

app.Get("/test", func(c fiber.Ctx) error {
  c.Set("Content-Type", "text/html")
  return c.SendString(`<a href="/back">Back</a>`)
})

app.Get("/back", func(c fiber.Ctx) error {
  return c.Redirect().Back("/")
})
```

## Controls

:::info
Methods are **chainable**.
:::

### Status

Sets the HTTP status code for the redirect.

:::info
It is used in conjunction with [**To**](#to), [**Route**](#route), and [**Back**](#back) methods.
:::

```go title="Signature"
func (r *Redirect) Status(status int) *Redirect
```

```go title="Example"
app.Get("/coffee", func(c fiber.Ctx) error {
  // => HTTP - GET 301 /teapot
  return c.Redirect().Status(fiber.StatusMovedPermanently).To("/teapot")
})
```

### RedirectConfig

Sets the configuration for the redirect.

:::info
It is used in conjunction with the [**Route**](#route) method.
:::

```go title="Definition"
// RedirectConfig is a config to use with Redirect().Route()
type RedirectConfig struct {
  Params  fiber.Map         // Route parameters
  Queries map[string]string // Query map
}
```

### Flash Message

Similar to [Laravel](https://laravel.com/docs/11.x/redirects#redirecting-with-flashed-session-data), we can flash a message and retrieve it in the next request.

#### Messages

Retrieve all flash messages. See [With](#with) for details.

```go title="Signature"
func (r *Redirect) Messages() map[string]string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  messages := c.Redirect().Messages()
  return c.JSON(messages)
})
```

#### Message

Get a flash message by key; see [With](#with).

```go title="Signature"
func (r *Redirect) Message(key string) *Redirect
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  message := c.Redirect().Message("status")
  return c.SendString(message)
})
```

#### OldInputs

Retrieve stored input data. See [WithInput](#withinput).

```go title="Signature"
func (r *Redirect) OldInputs() map[string]string
```

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
  oldInputs := c.Redirect().OldInputs()
  return c.JSON(oldInputs)
})
```

#### OldInput

Get stored input data by key; see [WithInput](#withinput).

```go title="Signature"
func (r *Redirect) OldInput(key string) string
```

```go title="Example"
app.Get("/name", func(c fiber.Ctx) error {
  oldInput := c.Redirect().OldInput("name")
  return c.SendString(oldInput)
})
```

#### With

Send flash messages with `With`.

```go title="Signature"
func (r *Redirect) With(key, value string) *Redirect
```

```go title="Example"
app.Get("/login", func(c fiber.Ctx) error {
  return c.Redirect().With("status", "Logged in successfully").To("/")
})

app.Get("/", func(c fiber.Ctx) error {
  // => Logged in successfully
  return c.SendString(c.Redirect().Message("status"))
})
```

#### WithInput

Send input data with `WithInput`, which stores them in a cookie.

It captures form, multipart, or query data depending on the request content type.

```go title="Signature"
func (r *Redirect) WithInput() *Redirect
```

```go title="Example"
// curl -X POST http://localhost:3000/login -d "name=John"
app.Post("/login", func(c fiber.Ctx) error {
  return c.Redirect().WithInput().Route("name")
})

app.Get("/name", func(c fiber.Ctx) error {
  // => John
  return c.SendString(c.Redirect().OldInput("name"))
}).Name("name")
```
---
id: services
title: 🧩 Services
sidebar_position: 9
---

Services wrap external dependencies. Register them in the application's state, and Fiber starts and stops them automatically—useful during development and testing.

After adding a service to the app configuration, Fiber starts it on launch and stops it during shutdown. Retrieve a service from state with `GetService` or `MustGetService` (see [State Management](./state)).

## Service Interface

The `Service` interface defines methods a service must implement.

### Definition

```go
type Service interface {
    // Start starts the service, returning an error if it fails.
    Start(ctx context.Context) error

    // String returns a string representation of the service.
    // It is used to print a human-readable name of the service in the startup message.
    String() string

    // State returns the current state of the service.
    State(ctx context.Context) (string, error)

    // Terminate terminates the service, returning an error if it fails.
    Terminate(ctx context.Context) error
}
```

## Service Methods

### Start

Starts the service. Fiber calls this when the application starts.

```go
func (s *SomeService) Start(ctx context.Context) error
```

### String

Returns a string representation of the service, used to print the service in the startup message.

```go
func (s *SomeService) String() string
```

### State

Reports the current state of the service for the startup message.

```go
func (s *SomeService) State(ctx context.Context) (string, error)
```

### Terminate

Stops the service after the application shuts down using a post-shutdown hook.

```go
func (s *SomeService) Terminate(ctx context.Context) error
```

## Comprehensive Examples

### Example: Adding a Service

This example demonstrates how to add a Redis store as a service to the application, backed by the Testcontainers Redis Go module.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/gofiber/fiber/v3"
    "github.com/redis/go-redis/v9"
    tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

const redisServiceName = "redis-store"

type redisService struct {
    ctr *tcredis.RedisContainer
}

// Start initializes and starts the service. It implements the [fiber.Service] interface.
func (s *redisService) Start(ctx context.Context) error {
    // start the service
    c, err := tcredis.Run(ctx, "redis:latest")
    if err != nil {
        return err
    }

    s.ctr = c
    return nil
}

// String returns a string representation of the service.
// It is used to print a human-readable name of the service in the startup message.
// It implements the [fiber.Service] interface.
func (s *redisService) String() string {
    return redisServiceName
}

// State returns the current state of the service.
// It implements the [fiber.Service] interface.
func (s *redisService) State(ctx context.Context) (string, error) {
    state, err := s.ctr.State(ctx)
    if err != nil {
        return "", fmt.Errorf("container state: %w", err)
    }

    return state.Status, nil
}

// Terminate stops and removes the service. It implements the [fiber.Service] interface.
func (s *redisService) Terminate(ctx context.Context) error {
    // stop the service
    return s.ctr.Terminate(ctx)
}

func main() {
    cfg := &fiber.Config{}

    // Initialize service.
    cfg.Services = append(cfg.Services, &redisService{})

    // Define a context provider for the services startup.
    // This is useful to cancel the startup of the services if the context is canceled.
    // Default is context.Background().
    startupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cfg.ServicesStartupContextProvider = func() context.Context {
        return startupCtx
    }

    // Define a context provider for the services shutdown.
    // This is useful to cancel the shutdown of the services if the context is canceled.
    // Default is context.Background().
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cfg.ServicesShutdownContextProvider = func() context.Context {
        return shutdownCtx
    }

    app := fiber.New(*cfg)

    ctx := context.Background()

    // Obtain the Redis service from the application's State.
    redisSrv, ok := fiber.GetService[*redisService](app.State(), redisServiceName)
    if !ok || redisSrv == nil {
        log.Printf("Redis service not found")
        return
    }

    // Obtain the connection string from the service.
    connString, err := redisSrv.ctr.ConnectionString(ctx)
    if err != nil {
        log.Printf("Could not get connection string: %v", err)
        return
    }

    // Parse the connection string to create a Redis client.
    options, err := redis.ParseURL(connString)
    if err != nil {
        log.Printf("failed to parse connection string: %s", err)
        return
    }

    // Initialize the Redis client.
    rdb := redis.NewClient(options)

    // Check the Redis connection.
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Could not connect to Redis: %v", err)
    }

    app.Listen(":3000")
}

```

### Example: Add a service with the Store middleware

This example shows how to use services with the Store middleware for dependency injection. It uses a Redis store backed by the Testcontainers Redis module.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/logger"
    redisStore "github.com/gofiber/storage/redis/v3"
    "github.com/redis/go-redis/v9"
    tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

const (
    redisServiceName = "redis-store"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type redisService struct {
    ctr *tcredis.RedisContainer
}

// Start initializes and starts the service. It implements the [fiber.Service] interface.
func (s *redisService) Start(ctx context.Context) error {
    // start the service
    c, err := tcredis.Run(ctx, "redis:latest")
    if err != nil {
        return err
    }

    s.ctr = c
    return nil
}

// String returns a string representation of the service.
// It is used to print a human-readable name of the service in the startup message.
// It implements the [fiber.Service] interface.
func (s *redisService) String() string {
    return redisServiceName
}

// State returns the current state of the service.
// It implements the [fiber.Service] interface.
func (s *redisService) State(ctx context.Context) (string, error) {
    state, err := s.ctr.State(ctx)
    if err != nil {
        return "", fmt.Errorf("container state: %w", err)
    }

    return state.Status, nil
}

// Terminate stops and removes the service. It implements the [fiber.Service] interface.
func (s *redisService) Terminate(ctx context.Context) error {
    // stop the service
    return s.ctr.Terminate(ctx)
}

func main() {
    cfg := &fiber.Config{}

    // Initialize service.
    cfg.Services = append(cfg.Services, &redisService{})

    // Define a context provider for the services startup.
    // This is useful to cancel the startup of the services if the context is canceled.
    // Default is context.Background().
    startupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cfg.ServicesStartupContextProvider = func() context.Context {
        return startupCtx
    }

    // Define a context provider for the services shutdown.
    // This is useful to cancel the shutdown of the services if the context is canceled.
    // Default is context.Background().
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cfg.ServicesShutdownContextProvider = func() context.Context {
        return shutdownCtx
    }

    app := fiber.New(*cfg)

    // Initialize default config
    app.Use(logger.New())

    ctx := context.Background()

    // Obtain the Redis service from the application's State.
    redisSrv, ok := fiber.GetService[*redisService](app.State(), redisServiceName)
    if !ok || redisSrv == nil {
        log.Printf("Redis service not found")
        return
    }

    // Obtain the connection string from the service.
    connString, err := redisSrv.ctr.ConnectionString(ctx)
    if err != nil {
        log.Printf("Could not get connection string: %v", err)
        return
    }

    // define a GoFiber session store, backed by the Redis service
    store := redisStore.New(redisStore.Config{
        URL: connString,
    })

    app.Post("/user/create", func(c fiber.Ctx) error {
        var user User
        if err := c.Bind().JSON(&user); err != nil {
            return c.Status(fiber.StatusBadRequest).SendString(err.Error())
        }

        json, err := json.Marshal(user)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
        }

        // Save the user to the database.
        err = store.Set(user.Email, json, time.Hour*24)
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
        }

        return c.JSON(user)
    })

    app.Get("/user/:id", func(c fiber.Ctx) error {
        id := c.Params("id")

        user, err := store.Get(id)
        if err == redis.Nil {
            return c.Status(fiber.StatusNotFound).SendString("User not found")
        } else if err != nil {
            return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
        }

        return c.JSON(string(user))
    })

    app.Listen(":3000")
}

```
---
id: state
title: 🗂️ State Management
sidebar_position: 8
---

State management provides a global key–value store for application dependencies and runtime data. The store is shared across the entire application and persists between requests. It's commonly used to store [Services](../api/services), which you can retrieve with the `GetService` or `MustGetService` functions.

:::warning
When prefork is enabled, each worker process has an independent state store, meaning state is not shared between them.
:::

## SharedState (Prefork-safe)

For data that must be shared across prefork workers or multiple app processes, use `app.SharedState()` backed by `fiber.Storage`.

Configure storage in `fiber.Config`:

```go
app := fiber.New(fiber.Config{
    AppName:           "billing-api",
    SharedStorage:     redisStorage, // any implementation of fiber.Storage
    SharedStatePrefix: "billing-shared-", // optional
})
```

If `SharedStatePrefix` is empty, Fiber derives a default namespace and includes `AppName` (when set) to reduce collisions between apps/services.

MsgPack and CBOR helpers require the corresponding `Config` encoders/decoders to be configured. If they are unavailable, the helper methods return an error instead of panicking.

:::warning Memory storage caveat
`SharedState` is only cross-worker / cross-process when the configured `SharedStorage` backend is shared.

If you use an in-memory backend (for example memory storage), data remains process-local. In prefork mode, each worker process has its own independent in-memory store.
:::

### SharedState Methods

```go title="Signature"
func (app *App) SharedState() *SharedState

func (s *SharedState) Set(key string, val []byte, ttl time.Duration) error
func (s *SharedState) SetWithContext(ctx context.Context, key string, val []byte, ttl time.Duration) error

func (s *SharedState) Get(key string) (val []byte, found bool, err error)
func (s *SharedState) GetWithContext(ctx context.Context, key string) (val []byte, found bool, err error)

func (s *SharedState) SetJSON(key string, v any, ttl time.Duration) error
func (s *SharedState) SetJSONWithContext(ctx context.Context, key string, v any, ttl time.Duration) error

func (s *SharedState) GetJSON(key string, out any) (raw []byte, found bool, err error)
func (s *SharedState) GetJSONWithContext(ctx context.Context, key string, out any) (raw []byte, found bool, err error)

func (s *SharedState) SetMsgPack(key string, v any, ttl time.Duration) error
func (s *SharedState) SetMsgPackWithContext(ctx context.Context, key string, v any, ttl time.Duration) error

func (s *SharedState) GetMsgPack(key string, out any) (raw []byte, found bool, err error)
func (s *SharedState) GetMsgPackWithContext(ctx context.Context, key string, out any) (raw []byte, found bool, err error)

func (s *SharedState) SetCBOR(key string, v any, ttl time.Duration) error
func (s *SharedState) SetCBORWithContext(ctx context.Context, key string, v any, ttl time.Duration) error

func (s *SharedState) GetCBOR(key string, out any) (raw []byte, found bool, err error)
func (s *SharedState) GetCBORWithContext(ctx context.Context, key string, out any) (raw []byte, found bool, err error)

func (s *SharedState) SetXML(key string, v any, ttl time.Duration) error
func (s *SharedState) SetXMLWithContext(ctx context.Context, key string, v any, ttl time.Duration) error

func (s *SharedState) GetXML(key string, out any) (raw []byte, found bool, err error)
func (s *SharedState) GetXMLWithContext(ctx context.Context, key string, out any) (raw []byte, found bool, err error)

func (s *SharedState) Delete(key string) error
func (s *SharedState) DeleteWithContext(ctx context.Context, key string) error

func (s *SharedState) Has(key string) (bool, error)
func (s *SharedState) HasWithContext(ctx context.Context, key string) (bool, error)

func (s *SharedState) Reset() error
func (s *SharedState) ResetWithContext(ctx context.Context) error
func (s *SharedState) Close() error
```

### SharedState Example

```go
type SessionSnapshot struct {
    UserID    string    `json:"user_id"`
    UpdatedAt time.Time `json:"updated_at"`
}

app.Post("/sessions/:id", func(c fiber.Ctx) error {
    key := "session:" + c.Params("id")
    value := SessionSnapshot{
        UserID:    c.Params("id"),
        UpdatedAt: time.Now().UTC(),
    }

    if err := app.SharedState().SetJSON(key, value, 30*time.Minute); err != nil {
        return err
    }

    return c.SendStatus(fiber.StatusAccepted)
})

app.Get("/sessions/:id", func(c fiber.Ctx) error {
    key := "session:" + c.Params("id")
    var snapshot SessionSnapshot

    _, found, err := app.SharedState().GetJSON(key, &snapshot)
    if err != nil {
        return err
    }
    if !found {
        return c.SendStatus(fiber.StatusNotFound)
    }

    return c.JSON(snapshot)
})
```

### SharedState with Context (timeouts/cancellation)

```go
ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
defer cancel()

err := app.SharedState().SetJSONWithContext(ctx, "job:42", fiber.Map{
    "status": "queued",
}, 2*time.Minute)
if err != nil {
    // timeout, cancellation, storage error, or JSON serialization error
}
```

## State Type

`State` is a key–value store built on top of `sync.Map` to ensure safe concurrent access. It allows storage and retrieval of dependencies and configurations in a Fiber application as well as thread–safe access to runtime data.

### Definition

```go
// State is a key–value store for Fiber's app, used as a global storage for the app's dependencies.
// It is a thread–safe implementation of a map[string]any, using sync.Map.
type State struct {
    dependencies sync.Map
}
```

## Methods on State

### Set

Set adds or updates a key–value pair in the State.

```go
// Set adds or updates a key–value pair in the State.
func (s *State) Set(key string, value any)
```

**Usage Example:**

```go
app.State().Set("appName", "My Fiber App")
```

### Get

Get retrieves a value from the State.

```go title="Signature"
func (s *State) Get(key string) (any, bool)
```

**Usage Example:**

```go
value, ok := app.State().Get("appName")
if ok {
    fmt.Println("App Name:", value)
}
```

### MustGet

MustGet retrieves a value from the State and panics if the key is not found.

```go title="Signature"
func (s *State) MustGet(key string) any
```

**Usage Example:**

```go
appName := app.State().MustGet("appName")
fmt.Println("App Name:", appName)
```

### Has

Has checks if a key exists in the State.

```go title="Signature"
func (s *State) Has(key string) bool
```

**Usage Example:**

```go
if app.State().Has("appName") {
    fmt.Println("App Name is set.")
}
```

### Delete

Delete removes a key–value pair from the State.

```go title="Signature"
func (s *State) Delete(key string)
```

**Usage Example:**

```go
app.State().Delete("obsoleteKey")
```

### Reset

Reset removes all keys from the State, including those related to Services.

```go title="Signature"
func (s *State) Reset()
```

**Usage Example:**

```go
app.State().Reset()
```

### Keys

Keys returns a slice containing all keys present in the State.

```go title="Signature"
func (s *State) Keys() []string
```

**Usage Example:**

```go
keys := app.State().Keys()
fmt.Println("State Keys:", keys)
```

### Len

Len returns the number of keys in the State.

```go
// Len returns the number of keys in the State.
func (s *State) Len() int
```

**Usage Example:**

```go
fmt.Printf("Total State Entries: %d\n", app.State().Len())
```

### GetString

GetString retrieves a string value from the State. It returns the string and a boolean indicating a successful type assertion.

```go title="Signature"
func (s *State) GetString(key string) (string, bool)
```

**Usage Example:**

```go
if appName, ok := app.State().GetString("appName"); ok {
    fmt.Println("App Name:", appName)
}
```

### GetInt

GetInt retrieves an integer value from the State. It returns the int and a boolean indicating a successful type assertion.

```go title="Signature"
func (s *State) GetInt(key string) (int, bool)
```

**Usage Example:**

```go
if count, ok := app.State().GetInt("userCount"); ok {
    fmt.Printf("User Count: %d\n", count)
}
```

### GetBool

GetBool retrieves a boolean value from the State. It returns the bool and a boolean indicating a successful type assertion.

```go title="Signature"
func (s *State) GetBool(key string) (value, bool)
```

**Usage Example:**

```go
if debug, ok := app.State().GetBool("debugMode"); ok {
    fmt.Printf("Debug Mode: %v\n", debug)
}
```

### GetFloat64

GetFloat64 retrieves a float64 value from the State. It returns the float64 and a boolean indicating a successful type assertion.

```go title="Signature"
func (s *State) GetFloat64(key string) (float64, bool)
```

**Usage Example:**

```go title="Signature"
if ratio, ok := app.State().GetFloat64("scalingFactor"); ok {
    fmt.Printf("Scaling Factor: %f\n", ratio)
}
```

### GetUint

GetUint retrieves a `uint` value from the State.

```go title="Signature"
func (s *State) GetUint(key string) (uint, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUint("maxConnections"); ok {
    fmt.Printf("Max Connections: %d\n", val)
}
```

### GetInt8

GetInt8 retrieves an `int8` value from the State.

```go title="Signature"
func (s *State) GetInt8(key string) (int8, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetInt8("threshold"); ok {
    fmt.Printf("Threshold: %d\n", val)
}
```

### GetInt16

GetInt16 retrieves an `int16` value from the State.

```go title="Signature"
func (s *State) GetInt16(key string) (int16, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetInt16("minValue"); ok {
    fmt.Printf("Minimum Value: %d\n", val)
}
```

### GetInt32

GetInt32 retrieves an `int32` value from the State.

```go title="Signature"
func (s *State) GetInt32(key string) (int32, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetInt32("portNumber"); ok {
    fmt.Printf("Port Number: %d\n", val)
}
```

### GetInt64

GetInt64 retrieves an `int64` value from the State.

```go title="Signature"
func (s *State) GetInt64(key string) (int64, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetInt64("fileSize"); ok {
    fmt.Printf("File Size: %d\n", val)
}
```

### GetUint8

GetUint8 retrieves a `uint8` value from the State.

```go title="Signature"
func (s *State) GetUint8(key string) (uint8, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUint8("byteValue"); ok {
    fmt.Printf("Byte Value: %d\n", val)
}
```

### GetUint16

GetUint16 retrieves a `uint16` value from the State.

```go title="Signature"
func (s *State) GetUint16(key string) (uint16, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUint16("limit"); ok {
    fmt.Printf("Limit: %d\n", val)
}
```

### GetUint32

GetUint32 retrieves a `uint32` value from the State.

```go title="Signature"
func (s *State) GetUint32(key string) (uint32, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUint32("timeout"); ok {
    fmt.Printf("Timeout: %d\n", val)
}
```

### GetUint64

GetUint64 retrieves a `uint64` value from the State.

```go title="Signature"
func (s *State) GetUint64(key string) (uint64, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUint64("maxSize"); ok {
    fmt.Printf("Max Size: %d\n", val)
}
```

### GetUintptr

GetUintptr retrieves a `uintptr` value from the State.

```go title="Signature"
func (s *State) GetUintptr(key string) (uintptr, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetUintptr("pointerValue"); ok {
    fmt.Printf("Pointer Value: %d\n", val)
}
```

### GetFloat32

GetFloat32 retrieves a `float32` value from the State.

```go title="Signature"
func (s *State) GetFloat32(key string) (float32, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetFloat32("scalingFactor32"); ok {
    fmt.Printf("Scaling Factor (float32): %f\n", val)
}
```

### GetComplex64

GetComplex64 retrieves a `complex64` value from the State.

```go title="Signature"
func (s *State) GetComplex64(key string) (complex64, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetComplex64("complexVal"); ok {
    fmt.Printf("Complex Value (complex64): %v\n", val)
}
```

### GetComplex128

GetComplex128 retrieves a `complex128` value from the State.

```go title="Signature"
func (s *State) GetComplex128(key string) (complex128, bool)
```

**Usage Example:**

```go
if val, ok := app.State().GetComplex128("complexVal128"); ok {
    fmt.Printf("Complex Value (complex128): %v\n", val)
}
```

## Generic Functions

Fiber provides generic functions to retrieve state values with type safety and fallback options.

### GetState

GetState retrieves a value from the State and casts it to the desired type. It returns the cast value and a boolean indicating if the cast was successful.

```go title="Signature"
func GetState[T any](s *State, key string) (T, bool)
```

**Usage Example:**

```go
// Retrieve an integer value safely.
userCount, ok := GetState[int](app.State(), "userCount")
if ok {
    fmt.Printf("User Count: %d\n", userCount)
}
```

### MustGetState

MustGetState retrieves a value from the State and casts it to the desired type. It panics if the key is not found or if the type assertion fails.

```go title="Signature"
func MustGetState[T any](s *State, key string) T
```

**Usage Example:**

```go
// Retrieve the value or panic if it is not present.
config := MustGetState[string](app.State(), "configFile")
fmt.Println("Config File:", config)
```

### GetStateWithDefault

GetStateWithDefault retrieves a value from the State, casting it to the desired type. If the key is not present, it returns the provided default value.

```go title="Signature"
func GetStateWithDefault[T any](s *State, key string, defaultVal T) T
```

**Usage Example:**

```go
// Retrieve a value with a fallback.
requestCount := GetStateWithDefault[int](app.State(), "requestCount", 0)
fmt.Printf("Request Count: %d\n", requestCount)
```

### GetService

GetService retrieves a Service from the State and casts it to the desired type. It returns the cast value and a boolean indicating if the cast was successful.

```go title="Signature"
func GetService[T Service](s *State, key string) (T, bool) {
```

**Usage Example:**

```go
if srv, ok := fiber.GetService[*redisService](app.State(), "someService")
    fmt.Printf("Some Service: %s\n", srv.String())
}
```

### MustGetService

MustGetService retrieves a Service from the State and casts it to the desired type. It panics if the key is not found or if the type assertion fails.

```go title="Signature"
func MustGetService[T Service](s *State, key string) T
```

**Usage Example:**

```go
srv := fiber.MustGetService[*SomeService](app.State(), "someService")
```

## Comprehensive Examples

### Example: Request Counter

This example demonstrates how to track the number of requests using the State.

```go
package main

import (
    "fmt"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    // Initialize state with a counter.
    app.State().Set("requestCount", 0)

    // Middleware: Increase counter for every request.
    app.Use(func(c fiber.Ctx) error {
        count, _ := c.App().State().GetInt("requestCount")
        app.State().Set("requestCount", count+1)
        return c.Next()
    })

    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString("Hello World!")
    })

    app.Get("/stats", func(c fiber.Ctx) error {
        count, _ := c.App().State().Get("requestCount")
        return c.SendString(fmt.Sprintf("Total requests: %d", count))
    })

    app.Listen(":3000")
}
```

### Example: Environment–Specific Configuration

This example shows how to configure different settings based on the environment.

```go
package main

import (
    "os"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    // Determine environment.
    environment := os.Getenv("ENV")
    if environment == "" {
        environment = "development"
    }
    app.State().Set("environment", environment)

    // Set environment-specific configurations.
    if environment == "development" {
        app.State().Set("apiUrl", "http://localhost:8080/api")
        app.State().Set("debug", true)
    } else {
        app.State().Set("apiUrl", "https://api.production.com")
        app.State().Set("debug", false)
    }

    app.Get("/config", func(c fiber.Ctx) error {
        config := map[string]any{
            "environment": environment,
            "apiUrl":      fiber.GetStateWithDefault(c.App().State(), "apiUrl", ""),
            "debug":       fiber.GetStateWithDefault(c.App().State(), "debug", false),
        }
        return c.JSON(config)
    })

    app.Listen(":3000")
}
```

### Example: Dependency Injection with State Management

This example demonstrates how to use the State for dependency injection in a Fiber application.

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/gofiber/fiber/v3"
    "github.com/redis/go-redis/v9"
)

type User struct {
    ID    int    `query:"id"`
    Name  string `query:"name"`
    Email string `query:"email"`
}

func main() {
    app := fiber.New()
    ctx := context.Background()

    // Initialize Redis client.
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    // Check the Redis connection.
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Could not connect to Redis: %v", err)
    }

    // Inject the Redis client into Fiber's State for dependency injection.
    app.State().Set("redis", rdb)

    app.Get("/user/create", func(c fiber.Ctx) error {
        var user User
        if err := c.Bind().Query(&user); err != nil {
            return c.Status(fiber.StatusBadRequest).SendString(err.Error())
        }

        // Retrieve the Redis client from the global state.
        rdb, ok := fiber.GetState[*redis.Client](c.App().State(), "redis")
        if !ok {
            return c.Status(fiber.StatusInternalServerError).SendString("Redis client not found")
        }

        // Save the user to the database.
        key := fmt.Sprintf("user:%d", user.ID)
        err := rdb.HSet(ctx, key, "name", user.Name, "email", user.Email).Err()
        if err != nil {
            return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
        }

        return c.JSON(user)
    })

    app.Get("/user/:id", func(c fiber.Ctx) error {
        id := c.Params("id")

        rdb, ok := fiber.GetState[*redis.Client](c.App().State(), "redis")
        if !ok {
            return c.Status(fiber.StatusInternalServerError).SendString("Redis client not found")
        }

        key := fmt.Sprintf("user:%s", id)
        user, err := rdb.HGetAll(ctx, key).Result()
        if err == redis.Nil {
            return c.Status(fiber.StatusNotFound).SendString("User not found")
        } else if err != nil {
            return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
        }

        return c.JSON(user)
    })

    app.Listen(":3000")
}
```

---
id: retry
---

# Retry Addon

The Retry addon for [Fiber](https://github.com/gofiber/fiber) retries failed network operations using exponential
backoff with jitter. It repeatedly invokes a function until it succeeds or the maximum number of attempts is
exhausted. Jitter at each step breaks client synchronization and helps avoid collisions. If all attempts fail, the
addon returns an error.

## Table of Contents

- [Signatures](#signatures)
- [Examples](#examples)
- [Default Config](#default-config)
- [Custom Config](#custom-config)
- [Config](#config)
- [Default Config Example](#default-config-example)

## Signatures

```go
func NewExponentialBackoff(config ...retry.Config) *retry.ExponentialBackoff
```

## Examples

```go
package main

import (
    "fmt"

    "github.com/gofiber/fiber/v3/addon/retry"
    "github.com/gofiber/fiber/v3/client"
)

func main() {
    expBackoff := retry.NewExponentialBackoff(retry.Config{})

    // Local variables used inside Retry
    var resp *client.Response
    var err error

    // Retry a network request and return an error to signal another attempt
    err = expBackoff.Retry(func() error {
        client := client.New()
        resp, err = client.Get("https://gofiber.io")
        if err != nil {
            return fmt.Errorf("GET gofiber.io failed: %w", err)
        }
        if resp.StatusCode() != 200 {
            return fmt.Errorf("GET gofiber.io did not return 200 OK")
        }
        return nil
    })

    // If all retries failed, panic
    if err != nil {
        panic(err)
    }
    fmt.Printf("GET gofiber.io succeeded with status code %d\n", resp.StatusCode())
}
```

## Default Config

```go
retry.NewExponentialBackoff()
```

## Custom Config

```go
retry.NewExponentialBackoff(retry.Config{
    InitialInterval: 2 * time.Second,
    MaxBackoffTime:  64 * time.Second,
    Multiplier:      2.0,
    MaxRetryCount:   15,
})
```

## Config

```go
// Config defines the config for addon.
type Config struct {
    // InitialInterval defines the initial time interval for backoff algorithm.
    //
    // Optional. Default: 1 * time.Second
    InitialInterval time.Duration

    // MaxBackoffTime defines maximum time duration for backoff algorithm. When
    // the algorithm is reached this time, rest of the retries will be maximum
    // 32 seconds.
    //
    // Optional. Default: 32 * time.Second
    MaxBackoffTime time.Duration

    // Multiplier defines multiplier number of the backoff algorithm.
    //
    // Optional. Default: 2.0
    Multiplier float64

    // MaxRetryCount defines maximum retry count for the backoff algorithm.
    //
    // Optional. Default: 10
    MaxRetryCount int
}
```

## Default Config Example

```go
// DefaultConfig is the default config for retry.
var DefaultConfig = Config{
    InitialInterval: 1 * time.Second,
    MaxBackoffTime:  32 * time.Second,
    Multiplier:      2.0,
    MaxRetryCount:   10,
    currentInterval: 1 * time.Second,
}
```

---
id: examples
title: 🍳 Examples
description: >-
  Client usage examples.
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Basic Auth

Clients send credentials via the `Authorization` header, while the server
stores hashed passwords as shown in the middleware example.

<Tabs>
<TabItem value="client" label="Client">

```go
package main

import (
    "encoding/base64"
    "fmt"

    "github.com/gofiber/fiber/v3/client"
)

func main() {
    cc := client.New()

    out := base64.StdEncoding.EncodeToString([]byte("john:doe"))
    resp, err := cc.Get("http://localhost:3000", client.Config{
        Header: map[string]string{
            "Authorization": "Basic " + out,
        },
    })
    if err != nil {
        panic(err)
    }

    fmt.Print(string(resp.Body()))
}
```

</TabItem>
<TabItem value="server" label="Server">

```go
package main

import (
    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/basicauth"
)

func main() {
    app := fiber.New()
    app.Use(
        basicauth.New(basicauth.Config{
            Users: map[string]string{
                // "doe" hashed using SHA-256
                "john": "{SHA256}eZ75KhGvkY4/t0HfQpNPO1aO0tk6wd908bjUGieTKm8=",
            },
        }),
    )

    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString("Hello, World!")
    })

    app.Listen(":3000")
}
```

</TabItem>
</Tabs>

## TLS

<Tabs>
<TabItem value="client" label="Client">

```go
package main

import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "os"

    "github.com/gofiber/fiber/v3/client"
)

func main() {
    cc := client.New()

    certPool, err := x509.SystemCertPool()
    if err != nil {
        panic(err)
    }

    cert, err := os.ReadFile("ssl.cert")
    if err != nil {
        panic(err)
    }

    certPool.AppendCertsFromPEM(cert)
    cc.SetTLSConfig(&tls.Config{
        RootCAs: certPool,
    })

    resp, err := cc.Get("https://localhost:3000")
    if err != nil {
        panic(err)
    }

    fmt.Print(string(resp.Body()))
}
```

</TabItem>
<TabItem value="server" label="Server">

```go
package main

import (
    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New()

    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString("Hello, World!")
    })

    err := app.Listen(":3000", fiber.ListenConfig{
        CertFile:    "ssl.cert",
        CertKeyFile: "ssl.key",
    })
    if err != nil {
        panic(err)
    }
}
```

</TabItem>
</Tabs>

## Reusing fasthttp transports

The Fiber client can wrap existing `fasthttp` clients so that you can reuse
connection pools, custom dialers, or load-balancing logic that is already tuned
for your infrastructure.

### HostClient

```go
package main

import (
    "log"
    "time"

    "github.com/gofiber/fiber/v3/client"
    "github.com/valyala/fasthttp"
)

func main() {
    hc := &fasthttp.HostClient{
        Addr:              "api.internal:443",
        IsTLS:             true,
        MaxConnDuration:   30 * time.Second,
        MaxIdleConnDuration: 10 * time.Second,
    }

    cc := client.NewWithHostClient(hc)

    resp, err := cc.Get("https://api.internal:443/status")
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("status=%d body=%s", resp.StatusCode(), resp.Body())
}
```

### LBClient

```go
package main

import (
    "log"
    "time"

    "github.com/gofiber/fiber/v3/client"
    "github.com/valyala/fasthttp"
)

func main() {
    lb := &fasthttp.LBClient{
        Timeout: 2 * time.Second,
        Clients: []fasthttp.BalancingClient{
            &fasthttp.HostClient{Addr: "edge-1.internal:8080"},
            &fasthttp.HostClient{Addr: "edge-2.internal:8080"},
        },
    }

    cc := client.NewWithLBClient(lb)

    // Per-request overrides such as redirects, retries, TLS, and proxy dialers
    // are shared across every host client managed by the load balancer.
    resp, err := cc.Get("http://service.internal/api")
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("status=%d body=%s", resp.StatusCode(), resp.Body())
}
```

## Cookie jar

The client can store and reuse cookies between requests by attaching a cookie jar.

### Request

```go
func main() {
    jar := client.AcquireCookieJar()
    defer client.ReleaseCookieJar(jar)

    cc := client.New()
    cc.SetCookieJar(jar)

    jar.SetKeyValueBytes("httpbin.org", []byte("john"), []byte("doe"))

    resp, err := cc.Get("https://httpbin.org/cookies")
    if err != nil {
        panic(err)
    }

    fmt.Println(string(resp.Body()))
}
```

<details>
<summary>Click here to see the result</summary>

```json
{
  "cookies": {
    "john": "doe"
  }
}
```

</details>

### Response

Read cookies set by the server directly from the jar.

```go
func main() {
    jar := client.AcquireCookieJar()
    defer client.ReleaseCookieJar(jar)

    cc := client.New()
    cc.SetCookieJar(jar)

    _, err := cc.Get("https://httpbin.org/cookies/set/john/doe")
    if err != nil {
        panic(err)
    }

    uri := fasthttp.AcquireURI()
    defer fasthttp.ReleaseURI(uri)

    uri.SetHost("httpbin.org")
    uri.SetPath("/cookies")
    fmt.Println(jar.Get(uri))
}
```

<details>
<summary>Click here to see the result</summary>

```plaintext
[john=doe; path=/]
```

</details>

### Response (follow-up request)

```go
func main() {
    jar := client.AcquireCookieJar()
    defer client.ReleaseCookieJar(jar)

    cc := client.New()
    cc.SetCookieJar(jar)

    _, err := cc.Get("https://httpbin.org/cookies/set/john/doe")
    if err != nil {
        panic(err)
    }

    resp, err := cc.Get("https://httpbin.org/cookies")
    if err != nil {
        panic(err)
    }

    fmt.Println(resp.String())
}
```

<details>
<summary>Click here to see the result</summary>

```json
{
  "cookies": {
    "john": "doe"
  }
}
```

</details>

---
id: hooks
title: 🎣 Hooks
description: >-
  Hooks are used to manipulate the request/response process of the Fiber client.
sidebar_position: 4
---

Hooks let you intercept and modify the request or response flow of the Fiber client. They are useful for:

- Changing request parameters (e.g., URL, headers) before sending the request.
- Logging request and response details.
- Integrating complex tracing or monitoring tools.
- Handling authentication, retries, or other custom logic.

There are two kinds of hooks:

## Request Hooks

**Request hooks** are functions executed before the HTTP request is sent. They follow the signature:

```go
type RequestHook func(*Client, *Request) error
```

A request hook receives both the `Client` and the `Request` objects, allowing you to modify the request before it leaves your application. For example, you could:

- Change the host URL.
- Log request details (method, URL, headers).
- Add or modify headers or query parameters.
- Intercept and apply custom authentication logic.

**Example:**

```go
type Repository struct {
    Name        string `json:"name"`
    FullName    string `json:"full_name"`
    Description string `json:"description"`
    Homepage    string `json:"homepage"`

    Owner struct {
        Login string `json:"login"`
    } `json:"owner"`
}

func main() {
    cc := client.New()

    // Add a request hook that modifies the request URL before sending.
    cc.AddRequestHook(func(c *client.Client, r *client.Request) error {
        r.SetURL("https://api.github.com/" + r.URL())
        return nil
    })

    resp, err := cc.Get("repos/gofiber/fiber")
    if err != nil {
        panic(err)
    }

    var repo Repository
    if err := resp.JSON(&repo); err != nil {
        panic(err)
    }

    fmt.Printf("Status code: %d\n", resp.StatusCode())
    fmt.Printf("Repository: %s\n", repo.FullName)
    fmt.Printf("Description: %s\n", repo.Description)
    fmt.Printf("Homepage: %s\n", repo.Homepage)
    fmt.Printf("Owner: %s\n", repo.Owner.Login)
    fmt.Printf("Name: %s\n", repo.Name)
    fmt.Printf("Full Name: %s\n", repo.FullName)
}
```

<details>
<summary>Click here to see the result</summary>

```plaintext
Status code: 200
Repository: gofiber/fiber
Description: ⚡️ Express inspired web framework written in Go
Homepage: https://gofiber.io
Owner: gofiber
Name: fiber
Full Name: gofiber/fiber
```

</details>

### Built-in Request Hooks

Fiber includes built-in request hooks:

- **parserRequestURL**: Normalizes and customizes the URL based on path and query parameters. Required for `PathParam` and `QueryParam` methods.
- **parserRequestHeader**: Sets request headers, cookies, content type, referer, and user agent based on client and request properties.
- **parserRequestBody**: Automatically serializes the request body (JSON, XML, form, file uploads, etc.).

:::info
If a request hook returns an error, Fiber stops the request and returns the error immediately.
:::

**Example with Multiple Hooks:**

```go
func main() {
    cc := client.New()

    cc.AddRequestHook(func(c *client.Client, r *client.Request) error {
        fmt.Println("Hook 1")
        return errors.New("error")
    })

    cc.AddRequestHook(func(c *client.Client, r *client.Request) error {
        fmt.Println("Hook 2")
        return nil
    })

    _, err := cc.Get("https://example.com/")
    if err != nil {
        panic(err)
    }
}
```

<details>
<summary>Click here to see the result</summary>

```shell
Hook 1.
panic: error

goroutine 1 [running]:
main.main()
        main.go:25 +0xaa
exit status 2
```

</details>

## Response Hooks

**Response hooks** are functions executed after the HTTP response is received. They follow the signature:

```go
type ResponseHook func(*Client, *Response, *Request) error
```

A response hook receives the `Client`, `Response`, and `Request` objects, allowing you to inspect and modify the response or perform additional actions such as logging, tracing, or processing response data.

**Example:**

```go
func main() {
    cc := client.New()

    cc.AddResponseHook(func(c *client.Client, resp *client.Response, req *client.Request) error {
        fmt.Printf("Response Status Code: %d\n", resp.StatusCode())
        fmt.Printf("HTTP protocol: %s\n\n", resp.Protocol())

        fmt.Println("Response Headers:")
       for key, value := range resp.RawResponse.Header.All() {
           fmt.Printf("%s: %s\n", key, value)
       }

        return nil
    })

    _, err := cc.Get("https://example.com/")
    if err != nil {
        panic(err)
    }
}
```

<details>
<summary>Click here to see the result</summary>

```plaintext
Response Status Code: 200
HTTP protocol: HTTP/1.1

Response Headers:
Content-Length: 1256
Content-Type: text/html; charset=UTF-8
Server: ECAcc (dcd/7D5A)
Age: 216114
Cache-Control: max-age=604800
Date: Fri, 10 May 2024 10:49:10 GMT
Etag: "3147526947+gzip+ident"
Expires: Fri, 17 May 2024 10:49:10 GMT
Last-Modified: Thu, 17 Oct 2019 07:18:26 GMT
Vary: Accept-Encoding
X-Cache: HIT
```

</details>

### Built-in Response Hooks

Fiber includes built-in response hooks:

- **parserResponseCookie**: Parses cookies from the response and stores them in the response object and cookie jar if available.
- **logger**: Logs information about the raw request and response. It uses the `log.CommonLogger` interface.

:::info
If a response hook returns an error, Fiber skips the remaining hooks and returns that error.
:::

**Example with Multiple Response Hooks:**

```go
func main() {
    cc := client.New()

    cc.AddResponseHook(func(c *client.Client, r1 *client.Response, r2 *client.Request) error {
        fmt.Println("Hook 1")
        return nil
    })

    cc.AddResponseHook(func(c *client.Client, r1 *client.Response, r2 *client.Request) error {
        fmt.Println("Hook 2")
        return errors.New("error")
    })

    cc.AddResponseHook(func(c *client.Client, r1 *client.Response, r2 *client.Request) error {
        fmt.Println("Hook 3")
        return nil
    })

    _, err := cc.Get("https://example.com/")
    if err != nil {
        panic(err)
    }
}
```

<details>
<summary>Click here to see the result</summary>

```shell
Hook 1
Hook 2
panic: error

goroutine 1 [running]:
main.main()
        main.go:30 +0xd6
exit status 2
```

</details>

## Hook Execution Order

Hooks run in FIFO order (first in, first out), so they're executed in the order you add them. Keep this in mind when adding multiple hooks, as the order can affect the outcome.

**Example:**

```go
func main() {
    cc := client.New()

    cc.AddRequestHook(func(c *client.Client, r *client.Request) error {
        fmt.Println("Hook 1")
        return nil
    })

    cc.AddRequestHook(func(c *client.Client, r *client.Request) error {
        fmt.Println("Hook 2")
        return nil
    })

    _, err := cc.Get("https://example.com/")
    if err != nil {
        panic(err)
    }
}
```

<details>
<summary>Click here to see the result</summary>

```plaintext
Hook 1
Hook 2
```

</details>

---
id: request
title: 📤 Request
description: >-
  Request methods of Gofiber HTTP client.
sidebar_position: 2
---

The `Request` struct in Fiber's HTTP client represents an HTTP request. It encapsulates the data required to send a request, including:

- **URL**: The endpoint to which the request is sent.
- **Method**: The HTTP method (GET, POST, PUT, DELETE, etc.).
- **Headers**: Key-value pairs that provide additional information about the request or guide how the response should be processed.
- **Body**: The data sent with the request, commonly used with methods like POST and PUT.
- **Query Parameters**: Parameters appended to the URL to pass additional data or modify the request's behavior.

This structure is designed to be both flexible and efficient, allowing you to easily build and modify HTTP requests as needed.

```go
type Request struct {
    url       string
    method    string
    userAgent string
    boundary  string
    referer   string
    ctx       context.Context
    header    *Header
    params    *QueryParam
    cookies   *Cookie
    path      *PathParam

    timeout      time.Duration
    maxRedirects int

    client *Client

    body     any
    formData *FormData
    files    []*File
    bodyType bodyType

    RawRequest *fasthttp.Request
}
```

## REST Methods

### Get

**Get** sends a GET request to the specified URL. It sets the URL and HTTP method, then dispatches the request to the server.

```go title="Signature"
func (r *Request) Get(url string) (*Response, error)
```

### Post

**Post** sends a POST request. It sets the URL and method to POST, then sends the request.

```go title="Signature"
func (r *Request) Post(url string) (*Response, error)
```

### Put

**Put** sends a PUT request. It sets the URL and method to PUT, then sends the request.

```go title="Signature"
func (r *Request) Put(url string) (*Response, error)
```

### Patch

**Patch** sends a PATCH request. It sets the URL and method to PATCH, then sends the request.

```go title="Signature"
func (r *Request) Patch(url string) (*Response, error)
```

### Delete

**Delete** sends a DELETE request. It sets the URL and method to DELETE, then sends the request.

```go title="Signature"
func (r *Request) Delete(url string) (*Response, error)
```

### Head

**Head** sends a HEAD request. It sets the URL and method to HEAD, then sends the request.

```go title="Signature"
func (r *Request) Head(url string) (*Response, error)
```

### Options

**Options** sends an OPTIONS request. It sets the URL and method to OPTIONS, then sends the request.

```go title="Signature"
func (r *Request) Options(url string) (*Response, error)
```

### Custom

**Custom** sends a request using a custom HTTP method. For example, you can use this to send a TRACE or CONNECT request.

```go title="Signature"
func (r *Request) Custom(url, method string) (*Response, error)
```

## AcquireRequest

**AcquireRequest** returns a new pooled `Request`. Call `ReleaseRequest` when you're finished to return it to the pool and limit allocations.

```go title="Signature"
func AcquireRequest() *Request
```

## ReleaseRequest

**ReleaseRequest** returns the `Request` to the pool. Do not use it after releasing; doing so may cause data races.

```go title="Signature"
func ReleaseRequest(req *Request)
```

## Method

**Method** returns the current HTTP method set for the request.

```go title="Signature"
func (r *Request) Method() string
```

## SetMethod

**SetMethod** sets the HTTP method for the `Request` object. Typically, you should use the specialized request methods (`Get`, `Post`, etc.) instead of calling `SetMethod` directly.

```go title="Signature"
func (r *Request) SetMethod(method string) *Request
```

## URL

**URL** returns the current URL set in the `Request`.

```go title="Signature"
func (r *Request) URL() string
```

## SetURL

**SetURL** sets the URL for the `Request` object.

```go title="Signature"
func (r *Request) SetURL(url string) *Request
```

## Client

**Client** retrieves the `Client` instance associated with the `Request`.

```go title="Signature"
func (r *Request) Client() *Client
```

## SetClient

**SetClient** assigns a `Client` to the `Request`. If the provided client is `nil`, it will panic.

```go title="Signature"
func (r *Request) SetClient(c *Client) *Request
```

## Context

**Context** returns the `context.Context` of the request, or `context.Background()` if none is set.

```go title="Signature"
func (r *Request) Context() context.Context
```

## SetContext

**SetContext** sets the `context.Context` for the request, allowing you to cancel or time out the request. See the [Go blog](https://blog.golang.org/context) and [context](https://pkg.go.dev/context) docs for more details.

```go title="Signature"
func (r *Request) SetContext(ctx context.Context) *Request
```

## Header

**Header** returns all values for the specified header key. It searches all header fields stored in the request.

```go title="Signature"
func (r *Request) Header(key string) []string
```

### Headers

**Headers** returns an iterator over all headers in the request. Use `maps.Collect()` to transform them into a map if needed. The returned values are valid only until the request is released. Make copies as required.

```go title="Signature"
func (r *Request) Headers() iter.Seq2[string, []string]
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()

req.AddHeader("Golang", "Fiber")
req.AddHeader("Test", "123456")
req.AddHeader("Test", "654321")

for k, v := range req.Headers() {
  fmt.Printf("Header Key: %s, Header Value: %v\n", k, v)
}
```

```sh
Header Key: Golang, Header Value: [Fiber]
Header Key: Test, Header Value: [123456 654321]
```

</details>

<details>
<summary>Example with maps.Collect()</summary>

```go title="Example with maps.Collect()"
req := client.AcquireRequest()

req.AddHeader("Golang", "Fiber")
req.AddHeader("Test", "123456")
req.AddHeader("Test", "654321")

headers := maps.Collect(req.Headers()) // Collect all headers into a map
for k, v := range headers {
  fmt.Printf("Header Key: %s, Header Value: %v\n", k, v)
}
```

```sh
Header Key: Golang, Header Value: [Fiber]
Header Key: Test, Header Value: [123456 654321]
```

</details>

### AddHeader

**AddHeader** adds a single header field and its value to the request.

```go title="Signature"
func (r *Request) AddHeader(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.AddHeader("Golang", "Fiber")
req.AddHeader("Test", "123456")
req.AddHeader("Test", "654321")

resp, err := req.Get("https://httpbin.org/headers")
if err != nil {
    panic(err)
}

fmt.Println(resp.String())
```

```json
{
  "headers": {
    "Golang": "Fiber", 
    "Host": "httpbin.org", 
    "Referer": "", 
    "Test": "123456,654321", 
    "User-Agent": "fiber", 
    "X-Amzn-Trace-Id": "Root=1-664105d2-033cf7173457adb56d9e7193"
  }
}
```

</details>

### SetHeader

**SetHeader** sets a single header field and its value, overriding any previously set header with the same key.

```go title="Signature"
func (r *Request) SetHeader(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetHeader("Test", "123456")
req.SetHeader("Test", "654321")

resp, err := req.Get("https://httpbin.org/headers")
if err != nil {
    panic(err)
}

fmt.Println(resp.String())
```

```json
{
  "headers": {
    "Golang": "Fiber", 
    "Host": "httpbin.org", 
    "Referer": "", 
    "Test": "654321", 
    "User-Agent": "fiber", 
    "X-Amzn-Trace-Id": "Root=1-664105e5-5d676ba348450cdb62847f04"
  }
}
```

</details>

### AddHeaders

**AddHeaders** adds multiple headers at once from a map of string slices.

```go title="Signature"
func (r *Request) AddHeaders(h map[string][]string) *Request
```

### SetHeaders

**SetHeaders** sets multiple headers at once from a map of strings, overriding any previously set headers.

```go title="Signature"
func (r *Request) SetHeaders(h map[string]string) *Request
```

## Param

**Param** returns all values associated with a given query parameter key.

```go title="Signature"
func (r *Request) Param(key string) []string
```

### Params

**Params** returns an iterator over all query parameters. Use `maps.Collect()` if you need them in a map. The returned values are valid only until the request is released.

```go title="Signature"
func (r *Request) Params() iter.Seq2[string, []string]
```

### AddParam

**AddParam** adds a single query parameter key-value pair.

```go title="Signature"
func (r *Request) AddParam(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.AddParam("name", "john")
req.AddParam("hobbies", "football")
req.AddParam("hobbies", "basketball")

resp, err := req.Get("https://httpbin.org/response-headers")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "Content-Length": "145", 
  "Content-Type": "application/json", 
  "hobbies": [
    "football", 
    "basketball"
  ], 
  "name": "joe"
}
```

</details>

### SetParam

**SetParam** sets a single query parameter key-value pair, overriding any previously set values for that key.

```go title="Signature"
func (r *Request) SetParam(key, val string) *Request
```

### AddParams

**AddParams** adds multiple query parameters from a map of string slices.

```go title="Signature"
func (r *Request) AddParams(m map[string][]string) *Request
```

### SetParams

**SetParams** sets multiple query parameters from a map of strings, overriding previously set values.

```go title="Signature"
func (r *Request) SetParams(m map[string]string) *Request
```

### SetParamsWithStruct

**SetParamsWithStruct** sets multiple query parameters from a struct. Nested structs are not supported.

```go title="Signature"
func (r *Request) SetParamsWithStruct(v any) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetParamsWithStruct(struct {
    Name    string   `json:"name"`
    Hobbies []string `json:"hobbies"`
}{
    Name: "John Doe",
    Hobbies: []string{
        "Football",
        "Basketball",
    },
})

resp, err := req.Get("https://httpbin.org/response-headers")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "Content-Length": "147", 
  "Content-Type": "application/json", 
  "Hobbies": [
    "Football", 
    "Basketball"
  ], 
  "Name": "John Doe"
}
```

</details>

### DelParams

**DelParams** removes one or more query parameters by their keys.

```go title="Signature"
func (r *Request) DelParams(key ...string) *Request
```

## UserAgent

**UserAgent** returns the user agent currently set in the request.

```go title="Signature"
func (r *Request) UserAgent() string
```

## SetUserAgent

**SetUserAgent** sets the user agent header for the request, overriding the one set at the client level if any.

```go title="Signature"
func (r *Request) SetUserAgent(ua string) *Request
```

## Boundary

**Boundary** returns the multipart boundary used by the request.

```go title="Signature"
func (r *Request) Boundary() string
```

## SetBoundary

**SetBoundary** sets the multipart boundary for file uploads.

```go title="Signature"
func (r *Request) SetBoundary(b string) *Request
```

## Referer

**Referer** returns the Referer header value currently set in the request.

```go title="Signature"
func (r *Request) Referer() string
```

## SetReferer

**SetReferer** sets the Referer header for the request, overriding the one set at the client level if any.

```go title="Signature"
func (r *Request) SetReferer(referer string) *Request
```

## Cookie

**Cookie** returns the value of the specified cookie. If the cookie does not exist, it returns an empty string.

```go title="Signature"
func (r *Request) Cookie(key string) string
```

### Cookies

**Cookies** returns an iterator over all cookies set in the request. Use `maps.Collect()` to gather them into a map.

```go title="Signature"
func (r *Request) Cookies() iter.Seq2[string, string]
```

### SetCookie

**SetCookie** sets a single cookie key-value pair, overriding any previously set cookie with the same key.

```go title="Signature"
func (r *Request) SetCookie(key, val string) *Request
```

### SetCookies

**SetCookies** sets multiple cookies from a map, overriding previously set values.

```go title="Signature"
func (r *Request) SetCookies(m map[string]string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetCookies(map[string]string{
    "cookie1": "value1",
    "cookie2": "value2",
})

resp, err := req.Get("https://httpbin.org/cookies")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "cookies": {
    "test": "123"
  }
}
```

</details>

### SetCookiesWithStruct

**SetCookiesWithStruct** sets multiple cookies from a struct.

```go title="Signature"
func (r *Request) SetCookiesWithStruct(v any) *Request
```

### DelCookies

**DelCookies** removes one or more cookies by their keys.

```go title="Signature"
func (r *Request) DelCookies(key ...string) *Request
```

## PathParam

**PathParam** returns the value of a named path parameter. If not found, returns an empty string.

```go title="Signature"
func (r *Request) PathParam(key string) string
```

### PathParams

**PathParams** returns an iterator over all path parameters in the request. Use `maps.Collect()` to convert them into a map.

```go title="Signature"
func (r *Request) PathParams() iter.Seq2[string, string]
```

### SetPathParam

**SetPathParam** sets a single path parameter key-value pair, overriding previously set values.

```go title="Signature"
func (r *Request) SetPathParam(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetPathParam("base64", "R29maWJlcg==")

resp, err := req.Get("https://httpbin.org/base64/:base64")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```plaintext
Gofiber
```

</details>

### SetPathParams

**SetPathParams** sets multiple path parameters at once, overriding previously set values.

```go title="Signature"
func (r *Request) SetPathParams(m map[string]string) *Request
```

### SetPathParamsWithStruct

**SetPathParamsWithStruct** sets multiple path parameters from a struct.

```go title="Signature"
func (r *Request) SetPathParamsWithStruct(v any) *Request
```

### DelPathParams

**DelPathParams** deletes one or more path parameters by their keys.

```go title="Signature"
func (r *Request) DelPathParams(key ...string) *Request
```

### ResetPathParams

**ResetPathParams** deletes all path parameters.

```go title="Signature"
func (r *Request) ResetPathParams() *Request
```

## SetJSON

**SetJSON** sets the request body to a JSON-encoded payload.

```go title="Signature"
func (r *Request) SetJSON(v any) *Request
```

## SetXML

**SetXML** sets the request body to an XML-encoded payload.

```go title="Signature"
func (r *Request) SetXML(v any) *Request
```

## SetCBOR

**SetCBOR** sets the request body to a CBOR-encoded payload. It automatically sets the `Content-Type` to `application/cbor`.

```go title="Signature"
func (r *Request) SetCBOR(v any) *Request
```

## SetRawBody

**SetRawBody** sets the request body to raw bytes.

```go title="Signature"
func (r *Request) SetRawBody(v []byte) *Request
```

## FormData

**FormData** returns all values associated with the given form data field.

```go title="Signature"
func (r *Request) FormData(key string) []string
```

### AllFormData

**AllFormData** returns an iterator over all form data fields. Use `maps.Collect()` if needed.

```go title="Signature"
func (r *Request) AllFormData() iter.Seq2[string, []string]
```

### AddFormData

**AddFormData** adds a single form data key-value pair.

```go title="Signature"
func (r *Request) AddFormData(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.AddFormData("points", "80")
req.AddFormData("points", "90")
req.AddFormData("points", "100")

resp, err := req.Post("https://httpbin.org/post")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "args": {}, 
  "data": "", 
  "files": {}, 
  "form": {
    "points": [
      "80", 
      "90", 
      "100"
    ]
  }, 
  // ...
}
```

</details>

### SetFormData

**SetFormData** sets a single form data field, overriding any previously set values.

```go title="Signature"
func (r *Request) SetFormData(key, val string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetFormData("name", "john")
req.SetFormData("email", "john@doe.com")

resp, err := req.Post("https://httpbin.org/post")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "args": {}, 
  "data": "", 
  "files": {}, 
  "form": {
    "email": "john@doe.com", 
    "name": "john"
  }, 
  // ...
}
```

</details>

### AddFormDataWithMap

**AddFormDataWithMap** adds multiple form data fields and values from a map of string slices.

```go title="Signature"
func (r *Request) AddFormDataWithMap(m map[string][]string) *Request
```

### SetFormDataWithMap

**SetFormDataWithMap** sets multiple form data fields from a map of strings.

```go title="Signature"
func (r *Request) SetFormDataWithMap(m map[string]string) *Request
```

### SetFormDataWithStruct

**SetFormDataWithStruct** sets multiple form data fields from a struct.

```go title="Signature"
func (r *Request) SetFormDataWithStruct(v any) *Request
```

### DelFormData

**DelFormData** deletes one or more form data fields by their keys.

```go title="Signature"
func (r *Request) DelFormData(key ...string) *Request
```

## File

**File** returns a file from the request by its name. If no name was provided, it attempts to match by path.

```go title="Signature"
func (r *Request) File(name string) *File
```

### Files

**Files** returns all files in the request as a slice. The returned slice is valid only until the request is released.

```go title="Signature"
func (r *Request) Files() []*File
```

### FileByPath

**FileByPath** returns a file from the request by its file path.

```go title="Signature"
func (r *Request) FileByPath(path string) *File
```

### AddFile

**AddFile** adds a single file to the request from a file path.

```go title="Signature"
func (r *Request) AddFile(path string) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.AddFile("test.txt")

resp, err := req.Post("https://httpbin.org/post")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "args": {}, 
  "data": "", 
  "files": {
    "file1": "This is an empty file!\n"
  }, 
  "form": {}, 
  // ...
}
```

</details>

### AddFileWithReader

**AddFileWithReader** adds a single file to the request from an `io.ReadCloser`.

```go title="Signature"
func (r *Request) AddFileWithReader(name string, reader io.ReadCloser) *Request
```

<details>
<summary>Example</summary>

```go title="Example"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

buf := bytes.NewBuffer([]byte("Hello, World!"))
req.AddFileWithReader("test.txt", io.NopCloser(buf))

resp, err := req.Post("https://httpbin.org/post")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "args": {}, 
  "data": "", 
  "files": {
    "file1": "Hello, World!"
  }, 
  "form": {}, 
  // ...
}
```

</details>

### AddFiles

**AddFiles** adds multiple files to the request at once.

```go title="Signature"
func (r *Request) AddFiles(files ...*File) *Request
```

## Timeout

**Timeout** returns the timeout duration set in the request.

```go title="Signature"
func (r *Request) Timeout() time.Duration
```

## SetTimeout

**SetTimeout** sets a timeout for the request, overriding any timeout set at the client level.

```go title="Signature"
func (r *Request) SetTimeout(t time.Duration) *Request
```

<details>
<summary>Example 1</summary>

```go title="Example 1"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetTimeout(5 * time.Second)

resp, err := req.Get("https://httpbin.org/delay/4")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```json
{
  "args": {}, 
  "data": "", 
  "files": {}, 
  "form": {}, 
  // ...
}
```

</details>

<details>
<summary>Example 2</summary>

```go title="Example 2"
req := client.AcquireRequest()
defer client.ReleaseRequest(req)

req.SetTimeout(5 * time.Second)

resp, err := req.Get("https://httpbin.org/delay/6")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

```shell
panic: timeout or cancel

goroutine 1 [running]:
main.main()
        main.go:18 +0xeb
exit status 2
```

</details>

## MaxRedirects

**MaxRedirects** returns the maximum number of redirects allowed for the request.

```go title="Signature"
func (r *Request) MaxRedirects() int
```

## SetMaxRedirects

**SetMaxRedirects** sets the maximum number of redirects for the request, overriding the client's setting.

```go title="Signature"
func (r *Request) SetMaxRedirects(count int) *Request
```

## Send

**Send** executes the HTTP request and returns a `Response`.

```go title="Signature"
func (r *Request) Send() (*Response, error)
```

## Reset

**Reset** clears the `Request` object, making it ready for reuse. This is used by `ReleaseRequest`.

```go title="Signature"
func (r *Request) Reset()
```

## Header

**Header** is a wrapper around `fasthttp.RequestHeader`, storing headers for both the client and request.

```go
type Header struct {
    *fasthttp.RequestHeader
}
```

### PeekMultiple

**PeekMultiple** returns multiple values associated with the same header key.

```go title="Signature"
func (h *Header) PeekMultiple(key string) []string
```

### AddHeaders

**AddHeaders** adds multiple headers from a map of string slices.

```go title="Signature"
func (h *Header) AddHeaders(r map[string][]string)
```

### SetHeaders

**SetHeaders** sets multiple headers from a map of strings, overriding previously set headers.

```go title="Signature"
func (h *Header) SetHeaders(r map[string]string)
```

## QueryParam

**QueryParam** is a wrapper around `fasthttp.Args`, storing query parameters.

```go
type QueryParam struct {
    *fasthttp.Args
}
```

### Keys

**Keys** returns all keys in the query parameters.

```go title="Signature"
func (p *QueryParam) Keys() []string
```

### AddParams

**AddParams** adds multiple query parameters from a map of string slices.

```go title="Signature"
func (p *QueryParam) AddParams(r map[string][]string)
```

### SetParams

**SetParams** sets multiple query parameters from a map of strings, overriding previously set values.

```go title="Signature"
func (p *QueryParam) SetParams(r map[string]string)
```

### SetParamsWithStruct

**SetParamsWithStruct** sets multiple query parameters from a struct. Nested structs are not supported.

```go title="Signature"
func (p *QueryParam) SetParamsWithStruct(v any)
```

## Cookie

**Cookie** is a map that stores cookies.

```go
type Cookie map[string]string
```

### Add

**Add** adds a cookie key-value pair.

```go title="Signature"
func (c Cookie) Add(key, val string)
```

### Del

**Del** removes a cookie by its key.

```go title="Signature"
func (c Cookie) Del(key string)
```

### SetCookie

**SetCookie** sets a single cookie key-value pair, overriding previously set values.

```go title="Signature"
func (c Cookie) SetCookie(key, val string)
```

### SetCookies

**SetCookies** sets multiple cookies from a map of strings.

```go title="Signature"
func (c Cookie) SetCookies(m map[string]string)
```

### SetCookiesWithStruct

**SetCookiesWithStruct** sets multiple cookies from a struct.

```go title="Signature"
func (c Cookie) SetCookiesWithStruct(v any)
```

### DelCookies

**DelCookies** deletes one or more cookies by their keys.

```go title="Signature"
func (c Cookie) DelCookies(key ...string)
```

### All

**All** returns an iterator over all cookies. The key and value returned
should not be retained after the loop ends.

```go title="Signature"
func (c Cookie) All() iter.Seq2[string, string]
```

### Reset

**Reset** clears all cookies.

```go title="Signature"
func (c Cookie) Reset()
```

## PathParam

**PathParam** is a map that stores path parameters.

```go
type PathParam map[string]string
```

### Add

**Add** adds a path parameter key-value pair.

```go title="Signature"
func (p PathParam) Add(key, val string)
```

### Del

**Del** removes a path parameter by its key.

```go title="Signature"
func (p PathParam) Del(key string)
```

### SetParam

**SetParam** sets a single path parameter key-value pair, overriding previously set values.

```go title="Signature"
func (p PathParam) SetParam(key, val string)
```

### SetParams

**SetParams** sets multiple path parameters from a map of strings.

```go title="Signature"
func (p PathParam) SetParams(m map[string]string)
```

### SetParamsWithStruct

**SetParamsWithStruct** sets multiple path parameters from a struct.

```go title="Signature"
func (p PathParam) SetParamsWithStruct(v any)
```

### DelParams

**DelParams** deletes one or more path parameters by their keys.

```go title="Signature"
func (p PathParam) DelParams(key ...string)
```

### All

**All** returns an iterator over all path parameters. The key and value returned
should not be retained after the loop ends.

```go title="Signature"
func (p PathParam) All() iter.Seq2[string, string]
```

### Reset

**Reset** clears all path parameters.

```go title="Signature"
func (p PathParam) Reset()
```

## FormData

**FormData** is a wrapper around `fasthttp.Args`, used to handle URL-encoded and form-data (multipart) request bodies.

```go
type FormData struct {
    *fasthttp.Args
}
```

### Keys

**Keys** returns all form data keys.

```go title="Signature"
func (f *FormData) Keys() []string
```

### Add

**Add** adds a single form field key-value pair.

```go title="Signature"
func (f *FormData) Add(key, val string)
```

### Set

**Set** sets a single form field key-value pair, overriding any previously set values.

```go title="Signature"
func (f *FormData) Set(key, val string)
```

### AddWithMap

**AddWithMap** adds multiple form fields from a map of string slices.

```go title="Signature"
func (f *FormData) AddWithMap(m map[string][]string)
```

### SetWithMap

**SetWithMap** sets multiple form fields from a map of strings.

```go title="Signature"
func (f *FormData) SetWithMap(m map[string]string)
```

### SetWithStruct

**SetWithStruct** sets multiple form fields from a struct.

```go title="Signature"
func (f *FormData) SetWithStruct(v any)
```

### DelData

**DelData** deletes one or more form fields by their keys.

```go title="Signature"
func (f *FormData) DelData(key ...string)
```

### Reset

**Reset** clears all form data fields.

```go title="Signature"
func (f *FormData) Reset()
```

## File

**File** represents a file to be uploaded. It can be specified by name, path, or an `io.ReadCloser`.

```go
type File struct {
    name      string
    fieldName string
    path      string
    reader    io.ReadCloser
}
```

### AcquireFile

**AcquireFile** returns a `File` from the pool and applies any provided `SetFileFunc` functions to it. Release it with `ReleaseFile` when done.

```go title="Signature"
func AcquireFile(setter ...SetFileFunc) *File
```

### ReleaseFile

**ReleaseFile** returns the `File` to the pool. Do not use the file afterward.

```go title="Signature"
func ReleaseFile(f *File)
```

### SetName

**SetName** sets the file's name.

```go title="Signature"
func (f *File) SetName(n string)
```

### SetFieldName

**SetFieldName** sets the field name of the file in the multipart form.

```go title="Signature"
func (f *File) SetFieldName(n string)
```

### SetPath

**SetPath** sets the file's path.

```go title="Signature"
func (f *File) SetPath(p string)
```

### SetReader

**SetReader** sets the file's `io.ReadCloser`. The reader is closed automatically when the request body is parsed.

```go title="Signature"
func (f *File) SetReader(r io.ReadCloser)
```

### Reset

**Reset** clears the file's fields.

```go title="Signature"
func (f *File) Reset()
```
---
id: response
title: 📥 Response
description: >-
  Response methods of Gofiber HTTP client.
sidebar_position: 3
---

The `Response` struct in Fiber's HTTP client represents the server's reply and exposes:

- **Status Code**: The HTTP status code returned by the server (e.g., `200 OK`, `404 Not Found`).
- **Headers**: All HTTP headers returned by the server, providing additional response-related information.
- **Body**: The response body content, which can be JSON, XML, plain text, or other formats.
- **Cookies**: Any cookies the server sent along with the response.

It makes it easy to inspect and handle data returned by the server.

```go
type Response struct {
    client      *Client
    request     *Request
    cookie      []*fasthttp.Cookie
    RawResponse *fasthttp.Response
}
```

## AcquireResponse

**AcquireResponse** returns a new pooled `Response`. Call `ReleaseResponse` when you're done to return it to the pool and limit allocations.

```go title="Signature"
func AcquireResponse() *Response
```

## ReleaseResponse

**ReleaseResponse** puts the `Response` back into the pool. Do not use it after releasing; doing so can trigger data races.

```go title="Signature"
func ReleaseResponse(resp *Response)
```

## Status

**Status** returns the HTTP status message (e.g., `OK`, `Not Found`) associated with the response.

```go title="Signature"
func (r *Response) Status() string
```

## StatusCode

**StatusCode** returns the numeric HTTP status code of the response.

```go title="Signature"
func (r *Response) StatusCode() int
```

## Protocol

**Protocol** returns the HTTP protocol used (e.g., `HTTP/1.1`, `HTTP/2`) for the response.

```go title="Signature"
func (r *Response) Protocol() string
```

<details>
<summary>Example</summary>

```go title="Example"
resp, err := client.Get("https://httpbin.org/get")
if err != nil {
    panic(err)
}

fmt.Println(resp.Protocol())
```

**Output:**

```text
HTTP/1.1
```

</details>

## Header

**Header** retrieves the value of a specific response header by key. If multiple values exist for the same header, this returns the first one.

```go title="Signature"
func (r *Response) Header(key string) string
```

## Headers

**Headers** returns an iterator over all response headers. Use `maps.Collect()` to convert them into a map if desired. The returned values are only valid until the response is released, so make copies if needed.

```go title="Signature"
func (r *Response) Headers() iter.Seq2[string, []string]
```

<details>
<summary>Example</summary>

```go title="Example"
resp, err := client.Get("https://httpbin.org/get")
if err != nil {
    panic(err)
}

for key, values := range resp.Headers() {
    fmt.Printf("%s => %s\n", key, strings.Join(values, ", "))
}
```

**Output:**

```text
Date => Wed, 04 Dec 2024 15:28:29 GMT
Connection => keep-alive
Access-Control-Allow-Origin => *
Access-Control-Allow-Credentials => true
```

</details>

<details>
<summary>Example with maps.Collect()</summary>

```go title="Example with maps.Collect()"
resp, err := client.Get("https://httpbin.org/get")
if err != nil {
    panic(err)
}

headers := maps.Collect(resp.Headers())
for key, values := range headers {
    fmt.Printf("%s => %s\n", key, strings.Join(values, ", "))
}
```

**Output:**

```text
Date => Wed, 04 Dec 2024 15:28:29 GMT
Connection => keep-alive
Access-Control-Allow-Origin => *
Access-Control-Allow-Credentials => true
```

</details>

## Cookies

**Cookies** returns a slice of all cookies set by the server in this response. The slice is only valid until the response is released.

```go title="Signature"
func (r *Response) Cookies() []*fasthttp.Cookie
```

<details>
<summary>Example</summary>

```go title="Example"
resp, err := client.Get("https://httpbin.org/cookies/set/go/fiber")
if err != nil {
    panic(err)
}

cookies := resp.Cookies()
for _, cookie := range cookies {
    fmt.Printf("%s => %s\n", string(cookie.Key()), string(cookie.Value()))
}
```

**Output:**

```text
go => fiber
```

</details>

## Body

**Body** returns the raw response body as a byte slice.

```go title="Signature"
func (r *Response) Body() []byte
```

## BodyStream

**BodyStream** returns the response body as an `io.Reader`, allowing incremental reading without loading the entire body into memory. This is particularly useful when `Client.SetStreamResponseBody(true)` is enabled.

When streaming is enabled, the underlying stream from fasthttp is returned directly. When streaming is not enabled, a `bytes.Reader` wrapping the body is returned as a fallback.

:::note
When using `BodyStream()`, the response body is consumed as you read. Calling `Body()` afterward may return an empty slice if the stream has been fully read.
:::

```go title="Signature"
func (r *Response) BodyStream() io.Reader
```

<details>
<summary>Example</summary>

```go title="Example"
cc := client.New()
cc.SetStreamResponseBody(true)

resp, err := cc.Get("https://httpbin.org/bytes/1024")
if err != nil {
    panic(err)
}
defer resp.Close()

buf := make([]byte, 256)
total, err := io.CopyBuffer(io.Discard, resp.BodyStream(), buf)
if err != nil {
    panic(err)
}

fmt.Printf("Read %d bytes\n", total)
```

**Output:**

```text
Read 1024 bytes
```

</details>

## IsStreaming

**IsStreaming** returns `true` if the response body is being streamed (i.e., when `Client.SetStreamResponseBody(true)` was set and the underlying transport provided a stream).

```go title="Signature"
func (r *Response) IsStreaming() bool
```

<details>
<summary>Example</summary>

```go title="Example"
cc := client.New()
cc.SetStreamResponseBody(true)

resp, err := cc.Get("https://httpbin.org/get")
if err != nil {
    panic(err)
}
defer resp.Close()

if resp.IsStreaming() {
    fmt.Println("Response is streaming")
    // Use resp.BodyStream() to read incrementally
} else {
    fmt.Println("Response is buffered")
    // Use resp.Body() for direct access
}
```

</details>

## String

**String** returns the response body as a trimmed string.

```go title="Signature"
func (r *Response) String() string
```

## JSON

**JSON** unmarshal the response body into the provided variable `v` using JSON. `v` should be a pointer to a struct or a type compatible with JSON unmarshal.

```go title="Signature"
func (r *Response) JSON(v any) error
```

<details>
<summary>Example</summary>

```go title="Example"
type Body struct {
    Slideshow struct {
        Author string `json:"author"`
        Date   string `json:"date"`
        Title  string `json:"title"`
    } `json:"slideshow"`
}
var out Body

resp, err := client.Get("https://httpbin.org/json")
if err != nil {
    panic(err)
}

if err = resp.JSON(&out); err != nil {
    panic(err)
}

fmt.Printf("%+v\n", out)
```

**Output:**

```text
{Slideshow:{Author:Yours Truly Date:date of publication Title:Sample Slide Show}}
```

</details>

## XML

**XML** unmarshal the response body into the provided variable `v` using XML decoding.

```go title="Signature"
func (r *Response) XML(v any) error
```

## CBOR

**CBOR** unmarshal the response body into `v` using CBOR decoding.

```go title="Signature"
func (r *Response) CBOR(v any) error
```

## Save

**Save** writes the response body to a file or an `io.Writer`. If `v` is a string, it interprets it as a file path, creates the file (and directories if needed), and writes the response to it. If `v` is an `io.Writer`, it writes directly to it.

```go title="Signature"
func (r *Response) Save(v any) error
```

## Reset

**Reset** clears the `Response` object, making it ready for reuse by `ReleaseResponse`.

```go title="Signature"
func (r *Response) Reset()
```

## Close

**Close** releases both the associated `Request` and `Response` objects back to their pools.

:::warning
After calling `Close`, any attempt to use the request or response may result in data races or undefined behavior. Ensure all processing is complete before closing.
:::

```go title="Signature"
func (r *Response) Close()
```

---
id: rest
title: 🖥️ REST
description: >-
  HTTP client for Fiber.
sidebar_position: 1
toc_max_heading_level: 5
---

The Fiber Client is a high-performance HTTP client built on FastHTTP. It handles both internal service calls and external requests with minimal overhead.

## Features

- **Lightweight and fast**: built on FastHTTP for minimal overhead.
- **Flexible configuration**: set global defaults like timeouts or headers and override them per request.
- **Connection pooling**: reuses persistent connections instead of opening new ones.
- **Timeouts and retries**: supports per-request deadlines and retry policies for transient errors.

## Usage

Create a client with any required configuration, then send requests:

```go
package main

import (
    "fmt"
    "time"

    "github.com/gofiber/fiber/v3/client"
)

func main() {
    cc := client.New()
    cc.SetTimeout(10 * time.Second)

    // Send a GET request
    resp, err := cc.Get("https://httpbin.org/get")
    if err != nil {
        panic(err)
    }

    fmt.Printf("Status: %d\n", resp.StatusCode())
    fmt.Printf("Body: %s\n", string(resp.Body()))
}
```

See [examples](examples.md) for more detailed usage.

```go
type Client struct {
    mu sync.RWMutex

    fasthttp *fasthttp.Client

    baseURL   string
    userAgent string
    referer   string
    header    *Header
    params    *QueryParam
    cookies   *Cookie
    path      *PathParam

    debug bool

    timeout time.Duration

    // user-defined request hooks
    userRequestHooks []RequestHook

    // client package-defined request hooks
    builtinRequestHooks []RequestHook

    // user-defined response hooks
    userResponseHooks []ResponseHook

    // client package-defined response hooks
    builtinResponseHooks []ResponseHook

    jsonMarshal   utils.JSONMarshal
    jsonUnmarshal utils.JSONUnmarshal
    xmlMarshal    utils.XMLMarshal
    xmlUnmarshal  utils.XMLUnmarshal
    cborMarshal   utils.CBORMarshal
    cborUnmarshal utils.CBORUnmarshal

    cookieJar *CookieJar

    // proxy
    proxyURL string

    // retry
    retryConfig *RetryConfig

    // logger
    logger log.CommonLogger
}
```

### New

**New** creates and returns a new Client object.

```go title="Signature"
func New() *Client
```

### NewWithClient

**NewWithClient** creates and returns a new Client object from an existing `fasthttp.Client`.

```go title="Signature"
func NewWithClient(c *fasthttp.Client) *Client
```

## REST Methods

These helpers mirror axios-style method names and send HTTP requests using the configured client:

### Get

Sends a GET request.

```go title="Signature"
func (c *Client) Get(url string, cfg ...Config) (*Response, error)
```

### Post

Sends a POST request.

```go title="Signature"
func (c *Client) Post(url string, cfg ...Config) (*Response, error)
```

### Put

Sends a PUT request.

```go title="Signature"
func (c *Client) Put(url string, cfg ...Config) (*Response, error)
```

### Patch

Sends a PATCH request.

```go title="Signature"
func (c *Client) Patch(url string, cfg ...Config) (*Response, error)
```

### Delete

Sends a DELETE request.

```go title="Signature"
func (c *Client) Delete(url string, cfg ...Config) (*Response, error)
```

### Head

Sends a HEAD request.

```go title="Signature"
func (c *Client) Head(url string, cfg ...Config) (*Response, error)
```

### Options

Sends an OPTIONS request.

```go title="Signature"
func (c *Client) Options(url string, cfg ...Config) (*Response, error)
```

### Custom

Sends a request with any HTTP method.

```go title="Signature"
func (c *Client) Custom(url, method string, cfg ...Config) (*Response, error)
```

## Request Configuration

The `Config` type holds per-request parameters. JSON is used to serialize the body by default. If multiple body sources are set, precedence is:

1. Body
2. FormData
3. File

```go
type Config struct {
    Ctx context.Context

    UserAgent string
    Referer   string
    Header    map[string]string
    Param     map[string]string
    Cookie    map[string]string
    PathParam map[string]string

    Timeout      time.Duration
    MaxRedirects int

    Body     any
    FormData map[string]string
    File     []*File
}
```

## R

**R** gets a `Request` object from the pool. Call `ReleaseRequest` when finished.

```go title="Signature"
func (c *Client) R() *Request
```

## Hooks

Hooks allow you to add custom logic before a request is sent or after a response is received.

### RequestHook

**RequestHook** returns user-defined request hooks.

```go title="Signature"
func (c *Client) RequestHook() []RequestHook
```

### ResponseHook

**ResponseHook** returns user-defined response hooks.

```go title="Signature"
func (c *Client) ResponseHook() []ResponseHook
```

### AddRequestHook

Adds one or more user-defined request hooks.

```go title="Signature"
func (c *Client) AddRequestHook(h ...RequestHook) *Client
```

### AddResponseHook

Adds one or more user-defined response hooks.

```go title="Signature"
func (c *Client) AddResponseHook(h ...ResponseHook) *Client
```

## JSON

### JSONMarshal

Returns the JSON marshaler function used by the client.

```go title="Signature"
func (c *Client) JSONMarshal() utils.JSONMarshal
```

### JSONUnmarshal

Returns the JSON unmarshaler function used by the client.

```go title="Signature"
func (c *Client) JSONUnmarshal() utils.JSONUnmarshal
```

### SetJSONMarshal

Sets a custom JSON marshaler.

```go title="Signature"
func (c *Client) SetJSONMarshal(f utils.JSONMarshal) *Client
```

### SetJSONUnmarshal

Sets a custom JSON unmarshaler.

```go title="Signature"
func (c *Client) SetJSONUnmarshal(f utils.JSONUnmarshal) *Client
```

## XML

### XMLMarshal

Returns the XML marshaler function used by the client.

```go title="Signature"
func (c *Client) XMLMarshal() utils.XMLMarshal
```

### XMLUnmarshal

Returns the XML unmarshaler function used by the client.

```go title="Signature"
func (c *Client) XMLUnmarshal() utils.XMLUnmarshal
```

### SetXMLMarshal

Sets a custom XML marshaler.

```go title="Signature"
func (c *Client) SetXMLMarshal(f utils.XMLMarshal) *Client
```

### SetXMLUnmarshal

Sets a custom XML unmarshaler.

```go title="Signature"
func (c *Client) SetXMLUnmarshal(f utils.XMLUnmarshal) *Client
```

## CBOR

### CBORMarshal

Returns the CBOR marshaler function used by the client.

```go title="Signature"
func (c *Client) CBORMarshal() utils.CBORMarshal
```

### CBORUnmarshal

Returns the CBOR unmarshaler function used by the client.

```go title="Signature"
func (c *Client) CBORUnmarshal() utils.CBORUnmarshal
```

### SetCBORMarshal

Sets a custom CBOR marshaler.

```go title="Signature"
func (c *Client) SetCBORMarshal(f utils.CBORMarshal) *Client
```

### SetCBORUnmarshal

Sets a custom CBOR unmarshaler.

```go title="Signature"
func (c *Client) SetCBORUnmarshal(f utils.CBORUnmarshal) *Client
```

## TLS

### TLSConfig

Returns the client's TLS configuration. If none is set, it initializes a new
configuration with `MinVersion` defaulting to TLS 1.2.

```go title="Signature"
func (c *Client) TLSConfig() *tls.Config
```

### SetTLSConfig

Sets the TLS configuration for the client.

```go title="Signature"
func (c *Client) SetTLSConfig(config *tls.Config) *Client
```

### SetCertificates

Adds client certificates to the TLS configuration.

```go title="Signature"
func (c *Client) SetCertificates(certs ...tls.Certificate) *Client
```

### SetRootCertificate

Adds one or more root certificates to the client's trust store.

```go title="Signature"
func (c *Client) SetRootCertificate(path string) *Client
```

### SetRootCertificateFromString

Adds one or more root certificates from a string.

```go title="Signature"
func (c *Client) SetRootCertificateFromString(pem string) *Client
```

## SetProxyURL

Sets a proxy URL for the client. All subsequent requests will use this proxy.

```go title="Signature"
func (c *Client) SetProxyURL(proxyURL string) error
```

## Response Streaming

### StreamResponseBody

Returns whether response body streaming is enabled. When enabled, the response body is not fully loaded into memory and can be read as a stream using `Response.BodyStream()`. This is useful for handling large responses or server-sent events (SSE).

```go title="Signature"
func (c *Client) StreamResponseBody() bool
```

### SetStreamResponseBody

Enables or disables response body streaming. When enabled, responses can be consumed incrementally without loading the entire body into memory.

```go title="Signature"
func (c *Client) SetStreamResponseBody(enable bool) *Client
```

**Example:**

```go title="Example"
cc := client.New()
cc.SetStreamResponseBody(true)

resp, err := cc.Get("https://example.com/large-file")
if err != nil {
    panic(err)
}
defer resp.Close()

// Check if response is streaming
if resp.IsStreaming() {
    // Read body incrementally
    reader := resp.BodyStream()
    buf := make([]byte, 4096)
    for {
        n, err := reader.Read(buf)
        if n > 0 {
            // Process chunk...
        }
        if err == io.EOF {
            break
        }
        if err != nil {
            panic(err)
        }
    }
} else {
    // Regular body access
    body := resp.Body()
    fmt.Println(string(body))
}
```

**Server-Sent Events Example:**

```go title="SSE Example"
cc := client.New()
cc.SetStreamResponseBody(true)

resp, err := cc.Get("https://example.com/events")
if err != nil {
    panic(err)
}
defer resp.Close()

reader := bufio.NewReader(resp.BodyStream())
for {
    line, err := reader.ReadString('\n')
    if err == io.EOF {
        break
    }
    if err != nil {
        panic(err)
    }
    fmt.Print(line) // Process SSE event
}
```

## RetryConfig

Returns the retry configuration of the client.

```go title="Signature"
func (c *Client) RetryConfig() *RetryConfig
```

## SetRetryConfig

Sets the retry configuration for the client.

```go title="Signature"
func (c *Client) SetRetryConfig(config *RetryConfig) *Client
```

## BaseURL

### BaseURL

**BaseURL** returns the base URL currently set in the client.

```go title="Signature"
func (c *Client) BaseURL() string
```

### SetBaseURL

Sets a base URL prefix for all requests made by the client.

```go title="Signature"
func (c *Client) SetBaseURL(url string) *Client
```

**Example:**

```go title="Example"
cc := client.New()
cc.SetBaseURL("https://httpbin.org/")

resp, err := cc.Get("/get")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

<details>
<summary>Click here to see the result</summary>

```json
{
  "args": {},
  ...
}
```

</details>

## Headers

### Header

Retrieves all values of a header key at the client level. The returned values apply to all requests.

```go title="Signature"
func (c *Client) Header(key string) []string
```

### AddHeader

Adds a single header to all requests initiated by this client.

```go title="Signature"
func (c *Client) AddHeader(key, val string) *Client
```

### SetHeader

Sets a single header, overriding any existing headers with the same key.

```go title="Signature"
func (c *Client) SetHeader(key, val string) *Client
```

### AddHeaders

Adds multiple headers at once, all applying to all future requests from this client.

```go title="Signature"
func (c *Client) AddHeaders(h map[string][]string) *Client
```

### SetHeaders

Sets multiple headers at once, overriding previously set headers.

```go title="Signature"
func (c *Client) SetHeaders(h map[string]string) *Client
```

## Query Parameters

### Param

Returns the values for a given query parameter key.

```go title="Signature"
func (c *Client) Param(key string) []string
```

### AddParam

Adds a single query parameter for all requests.

```go title="Signature"
func (c *Client) AddParam(key, val string) *Client
```

### SetParam

Sets a single query parameter, overriding previously set values.

```go title="Signature"
func (c *Client) SetParam(key, val string) *Client
```

### AddParams

Adds multiple query parameters from a map of string slices.

```go title="Signature"
func (c *Client) AddParams(m map[string][]string) *Client
```

### SetParams

Sets multiple query parameters from a map, overriding previously set values.

```go title="Signature"
func (c *Client) SetParams(m map[string]string) *Client
```

### SetParamsWithStruct

Sets multiple query parameters from a struct. Nested structs are not currently supported.

```go title="Signature"
func (c *Client) SetParamsWithStruct(v any) *Client
```

### DelParams

Deletes one or more query parameters.

```go title="Signature"
func (c *Client) DelParams(key ...string) *Client
```

## UserAgent & Referer

### SetUserAgent

Sets the user agent header for all requests.

```go title="Signature"
func (c *Client) SetUserAgent(ua string) *Client
```

### SetReferer

Sets the referer header for all requests.

```go title="Signature"
func (c *Client) SetReferer(r string) *Client
```

## Path Parameters

### PathParam

Returns the value of a named path parameter, if set.

```go title="Signature"
func (c *Client) PathParam(key string) string
```

### SetPathParam

Sets a single path parameter.

```go title="Signature"
func (c *Client) SetPathParam(key, val string) *Client
```

### SetPathParams

Sets multiple path parameters at once.

```go title="Signature"
func (c *Client) SetPathParams(m map[string]string) *Client
```

### SetPathParamsWithStruct

Sets multiple path parameters from a struct.

```go title="Signature"
func (c *Client) SetPathParamsWithStruct(v any) *Client
```

### DelPathParams

Deletes one or more path parameters.

```go title="Signature"
func (c *Client) DelPathParams(key ...string) *Client
```

## Cookies

### Cookie

Returns the value of a named cookie if set at the client level.

```go title="Signature"
func (c *Client) Cookie(key string) string
```

### SetCookie

Sets a single cookie for all requests.

```go title="Signature"
func (c *Client) SetCookie(key, val string) *Client
```

**Example:**

```go title="Example"
cc := client.New()
cc.SetCookie("john", "doe")

resp, err := cc.Get("https://httpbin.org/cookies")
if err != nil {
    panic(err)
}

fmt.Println(string(resp.Body()))
```

<details>
<summary>Click here to see the result</summary>

```json
{
  "cookies": {
    "john": "doe"
  }
}
```

</details>

### SetCookies

Sets multiple cookies at once.

```go title="Signature"
func (c *Client) SetCookies(m map[string]string) *Client
```

### SetCookiesWithStruct

Sets multiple cookies from a struct.

```go title="Signature"
func (c *Client) SetCookiesWithStruct(v any) *Client
```

### DelCookies

Deletes one or more cookies.

```go title="Signature"
func (c *Client) DelCookies(key ...string) *Client
```

## Timeout

### SetTimeout

Sets a default timeout for all requests, which can be overridden per request.

```go title="Signature"
func (c *Client) SetTimeout(t time.Duration) *Client
```

## Debugging

### Debug

Enables debug-level logging output.

```go title="Signature"
func (c *Client) Debug() *Client
```

### DisableDebug

Disables debug-level logging output.

```go title="Signature"
func (c *Client) DisableDebug() *Client
```

## Cookie Jar

### SetCookieJar

Assigns a cookie jar to the client to store and manage cookies across requests.

```go title="Signature"
func (c *Client) SetCookieJar(cookieJar *CookieJar) *Client
```

## Dial & Logger

### SetDial

Sets a custom dial function.

```go title="Signature"
func (c *Client) SetDial(dial fasthttp.DialFunc) *Client
```

### SetLogger

Sets the logger instance used by the client.

```go title="Signature"
func (c *Client) SetLogger(logger log.CommonLogger) *Client
```

### Logger

Returns the current logger instance.

```go title="Signature"
func (c *Client) Logger() log.CommonLogger
```

## Reset

### Reset

Clears and resets the client to its default state and reinstates the default
`fasthttp.Client` transport.

```go title="Signature"
func (c *Client) Reset()
```

## Default Client

Fiber provides a default client (created with `New()`). You can configure it or replace it as needed.

### C

**C** returns the default client.

```go title="Signature"
func C() *Client
```

### Get

Get is a convenience method that sends a GET request using the `defaultClient`.

```go title="Signature"
func Get(url string, cfg ...Config) (*Response, error)
```

### Post

Post is a convenience method that sends a POST request using the `defaultClient`.

```go title="Signature"
func Post(url string, cfg ...Config) (*Response, error)
```

### Put

Put is a convenience method that sends a PUT request using the `defaultClient`.

```go title="Signature"
func Put(url string, cfg ...Config) (*Response, error)
```

### Patch

Patch is a convenience method that sends a PATCH request using the `defaultClient`.

```go title="Signature"
func Patch(url string, cfg ...Config) (*Response, error)
```

### Delete

Delete is a convenience method that sends a DELETE request using the `defaultClient`.

```go title="Signature"
func Delete(url string, cfg ...Config) (*Response, error)
```

### Head

Head sends a HEAD request using the `defaultClient`, a convenience method.

```go title="Signature"
func Head(url string, cfg ...Config) (*Response, error)
```

### Options

Options is a convenience method that sends an OPTIONS request using the `defaultClient`.

```go title="Signature"
func Options(url string, cfg ...Config) (*Response, error)
```

### Replace

**Replace** replaces the default client with a new one. It returns a function that can restore the old client.

:::caution
Replacing the default client is concurrency-safe, but mutating the same `Client` instance still requires external synchronization.
:::

```go title="Signature"
func Replace(c *Client) func()
```

---
id: advance-format
title: 🐛 Advanced Format
description: >-
  Learn how to use MessagePack (MsgPack) and CBOR for efficient binary serialization in Fiber applications.
sidebar_position: 9
---

## MsgPack

Fiber lets you use MessagePack for efficient binary serialization. Use one of the popular Go libraries below to encode and decode data in handlers.

- Fiber can bind requests with the `application/vnd.msgpack` content type out of the box. See the [Binding documentation](../api/bind.md#msgpack) for details.
- Use `Bind().MsgPack()` to bind data to structs, similar to JSON. `Ctx.AutoFormat()` responds with MsgPack when the `Accept` header is `application/vnd.msgpack`. See the [AutoFormat documentation](../api/ctx.md#autoformat) for more.

### Recommended Libraries

- [github.com/vmihailenco/msgpack](https://pkg.go.dev/github.com/vmihailenco/msgpack) — A widely used, feature-rich MsgPack library.
- [github.com/shamaton/msgpack/v3](https://pkg.go.dev/github.com/shamaton/msgpack/v3) — High-performance MsgPack library.

### Installation

Install either library using:

```bash
go get github.com/vmihailenco/msgpack
# or
go get github.com/shamaton/msgpack/v3
```

> **Note:** Fiber doesn't bundle a MsgPack implementation because it's outside the Go standard library. Pick one of the popular libraries in the ecosystem; the two below are widely used and well maintained.

### Example: Using `shamaton/msgpack/v3`

```go
import (
    "github.com/gofiber/fiber/v3"
    "github.com/shamaton/msgpack/v3"
)

type User struct {
    Name string `msgpack:"name"` // tag may vary depending on your MsgPack library
    Age  int   `msgpack:"age"`
}

func main() {
    app := fiber.New(fiber.Config{
        // Optional: Set custom MsgPack encoder/decoder
        MsgPackEncoder: msgpack.Marshal,
        MsgPackDecoder: msgpack.Unmarshal,
    })

    app.Post("/msgpack", func(c fiber.Ctx) error {
        var user User
        if err := c.Bind().MsgPack(&user); err != nil {
            return err
        }
        // Content type will be set automatically to application/vnd.msgpack
        return c.MsgPack(user)
    })

    app.Listen(":3000")
}
```

## CBOR

Fiber doesn't ship with a CBOR implementation. Use a library such as [fxamacker/cbor](https://github.com/fxamacker/cbor) to add encoding and decoding.

- Use `Bind().CBOR()` to bind CBOR to structs. `Ctx.AutoFormat()` replies with CBOR when the `Accept` header is `application/cbor`. See the [AutoFormat documentation](../api/ctx.md#autoformat) for details.

```bash
go get github.com/fxamacker/cbor/v2
```

Configure Fiber with the chosen library:

```go
import (
    "github.com/gofiber/fiber/v3"
    "github.com/fxamacker/cbor/v2"
)

func main() {
    app := fiber.New(fiber.Config{
        CBOREncoder: cbor.Marshal,
        CBORDecoder: cbor.Unmarshal,
    })

    type User struct {
        Name string `cbor:"name"`
        Age  int    `cbor:"age"`
    }

    app.Post("/cbor", func(c fiber.Ctx) error {
        var user User
        if err := c.Bind().CBOR(&user); err != nil {
            return err
        }

        // Content type will be set automatically to application/cbor
        return c.CBOR(user)
    })

    app.Listen(":3000")
}
```

---
id: go-context
title: "\U0001F9E0 Go Context"
description: >-
  Learn how Fiber's Ctx integrates with Go's context.Context,
  how to interact with the underlying fasthttp RequestCtx,
  and how to use the available context helpers.
sidebar_position: 6
toc_max_heading_level: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Fiber Context as `context.Context`

Fiber's [`Ctx`](../api/ctx.md) implements Go's
[`context.Context`](https://pkg.go.dev/context#Context) interface.
You can pass `c` directly to functions that expect a `context.Context`
without adapters.
However, `fasthttp` doesn't support cancellation yet, so
`Deadline`, `Done`, and `Err` are no-ops.

:::caution
The `fiber.Ctx` instance is only valid within the lifetime of the handler.
It is reused for subsequent requests, so avoid storing `c` or using it in
goroutines that outlive the handler. For asynchronous work, call
`c.Context()` inside the handler to obtain a `context.Context` that can safely
be used after the handler returns. By default, this returns `context.Background()`
unless a custom context was provided with `c.SetContext`.
:::

```go title="Example"
func doSomething(ctx context.Context) {
    // ... your logic here
}

app.Get("/", func(c fiber.Ctx) error {
    doSomething(c) // c satisfies context.Context
    return nil
})
```

### Using context outside the handler

`fiber.Ctx` is recycled after each request. If you need a context that lives
longer—for example, for work performed in a new goroutine—obtain it with
`c.Context()` before returning from the handler.

```go title="Async work"
app.Get("/job", func(c fiber.Ctx) error {
    ctx := c.Context()
    go performAsync(ctx)
    return c.SendStatus(fiber.StatusAccepted)
})
```

You can customize the base context by calling `c.SetContext` before
requesting it:

```go
app.Get("/job", func(c fiber.Ctx) error {
    c.SetContext(context.WithValue(context.Background(), "requestID", "123"))
    ctx := c.Context()
    go performAsync(ctx)
    return nil
})
```

### Retrieving Values

`Ctx.Value` is backed by [Locals](../api/ctx.md#locals).
Values stored with `c.Locals` are accessible through `Value` or
standard `context.WithValue` helpers.

```go title="Locals and Value"
app.Get("/", func(c fiber.Ctx) error {
    c.Locals("role", "admin")
    role := c.Value("role") // returns "admin"
    return c.SendString(role.(string))
})
```

## Working with `RequestCtx` and `fasthttpctx`

The underlying [`fasthttp.RequestCtx`](https://pkg.go.dev/github.com/valyala/fasthttp#RequestCtx)
can be accessed via `c.RequestCtx()`.
This exposes low-level APIs and the extra context support provided by
`fasthttpctx`.

```go title="Accessing RequestCtx"
app.Get("/raw", func(c fiber.Ctx) error {
    fctx := c.RequestCtx()
    // use fasthttp APIs directly
    fctx.Response.Header.Set("X-Engine", "fasthttp")
    return nil
})
```

`fasthttpctx` enables `fasthttp` to satisfy the `context.Context` interface.
`Deadline` always reports no deadline. `Done` closes only when the server
shuts down, and `Err` then returns `context.Canceled`.

:::caution
`Done` does not fire when an individual client disconnects. To stop a
long-running handler at a deadline, wrap the request with
`context.WithTimeout` as shown below.
:::

## Context Helpers

Fiber and its middleware expose a number of helper functions that
retrieve request-scoped values from the context.

### Request ID

The RequestID middleware stores the generated identifier in the context.
Use `requestid.FromContext` to read it later.

```go
app.Use(requestid.New())
app.Get("/", func(c fiber.Ctx) error {
    id := requestid.FromContext(c)
    return c.SendString(id)
})
```

### CSRF

The CSRF middleware provides helpers to fetch the token or the handler
attached to the current context.

```go
app.Use(csrf.New())
app.Get("/form", func(c fiber.Ctx) error {
    token := csrf.TokenFromContext(c)
    return c.SendString(token)
})
```

```go title="Deleting a token"
app.Post("/logout", func(c fiber.Ctx) error {
    handler := csrf.HandlerFromContext(c)
    if handler != nil {
        // Invalidate the token on logout
        _ = handler.DeleteToken(c)
    }
    // ... other logout logic
    return c.SendString("Logged out")
})
```

### Session

Sessions are stored on the context and can be retrieved via
`session.FromContext`.

```go
app.Use(session.New())
app.Get("/", func(c fiber.Ctx) error {
    sess := session.FromContext(c)
    count := sess.Get("visits")
    return c.JSON(fiber.Map{"visits": count})
})
```

### Basic Authentication

After successful authentication, the username is available with
`basicauth.UsernameFromContext`. Passwords in `Users` must be pre-hashed.

```go
app.Use(basicauth.New(basicauth.Config{
    Users: map[string]string{
        // "secret" hashed using SHA-256
        "admin": "{SHA256}K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=",
    },
}))
app.Get("/", func(c fiber.Ctx) error {
    user := basicauth.UsernameFromContext(c)
    return c.SendString(user)
})
```

### Key Authentication

For API key authentication, the extracted token is stored in the
context and accessible via `keyauth.TokenFromContext`.

```go
app.Use(keyauth.New())
app.Get("/", func(c fiber.Ctx) error {
    token := keyauth.TokenFromContext(c)
    return c.SendString(token)
})
```

## Using `context.WithValue` and Friends

Since `fiber.Ctx` conforms to `context.Context`, standard helpers such as
`context.WithValue`, `context.WithTimeout`, or `context.WithCancel`
can wrap the request context when needed.

```go
app.Get("/job", func(c fiber.Ctx) error {
    ctx, cancel := context.WithTimeout(c, 5*time.Second)
    defer cancel()

    // pass ctx to async operations that honor cancellation
    if err := doWork(ctx); err != nil {
        return err
    }
    return c.SendStatus(fiber.StatusOK)
})
```

### Context Cancellation with Goroutines in Fiber

When starting asynchronous work inside a handler, Fiber does not cancel the base `fiber.Ctx` automatically.
By wrapping the request context with `context.WithTimeout`, you can create a derived context that honors deadlines and cancellation signals.

The goroutine checks `ctx.Done()` before sending a result.
If the deadline elapses, the goroutine exits early and avoids leaking resources.

The handler then waits for either:

- a result from the goroutine, or
- the `context timeout` (which returns a 504 Gateway Timeout)

This pattern ensures that long-running operations (database queries, external API calls, background tasks) do not continue running after the request has ended.

```go
func Handler(c fiber.Ctx) error {
    ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
    defer cancel()

    resultChan := make(chan string, 1)

    go func() {
        select {
        case <-time.After(3 * time.Second):
            select {
            case <-ctx.Done():
                return
            case resultChan <- "done":
            }
        case <-ctx.Done():
            return
        }
    }()

    select {
    case res := <-resultChan:
        return c.SendString(res)
    case <-ctx.Done():
        return c.Status(fiber.StatusGatewayTimeout).SendString("timeout")
    }
}
```

This approach provides safe cancellation semantics for goroutine-based work while allowing you to integrate Fiber handlers with context-aware APIs.

## Summary

- `fiber.Ctx` satisfies `context.Context` but its `Deadline`, `Done`, and `Err`
  methods are currently no-ops.
- `RequestCtx` exposes the raw `fasthttp` context. Its `Done` channel
  closes only on server shutdown, not on client disconnect.
- Use `fiber.StoreInContext(c, key, value)` to store request-scoped values in both
  `c.Locals()` and `c.Context()` when values must be available through either API.
- Middleware helpers like `requestid.FromContext` or `session.FromContext`
  make it easy to retrieve request-scoped data.
- Standard helpers such as `context.WithTimeout` can wrap `fiber.Ctx` to create
  fully featured derived contexts inside handlers.
- `fiber.Config.PassLocalsToContext` controls whether Fiber context helpers
  also propagate values into the request `context.Context` for Fiber-backed
  contexts when using `StoreInContext`. It defaults to `false` for backward
  compatibility, while `ValueFromContext` keeps reading from `c.Locals()`.
- Use `c.Context()` to obtain a `context.Context` that can outlive the handler,
  and `c.SetContext()` to customize it with additional values or deadlines.

With these tools, you can seamlessly integrate Fiber applications with
Go's context-based APIs and manage request-scoped data effectively.

---
id: error-handling
title: 🐛 Error Handling
description: >-
  Fiber supports centralized error handling: handlers return errors so you can
  log them or send a custom HTTP response to the client.
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Catching Errors

Return errors from route handlers and middleware so Fiber can handle them centrally.

<Tabs>
<TabItem value="example" label="Example">

```go
app.Get("/", func(c fiber.Ctx) error {
    // Pass error to Fiber
    return c.SendFile("file-does-not-exist")
})
```

</TabItem>
</Tabs>

Fiber does not recover from [panics](https://go.dev/blog/defer-panic-and-recover) by default. Add the `Recover` middleware to catch panics in any handler:

```go title="Example"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/recover"
)

func main() {
    app := fiber.New()

    app.Use(recover.New())

    app.Get("/", func(c fiber.Ctx) error {
        panic("This panic is caught by fiber")
    })

    log.Fatal(app.Listen(":3000"))
}
```

Use `fiber.NewError()` to create an error with a status code. If you omit the message, Fiber uses the standard status text (for example, `404` becomes `Not Found`).

```go title="Example"
app.Get("/", func(c fiber.Ctx) error {
    // 503 Service Unavailable
    return fiber.ErrServiceUnavailable

    // 503 On vacation!
    return fiber.NewError(fiber.StatusServiceUnavailable, "On vacation!")
})
```

## Default Error Handler

Fiber ships with a default error handler that sends **500 Internal Server Error** for generic errors. If the error is a [fiber.Error](https://godoc.org/github.com/gofiber/fiber#Error), the response uses the embedded status code and message.

```go title="Example"
// Default error handler
var DefaultErrorHandler = func(c fiber.Ctx, err error) error {
    // Status code defaults to 500
    code := fiber.StatusInternalServerError
    var e *fiber.Error
    matched := errors.As(err, &e)
    if matched && e != nil {
        code = e.Code
    }
    message := http.StatusText(code)
    if err != nil && !(matched && e == nil) {
        message = err.Error()
    }

    // Set Content-Type: text/plain; charset=utf-8
    c.Set(fiber.HeaderContentType, fiber.MIMETextPlainCharsetUTF8)

    // Return status code with error message
    return c.Status(code).SendString(message)
}
```

## Custom Error Handler

Set a custom error handler in [`fiber.Config`](../api/fiber.md#errorhandler) when creating a new app.

The default handler covers most cases, but a custom handler lets you react to specific error types—for example, by logging to a service or sending a tailored JSON or HTML response.

The following example shows how to display error pages for different types of errors.

```go title="Example"
// Create a new fiber instance with custom config
app := fiber.New(fiber.Config{
    // Override default error handler
    ErrorHandler: func(ctx fiber.Ctx, err error) error {
        // Status code defaults to 500
        code := fiber.StatusInternalServerError

        // Retrieve the custom status code if it's a *fiber.Error
        var e *fiber.Error
        if errors.As(err, &e) && e != nil {
            code = e.Code
        }

        // Send custom error page
        err = ctx.Status(code).SendFile(fmt.Sprintf("./%d.html", code))
        if err != nil {
            // In case the SendFile fails
            return ctx.Status(fiber.StatusInternalServerError).SendString("Internal Server Error")
        }

        // Return from handler
        return nil
    },
})

// ...
```

> Special thanks to the [Echo](https://echo.labstack.com/) and [Express](https://expressjs.com/) frameworks for inspiring parts of this error-handling approach.

---
id: extractors
title: 🔬 Extractors
description: Learn how to use extractors in Fiber middleware
sidebar_position: 8.5
toc_max_heading_level: 4
---

The extractors package provides shared value extraction utilities for Fiber middleware packages. It helps reduce code duplication across middleware packages while ensuring consistent behavior and security practices.

## Overview

The `github.com/gofiber/fiber/v3/extractors` module provides standardized value extraction utilities integrated into Fiber's middleware ecosystem. This approach:

- **Reduces Code Duplication**: Eliminates redundant extractor implementations across middleware packages
- **Ensures Consistency**: Maintains identical behavior and security practices across all extractors
- **Simplifies Maintenance**: Changes to extraction logic only need to be made in one place
- **Enables Direct Usage**: Middleware can import and use extractors directly
- **Improves Performance**: Shared, optimized extraction functions reduce overhead

## What Are Extractors?

Extractors are utilities that middleware uses to get values from different parts of HTTP requests:

### Available Extractors

- `FromAuthHeader(authScheme string)`: Extract from Authorization header with optional scheme
- `FromCookie(key string)`: Extract from HTTP cookies
- `FromParam(param string)`: Extract from URL path parameters
- `FromForm(param string)`: Extract from form data
- `FromHeader(header string)`: Extract from custom HTTP headers
- `FromQuery(param string)`: Extract from URL query parameters
- `FromCustom(key string, fn func(fiber.Ctx) (string, error))`: Define custom extraction logic with metadata
- `Chain(extractors ...Extractor)`: Chain multiple extractors with fallback logic

### Extractor Structure

Each `Extractor` contains:

```go
type Extractor struct {
    Extract    func(fiber.Ctx) (string, error)  // Extraction function
    Key        string                           // Parameter/header name
    Source     Source                           // Source type for inspection
    AuthScheme string                           // Auth scheme (FromAuthHeader)
    Chain      []Extractor                      // Chained extractors
}
```

- **Headers**: `Authorization`, `X-API-Key`, custom headers
- **Cookies**: Session cookies, authentication tokens
- **Query Parameters**: URL parameters like `?token=abc123`
- **Form Data**: POST body form fields
- **URL Parameters**: Route parameters like `/users/:id`

### Chain Behavior

The `Chain` function creates extractors that try multiple sources in order:

- Returns the first successful extraction (non-empty value with no error)
- If all extractors fail, returns the last error encountered or `ErrNotFound`
- **Robust error handling**: Skips extractors with `nil` Extract functions
- Preserves the source and key from the first extractor for metadata
- Stores a defensive copy of all chained extractors for introspection via the `Chain` field

## Why Middleware Uses Extractors

Middleware needs to extract values from requests for authentication, authorization, and other purposes. Extractors provide:

- **Security Awareness**: Different sources have different security implications
- **Fallback Support**: Try multiple sources if the first one doesn't have the value
- **Consistency**: Same extraction logic across all middleware packages
- **Source Tracking**: Know where values came from for security decisions

## Usage Examples

### Basic Usage

```go
// KeyAuth middleware extracts key from header
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromHeader("Middleware-Key"),
}))
```

### Fallback Chains

```go
// Try multiple sources in order
tokenExtractor := extractors.Chain(
    extractors.FromHeader("Middleware-Key"),  // Try header first
    extractors.FromCookie("middleware_key"),  // Then cookie
    extractors.FromQuery("middleware_key"),   // Finally query param
)

app.Use(keyauth.New(keyauth.Config{
    Extractor: tokenExtractor,
}))
```

## Configuring Middleware That Uses Extractors

### Authentication Middleware

```go
// KeyAuth middleware (default: FromAuthHeader)
app.Use(keyauth.New(keyauth.Config{
    // Default extracts from Authorization header
    // Extractor: extractors.FromAuthHeader("Bearer"),
}))

// Custom header extraction
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromHeader("X-API-Key"),
}))

// Multiple sources with secure fallback
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.Chain(
        extractors.FromAuthHeader("Bearer"),  // Secure first
        extractors.FromHeader("X-API-Key"),   // Then custom header
        extractors.FromQuery("api_key"),      // Least secure last
    ),
}))
```

### Session Middleware

```go
// Session middleware (default: FromCookie)
app.Use(session.New(session.Config{
    // Default extracts from session_id cookie
    // Extractor: extractors.FromCookie("session_id"),
}))

// Custom cookie name
app.Use(session.New(session.Config{
    Extractor: extractors.FromCookie("my_session"),
}))
```

### CSRF Middleware

```go
// CSRF middleware (default: FromHeader)
app.Use(csrf.New(csrf.Config{
    // Default extracts from X-CSRF-Token header
    // Extractor: extractors.FromHeader("X-CSRF-Token"),
}))

// Form-based CSRF (less secure, use only if needed)
app.Use(csrf.New(csrf.Config{
    Extractor: extractors.Chain(
        extractors.FromHeader("X-CSRF-Token"), // Secure first
        extractors.FromForm("_csrf"),          // Form fallback
    ),
}))
```

## Security Considerations

### Source Characteristics

Different extraction sources have different security properties and use cases:

#### Headers (Generally Preferred)

- **Authorization Header**: Standard for authentication tokens, widely supported
- **Custom Headers**: Application-specific, less likely to be logged by default
- **Considerations**: Can be intercepted without HTTPS, may be stripped by proxies

#### Cookies (Good for Sessions)

- **Session Cookies**: Designed for secure client-side storage
- **Considerations**: Require proper `Secure`, `HttpOnly`, and `SameSite` flags
- **Best for**: Session management, remember-me tokens

#### Query Parameters (Use Sparingly)

- **Query parameters**: Convenient for simple APIs and debugging
- **Considerations**: Always visible in URLs, logged by servers/proxies, stored in browser history
- **Best for**: Non-sensitive parameters, public identifiers

#### Form Data (Context Dependent)

- **POST Bodies**: Suitable for form submissions and API requests
- **Considerations**: Avoid putting sensitive data in query strings; ensure request bodies aren’t logged and use the correct content type
- **Best for**: User-generated content, file uploads

### Security Best Practices

1. **Use HTTPS**: Encrypt all traffic to protect extracted values in transit
2. **Validate Input**: Always validate and sanitize extracted values
3. **Log Carefully**: Avoid logging sensitive values from any source
4. **Choose Appropriate Sources**: Match the source to your security requirements
5. **Test Thoroughly**: Verify extraction works in your environment
6. **Monitor Security**: Watch for extraction failures or unusual patterns

### Chain Ordering Strategy

When using multiple sources, order them by your security preferences:

```go
// Example: Prefer headers, fall back to cookies, then query
extractors.Chain(
    extractors.FromAuthHeader("Bearer"),    // Standard auth
    extractors.FromCookie("auth_token"),    // Secure storage
    extractors.FromQuery("token"),          // Public fallback
)
```

The "best" source depends on your specific use case, security requirements, and application architecture.

### Common Security Issues

#### Leaky URLs

```go
// ❌ DON'T: API keys in URLs (visible in logs, history, bookmarks)
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromQuery("api_key"), // PROBLEMATIC
}))

// ✅ DO: API keys in headers (not visible in URLs)
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromHeader("X-API-Key"), // BETTER
}))
```

#### Session Tokens in Query Parameters

```go
// ❌ DON'T: Session tokens in URLs (can be bookmarked, leaked)
app.Use(session.New(session.Config{
    Extractor: extractors.FromQuery("session"), // PROBLEMATIC
}))

// ✅ DO: Session tokens in cookies (designed for this purpose)
app.Use(session.New(session.Config{
    Extractor: extractors.FromCookie("session_id"), // BETTER
}))
```

#### Form-Only CSRF Tokens

While the default extractor uses headers, some implementations use form fields, which is fine if you don't have AJAX or API clients:

```go
// ❌ DON'T: CSRF tokens only in forms (breaks AJAX, API calls)
app.Use(csrf.New(csrf.Config{
    Extractor: extractors.FromForm("_csrf"), // LIMITED
}))

// ✅ DO: Header-first with form fallback (works everywhere)
app.Use(csrf.New(csrf.Config{
    Extractor: extractors.Chain(
        extractors.FromHeader("X-CSRF-Token"), // PREFERRED
        extractors.FromForm("_csrf"),          // FALLBACK
    ),
}))
```

### Understanding Trade-offs

**No extractor is universally "secure" - security depends on:**

- Whether you're using HTTPS
- How you configure cookies (Secure, HttpOnly, SameSite flags)
- Your logging and monitoring setup
- The sensitivity of the data being extracted
- Your threat model and security requirements

Choose extractors based on your specific use case and security needs, not blanket "secure" vs "insecure" labels.

## Standards Compliance

### Authorization Header (RFC 9110 & RFC 7235)

The `FromAuthHeader` extractor provides comprehensive RFC compliance with strict security validation:

#### RFC 9110 Compliance (Authorization Header Format)

- **Section 11.6.2 Format**: Enforces `credentials = auth-scheme 1*SP token68` structure
- **1*SP Requirement**: Validates exactly one or more spaces between auth-scheme and token
- **Case-insensitive scheme matching**: `Bearer`, `bearer`, `BEARER` all work correctly
- **Proper whitespace handling**: Rejects tabs between scheme and token (only spaces allowed)

#### RFC 7235 Token68 Validation

The extractor implements strict token68 character validation per RFC 7235:

- **Allowed characters**: `A-Z`, `a-z`, `0-9`, `-`, `.`, `_`, `~`, `+`, `/`, `=`
- **Padding rules**: `=` characters only allowed at the end of tokens
- **Security validation**: Prevents tokens starting with `=` or having non-padding characters after `=`
- **Whitespace rejection**: Rejects tokens containing spaces, tabs, or any other whitespace

#### Security Features

- **Header injection prevention**: Strict parsing prevents malformed authorization headers from bypassing authentication
- **Token validation**: Ensures extracted tokens conform to standards, preventing authentication bypass
- **Consistent error handling**: Returns `ErrNotFound` for all invalid cases

#### Examples

```go
// Standard usage - strict validation
extractor := extractors.FromAuthHeader("Bearer")

// ✅ Valid cases:
// "Bearer abc123" -> "abc123"
// "bearer ABC123" -> "ABC123" (case-insensitive scheme)
// "Bearer token123=" -> "token123=" (valid padding)
// "Bearer token==" -> "token==" (valid multiple padding)

// ❌ Invalid cases (all return ErrNotFound):
// "Bearer abc def" -> rejected (space in token)
// "Bearer abc\tdef" -> rejected (tab in token)
// "Bearer =abc" -> rejected (padding at start)
// "Bearer ab=cd" -> rejected (padding in middle)
// "Bearer  token" -> rejected (multiple spaces after scheme)
// "Bearer\ttoken" -> rejected (tab after scheme)
// "Bearertoken" -> rejected (no space after scheme)

// Raw header extraction (no validation)
rawExtractor := extractors.FromAuthHeader("")
// "CustomAuth anything goes here" -> "CustomAuth anything goes here"
```

#### Benefits

- **Standards Compliance**: Full adherence to HTTP authentication RFCs
- **Security Hardening**: Prevents common authentication bypass vulnerabilities
- **Consistent Behavior**: Reliable parsing across different client implementations
- **Developer Confidence**: Clear validation rules reduce authentication bugs

## Troubleshooting

### Extraction Fails

**Problem**: Middleware returns "value not found" or authentication fails

**Solutions**:

1. Check if the expected header/cookie/query parameter is present
2. Verify the key name matches exactly (headers are case-insensitive; params/cookies/query keys are case-sensitive)
3. Ensure the request uses the correct HTTP method (GET vs POST)
4. Check if middleware is configured with the right extractor

**Debug Example**:

```go
// Add simple debug logging (avoid logging secrets in production)
app.Use(func(c fiber.Ctx) error {
    hdr := c.Get("X-API-Key")
    cookie := c.Cookies("session_id")
    if hdr != "" || cookie != "" {
        log.Printf("debug: X-API-Key present=%t, session_id present=%t", hdr != "", cookie != "")
    }
    return c.Next()
})
```

### Wrong Source Used

**Problem**: Values extracted from unexpected sources

**Solutions**:

1. Check middleware configuration order
2. Verify chain order (first successful extraction wins)
3. Use more specific extractors when needed

### Security Warnings

**Problem**: Getting security warnings in logs

**Solutions**:

1. Switch to more secure sources (headers/cookies)
2. Use HTTPS to encrypt traffic
3. Review if sensitive data should be in that source

## Advanced Usage

### Custom Extraction Logic

Extractors support custom extractors for complex scenarios:

```go
// Extract from custom logic (rarely needed)
customExtractor := extractors.FromCustom("my-source", func(c fiber.Ctx) (string, error) {
    // Complex extraction logic
    if value := c.Locals("computed_token"); value != nil {
        return value.(string), nil
    }
    return "", extractors.ErrNotFound
})
```

:::warning
**Custom extractors break source awareness.** When you use `FromCustom`, middleware cannot determine where the value came from, which means:

- **No automatic security warnings** for potentially insecure sources
- **No source-based logging** or monitoring capabilities
- **Developer responsibility** for ensuring the extraction is secure and appropriate

**Only use `FromCustom` when:**

- Standard extractors don't meet your needs
- You've carefully evaluated the security implications
- You're confident in the security of your custom extraction logic
- You understand that middleware cannot provide source-aware security guidance

**Note:** If you pass `nil` as the function parameter, `FromCustom` will return an extractor that always fails with `ErrNotFound`.
:::

### Multiple Middleware Coordination

When using multiple middleware that extract values, ensure they don't conflict:

```go
// Good: Different sources for different purposes
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromHeader("X-API-Key"),
}))
app.Use(session.New(session.Config{
    Extractor: extractors.FromCookie("session_id"),
}))

// Avoid: Same source for different middleware
app.Use(keyauth.New(keyauth.Config{
    Extractor: extractors.FromCookie("token"), // API auth
}))
app.Use(session.New(session.Config{
    Extractor: extractors.FromCookie("token"), // Session - CONFLICT!
}))
```

---
id: grouping
title: 🎭 Grouping
sidebar_position: 2
---

:::info
Grouping works like Express.js. Groups are virtual; routes are flattened with the group's prefix and executed in declaration order, mirroring Express.js.
:::

## Paths

Groups can use path prefixes to organize related routes.

```go
func main() {
    app := fiber.New()

    api := app.Group("/api", middleware) // /api

    v1 := api.Group("/v1", middleware)   // /api/v1
    v1.Get("/list", handler)             // /api/v1/list
    v1.Get("/user", handler)             // /api/v1/user

    v2 := api.Group("/v2", middleware)   // /api/v2
    v2.Get("/list", handler)             // /api/v2/list
    v2.Get("/user", handler)             // /api/v2/user

    log.Fatal(app.Listen(":3000"))
}
```

:::note
Group prefixes follow the same slash-boundary rule as `app.Use`. A prefix must either match the full path or stop at a `/`, so `/api` applies to `/api` and `/api/v1` but not `/apiv1`. Parameter markers (for example `:id`, `:id?`, `*`, and `+`) are processed before checking the boundary.
:::

Groups can also include an optional handler.

```go
func main() {
    app := fiber.New()

    api := app.Group("/api")      // /api

    v1 := api.Group("/v1")        // /api/v1
    v1.Get("/list", handler)      // /api/v1/list
    v1.Get("/user", handler)      // /api/v1/user

    v2 := api.Group("/v2")        // /api/v2
    v2.Get("/list", handler)      // /api/v2/list
    v2.Get("/user", handler)      // /api/v2/user

    log.Fatal(app.Listen(":3000"))
}
```

:::caution
Accessing `/api`, `/v1`, or `/v2` directly returns a **404**, so add error handlers as needed.
:::

## Group Handlers

Group handlers can act as routing paths but must call `Next` to continue the flow.

```go
func main() {
    app := fiber.New()

    handler := func(c fiber.Ctx) error {
        return c.SendStatus(fiber.StatusOK)
    }
    api := app.Group("/api") // /api

    v1 := api.Group("/v1", func(c fiber.Ctx) error { // middleware for /api/v1
        c.Set("Version", "v1")
        return c.Next()
    })
    v1.Get("/list", handler) // /api/v1/list
    v1.Get("/user", handler) // /api/v1/user

    log.Fatal(app.Listen(":3000"))
}
```

## Route

[`Route`](../api/app.md#route) groups routes under a common prefix declared inside a single callback, with an optional name prefix. It is shorthand for nesting with `Group`.

```go
app.Route("/api/v1", func(r fiber.Router) {
    r.Get("/users", handler).Name("users")   // /api/v1/users  (name: v1.users)
    r.Post("/users", handler).Name("create") // /api/v1/users  (name: v1.create)
}, "v1.")
```

## RouteChain

When several HTTP methods share the **same path**, [`RouteChain`](../api/app.md#routechain) lets you declare the path once and chain the verb handlers. An `All` in the chain runs before the verb handlers on that path, acting as route-specific middleware.

```go
app.RouteChain("/events").
    All(func(c fiber.Ctx) error { return c.Next() }). // route-local middleware
    Get(func(c fiber.Ctx) error { return c.SendString("GET /events") }).
    Post(func(c fiber.Ctx) error { return c.SendString("POST /events") })
```

:::note
Within a chain, `All` registers prefix-matched middleware (like [`app.Use`](../api/app.md#use)), not the exact-path `App.All`, so it also runs for sub-paths of the chain path.
:::

---
id: reverse-proxy
title: 🔄 Reverse Proxy Configuration
description: >-
  Learn how to set up reverse proxies like Nginx or Traefik to enable modern
  HTTP capabilities in your Fiber application, including HTTP/2 and
  HTTP/3 (QUIC) support. This guide also covers basic reverse
  proxy configuration and links to external documentation.
sidebar_position: 4
---

## Reverse Proxies

Running Fiber behind a reverse proxy is a common production setup.
Reverse proxies can handle:

- **HTTPS/TLS termination** (offloading SSL certificates)
- **Protocol upgrades** (HTTP/2, HTTP/3 support)
- **Request routing & load balancing**
- **Caching & compression**
- **Security features** (rate limiting, WAF, DDoS mitigation)

Some Fiber features (like [`SendEarlyHints`](../api/ctx.md#sendearlyhints)) require **HTTP/2 or newer**, which is easiest to enable using a reverse proxy.

### Popular Reverse Proxies

- [Nginx](https://nginx.org/)
- [Traefik](https://traefik.io/)
- [HA PROXY](https://www.haproxy.com/)
- [Caddy](https://caddyserver.com/)

## Getting the Real Client IP Address

When your Fiber application is behind a reverse proxy, the TCP connection comes from the proxy server, not the actual client. To get the real client IP address, you need to configure Fiber to read it from proxy headers like `X-Forwarded-For`.

:::warning Security Warning
Proxy headers can be easily spoofed by malicious clients. **Always** configure `TrustProxyConfig` to validate the proxy IP address, otherwise attackers can forge headers to bypass IP-based access controls, rate limiting, or geolocation features.

In addition, your reverse proxy should be configured to **set or overwrite** the forwarding header you choose (for example, `X-Forwarded-For`) based on the real client connection, or to use its real IP / PROXY protocol features. Do not simply pass through client-supplied forwarding headers, or `c.IP()` may still be controlled by an attacker even when `TrustProxyConfig` is correct.
:::

:::info Chain parsing with `EnableIPValidation`
`X-Forwarded-For` is a comma-separated chain that each proxy appends to. With `EnableIPValidation` enabled, `c.IP()` walks the chain from **right to left** and strips every IP that matches the configured `TrustProxyConfig`. The first non-trusted IP is returned as the client. This matches the [MDN guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For#selecting_an_ip_address) and the convention used by Nginx (`set_real_ip_from` + `real_ip_recursive`), Apache `mod_remoteip`, Envoy (`xff_num_trusted_hops`), and most CDNs.

Without `EnableIPValidation`, `c.IP()` returns the raw header value (a comma-separated string), which is rarely what middleware like rate limiters or allowlists expect. Enable validation when you rely on `c.IP()` as a single client identifier.
:::

### Configuration

To enable reading the client IP from proxy headers, you must configure **three settings**:

1. **`TrustProxy`** - Enable proxy header trust (must be `true`)
2. **`ProxyHeader`** - Specify which header contains the client IP
3. **`TrustProxyConfig`** - Define which proxy IPs to trust

```go title="Example - App Behind Nginx"
app := fiber.New(fiber.Config{
    // Enable proxy support
    TrustProxy: true,

    // Read client IP from X-Forwarded-For header
    ProxyHeader: fiber.HeaderXForwardedFor,

    // Trust requests from your Nginx proxy
    TrustProxyConfig: fiber.TrustProxyConfig{
        // Option 1: Trust specific proxy IPs
        Proxies: []string{"10.10.0.58", "192.168.1.0/24"},

        // Option 2: Or trust all private IPs (useful for internal load balancers)
        // Private: true,
    },
})
```

### Common Proxy Headers

Different proxies use different headers:

| Proxy/Service | Recommended Header | Config Value |
|---------------|-------------------|--------------|
| Nginx, HAProxy, Apache | X-Forwarded-For | `fiber.HeaderXForwardedFor` |
| Cloudflare | CF-Connecting-IP | `"CF-Connecting-IP"` |
| Fastly | Fastly-Client-IP | `"Fastly-Client-IP"` |
| Generic | X-Real-IP | `"X-Real-IP"` |

### TrustProxyConfig Options

The `TrustProxyConfig` struct provides multiple ways to specify trusted proxies:

```go
TrustProxyConfig: fiber.TrustProxyConfig{
    // Specific IPs or CIDR ranges
    Proxies: []string{
        "10.10.0.58",           // Single IP
        "192.168.0.0/24",       // CIDR range
        "2001:db8::/32",        // IPv6 range
    },

    // Or use convenience flags:
    Loopback:   true,  // Trust 127.0.0.0/8, ::1/128
    LinkLocal:  true,  // Trust 169.254.0.0/16, fe80::/10
    Private:    true,  // Trust 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
    UnixSocket: true,  // Trust Unix domain socket connections
},
```

### Complete Example with Nginx

```nginx title="nginx.conf"
server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        # Overwrite untrusted inbound forwarding headers at the edge.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```go title="main.go"
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
)

func main() {
    app := fiber.New(fiber.Config{
        TrustProxy:        true,
        ProxyHeader:       fiber.HeaderXForwardedFor,
        EnableIPValidation: true,
        TrustProxyConfig: fiber.TrustProxyConfig{
            // Trust localhost since Nginx is on the same machine
            Loopback: true,
        },
    })

    app.Get("/", func(c fiber.Ctx) error {
        // This will now return the real client IP from X-Forwarded-For
        // instead of 127.0.0.1
        return c.SendString("Your IP: " + c.IP())
    })

    log.Fatal(app.Listen(":3000"))
}
```

### Testing Your Configuration

You can verify your configuration is working:

```go
app.Get("/debug", func(c fiber.Ctx) error {
    return c.JSON(fiber.Map{
        "c.IP()":           c.IP(),                    // Should show real client IP
        "X-Forwarded-For":  c.Get("X-Forwarded-For"),  // Raw header value
        "IsProxyTrusted":   c.IsProxyTrusted(),        // Should be true
        "RemoteIP":         c.RequestCtx().RemoteIP().String(), // Proxy IP
    })
})
```

## Enabling HTTP/2

Popular choices include Nginx and Traefik.

<details>
<summary>Nginx Example</summary>

See the [Complete Example with Nginx](#complete-example-with-nginx) above for a full configuration with HTTP/2 enabled.
</details>
<details>
<summary>Traefik Example</summary>

```yaml title="traefik.yaml"
entryPoints:
  websecure:
    address: ":443"

http:
  routers:
    app:
      rule: "Host(`example.com`)"
      entryPoints:
        - websecure
      service: app
      tls: {}

  services:
    app:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"
```

With this configuration, Traefik terminates TLS and serves your app over HTTP/2.
</details>

## HTTP/3 (QUIC) Support

Early Hints (103 responses) are defined for HTTP and can be delivered over HTTP/1.1 and HTTP/2/3. In practice, browsers process 103 most reliably over HTTP/2/3. Many reverse proxies also support HTTP/3 (QUIC):

- **Nginx**
- **Traefik**

Enabling HTTP/3 is optional but can provide lower latency and improved performance for clients that support it. If you enable HTTP/3, your Early Hints responses will still work as expected.
For more details, see the official documentation:

- [Nginx QUIC / HTTP/3](https://nginx.org/en/docs/quic.html)
- [Traefik HTTP/3](https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/#http3)

---
id: routing
title: 🔌 Routing
description: >-
  Routing refers to how an application's endpoints (URIs) respond to client
  requests.
sidebar_position: 1
toc_max_heading_level: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import RoutingHandler from './../partials/routing/handler.md';
import RoutingUse from './../partials/routing/use.md';
import RoutingHandlerTypes from './../partials/routing/handler-types.md';
import RouteAnatomy from '@site/src/components/route-anatomy';

## Anatomy of a route

A route ties together an HTTP method, a path, and one or more handlers. Hover or click any colored part to jump to the section that explains it:

<RouteAnatomy />

`Get` is the [routing method](#route-handlers), `"/users/:id"` is the [route path](#paths) (the resource, in REST terms) with `:id` a [route parameter](#parameters), and `func(c fiber.Ctx) error` is the [handler](#handler-types) (or [middleware](#middleware)) run when the route matches.

## Route Handlers

<RoutingHandler />

Here is a complete, runnable app for context:

```go title="A minimal Fiber app"
package main

import "github.com/gofiber/fiber/v3"

func main() {
    app := fiber.New()

    app.Get("/", func(c fiber.Ctx) error {
        return c.SendString("Hello, World!")
    })

    app.Listen(":3000")
}
```

In the shorter examples throughout this guide, `app` is the `*fiber.App` returned by `fiber.New()`, and `handler`/`middleware` stand in for any `func(c fiber.Ctx) error`. Snippets that call `fmt.Println` or `fmt.Fprintf` also need `import "fmt"`.

Beyond the native `func(fiber.Ctx)` forms, Fiber also adapts Express-style, `net/http`, and `fasthttp` handlers. See [Handler types](#handler-types) at the end of this guide for the full list of supported shapes.

## Get vs Use vs All

`Get` (and the other method helpers like `Post` and `Put`) match a **single HTTP method** at an **exact path**. `All` matches an **exact path** across **every** HTTP method. `Use` registers **middleware** that matches by **prefix** and runs in **declaration order**, calling [`c.Next()`](../api/ctx.md#next) to continue the chain.

<Tabs>
<TabItem value="get" label="Get (one method)">

```go
app.Get("/users", func(c fiber.Ctx) error {
    return c.SendString("GET /users")
})

// GET    /users      -> "GET /users"
// POST   /users      -> 405 Method Not Allowed
// GET    /users/42   -> 404 Not Found  (exact match only)
```

</TabItem>
<TabItem value="all" label="All (every method)">

```go
app.All("/ping", func(c fiber.Ctx) error {
    return c.SendString(c.Method() + " /ping")
})

// GET    /ping        -> "GET /ping"
// POST   /ping        -> "POST /ping"
// DELETE /ping        -> "DELETE /ping"
// GET    /ping/extra  -> 404 Not Found  (still exact path)
```

</TabItem>
<TabItem value="use" label="Use (prefix middleware)">

```go
// Empty Use: no path -> matches every request, any method, any path
app.Use(func(c fiber.Ctx) error {
    c.Set("X-Powered-By", "Fiber")
    return c.Next()
})

// Prefixed Use: matches the prefix and anything below a slash boundary
app.Use("/api", func(c fiber.Ctx) error {
    return c.Next()
})

// The empty Use above runs for ALL of these. The notes below show which
// requests ALSO match the prefixed "/api" Use:
// /api        -> also matches "/api" Use   (exact prefix)
// /api/users  -> also matches "/api" Use   (slash boundary)
// /apiv2      -> empty Use only             (no slash boundary)
// /anything   -> empty Use only
```

</TabItem>
<TabItem value="chain" label="Ordered chain">

Multiple handlers that match the same request run in the order you declare them. Each must call `c.Next()` to pass control to the next; if one returns without calling it, the rest of the chain is skipped.

```go
app.Use("/api", func(c fiber.Ctx) error {
    fmt.Println("1: auth check")
    return c.Next()
})

app.Use("/api", func(c fiber.Ctx) error {
    fmt.Println("2: logging")
    return c.Next()
})

app.Get("/api/users", func(c fiber.Ctx) error {
    fmt.Println("3: handler")
    return c.SendString("users")
})

// GET /api/users prints, in order:
//   1: auth check
//   2: logging
//   3: handler
```

</TabItem>
<TabItem value="multi" label="Multiple handlers in one call">

Attach several handlers in a single registration: list the route-specific middleware before the business handler.

```go
app.Get("/users/:id",
    func(c fiber.Ctx) error { // 1: require authentication
        if c.Get("Authorization") == "" {
            return c.SendStatus(fiber.StatusUnauthorized) // returns without c.Next(): stops here
        }
        return c.Next()
    },
    func(c fiber.Ctx) error { // 2: stash data for downstream handlers
        c.Locals("userID", c.Params("id"))
        return c.Next()
    },
    func(c fiber.Ctx) error { // 3: business handler reads the stashed value
        return c.SendString("user " + c.Locals("userID").(string))
    },
)

// GET /users/42 (no Authorization header) -> 401, handlers 2 and 3 never run
// GET /users/42 (with Authorization)      -> "user 42"
```

</TabItem>
</Tabs>

| Helper         | Methods matched | Path matching                              | Typical use                   |
| -------------- | --------------- | ------------------------------------------ | ----------------------------- |
| `Get`/`Post`/… | one             | exact                                      | a specific endpoint           |
| `All`          | every method    | exact                                      | one path, any verb            |
| `Use`          | every method    | prefix (slash boundary); all paths if none given | middleware, mounting sub-apps |

A path that exists only for a different method returns **405 Method Not Allowed**; a path that matches no route at all (including one rejected by a [constraint](#constraints)) returns **404 Not Found**.

## Paths

A route path paired with an HTTP method defines an endpoint. It can be a plain **string** or a **pattern**.

```go
// This route path will match requests to the root route, "/":
app.Get("/", func(c fiber.Ctx) error {
    return c.SendString("root")
})

// This route path will match requests to "/about":
app.Get("/about", func(c fiber.Ctx) error {
    return c.SendString("about")
})

// This route path will match requests to "/random.txt":
app.Get("/random.txt", func(c fiber.Ctx) error {
    return c.SendString("random.txt")
})
```

The order in which you declare routes matters: like Express.js, routes are matched in registration order (first match wins), so declare more specific paths before those that contain parameters. Note that method helpers such as `Get` match the exact path only.

:::info
Place routes with variable parameters after fixed paths to avoid unintended matches.
:::

## Parameters

Route parameters are dynamic segments in a path, either named or unnamed, used to capture values from the URL. Retrieve them with the [Params](../api/ctx.md#params) function using the parameter name or, for unnamed parameters, the wildcard (`*`) or plus (`+`) symbol with an index.

The characters `:`, `+`, and `*` introduce parameters. Append `?` to a named segment to make it optional. `+` is a greedy, required wildcard (it must match at least one character); `*` is a greedy, optional wildcard (it can match nothing).

<Tabs>
<TabItem value="named" label="Named, optional, greedy">

```go
// Named parameters
app.Get("/user/:name/books/:title", func(c fiber.Ctx) error {
    fmt.Fprintf(c, "%s\n", c.Params("name"))
    fmt.Fprintf(c, "%s\n", c.Params("title"))
    return nil
})

// Plus - greedy, required (matches at least one character)
app.Get("/user/+", func(c fiber.Ctx) error {
    return c.SendString(c.Params("+"))
})

// Optional named parameter
app.Get("/user/:name?", func(c fiber.Ctx) error {
    return c.SendString(c.Params("name"))
})

// Wildcard - greedy, optional (may match nothing)
app.Get("/user/*", func(c fiber.Ctx) error {
    return c.SendString(c.Params("*"))
})
```

</TabItem>
<TabItem value="literal" label="Literal separators">

The hyphen (`-`), dot (`.`), and colon (`:`) are treated literally between parameters, so you can combine them with route parameters. Fiber's router detects when these characters belong to the literal path.

```go
// http://localhost:3000/plantae/prunus.persica
app.Get("/plantae/:genus.:species", func(c fiber.Ctx) error {
    fmt.Fprintf(c, "%s.%s\n", c.Params("genus"), c.Params("species"))
    return nil // prunus.persica
})

// http://localhost:3000/flights/LAX-SFO
app.Get("/flights/:from-:to", func(c fiber.Ctx) error {
    fmt.Fprintf(c, "%s-%s\n", c.Params("from"), c.Params("to"))
    return nil // LAX-SFO
})

// http://localhost:3000/shop/product/color:blue/size:xs
app.Get("/shop/product/color::color/size::size", func(c fiber.Ctx) error {
    fmt.Fprintf(c, "%s:%s\n", c.Params("color"), c.Params("size"))
    return nil // blue:xs
})
```

</TabItem>
<TabItem value="escaped" label="Escaped characters">

Escape special parameter characters with `\\` to treat them literally. This is useful for custom methods like those in the [Google API Design Guide](https://cloud.google.com/apis/design/custom_methods). Wrap routes in backticks to keep escape sequences clear.

```go
// Matches "/v1/some/resource/name:customVerb" because the colon is escaped
app.Get(`/v1/some/resource/name\:customVerb`, func(c fiber.Ctx) error {
    return c.SendString("Hello, Community")
})
```

</TabItem>
<TabItem value="multi" label="Multiple params per segment">

You can chain multiple named or unnamed parameters, including wildcard and plus segments, within a single segment.

```go
// GET /@v1
// Params: "sign" -> "@", "param" -> "v1"
app.Get("/:sign:param", handler)

// GET /api-v1
// Params: "name" -> "v1"
app.Get("/api-:name", handler)

// GET /customer/v1/cart/proxy
// Params: "*1" -> "customer/", "*2" -> "/cart"
app.Get("/*v1*/proxy", handler)

// GET /v1/brand/4/shop/blue/xs
// Params: "*1" -> "brand/4", "*2" -> "blue/xs"
app.Get("/v1/*/shop/*", handler)
```

:::info
Fiber lets multiple parameters share a single path segment, unlike routers such as Express, Gin, and Echo where `:param` always consumes a whole segment. When named parameters are adjacent, each leading one captures a single character and the last captures the rest. This does not raise an error, so an unexpected pattern silently captures differently than you might assume.
:::

</TabItem>
</Tabs>

When a route has several wildcard (`*`) or plus (`+`) segments, retrieve them positionally with a 1-based index matching the symbol: `c.Params("*1")` and `c.Params("*2")` for wildcards, `c.Params("+1")` and `c.Params("+2")` for plus segments. A single wildcard or plus is just `c.Params("*")` or `c.Params("+")`.

Fiber's routing is inspired by Express but intentionally omits regex route patterns due to their performance cost. To validate a parameter against a regular expression, use the [`regex()` constraint](#constraints) described below.

### Constraints

Route constraints execute when a match has occurred to the incoming URL and the URL path is tokenized into route values by parameters. The feature was introduced in `v2.37.0` and inspired by [.NET Core](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-6.0#route-constraints).

:::caution
Constraints are matching rules, not input validation: if a value fails a constraint, the route simply does not match and Fiber returns **404 Not Found**.
:::

| Constraint        | Example                          | Example matches                                                                             |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| int               | `:id<int>`                       | 123456789, -123456789                                                                       |
| bool              | `:active<bool>`                  | true,false                                                                                  |
| guid              | `:id<guid>`                      | CD2C1638-1638-72D5-1638-DEADBEEF1638                                                        |
| float             | `:weight<float>`                 | 1.234, -1001.01e8, 3.14                                                                     |
| minLen(value)     | `:username<minLen(4)>`           | Test (must be at least 4 characters)                                                        |
| maxLen(value)     | `:filename<maxLen(8)>`           | MyFile (must be no more than 8 characters)                                                  |
| len(length)       | `:filename<len(12)>`             | somefile.txt (exactly 12 characters)                                                        |
| min(value)        | `:age<min(18)>`                  | 19 (Integer value must be at least 18)                                                      |
| max(value)        | `:age<max(120)>`                 | 91 (Integer value must be no more than 120)                                                 |
| range(min,max)    | `:age<range(18,120)>`            | 91 (Integer value must be at least 18 but no more than 120)                                 |
| alpha             | `:name<alpha>`                   | Rick (String must consist of one or more alphabetical characters, a-z and case-insensitive) |
| datetime          | `:dob<datetime(2006\\-01\\-02)>` | 2005-11-01                                                                                  |
| regex(expression) | `:date<regex(\d{4}-\d{2}-\d{2})>` | 2022-08-27 (Must match regular expression)                                                  |

#### Examples

<Tabs>
<TabItem value="single-constraint" label="Single Constraint">

```go
app.Get("/:test<min(5)>", func(c fiber.Ctx) error {
    return c.SendString(c.Params("test"))
})

// curl -X GET http://localhost:3000/12
// 12

// curl -X GET http://localhost:3000/1
// Not Found
```

</TabItem>
<TabItem value="multiple-constraints" label="Multiple Constraints">

You can use `;` for multiple constraints.

```go
app.Get("/:test<min(100);maxLen(5)>", func(c fiber.Ctx) error {
    return c.SendString(c.Params("test"))
})

// curl -X GET http://localhost:3000/120000
// Not Found

// curl -X GET http://localhost:3000/1
// Not Found

// curl -X GET http://localhost:3000/250
// 250
```

</TabItem>
<TabItem value="regex-constraint" label="Regex Constraint">

Fiber precompiles the regex when registering routes, so the pattern is matched (not recompiled) on each request.

```go
app.Get(`/:date<regex(\d{4}-\d{2}-\d{2})>`, func(c fiber.Ctx) error {
    return c.SendString(c.Params("date"))
})

// curl -X GET http://localhost:3000/125
// Not Found

// curl -X GET http://localhost:3000/test
// Not Found

// curl -X GET http://localhost:3000/2022-08-27
// 2022-08-27
```

</TabItem>
</Tabs>

:::caution
When using the datetime constraint, prefix routing characters (`*`, `+`, `?`, `:`, `/`, `<`, `>`, `;`, `(`, `)`) with `\\` to avoid misparsing.
:::

#### Optional Parameter Example

You can impose constraints on optional parameters as well.

```go
app.Get("/:test<int>?", func(c fiber.Ctx) error {
  return c.SendString(c.Params("test"))
})
// curl -X GET http://localhost:3000/42
// 42
// curl -X GET http://localhost:3000/
//
// curl -X GET http://localhost:3000/7.0
// Not Found
```

#### Custom Constraint

Custom constraints can be added to Fiber using the `app.RegisterCustomConstraint` method. Your constraints have to be compatible with the `CustomConstraint` interface.

:::caution
Attention, custom constraints can now override built-in constraints. If a custom constraint has the same name as a built-in constraint, the custom constraint will be used instead. This allows for more flexibility in defining route parameter constraints.
:::

Add external constraints when you need stricter rules, such as verifying that a parameter is a valid ULID.

```go
// CustomConstraint is an interface for custom constraints
type CustomConstraint interface {
    // Name returns the name of the constraint.
    // This name is used in the constraint matching.
    Name() string

    // Execute executes the constraint.
    // It returns true if the constraint is matched and right.
    // param is the parameter value to check.
    // args are the constraint arguments.
    Execute(param string, args ...string) bool
}
```

You can check the example below:

```go
type UlidConstraint struct {
    fiber.CustomConstraint
}

func (*UlidConstraint) Name() string {
    return "ulid"
}

func (*UlidConstraint) Execute(param string, args ...string) bool {
    _, err := ulid.Parse(param)
    return err == nil
}

func main() {
    app := fiber.New()
    app.RegisterCustomConstraint(&UlidConstraint{})

    app.Get("/login/:id<ulid>", func(c fiber.Ctx) error {
        return c.SendString("...")
    })

    app.Listen(":3000")

    // /login/01HK7H9ZE5BFMK348CPYP14S0Z -> 200
    // /login/12345 -> 404
}
```

## Middleware

Functions that are designed to make changes to the request or response are called **middleware functions**. [`c.Next()`](../api/ctx.md#next) passes control to the next handler in the matched chain (middleware or route handler); if a handler returns without calling it, the remaining handlers are skipped.

```go title="Example of a middleware function"
app.Use(func(c fiber.Ctx) error {
    // Set a custom header on all responses:
    c.Set("X-Custom-Header", "Hello, World")

    // Go to next middleware:
    return c.Next()
})

app.Get("/", func(c fiber.Ctx) error {
    return c.SendString("Hello, World!")
})
```

See [Get vs Use vs All](#get-vs-use-vs-all) for how `Use` prefix matching differs from exact route matching, and how multiple handlers run in order.

### Use

<RoutingUse />

### Adding or removing routes at runtime

:::caution
Defining all routes before the app starts is strongly recommended. You can still change them at runtime with [`RebuildTree`](../api/app.md#rebuildtree), [`RemoveRoute`](../api/app.md#removeroute), [`RemoveRouteByName`](../api/app.md#removeroutebyname), and [`RemoveRouteFunc`](../api/app.md#removeroutefunc), but these operations are not thread-safe and are performance-intensive, so use them sparingly and only in development.
:::

## Grouping

If you have many endpoints, you can organize your routes using `Group`.

```go
func main() {
    app := fiber.New()

    api := app.Group("/api", middleware) // /api

    v1 := api.Group("/v1", middleware)   // /api/v1
    v1.Get("/list", handler)             // /api/v1/list
    v1.Get("/user", handler)             // /api/v1/user

    v2 := api.Group("/v2", middleware)   // /api/v2
    v2.Get("/list", handler)             // /api/v2/list
    v2.Get("/user", handler)             // /api/v2/user

    log.Fatal(app.Listen(":3000"))
}
```

More information about this in our [Grouping Guide](./grouping.md).

### Route

[`Route`](../api/app.md#route) is shorthand for [`Group`](#grouping): it scopes a set of routes under a common prefix declared inside a single callback, with an optional name prefix.

```go
app.Route("/api/v1", func(r fiber.Router) {
    r.Get("/users", handler).Name("users")   // /api/v1/users  (name: v1.users)
    r.Post("/users", handler).Name("create") // /api/v1/users  (name: v1.create)
}, "v1.")
```

### RouteChain

When several HTTP methods share the **same path**, [`RouteChain`](../api/app.md#routechain) lets you declare the path once and chain the verb handlers. An `All` in the chain runs before the verb handlers on that path, acting as route-specific middleware.

```go
app.RouteChain("/events").
    All(func(c fiber.Ctx) error { return c.Next() }). // route-local middleware
    Get(func(c fiber.Ctx) error { return c.SendString("GET /events") }).
    Post(func(c fiber.Ctx) error { return c.SendString("POST /events") })
```

:::note
Within a chain, `All` registers prefix-matched middleware (like [`Use`](#use)), not the exact-path `App.All`, so it also runs for sub-paths of the chain path.
:::

Pick the helper that fits: a single endpoint uses `Get`/`Post`/…; a fixed set of methods on one path uses [`Add`](#route-handlers); one path with many methods (fluently) uses `RouteChain`; many paths under a shared prefix use [`Group`](#grouping) or `Route`.

## Automatic HEAD routes

Fiber automatically registers a `HEAD` route for every `GET` route you add. The generated handler chain mirrors the `GET` chain, so `HEAD` requests reuse middleware, status codes, and headers while the response body is suppressed.

```go title="GET handlers automatically expose HEAD"
app := fiber.New()

app.Get("/users/:id", func(c fiber.Ctx) error {
    c.Set("X-User", c.Params("id"))
    return c.SendStatus(fiber.StatusOK)
})

// HEAD /users/:id now returns the same headers and status without a body.
```

You can still register dedicated `HEAD` handlers, even with auto-registration enabled, and Fiber replaces the generated route so your implementation wins:

```go title="Override the generated HEAD handler"
app.Head("/users/:id", func(c fiber.Ctx) error {
    return c.SendStatus(fiber.StatusNoContent)
})
```

To opt out globally, start the app with `DisableHeadAutoRegister`:

```go title="Disable automatic HEAD registration"
handler := func(c fiber.Ctx) error {
    c.Set("X-User", c.Params("id"))
    return c.SendStatus(fiber.StatusOK)
}

app := fiber.New(fiber.Config{DisableHeadAutoRegister: true})
app.Get("/users/:id", handler) // HEAD /users/:id now returns 405 unless you add it manually.
```

Auto-generated `HEAD` routes participate in every router scope, including `Group` hierarchies, mounted sub-apps, parameterized and wildcard paths, and static file helpers. They also appear in route listings such as `app.Stack()` so tooling sees both the `GET` and `HEAD` entries.

## Handler types

<RoutingHandlerTypes />

---
id: utils
title: 🧰 Utils
sidebar_position: 8
toc_max_heading_level: 4
---

## Generics

### Convert

Converts a string to a specific type while handling errors and optional defaults.
It wraps conversion and fallback logic to keep your code clean and consistent.

```go title="Signature"
func Convert[T any](value string, converter func(string) (T, error), defaultValue ...T) (T, error)
```

```go title="Example"
// GET http://example.com/id/bb70ab33-d455-4a03-8d78-d3c1dacae9ff
app.Get("/id/:id", func(c fiber.Ctx) error {
    fiber.Convert(c.Params("id"), uuid.Parse)                   // UUID(bb70ab33-d455-4a03-8d78-d3c1dacae9ff), nil
})

// GET http://example.com/search?id=65f6f54221fb90e6a6b76db7
app.Get("/search", func(c fiber.Ctx) error {
    fiber.Convert(c.Query("id"), mongo.ParseObjectID)           // objectid(65f6f54221fb90e6a6b76db7), nil
    fiber.Convert(c.Query("id"), uuid.Parse)                    // uuid.Nil, error(cannot parse given uuid)
    fiber.Convert(c.Query("id"), uuid.Parse, mongo.NewObjectID) // new object id generated and return nil as error.
    return nil
})

// ...
```

### GetReqHeader

Retrieves an HTTP request header as a specific type using generics.

```go title="Signature"
func GetReqHeader[V GenericType](c Ctx, key string, defaultValue ...V) V
```

```go title="Example"
app.Get("/search", func(c fiber.Ctx) error {
    // curl -X GET http://example.com/search -H "X-Request-ID: 12345" -H "X-Request-Name: John"
    fiber.GetReqHeader[int](c, "X-Request-ID")               // => returns 12345 as integer.
    fiber.GetReqHeader[string](c, "X-Request-Name")          // => returns "John" as string.
    fiber.GetReqHeader[string](c, "unknownParam", "default") // => returns "default" as string.
    // ...
})
```

### Locals

Reads or writes local values in the request context using generics.

```go title="Signature"
// Set a value
func Locals[V any](c Ctx, key any, value ...V) V
// Get a value
func Locals[V any](c Ctx, key any) V
```

```go title="Example"
app.Use("/user/:user/:id", func(c fiber.Ctx) error {
    // set local values
    fiber.Locals[string](c, "user", "john")
    fiber.Locals[int](c, "id", 25)
    // ...
    
    return c.Next()
})


app.Get("/user/*", func(c fiber.Ctx) error {
    // get local values
    name := fiber.Locals[string](c, "user") // john
    age := fiber.Locals[int](c, "id")       // 25
    // ...
})
```

### Params

Retrieves route parameters as a specific type.

```go title="Signature"
func Params[V GenericType](c Ctx, key string, defaultValue ...V) V
```

```go title="Example"
app.Get("/user/:user/:id", func(c fiber.Ctx) error {
    // http://example.com/user/john/25
    fiber.Params[int](c, "id")               // => returns 25 as integer.
    fiber.Params[int](c, "unknownParam", 99) // => returns the default 99 as integer.
    // ...
    return c.SendString("Hello, " + fiber.Params[string](c, "user"))
})
```

### Query

Retrieves query parameters as a specific type.

```go title="Signature"
func Query[V GenericType](c Ctx, key string, defaultValue ...V) V
```

```go title="Example"
app.Get("/search", func(c fiber.Ctx) error {
    // http://example.com/search?name=john&age=25
    fiber.Query[string](c, "name")                    // => returns "john"
    fiber.Query[int](c, "age")                        // => returns 25 as integer.
    fiber.Query[string](c, "unknownParam", "default") // => returns "default" as string.
    // ...
})
```

### RoutePatternMatch

Checks whether a given path matches a Fiber route pattern. Useful for testing
patterns without registering them. Patterns may contain parameters, wildcards
and optional segments. An optional `Config` allows control over case sensitivity
and strict routing.

```go title="Signature"
func RoutePatternMatch(path, pattern string, cfg ...Config) bool
```

```go title="Example"
fiber.RoutePatternMatch("/user/john", "/user/:name") // true

fiber.RoutePatternMatch(
    "/User/john",
    "/user/:name",
    fiber.Config{CaseSensitive: true},
) // false
```

---
id: validation
title: 🔎 Validation
sidebar_position: 5
---

## Validator package

Fiber's [Bind](../api/bind.md#validation) function binds request data to a struct and validates it.

```go title="Basic Example"
import "github.com/go-playground/validator/v10"

type structValidator struct {
    validate *validator.Validate
}

// Validator needs to implement the Validate method
func (v *structValidator) Validate(out any) error {
    return v.validate.Struct(out)
}

// Set up your validator in the config
app := fiber.New(fiber.Config{
    StructValidator: &structValidator{validate: validator.New()},
})

// Note:
// StructValidator runs only for struct destinations (or pointers to structs).
// Binding into maps and other non-struct types skips validation.

type User struct {
    Name string `json:"name" form:"name" query:"name" validate:"required"`
    Age  int    `json:"age" form:"age" query:"age" validate:"gte=0,lte=100"`
}

app.Post("/", func(c fiber.Ctx) error {
    user := new(User)
    
    // Works with all bind methods—Body, Query, Form, etc.
    if err := c.Bind().Body(user); err != nil { // validation errors are returned here
        return err
    }
    
    return c.JSON(user)
})
```

```go title="Advanced Validation Example"
type User struct {
    Name     string `json:"name" validate:"required,min=3,max=32"`
    Email    string `json:"email" validate:"required,email"`
    Age      int    `json:"age" validate:"gte=0,lte=100"`
    Password string `json:"password" validate:"required,min=8"`
    Website  string `json:"website" validate:"url"`
}

// Custom validation error messages
type UserWithCustomMessages struct {
    Name     string `json:"name" validate:"required,min=3,max=32" message:"Name is required and must be between 3 and 32 characters"`
    Email    string `json:"email" validate:"required,email" message:"Valid email is required"`
    Age      int    `json:"age" validate:"gte=0,lte=100" message:"Age must be between 0 and 100"`
}

app.Post("/user", func(c fiber.Ctx) error {
    user := new(User)
    
    if err := c.Bind().Body(user); err != nil {
        // Handle validation errors
        if validationErrors, ok := err.(validator.ValidationErrors); ok {
            for _, e := range validationErrors {
                // e.Field() - field name
                // e.Tag() - validation tag
                // e.Value() - invalid value
                // e.Param() - validation parameter
                return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                    "field": e.Field(),
                    "error": e.Error(),
                })
            }
        }
        return err
    }
    
    return c.JSON(user)
})
```

```go title="Custom Validator Example"
// Custom validator for password strength
type PasswordValidator struct {
    validate *validator.Validate
}

func (v *PasswordValidator) Validate(out any) error {
    if err := v.validate.Struct(out); err != nil {
        return err
    }
    
    // Custom password validation logic
    if user, ok := out.(*User); ok {
        if len(user.Password) < 8 {
            return errors.New("password must be at least 8 characters")
        }
        // Add more password validation rules here
    }
    
    return nil
}

// Usage
app := fiber.New(fiber.Config{
    StructValidator: &PasswordValidator{validate: validator.New()},
})
```


adaptor
basicauth
cache
compress
cors
csrf
earlydata
encryptcookie
envvar
etag
expvar
favicon
healthcheck
helmet
hostauthorization
idempotency
keyauth
limiter
logger
paginate
pprof
proxy
recover
redirect
requestid
responsetime
rewrite
session
skip
sse
static
timeout
