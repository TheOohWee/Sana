let intervalId = null;
let startTimestamp = null;
let totalDuration = null;

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'start':
      startTimestamp = payload.startTimestamp;
      totalDuration = payload.totalDuration;

      if (intervalId) clearInterval(intervalId);

      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTimestamp;
        const remaining = Math.max(0, totalDuration - elapsed);

        self.postMessage({
          type: 'tick',
          remaining: Math.ceil(remaining / 1000),
        });

        if (remaining <= 0) {
          clearInterval(intervalId);
          intervalId = null;
          self.postMessage({ type: 'complete' });
        }
      }, 1000);

      const initialRemaining = Math.max(0, totalDuration - (Date.now() - startTimestamp));
      self.postMessage({
        type: 'tick',
        remaining: Math.ceil(initialRemaining / 1000),
      });
      break;

    case 'stop':
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      break;

    case 'sync':
      if (startTimestamp && totalDuration) {
        const elapsed = Date.now() - startTimestamp;
        const remaining = Math.max(0, totalDuration - elapsed);
        self.postMessage({
          type: 'tick',
          remaining: Math.ceil(remaining / 1000),
        });
        if (remaining <= 0) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          self.postMessage({ type: 'complete' });
        }
      }
      break;
  }
};
