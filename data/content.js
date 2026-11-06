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
    college: 'Armed Forces Command and Staff College',
    department: 'Department of Air Warfare',
    chronicle: 'Chronicle of the Directing Staff',
    tagline: 'Honouring the officers who have taught air warfare to the College’s students',
    touchToBegin: 'Touch to begin',
    boardTitle: 'Staff roll',
    boardPlace: 'Jaji',

    navStaff: 'Directing Staff',
    navSenior: 'Senior Course',
    navJunior: 'Junior Course',

    menuStaff: 'The Directing Staff',
    menuStaffSub: 'Every officer posted to the Department as Directing Staff, year by year',
    menuSenior: 'Chief Instructors, Senior Course',
    menuSeniorSub: 'The officers who have led the teaching of the Senior Course',
    menuJunior: 'Chief Instructors, Junior Course',
    menuJuniorSub: 'The officers who have led the teaching of the Junior Course',

    staffTitle: 'The Directing Staff',
    seniorTitle: 'Chief Instructors · Senior Course',
    juniorTitle: 'Chief Instructors · Junior Course',
    chiefInstructor: 'Chief Instructor',
    seniorCourse: 'Senior Course',
    juniorCourse: 'Junior Course',
    directingStaff: 'Directing Staff',

    modeYear: 'By year',
    modeName: 'A – Z',
    modeBranch: 'By branch',
    modeServing: 'Serving now',
    joinedIn: 'Joined in',
    onStaffIn: 'On the staff in',
    sweepHint: 'Tap or sweep along the years',
    letterHint: 'Tap a letter for surnames beginning with it',
    noOne: 'No one on the roll here',

    rank: 'Rank',
    serviceNo: 'Service No.',
    specialty: 'Specialty',
    tour: 'Tour as Directing Staff',
    tenure: 'Tenure',
    duration: 'Duration',
    service: 'Air force',
    rollNo: 'On the roll',
    of: 'of',
    serving: 'Serving',
    present: 'Present',
    tbc: 'To be confirmed',
    notRecorded: 'Not recorded',
    specialtyMissing: 'Specialty not recorded',
    precededBy: 'Preceded by',
    succeededBy: 'Succeeded by',
    alsoChief: 'Later Chief Instructor',
    asStaff: 'Earlier as Directing Staff',
    sameIntake: 'Joined the same month',
    close: 'Close',
    idleReturnNote: 'Returning to the welcome screen…'
  },

  ranks: {
    'Sqn Ldr': 'Squadron Leader',
    'Wg Cdr': 'Wing Commander',
    'Gp Capt': 'Group Captain',
    'Air Cdre': 'Air Commodore'
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
