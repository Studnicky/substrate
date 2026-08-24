/**
 * Plugin system that manages separate registries for class-based plugins
 */

import type {
  ArrayLogicFunction,
  ComparatorFunction,
  LogicGateFunction,
  OperatorFunction,
  PluginInstance
} from '../types.js';

import { ArrayLogic } from '../enums/ArrayLogic.js';
import { Comparator } from '../enums/Comparator.js';
import { LogicGate } from '../enums/LogicGate.js';
import { Operator } from '../enums/Operator.js';
import { Registry } from './Registry.js';

export class Plugins {
  public readonly arrayLogic: Registry<ArrayLogicFunction>;
  public readonly comparators: Registry<ComparatorFunction>;
  public readonly gates: Registry<LogicGateFunction>;
  public readonly operators: Registry<OperatorFunction>;

  constructor(config?: { 'plugins'?: PluginInstance[] }) {
    // Initialize all registries
    this.operators = new Registry('operator', Operator);
    this.comparators = new Registry('comparator', Comparator);
    this.gates = new Registry('gate', LogicGate);
    this.arrayLogic = new Registry('arrayLogic', ArrayLogic);

    // Register plugin instances if provided
    if (config?.plugins) {
      for (const plugin of config.plugins) {
        this.registerPlugin(plugin);
      }
    }
  }

  /**
   * Register a plugin instance (idiomatic Node.js class)
   */
  private registerPlugin(plugin: PluginInstance): void {
    // Runtime validation: Ensure plugin is a proper class instance
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be a class instance with getNamespace() method');
    }

    if (typeof plugin.getNamespace !== 'function') {
      throw new Error('Plugin must implement getNamespace() method that returns a string namespace');
    }

    const namespace = plugin.getNamespace();

    if (typeof namespace !== 'string' || namespace.length === 0) {
      throw new Error('Plugin getNamespace() must return a non-empty string');
    }

    // Register operators
    if (plugin.operators) {
      for (const [
        name,
        func
      ] of Object.entries(plugin.operators)) {
        const key = `${namespace}:${name}`;

        this.operators.set(key, func);
      }
    }

    // Register comparators
    if (plugin.comparators) {
      for (const [
        name,
        func
      ] of Object.entries(plugin.comparators)) {
        const key = `${namespace}:${name}`;

        this.comparators.set(key, func);
      }
    }

    // Register gates
    if (plugin.gates) {
      for (const [
        name,
        func
      ] of Object.entries(plugin.gates)) {
        const key = `${namespace}:${name}`;

        this.gates.set(key, func);
      }
    }

    // Register array logic
    if (plugin.arrayLogic) {
      for (const [
        name,
        func
      ] of Object.entries(plugin.arrayLogic)) {
        const key = `${namespace}:${name}`;

        this.arrayLogic.set(key, func);
      }
    }
  }
}
