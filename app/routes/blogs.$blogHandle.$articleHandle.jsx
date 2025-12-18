import {useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {useEffect, useRef} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, request, params}) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  return {article};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  return {};
}

export default function Article() {
  /** @type {LoaderReturnData} */
  const {article} = useLoaderData();
  const {title, image, contentHtml, author} = article;
  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(article.publishedAt));
  const content = useRef(null);

  useEffect(() => {
    if (!content.current) return;

    // Find all images in the article content
    const images = content.current.querySelectorAll('.article-content img');

    images.forEach((img) => {
      // Skip if already wrapped
      if (img.parentElement.classList.contains('image-wrapper')) return;

      const wrapper = document.createElement('figure');
      wrapper.className = 'image-wrapper';

      // Wrap the image
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      // Add caption if alt text exists
      if (img.alt) {
        const caption = document.createElement('figcaption');
        caption.textContent = img.alt;
        wrapper.appendChild(caption);
      }
    });

    // Add a div with class "line" before any h1 elements
    const h1Elements = content.current.querySelectorAll('.article-content h1');

    h1Elements.forEach((h1) => {
      // Skip if line div already exists before this h1
      if (h1.previousElementSibling?.classList.contains('line')) return;

      const lineDiv = document.createElement('div');
      lineDiv.className = 'line';
      h1.parentNode.insertBefore(lineDiv, h1);
    });
  }, [contentHtml]); // Re-run if content changes

  return (
    <div className="article" ref={content}>
      <div className="article-header">
        <div>
          <h1>{title}</h1>
          <address>By {author?.name}</address>
          <div className="line" />
          <time dateTime={article.publishedAt}>{publishedDate}</time>{' '}
        </div>
        {image && <Image data={image} sizes="90vw" loading="eager" />}
      </div>
      <div
        dangerouslySetInnerHTML={{__html: contentHtml}}
        className="article-content"
      />
      {/* {contentHtml
        .split('<h1>')
        .filter((x) => x)
        .map((x) => (
          <div className="article-content" key={x.slice(0, 20)}>
            <h1 className="red-dot">{x.split('</h1>')[0]}</h1>
            <div dangerouslySetInnerHTML={{__html: x.split('</h1>')[1]}} />
          </div>
        ))} */}
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        content
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
`;

/** @typedef {import('./+types/blogs.$blogHandle.$articleHandle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
