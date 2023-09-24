
class Seq:
    def __init__(self, *elements):
        self.elements = elements

    def __str__(self):
        return "seq(%s)" % ",".join(map(str, self.elements))

class Alternative:
    def __init__(self, *elements):
        self.elements = elements

    def __str__(self):
        return "alternative(%s)" % ",".join(map(str, self.elements))

class Repeat:
    def __init__(self, element):
        self.element = element

    def __str__(self):
        return "repeat(%s)" % str(self.element)

class Repeat1:
    def __init__(self, element):
        self.element = element

    def __str__(self):
        return "repeat1(%s)" % str(self.element)


class Term:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return "term(%s)" % self.name

node_id = 1

class Node:
    def __init__(self):
        global node_id
        self.number = node_id
        node_id += 1
        self.transitions = {}
        self.epsilon = []

    def add(self, next_node, term):
        self.transitions[term] = next_node

    def add_epsilon(self, next_node):
        self.epsilon.append(next_node)

class DFANode:
    def __init__(self, nodes):
        self.is_final = False
        self.nodes = set([])
        self.transitions = {}
        to_visit = nodes[:]
        while len(to_visit) > 0:
            next_node = to_visit.pop(0)
            if not next_node in self.nodes:
                self.nodes.add(next_node)
                for tt in next_node.epsilon:
                    to_visit.append(tt)

    def __eq__(self, other):
        return self.nodes == other.nodes

    def __repr__(self):
        return "DFA(%s)" % ",".join(map(lambda x: str(x.number),self.nodes))

    def old_transitions(self):
        transitions = {}
        for next_node in self.nodes:
            for t, n in next_node.transitions.items():
                if not t in transitions:
                   transitions[t] = [n]
                else:
                   transitions[t].append(n)
        return transitions

    def add(self, term, next_node):
        self.transitions[term] = next_node


def make_nodes(grammar):
    if isinstance(grammar, Seq):
        start = None
        end = None
        for element in grammar.elements:
            a, b = make_nodes(element)
            if start is None:
                start = a
                end = b
            else:
                end.add_epsilon(a)
                end = b
        return (start, end)

    if isinstance(grammar, Alternative):
        start = Node()
        end = Node()
        for element in grammar.elements:
            a, b = make_nodes(element)
            start.add_epsilon(a)
            b.add_epsilon(end)
        return (start, end)

    if isinstance(grammar, Repeat):
        start, end = make_nodes(grammar.element)
        start.add_epsilon(end)
        end.add_epsilon(start)
        return (start, end)

    if isinstance(grammar, Repeat1):
        start, end = make_nodes(grammar.element)
        end.add_epsilon(start)
        return (start, end)

    if isinstance(grammar, Term):
        start = Node()
        end = Node()
        start.add(end, grammar.name)
        return (start, end)
    raise Exception("TODO %s" % type(grammar))


def nfa_to_dfa(start, end):
    nodes = []
    def add_node(node):
        if not node in nodes:
            nodes.append(node)
            return True
        return False

    to_process = [ DFANode([ start ]) ]
    while len(to_process) > 0:
        node = to_process.pop(0)
        if add_node(node):
            for t, n in node.old_transitions().items():
                next_node = DFANode(n)
                to_process.append(next_node)
                node.add(t, next_node)
    for node in nodes:
        if end in node.nodes:
            node.is_final = True
    return nodes

grammar = Seq(Term('of'), Repeat(Alternative(
    Term('fullArticle'),
    Seq(Term('article'), Repeat1(Term('modele')))
)))

start, end = make_nodes(grammar)

out = open('out.dot', 'w')
out.write("digraph G {\n")
to_print = [ start ]
printed = []
while len(to_print) > 0:
    n = to_print.pop(0)
    if not n in printed:
        printed.append(n)
        for t, x in n.transitions.items():
            out.write("n_%d -> n_%d [label=\"%s\"];\n" % (n.number, x.number, t))
            to_print.append(x)
        for x in n.epsilon:
            out.write("n_%d -> n_%d;\n" % (n.number, x.number))
            to_print.append(x)

out.write("}\n")
out.close()

nodes = nfa_to_dfa(start, end)

out = open('dfa.dot', 'w')
out.write("digraph G {\n")
def get_index(n):
    return "_".join(map(lambda x: str(x.number), n.nodes))
for node in nodes:
    if node.is_final:
        out.write("n_%s [shape=\"box\"];\n" % get_index(node))
    for t, x in node.transitions.items():
        out.write("n_%s -> n_%s [label=\"%s\"];\n"
                % (get_index(node), get_index(x), t))

out.write("}\n")
out.close()
