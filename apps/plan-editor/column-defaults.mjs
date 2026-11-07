// Adapt the pinned upstream placement tool so preview and committed columns
// use the same user dimensions. Fail the build if the upstream seam changes.
export function adaptColumnDefaults(code) {
  const changes = [
    ['        ...preset,', "        ...preset,\n        ...useEditor.getState().toolDefaults.column,"],
    ['    const activeLevelId = useViewer', '    const columnDefaults = useEditor((state) => state.toolDefaults.column);\n    const activeLevelId = useViewer'],
    ['createColumnFromPreset(DEFAULT_COLUMN_PRESET_ID, [0, 0, 0]), []);', 'createColumnFromPreset(DEFAULT_COLUMN_PRESET_ID, [0, 0, 0]), [columnDefaults]);'],
  ];
  for (const [from, to] of changes) {
    if (!code.includes(from)) throw new Error('Column placement adapter needs updating');
    code = code.replace(from, to);
  }
  return code;
}
