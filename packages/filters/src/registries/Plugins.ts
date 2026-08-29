/**
 * Plugin system that manages separate registries for class-based plugins
 */

import type {
  ArrayLogicFunctionInterface,
  ComparatorFunctionInterface,
  LogicGateFunctionInterface,
  OperatorFunctionInterface,
  PluginInstanceInterface
} from '../interfaces.js';

import { ArrayLogic } from '../enums/ArrayLogic.js';
import { Comparator } from '../enums/Comparator.js';
import { ErrorCodes } from '../enums/ErrorCodes.js';
import { LogicGate } from '../enums/LogicGate.js';
import { Operator } from '../enums/Operator.js';
import { PluginError } from '../errors/PluginError.js';
import { Registry } from './Registry.js';

export class Plugins {
  public readonly arrayLogic: Registry<ArrayLogicFunctionInterface>;
  public readonly comparators: Registry<ComparatorFunctionInterface>;
  public readonly gates: Registry<LogicGateFunctionInterface>;
  public readonly operators: Registry<OperatorFunctionInterface>;

  constructor(config?: { 'plugins'?: PluginInstanceInterface[] }) {
    // Initialize all registries
    this.operators = new Registry('operator', Operator);
    this.comparators = new Registry('comparator', Comparator);
    this.gates = new Registry('gate', LogicGate);
    this.arrayLogic = new Registry('arrayLogic', ArrayLogic);

    // Register plugin instances if provided
    const plugins = config?.plugins;

    if (plugins !== undefined) {
      const pluginsLength = plugins.length;

      for (let pluginIndex = 0; pluginIndex < pluginsLength; pluginIndex += 1) {
        const plugin = plugins[pluginIndex];

        if (plugin !== undefined) {
          this.registerPlugin(plugin);
        }
      }
    }
  }

  private static registerEntries<T>(registry: Registry<T>, record: Record<string, T> | undefined, namespace: string): void {
    if (record === undefined) {
      return;
    }

    const entries = Object.entries(record);
    const entriesLength = entries.length;

    for (let entryIndex = 0; entryIndex < entriesLength; entryIndex += 1) {
      const entry = entries[entryIndex];

      if (entry === undefined) {
        continue;
      }
      const [name, func] = entry;
      const key = `${namespace}:${name}`;

      registry.set(key, func);
    }
  }

  /**
   * Register a plugin instance (idiomatic Node.js class)
   */
  private registerPlugin(plugin: PluginInstanceInterface): void {
    // Runtime validation: Ensure plugin is a proper class instance
    if (plugin === null || typeof plugin !== 'object') {
      throw new PluginError(
        'Plugin must be a class instance with getNamespace() method',
        ErrorCodes.CORE.PLUGIN_VALIDATION_ERROR,
        {}
      );
    }

    if (typeof plugin.getNamespace !== 'function') {
      throw new PluginError(
        'Plugin must implement getNamespace() method that returns a string namespace',
        ErrorCodes.CORE.PLUGIN_VALIDATION_ERROR,
        {}
      );
    }

    const namespace = plugin.getNamespace();

    if (typeof namespace !== 'string' || namespace.length === 0) {
      throw new PluginError(
        'Plugin getNamespace() must return a non-empty string',
        ErrorCodes.CORE.PLUGIN_VALIDATION_ERROR,
        {}
      );
    }

    Plugins.registerEntries(this.operators, plugin.operators, namespace);
    Plugins.registerEntries(this.comparators, plugin.comparators, namespace);
    Plugins.registerEntries(this.gates, plugin.gates, namespace);
    Plugins.registerEntries(this.arrayLogic, plugin.arrayLogic, namespace);
  }
}
