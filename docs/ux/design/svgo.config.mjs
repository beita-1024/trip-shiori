export default {
  multipass: true,
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',            // Affinity/Illustratorの独自NSとかを除去
    { name: 'removeAttrs', params: {  // 余計な属性を削除
      attrs: ['^serif:.*', 'xmlns:serif', 'id'] // すべてのidを落とす場合
    }},
    // もしurl(#id)参照（clipPath, mask等）があるなら ↑のid削除はやめて、
    // 代わりにIDを安全に短縮する：
    // { name: 'cleanupIDs', params: { remove: true, prefix: 'a' } },
    'collapseGroups',
    'convertPathData',
    'removeUselessDefs',
    'removeUnknownsAndDefaults',
    'removeUselessStrokeAndFill'
  ]
}
