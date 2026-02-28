if (process.platform === 'darwin') {
  process.env.LSUIElement = '1';
  try {
    const { app } = require('electron');
    if (app?.dock) {
      const hide = () => app.dock.hide();
      app.isReady?.() ? hide() : app.whenReady?.().then(hide).catch(() => {});
      app.on?.('activate', hide);
    }
  } catch {}
}
