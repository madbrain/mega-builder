import { DFANode, DFANodes } from './build-dfa';

type GetClassMethodParams<T extends { new(): object }, N extends string> = T extends { new(): infer O extends { [n:string]: any } } ?
    O[N] extends ((...args: infer A) => any) ? A : never : never

type GetClassMethodResult<T extends { new(): object }, N extends string> = T extends { new(): infer O extends { [n:string]: any } } ?
    O[N] extends ((...args: any[]) => infer R) ? R : never : never

type MakeTransitionMethod<T extends { new(): object }, N extends string, R> = (...a: GetClassMethodParams<T, N>) => R;

type MakeNode<N extends DFANode, Nodes extends DFANodes, O extends { new(): object }> = {
    [K in keyof N['transitions']]: K extends string ? MakeTransitionMethod<O, K, MakeNode<Nodes[N['transitions'][K]], Nodes, O>> : never
} & (N['isFinal'] extends true ? { build(): GetClassMethodResult<O, 'build'> } : {})

export type MakeBuilderFromDFA<Nodes extends DFANodes, O extends { new(): object }> = MakeNode<Nodes[0], Nodes, O>

export function makeBuilder<const G extends DFANodes, T extends { new(): any }, R extends MakeBuilderFromDFA<G, T>>(grammar: G, actions: T): R {
    const innerBuilder = new actions()
    const r: any = {}
    const names = []
    for(let node in grammar) {
        names.push(...Object.keys(grammar[node].transitions))
    }
    names.forEach(name => {
        r[name] = (...a: any[]) => {
            // TODO distinguish aliases on argument counts ?
            innerBuilder[name](...a);
            return r;
        }
    })
    r['build'] = () => {
        return innerBuilder.build()
    } 
    return r as R;
}
