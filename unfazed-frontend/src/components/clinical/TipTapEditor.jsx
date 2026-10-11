import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function TipTapEditor({ content = '', onChange, placeholder = 'Start typing clinical observations...' }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class:
          'min-h-[160px] max-h-[360px] overflow-y-auto px-3.5 py-2.5 text-xs text-surface-800 outline-none leading-relaxed prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML(), editor.getJSON());
      }
    },
  });

  if (!editor) {
    return (
      <div className="border border-surface-200 rounded-xl p-4 text-xs text-surface-400">
        Loading clinical editor...
      </div>
    );
  }

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition shadow-xs">
      {/* Formatting Toolbar */}
      <div className="bg-surface-50 border-b border-surface-200 px-2 py-1.5 flex flex-wrap items-center gap-1 text-xs text-surface-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
            editor.isActive('bold') ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded italic transition cursor-pointer ${
            editor.isActive('italic') ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Italic"
        >
          I
        </button>
        <span className="w-px h-4 bg-surface-300 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded font-semibold text-[11px] transition cursor-pointer ${
            editor.isActive('heading', { level: 2 }) ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded font-semibold text-[11px] transition cursor-pointer ${
            editor.isActive('heading', { level: 3 }) ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Heading 3"
        >
          H3
        </button>
        <span className="w-px h-4 bg-surface-300 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded transition cursor-pointer ${
            editor.isActive('bulletList') ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded transition cursor-pointer ${
            editor.isActive('orderedList') ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Numbered List"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded transition cursor-pointer ${
            editor.isActive('blockquote') ? 'bg-surface-200 text-surface-900' : 'hover:bg-surface-200/60'
          }`}
          title="Quote / Patient Utterance"
        >
          " Quote
        </button>
        <span className="w-px h-4 bg-surface-300 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1 rounded hover:bg-surface-200/60 transition disabled:opacity-30 cursor-pointer"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1 rounded hover:bg-surface-200/60 transition disabled:opacity-30 cursor-pointer"
          title="Redo"
        >
          ↷
        </button>
      </div>

      {/* Editor Surface */}
      <EditorContent editor={editor} />
    </div>
  );
}
