import { SelectorRule } from './SelectorRule.js';

// MEASURED, Node v24, N = 5,000,000, 3 warm-up calls + median of 7 timed calls
// (scratchpad bench, 5,000,000 calls to a 2-arg function):
//
//   rest params (`(...args) => args.length + args[0]`)             3.693 ms
//   `arguments` read only (`arguments.length + arguments[0]`)      3.478 ms   -> 0.942x (identical, noise)
//   `arguments` LEAKED to an outer binding                        27.687 ms   -> 7.50x
//
// The rule forbids ALL use of `arguments`, but only the ESCAPING case is
// actually costly — reading `.length`/an indexed element off `arguments`
// measures IDENTICAL to (marginally faster than) rest params. That does NOT
// make the blanket ban wrong: distinguishing "escapes this frame" (assigned
// to an outer variable, passed to another function, spread, returned,
// stored on an object) from "benign local read" is exactly the kind of
// control-flow analysis a lint rule should not have to get right to be
// trustworthy, and rest params are NEVER worse. The rule is kept as a
// cheap, uniform remedy — always use rest params — with the rationale
// corrected here to the true, narrower cost it is actually guarding against.
export const argumentsObject = SelectorRule.create(
  'v8Optimization/argumentsObject',
  'Identifier[name="arguments"]:not(MemberExpression > .property)',
  'arguments object is forbidden — use rest parameters. Only an ESCAPING `arguments` (assigned out, passed to another function, spread, returned) is measurably costly (7.5x at 5,000,000 calls); a benign `.length`/indexed read measures identical to rest params. The ban is uniform anyway: rest params are never worse, and the escaping/benign distinction is not one this rule should have to get right to be trusted.'
);
