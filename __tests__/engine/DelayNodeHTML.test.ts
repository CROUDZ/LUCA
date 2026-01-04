import DelayNode from '../../app/src/engine/nodes/controle/DelayNode';

test('DelayNode.generateHTML uses number input for delay_ms', () => {
  const html = DelayNode.generateHTML({ delayMs: 1500 });

  // Should render a number input with name delay_ms and value 1500
  expect(html).toContain('type="number"');
  expect(html).toContain('name="delay_ms"');
  expect(html).toContain('value="1500"');
  // Subtitle should still show friendly seconds display
  expect(html).toContain('1.5s');
});
