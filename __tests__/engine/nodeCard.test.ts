import { buildNodeCardHTML } from '../../app/src/engine/nodes/templates/nodeCard';

test('renders text, number and switch inputs', () => {
  const html = buildNodeCardHTML({
    title: 'Test',
    inputs: [
      { type: 'text', name: 'username', label: 'User', value: 'bob', placeholder: 'name' },
      { type: 'number', name: 'age', label: 'Age', value: 30, min: 0, max: 200, step: 1 },
      { type: 'switch', name: 'active', label: 'Active', value: true },
    ],
  });

  expect(html).toContain('type="text"');
  expect(html).toContain('name="username"');
  expect(html).toContain('value="bob"');
  expect(html).toContain('placeholder="name"');

  expect(html).toContain('type="number"');
  expect(html).toContain('name="age"');
  expect(html).toContain('min="0"');
  expect(html).toContain('max="200"');
  expect(html).toContain('step="1"');

  expect(html).toContain('type="checkbox"');
  expect(html).toContain('name="active"');
  expect(html).toContain('checked');

  // Should request keyboard dismiss on Enter / change
  // Ensure we post DISMISS_KEYBOARD at least once and also the delayed call exists
  expect(html).toContain('DISMISS_KEYBOARD');
  expect(html).toMatch(/setTimeout\(function\(\)\{[\s\S]*DISMISS_KEYBOARD/);
  // The node HTML should include the current theme as a data attribute (default to 'dark' in test env)
  expect(html).toContain('data-luca-theme="dark"');
});

test('escapes labels and placeholders', () => {
  const html = buildNodeCardHTML({
    title: 'Esc',
    inputs: [{ type: 'text', name: 'x', label: '<bad>', value: 'v', placeholder: '"quoted"' }],
  });

  expect(html).toContain('&lt;bad&gt;');
  expect(html).toContain('placeholder="&quot;quoted&quot;"');
});
