/** A minimal generic node used to build an XML tree before string serialization. */
export interface XmlNode {
  tag: string
  attrs?: Record<string, string>
  children?: XmlNode[]
  /** Text content. Mutually exclusive with `children` in practice, but not enforced. */
  text?: string
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function serializeNode(node: XmlNode): string {
  const attrs = node.attrs
    ? Object.entries(node.attrs)
        .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
        .join('')
    : ''

  const hasChildren = node.children !== undefined && node.children.length > 0
  const hasText = node.text !== undefined && node.text.length > 0

  if (!hasChildren && !hasText) {
    return `<${node.tag}${attrs}/>`
  }

  const inner = hasChildren
    ? node.children!.map(serializeNode).join('')
    : escapeText(node.text!)

  return `<${node.tag}${attrs}>${inner}</${node.tag}>`
}

/** Serializes a node tree to a full XML document string, including the XML declaration. */
export function serializeXml(root: XmlNode): string {
  return `<?xml version="1.0" encoding="utf-8"?>\n${serializeNode(root)}`
}
