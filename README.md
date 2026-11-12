# Our Instructors

**Chronicle of the Directing Staff · Department of Air Warfare · Armed Forces Command and Staff College, Jaji**

Touch-screen kiosk honouring the instructors of the Department of Air
Warfare: every officer posted to the Department as Directing Staff (DS)
since 1976, and the Chief Instructors of the Senior Course and the Junior
Course. The Directors of the Department are not shown here: they have their
own kiosk, *Our Leaders* (`afcsc-leadership`), which this app is designed to
sit beside.

It is a static, offline web app (no build step, no internet needed) designed
for a 1920×1080 landscape display and scaled to fit any screen. It shares the
kiosk conventions of its siblings (launchers, idle reset, music) but has a
look of its own: a daylight "staff room" of paper and ink, the Air Force slate
blue and gold lace of the shoulder board, and the national green-white-green,
where *Our Leaders* is a night-sky cockpit.

## Screens

- **Welcome**: the title, the College and Air Force crests, and the ranks the
  Directing Staff held when posted, shown with their shoulder-board insignia
  and how many officers held each. Beside it, an **honours board** cut to the
  shape of a shoulder board, with every name on the roll rising slowly in
  gold under year headings. Any touch begins.
- **Home** ("The staff room"), in the order the client asked for:
  1. **Chief Instructors**, in two sections, Senior Course and Junior Course
     (tap a course's panel to open it at that course);
  2. **S01 A7** (the serving S01 A7 and the length of the chronicle);
  3. **The Directing Staff** (with the number on the staff each year);
  4. **Find an officer** (search).
  The top bar has the same order: Home, Chief Instructors, S01 A7,
  Directing Staff, Search.
- **The Directing Staff**: a slate sidebar to choose how to look, and the
  officers as index cards (rank insignia, initials and surname, specialty,
  tour, and Serving / CI / RAF / GAF marks) that scroll up and down:
  - **By year**: a bar for every year since 1976; tap or sweep a finger
    along it. The tall bar is how many were on the staff that year, the dark
    bar how many joined. Choose *Joined in* or *On the staff in*.
  - **By name**: tap the first letter of a surname.
  - **By branch**: Aircrew, Engineering, Communications, Air Traffic & Met,
    Intelligence, Logistics & Finance, Administration, Medical, and the
    allied air forces (Royal Air Force and Ghana Air Force).
  - **Serving now**: the officers on the staff today.
- **Personnel file**: tap a card and the officer's file slides in from the
  right: roll number, service number, rank insignia, specialty, air force,
  tour and duration; any Chief Instructor appointment they later held (tap to
  go to it); and the others who joined in the same month. Previous/next (or
  swipe) step through the cards that were on screen.
- **Chief Instructors**: a Senior Course / Junior Course switch at the top
  right, and the line of succession for the chosen course as a chain of
  numbered links across the screen, with the decades beneath. Below it, the
  selected Chief Instructor: insignia, place in the line, tenure and duration,
  a link to their own tour on the Directing Staff, to their appointment on
  the other course if they held both, and to their predecessor and
  successor. The line moves on by itself every 9 seconds (a bar fills along
  the current link); a touch holds it for 20 seconds. Timings are at the top
  of `script.js`.
- **S01 A7**: the chronicle of the Department's S01 A7 (45 appointments) on
  the same line-of-succession screen as the Chief Instructors, without the
  course switch. Each S01 A7 links to their tour on the Directing Staff and
  to any Chief Instructor appointment they held; the Directing Staff record
  and the Chief Instructor pages link back.
- **Find an officer**: an on-screen keyboard (letters, numbers, `/` and `-`)
  to search every Chief Instructor and Directing Staff officer by surname,
  initials (for example "IA Abdul") or service number ("2139", "NAF/2139").
  Results are grouped as Chief Instructors, S01 A7, then Directing Staff; tap one to
  open it. A physical keyboard also types into the search. The search clears
  when the kiosk returns to the welcome screen.

The Directing Staff are shown as one combined roll for now: the nominal roll
does not record which course each officer taught. When that is known, it can
be added as a column and the roll split into Senior and Junior Course.

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
    still serving; `"to": null` alone shows the start date followed by "-".
  - `service` is `naf`, `raf` or `gaf`; `branch` is one of the branch ids.
  - `chief` (on a DS) and `staff` (on a Chief Instructor) link the two rolls.

- `data/s01.js`: the S01 A7 chronicle, typed from
  `source/Chronicle of S01 A7.pdf` in its order, one officer per line. The
  chronicle gives periods only from no. 40 (September 2024); earlier entries
  show "-" until dates are added (`"from": "2019-03"` and so
  on). Each is linked to the Directing Staff roll by surname and initials when
  the app starts; 39 of the 45 match. The six that do not (Ogah, Lasisi,
  Tanko, Naruwa, M Yusuf, TP Odesola) are not on the DS roll under that name;
  the roll has a "TE Odesola", which may be the same officer.

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
their end dates show as "-". The last Junior Course entry, Gp
Capt TA Ezekiel (from 24 Feb 2025, no end), is taken as the serving Chief
Instructor.

## Rank insignia

`assets/ranks/` holds the Nigerian Air Force officer shoulder boards as shown
on Wikipedia's [Military ranks of Nigeria](https://en.wikipedia.org/wiki/Military_ranks_of_Nigeria)
page (Squadron Leader, Wing Commander, Group Captain, Air Commodore). They are
by Skjoldbro, via Wikimedia Commons, licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); see
`assets/ranks/README.txt`. Each rank's image is set in `ranks` in
`data/content.js`.

## Background music

`assets/audio/ambient.mp3` is "Trench Warning Pulse" (thriller underscore,
short preview) by openmindaudio, from Pixabay, under the Pixabay Content
License. The file as supplied is in `source/audio/`; the app's copy has its
end crossfaded into its start so the 15-second loop runs without a seam. It
plays softly on the welcome screen and louder once a visitor begins; the
speaker button in the top bar mutes it. Delete the file for silence.

## App icon

`assets/icons/app.ico` is the Nigerian Air Force crest (`assets/icons/naf.png`),
trimmed, centred on a transparent square and saved at 16, 24, 32, 48, 64, 128
and 256 px. It is the browser tab icon and the icon of the Desktop shortcut
that `prepare.bat` creates (run `prepare.bat` again on a kiosk that already has
the shortcut, to pick up the new icon).

## Fonts

Source Serif 4, Barlow Condensed and IBM Plex Mono (SIL Open Font License,
from Google Fonts) are bundled in `assets/fonts/` so the kiosk needs no
internet access.

## Structure

```
index.html            markup for every screen
styles.css            theme and layout
script.js             navigation, honours board, staff views, files, line of succession, idle reset
data/content.js       on-screen text, ranks and their insignia, air forces, branches
data/roll.js          the Directing Staff and Chief Instructors (built from source/)
data/s01.js           the S01 A7 chronicle (typed from source/)
tools/build_roll.py   rebuilds data/roll.js from the spreadsheets
source/               the spreadsheets, the S01 A7 chronicle and the music as supplied
assets/ranks/         rank insignia (shoulder boards)
assets/fonts/         bundled Source Serif 4, Barlow Condensed, IBM Plex Mono
assets/icons/         AFCSC and Air Force crests; app.ico, the app icon, made from the Air Force crest
assets/audio/         background music
run.bat, prepare.bat  kiosk launchers
```
