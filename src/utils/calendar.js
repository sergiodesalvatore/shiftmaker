// Utility for generating standard .ics (iCalendar) files

// Utility for generating standard .ics (iCalendar) files

export function getPreviewShifts(shifts, person, month, year) {
    const zeroMonth = month - 1;
    const preview = [];

    shifts.forEach(s => {
        if (s.type === 'DAY_NAME' || s.type === 'FERIE') return;
        if (!s.content) return;

        // Robust matching: split by spaces, slashes, commas, plus signs
        const tokens = s.content.split(/[\s/+,]+/);
        const isMatch = tokens.some(t => {
            const clean = t.replace(/[^a-zA-Z]/g, '').toUpperCase();
            return clean === person.toUpperCase();
        });

        if (!isMatch) return;

        // Determine start and end time
        let startHour = '08';
        let endHour = '14';
        
        // Try to parse hours from type (e.g., PS_08-14)
        const timeMatch = s.type.match(/_(\d{2})-(\d{2})/);
        if (timeMatch) {
            startHour = timeMatch[1];
            endHour = timeMatch[2];
        } else if (s.type.includes('NOTTE')) {
            startHour = '20';
            endHour = '08';
        } else if (s.type.includes('14-20')) {
            startHour = '14';
            endHour = '20';
        }

        const dayNum = parseInt(s.day);
        if (isNaN(dayNum)) return;
        
        const startDate = new Date(year, zeroMonth, dayNum, parseInt(startHour), 0, 0);
        let endDate = new Date(year, zeroMonth, dayNum, parseInt(endHour), 0, 0);
        
        // If night shift crosses midnight
        if (parseInt(endHour) < parseInt(startHour)) {
            endDate.setDate(endDate.getDate() + 1);
        }

        let summary = `Turno ${s.type.replace(/_\d{2}-\d{2}/, '').replace(/_/g, ' ')}`;
        if (s.type === 'REP_2') summary = "2° Reperibile";

        preview.push({
            day: dayNum,
            type: s.type,
            summary,
            startHour,
            endHour,
            startDate,
            endDate
        });
    });

    return preview.sort((a, b) => a.day - b.day);
}

export function generateICS(previewShifts, person, month, year) {
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShiftMaker//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    const pad = (n) => n.toString().padStart(2, '0');
    const formatICSDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;

    previewShifts.forEach(shift => {
        const dtStartStr = `DTSTART;TZID=Europe/Rome:${formatICSDate(shift.startDate)}`;
        const dtEndStr = `DTEND;TZID=Europe/Rome:${formatICSDate(shift.endDate)}`;
        
        const safeType = shift.type.replace(/\W+/g, '-');
        const uid = `${year}${pad(month)}${pad(shift.day)}-${safeType}-${person}@shiftmaker`.toLowerCase();

        icsContent += [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            dtStartStr,
            dtEndStr,
            `SUMMARY:${shift.summary}`,
            `DESCRIPTION:Generato da ShiftMaker per ${person}`,
            'END:VEVENT'
        ].join('\r\n') + '\r\n';
    });

    icsContent += 'END:VCALENDAR\r\n';

    return icsContent;
}

export function downloadICSFile(shifts, person, month, year) {
    const icsContent = generateICS(shifts, person, month, year);
    
    // Aggiungo il charset utf-8 e il CRLF
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // E.g. Turni_DES_05-2024.ics
    const pad = (n) => n.toString().padStart(2, '0');
    a.download = `Turni_${person}_${pad(month)}-${year}.ics`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
