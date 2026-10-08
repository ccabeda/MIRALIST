import { useState } from 'react';

export default function useLibrarySelection(library) {
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);
  return {
    selecting,
    setSelecting,
    selectedIds: selection.filter((id) => Object.hasOwn(library, id)),
    setSelection,
    reset() {
      setSelecting(false);
      setSelection([]);
    },
  };
}
