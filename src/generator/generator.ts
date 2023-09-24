
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'
import { SourceFile, CallExpression, ExportAssignment, TypeNode, TupleTypeNode, TypeReferenceNode, NamedImports,
  Identifier, ImportDeclaration, ScriptTarget, StringLiteral, SyntaxKind, createSourceFile } from 'typescript'

// https://ts-ast-viewer.com

class Word {
  constructor(public name: string, public args: Array<ArgType>) {}
}

interface ArgType {
  name: string,
  module?: string
}

type ExprType = 'seq' | 'choice' | 'term' | 'repeat0' | 'repeat1'
interface ExprNode {
  type: ExprType,
  elements?: ExprNode[],
  word?: Word,
  expr?: ExprNode,
}

function processFile(node: SourceFile) {
  const typeMap = new Map<string, string>()
  node.forEachChild(child => {
    if (SyntaxKind[child.kind] === 'ExportAssignment') {
      const exportAssignment = child as ExportAssignment
      processGrammar(exportAssignment.expression as CallExpression, typeMap, node.fileName)
    } else if (SyntaxKind[child.kind] === 'ImportDeclaration') {
      const moduleName = (child as ImportDeclaration).moduleSpecifier as StringLiteral
      const namedBindings = ((child as ImportDeclaration).importClause?.namedBindings as NamedImports).elements ?? []
      for (let namedBinding of namedBindings) {
        typeMap.set(namedBinding.name.text, moduleName.text)
      }
    }
  })
}

function processGrammar(grammarExpr: CallExpression, typeMap: Map<string, string>, fileName: string) {
  if (SyntaxKind[grammarExpr.expression.kind] !== 'Identifier' || (grammarExpr.expression as Identifier).text !== 'grammar') {
    throw new Error("Expecting grammar")
  }
  const resultType = toType(grammarExpr.typeArguments?.[0] as TypeNode, typeMap)
  const tree = callToTree(grammarExpr.arguments[0] as CallExpression, typeMap)
  const root = createAutomaton(tree)
  const dfa = nfa2dfa(root)
  // console.log(printAutomaton(dfa))
  const result = printInterfaces(dfa, resultType)
  // console.log(result)
  const filePath = path.parse(fileName)
  fs.writeFileSync(path.join(filePath.dir, filePath.name + ".api.ts"), result)
}

function toType(arg: TypeNode, typeMap: Map<string, string>): ArgType {
  if (SyntaxKind[arg.kind] === 'TypeReference') {
    const name = (((arg as TypeReferenceNode).typeName) as Identifier).text
    return { name , module: typeMap.get(name) }
  }
  if (SyntaxKind[arg.kind] === 'StringKeyword') {
    return { name: 'string' }
  }
  if (SyntaxKind[arg.kind] === 'NumberKeyword') {
    return { name: 'number' }
  }
  return { name: '<unknown>' }
}

function callToTree(call: CallExpression, typeMap: Map<string, string>): ExprNode {
  const callName = (call.expression as Identifier).text
  if (callName === 'seq') {
    return { type: 'seq', elements: call.arguments.map(arg => callToTree(arg as CallExpression, typeMap)) }
  } else if (callName === 'choice') {
    return { type: 'choice', elements: call.arguments.map(arg => callToTree(arg as CallExpression, typeMap)) }
  } else if (callName === 'term') {
    const termName = call.arguments[0] as StringLiteral
    const argCall = call.arguments[1] as CallExpression
    const types = (argCall.typeArguments?.[0] as (TupleTypeNode | undefined))?.elements ?? []
    return { type: 'term', word: new Word(termName.text, types.map(arg => toType(arg as TypeNode, typeMap))) }
  } else if (callName === 'repeat0') {
    return { type: 'repeat0', expr: callToTree(call.arguments[0] as CallExpression, typeMap) }  
  } else if (callName === 'repeat1') {
    return { type: 'repeat1', expr: callToTree(call.arguments[0] as CallExpression, typeMap) }  
  } else {
    throw new Error("TODO " + callName);
  }
}

class NFANode {
  public epsilons: Array<NFANode> = []
  public transitions = new Map<Word, NFANode>()

  constructor(public id: number, public isFinal: boolean) { }

  addEpsilon(next: NFANode) {
    this.epsilons.push(next)
  }

  add(next: NFANode, word: Word) {
    this.transitions.set(word, next)
  }
}

class DFANode {
  public isFinal = false
  public nodes = new Set<NFANode>()
  public transitions = new Map<Word, DFANode>()

  constructor(nodes: Array<NFANode>) {
    const toVisit = nodes.slice()
    while (toVisit.length > 0) {
      const nextNode = toVisit.pop()!!
      if (! this.nodes.has(nextNode)) {
        this.nodes.add(nextNode)
        nextNode.epsilons.forEach(tt => toVisit.push(tt))
      }
    }
    this.isFinal = [...this.nodes].some(node => node.isFinal)
  }

  isSame(other: DFANode) {
    return this.nodes.size === other.nodes.size && [...this.nodes].every((x) => other.nodes.has(x));
  }

  oldTransitions() {
    const transitions = new Map<Word, Array<NFANode>>()
    this.nodes.forEach(nextNode => {
      nextNode.transitions.forEach((n, t) => {
        const l = transitions.get(t)
        if (l) {
          l.push(n)
        } else {
          transitions.set(t, [n])
        }
      })
    })
    return transitions
  }

  add(next: DFANode, word: Word) {
    this.transitions.set(word, next)
  }

  id() {
    const x = Array.from(this.nodes).map(node => node.id)
    x.sort() 
    return x.join('_')
  }
}

function createAutomaton(expr: ExprNode): NFANode {
  let id = 1;
  function createNode(isFinal = false) {
    return new NFANode(id++, isFinal);
  }
  function createNodes(expr: ExprNode, start: NFANode, end: NFANode) {
    if (expr.type === 'seq') {
      let current = start
      for (let element of expr.elements!!) {
        const next = createNode();
        createNodes(element, current, next)
        current = next
      }
      current.addEpsilon(end)
    } else if (expr.type === 'choice') {
      for (let element of expr.elements!!) {
          createNodes(element, start, end)
      }
    } else if (expr.type === 'repeat0') {
      createNodes(expr.expr!!, start, end)
      start.addEpsilon(end)
      end.addEpsilon(start)
    } else if (expr.type === 'repeat1') {
      createNodes(expr.expr!!, start, end)
      end.addEpsilon(start)
    } else if (expr.type === 'term') {
      start.add(end, expr.word!!)
    } else {
      throw new Error("Impossible");
    }
  }
  const start = createNode()
  const end = createNode(true)
  createNodes(expr, start, end)
  return start
}

function nfa2dfa(start: NFANode): Array<DFANode> {
    const nodes: Array<DFANode> = []
    function addNode(node: DFANode) {
      if (! nodes.some(x => x.isSame(node))) {
        nodes.push(node)
        return true
      }
      return false
    }
    function findOrCreate(n: NFANode[]) {
      const newNode = new DFANode(n)
      const existingNode = nodes.find(x => x.isSame(newNode))
      if (existingNode) {
        return existingNode
      }
      toProcess.push(newNode)
      return newNode
    }
    const toProcess = [ new DFANode([ start ]) ]
    while (toProcess.length > 0) {
      const node = toProcess.pop()!!
      if (addNode(node)) {
        node.oldTransitions().forEach((n, t) => {
          node.add(findOrCreate(n), t)
        })
      }
    }
    return nodes
}

function printAutomaton(nodes: Array<DFANode>) {
  let out = 'digraph G {\n';
  nodes.forEach(n => {
    const shape = n.isFinal ? 'box' : 'ellipse'
    out += `n_${n.id()} [shape="${shape}"];\n`
    n.transitions.forEach((x, t) => {
      out += `n_${n.id()} -> n_${x.id()} [label="${t.name}"];\n`
    })
  })
  out += '}\n'
  return out
}

function printInterfaces(nodes: Array<DFANode>, resultType: ArgType) {
  let out = '';
  const imports = new Map<string, string[]>()
  addType(resultType, imports)
  nodes.forEach(n => {
    n.transitions.forEach((x, t) => {
      t.args.forEach(a => addType(a, imports))
    })
  })
  imports.forEach((names, module) => {
    out += `import { ${names.join(', ') } } from '${module}'\n`
  })
  out += "\n"
  const baseName = resultType.name + "Builder"
  const interfaceIds = new Map<DFANode, string>()
  nodes.forEach((n, id) => {
    interfaceIds.set(n, `${id === 0 ? '' : id}`)
  })
  nodes.forEach(n => {
    out += `export interface ${baseName}${interfaceIds.get(n)} {\n`
    if (n.isFinal) {
      out += `  build(): ${resultType.name}\n`
    }
    n.transitions.forEach((x, t) => {
      out += `  ${t.name}(${t.args.map((a, i) => '_' + i + ': ' + a.name).join(', ')}): ${baseName}${interfaceIds.get(x)}\n`
    })
    out += '}\n'
  })
  return out
}

function addType(type: ArgType, imports: Map<string, string[]>) {
  if (type.module) {
    const moduleImport = imports.get(type.module) ?? []
    moduleImport.push(type.name);
    imports.set(type.module, moduleImport)
  }
}

glob.globSync('**/*.grammar.ts').forEach(file => {
  console.log(`Processing ${file}`)
  const node = createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ScriptTarget.Latest
  );
  processFile(node)
})
