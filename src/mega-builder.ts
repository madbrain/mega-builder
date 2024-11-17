
import { ParseGrammar, parseGrammar } from "./parse";
import { CreateAutomaton, createAutomaton } from './build-automaton';
import { NFA2DFA, nfa2dfa } from './build-dfa';
import { makeBuilder, MakeBuilderFromDFA } from "./make-builder";

type MakeBuilder<G extends string, T extends { new(): object }> = MakeBuilderFromDFA<NFA2DFA<CreateAutomaton<ParseGrammar<G>>>, T>;

type BuilderAction = { build(): any }

export function createBuilder<const G extends string, T extends { new(): BuilderAction }>(grammar: G, actions: T): MakeBuilder<G, T> {
    const g = parseGrammar(grammar);
    const nfa = createAutomaton(g);
    const dfa = nfa2dfa(nfa);
    return makeBuilder(dfa, actions) as MakeBuilder<G, T>
}

