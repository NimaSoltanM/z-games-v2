import ReactDOM from 'react-dom/client'
import { createStore, useSelector } from '@tanstack/react-store'

// You can use instantiate a Store outside of React components too!
export const store = createStore({
dogs: 0,
cats: 0,
})

interface DisplayProps {
animal: 'dogs' | 'cats'
}

// This will only re-render when `state[animal]` changes. If an unrelated store property changes, it won't re-render
const Display = ({ animal }: DisplayProps) => {
const count = useSelector(store, (state) => state[animal]) // formerly, useStore. Now renamed to useSelector.
return <div>{`${animal}: ${count}`}</div>
}

const updateState = (animal: 'dogs' | 'cats') => {
store.setState((state: { dogs: number; cats: number }) => {
return {
...state,
[animal]: state[animal] + 1,
}
})
}

interface IncrementProps {
animal: 'dogs' | 'cats'
}

const Increment = ({ animal }: IncrementProps) => (
<button onClick={() => updateState(animal)}>My Friend Likes {animal}</button>
)

function App() {
return (

<div>
<h1>How many of your friends like cats or dogs?</h1>
<p>
Press one of the buttons to add a counter of how many of your friends
like cats or dogs
</p>
<Increment animal="dogs" />
<Display animal="dogs" />
<Increment animal="cats" />
<Display animal="cats" />
</div>
)
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

import ReactDOM from 'react-dom/client'
import {
createAtom,
useAtom,
// useCreateAtom,
useSelector,
} from '@tanstack/react-store'

// Optionally, you can create atoms outside of React components at module scope
const countAtom = createAtom(0)

function App() {
// or define atoms inside of components with hook variant. You would have to pass atom as props or use store context though.
// const countAtom = useCreateAtom(0)

return (

<main>
<h1>React Atom Hooks</h1>
<p>
This example creates a module-level atom and reads and updates it with
the React hooks.
</p>
<AtomValuePanel />
<AtomButtons />
<AtomStepper />
</main>
)
}

function AtomValuePanel() {
const count = useSelector(countAtom) // useSelector with no selector re-renders when the value changes. Useful for read-only access to an atom.

return <p>Total: {count}</p>
}

function AtomButtons() {
return (

<div>
<button type="button" onClick={() => countAtom.set((prev) => prev + 1)}>
Increment
</button>
<button type="button" onClick={() => countAtom.set(0)}>
Reset
</button>
</div>
)
}

function AtomStepper() {
const [count, setCount] = useAtom(countAtom) // read and write access to the atom. Re-renders when the value changes.

return (

<div>
<p>Editable count: {count}</p>
<button type="button" onClick={() => setCount((prev) => prev + 5)}>
Add 5 with useAtom
</button>
</div>
)
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

import ReactDOM from 'react-dom/client'
import { createStore, useSelector } from '@tanstack/react-store'

// Optionally, you can create stores outside of React components at module scope
const petStore = createStore({
cats: 0,
dogs: 0,
})

function App() {
// or define stores inside of components with hook variant. You would have to pass store as props or use store context though.
// const petStore = useCreateStore(...)

return (

<main>
<h1>React Store Hooks</h1>
<p>
This example creates a module-level store. Components read state with
`useSelector` and update it directly with `store.setState`.
</p>
<CatsCard />
<DogsCard />
<TotalCard />
<StoreButtons />
</main>
)
}

function CatsCard() {
// read state slice (only re-renders when the selected value changes)
const value = useSelector(petStore, (state) => state.cats)

return <p>Cats: {value}</p>
}

function DogsCard() {
// read state slice (only re-renders when the selected value changes)
const value = useSelector(petStore, (state) => state.dogs)

return <p>Dogs: {value}</p>
}

function StoreButtons() {
return (

<div>
<button
type="button"
onClick={() =>
petStore.setState((prev) => ({
...prev,
cats: prev.cats + 1,
}))
} >
Add cat
</button>
<button
type="button"
onClick={() =>
// directly update values in the store
petStore.setState((prev) => ({
...prev,
dogs: prev.dogs + 1,
}))
} >
Add dog
</button>
</div>
)
}

function TotalCard() {
const total = useSelector(petStore, (state) => state.cats + state.dogs)

return <p>Total votes: {total}</p>
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

import ReactDOM from 'react-dom/client'
import { createStore, \_useStore, useSelector } from '@tanstack/react-store'

// Optionally, you can create stores outside of React components at module scope
const petStore = createStore(
{
cats: 0,
dogs: 0,
},
({ setState, get }) =>
// optionally, define actions for updating your store in specific ways right on the store.
({
addCat: () =>
setState((prev) => ({
...prev,
cats: prev.cats + 1,
})),
addDog: () =>
setState((prev) => ({
...prev,
dogs: prev.dogs + 1,
})),
log: () => console.log(get()),
}),
)

function App() {
// or define stores inside of components with hook variant. You would have to pass store as props or use store context though.
// const petStore = useCreateStore(...)

return (

<main>
<button onClick={petStore.actions.log}>Log State</button>
<h1>React Store Actions</h1>
<p>
This example creates a module-level store with actions. Components read
state with <code>useSelector</code> and call mutations through{' '}
<code>store.actions</code> or the experimental <code>\_useStore</code>{' '}
hook.
</p>
<CatVoter />
<DogVoter />
<TotalCard />
</main>
)
}

function CatVoter() {
const cats = useSelector(petStore, (state) => state.cats)
const { addCat } = petStore.actions

return (

<div>
<p>Cats: {cats}</p>
<button type="button" onClick={() => addCat()}>
Vote for cats
</button>
</div>
)
}

function DogVoter() {
// \_useStore gives both the selected state and actions in a single tuple
const [dogs, { addDog }] = \_useStore(petStore, (state) => state.dogs)

return (

<div>
<p>Dogs: {dogs}</p>
<button type="button" onClick={() => addDog()}>
Vote for dogs
</button>
</div>
)
}

function TotalCard() {
const total = useSelector(petStore, (state) => state.cats + state.dogs)

return <p>Total votes: {total}</p>
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

import ReactDOM from 'react-dom/client'
import {
useAtom,
useCreateAtom,
createStoreContext,
useCreateStore,
useSelector,
} from '@tanstack/react-store'
import type { Atom, Store } from '@tanstack/react-store'

// one drawback of storing stores and atoms in context is you have to define types for the context manually, instead of everything being inferred.

type CounterStore = {
cats: number
dogs: number
}

type StoreContextValue = {
votesStore: Store<CounterStore>
countAtom: Atom<number>
}

// create context provider and hook
const { StoreProvider, useStoreContext } =
createStoreContext<StoreContextValue>()

// top-level app component with provider
function App() {
// create the store
const votesStore = useCreateStore<CounterStore>({
cats: 0,
dogs: 0,
})
// create the atom
const countAtom = useCreateAtom(0)

return (
// provide both the store and atom in a single context object
<StoreProvider value={{ votesStore, countAtom }}>
<main>
<h1>React Store Context</h1>
<p>
This example provides both atoms and stores through a single typed
context object, then consumes them from nested components.
</p>
<CatCard />
<DogCard />
<TotalCard />
<StoreButtons />
<section>
<h2>Nested Atom Components</h2>
<AtomSummary />
<NestedAtomControls />
<DeepAtomEditor />
</section>
</main>
</StoreProvider>
)
}

function CatCard() {
// pull a store from context
const { votesStore } = useStoreContext()
// select a value from the store with useSelector
const value = useSelector(votesStore, (state) => state.cats)

return <p>Cats: {value}</p>
}

function DogCard() {
// pull a store from context
const { votesStore } = useStoreContext()
// select a value from the store with useSelector
const value = useSelector(votesStore, (state) => state.dogs)

return <p>Dogs: {value}</p>
}

function TotalCard() {
// pull a store from context
const { votesStore } = useStoreContext()
// custom selector to calculate total votes from the store state
const total = useSelector(votesStore, (state) => state.cats + state.dogs)

return <p>Total votes: {total}</p>
}

function AtomSummary() {
// pull an atom from context
const { countAtom } = useStoreContext()
const count = useSelector(countAtom)

return <p>Atom count: {count}</p>
}

function NestedAtomControls() {
const { countAtom } = useStoreContext()

return (
<div>
<button type="button" onClick={() => countAtom.set((prev) => prev + 1)}>
Increment atom
</button>
<button type="button" onClick={() => countAtom.set(0)}>
Reset atom
</button>
</div>
)
}

function DeepAtomEditor() {
const { countAtom } = useStoreContext()
const [count, setCount] = useAtom(countAtom)

return (
<div>
<p>Editable atom count: {count}</p>
<button type="button" onClick={() => setCount((prev) => prev + 5)}>
Add 5 to atom
</button>
</div>
)
}

function StoreButtons() {
const { votesStore } = useStoreContext()

return (
<div>
<button
type="button"
onClick={() =>
votesStore.setState((prev) => ({
...prev,
cats: prev.cats + 1,
}))
} >
Add cat
</button>
<button
type="button"
onClick={() =>
votesStore.setState((prev) => ({
...prev,
dogs: prev.dogs + 1,
}))
} >
Add dog
</button>
</div>
)
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
