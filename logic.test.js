
const { SYSTEM_PROMPT } = require('./knowledge-base');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Basic test to check if the logic is sound
describe('FM Assist Logic', () => {
    test('System Prompt contains expected phases', () => {
        expect(SYSTEM_PROMPT).toContain('PHASE 1 — IDENTIFICATION');
        expect(SYSTEM_PROMPT).toContain('PHASE 6 — REPORT OUTPUT');
    });
});
