import React from 'react';

export default function mapRichText(
  richTextObject,
  index = 0,
  headingLevel = 4,
  headingClassName,
) {
  // console.log(index, richTextObject);
  switch (richTextObject.type) {
    case 'root':
      return (
        <div key={index} className="rich-text-div">
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(
              child,
              `${index}-${childIndex}`,
              headingLevel,
              headingClassName,
            ),
          )}
        </div>
      );
    case 'paragraph':
      return (
        <p key={index} style={{whiteSpace: 'pre-line'}}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(
              child,
              `${index}-${childIndex}`,
              headingLevel,
              headingClassName,
            ),
          )}
        </p>
      );
    case 'heading': {
      const HeadingTag = `h${headingLevel}`;
      return (
        <HeadingTag
          key={index}
          className={headingClassName}
          style={{whiteSpace: 'pre-line'}}
        >
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(
              child,
              `${index}-${childIndex}`,
              headingLevel,
              headingClassName,
            ),
          )}
        </HeadingTag>
      );
    }
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
              mapRichText(
                child,
                `${index}-${childIndex}`,
                headingLevel,
                headingClassName,
              ),
            )}
          </ol>
        );
      else
        return (
          <ul
            key={`${richTextObject.type}-${richTextObject.listType}-${index}`}
          >
            {richTextObject.children.map((child, childIndex) =>
              mapRichText(
                child,
                `${index}-${childIndex}`,
                headingLevel,
                headingClassName,
              ),
            )}
          </ul>
        );
    case 'list-item':
      return (
        <li key={index} style={{whiteSpace: 'pre-line'}}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(
              child,
              `${index}-${childIndex}`,
              headingLevel,
              headingClassName,
            ),
          )}
        </li>
      );
    case 'link':
      return (
        <a href={richTextObject.url} key={index}>
          {richTextObject.children.map((child, childIndex) =>
            mapRichText(
              child,
              `${index}-${childIndex}`,
              headingLevel,
              headingClassName,
            ),
          )}
        </a>
      );
  }
}
