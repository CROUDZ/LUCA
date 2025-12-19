// FILE D'ENTRÉE PRINCIPALE

// Initialize message listener and send ready event if RN present
window.DrawflowEditor.setupMessageListener && window.DrawflowEditor.setupMessageListener();

if (window.ReactNativeWebView) {
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'READY',
      payload: { timestamp: Date.now() },
    })
  );
}
