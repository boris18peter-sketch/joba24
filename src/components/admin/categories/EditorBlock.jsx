/**
 * One labelled block inside a category editor.
 *
 * The category editor is long: identity fields, customer-facing content, the
 * task form, the status flow and the fee. Without headings it reads as one
 * undifferentiated wall of inputs and an admin has to hunt for the thing they
 * came to change. Every block states what it holds, and — where it matters —
 * what it affects, so the editor is navigable by reading rather than by
 * remembering the order.
 */
export default function EditorBlock({ title, desc, children }) {
  return (
    <section className="rounded-lg border border-jborder-1 bg-surface-1 p-3 space-y-3">
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        {desc && <p className="text-xs text-jtext-3 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      {children}
    </section>
  );
}