import ts from 'typescript';
import fs from 'node:fs';

const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function requiresBinding(expr) {
  if (ts.isBinaryExpression(expr)) return true;
  if (ts.isCallExpression(expr)) return true;
  if (ts.isConditionalExpression(expr)) return true;
  return false;
}

const matches = [];
function visit(node) {
  if (ts.isReturnStatement(node) && node.expression && requiresBinding(node.expression)) {
    matches.push({ start: node.getStart(source), end: node.getEnd(), text: node.getText(source) });
  }
  ts.forEachChild(node, visit);
}
visit(source);

for (const m of matches) {
  if (m.start > 6800 && m.start < 7100) {
    console.log(JSON.stringify(m));
  }
}
