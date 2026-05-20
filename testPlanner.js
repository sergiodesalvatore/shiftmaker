import { generateMonthPlan } from './src/utils/autoPlannerCore.js';

const people = ['BON', 'BUR', 'COS', 'DES', 'DON', 'FUM', 'INV', 'LAM', 'MAG', 'MAS', 'OGG', 'PAS', 'RUS', 'RUZ', 'SAL', 'SAN', 'SES'];

try {
    const result = generateMonthPlan("2026-08", people, {}, {}, {});
    console.log(JSON.stringify(result.grid[15], null, 2)); // Print day 16 (mid month)
    console.log(result.shiftCount);
} catch (e) {
    console.error("ERROR:", e);
}
