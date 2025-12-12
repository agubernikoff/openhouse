import React from 'react';

export default function mapRichText(richTextObject, index = 0) {
  // console.log(index, richTextObject);
  switch (richTextObject.type) {
    case 'root':
      return (
        <div key={index} className="rich-text-div">
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(child, `${index}-${childIndex}`),
          )}
        </div>
      );
    case 'paragraph':
      return (
        <p key={index} style={{whiteSpace: 'pre-line'}}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(child, `${index}-${childIndex}`),
          )}
        </p>
      );
    case 'heading':
      return (
        <h4 key={index} style={{whiteSpace: 'pre-line'}}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(child, `${index}-${childIndex}`),
          )}
        </h4>
      );
    case 'text':
      if (richTextObject.italic)
        return <em key={index}>{richTextObject.value}</em>;
      if (richTextObject.bold)
        return <strong key={index}>{richTextObject.value}</strong>;
      return <span key={index}>{richTextObject.value}</span>;
    case 'list':
      if (richTextObject.listType === 'ordered')
        return (
          <ol
            key={`${richTextObject.type}-${richTextObject.listType}-${index}`}
          >
            {richTextObject.children.map((child, childIndex) =>
              mapRichText(child, `${index}-${childIndex}`),
            )}
          </ol>
        );
      else
        return (
          <ul
            key={`${richTextObject.type}-${richTextObject.listType}-${index}`}
          >
            {richTextObject.children.map((child, childIndex) =>
              mapRichText(child, `${index}-${childIndex}`),
            )}
          </ul>
        );
    case 'list-item':
      return (
        <li key={index} style={{whiteSpace: 'pre-line'}}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(child, `${index}-${childIndex}`),
          )}
        </li>
      );
    case 'link':
      return (
        <a href={richTextObject.url} key={index}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(child, `${index}-${childIndex}`),
          )}
        </a>
      );
  }
}
