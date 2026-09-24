#!/usr/bin/env node
/**
 * The JSON Schema Test Suite correctness gate for `@studnicky/entity`.
 *
 * Runs the vendored draft2020-12 required suite against both shipped entrypoints
 * (`@studnicky/entity/node`, Ajv-backed; `@studnicky/entity/browser`, cfworker-backed),
 * compares each engine's failing-case set against its recorded baseline, and fails
 * when a case regresses (a new failure) or the baseline goes stale (a recorded
 * failure now passes and the baseline was not updated to drop it). Optional-directory
 * suites are measured and reported but not gated; see `optional-decision.md`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EntityCompiler as BrowserEntityCompiler } from '../../src/browser/index.js';
import { EntityCompiler as NodeEntityCompiler } from '../../src/node/index.js';
import { ConformanceBaselineComparator } from './ConformanceBaselineComparator.js';
import type { ConformanceBaselineEntryInterface } from './interfaces/ConformanceBaselineEntryInterface.js';
import { ConformanceReportPrinter } from './ConformanceReportPrinter.js';
import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';
import { ConformanceRunner } from './ConformanceRunner.js';
import { ConformanceSuiteLoader } from './ConformanceSuiteLoader.js';

const CONFORMANCE_DIR = dirname(fileURLToPath(import.meta.url));
const SUITE_ROOT = resolve(CONFORMANCE_DIR, 'vendor/json-schema-test-suite');
const BASELINE_DIR = resolve(CONFORMANCE_DIR, 'baselines');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

function readBaseline(engineName: string): readonly ConformanceBaselineEntryInterface[] {
  const path = resolve(BASELINE_DIR, `${engineName}-known-failures.json`);
  const result = JSON.parse(readFileSync(path, 'utf8')) as readonly ConformanceBaselineEntryInterface[];
  return result;
}

function writeBaseline(engineName: string, report: ConformanceReportInterface): void {
  const path = resolve(BASELINE_DIR, `${engineName}-known-failures.json`);
  const entries: ConformanceBaselineEntryInterface[] = report.failures.map((failure) => ({
    'relativePath': failure.relativePath,
    'groupDescription': failure.groupDescription,
    'caseDescription': failure.caseDescription
  }));
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`);
}

function gateEngine(report: ConformanceReportInterface): boolean {
  process.stdout.write(`${ConformanceReportPrinter.render(report)}\n`);
  if (UPDATE_BASELINE) {
    writeBaseline(report.engineName, report);
    process.stdout.write(`  baseline written: ${String(report.failed)} known failures recorded\n`);
    return true;
  }
  const baseline = readBaseline(report.engineName);
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

function reportOptional(label: string, nodeReport: ConformanceReportInterface, browserReport: ConformanceReportInterface): void {
  process.stdout.write(`${label}\n`);
  process.stdout.write(`  ${ConformanceReportPrinter.renderSummary(nodeReport)}\n`);
  process.stdout.write(`  ${ConformanceReportPrinter.renderSummary(browserReport)}\n`);
}

function main(): void {
  const requiredFiles = ConformanceSuiteLoader.loadRequired(SUITE_ROOT);
  const optionalCoreFiles = ConformanceSuiteLoader.loadOptionalCore(SUITE_ROOT);
  const optionalFormatFiles = ConformanceSuiteLoader.loadOptionalFormat(SUITE_ROOT);
  const optionalFormatAssertionFiles = ConformanceSuiteLoader.loadOptionalFormatAssertion(SUITE_ROOT);

  const nodeCompile = NodeEntityCompiler.compile.bind(NodeEntityCompiler);
  const browserCompile = BrowserEntityCompiler.compile.bind(BrowserEntityCompiler);

  process.stdout.write('=== required suite (gated) ===\n');
  const nodeRequired = ConformanceRunner.run('node', requiredFiles, nodeCompile);
  const browserRequired = ConformanceRunner.run('browser', requiredFiles, browserCompile);
  const nodeGatePassed = gateEngine(nodeRequired);
  const browserGatePassed = gateEngine(browserRequired);

  process.stdout.write('\n=== optional suites (measured, not gated) ===\n');
  reportOptional('optional/* (excluding format, format-assertion)', ConformanceRunner.run('node', optionalCoreFiles, nodeCompile), ConformanceRunner.run('browser', optionalCoreFiles, browserCompile));
  reportOptional('optional/format/*', ConformanceRunner.run('node', optionalFormatFiles, nodeCompile), ConformanceRunner.run('browser', optionalFormatFiles, browserCompile));
  reportOptional('optional/format-assertion.json', ConformanceRunner.run('node', optionalFormatAssertionFiles, nodeCompile), ConformanceRunner.run('browser', optionalFormatAssertionFiles, browserCompile));

  if (UPDATE_BASELINE) {
    process.stdout.write('\nbaselines updated.\n');
    return;
  }
  if (!nodeGatePassed || !browserGatePassed) {
    process.stdout.write('\nconformance gate FAILED: a required-suite regression or a stale baseline entry was found.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('\nconformance gate passed against the recorded baseline.\n');
}

main();
