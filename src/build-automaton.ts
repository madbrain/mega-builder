import { ExprNode } from "./parse";
import { _Recurse, NumOfProps } from "./utils"

export interface NFANode {
    id: number
    isFinal: boolean
    epsilons: { [ term: number ]: boolean }
    transitions: { [ term: string ]: number }
}

export function createAutomaton(expr: ExprNode): NFANode[] {
    let id = 0;
    function createNode(isFinal: boolean): NFANode {
      return { id: id++, isFinal, epsilons: {}, transitions: {} };
    }
    function addEpsilon(from: NFANode, to: number) {
        return { ...from, epsilons: { ...from.epsilons, [to]: true } }
    }
    function add(from: NFANode, to: number, word: string) {
        return {...from, transitions: {...from.transitions, [word]: to } };
    }
    function createNodes(expr: ExprNode, start: number, end: number, nodes: NFANode[]): NFANode[] {
        if (expr.type === 'seq') {
            let current = start
            for (let element of expr.elements!!) {
                const next = nodes.length
            nodes = createNodes(element, current, next, [ ...nodes, createNode(false) ])
            current = next;
            }
            nodes[current] = addEpsilon(nodes[current], end);
        } else if (expr.type === 'alt') {
            for (let element of expr.elements!!) {
                nodes = createNodes(element, start, end, nodes)
            }
        } else if (expr.type === '*') {
            nodes = createNodes(expr.element, start, end, nodes)
            nodes[start] = addEpsilon(nodes[start], end)
            nodes[end] = addEpsilon(nodes[end], start)
        } else if (expr.type === '+') {
            nodes = createNodes(expr.element, start, end, nodes)
            nodes[end] = addEpsilon(nodes[end], start)
        } else if (expr.type === 'term') {
            nodes[start] = add(nodes[start], end, expr.name);
        } else {
            throw new Error("Impossible");
        }
        return nodes;
    }
    const nodes = createNodes(expr, 0, 1, [
        createNode(false),
        createNode(true)
    ]);
    return nodes
}

type NodeState = { nodes: { [ id: number]: NFANode } }

type CreateNodesAlt<elements extends ExprNode[], start extends number, end extends number, nodes extends NodeState> =
    elements extends [ infer head extends ExprNode, ...infer tail extends ExprNode[] ] ?
        { nodes: CreateNodesAlt<tail, start, end, { nodes: CreateNodes<head, start, end, nodes>["nodes"] }>["nodes"] }
    : nodes;

type CreateNodesSeq<elements extends ExprNode[], start extends number, end extends number, nodes extends NodeState> =
    elements extends [ infer head extends ExprNode, ...infer tail extends ExprNode[] ] ?
        { nodes: CreateNodesSeq<tail, NumOfProps<nodes["nodes"]>, end,
            { nodes: CreateNodes<head, start, NumOfProps<nodes["nodes"]>, { nodes: nodes["nodes"] &
                MakeObject<NumOfProps<nodes["nodes"]>, { id: NumOfProps<nodes["nodes"]>, isFinal: false, epsilons: {}, transitions: {} }>}
            >["nodes"] }
        >["nodes"] }
    : AddEpsilon<start, end, nodes>;

type AddEpsilon<n extends number, to extends number, state extends NodeState> = { nodes: {
    [ K in keyof state["nodes"]]: (K extends n ?
        { [W in keyof state["nodes"][K]]: W extends "epsilons" ? state["nodes"][K][W] & MakeObject<to, true> : state["nodes"][K][W] }
        : state["nodes"][K])
} }

type AddTransition<n extends number, to extends number, name extends string, state extends NodeState> = { nodes: {
    [ K in keyof state["nodes"]]: (K extends n ?
            { [W in keyof state["nodes"][K]]: W extends "transitions" ? state["nodes"][K][W] & MakeObject<name, to> : state["nodes"][K][W] }
            : state["nodes"][K])
} }

type MakeObject<Key extends (number | string), Value extends any> = {
    [K in Key]: Value
}

type CreateNodes<expr extends ExprNode, start extends number, end extends number, nodes extends NodeState> =
    expr extends { type: 'seq', elements: infer E extends ExprNode[] } ? { nodes: CreateNodesSeq<E, start, end, nodes>["nodes"] }
    : expr extends { type: 'alt', elements: infer E extends ExprNode[] } ? { nodes: CreateNodesAlt<E, start, end, nodes>["nodes"] }
    : expr extends { type: '*', element: infer E extends ExprNode } ? { nodes: AddEpsilon<start, end, AddEpsilon<end, start, CreateNodes<E, start, end, nodes>>>["nodes"] }
    : expr extends { type: '+', element: infer E extends ExprNode } ? { nodes: AddEpsilon<end, start, CreateNodes<E, start, end, nodes>>["nodes"] }
    : expr extends { type: 'term', name: infer N extends string } ? AddTransition<start, end, N, nodes>
    : never;

export type CreateAutomaton<expr extends ExprNode> = CreateNodes<expr, 0, 1, { nodes: {
    0: { id: 0, isFinal: false, epsilons: {}, transitions: {} },
    1: { id: 1, isFinal: true, epsilons: {}, transitions: {} }
}}>["nodes"]

type YY = CreateAutomaton<{ type: "seq", elements: [
    { type: "term", name: "foo", alias: "" },
    { type: "alt", elements: [
        {type: "term", name: "bar", alias: ""},
        {type: "term", name: "xxx", alias: ""},
    ] },
]}>
