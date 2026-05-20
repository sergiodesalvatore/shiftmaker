import React, { useMemo } from 'react';
import { KNOWN_PEOPLE } from '../utils/constants';

export default function StatsTable({ shifts }) {
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
        </div>
    );
}
