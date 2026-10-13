Output doc/demo.gif

Set Shell powershell
Set FontSize 16
Set Width 980
Set Height 640
Set Padding 14
Set Theme "Dracula"
Set TypingSpeed 8ms
Set CursorBlink false

# The database is append-only by privilege...
Type "docker compose exec db psql -U audit_writer -d audit_store -c 'UPDATE audit.events SET user_id=NULL'"
Enter
Sleep 2300ms

# ...start the API
Ctrl+L
Type '$SRV = Start-Process node dist/main.js -NoNewWindow -PassThru'
Enter
Sleep 4500ms
Ctrl+L

# no token, no entry
Type 'curl.exe -s -o NUL -w "%{http_code}" localhost:3000/api/patients/pat_1'
Enter
Sleep 1000ms

# RESEARCHER: aggregates yes, charts no
Type '$TOK = node.exe scripts/mint-token.cjs RESEARCHER usr_researcher'
Enter
Sleep 600ms
Type 'curl.exe -s -H "Authorization: Bearer $TOK" localhost:3000/api/cohorts/summary'
Enter
Sleep 1200ms
Type 'curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $TOK" localhost:3000/api/patients/pat_1'
Enter
Sleep 1000ms

# CLINICIAN: full chart
Type '$TOK = node.exe scripts/mint-token.cjs CLINICIAN usr_dr_smith'
Enter
Sleep 600ms
Type 'curl.exe -s -H "Authorization: Bearer $TOK" localhost:3000/api/patients/pat_1'
Enter
Sleep 1200ms

# a crash on purpose: client gets an opaque 500 + tracking id
Type 'curl.exe -s -H "Authorization: Bearer $TOK" localhost:3000/api/patients/pat_1/_simulate-crash'
Enter
Sleep 2500ms

# every request left a row behind
Type 'docker compose exec db psql -U postgres -d audit_store -c "SELECT occurred_at::time(0) AS at, user_id, action, status_code AS code FROM audit.events ORDER BY id DESC LIMIT 6"'
Enter
Sleep 1800ms

# and nobody gets to rewrite history
Type "docker compose exec db psql -U postgres -d audit_store -c 'DELETE FROM audit.events'"
Enter
Sleep 1800ms

Type '$SRV.Kill()'
Enter
Sleep 500ms
