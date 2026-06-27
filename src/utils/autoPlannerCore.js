import { getWeeksOfMonth, getShiftHours } from './calendar';

export function analyzeHistoricalData(shifts, people) {
    const stats = {
        totalShifts: shifts.length,
        nightsPerDoc: {},
        shiftsPerDoc: {}
    };

    people.forEach(p => {
        stats.nightsPerDoc[p] = 0;
        stats.shiftsPerDoc[p] = 0;
    });

    shifts.forEach(s => {
        if (!s.content) return;
        const tokens = s.content.split(/\s+/).map(t => t.replace(/[()]/g, '').trim());
        
        tokens.forEach(p => {
            if (people.includes(p)) {
                stats.shiftsPerDoc[p]++;
                
                // Rimuoviamo la logica della notte
            }
        });
    });

    return stats;
}

const WEEKDAY_SHIFTS = [
    'AMBULATORIO_08-14', 'AMBULATORIO_14-19', 
    'REPARTO_08-14', 'REP_2', 
    'DH_08-14', 'CONS_08-14', 
    'SALA_OP_08-14', 'SALA_OP_14-19', 
    'PS_08-14', 'PS_CONT_14-20'
];

const WEEKEND_SHIFTS = ['PS_08-14', 'PS_CONT_14-20', 'REP_2'];

const AFFINITY = {
  "DES": { "SALA_OP_08-14": 0.26, "PS_CONT_14-20": 0.12, "PS_08-14": 0.09, "SALA_OP_14-19": 0.09, "REP_2": 0.09 },
  "MAG": { "PS_08-14": 0.17, "DH_08-14": 0.15, "AMBULATORIO_08-14": 0.11, "SALA_OP_08-14": 0.11 },
  "DON": { "SALA_OP_08-14": 0.16, "SALA_OP_14-19": 0.16, "CONS_08-14": 0.10, "PS_CONT_14-20": 0.10, "REP_2": 0.09 },
  "FUM": { "SALA_OP_08-14": 0.17, "REP_2": 0.12, "PS_08-14": 0.11, "CONS_08-14": 0.09, "PS_CONT_14-20": 0.09 },
  "LAM": { "PS_08-14": 0.19, "CONS_08-14": 0.17, "AMBULATORIO_08-14": 0.17, "REPARTO_08-14": 0.13 },
  "PAS": { "SALA_OP_14-19": 0.17, "SM_08-14": 0.13, "SALA_OP_08-14": 0.13, "REP_2": 0.11 },
  "SAL": { "SALA_OP_14-19": 0.17, "PS_08-14": 0.12, "REP_2": 0.11, "AMBULATORIO_08-14": 0.08, "DH_08-14": 0.08 },
  "INV": { "SALA_OP_08-14": 0.14, "PS_08-14": 0.13, "PS_CONT_14-20": 0.10, "REP_2": 0.10, "SALA_OP_14-19": 0.09 },
  "RUZ": { "PS_08-14": 0.19, "AMBULATORIO_14-19": 0.15, "SALA_OP_08-14": 0.14, "REP_2": 0.11, "SALA_OP_14-19": 0.08 },
  "BON": { "SALA_OP_14-19": 0.13, "PS_08-14": 0.13, "PS_CONT_14-20": 0.11, "REPARTO_08-14": 0.10, "REP_2": 0.10 },
  "SAN": { "AMBULATORIO_14-19": 0.26, "DH_08-14": 0.15, "SALA_OP_14-19": 0.15, "SALA_DS_08-14": 0.15, "BALD_08-14": 0.15 },
  "RUS": { "SALA_OP_08-14": 0.48, "REPARTO_08-14": 0.16, "AMBULATORIO_14-19": 0.11, "SALA_OP_14-19": 0.05 },
  "OGG": { "SALA_OP_08-14": 0.39, "PS_08-14": 0.13, "REP_2": 0.09, "PS_CONT_14-20": 0.09, "AMBULATORIO_08-14": 0.06 },
  "SES": { "SALA_OP_08-14": 0.25, "SALA_OP_14-19": 0.09, "AMBULATORIO_08-14": 0.09, "REPARTO_08-14": 0.07, "REP_2": 0.07 },
  "MAS": { "SALA_OP_14-19": 0.23, "AMBULATORIO_14-19": 0.13, "PS_CONT_14-20": 0.11, "SALA_DS_08-14": 0.10 },
  "COS": { "SALA_OP_08-14": 0.84 },
  "BUR": { "SALA_OP_14-19": 0.14, "REP_2": 0.12, "PS_08-14": 0.11, "PS_CONT_14-20": 0.09, "AMBULATORIO_08-14": 0.08 }
};

const DAY_AFFINITY = {
  // Pattern estratti in cui un medico fa quasi sempre un certo turno in un certo giorno (0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab)
  "MAG": { 2: "DH_08-14", 4: "PS_08-14" },
  "RUZ": { 3: "PS_08-14" },
  "SAN": { 1: "BALD_08-14", 5: "AMBULATORIO_14-19" }, // Baldelli il Lunedì
  "RUS": { 2: "SALA_OP_08-14", 3: "SALA_OP_08-14" },
  "MAS": { 5: "SALA_OP_14-19" },
  "PAS": { 4: "SM_08-14" }, // S.M. il Giovedì
  "COS": { 2: "SALA_OP_08-14", 3: "SALA_OP_08-14" } // Costici: martedì e mercoledì
};

export function generateMonthPlan(monthStr, people, constraints, vacationData, historicalStats) {
    // monthStr is like "2026-08"
    const [y, m] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const isNewGuardSystem = y >= 2027;

    const weekdayShifts = isNewGuardSystem
        ? [
            'AMBULATORIO_08-14', 'AMBULATORIO_14-19', 
            'REPARTO_08-14', 'REP_2', 
            'DH_08-14', 'CONS_08-14', 
            'SALA_OP_08-14', 'SALA_OP_14-19', 
            'PS_08-14', 'GUARDIA_08-20', 'GUARDIA_NOTTE_20-08'
          ]
        : [
            'AMBULATORIO_08-14', 'AMBULATORIO_14-19', 
            'REPARTO_08-14', 'REP_2', 
            'DH_08-14', 'CONS_08-14', 
            'SALA_OP_08-14', 'SALA_OP_14-19', 
            'PS_08-14', 'PS_CONT_14-20'
          ];

    const weekendShifts = isNewGuardSystem
        ? ['PS_08-14', 'GUARDIA_08-20', 'GUARDIA_NOTTE_20-08', 'REP_2']
        : ['PS_08-14', 'PS_CONT_14-20', 'REP_2'];
    
    const grid = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(y, m - 1, i);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
        
        const dayShifts = {};
        if (isWeekend) {
            weekendShifts.forEach(s => dayShifts[s] = []);
        } else {
            weekdayShifts.forEach(s => dayShifts[s] = []);
            if (dayOfWeek === 1) { // Lunedì
                dayShifts['BALD_08-14'] = [];
            }
            if (dayOfWeek === 4) { // Giovedì
                dayShifts['SALA_DS_08-14'] = [];
                dayShifts['SM_08-14'] = [];
            }
        }

        grid.push({
            day: i,
            dateStr: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
            isWeekend,
            dayOfWeek,
            dayName,
            dateObj,
            shifts: dayShifts
        });
    }

    const shiftCount = {};
    people.forEach(p => {
        shiftCount[p] = 0;
    });

    const weeks = getWeeksOfMonth(y, m);

    const getWeeklyHours = (person, weekIdx) => {
        let hours = 0;
        const weekDays = weeks[weekIdx] || [];
        weekDays.forEach(d => {
            const dayData = grid[d - 1];
            if (!dayData) return;
            Object.keys(dayData.shifts).forEach(shType => {
                if (dayData.shifts[shType].includes(person)) {
                    hours += getShiftHours(shType, isNewGuardSystem);
                }
            });
        });
        return hours;
    };

    const isAvailable = (person, dayNum, slot, shType) => {
        const dayData = grid[dayNum-1];
        const dateStr = dayData.dateStr;

        // 1. Ferie
        if (vacationData && vacationData.requests) {
            if (vacationData.requests.some(r => r.person === person && r.date === dateStr)) return false;
        }

        const c = constraints[person] || {};

        // 2. Indisponibilità forzate
        if (c.unavailable) {
            const unav = c.unavailable.find(u => u.day == dayNum);
            if (unav && (unav.slot === 'ALL' || unav.slot === slot)) return false;
        }

        // 3. Studi Privati Ricorrenti
        if (c.recurring) { 
            const hasRecurring = c.recurring.some(r => {
                let shortDay = r.day; 
                if (shortDay === 'L' && dayData.dayName.startsWith('LUN')) return r.slot === slot;
                if (shortDay === 'MA' && dayData.dayName.startsWith('MAR')) return r.slot === slot;
                if (shortDay === 'ME' && dayData.dayName.startsWith('MER')) return r.slot === slot;
                if (shortDay === 'G' && dayData.dayName.startsWith('GIO')) return r.slot === slot;
                if (shortDay === 'V' && dayData.dayName.startsWith('VEN')) return r.slot === slot;
                if (shortDay === 'S' && dayData.dayName.startsWith('SAB')) return r.slot === slot;
                if (shortDay === 'D' && dayData.dayName.startsWith('DOM')) return r.slot === slot;
                return false;
            });
            if (hasRecurring) return false;
        }

        // 4. Già Assegnato Oggi? (No doppi turni)
        for (const existingShType in dayData.shifts) {
           if (dayData.shifts[existingShType].includes(person)) {
               return false;
           }
        }
        
        // 5. RISERVA PER DAY AFFINITY
        if (shType && DAY_AFFINITY[person] && DAY_AFFINITY[person][dayData.dayOfWeek]) {
            if (DAY_AFFINITY[person][dayData.dayOfWeek] !== shType) {
                return false;
            }
        }

        // 6. Nuovo Sistema Guardie (Monto / Smonto)
        if (isNewGuardSystem) {
            const hasAnyShift = (p, dNum) => {
                if (dNum < 1 || dNum > daysInMonth) return false;
                const dData = grid[dNum - 1];
                if (!dData) return false;
                return Object.keys(dData.shifts).some(st => dData.shifts[st].includes(p));
            };

            const hasGuardShift = (p, dNum) => {
                if (dNum < 1 || dNum > daysInMonth) return false;
                const dData = grid[dNum - 1];
                if (!dData) return false;
                return dData.shifts['GUARDIA_08-20']?.includes(p) || dData.shifts['GUARDIA_NOTTE_20-08']?.includes(p);
            };

            const isGuard = shType === 'GUARDIA_08-20' || shType === 'GUARDIA_NOTTE_20-08';
            if (isGuard) {
                if (hasAnyShift(person, dayNum - 1) || hasAnyShift(person, dayNum + 1)) {
                    return false;
                }
            } else {
                if (hasGuardShift(person, dayNum - 1) || hasGuardShift(person, dayNum + 1)) {
                    return false;
                }
            }
        }

        // 7. Conto Orario Settimanale (max 36 ore)
        const weekIdx = weeks.findIndex(w => w.includes(dayNum));
        if (weekIdx !== -1) {
            const hours = getWeeklyHours(person, weekIdx);
            const shiftHrs = getShiftHours(shType, isNewGuardSystem);
            if (hours + shiftHrs > 36) {
                return false;
            }
        }
        
        return true;
    };

    const hasPreference = (person, dayNum, slot) => {
        const c = constraints[person] || {};
        if (c.preferences) {
            const pref = c.preferences.find(p => p.day == dayNum);
            if (pref && (pref.slot === 'ALL' || pref.slot === slot)) return true;
        }
        return false;
    };

    const assign = (person, dayNum, shiftType) => {
        grid[dayNum-1].shifts[shiftType].push(person);
        shiftCount[person]++;
    };

    const tryAssign = (dayNum, shType, slot) => {
        const sortedPeople = [...people].sort((a, b) => {
            const prefA = hasPreference(a, dayNum, slot) ? -100 : 0;
            const prefB = hasPreference(b, dayNum, slot) ? -100 : 0;
            
            const expectedA = historicalStats && historicalStats[a] ? historicalStats[a] : 21;
            const expectedB = historicalStats && historicalStats[b] ? historicalStats[b] : 21;
            const ratioA = shiftCount[a] / expectedA;
            const ratioB = shiftCount[b] / expectedB;

            const affinityA = AFFINITY[a] && AFFINITY[a][shType] ? AFFINITY[a][shType] : 0;
            const affinityB = AFFINITY[b] && AFFINITY[b][shType] ? AFFINITY[b][shType] : 0;
            
            const dayOfWeek = grid[dayNum-1].dayOfWeek;
            const dayBoostA = (DAY_AFFINITY[a] && DAY_AFFINITY[a][dayOfWeek] === shType) ? 5 : 0;
            const dayBoostB = (DAY_AFFINITY[b] && DAY_AFFINITY[b][dayOfWeek] === shType) ? 5 : 0;
            
            return (prefA + ratioA - affinityA * 0.5 - dayBoostA) - (prefB + ratioB - affinityB * 0.5 - dayBoostB) || (Math.random() - 0.5);
        });

        for (const p of sortedPeople) {
            if (isAvailable(p, dayNum, slot, shType)) {
                assign(p, dayNum, shType);
                return p;
            }
        }
        return null;
    };

    if (isNewGuardSystem) {
        // LEVEL 0: Guardie (Feriali e Festivi) - Priorità Assoluta
        for (let d = 1; d <= daysInMonth; d++) {
            tryAssign(d, 'GUARDIA_08-20', 'ALL');
            tryAssign(d, 'GUARDIA_NOTTE_20-08', 'ALL');
        }

        // LEVEL 1: Weekend altri turni
        for (let d = 1; d <= daysInMonth; d++) {
            if (grid[d-1].isWeekend) {
                tryAssign(d, 'PS_08-14', 'AM'); // Plaster cast remains
                tryAssign(d, 'REP_2', 'AM');
            }
        }

        // LEVEL 2: Feriali ordinari
        for (let d = 1; d <= daysInMonth; d++) {
            if (!grid[d-1].isWeekend) {
                Object.keys(grid[d-1].shifts).forEach(shType => {
                    if (shType === 'GUARDIA_08-20' || shType === 'GUARDIA_NOTTE_20-08') return; // already assigned
                    const slot = shType.includes('14-20') || shType.includes('14-19') ? 'PM' : 'AM';
                    tryAssign(d, shType, slot);
                    
                    if (shType.startsWith('SALA_OP_')) {
                        tryAssign(d, shType, slot);
                    }
                });
            }
        }
    } else {
        // VECCHIO SISTEMA
        // LEVEL 1: Weekend (Sabato e Domenica sono critici)
        for (let d = 1; d <= daysInMonth; d++) {
            if (grid[d-1].isWeekend) {
                const docA = tryAssign(d, 'PS_08-14', 'ALL');
                if (docA) {
                    assign(docA, d, 'PS_CONT_14-20'); 
                }
                tryAssign(d, 'REP_2', 'AM');
            }
        }

        // LEVEL 2: Feriali (Riempimento ordinario)
        for (let d = 1; d <= daysInMonth; d++) {
            if (!grid[d-1].isWeekend) {
                Object.keys(grid[d-1].shifts).forEach(shType => {
                    const slot = shType.includes('14-20') || shType.includes('14-19') ? 'PM' : 'AM';
                    tryAssign(d, shType, slot);
                    
                    if (shType.startsWith('SALA_OP_')) {
                        tryAssign(d, shType, slot);
                    }
                });
            }
        }
    }

    return { grid, shiftCount };
}
