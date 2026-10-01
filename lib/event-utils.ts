// Centralized Event Classification & Group Configurations for PMSA Arts Fest 26-27

export type EventGroupType = 'INDIVIDUAL' | 'ONE_GROUP_PER_TEAM' | 'TWO_GROUPS_PER_TEAM';

export interface EventConfig {
  isGroup: boolean;
  groupType: EventGroupType;
  maxGroupsPerTeam: number;
  studentsPerGroup: number;
  allowedCodeLetters: string[];
}

// Check if an event is a group event
export function isGroupEvent(event: {
  name?: string;
  grade_type?: string;
  category?: string;
  max_participants_per_team?: number;
}): boolean {
  if (!event) return false;
  const name = (event.name || '').trim().toUpperCase();
  const grade = (event.grade_type || '').trim().toUpperCase();

  // Category C events are all group events
  if (grade === 'C') return true;

  // Category B and other group events
  if (
    name.includes('BROCHURE MAKING') ||
    name.includes('STORY WAVING') ||
    name.includes('STORY WEAVING') ||
    name.includes('ARABIC COMMENTARY') ||
    name.includes('COMMENTARY ARABIC')
  ) {
    return true;
  }

  // Conversation events
  if (name.includes('CONVERSATION ENG') || name.includes('CONVERSATION MAL')) {
    return true;
  }

  return false;
}

// Get group configuration for an event
export function getEventGroupConfig(event: {
  name?: string;
  grade_type?: string;
  category?: string;
  max_participants_per_team?: number;
}): EventConfig {
  const name = (event?.name || '').trim().toUpperCase();
  const isGroup = isGroupEvent(event);

  if (!isGroup) {
    return {
      isGroup: false,
      groupType: 'INDIVIDUAL',
      maxGroupsPerTeam: 1,
      studentsPerGroup: 1,
      allowedCodeLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    };
  }

  // Two groups per team events: CONVERSATION ENG & CONVERSATION MAL
  if (name.includes('CONVERSATION ENG') || name.includes('CONVERSATION MAL')) {
    return {
      isGroup: true,
      groupType: 'TWO_GROUPS_PER_TEAM',
      maxGroupsPerTeam: 2,
      studentsPerGroup: 2,
      allowedCodeLetters: ['A', 'B', 'C', 'D', 'E', 'F']
    };
  }

  // One group per team events: BROCHURE MAKING (3 students), STORY WAVING (3 students), and all other Category C events
  let studentsPerGroup = 3;
  if (name.includes('BROCHURE MAKING') || name.includes('STORY WAVING') || name.includes('STORY WEAVING')) {
    studentsPerGroup = 3;
  } else if (event?.max_participants_per_team) {
    studentsPerGroup = event.max_participants_per_team;
  }

  return {
    isGroup: true,
    groupType: 'ONE_GROUP_PER_TEAM',
    maxGroupsPerTeam: 1,
    studentsPerGroup,
    allowedCodeLetters: ['A', 'B', 'C']
  };
}
