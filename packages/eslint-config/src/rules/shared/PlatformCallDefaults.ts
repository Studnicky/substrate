import type { PlatformCallEntity } from '../PlatformCallEntity.js';

import { PLATFORM_GROUPS } from '../constants/PlatformCallGroups.js';

/** The default platform-call entries: one entry per owner and member of every group. */
export class PlatformCallDefaults {
  public static build(): readonly PlatformCallEntity.Type[] {
    const entries: PlatformCallEntity.Type[] = [];
    const groupCount = PLATFORM_GROUPS.length;

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const group = PLATFORM_GROUPS[groupIndex];

      group?.owners.forEach((owner) => {
        group.members.forEach((member) => {
          entries.push({ 'kind': group.kind, 'member': member, 'owner': owner, 'safeWhenLiteral': group.safeWhenLiteral });
        });
      });
    }

    return entries;
  }
}
