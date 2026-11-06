#!/usr/bin/env python3
"""Build data/roll.js from the spreadsheets in source/.

    python3 tools/build_roll.py

Reads the nominal roll of Directing Staff and the chronicles of Chief
Instructors (Senior Course and Junior Course). The Directors sheet in the
chronicles workbook is deliberately ignored: the Directors have their own
kiosk (Our Leaders).

The spreadsheets were typed by hand over many years, so the dates come in a
dozen shapes ("09 Oct  76", "06-Aug-84", "Feb-91", "1978", "31-Ju1-94"...).
Each one is read into an ISO date at the precision given: "1978",
"1991-02" or "1984-08-06". The few entries that cannot be read as typed are
corrected in FIXES below, with the reason; check them against the records.

Needs openpyxl (pip install openpyxl).
"""

import datetime
import json
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DS_FILE = os.path.join(ROOT, 'source', 'Nominal roll of DS - DAW.xlsx')
CI_FILE = os.path.join(ROOT, 'source', 'DAW chronicles of Dirs, SC CIs and JC CIs as at Oct 26.xlsx')
OUT = os.path.join(ROOT, 'data', 'roll.js')

MONTHS = {m: i + 1 for i, m in enumerate(
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}

# Typing slips inside month names, mended before the dates are read.
MONTH_TYPOS = [('Ju|', 'Jul'), ('Ju1', 'Jul'), ('Ju/', 'Jul'), ('Sun', 'Jun'), ('0ct', 'Oct'), ('Fec', 'Feb')]

# Entries that cannot be read as typed: (surname, typed duration) -> (from, to).
FIXES = {
    ('Ato', '01-Nov-38-02-Jan-91'): ('1988-11-01', '1991-01-02'),        # "38" for 88; listed among the 1988 postings
    ('Udo', '15-May-75-Sep-98'): ('1995-05-15', '1998-09'),               # "75" for 95; listed among the 1995 postings
    ('Adediji', '23-41-02 - 23-Apr-04'): ('2002', '2004-04-23'),          # month unreadable; year kept
    ('Durotoye', '02-May-06 - 01-May-06'): ('2006-05-02', '2008-05-01'),  # ends before it starts; two-year tour
    ('Dzokoto', '02-Jan-08 - 35-Jan-10'): ('2008-01-02', '2010-01'),      # "35 Jan"; month kept
    ('Tongha', '14 May 18 - 13 May 17'): ('2015-05-14', '2017-05-13'),    # "18" for 15; listed among the 2015 postings
    ('Watafua', '05 Oct 21- 04 Oct 22'): ('2020-10-05', '2022-10-04'),    # "21" for 20; listed among the Oct 2020 postings
}

# Initials read as a lower-case L instead of a capital I, and similar.
INITIAL_FIXES = {'Al': 'AI'}
SURNAME_FIXES = {'lya': 'Iya', "O'neil": "O’Neil", 'Mclachan': 'McLachan'}

RANKS = {'sqn ldr': 'Sqn Ldr', 'wg cdr': 'Wg Cdr', 'gp capt': 'Gp Capt', 'air cdre': 'Air Cdre'}

# Specialty as typed -> (specialty shown, branch id). Branch ids are listed in data/content.js.
SPECIALTIES = {
    'pilot': ('Pilot', 'aircrew'), 'plt': ('Pilot', 'aircrew'),
    'nav': ('Navigator', 'aircrew'), 'corp-nav': ('Navigator', 'aircrew'),
    'uav - optr': ('UAV Operator', 'aircrew'),
    'ac engr': ('Aircraft Engineering', 'engineering'),
    'armt': ('Armament', 'engineering'),
    'ee': ('Electrical & Electronics Engineering', 'engineering'),
    'works': ('Works', 'engineering'), 'build tech': ('Building Technology', 'engineering'),
    'arch': ('Architecture', 'engineering'),
    'ce': ('Communications-Electronics', 'signals'), 'c-e': ('Communications-Electronics', 'signals'),
    'comms': ('Communications', 'signals'), 'radar': ('Radar', 'signals'), 'it': ('Information Technology', 'signals'),
    'atc': ('Air Traffic Control', 'operations'), 'met': ('Meteorology', 'operations'),
    'aerial surv': ('Aerial Survey', 'operations'),
    'int': ('Intelligence', 'intelligence'),
    'supply': ('Supply', 'logistics'), 'log': ('Logistics', 'logistics'), 'catering': ('Catering', 'logistics'),
    'pay': ('Finance', 'logistics'), 'fin': ('Finance', 'logistics'),
    'pers': ('Administration & Personnel', 'administration'),
    'admin/pers': ('Administration & Personnel', 'administration'),
    'admin': ('Administration', 'administration'),
    'edn': ('Education', 'administration'), 'info': ('Information', 'administration'),
    'law': ('Legal', 'administration'), 'pe/sports': ('Physical Education', 'administration'),
    'police': ('Air Police', 'administration'), 'air police': ('Air Police', 'administration'),
    'ap': ('Air Police', 'administration'), 'regt': ('Regiment', 'administration'),
    'medical': ('Medical', 'medical'), 'med': ('Medical', 'medical'), 'dentistry': ('Dentistry', 'medical'),
    'pharm': ('Pharmacy', 'medical'), 'pharmacist': ('Pharmacy', 'medical'),
    'physiotherapist': ('Physiotherapy', 'medical'), 'lab sc': ('Laboratory Science', 'medical'),
    'med lab sc': ('Medical Laboratory Science', 'medical'), 'psychologist': ('Psychology', 'medical'),
}

DATE_RE = re.compile(
    r'(?P<d>\d{1,2})[\s\-]*(?P<m>[A-Za-z]{3,9})[\s\-]*(?P<y>\d{2,4})'
    r'|(?P<m2>[A-Za-z]{3,9})[\s\-]*(?P<y2>\d{2,4})'
    r'|(?P<y3>\d{4})')

warnings = []


def full_year(y):
    y = int(y)
    if y < 100:
        y += 1900 if y >= 70 else 2000
    return y


def month_no(m):
    return MONTHS.get(m[:3].lower())


def read_dates(raw):
    """Return the ISO dates found in a typed duration, in order."""
    s = raw
    for bad, good in MONTH_TYPOS:
        s = s.replace(bad, good)
    out = []
    for mt in DATE_RE.finditer(s):
        if mt.group('d'):
            m = month_no(mt.group('m'))
            if not m:
                continue
            y, d = full_year(mt.group('y')), int(mt.group('d'))
            try:
                datetime.date(y, m, d)
                out.append('%04d-%02d-%02d' % (y, m, d))
            except ValueError:
                out.append('%04d-%02d' % (y, m))
        elif mt.group('m2'):
            m = month_no(mt.group('m2'))
            if m:
                out.append('%04d-%02d' % (full_year(mt.group('y2')), m))
        else:
            out.append(mt.group('y3'))
    return out


def tenure(surname, value):
    """(from, to, open) for a cell; open means typed with no end ("12 Jan 26 -" or "To date")."""
    if isinstance(value, datetime.datetime):
        # Excel turned the text into a date and kept only the start.
        return value.strftime('%Y-%m-%d'), None, False
    raw = (value or '').strip()
    if (surname, raw) in FIXES:
        f, t = FIXES[(surname, raw)]
        return f, t, False
    dates = read_dates(raw)
    is_open = raw.endswith('-') or 'to date' in raw.lower()
    if not dates:
        warnings.append('no date for %s: %r' % (surname, raw))
        return None, None, False
    f = dates[0]
    t = dates[1] if len(dates) > 1 else None
    if t and t[:len(f)] < f[:len(t)]:
        warnings.append('ends before it starts: %s %r' % (surname, raw))
    return f, t, is_open


def clean(v):
    return re.sub(r'\s+', ' ', str(v)).strip() if v is not None else ''


def clean_rank(v):
    r = re.sub(r'[^A-Za-z ]', '', clean(v)).strip().lower()
    return RANKS.get(r, clean(v))


def clean_initials(v):
    i = re.sub(r'[^A-Za-z]', '', clean(v))
    return INITIAL_FIXES.get(i, i.upper())


def clean_surname(v):
    s = clean(v)
    s = SURNAME_FIXES.get(s, s)
    return s.replace("'", '’')


def clean_svc(v):
    s = re.sub(r'\s+', '', clean(v)).upper()
    if not s:
        return None
    m = re.match(r'^(NAF|GH)[^0-9A-Z]*(\d+[A-Z]?)$', s)
    return '%s/%s' % (m.group(1), m.group(2)) if m else s


def build_staff():
    ws = openpyxl.load_workbook(DS_FILE).worksheets[0]
    staff = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        rank, initials, surname, svc, spec, dur = row[1:7]
        if not clean(surname):
            continue
        surname = clean_surname(surname)
        svc_no = clean_svc(svc)
        spec_key = clean(spec).lower()
        service = 'naf'
        specialty, branch = None, None
        if spec_key == 'raf':
            service = 'raf'
        elif spec_key == 'gaf' or (svc_no or '').startswith('GH/'):
            service = 'gaf'
        if spec_key and spec_key not in ('raf', 'gaf'):
            if spec_key not in SPECIALTIES:
                warnings.append('unknown specialty %r (%s)' % (spec, surname))
            specialty, branch = SPECIALTIES.get(spec_key, (clean(spec), None))
        if not spec_key and not svc_no:
            service = None  # nothing on the roll says which air force
        f, t, is_open = tenure(surname, dur)
        p = {
            'no': len(staff) + 1,
            'rank': clean_rank(rank),
            'initials': clean_initials(initials),
            'surname': surname,
            'svcNo': svc_no,
            'service': service,
            'specialty': specialty,
            'branch': branch,
            'from': f,
            'to': t,
        }
        if is_open:
            p['current'] = True
        staff.append(p)
    return staff


def build_course(sheet_index):
    ws = openpyxl.load_workbook(CI_FILE).worksheets[sheet_index]
    rows = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        rank, initials, surname, dur = row[1:5]
        if not clean(surname):
            continue
        surname = clean_surname(surname)
        f, t, is_open = tenure(surname, dur)
        p = {'no': len(rows) + 1, 'rank': clean_rank(rank), 'initials': clean_initials(initials),
             'surname': surname, 'from': f, 'to': t}
        if is_open:
            p['current'] = True
        rows.append(p)
    return rows


# Surnames spelt differently on the chronicles and on the DS roll.
SURNAME_ALIASES = {'abdulrahman': 'abdulrahaman', 'gerevbie': 'gberevbie', 'umoru': 'umaru',
                   'akisanmi': 'akinsanmi', 'daniels': 'daniel'}


def norm(s):
    s = re.sub(r'[^a-z]', '', s.lower())
    return SURNAME_ALIASES.get(s, s)


def link_staff(course, staff, label):
    """Point each Chief Instructor at their entry on the DS roll, where there is one."""
    for ci in course:
        cands = [p for p in staff if norm(p['surname']) == norm(ci['surname'])]
        if ci['initials']:
            a = ci['initials']
            exact = [p for p in cands if p['initials'] == a]
            # "I" for "IA", "A" for "AA": one set of initials begins the other
            close = [p for p in cands if p['initials'] and
                     (p['initials'].startswith(a) or a.startswith(p['initials']))]
            # the only officer of that surname, first initial agreeing ("PO" for "PD")
            only = [p for p in cands if len(cands) == 1 and p['initials'][:1] == a[:1]]
            cands = exact or close or only
        # served as DS before (or while) being Chief Instructor
        cands = [p for p in cands if p['from'] and ci['from'] and p['from'][:4] <= ci['from'][:4]]
        if cands:
            best = max(cands, key=lambda p: p['from'])
            ci['staff'] = best['no']
            if not ci['initials']:
                ci['initials'] = best['initials']
            best.setdefault('chief', []).append({'course': label, 'no': ci['no']})


def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(', ', ': '))


def write(staff, senior, junior):
    lines = [
        '/* ============================================================',
        '   ROLL OF THE DIRECTING STAFF AND CHIEF INSTRUCTORS',
        '   Department of Air Warfare, AFCSC Jaji.',
        '',
        '   Built from the spreadsheets in source/ by tools/build_roll.py.',
        '   It can be corrected by hand: one officer per line.',
        '',
        '   Dates are ISO at the precision known: "1978", "1991-02" or',
        '   "1984-08-06". "to": null with "current": true marks an officer',
        '   still on the staff; "to": null on its own means the end of the',
        '   tour is not recorded yet.',
        '   service: "naf", "raf" (Royal Air Force) or "gaf" (Ghana Air Force).',
        '   branch: one of the branch ids in data/content.js.',
        '   chief: Chief Instructor appointments this officer later held.',
        '   staff (on a Chief Instructor): their "no" on the Directing Staff roll.',
        '   ============================================================ */',
        '',
        'var DAW_ROLL = {',
        '',
        '  staff: [',
    ]
    lines += ['    ' + js(p) + ',' for p in staff]
    lines[-1] = lines[-1].rstrip(',')
    lines += ['  ],', '', '  seniorCourse: [']
    lines += ['    ' + js(p) + ',' for p in senior]
    lines[-1] = lines[-1].rstrip(',')
    lines += ['  ],', '', '  juniorCourse: [']
    lines += ['    ' + js(p) + ',' for p in junior]
    lines[-1] = lines[-1].rstrip(',')
    lines += ['  ]', '};', '']
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))


def main():
    staff = build_staff()
    senior = build_course(1)   # sheet 0 is the Directors: not used
    junior = build_course(2)
    # The latest Junior Course entry has a start date only (typed as a date):
    # as the last on the chronicle it is taken as the serving Chief Instructor.
    if junior and not junior[-1]['to']:
        junior[-1]['current'] = True
    link_staff(senior, staff, 'senior')
    link_staff(junior, staff, 'junior')
    write(staff, senior, junior)
    print('%d directing staff, %d senior course and %d junior course chief instructors -> %s'
          % (len(staff), len(senior), len(junior), os.path.relpath(OUT, ROOT)))
    print('linked: SC %d, JC %d' % (sum('staff' in c for c in senior), sum('staff' in c for c in junior)))
    for w in warnings:
        print('  check:', w)


if __name__ == '__main__':
    sys.exit(main())
