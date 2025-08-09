import { SgfCollection, SgfNode, SgfProp, SgfTree } from './ats';

//const isUpper = (c: string) => c >= 'A' && c <= 'Z';
const isLetter = (c: string) => /[A-Za-z]/.test(c);

export class SgfParser {
  private i = 0;
  constructor(private s: string) {}

  parse(): SgfCollection {
    const trees: SgfTree[] = [];
    this.skipWs();
    while (!this.eof()) {
      trees.push(this.parseGameTree());
      this.skipWs();
    }
    return { trees };
  }

  private parseGameTree(): SgfTree {
    this.expect('(');
    const nodes: SgfNode[] = [];
    this.skipWs();
    // RootNode + NodeSequence
    while (this.peek() === ';') nodes.push(this.parseNode());
    // {Tail}
    const children: SgfTree[] = [];
    while (this.peek() === '(') children.push(this.parseGameTree());
    this.expect(')');
    return { nodes, children };
  }

  private parseNode(): SgfNode {
    this.expect(';');
    const props: SgfProp[] = [];
    this.skipWs();
    while (isLetter(this.peek())) {
      const id = this.readIdent().toUpperCase(); // ignorare minuscole nel PropIdent
      const values: string[] = [];
      do {
        this.expect('[');
        values.push(this.readValue());
        this.expect(']');
        this.skipWs();
      } while (this.peek() === '['); // PropValue { PropValue }
      props.push({ id, values });
      this.skipWs();
    }
    return { props };
  }

  private readIdent(): string {
    const start = this.i;
    while (isLetter(this.peek())) this.i++;
    return this.s.slice(start, this.i);
  }

  private readValue(): string {
    let out = '';
    while (!this.eof()) {
      const ch = this.next();
      if (ch === ']') {
        this.i--;
        break;
      }
      if (ch === '\\') {
        const n = this.next();
        if (n === '\n' || n === '\r') continue; // newline escapata ignorata
        out += n; // include \] e \\ come carattere letterale
      } else {
        out += ch;
      }
    }
    return out;
  }

  private skipWs() {
    while (!this.eof() && /\s/.test(this.peek())) this.i++;
  }
  private expect(c: string) {
    if (this.peek() !== c)
      throw new Error(`SGF parse error: expected "${c}" at ${this.i}`);
    this.i++;
  }
  private peek(): string {
    return this.s[this.i];
  }
  private next(): string {
    return this.s[this.i++];
  }
  private eof(): boolean {
    return this.i >= this.s.length;
  }
}

export const parseSgf = (s: string) => new SgfParser(s).parse();
