import fs from 'node:fs';

const path = 'src/GraphCanvas.tsx';
let text = fs.readFileSync(path, 'utf8');
const marker = 'The force engine can finish while the canvas is still at its initial 1×1';

if (!text.includes(marker)) {
  const start = text.indexOf('  const fitGraph = () => {');
  const end = text.indexOf('  const toggleFlow = () => {', start);
  if (start < 0 || end < 0) throw new Error('Could not locate graph-fit lifecycle anchors.');

  const replacement = `  const fitGraph = () => {
    const graph = graphRef.current;
    if (!graph || graphData.nodes.length === 0 || size.width < 120 || size.height < 120) return false;
    graph.zoomToFit(450, 72);
    fittedGraphRef.current = graphIdentity;
    return true;
  };

  useEffect(() => {
    if (graphData.nodes.length === 0 || size.width < 120 || size.height < 120) return undefined;
    if (fittedGraphRef.current === graphIdentity) return undefined;

    // The force engine can finish while the canvas is still at its initial 1×1
    // measurement. Fit only after ResizeObserver has reported a real viewport;
    // otherwise a failed early fit can leave the camera effectively miles away.
    const timer = window.setTimeout(() => {
      if (fittedGraphRef.current !== graphIdentity) fitGraph();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [graphData.nodes.length, graphIdentity, size.height, size.width]);

`;

  text = text.slice(0, start) + replacement + text.slice(end);
  fs.writeFileSync(path, text);
}
