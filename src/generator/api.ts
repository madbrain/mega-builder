
export interface Element { ww: any }
export interface SeqDefinition<T extends Element[]> extends Element { x: any }
export interface ChoiceDefinition<T extends Element[]> extends Element { y: any }
export interface RepeatDefinition<T extends Element> extends Element { z: any }
export interface TermDefinition<N extends string> extends Element { w: any }
export interface ArgsDefinition<N extends any[]> {}

export function args<N extends any[]>(): ArgsDefinition<N> { throw new Error("TODO") }

export function term<N extends string, T extends any[]>(name: N, args: ArgsDefinition<T>): TermDefinition<N> { throw new Error("TODO") }
export function seq<T extends Element[]>(...elements: T): SeqDefinition<T> { throw new Error("TODO") }
export function choice<T extends Element[]>(...elements: T): ChoiceDefinition<T> { throw new Error("TODO") }
export function repeat0<T extends Element>(element: T): RepeatDefinition<T> { throw new Error("TODO") }
export function repeat1<T extends Element>(element: T): RepeatDefinition<T> { throw new Error("TODO") }
export function grammar<R>(start: Element) { throw new Error("TODO") }

