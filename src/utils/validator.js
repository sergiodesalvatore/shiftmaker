import { KNOWN_PEOPLE } from './constants';

/**
 * Validates a shift assignment against defined constraints.
 * Handles multiple people in one cell (e.g. "BUR BON").
 */
export function validateShift(cellContent, dayNum, dayName, slotType, constraints) {
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
        if (!personConstraints) return;

        // 1. Recurring (Studio Privato)
        if (personConstraints.recurring) {
            for (const rule of personConstraints.recurring) {
                if (rule.day === dayName) {
                    // Recurring rules are usually 'AM' or 'PM'
                    if (isSlotConflict(slotType, rule.slot)) {
                        worstStatus = 'ERROR';
                        messages.push(`${person}: Studio ${rule.day} ${rule.slot}`);
                    }
                }
            }
        }

        // 2. Unavailable (Desiderata No) with AM/PM Support
        if (personConstraints.unavailable) {
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
        if (worstStatus !== 'ERROR' && personConstraints.preferences) {
            for (const rule of personConstraints.preferences) {
                if (rule.day == dayNum) {
                    if (isSlotConflict(slotType, rule.slot)) {
                        if (worstStatus === 'OK') worstStatus = 'PREFERENCE';
                    }
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
