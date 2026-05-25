// Design Agent Figma Plugin — Main (sandboxed context)

figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'execute-job') {
    try {
      // サーバーが生成したJavaScriptをFigmaコンテキストで実行
      const fn = new Function(msg.code);
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
