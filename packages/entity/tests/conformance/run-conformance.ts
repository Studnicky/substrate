#!/usr/bin/env node
/**
 * The JSON Schema Test Suite correctness gate for `@studnicky/entity`.
 *
 * Runs the vendored draft2020-12 required suite against both shipped entrypoints
 * (`@studnicky/entity/node` and `@studnicky/entity/browser`, both specialised-closure
 * engine backed), compares each entrypoint's failing-case set against its recorded
 * baseline, and fails when a case regresses (a new failure) or the baseline goes
 * stale (a recorded failure now passes and the baseline was not updated to drop it).
 * Optional-directory suites are measured and reported but not gated; see `optional-decision.md`.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';

import * as browserEntry from '../../src/browser/index.js';
import * as nodeEntry from '../../src/node/index.js';
import { ConformanceBaselineComparator } from './ConformanceBaselineComparator.js';
import { ConformanceBaselineStore } from './ConformanceBaselineStore.js';
import { ConformanceReportPrinter } from './ConformanceReportPrinter.js';
import { ConformanceRunner } from './ConformanceRunner.js';
import { ConformanceSuiteLoader } from './ConformanceSuiteLoader.js';
import { CONFORMANCE_DIALECT } from './constants/CONFORMANCE_DIALECT.js';
import { CONFORMANCE_SUITE_PATTERNS } from './constants/CONFORMANCE_SUITE_PATTERNS.js';

const CONFORMANCE_DIR = dirname(fileURLToPath(import.meta.url));
const SUITE_ROOT = resolve(CONFORMANCE_DIR, 'vendor/json-schema-test-suite');
const BASELINE_DIR = resolve(CONFORMANCE_DIR, 'baselines');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

class ConformanceGate {
  /**
   * `optional/format/*` fixtures declare the plain default dialect, which is annotation-only. The suite intends
   * those cases for implementations that assert formats, so this shadows the default dialect's own `$id` with a
   * minimal metaschema naming the Format-Assertion vocabulary — driving `SchemaVocabularyResolver` down the
   * assert path for this measurement alone, without touching the default dialect used everywhere else.
   */
  public static withFormatAssertionDialect(remotes: ReadonlyMap<string, object | boolean>): ReadonlyMap<string, object | boolean> {
    const result = new Map(remotes);
    result.set(CONFORMANCE_DIALECT.defaultDialectUri, CONFORMANCE_DIALECT.formatAssertionMetaschema);
    return result;
  }

  public static gateEngine(report: ConformanceReportInterface): boolean {
    process.stdout.write(`${ConformanceReportPrinter.render(report)}\n`);
    if (UPDATE_BASELINE) {
      ConformanceBaselineStore.write(BASELINE_DIR, report);
      process.stdout.write(`  baseline written: ${String(report.failed)} known failures recorded\n`);
      return true;
    }
    const baseline = ConformanceBaselineStore.read(BASELINE_DIR, report.engineName);
    const diff = ConformanceBaselineComparator.diff(report.failures, baseline);
    if (diff.regressions.length === 0 && diff.resolved.length === 0) {
      process.stdout.write(`  baseline: ${String(baseline.length)} known failures, no regressions, no stale entries\n`);
      return true;
    }
    const regressionCount = diff.regressions.length;
    for (let index = 0; index < regressionCount; index += 1) {
      const regression = diff.regressions[index]!;
      process.stdout.write(`  REGRESSION ${regression.relativePath} :: ${regression.groupDescription} :: ${regression.caseDescription} — ${regression.reason}\n`);
    }
    const resolvedCount = diff.resolved.length;
    for (let index = 0; index < resolvedCount; index += 1) {
      const resolvedEntry = diff.resolved[index]!;
      process.stdout.write(`  STALE BASELINE ${resolvedEntry.relativePath} :: ${resolvedEntry.groupDescription} :: ${resolvedEntry.caseDescription} — now passes, remove from baseline (run --update-baseline)\n`);
    }
    return false;
  }

  public static reportOptional(label: string, nodeReport: ConformanceReportInterface, browserReport: ConformanceReportInterface): void {
    process.stdout.write(`${label}\n`);
    process.stdout.write(`  ${ConformanceReportPrinter.renderSummary(nodeReport)}\n`);
    process.stdout.write(`  ${ConformanceReportPrinter.renderSummary(browserReport)}\n`);
  }

  public static main(): void {
    const requiredFiles = ConformanceSuiteLoader.loadPattern(SUITE_ROOT, CONFORMANCE_SUITE_PATTERNS.required);
    const optionalCoreFiles = ConformanceSuiteLoader.loadOptionalCore(SUITE_ROOT);
    const optionalFormatFiles = ConformanceSuiteLoader.loadPattern(SUITE_ROOT, CONFORMANCE_SUITE_PATTERNS.optionalFormat);
    const optionalFormatAssertionFiles = ConformanceSuiteLoader.loadPattern(SUITE_ROOT, CONFORMANCE_SUITE_PATTERNS.optionalFormatAssertion);
    const remotes = ConformanceSuiteLoader.loadRemotes(SUITE_ROOT);

    const nodeCompile = nodeEntry.EntityCompiler;
    const browserCompile = browserEntry.EntityCompiler;

    process.stdout.write('=== required suite (gated) ===\n');
    const nodeRequired = ConformanceRunner.run('node', requiredFiles, nodeCompile, remotes);
    const browserRequired = ConformanceRunner.run('browser', requiredFiles, browserCompile, remotes);
    const nodeGatePassed = ConformanceGate.gateEngine(nodeRequired);
    const browserGatePassed = ConformanceGate.gateEngine(browserRequired);

    process.stdout.write('\n=== optional suites (measured, not gated) ===\n');
    ConformanceGate.reportOptional(
      'optional/* (excluding format, format-assertion)',
      ConformanceRunner.run('node', optionalCoreFiles, nodeCompile, remotes), ConformanceRunner.run('browser', optionalCoreFiles, browserCompile, remotes)
    );
    const formatAssertionRemotes = ConformanceGate.withFormatAssertionDialect(remotes);
    ConformanceGate.reportOptional(
      'optional/format/*',
      ConformanceRunner.run('node', optionalFormatFiles, nodeCompile, formatAssertionRemotes),
      ConformanceRunner.run('browser', optionalFormatFiles, browserCompile, formatAssertionRemotes)
    );
    ConformanceGate.reportOptional(
      'optional/format-assertion.json',
      ConformanceRunner.run('node', optionalFormatAssertionFiles, nodeCompile, remotes), ConformanceRunner.run('browser', optionalFormatAssertionFiles, browserCompile, remotes)
    );

    if (UPDATE_BASELINE) {
      process.stdout.write('\nbaselines updated.\n');
    } else if (nodeGatePassed && browserGatePassed) {
      process.stdout.write('\nconformance gate passed against the recorded baseline.\n');
    } else {
      process.stdout.write('\nconformance gate FAILED: a required-suite regression or a stale baseline entry was found.\n');
      process.exitCode = 1;
    }
  }
}

ConformanceGate.main();
