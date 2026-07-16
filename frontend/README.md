# Z-Games frontend

React 19 application built with TanStack Start, TanStack Router, TanStack Query,
TanStack Store, shadcn/ui, and Tailwind CSS v4.

Read [`DESIGN.md`](./DESIGN.md) before changing UI and the pinned documentation
under [`../docs/tanstack`](../docs/tanstack) before changing TanStack code. The
repository-level [`README.md`](../README.md) contains setup and verification
commands.

Feature code belongs in `src/features/<feature>`. File routes in `src/routes`
own navigation, loaders, and route-level loading/error boundaries. Reuse the
primitives in `src/components/ui`; add missing primitives through shadcn rather
than hand-rolling replacements.
