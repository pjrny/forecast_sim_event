# Event Bible (v1.6)

Step **7 · Pack → Download Event Bible** builds `templates/event_bible/event-bible.xlsx` filled from the current forecast, entirely in the browser (`js/event_bible.js` + `js/vendor/fflate.min.js`, MIT).

- The workbook has 14 tabs: Cover, **Inputs**, Run of Show, Packing List, Transport Master, Production Fulfillment, Site & Crew Handbook, RFID & POS, Talent Worksheet, Artist Marketing, Lineup Announce, Budget & Scenarios, Safety Metrics and Sources.
- Every tab reads only from **Inputs**. Filling means rewriting the Inputs cell XML (styles and formulas untouched), and `fullCalcOnLoad` makes Excel, Sheets or LibreOffice recalculate.
- `templates/event_bible/field_map.json` maps every simulator field to an Inputs cell. For example, `profile.name` goes to `C8`, `options.N` to the attendance row, and table first rows/columns cover the lineup, budget, RFID and safety lines.
- Weather comes from the Worker's `/api/weather/risk` only when served from the Worker origin (that API has no CORS).
- The click also saves `pj_event_bible_state_v1` in localStorage, so `/library/` can fill any single template with the same data.
- The generator (`build_event_bible.py`, openpyxl) and the sample builder live with the organizer Worker assets. Sources are on the Sources tab and in `docs/REALISM_v1.6.md`.
