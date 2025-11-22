jest.resetModules();

const DelayNode = require('../src/engine/nodes/DelayNode').default;

describe('DelayNode generateHTML', () => {
  it('does not render a value attribute when delayMs is 0', () => {
    const html = DelayNode.generateHTML({ delayMs: 0 });
    expect(html).toBeDefined();
    // The generated node HTML should not contain value="0" nor any value attribute
    expect(html.includes('value="0"')).toBe(false);
    // If input has value attribute at all, it should not be equal to "0"
    const valueAttrMatch = html.match(/value\s*=\s*"([^"]*)"/);
    if (valueAttrMatch) {
      expect(valueAttrMatch[1]).not.toBe('0');
    }
  });

  it('renders the correct placeholder and class for the input', () => {
    const html = DelayNode.generateHTML({ delayMs: 0 });
    expect(html.includes('class="delay-input"')).toBe(true);
    expect(html.includes('placeholder="1,5"')).toBe(true);
  });
});

export {};
