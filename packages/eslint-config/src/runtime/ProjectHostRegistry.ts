import type { ProjectHostInterface } from '../interfaces/ProjectHostInterface.js';

import { PROJECT_HOST_REGISTRY_CONSTANTS } from './constants/ProjectHostRegistryConstants.js';

/** Selects a validated project host from lint settings or the current runtime default. */
export class ProjectHostRegistry {
  private static defaultHost: ProjectHostInterface | undefined;

  public static hostFor(context: { readonly 'settings': unknown }): ProjectHostInterface | undefined {
    const configuredHost = ProjectHostRegistry.hostFromSettings(context.settings);
    const result = configuredHost ?? ProjectHostRegistry.defaultHost;

    return result;
  }

  public static setDefaultHost(host: ProjectHostInterface | undefined): void {
    ProjectHostRegistry.defaultHost = host;
  }

  private static hostFromSettings(settings: unknown): ProjectHostInterface | undefined {
    if (typeof settings !== 'object' || settings === null) {
      return undefined;
    }

    const configuredHost = ProjectHostRegistry.projectHostSetting(settings);

    if (!ProjectHostRegistry.isProjectHost(configuredHost)) {
      return undefined;
    }

    return configuredHost;
  }

  private static isProjectHost(candidate: unknown): candidate is ProjectHostInterface {
    if (typeof candidate !== 'object' || candidate === null) {
      return false;
    }

    const methodNames = PROJECT_HOST_REGISTRY_CONSTANTS.methodNames;
    const methodCount = methodNames.length;

    for (let index = 0; index < methodCount; index += 1) {
      const methodName = methodNames[index]!;

      if (!ProjectHostRegistry.isFunctionProperty(candidate, methodName)) {
        return false;
      }
    }

    return true;
  }

  private static isFunctionProperty(candidate: object, propertyName: string): boolean {
    try {
      const property: unknown = Reflect.get(candidate, propertyName);
      const result = typeof property === 'function';

      return result;
    } catch {
      return false;
    }
  }

  private static projectHostSetting(settings: object): unknown {
    try {
      const result: unknown = Reflect.get(settings, PROJECT_HOST_REGISTRY_CONSTANTS.settingName);

      return result;
    } catch {
      return undefined;
    }
  }
}
