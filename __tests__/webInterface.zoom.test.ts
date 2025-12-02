// Tests for zoom behavior in NodeEditorWeb.transform.js
// Ensures both zoomAt and the wheel handler keep world coordinates stable.

type EventHandler = (event: any) => void;
let eventHandlers: Record<string, EventHandler[]> = {};

beforeAll(() => {
  (globalThis as any).window = (globalThis as any).window || {};
  eventHandlers = {};
  const precanvas = { style: {} as any };
  const container = {
    precanvas,
    getBoundingClientRect: () => ({
      left: 100,
      top: 10,
      width: 500,
      height: 400,
      right: 600,
      bottom: 410,
    }),
    querySelector: () => null,
    addEventListener: (evt: string, handler: EventHandler) => {
      eventHandlers[evt] = eventHandlers[evt] || [];
      eventHandlers[evt].push(handler);
    },
    removeEventListener: () => {},
  } as any;

  (window as any).DrawflowEditor = (window as any).DrawflowEditor || {};
  (window as any).DrawflowEditor.container = container;
  (window as any).DrawflowEditor.editor = {
    precanvas,
    zoom: 1,
    canvas_x: 0,
    canvas_y: 0,
  };

  require('../src/webInterface/NodeEditorWeb.transform.js');
});

test('zoomAt keeps world coordinates under cursor', () => {
  const W = (window as any).DrawflowEditor;
  const ZOOM = W.ZOOM;
  const PAN = W.PAN;
  const container = W.container;

  ZOOM.current = 1.2;
  PAN.x = -50;
  PAN.y = 30;

  const worldX = 200;
  const worldY = 150;
  const rect: any = container.getBoundingClientRect();
  const clientX = rect.left + (PAN.x + worldX * ZOOM.current);
  const clientY = rect.top + (PAN.y + worldY * ZOOM.current);

  const newScale = 2;
  W.zoomAt(clientX, clientY, newScale);

  const newClientX = rect.left + (PAN.x + worldX * ZOOM.current);
  const newClientY = rect.top + (PAN.y + worldY * ZOOM.current);

  expect(Math.abs(newClientX - clientX)).toBeLessThan(1e-6);
  expect(Math.abs(newClientY - clientY)).toBeLessThan(1e-6);
});

test('wheel handler zooms around cursor', () => {
  const W = (window as any).DrawflowEditor;
  const wheelHandler = eventHandlers.wheel?.[0];
  expect(typeof wheelHandler).toBe('function');

  const PAN = W.PAN;
  const ZOOM = W.ZOOM;
  PAN.x = 0;
  PAN.y = 0;
  ZOOM.current = 1;
  const rect: any = W.container.getBoundingClientRect();
  const worldX = 120;
  const worldY = 80;
  const clientX = rect.left + (PAN.x + worldX * ZOOM.current);
  const clientY = rect.top + (PAN.y + worldY * ZOOM.current);

  wheelHandler?.({
    deltaY: -120,
    clientX,
    clientY,
    preventDefault: () => {},
  });

  expect(ZOOM.current).toBeGreaterThan(1);
  const newClientX = rect.left + (PAN.x + worldX * ZOOM.current);
  const newClientY = rect.top + (PAN.y + worldY * ZOOM.current);
  expect(Math.abs(newClientX - clientX)).toBeLessThan(1e-6);
  expect(Math.abs(newClientY - clientY)).toBeLessThan(1e-6);
});

test('zoomBySteps focuses on viewport center', () => {
  const W = (window as any).DrawflowEditor;
  const PAN = W.PAN;
  const ZOOM = W.ZOOM;
  PAN.x = 20;
  PAN.y = -10;
  ZOOM.current = 1;

  const rect: any = W.container.getBoundingClientRect();
  const clientCenterX = rect.left + rect.width / 2;
  const clientCenterY = rect.top + rect.height / 2;
  const centerWorldX = (clientCenterX - rect.left - PAN.x) / ZOOM.current;
  const centerWorldY = (clientCenterY - rect.top - PAN.y) / ZOOM.current;

  W.zoomBySteps(1);

  const newCenterClientX = rect.left + (PAN.x + centerWorldX * ZOOM.current);
  const newCenterClientY = rect.top + (PAN.y + centerWorldY * ZOOM.current);
  const expectedClientX = clientCenterX;
  const expectedClientY = clientCenterY;

  expect(Math.abs(newCenterClientX - expectedClientX)).toBeLessThan(1e-6);
  expect(Math.abs(newCenterClientY - expectedClientY)).toBeLessThan(1e-6);
});

test('resetView restores defaults', () => {
  const W = (window as any).DrawflowEditor;
  W.PAN.x = 120;
  W.PAN.y = -80;
  W.ZOOM.current = 2.5;

  W.resetView();

  expect(W.ZOOM.current).toBe(1);
  expect(W.PAN.x).toBe(0);
  expect(W.PAN.y).toBe(0);
});

test('onZoomChange notifies subscribers', () => {
  const W = (window as any).DrawflowEditor;
  const calls: number[] = [];
  const unsubscribe = W.onZoomChange((value: number) => {
    calls.push(value);
  });

  expect(calls.length).toBeGreaterThan(0); // initial call

  const rect: any = W.container.getBoundingClientRect();
  W.zoomByFactor(1.1, rect.left + 100, rect.top + 60);
  expect(calls.length).toBeGreaterThan(1);

  unsubscribe?.();
});
