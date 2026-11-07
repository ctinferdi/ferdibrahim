export function adaptWallContinuation(code) {
  const original = 'if (closedToChainStart ||\n                        chainEndJoinsExistingWall(createdWall.end, levelWalls, chainWallIds.current) ||\n                        wallClosesRoom(levelWalls, createdWall)) {';
  const normalized = code.replaceAll('\r\n', '\n');
  if (!normalized.includes(original)) throw new Error('Wall tool changed: review continuous drawing adapter');
  return normalized.replace(original, "if (useEditor.getState().getContinuation('wall') !== 'continuous' && (closedToChainStart ||\n                        chainEndJoinsExistingWall(createdWall.end, levelWalls, chainWallIds.current) ||\n                        wallClosesRoom(levelWalls, createdWall))) {");
}
