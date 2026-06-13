import { createFileRoute } from "@tanstack/react-router"
import { createStore, useSelector } from "@tanstack/react-store"
import { Button } from "@/components/ui/button"

// Store lives outside React — shared across any component that imports it
const counterStore = createStore({ count: 0 })

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <div className="flex min-h-svh items-center justify-center gap-8">
      <Counter />
      <Display />
    </div>
  )
}

// Only re-renders when count changes
function Display() {
  const count = useSelector(counterStore, (state) => state.count)
  return <p className="text-4xl font-bold tabular-nums">{count}</p>
}

// Never re-renders (reads nothing from the store)
function Counter() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => counterStore.setState((s) => ({ ...s, count: s.count - 1 }))}>−</Button>
      <Button onClick={() => counterStore.setState((s) => ({ ...s, count: s.count + 1 }))}>+</Button>
    </div>
  )
}
