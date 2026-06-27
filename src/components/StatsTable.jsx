import React, { useMemo } from 'react';
import { KNOWN_PEOPLE } from '../utils/constants';
import { getWeeksOfMonth, getShiftHours } from '../utils/calendar';

const getActualShiftType = (s, isNewGuardSystem) => {
    const knownTypes = [
        'AMBULATORIO_08-14', 'AMBULATORIO_14-19', 
        'REPARTO_08-14', 'BALD_08-14', 
        'DH_08-14', 'CONS_08-14', 
        'SALA_OP_08-14', 'SALA_OP_14-19', 
        'SALA_DS_08-14', 'NORA_08-14', 
        'SM_08-14', 'PS_08-14', 
        'GUARDIA_08-20', 'GUARDIA_NOTTE_20-08', 'REP_2', 'FERIE',
        'PS_CONT_14-20'
    ];
    if (s.type && knownTypes.includes(s.type)) {
        return s.type;
    }
    const idx = s.rawColumnIndex;
    const types = {
        2: 'AMBULATORIO_08-14', 3: 'AMBULATORIO_14-19',
        4: 'REPARTO_08-14', 5: 'BALD_08-14',
        6: 'DH_08-14', 7: 'CONS_08-14',
        8: 'SALA_OP_08-14', 9: 'SALA_OP_14-19',
        10: 'SALA_DS_08-14', 11: 'NORA_08-14',
        12: 'SM_08-14', 13: 'PS_08-14'
    };
    if (isNewGuardSystem) {
        types[14] = 'GUARDIA_08-20';
        types[15] = 'GUARDIA_NOTTE_20-08';
        types[16] = 'REP_2';
        types[17] = 'FERIE';
    } else {
        types[14] = 'PS_CONT_14-20';
        types[15] = 'REP_2';
        types[16] = 'FERIE';
    }
    return types[idx] || 'GENERIC';
};

export default function StatsTable({ shifts, year, month }) {
    const stats = useMemo(() => {
        const personStats = {};

        // Helper to init stats object
        const createEmptyStats = () => ({
            AMBULATORI: 0, REPARTO: 0, PS: 0, BALDELLI: 0, DH: 0, CON: 0,
            'SALA DS': 0, NORA: 0, 'S.M.': 0, 'SALA OPERATORIA': 0,
            'CONT ASS+ REP': 0, '2° REP': 0, 'FERIE': 0,
            'WEEK END': 0
        });

        // 1. Identify all unique people from shifts
        shifts.forEach(s => {
            if (!s.content) return;
            const tokens = s.content.toUpperCase()
                .split(/[\s,]+/)
                .map(t => t.trim())
                .filter(t => t.length > 1);

            tokens.forEach(person => {
                if (!personStats[person]) {
                    personStats[person] = createEmptyStats();
                }
            });
        });

        // Filter to show ONLY the requested people
        const allowedPeople = new Set(KNOWN_PEOPLE);
        const sortedPeople = Object.keys(personStats)
            .filter(p => allowedPeople.has(p))
            .sort();

        // 2. Count Shifts
        shifts.forEach(s => {
            if (!s.content) return;

            const tokens = s.content.toUpperCase()
                .split(/[\s,]+/)
                .map(t => t.trim())
                .filter(t => t.length > 1);

            const uniqueTokens = [...new Set(tokens)];

            uniqueTokens.forEach(person => {
                if (!personStats[person]) return;

                const idx = s.rawColumnIndex;
                let category = null;

                if (idx === 2 || idx === 3) category = 'AMBULATORI';
                else if (idx === 4) category = 'REPARTO';
                else if (idx === 5) category = 'BALDELLI';
                else if (idx === 6) category = 'DH';
                else if (idx === 7) category = 'CON';
                else if (idx === 8 || idx === 9) category = 'SALA OPERATORIA';
                else if (idx === 10) category = 'SALA DS';
                else if (idx === 11) category = 'NORA';
                else if (idx === 12) category = 'S.M.';
                else if (idx === 13) category = 'PS';
                else if (idx === 14) category = 'CONT ASS+ REP';
                else if (idx === 15) category = '2° REP';
                else if (idx === 16) category = 'FERIE';

                if (category) {
                    personStats[person][category]++;
                }

                // Check Weekend
                const dayNameShift = shifts.find(ds => ds.day === s.day && ds.type === 'DAY_NAME');
                if (dayNameShift) {
                    const dn = dayNameShift.content.trim().toUpperCase();
                    const isWeekend = ['S', 'D', 'SA', 'DO', 'SAB', 'DOM'].some(x => dn.startsWith(x)) && !dn.startsWith('SA_OP');
                    if (isWeekend && (idx === 14 || idx === 15)) {
                        personStats[person]['WEEK END']++;
                    }
                }
            });
        });

        const headers = [
            'AMBULATORI', 'REPARTO', 'PS', 'BALDELLI', 'DH', 'CON',
            'SALA DS', 'NORA', 'S.M.', 'SALA OPERATORIA', 'CONT ASS+ REP', '2° REP',
            'FERIE', 'WEEK END'
        ];

        return {
            headers,
            people: sortedPeople,
            data: personStats
        };
    }, [shifts]);

    const getCellStatus = (header, value) => {
        if (!value) return null;

        // Logic for warnings
        if (header === 'AMBULATORI' && value >= 4) return 'error';
        if (header === 'CONT ASS+ REP') {
            if (value === 3) return 'warning';
            if (value >= 4) return 'error';
        }
        if (header === '2° REP') {
            if (value === 3) return 'warning';
            if (value >= 4) return 'error';
        }
        if (header === 'SALA DS' && value >= 4) return 'error';
        if (header === 'PS' && value >= 4) return 'error';

        return 'normal';
    };

    const getPillStyle = (status) => {
        const base = {
            padding: '2px 8px',
            borderRadius: '100px',
            fontWeight: '600',
            fontSize: '0.8125rem',
            display: 'inline-block',
            minWidth: '20px'
        };

        switch (status) {
            case 'error':
                return { ...base, backgroundColor: 'var(--sys-color-error)', color: 'white' };
            case 'warning':
                return { ...base, backgroundColor: 'var(--sys-color-warning)', color: '#000' };
            default:
                return { ...base, color: 'var(--sys-color-on-surface)' };
        }
    };

    const isNewGuardSystem = year >= 2027;

    const weeklyHoursStats = useMemo(() => {
        if (!year || !month) return null;
        const weeks = getWeeksOfMonth(year, month);
        const docWeeklyHours = {};

        const allowedPeople = new Set(KNOWN_PEOPLE);
        
        KNOWN_PEOPLE.forEach(p => {
            docWeeklyHours[p] = weeks.map(() => 0);
        });

        const shiftsByDay = {};
        shifts.forEach(s => {
            if (!shiftsByDay[s.day]) shiftsByDay[s.day] = [];
            shiftsByDay[s.day].push(s);
        });

        weeks.forEach((weekDays, wIdx) => {
            weekDays.forEach(d => {
                const dayShifts = shiftsByDay[d] || [];
                dayShifts.forEach(s => {
                    if (!s.content) return;
                    const tokens = s.content.toUpperCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
                    tokens.forEach(p => {
                        if (allowedPeople.has(p) && docWeeklyHours[p]) {
                            docWeeklyHours[p][wIdx] += getShiftHours(getActualShiftType(s, isNewGuardSystem), isNewGuardSystem);
                        }
                    });
                });
            });
        });

        return {
            weeks,
            docWeeklyHours
        };
    }, [shifts, year, month]);

    return (
        <div style={{ padding: '0.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--sys-color-on-surface)' }}>
                Statistiche Complessive
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '12px', borderBottom: '2px solid var(--sys-color-outline-variant)', textAlign: 'left', color: 'var(--sys-color-outline)', fontWeight: 600 }}>Medico</th>
                        {stats.headers.map(h => (
                            <th key={h} style={{ padding: '12px', borderBottom: '2px solid var(--sys-color-outline-variant)', textAlign: 'center', color: 'var(--sys-color-outline)', fontWeight: 600, fontSize: '0.75rem' }}>
                                {h === 'CONT ASS+ REP' ? 'CONT+REP' : h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {stats.people.map((person, i) => (
                        <tr key={person} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--sys-color-background)' }}>
                            <td style={{ padding: '12px', borderBottom: '1px solid var(--sys-color-outline-variant)', fontWeight: 'bold' }}>{person}</td>
                            {stats.headers.map(h => {
                                const val = stats.data[person][h];
                                const status = getCellStatus(h, val);
                                return (
                                    <td key={h} style={{ padding: '12px', borderBottom: '1px solid var(--sys-color-outline-variant)', textAlign: 'center' }}>
                                        {val > 0 ? (
                                            <span style={getPillStyle(status)}>
                                                {val}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--sys-color-outline-variant)' }}>-</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {weeklyHoursStats && (
                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--sys-color-outline-variant)', paddingTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--sys-color-on-surface)' }}>
                        Ore Lavorate Settimanali
                    </h3>
                    <p style={{ color: 'var(--sys-color-outline)', margin: '0 0 1.5rem 0', fontSize: '0.875rem' }}>
                        Visualizzazione delle ore lavorate per ciascuna settimana del mese. Il limite contrattuale massimo è di <strong>36 ore</strong>.
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--sys-color-outline-variant)', textAlign: 'left', color: 'var(--sys-color-outline)', fontWeight: 600 }}>Medico</th>
                                {weeklyHoursStats.weeks.map((week, idx) => (
                                    <th key={idx} style={{ padding: '12px', borderBottom: '2px solid var(--sys-color-outline-variant)', textAlign: 'center', color: 'var(--sys-color-outline)', fontWeight: 600, fontSize: '0.75rem' }}>
                                        Settimana {idx + 1}<br/>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: 'var(--sys-color-outline)' }}>
                                            (gg {week[0]}-{week[week.length - 1]})
                                        </span>
                                    </th>
                                ))}
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--sys-color-outline-variant)', textAlign: 'center', color: 'var(--sys-color-outline)', fontWeight: 600, fontSize: '0.75rem' }}>
                                    Totale Mese
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {KNOWN_PEOPLE.sort().map((person, i) => {
                                const weeklyHours = weeklyHoursStats.docWeeklyHours[person] || [];
                                const totalMonthHours = weeklyHours.reduce((acc, h) => acc + h, 0);
                                if (totalMonthHours === 0) return null; // Only show active doctors

                                return (
                                    <tr key={person} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--sys-color-background)' }}>
                                        <td style={{ padding: '12px', borderBottom: '1px solid var(--sys-color-outline-variant)', fontWeight: 'bold' }}>{person}</td>
                                        {weeklyHours.map((hours, idx) => {
                                            const isOverLimit = hours > 36;
                                            return (
                                                <td key={idx} style={{ padding: '12px', borderBottom: '1px solid var(--sys-color-outline-variant)', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '100px',
                                                        fontWeight: '600',
                                                        fontSize: '0.8125rem',
                                                        display: 'inline-block',
                                                        minWidth: '20px',
                                                        backgroundColor: isOverLimit ? 'var(--sys-color-orange)' : 'transparent',
                                                        color: isOverLimit ? 'white' : 'var(--sys-color-on-surface)'
                                                    }}>
                                                        {hours}h
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '12px', borderBottom: '1px solid var(--sys-color-outline-variant)', textAlign: 'center', fontWeight: 'bold', color: 'var(--sys-color-primary)' }}>
                                            {totalMonthHours}h
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
