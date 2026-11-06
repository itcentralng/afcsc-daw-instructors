# Our Instructors

**Chronicle of the Directing Staff · Department of Air Warfare · Armed Forces Command and Staff College, Jaji**

Touch-screen kiosk honouring the instructors of the Department of Air
Warfare: every officer posted to the Department as Directing Staff (DS)
since 1976, and the Chief Instructors of the Senior Course and the Junior
Course. The Directors of the Department are not shown here: they have their
own kiosk, *Our Leaders* (`afcsc-leadership`), which this app is designed to
sit beside.

It is a static, offline web app (no build step, no internet needed) designed
for a 1920×1080 landscape display and scaled to fit any screen. It follows
the same pattern as the Our Leaders, Directorate of Procurement, Timbuktu
Triangle and Air Force History kiosks.

## Screens

- **Welcome**: the title with instrument readouts (Directing Staff, Chief
  Instructor tours, since, air forces) and a "Touch to begin" target box
  beside an airfield movements board, the **Staff roll · Jaji**, whose rows
  flip over one at a time to the next officer on the roll, with a live clock.
  Any touch begins.
- **Home**: three sections: The Directing Staff (with a skyline of postings
  per year), and the Chief Instructors of the Senior and Junior Courses (with
  their latest flight strips).
- **The Directing Staff**: all 429 officers as cards (rank braid, initials and
  surname, specialty, tour, and RAF / GAF / Serving / CI marks), in a track
  that drifts on its own. Four ways in:
  - **By year**: a ribbon of every year since 1976; tap or sweep a finger
    along it. The bright bar is how many joined that year, the faint bar how
    many were on the staff. Choose *Joined in* or *On the staff in*.
  - **A – Z**: tap the first letter of a surname.
  - **By branch**: Aircrew, Engineering, Communications, Air Traffic & Met,
    Intelligence, Logistics & Finance, Administration, Medical, and the
    allied air forces (Royal Air Force and Ghana Air Force).
  - **Serving now**: the officers on the staff today.
- **Officer record**: tap a card for the full record: roll number, rank,
  service number, specialty, tour, duration and air force; any Chief
  Instructor appointment the officer later held (tap to go to it); and the
  others who joined in the same month. Previous/next (or swipe) step through
  the cards that were on screen.
- **Chief Instructors · Senior Course** and **· Junior Course**: a spotlight
  and a board of flight strips. The spotlight shows one Chief Instructor
  (place in the line, rank braid, tenure, duration, predecessor and
  successor) and moves on every 8 seconds, with a progress bar. Where the
  officer was earlier on the Directing Staff, a chip opens that record; where
  they were Chief Instructor of the other course too, a chip goes there. The
  strips list the whole line; tap one to bring it into the spotlight. A touch
  holds the spotlight for 15 seconds. Timings are at the top of `script.js`.

After 100 seconds without a touch the kiosk returns to the welcome screen.

## Running on the kiosk

1. Copy the folder onto the kiosk PC.
2. Run `prepare.bat` once to create a Desktop shortcut (then pin it to the taskbar).
3. Launch with the shortcut or `run.bat`. It opens Microsoft Edge in full-screen kiosk mode.

For development, open `index.html` in any modern browser.

## Updating content

- `data/content.js`: every word on screen, rank names, air forces, and the
  branches used by the *By branch* view.
- `data/roll.js`: the rolls, one officer per line:
  - `staff`: the Directing Staff in the order of the nominal roll. `no` is
    the officer's number on the roll ("DS 239").
  - `seniorCourse`, `juniorCourse`: the Chief Instructors in order.
  - Dates are ISO at the precision known: `"1978"`, `"1991-02"` or
    `"1984-08-06"`. `"to": null` with `"current": true` marks an officer
    still serving; `"to": null` alone shows as "To be confirmed".
  - `service` is `naf`, `raf` or `gaf`; `branch` is one of the branch ids.
  - `chief` (on a DS) and `staff` (on a Chief Instructor) link the two rolls.

`data/roll.js` is built from the spreadsheets in `source/`. Either correct it
by hand, or update the spreadsheets and rebuild it:

```
python3 tools/build_roll.py
```

(needs `openpyxl`). The tool reads the dates in all the shapes they were
typed, groups the specialties into branches, works out who is still serving
(a tour typed with no end, such as "13 Feb 25 -", or "To date"), and links
each Chief Instructor to their own tour as Directing Staff by surname and
initials. It prints anything it could not read. Running it replaces any hand
edits to `data/roll.js`, so put lasting corrections in the spreadsheet or in
the tables at the top of the tool.

### Corrections made to the spreadsheet data

A few entries could not be read as typed. They are corrected in `FIXES` in
`tools/build_roll.py`; please check them against the records:

| Officer | Typed | Read as | Why |
| --- | --- | --- | --- |
| Sqn Ldr TM Ato | 01-Nov-38 – 02-Jan-91 | 1 Nov 1988 – 2 Jan 1991 | "38" for 88; listed among the 1988 postings |
| Wg Cdr JA Udo | 15-May-75 – Sep-98 | 15 May 1995 – Sep 1998 | "75" for 95; listed among the 1995 postings |
| Wg Cdr KE Adediji | 23-41-02 – 23-Apr-04 | 2002 – 23 Apr 2004 | month unreadable; year kept |
| Wg Cdr A Durotoye | 02-May-06 – 01-May-06 | 2 May 2006 – 1 May 2008 | ends before it starts |
| Wg Cdr NFK Dzokoto | 02-Jan-08 – 35-Jan-10 | 2 Jan 2008 – Jan 2010 | no 35th day; month kept |
| Sqn Ldr BO Tongha | 14 May 18 – 13 May 17 | 14 May 2015 – 13 May 2017 | "18" for 15; listed among the 2015 postings |
| Wg Cdr N Watafua | 05 Oct 21 – 04 Oct 22 | 5 Oct 2020 – 4 Oct 2022 | "21" for 20; listed among the Oct 2020 postings |

Also: misspelt months ("Ju1", "Ju|", "Sun", "0ct", "Fec") are mended, initials
"Al" are read as "AI", and "lya" as "Iya". Nine DS entries (and three Chief
Instructors) were turned into dates by Excel, which kept only the start, so
their end dates show as "To be confirmed". The last Junior Course entry, Gp
Capt TA Ezekiel (from 24 Feb 2025, no end), is taken as the serving Chief
Instructor.

## Background music

`assets/audio/ambient.mp3` plays on a loop (the same bed as the other AFCSC
kiosks): softly on the welcome screen, louder once a visitor begins. The
speaker button in the top bar mutes it. Delete the file for silence.

## Structure

```
index.html            markup for every screen
styles.css            theme and layout
script.js             navigation, movements board, staff views, spotlight, idle reset
data/content.js       on-screen text, ranks, air forces, branches
data/roll.js          the Directing Staff and Chief Instructors (built from source/)
tools/build_roll.py   rebuilds data/roll.js from the spreadsheets
source/               the spreadsheets as supplied
assets/fonts/         bundled Oswald, Playfair Display, Crimson Text
assets/icons/         AFCSC and Air Force crests, app icon
assets/audio/         background music
run.bat, prepare.bat  kiosk launchers
```
