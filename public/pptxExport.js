const encoder = new TextEncoder();

export const pptThemes = [
  { id: 'formal-blue', label: '正式蓝', accent: '0071E3', text: '1D1D1F', muted: '6E6E73', background: 'FFFFFF', line: 'D2D2D7' },
  { id: 'academic-green', label: '学术绿', accent: '0F7B5F', text: '18362B', muted: '5F6F69', background: 'FFFFFF', line: 'CFE3DC' },
  { id: 'minimal-mono', label: '极简黑白', accent: '1D1D1F', text: '1D1D1F', muted: '6E6E73', background: 'FFFFFF', line: 'D2D2D7' },
  { id: 'vitality-orange', label: '活力橙', accent: 'F97316', text: '2B2118', muted: '7A6250', background: 'FFFFFF', line: 'F2D1BA' },
  { id: 'mobile-blue', label: '移动蓝', accent: '0086D1', text: '1D1D1F', muted: '5B6B76', background: 'FFFFFF', line: 'C9E4F4' }
];

const slideWidth = 12192000;
const slideHeight = 6858000;

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function themeFor(themeId) {
  return pptThemes.find((theme) => theme.id === themeId) || pptThemes[0];
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clip(value, limit = 72) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function bulletItems(items, limit = 5) {
  return toArray(items).slice(0, limit).map((item) => clip(item, 92));
}

function slideModel({ result = {}, input = {} } = {}) {
  const plan = result.teachingPlan || {};
  const flow = toArray(plan.classFlow).length ? plan.classFlow : [];
  const course = input.course || '课堂方案';
  const topic = input.topic || '';
  const title = topic ? `${course} · ${topic}` : course;

  if (result.rawText) {
    return [
      { kind: 'cover', title: '课堂方案', subtitle: title },
      { title: '生成内容', bullets: [clip(result.rawText, 300)] }
    ];
  }

  return [
    { kind: 'cover', title: '课堂方案', subtitle: title },
    { title: '教学目标', bullets: bulletItems(plan.objectives) },
    {
      title: '课堂流程',
      bullets: flow.length
        ? flow.slice(0, 5).map((item) => `${clip(item.stage, 20)} · ${clip(item.minutes, 8)}分钟：${clip(item.activity, 72)}`)
        : ['围绕导入、讲解、练习、反馈组织课堂。']
    },
    {
      title: '课件大纲',
      bullets: asArray(result.slideOutline).slice(0, 6).map((slide, index) => `${index + 1}. ${clip(slide.title || slide.speakerNotes, 84)}`)
    },
    {
      title: '随堂测验',
      bullets: asArray(result.quiz).slice(0, 5).map((item, index) => `${index + 1}. ${clip(item.question, 78)}｜答案：${clip(item.answer, 28)}`)
    },
    {
      title: '课后分层任务',
      bullets: [
        `基础巩固：${bulletItems(result.tieredTasks?.basic, 3).join('；') || '暂无内容'}`,
        `能力提升：${bulletItems(result.tieredTasks?.advanced, 3).join('；') || '暂无内容'}`,
        `挑战拓展：${bulletItems(result.tieredTasks?.challenge, 3).join('；') || '暂无内容'}`
      ]
    },
    { title: '演示话术', bullets: [clip(result.pitchScript || '围绕课堂目标、教学过程和闭环反馈进行汇报。', 260)] }
  ];
}

function paragraph(text, { size = 2200, color, bold = false } = {}) {
  return `<a:p><a:pPr marL="0" indent="0"/><a:r><a:rPr lang="zh-CN" sz="${size}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${xml(text)}</a:t></a:r></a:p>`;
}

function textBox({ id, name, x, y, cx, cy, lines, color, size, bold = false }) {
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="${xml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
    <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${lines.map((line) => paragraph(line, { size, color, bold })).join('')}</p:txBody>
  </p:sp>`;
}

function accentLine(theme) {
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="8" name="Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="700000" y="6100000"/><a:ext cx="10800000" cy="36000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${theme.accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
  </p:sp>`;
}

function slideXml(slide, index, theme) {
  const body = slide.kind === 'cover'
    ? [
        textBox({ id: 2, name: 'Title', x: 760000, y: 1980000, cx: 10500000, cy: 760000, lines: [slide.title], color: theme.text, size: 4600, bold: true }),
        textBox({ id: 3, name: 'Subtitle', x: 780000, y: 2940000, cx: 9900000, cy: 520000, lines: [clip(slide.subtitle, 90)], color: theme.muted, size: 2400 }),
        accentLine(theme)
      ].join('')
    : [
        textBox({ id: 2, name: 'Title', x: 700000, y: 520000, cx: 10400000, cy: 540000, lines: [slide.title], color: theme.text, size: 3400, bold: true }),
        textBox({
          id: 3,
          name: 'Content',
          x: 840000,
          y: 1420000,
          cx: 10100000,
          cy: 4280000,
          lines: (slide.bullets && slide.bullets.length ? slide.bullets : ['暂无内容']).map((item) => `• ${item}`),
          color: theme.text,
          size: 1900
        }),
        accentLine(theme)
      ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="${theme.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideWidth}" cy="${slideHeight}"/><a:chOff x="0" y="0"/><a:chExt cx="${slideWidth}" cy="${slideHeight}"/></a:xfrm></p:grpSpPr>
      ${body}
      <p:sp>
        <p:nvSpPr><p:cNvPr id="20" name="Footer"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="10100000" y="6200000"/><a:ext cx="1100000" cy="260000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/>${paragraph(String(index), { size: 1200, color: theme.muted })}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function contentTypes(count) {
  const slideTypes = Array.from({ length: count }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideTypes}
</Types>`;
}

function coreProps() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>课堂方案</dc:title>
  <dc:creator>课堂方案工作台</dc:creator>
  <cp:lastModifiedBy>课堂方案工作台</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;
}

function appProps(slideCount) {
  const titles = Array.from({ length: slideCount }, (_, index) => `<vt:lpstr>第 ${index + 1} 页</vt:lpstr>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>课堂方案工作台</Application>
  <PresentationFormat>宽屏</PresentationFormat>
  <Slides>${slideCount}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>幻灯片</vt:lpstr></vt:variant><vt:variant><vt:i4>${slideCount}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${slideCount}" baseType="lpstr">${titles}</vt:vector></TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
}

function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function textStyleLevel(level, size) {
  return `<a:lvl${level}pPr marL="0" indent="0" algn="l" defTabSz="914400"><a:defRPr sz="${size}" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/></a:defRPr></a:lvl${level}pPr>`;
}

function presentationXml(count) {
  const slideIds = Array.from({ length: count }, (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="${slideWidth}" cy="${slideHeight}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>${textStyleLevel(1, 1800)}</p:defaultTextStyle>
</p:presentation>`;
}

function presentationRels(count) {
  const slideRels = Array.from({ length: count }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideWidth}" cy="${slideHeight}"/><a:chOff x="0" y="0"/><a:chExt cx="${slideWidth}" cy="${slideHeight}"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId2"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle>${textStyleLevel(1, 3600)}</p:titleStyle><p:bodyStyle>${textStyleLevel(1, 2000)}</p:bodyStyle><p:otherStyle>${textStyleLevel(1, 1800)}</p:otherStyle></p:txStyles>
</p:sldMaster>`;
}

function slideMasterRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideWidth}" cy="${slideHeight}"/><a:chOff x="0" y="0"/><a:chExt cx="${slideWidth}" cy="${slideHeight}"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
}

function slideLayoutRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

function slideRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function themeXml(theme) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${xml(theme.label)}">
  <a:themeElements>
    <a:clrScheme name="${xml(theme.label)}"><a:dk1><a:srgbClr val="${theme.text}"/></a:dk1><a:lt1><a:srgbClr val="${theme.background}"/></a:lt1><a:dk2><a:srgbClr val="${theme.muted}"/></a:dk2><a:lt2><a:srgbClr val="F5F5F7"/></a:lt2><a:accent1><a:srgbClr val="${theme.accent}"/></a:accent1><a:accent2><a:srgbClr val="${theme.line}"/></a:accent2><a:accent3><a:srgbClr val="${theme.accent}"/></a:accent3><a:accent4><a:srgbClr val="${theme.muted}"/></a:accent4><a:accent5><a:srgbClr val="${theme.line}"/></a:accent5><a:accent6><a:srgbClr val="${theme.accent}"/></a:accent6><a:hlink><a:srgbClr val="${theme.accent}"/></a:hlink><a:folHlink><a:srgbClr val="${theme.muted}"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="Office"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface="Microsoft YaHei"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface="Microsoft YaHei"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Clean">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="85000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="28575" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst><a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="10000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
        <a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="12000"/></a:srgbClr></a:outerShdw></a:effectLst><a:scene3d><a:camera prst="orthographicFront"/><a:lightRig rig="threePt" dir="t"/></a:scene3d><a:sp3d><a:bevelT w="63500" h="25400"/></a:sp3d></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="98000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="92000"/></a:schemeClr></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function header(size) {
  return new Uint8Array(size);
}

function writeText(target, offset, text) {
  target.set(encoder.encode(text), offset);
}

function localHeader(name, data, crc) {
  const nameBytes = encoder.encode(name);
  const output = header(30 + nameBytes.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(8, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  output.set(nameBytes, 30);
  return output;
}

function centralHeader(name, data, crc, offset) {
  const nameBytes = encoder.encode(name);
  const output = header(46 + nameBytes.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(10, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint32(42, offset, true);
  output.set(nameBytes, 46);
  return output;
}

function endRecord(count, centralSize, centralOffset) {
  const output = header(22);
  const view = new DataView(output.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return output;
}

function zip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const data = encoder.encode(entry.content);
    const crc = crc32(data);
    const local = localHeader(entry.name, data, crc);
    localParts.push(local, data);
    centralParts.push(centralHeader(entry.name, data, crc, offset));
    offset += local.length + data.length;
  }
  const centralOffset = offset;
  const central = concat(centralParts);
  const end = endRecord(entries.length, central.length, centralOffset);
  return concat([...localParts, central, end]);
}

export function buildPptx({ result = {}, input = {}, themeId = 'formal-blue' } = {}) {
  const theme = themeFor(themeId);
  const slides = slideModel({ result, input });
  const entries = [
    { name: '[Content_Types].xml', content: contentTypes(slides.length) },
    { name: '_rels/.rels', content: rootRels() },
    { name: 'docProps/core.xml', content: coreProps() },
    { name: 'docProps/app.xml', content: appProps(slides.length) },
    { name: 'ppt/presentation.xml', content: presentationXml(slides.length) },
    { name: 'ppt/_rels/presentation.xml.rels', content: presentationRels(slides.length) },
    { name: 'ppt/slideMasters/slideMaster1.xml', content: slideMasterXml() },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', content: slideMasterRels() },
    { name: 'ppt/slideLayouts/slideLayout1.xml', content: slideLayoutXml() },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', content: slideLayoutRels() },
    { name: 'ppt/theme/theme1.xml', content: themeXml(theme) },
    ...slides.flatMap((slide, index) => [
      { name: `ppt/slides/slide${index + 1}.xml`, content: slideXml(slide, index + 1, theme) },
      { name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, content: slideRels() }
    ])
  ];
  return zip(entries);
}

export function pptFileName(input = {}) {
  const parts = [safePart(input.course), safePart(input.topic)].filter(Boolean);
  return `课堂方案${parts.length ? `-${parts.join('-')}` : ''}.pptx`;
}
