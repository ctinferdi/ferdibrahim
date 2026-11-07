// Keep custom door presets in both the visible draft and the committed native door.
// Check the pinned upstream seams so upgrades cannot silently drop their identity.
export function adaptDoorDefaults(source) {
  let code = source.replace(/\r\n/g, '\n');
  const replacements = [
    ["const DoorTool = () => {", "const presetDoorFields = () => ({ ...placedDoorFields(), ...useEditor.getState().toolDefaults.door });\nconst DoorTool = () => {\n    const doorDefaults = useEditor(s => s.toolDefaults.door);"],
    ['[fallbackPose?.side, placedType, placedStyle]', '[fallbackPose?.side, placedType, placedStyle, doorDefaults]'],
    ['            unsubscribePlacement();\n        };\n    }, []);', '            unsubscribePlacement();\n        };\n    }, [doorDefaults]);'],
  ];
  code = code.replaceAll('...placedDoorFields(),', '...presetDoorFields(),').replaceAll('const placed = placedDoorFields();', 'const placed = presetDoorFields();');
  for (const [from, to] of replacements) {
    if (!code.includes(from)) throw new Error('Door preset adapter needs updating');
    code = code.replace(from, to);
  }
  const name = 'name: `Door ${doorCount + 1}`,';
  if (code.split(name).length !== 3) throw new Error('Door commit adapter needs updating');
  return code.replaceAll(name, "name: useEditor.getState().toolDefaults.door?.name ?? `Door ${doorCount + 1}`,\n                metadata: useEditor.getState().toolDefaults.door?.metadata ?? {},\n                slots: useEditor.getState().toolDefaults.door?.slots,");
}
