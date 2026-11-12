/* ============================================================
   OUR INSTRUCTORS — kiosk text and settings
   Department of Air Warfare, Armed Forces Command and Staff College, Jaji.

   Every word the kiosk shows lives here, so it can be reworded without
   touching the app code. The rolls themselves are in data/roll.js.
   ============================================================ */

var DAW_CONTENT = {

  ui: {
    appTitle: 'Our Instructors',
    appKicker: 'Department of Air Warfare · AFCSC Jaji',
    college: 'Armed Forces Command and Staff College, Jaji',
    department: 'Department of Air Warfare',
    tagline: 'Honouring the officers who have taught air warfare to the College’s students.',
    touchToBegin: 'Touch to begin',
    honoursTitle: 'Directing Staff',
    honoursSub: 'Department of Air Warfare',

    navHome: 'Home',
    navChiefs: 'Chief Instructors',
    navS01: 'S01 A7',
    navStaff: 'Directing Staff',
    navSearch: 'Search',

    homeTitle: 'The staff room',
    homeLede: 'The officers who have led the Department’s two courses, its S01 A7, and all who have taught in it.',
    menuChiefs: 'Chief Instructors',
    menuChiefsSub: 'The line of officers who have led the teaching of each course. Tap a course to open it.',
    menuStaff: 'The Directing Staff',
    menuStaffSub: 'Every officer posted to the Department as Directing Staff, by year, name or branch',
    menuS01: 'S01 A7',
    menuS01Sub: 'The chronicle of the Department’s S01 A7, in order of appointment',
    menuSearch: 'Find an officer',
    menuSearchSub: 'Search the rolls by name or service number',

    searchTitle: 'Find an officer',
    searchHint: 'Type a surname, initials or a service number such as 2139 or NAF/2139.',
    searchPlaceholder: 'Name or service number',
    searchExample: 'Okpala   ·   NAF/1904',
    searchEmpty: 'No one on the rolls matches',
    searchStart: 'Start typing to search all the Chief Instructors, S01 A7 and Directing Staff.',
    space: 'Space',
    clear: 'Clear',

    staffTitle: 'The Directing Staff',
    chiefsTitle: 'Chief Instructors',
    s01Title: 'S01 A7',
    s01Kicker: 'Chronicle of S01 A7',
    alsoS01: 'Also S01 A7',
    chiefInstructor: 'Chief Instructor',
    seniorCourse: 'Senior Course',
    juniorCourse: 'Junior Course',
    directingStaff: 'Directing Staff',
    lineHint: 'Tap any link in the line of succession',

    modeYear: 'By year',
    modeName: 'By name',
    modeBranch: 'By branch',
    modeServing: 'Serving now',
    joinedIn: 'Joined in',
    onStaffIn: 'On the staff in',
    sweepHint: 'Tap or sweep along the years above the cards. The tall bar shows who was on the staff; the dark bar, who joined.',
    servingNote: 'The officers on the Directing Staff of the Department today.',
    noOne: 'No one on the roll here',
    officers: 'officers',
    officer: 'officer',

    rank: 'Rank on posting',
    serviceNo: 'Service No.',
    specialty: 'Specialty',
    tour: 'Tour as Directing Staff',
    tenure: 'Tenure',
    duration: 'Duration',
    service: 'Air force',
    of: 'of',
    serving: 'Serving',
    present: 'Present',
    tbc: 'To be confirmed',
    notRecorded: 'Not recorded',
    specialtyMissing: 'Specialty not recorded',
    precededBy: 'Preceded by',
    succeededBy: 'Succeeded by',
    alsoChief: 'Later Chief Instructor',
    asStaff: 'On the Directing Staff',
    sameIntake: 'Joined the same month',
    idleReturnNote: 'Returning to the welcome screen…'
  },

  /* Ranks: full name, plural, and the shoulder-board insignia shown for it
     (from Wikipedia, "Military ranks of Nigeria"; see assets/ranks/README.txt). */
  ranks: {
    'Sqn Ldr':  { name: 'Squadron Leader', plural: 'Squadron Leaders', insignia: 'assets/ranks/sqn-ldr.png' },
    'Wg Cdr':   { name: 'Wing Commander',  plural: 'Wing Commanders',  insignia: 'assets/ranks/wg-cdr.png' },
    'Gp Capt':  { name: 'Group Captain',   plural: 'Group Captains',   insignia: 'assets/ranks/gp-capt.png' },
    'Air Cdre': { name: 'Air Commodore',   plural: 'Air Commodores',   insignia: 'assets/ranks/air-cdre.png' }
  },

  services: {
    naf: { name: 'Nigerian Air Force', short: 'NAF' },
    raf: { name: 'Royal Air Force', short: 'RAF' },
    gaf: { name: 'Ghana Air Force', short: 'GAF' }
  },

  /* Specialties are grouped into branches for the "By branch" view.
     Each officer's branch is set in data/roll.js. */
  branches: [
    { id: 'aircrew',        label: 'Aircrew',              note: 'Pilots, navigators and UAV operators' },
    { id: 'engineering',    label: 'Engineering',          note: 'Aircraft, armament, electrical and works' },
    { id: 'signals',        label: 'Communications',       note: 'Communications-electronics, radar and IT' },
    { id: 'operations',     label: 'Air Traffic & Met',    note: 'Air traffic control, meteorology and survey' },
    { id: 'intelligence',   label: 'Intelligence',         note: 'Air intelligence' },
    { id: 'logistics',      label: 'Logistics & Finance',  note: 'Supply, logistics, catering and finance' },
    { id: 'administration', label: 'Administration',       note: 'Personnel, education, legal, police and regiment' },
    { id: 'medical',        label: 'Medical',              note: 'Medical, dental, pharmacy and allied health' },
    { id: 'allied',         label: 'Allied air forces',    note: 'Royal Air Force and Ghana Air Force' }
  ]
};
