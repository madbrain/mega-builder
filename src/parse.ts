
export type ExprNode = { type: 'term', name: string, alias: string}
    | { type: '*', element: ExprNode }
    | { type: '+', element: ExprNode }
    | { type: '?', element: ExprNode }
    | { type: 'seq', elements: ExprNode[] }
    | { type: 'alt', elements: ExprNode[] }

interface StaticState {
    scanned: string;
    unscanned: string;
    seqs: unknown[][];
    root: unknown;
    token: string;
    error: unknown;
}

namespace state {
    type from<S extends StaticState> = S
    
    export type initialize<S extends string> = from<{
        scanned: "";
        unscanned: S;
        seqs: [],
        token: "",
        error: undefined,
        root: undefined
     }>
    
    export type startSeq<s extends StaticState> = from<{
        scanned: s["scanned"],
        unscanned: s["unscanned"],
        seqs: [ ...s["seqs"], [] ],
        token: s["token"],
        error: s["error"],
        root: s["root"],
    }>
    
    export type scanTo<s extends StaticState, unscanned extends string> = from<{
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: s["root"],
	}>

    export type makeOperator<s extends StaticState, operator extends string, unscanned extends string> = from<{
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
        seqs: s["seqs"],
        token: operator,
        error: s["error"],
        root: s["root"],
    }>

    export type eof<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: "$EOF",
        error: s["error"],
        root: s["root"],
    }>

    type updateScanned<
        previousScanned extends string,
        previousUnscanned extends string,
        updatedUnscanned extends string
    > =
        previousUnscanned extends `${infer justScanned}${updatedUnscanned}` ?
            `${previousScanned}${justScanned}`
        :	previousScanned

    export type pushTermInSeq<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: [ ...pop<s["seqs"]>, [ ...last<s["seqs"]>, s["root"] ] ],
        token: s["token"],
        error: s["error"],
        root: undefined,
    }>

    type last<s extends any[]> = s extends [ ...infer heads, infer last ] ? last : never
    type pop<s extends any[]> = s extends [ ...infer heads, infer last ] ? heads : never

    export type endAlt<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: pop<s["seqs"]>,
        token: s["token"],
        error: s["error"],
        root: { type: 'alt', elements: [...last<s["seqs"]>, s["root"]] },
    }>

    export type endSeq<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: pop<s["seqs"]>,
        token: s["token"],
        error: s["error"],
        root: { type: 'seq', elements: [...last<s["seqs"]>, s["root"]] },
    }>

    export type makeName<s extends StaticState, name extends string> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: { type: 'term', name: name, alias: name },
    }>

    export type makeAlias<s extends StaticState, name extends string, alias extends string> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: { type: 'term', name: name, alias: alias },
    }>

    export type makeOptional<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: { type: '?', element: s["root"] },
    }>

    export type makeZeroOrMore<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: { type: '*', element: s["root"] },
    }>

    export type makeOneOrMore<s extends StaticState> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: s["error"],
        root: { type: '+', element: s["root"] },
    }>

    export type emitError<s extends StaticState, message extends string> = from<{
        scanned: s["scanned"],
		unscanned: s["unscanned"],
        seqs: s["seqs"],
        token: s["token"],
        error: `ERROR: ${message}`,
        root: { type: '+', element: s["root"] },
    }>
        
}

type UntilCondition = (scanner: Scanner) => boolean

const whiteSpaceTokens = {
	" ": true,
	"\n": true,
	"\t": true
} as const;

type WhiteSpaceToken = keyof typeof whiteSpaceTokens;

const terminatingChars = {
	"(": true,
	")": true,
	"*": true,
	"+": true,
	"?": true,
	":": true,
    " ": true,
} as const;

type TerminatingChar = keyof typeof terminatingChars;

const lookaheadIsTerminator: UntilCondition = (scanner: Scanner) => scanner.lookahead in terminatingChars;

const lookaheadIsNotWhitespace: UntilCondition = (scanner: Scanner) => !(scanner.lookahead in whiteSpaceTokens);

class Scanner {
    chars: string[];
    i = 0;
    constructor(content: string) {
        this.chars = Array.from(content);
    }
    
    get lookahead(): string {
		return (this.chars[this.i] ?? "") // as never
	}

    shift(): string {
        return (this.chars[this.i++] ?? "") // as never
    }

    lookaheadIsIn(tokens: Record<string, boolean>): boolean {
		return this.lookahead in tokens
	}

    shiftUntilNextTerminator(): string {
		this.shiftUntilNonWhitespace();
		return this.shiftUntil(lookaheadIsTerminator)
	}

    shiftUntilNonWhitespace(): string {
		return this.shiftUntil(lookaheadIsNotWhitespace)
	}

    shiftUntil(condition: UntilCondition) {
        let result = '';
        while (this.lookahead) {
            if (condition(this)) {
                break;
            }
            result += this.shift()
        }
        return result;
    }
}

namespace Scanner {
    export type shift<
        lookahead extends string,
        unscanned extends string
    > = `${lookahead}${unscanned}`

    export type shiftUntilNextTerminator<unscanned extends string> = shiftUntil<
        unscanned,
        TerminatingChar
    >

    export type shiftUntil<
        unscanned extends string,
        terminator extends string,
        scanned extends string = ""
    > =
        unscanned extends shift<infer lookahead, infer nextUnscanned> ?
            lookahead extends terminator ?
                [scanned, unscanned]
            :	shiftUntil<nextUnscanned, terminator, `${scanned}${lookahead}`>
        :	[scanned, ""]

    export type shiftResult<scanned extends string, unscanned extends string> = [
        scanned,
        unscanned
    ]
}



class DynamicState {
    scanner: Scanner;
    token: string = "$EOF";
    root: ExprNode | undefined;
    seqs: Array<any> = [];
    error = "";

    constructor(private content: string) {
        this.scanner = new Scanner(content)
    }

    eof() {
        this.token = "$EOF";
        return this;
    }

    emitError(message: string): DynamicState {
        this.error = `ERROR: ${message}`;
        return this;
    }

    shiftedByOne(): DynamicState {
        this.scanner.shift();
        return this;
    }

    shiftUntilNextTerminator() {
        this.token = this.scanner.shiftUntilNextTerminator();
        //console.log("TOKEN", this.token)
        return this;
    }

    makeOperator() {
        this.token = this.scanner.shift();
        //console.log("TOKEN", this.token)
        return this;
    }

    makeName(name: string) {
        this.root = { type: 'term', name, alias: name };
        return this;
    }

    makeAlias(name: string, alias: string) {
        this.root = { type: 'term', name, alias };
        return this;
    }

    makeOptional(): DynamicState {
        this.root = { type: '?', element: this.root! };
        return this;
    }

    makeZeroOrMore(): DynamicState {
        this.root = { type: '*', element: this.root! };
        return this;
    }

    makeOneOrMore(): DynamicState {
        this.root = { type: '+', element: this.root! };
        return this;
    }

    startSeq() {
        this.seqs.push([]);
        return this;
    }

    endSeq() {
        this.pushTermInSeq();
        this.root = { type: 'seq', elements: this.seqs.pop() };
        return this;
    }
    
    endAlt() {
        this.pushTermInSeq();
        this.root = { type: 'alt', elements: this.seqs.pop() };
        return this;
    }

    pushTermInSeq(): DynamicState {
        this.seqs[this.seqs.length - 1].push(this.root);
        return this;
    }
}

function nextToken(s: DynamicState): DynamicState {
    return s.scanner.lookahead === '' ? s.eof()
        : s.scanner.lookaheadIsIn(whiteSpaceTokens) ? nextToken(s.shiftedByOne())
        : s.scanner.lookahead === '(' ? s.makeOperator()
        : s.scanner.lookahead === ')' ? s.makeOperator()
        : s.scanner.lookahead === ':' ? s.makeOperator()
        : s.scanner.lookahead === '*' ? s.makeOperator()
        : s.scanner.lookahead === '+' ? s.makeOperator()
        : s.scanner.lookahead === '?' ? s.makeOperator()
        : s.shiftUntilNextTerminator();
}

type nextToken<s extends StaticState> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
        lookahead extends WhiteSpaceToken ? nextToken<state.scanTo<s, unscanned>>
        : lookahead extends ('(' | ')' | ':' | '*' | '+' | '?') ? state.makeOperator<s, lookahead, unscanned>
        : Scanner.shiftUntilNextTerminator<s["unscanned"]> extends Scanner.shiftResult<infer token, infer unscanned> ?
            state.makeOperator<s, token, unscanned>
            :	never
    : state.eof<s>

function parseAlias(s: DynamicState, name: string) {
    const s2 = nextToken(s)
    return nextToken(s2.makeAlias(name, s2.token));
}

type parseAlias<s extends StaticState, name extends string> = nextToken<s> extends (infer s2 extends StaticState) ?
    nextToken<state.makeAlias<s2, name, s2["token"]>>
    : never

function parseName(s: DynamicState): DynamicState {
    const name = s.token // TODO check IDENT
    const s2 = nextToken(s)
    return s2.token === ':' ? parseAlias(s2, name) : s2.makeName(name);
}

type parseName<s extends StaticState> = nextToken<s> extends (infer s2 extends StaticState) ?
    s2["token"] extends ':' ? parseAlias<s2, s["token"]> : state.makeName<s2, s["token"]>
    : never

function parseAtom(s: DynamicState): DynamicState {
    return s.token === '(' ? expectLeftParen(parseAlt(nextToken(s.startSeq())))
    : parseName(s);
}

type parseAtom<s extends StaticState> = s["token"] extends '(' ? expectLeftParen<parseAlt<nextToken<state.startSeq<s>>>>
    : parseName<s>

function expectLeftParen(s: DynamicState): DynamicState {
    return s.token !== ')' ? s.emitError("expect left paren") : nextToken(s);
}

type expectLeftParen<s extends StaticState> = s["token"] extends ')' ? nextToken<s> : state.emitError<s, "expect left paren">

function parseTerm(s: DynamicState): DynamicState {
    const s2 = parseAtom(s)
    return s2.error ? s2
        : s2.token === '*' ? nextToken(s2.makeZeroOrMore())
        : s2.token === '+' ? nextToken(s2.makeOneOrMore())
        : s2.token === '?' ? nextToken(s2.makeOptional())
        : s2;
}

type parseTerm<s extends StaticState> = parseAtom<s> extends (infer s2 extends StaticState) ?
    s2["error"] extends string ? s2
        : s2["token"] extends '*' ? nextToken<state.makeZeroOrMore<s2>>
        : s2["token"] extends '+' ? nextToken<state.makeOneOrMore<s2>>
        : s2["token"] extends '?' ? nextToken<state.makeOptional<s2>>
        : s2
    : never 

function parseSeq(s: DynamicState): DynamicState {
    const s2 = parseTerm(s);
    return s2.error ? s2
        : s2.token === ')' || s2.token === '|' || s2.token === '$EOF' ? s2.endSeq()
        : parseSeq(s2.pushTermInSeq())
}

type parseSeq<s extends StaticState> = parseTerm<s> extends (infer s2 extends StaticState) ?
    s2["error"] extends string ? s2
        : s2["token"] extends (')' | '|' | '$EOF') ? state.endSeq<s2>
        : parseSeq<state.pushTermInSeq<s2>>
    : never 

function parseAlt(s: DynamicState): DynamicState {
    const s2 = parseSeq(s.startSeq());
    return s2.error ? s2
        : s2.token === "|" ? parseAlt(nextToken(s2.pushTermInSeq()))
        : s2.endAlt();
}

type parseAlt<s extends StaticState> = parseSeq<state.startSeq<s>> extends (infer s2 extends StaticState) ?
    s2["error"] extends string ? s2
        : s2["token"] extends '|' ? parseAlt<nextToken<state.pushTermInSeq<s2>>>
        : state.endAlt<s2>
    : never 

export function parseGrammar(grammar: string) {
    const s = new DynamicState(grammar);
    const r = parseAlt(nextToken(s.startSeq()))
    if (r.error) {
        throw Error(r.error);
    } else if (r.token !== "$EOF") {
        throw Error("Junk at end of expr");
    } else {
        return r.root!;
    }
}

export type ParseGrammar<G extends string> = parseAlt<nextToken<state.startSeq<state.initialize<G>>>>["root"]