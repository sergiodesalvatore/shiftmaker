import { KNOWN_PEOPLE } from './constants';
import { getWeeksOfMonth, getShiftHours } from './calendar';

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

/**
 * Validates a shift assignment against defined constraints.
 * Handles multiple people in one cell (e.g. "BUR BON").
 */
export function validateShift(cellContent, dayNum, dayName, slotType, constraints, shiftsByDay, year, month) {
    if (!cellContent || !constraints) return { status: 'OK' };

    // Tokenize
    const tokens = cellContent.toUpperCase()
        .replace(/[^A-Z\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2);

    const peopleToCheck = tokens.filter(t => KNOWN_PEOPLE.includes(t));
    if (peopleToCheck.length === 0) return { status: 'OK' };

    const messages = [];
    let worstStatus = 'OK'; // Rank: OK < PREFERENCE < ERROR

    peopleToCheck.forEach(person => {
        const personConstraints = constraints[person];
        
        // 1. Recurring (Studio Privato)
        if (personConstraints && personConstraints.recurring) {
            for (const rule of personConstraints.recurring) {
                if (rule.day === dayName) {
                    if (isSlotConflict(slotType, rule.slot)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Studio ${rule.day} ${rule.slot}`);
                    }
                }
            }
        }

        // 2. Unavailable (Desiderata No) with AM/PM Support
        if (personConstraints && personConstraints.unavailable) {
            for (const rule of personConstraints.unavailable) {
                if (rule.day == dayNum) {
                    if (isSlotConflict(slotType, rule.slot)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Indisponibile (${rule.slot})`);
                    }
                }
            }
        }

        // 3. Preferences (Desiderata Si) with AM/PM Support
        if (worstStatus !== 'ERROR' && personConstraints && personConstraints.preferences) {
            for (const rule of personConstraints.preferences) {
                if (rule.day == dayNum) {
                    if (isSlotConflict(slotType, rule.slot)) {
                        if (worstStatus === 'OK') worstStatus = 'PREFERENCE';
                    }
                }
            }
        }

        // 4. Guardia (Monto / Smonto) and Weekly hours (36h limit) starting from January 2027
        if (year && month && shiftsByDay) {
            const isNewGuardSystem = year >= 2027;
            
            if (isNewGuardSystem) {
                const checkHasAnyShift = (doc, targetDay) => {
                    const dayShifts = shiftsByDay[targetDay];
                    if (!dayShifts) return false;
                    for (let c = 2; c <= 16; c++) {
                        const cellShifts = dayShifts[c] || [];
                        const hasShift = cellShifts.some(s => {
                            const tokens = s.content.toUpperCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
                            return tokens.includes(doc);
                        });
                        if (hasShift) return true;
                    }
                    return false;
                };

                const checkHasGuardShift = (doc, targetDay) => {
                    const dayShifts = shiftsByDay[targetDay];
                    if (!dayShifts) return false;
                    for (let c = 2; c <= 16; c++) {
                        const cellShifts = dayShifts[c] || [];
                        const hasGuard = cellShifts.some(s => {
                            const actualType = getActualShiftType(s, isNewGuardSystem);
                            const isGuard = actualType === 'GUARDIA_08-20' || actualType === 'GUARDIA_NOTTE_20-08';
                            if (!isGuard) return false;
                            const tokens = s.content.toUpperCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
                            return tokens.includes(doc);
                        });
                        if (hasGuard) return true;
                    }
                    return false;
                };

                const isGuard = slotType === 'GUARDIA_08-20' || slotType === 'GUARDIA_NOTTE_20-08';
                if (isGuard) {
                    // Check day before (monto)
                    if (checkHasAnyShift(person, dayNum - 1)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Riposo pre-guardia (Monto)`);
                    }
                    // Check day after (smonto)
                    if (checkHasAnyShift(person, dayNum + 1)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Riposo post-guardia (Smonto)`);
                    }
                } else {
                    // If normal shift, check if day before was guard (smonto)
                    if (checkHasGuardShift(person, dayNum - 1)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Riposo post-guardia (Smonto)`);
                    }
                    // Check if day after is guard (monto)
                    if (checkHasGuardShift(person, dayNum + 1)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Riposo pre-guardia (Monto)`);
                    }
                }
            }

            // 5. Weekly Hours Count (Limit 36 hours)
            const weeks = getWeeksOfMonth(year, month);
            const weekIdx = weeks.findIndex(w => w.includes(parseInt(dayNum)));
            if (weekIdx !== -1) {
                let hours = 0;
                const weekDays = weeks[weekIdx];
                weekDays.forEach(d => {
                    const dayShifts = shiftsByDay[d];
                    if (!dayShifts) return;
                    for (let c = 2; c <= 16; c++) {
                        const cellShifts = dayShifts[c] || [];
                        cellShifts.forEach(s => {
                            const tokens = s.content.toUpperCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
                            if (tokens.includes(person)) {
                                hours += getShiftHours(getActualShiftType(s, isNewGuardSystem), isNewGuardSystem);
                            }
                        });
                    }
                });

                if (hours > 36) {
                    worstStatus = 'ERROR';
                    messages.push(`${person}: Superate 36 ore settimanali (${hours}h)`);
                }
            }
        }
    });

    if (worstStatus === 'ERROR') {
        return { status: 'ERROR', message: messages.join('\n') };
    }
    if (worstStatus === 'PREFERENCE') {
        return { status: 'PREFERENCE', message: 'Preference Match' };
    }

    return { status: 'OK' };
}

// Helper to determine if a shift slot conflicts with a constraint slot (AM/PM/ALL)
function isSlotConflict(shiftType, constraintSlot) {
    if (constraintSlot === 'ALL') return true;
    if (shiftType === 'FERIE') return false;
    if (shiftType === 'GENERIC') return true; // Safety

    // Basic Types classification based on the Parser/ShiftBoard constants
    // AM includes 8-14 slots
    const AM_TYPES = [
        'AMBULATORIO_08-14', 'REPARTO_08-14', 'BALD_08-14',
        'DH_08-14', 'CONS_08-14', 'SALA_OP_08-14',
        'SALA_DS_08-14', 'NORA_08-14', 'SM_08-14', 'PS_08-14',
        'REP_2'
    ];

    // PM includes 14-19/20 slots
    const PM_TYPES = [
        'AMBULATORIO_14-19', 'SALA_OP_14-19', 'PS_CONT_14-20', 'PS_CONT_14-08'
    ];

    if (constraintSlot === 'AM') {
        // Conflict if the shift is AM
        if (AM_TYPES.includes(shiftType)) return true;

        // Extended heuristics just in case strings don't match exactly
        if (shiftType.includes('08-14')) return true;
    }

    if (constraintSlot === 'PM') {
        // Conflict if the shift is PM
        if (PM_TYPES.includes(shiftType)) return true;

        if (shiftType.includes('14-19') || shiftType.includes('14-20')) return true;
    }

    return false;
}
