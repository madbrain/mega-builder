import { NFANode } from "./build-automaton"
import { PickOne, Union2Tuple } from "./utils"

type ExpandState = {
    nodes: { [k: number]: boolean }
    toVisit: number[]
}

type PendingDFA = {
    nodes: { [k: number]: boolean },
    transitions: { [k: string]: number }
    isFinal: boolean,
}

function expandRec(state: ExpandState, nfaNodes: Array<NFANode>): PendingDFA {
    if (state.toVisit.length > 0) {
        const [nextNode, ...rest] = state.toVisit
        if (state.nodes[nextNode] === undefined) {
            const newState = {
                nodes: { ...state.nodes, [nextNode]: true },
                toVisit: [...rest, ...Object.keys(nfaNodes[nextNode].epsilons).map(x => +x as number)]
            }
            return expandRec(newState, nfaNodes)
        } else {
            return expandRec({
                nodes: state.nodes,
                toVisit: rest
            }, nfaNodes)
        }
    } else {
        return {
            nodes: state.nodes,
            transitions: {},
            isFinal: Object.keys(state.nodes).some(node => nfaNodes[+node].isFinal)
        }
    }
}

type NumberKeys<T> = keyof T extends never ? [] : Union2Tuple<keyof T> extends number [] ? Union2Tuple<keyof T> : []

type ExpandRec<state extends ExpandState, nfaNodes extends Record<number, NFANode>> = state["toVisit"] extends [infer H extends number, ...infer T extends number[]] ?
    H extends keyof state["nodes"] ?
        ExpandRec<{ nodes: state["nodes"], toVisit: T}, nfaNodes>
        : ExpandRec<{
            nodes: state["nodes"] & { [k in H]: true },
            toVisit: [...T, ...NumberKeys<nfaNodes[H]["epsilons"]>]
        },
        nfaNodes>
    : {
        nodes: state["nodes"],
        transitions: {},
        isFinal: HasSomeFinal<NumberKeys<state["nodes"]>, nfaNodes>
    }

type HasSomeFinal<N, O extends Record<number, NFANode>> = N extends [infer H extends number, ...infer T extends number[]] ?
    O[H]["isFinal"] extends true ? true : HasSomeFinal<T, O>
    : false

function expand(input: number[], nfaNodes: Array<NFANode>): PendingDFA {
    return expandRec({ nodes: {}, toVisit: input }, nfaNodes)
}

type Expand<input extends number[], nfaNodes extends Record<number, NFANode>> = ExpandRec<{ nodes: {}, toVisit: input }, nfaNodes>

function isSame(a: PendingDFA, b: PendingDFA): boolean {
    const ka = Object.keys(a.nodes)
    const kb = Object.keys(b.nodes)
    if (ka.length !== kb.length) {
        return false
    }
    for (let va of ka) {
        if (kb.indexOf(va) < 0) {
            return false
        }
    }
    return true
}

type IsSame<a extends PendingDFA, b extends PendingDFA> = keyof a["nodes"] extends keyof b["nodes"] ?
    keyof b["nodes"] extends keyof a["nodes"] ? true : false : false

function findExistingRec(newNode: PendingDFA, nodes: Record<number, PendingDFA>, keys: number[]): number | undefined {
    if (keys.length > 0) {
        const [head, ...rest] = keys
        const headNode = nodes[head]
        if (isSame(headNode, newNode)) {
            return head
        } else {
            return findExistingRec(newNode, nodes, rest)
        }
    }
    return undefined
}

type FindExistingRec<newNode extends PendingDFA, nodes extends Record<number, PendingDFA>, keys extends number[]> = keys extends [infer H extends number, ...infer T extends number[]] ?
IsSame<newNode, nodes[H]> extends true ? H : FindExistingRec<newNode, nodes, T>
: undefined

function findExisting(newNode: PendingDFA, nodes: Record<number, PendingDFA>): number | undefined {
    return findExistingRec(newNode, nodes, Object.keys(nodes).map(x => +x as number))
}

type FindExisting<newNode extends PendingDFA, nodes extends Record<number, PendingDFA>> =
    FindExistingRec<newNode, nodes, NumberKeys<nodes>>

type ProcessingState = {
    nodes: Record<number, PendingDFA>
    toProcess: number[]
}

function findOrCreate(state: ProcessingState, n: number[], nfaNodes: NFANode[]): { state: ProcessingState, index: number } {
    const newNode = expand(n, nfaNodes)
    const existingIndex = findExisting(newNode, state.nodes)
    if (existingIndex !== undefined) {
        return { state, index: existingIndex }
    } else {
        return {
            state: {
                nodes: { ...state.nodes, [Object.keys(state.nodes).length]: newNode },
                toProcess: [...state.toProcess, Object.keys(state.nodes).length]
            },
            index: Object.keys(state.nodes).length
        }
    }
}

type FindOrCreate<state extends ProcessingState, n extends number[], nfaNodes extends Record<number, NFANode>> =
    Expand<n, nfaNodes> extends infer newNode ?
    newNode extends PendingDFA ?
    FindExisting<newNode, state["nodes"]> extends infer existingIndex ?
    existingIndex extends undefined ?
    {
         state: {
            nodes: state["nodes"] & { [k in NumberKeys<state["nodes"]>["length"]]: newNode },
            toProcess: [...state["toProcess"], NumberKeys<state["nodes"]>["length"]]
        }, index: NumberKeys<state["nodes"]>["length"]
    }
    : { state: state, index: existingIndex}
    : never
    : never
    : never

function oldTransitions(node: PendingDFA, nfaNodes: NFANode[]): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    Object.keys(node.nodes).forEach(nextNode => {
        const currentTransition = nfaNodes[+nextNode].transitions;
        Object.keys(currentTransition).forEach(t => {
            const n = currentTransition[t];
            const l = result[t]
            if (l) {
                l.push(n)
            } else {
                result[t] = [n]
            }
        })
    })
    return result
}

type TransitionState = Record<string, Record<number, true>>
type TransitionMap = Record<string, number[]>

type AddToState<state extends TransitionState, T extends string, N extends number> = state & { [k in T]: { [r in N]: true } }

type AddAllToState<state extends TransitionState, keys, transitions extends Record<string, number>> =
    PickOne<keys> extends infer U ?
        U extends string ?
        Exclude<keys, U> extends never ? AddToState<state, U, transitions[U]>
        : AddAllToState<AddToState<state, U, transitions[U]>, Exclude<keys, U>, transitions>
    : never
    : never

type AddAllToStateSafe<state extends TransitionState, transitions extends Record<string, number>> =
    keyof transitions extends never ? state : AddAllToState<state, keyof transitions, transitions>

type AddAllTransitions<state extends TransitionState, keys, nfaNodes extends Record<number, NFANode>> =
    PickOne<keys> extends infer U ?
        U extends number ?
        Exclude<keys, U> extends never ? AddAllToStateSafe<state, nfaNodes[U]["transitions"]>
        : AddAllTransitions<AddAllToStateSafe<state, nfaNodes[U]["transitions"]>, Exclude<keys, U>, nfaNodes>
    : never
    : never

type ReduceState<state extends TransitionState> = {
    [K in keyof state]: keyof state[K] extends never ? [] : Union2Tuple<keyof state[K]>
}

type OldTransitions<node extends PendingDFA, nfaNodes extends Record<number, NFANode>> = 
    ReduceState<AddAllTransitions<{}, keyof node["nodes"], nfaNodes>> extends infer R ?
        R extends TransitionMap ? R : never : never

function processTransitions(nodeIndex: number, state: ProcessingState, nfaNodes: NFANode[]): ProcessingState {
    const old = oldTransitions(state.nodes[nodeIndex], nfaNodes)
    let current = state
    Object.keys(old).forEach(t => {
        const n = old[t]
        const { state: newState, index } = findOrCreate(current, n, nfaNodes)
        const node = newState.nodes[nodeIndex]
        const newNode: PendingDFA = { nodes: node.nodes, isFinal: node.isFinal, transitions: {...node.transitions, [t]: index }}
        current = {
            toProcess: newState.toProcess,
            nodes: { ...newState.nodes, [nodeIndex]: newNode }
        }
    })
    return current
}

type ProcessTransitionsBody<state extends ProcessingState, index extends number, nodeIndex extends number, T extends string> = {
    toProcess: state["toProcess"],
    nodes: state["nodes"] & { [k in nodeIndex]: {
        nodes: state["nodes"][nodeIndex]["nodes"],
        isFinal: state["nodes"][nodeIndex]["isFinal"],
        transitions: state["nodes"][nodeIndex]["transitions"] & {[k in T]: index }
    }}
}

type ProcessTransitionsRec<nodeIndex extends number, keys, transitions extends TransitionMap, state extends ProcessingState, nfaNodes extends Record<number, NFANode>> =
    PickOne<keys> extends infer T ?
        T extends string ?
        FindOrCreate<state, transitions[T], nfaNodes> extends infer F ?
        F extends { state: ProcessingState, index: number } ?
        Exclude<keys, T> extends never ? ProcessTransitionsBody<F["state"], F["index"], nodeIndex, T>
        : ProcessTransitionsRec<nodeIndex, Exclude<keys, T>, transitions, ProcessTransitionsBody<F["state"], F["index"], nodeIndex, T>, nfaNodes>
    : never
    : never
    : never
    : never

type ProcessTransitionsSafe<nodeIndex extends number, transitions extends TransitionMap, state extends ProcessingState, nfaNodes extends Record<number, NFANode>> =
    keyof transitions extends never ? state :
    ProcessTransitionsRec<nodeIndex, keyof transitions, transitions, state, nfaNodes>

type ProcessTransitions<nodeIndex extends number, state extends ProcessingState, nfaNodes extends Record<number, NFANode>> =
    ProcessTransitionsSafe<nodeIndex, OldTransitions<state["nodes"][nodeIndex], nfaNodes>, state, nfaNodes>

type ZZZ = {
    0: {id: 0, isFinal: false, epsilons: {}, transitions: { "hello": 2 }},
    1: {id: 1, isFinal: false, epsilons: {}, transitions: { "hello": 3 }},
    2: {id: 2, isFinal: false, epsilons: {}, transitions: { "foo": 4}},
    3: {id: 3, isFinal: false, epsilons: {}, transitions: { }},
}
type XX = ProcessTransitions<0, {
nodes: {
    0: { isFinal: false, nodes: { 0: true}, transitions: {} }
},
toProcess: []
}, ZZZ>
    

function processRec(state: ProcessingState, nfaNodes: NFANode[]) {
    if (state.toProcess.length > 0) {
        const [head, ...tail] = state.toProcess
        const newState = {
            nodes: state.nodes,
            toProcess: tail
        }
        return processRec(processTransitions(head, newState, nfaNodes), nfaNodes)
    } else {
        return state
    }
}

type ProcessRec<state extends ProcessingState, nfaNodes extends Record<number, NFANode>> = state["toProcess"] extends [infer H extends number, ...infer T extends number[]] ?
ProcessRec<ProcessTransitions<H, {
    nodes: state["nodes"],
    toProcess: T
}, nfaNodes>, nfaNodes>
: state

function process(nfaNodes: NFANode[]) {
    const { state } = findOrCreate({ nodes: [], toProcess: [] }, [0], nfaNodes)
    return processRec(state, nfaNodes)
}

type Process<nfaNodes extends Record<number, NFANode>> = ProcessRec<FindOrCreate<{ nodes: {}, toProcess: [] }, [0], nfaNodes>["state"], nfaNodes>

export type DFANode = {
    isFinal: boolean;
    transitions: Record<string, number>
};

export type DFANodes = Record<number, DFANode>

// TODO DFA is not minimal
export function nfa2dfa(nfaNodes: NFANode[]): DFANodes {
    const nodes = process(nfaNodes).nodes
    let result = {}
    Object.keys(nodes).forEach(n => {
        const node = nodes[+n]
        result = { ...result, [+n]: {isFinal: node.isFinal, transitions: node.transitions } }
    })
    return result
}

export type NFA2DFA<nodes extends Record<number, NFANode>> = Process<nodes> extends { nodes: infer N } ?
    { [K in keyof N]: N[K] extends PendingDFA ? {
        transitions: { [X in keyof N[K]["transitions"]]: N[K]["transitions"][X] },
        isFinal: N[K]["isFinal"]
    } : never }
    : never

// test value 
const x = 
[
    { id: 0, isFinal: false, epsilons: {}, transitions: { of: 2 } },
    { id: 1, isFinal: true, epsilons: {}, transitions: {} },
    {
      id: 2,
      isFinal: false,
      epsilons: { 3: true },
      transitions: { simpleArticle: 4, articleName: 5 }
    },
    {
      id: 3,
      isFinal: false,
      epsilons: { 1: true, 2: true },
      transitions: {}
    },
    { id: 4, isFinal: false, epsilons: { 3: true }, transitions: {} },
    { id: 5, isFinal: false, epsilons: {}, transitions: { modele: 6 } },
    {
      id: 6,
      isFinal: false,
      epsilons: { 3: true, 5: true },
      transitions: {}
    }
  ] as const satisfies NFANode[]

type X = NFA2DFA<typeof x>

// console.log(nfa2dfa(x))