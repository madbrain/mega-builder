
import { grammar, choice, repeat0, seq, term, args, repeat1 } from './generator/api'
import { Catalogue, Periode } from './model'

export default grammar<Catalogue>(
    seq(
        term('of', args<[Periode]>()),
        repeat0(
            choice(
                term('article', args<[string, number, string]>()),
                seq(
                    term('article', args<[string]>()),
                    repeat1(term('modele', args<[string, number, string]>()))
                )
            )
        )
    )
)
