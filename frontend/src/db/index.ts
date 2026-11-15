import Dexie, { type Table } from 'dexie';
import type { SubjectiveCheckIn, ExplainedAlert, TimelineBookmark, PatientProfile } from '../types';

export class NovaPulseDatabase extends Dexie {
  checkIns!: Table<SubjectiveCheckIn, number>;
  alerts!: Table<ExplainedAlert, string>;
  bookmarks!: Table<TimelineBookmark, number>;
  profiles!: Table<PatientProfile, string>;

  constructor() {
    super('NovaPulseDB');
    this.version(1).stores({
      checkIns: '++id, day, patientId, timestamp, concordanceScore',
      alerts: 'id, day, severity, domain, acknowledged',
      bookmarks: 'day, severity',
      profiles: 'id, code',
    });
  }
}

export const db = new NovaPulseDatabase();

// Offline-first initial database seeding helper
export async function initializeDatabase(
  defaultBookmarks: TimelineBookmark[],
  defaultProfiles: PatientProfile[]
): Promise<void> {
  try {
    const profileCount = await db.profiles.count();
    if (profileCount === 0) {
      await db.profiles.bulkPut(defaultProfiles);
    }
    const bookmarkCount = await db.bookmarks.count();
    if (bookmarkCount === 0) {
      await db.bookmarks.bulkPut(defaultBookmarks);
    }
  } catch (error) {
    // Non-blocking in incognito or restricted IndexedDB environments
    console.warn('IndexedDB initial seeding fallback notice:', error);
  }
}
