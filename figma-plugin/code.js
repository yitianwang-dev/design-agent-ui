// Design Agent Figma Plugin — Main (sandboxed context)

figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'execute-job') {
    try {
      // サーバーが生成したJavaScriptをFigmaコンテキストで実行
      // Hori fix (2026-05-27): wrap in `return (...)` so the async IIFE's
      // Promise is returned and properly caught by the surrounding try/await.
      const fn = new Function('return (' + msg.code + ')');
      const result = await fn();
      figma.ui.postMessage({ type: 'job-done', jobId: msg.jobId, result });
    } catch (err) {
      figma.ui.postMessage({ type: 'job-error', jobId: msg.jobId, error: err.message });
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
