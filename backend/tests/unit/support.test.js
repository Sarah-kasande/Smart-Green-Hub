// Help requests (docs/DEVIATIONS.md W51): the 14-day reopen rule and what a user sees versus the
// administrator. No database needed: only the pure helpers are called.
const { canReopen, ticketJson } = require('../../src/services/supportService');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-21T10:00:00Z');

describe('canReopen', () => {
  test('a resolved ticket can be reopened for 14 days', () => {
    expect(canReopen({ status: 'resolved', resolved_at: new Date(now - 1 * DAY) }, now)).toBe(true);
    expect(canReopen({ status: 'resolved', resolved_at: new Date(now - 14 * DAY) }, now)).toBe(true);
    expect(canReopen({ status: 'resolved', resolved_at: new Date(now - 14 * DAY - 1000) }, now)).toBe(false);
  });

  test('only resolved tickets can be reopened', () => {
    expect(canReopen({ status: 'open', resolved_at: null }, now)).toBe(false);
    expect(canReopen({ status: 'in_progress', resolved_at: null }, now)).toBe(false);
  });
});

describe('ticketJson', () => {
  const ticket = {
    id: 4,
    category: 'sales',
    subject: 'Totals look wrong',
    status: 'in_progress',
    created_at: new Date(now),
    last_message_at: new Date(now),
    resolved_at: null,
    solved_feedback: null,
    requester_name: 'Test User',
    requester_email: 'user@example.test',
    requester_role: 'operator',
    organisation_name: 'Test Nursery',
    user_id: 9,
  };
  const messages = [
    { id: 1, body: 'Question', from_admin: false, internal: false, created_at: new Date(now) },
    { id: 2, body: 'Secret note', from_admin: true, internal: true, created_at: new Date(now) },
    { id: 3, body: 'Answer', from_admin: true, internal: false, created_at: new Date(now) },
  ];

  test('a user never receives internal notes', () => {
    const json = ticketJson(ticket, 'user', messages);
    expect(json.messages.map((m) => m.body)).toEqual(['Question', 'Answer']);
    expect(JSON.stringify(json)).not.toContain('Secret note');
    expect(json.user_id).toBeUndefined();
  });

  test('the administrator sees everything, with the sender attached', () => {
    const json = ticketJson(ticket, 'admin', messages);
    expect(json.messages).toHaveLength(3);
    expect(json.requester).toEqual({ name: 'Test User', email: 'user@example.test', role: 'operator', organisation: 'Test Nursery' });
  });
});
