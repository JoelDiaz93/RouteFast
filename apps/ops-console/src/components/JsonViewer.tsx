interface JsonViewerProps {
  value: unknown;
  empty?: string;
}

export function JsonViewer({ value, empty = 'No response selected.' }: JsonViewerProps) {
  if (value === null || value === undefined) return <div className="json-empty">{empty}</div>;
  return <pre className="json-viewer">{JSON.stringify(value, null, 2)}</pre>;
}
