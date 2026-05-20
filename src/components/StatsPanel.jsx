import React, { useMemo } from 'react';
import { AlertTriangle, Users } from 'lucide-react';

export default function StatsPanel({ shifts }) {
    const stats = useMemo(() => {
        const counts = {};
        const personDoubles = {}; // Map of Person -> [List of Double Shift Days]

        // 1. Identify all people and count total shifts
        shifts.forEach(s => {
            const person = s.content.trim();
            if (!person || person.length < 2) return;
            counts[person] = (counts[person] || 0) + 1;
        });

        // 2. Identify doubles
        // Group by Day -> Person -> Count
        const shiftsByDay = {}; // Day -> { Person: Count }
        shifts.forEach(s => {
            const person = s.content.trim();
            if (!person || person.length < 2) return;

            if (!shiftsByDay[s.day]) shiftsByDay[s.day] = {};
            shiftsByDay[s.day][person] = (shiftsByDay[s.day][person] || 0) + 1;
        });

        Object.entries(shiftsByDay).forEach(([day, persons]) => {
            Object.entries(persons).forEach(([person, count]) => {
                if (count > 1) {
                    if (!personDoubles[person]) personDoubles[person] = [];
                    personDoubles[person].push(day);
                }
            });
        });

        return { counts, personDoubles };
    }, [shifts]);

    const sortedPeople = Object.entries(stats.counts).sort((a, b) => b[1] - a[1]); // Descending count

    return (
        <div style={{ height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sys-color-primary)' }}>
                <Users size={20} />
                Riepilogo Presenze
            </h3>

            {/* Doubles Warning */}
            {Object.keys(stats.personDoubles).length > 0 && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#fff8f6',
                    borderRadius: 'var(--sys-shape-corner-medium)',
                    border: '1px solid #ffdad6'
                }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#bf0031', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <AlertTriangle size={18} />
                        Doppi Turni Rilevati
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', fontSize: '0.9rem' }}>
                        {Object.entries(stats.personDoubles).map(([person, days]) => (
                            <li key={person} style={{ padding: '4px 0', borderBottom: '1px dashed #ede0d4' }}>
                                <strong style={{ color: '#3f0013' }}>{person}</strong>: Giorno {days.join(', ')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Counts Table */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--sys-color-outline-variant)', borderRadius: 'var(--sys-shape-corner-small)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--sys-color-surface)' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--sys-color-outline-variant)', color: 'var(--sys-color-outline)' }}>Persona</th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--sys-color-outline-variant)', color: 'var(--sys-color-outline)' }}>Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPeople.map(([person, count], i) => (
                            <tr key={person} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--sys-color-background)' }}>
                                <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--sys-color-outline-variant)' }}>{person}</td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 'bold' }}>{count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
