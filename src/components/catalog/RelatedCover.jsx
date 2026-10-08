import React, { useState } from 'react';

export default function RelatedCover({ title }) {
  const [failed, setFailed] = useState(null);
  return (
    <span className="related-mark">
      {title.cover && failed !== title.cover ? (
        <img
          src={title.cover}
          alt={`Portada de ${title.title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(title.cover)}
        />
      ) : (
        <span>Sin portada</span>
      )}
    </span>
  );
}
