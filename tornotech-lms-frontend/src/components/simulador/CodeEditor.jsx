import { useRef } from "react";

/**
 * Editor de código ISO con números de línea (ver simulador_cnc_tornotech_lms/code.html).
 * Usa un <textarea> real (accesible, editable, sin dependencias extra) con un gutter de
 * números sincronizado por scroll. Resaltado de sintaxis completo queda para una iteración
 * futura (requeriría CodeMirror/Monaco); por ahora se resalta la línea con error via `lineasConError`.
 */
export default function CodeEditor({ value, onChange, lineasConError = [], readOnly = false }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const lineas = value.split("\n");

  function sincronizarScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex font-code-md text-code-md">
      <div
        ref={gutterRef}
        className="w-10 flex flex-col items-end pr-3 text-outline-variant select-none border-r border-surface-container-high py-2 overflow-hidden shrink-0"
      >
        {lineas.map((_, i) => (
          <div
            key={i}
            className={
              lineasConError.includes(i + 1)
                ? "text-error font-bold bg-surface-container-high w-full text-right px-3 -mr-3 relative before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-error"
                : "leading-[1.4]"
            }
          >
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        onScroll={sincronizarScroll}
        className="flex-1 bg-transparent outline-none resize-none pl-4 py-2 leading-[1.4] text-on-surface-variant whitespace-pre"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        wrap="off"
        readOnly={readOnly}
      />
    </div>
  );
}
