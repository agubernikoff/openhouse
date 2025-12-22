import {useLoaderData, useLocation, Link} from 'react-router';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Image} from '@shopify/hydrogen';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useTransform,
} from 'motion/react';
import {useState, useEffect, useRef, forwardRef, useCallback} from 'react';
import mapRichText from '~/helpers/mapRichText';
import Expandable from '~/components/Expandable';

function useIsFirstRender() {
  const isFirst = useRef(true);
  useEffect(() => {
    isFirst.current = false;
  }, []);
  return isFirst.current;
}

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Openhouse | ${data?.page.title ?? ''}`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request, params}) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const [{page}] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
  ]);

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {page};
}

function loadDeferredData({context}) {
  return {};
}

function ScrollToHashEffect({refsMap, offset = 80}) {
  const {hash} = useLocation();

  useEffect(() => {
    if (!hash) return;
    const ref = refsMap[hash.replace('#', '')];
    if (!ref?.current) return;

    const y = ref.current.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({top: y, behavior: 'smooth'});
  }, [hash, refsMap, offset]);

  return null;
}

export default function Page() {
  const {page} = useLoaderData();

  return (
    <div className="page">
      {page.hide_title?.value !== 'true' && (
        <header>
          <h1>{page.title}</h1>
        </header>
      )}
      {page.sections ? (
        <Sections sections={page.sections?.references?.nodes} />
      ) : (
        <main dangerouslySetInnerHTML={{__html: page.body}} />
      )}
    </div>
  );
}

export function Sections({sections}) {
  // Create refs map based on section types
  const refsMap = ['faq', 'our_story'].reduce((acc, section) => {
    acc[section] = useRef(null);
    return acc;
  }, {});

  const mapped = sections?.map((section) => {
    switch (section.type) {
      case 'partners':
        return <Partners section={section} key={section.id} />;
      case 'marquee':
        return <Marquee section={section} key={section.id} />;
      case 'hero_section':
        return <PageHero section={section} key={section.id} />;
      case 'title_and_blurb':
        const ref = refsMap['our_story'];
        const {title} = normalizeMetaobject(section);
        return (
          <TitleAndBlurb
            section={section}
            key={section.id}
            ref={
              title?.value.toLowerCase().split(' ').join('_') === 'our_story'
                ? ref
                : null
            }
          />
        );
      case 'multi_title_and_blurb':
        return <MultiTitleAndBlurb section={section} key={section.id} />;
      case 'faq_section':
        const reff = refsMap['faq'];
        return <FAQSection section={section} key={section.id} ref={reff} />;
      case 'services_header':
        return <ServicesHeader section={section} key={section.id} />;
      case 'sticky_scroll':
        return <StickyScroll section={section} key={section.id} />;
      case 'animated_scroll':
        return <AnimatedScroll section={section} key={section.id} />;
      default:
        return null;
    }
  });

  return (
    <main>
      <ScrollToHashEffect refsMap={refsMap} />
      {mapped}
    </main>
  );
}

function AnimatedScroll({section}) {
  const {title, blurb, data} = normalizeMetaobject(section);
  const [selected, setSelected] = useState(data?.references?.nodes[0]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollProgresses, setScrollProgresses] = useState({});

  // Update scroll progress for a specific index
  const updateScrollProgress = useCallback(
    (index, progress) => {
      setScrollProgresses((prev) => ({...prev, [index]: progress}));

      // Update selected when this element comes into view
      if (progress > 0 && selectedIndex !== index) {
        setSelectedIndex(index);
        setSelected(data?.references?.nodes[index]);
      }
    },
    [selectedIndex, data?.references?.nodes],
  );

  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">{title?.value?.toUpperCase()}</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <h3>{blurb?.value && mapRichText(JSON.parse(blurb.value))}</h3>
      </div>
      <div className="animated-scroll-content-container-outer">
        <StickyScrollContent
          images={data?.references?.nodes.map((n) => {
            const {image} = normalizeMetaobject(n);
            return image;
          })}
          data={selected}
          index={selectedIndex + 1}
          selectedIndex={selectedIndex}
          scrollProgresses={scrollProgresses}
        />
        {data?.references?.nodes?.map((n, i) => (
          <ScrollingContent
            key={n.id}
            data={n}
            index={i + 1}
            onScrollProgressChange={(progress) =>
              updateScrollProgress(i, progress)
            }
          />
        ))}
      </div>
    </section>
  );
}

function StickyScrollContent({
  images,
  data,
  index,
  selectedIndex,
  scrollProgresses,
}) {
  const containerRef = useRef(null);
  const [scrollDirection, setScrollDirection] = useState('down');
  const lastScrollY = useRef(0);

  const {title, blurb} = normalizeMetaobject(data);

  // Track scroll direction based on actual scroll position
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const x = useMotionValue(0);

  // Update progress bar based on selected scroll progress
  useEffect(() => {
    const progress = scrollProgresses[selectedIndex];
    if (progress !== undefined) {
      x.set(progress);
    }
  }, [scrollProgresses, selectedIndex, x]);

  const barWidth = useTransform(x, [0, 1], ['0%', '100%']);

  // Animation variants based on scroll direction
  const isScrollingDown = scrollDirection === 'down';
  const yEnter = isScrollingDown ? '50px' : '-50px';
  const yExit = isScrollingDown ? '-50px' : '50px';

  return (
    <div className="animated-scroll-object" ref={containerRef}>
      <div className="animated-scroll-object-image-container">
        {images?.map((img, i) => {
          const isSelected = i === selectedIndex;
          const progress = scrollProgresses[i] || 0;
          return (
            <AnimatedImage
              key={img.reference.id}
              image={img}
              progress={progress}
              isSelected={isSelected}
              isFirst={i === 0}
            />
          );
        })}
        <motion.div className="scroll-progress-bar" style={{width: barWidth}} />
      </div>
      <div className="animated-scroll-object-text-container">
        <div>
          <motion.p
            className="red-dot"
            key={title?.value}
            initial={{opacity: 0, y: yEnter}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: yExit}}
            transition={{ease: 'easeInOut', delay: isScrollingDown ? 0 : 0.3}}
          >{`${index <= 10 ? 0 : ''}${index}`}</motion.p>
          <motion.h3
            key={`${title?.value}-h3`}
            initial={{opacity: 0, y: yEnter}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: yExit}}
            transition={{ease: 'easeInOut', delay: isScrollingDown ? 0.1 : 0.2}}
          >
            {title?.value}
          </motion.h3>
        </div>
        <motion.div
          key={`${title?.value}-blurb`}
          initial={{opacity: 0, y: yEnter}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: yExit}}
          transition={{ease: 'easeInOut', delay: isScrollingDown ? 0.2 : 0.1}}
        >
          {blurb?.value && mapRichText(JSON.parse(blurb.value))}
        </motion.div>
        <motion.div
          key={`${title?.value}-link`}
          initial={{opacity: 0, y: yEnter}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: yExit}}
          transition={{ease: 'easeInOut', delay: isScrollingDown ? 0.3 : 0}}
        >
          <Link to="/contact" className="explore-all">
            GET IN CONTACT
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedImage({image, progress, isFirst, isSelected}) {
  if (!image?.reference) return null;

  return (
    <motion.div
      animate={{scale: isFirst ? 1 : progress === 0 && !isSelected ? 0 : 1}}
      key={image.reference.id}
      transition={{duration: 0.5, ease: 'easeInOut'}}
    >
      <Image
        data={image?.reference?.image}
        sizes="(min-width: 45em) 40vw, 100vw"
      />
    </motion.div>
  );
}

function ScrollingContent({data, index, onScrollProgressChange}) {
  const {title, blurb, image} = normalizeMetaobject(data);
  const containerRef = useRef(null);

  const {scrollYProgress} = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // Report scroll progress changes to parent
  useEffect(() => {
    if (onScrollProgressChange) {
      const unsubscribe = scrollYProgress.on('change', (latest) => {
        onScrollProgressChange(latest);
      });
      return unsubscribe;
    }
  }, [scrollYProgress, onScrollProgressChange]);

  return (
    <div className="animated-scroll-object" ref={containerRef}>
      <div className="animated-scroll-object-image-container">
        <Image
          data={image?.reference?.image}
          sizes="(min-width: 45em) 40vw, 100vw"
        />
        <motion.div className="scroll-progress-bar" style={{width: x}} />
      </div>
      <div className="animated-scroll-object-text-container">
        <div>
          <p className="red-dot">{`${index <= 10 ? 0 : ''}${index}`}</p>
          <h3>{title?.value}</h3>
        </div>
        {blurb?.value && mapRichText(JSON.parse(blurb.value))}
        <Link to="/contact" className="explore-all">
          GET IN CONTACT
        </Link>
      </div>
    </div>
  );
}

function StickyScroll({section}) {
  const first = useRef(null);
  const last = useRef(null);
  const containerRef = useRef(null);
  const [topOffset, setTopOffset] = useState(0);
  const [bottomOffset, setBottomOffset] = useState(0);
  const {scrollYProgress} = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  const {title, data, image} = normalizeMetaobject(section);
  // Calculate the offset positions based on first and last element heights
  useEffect(() => {
    if (!first.current || !last.current || !containerRef.current) return;

    const updateOffsets = () => {
      const firstHeight = first.current.offsetHeight;
      const lastHeight = last.current.offsetHeight;

      // Calculate offset from top of container to middle of first element
      const firstRect = first.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const topPos = firstRect.top - containerRect.top + firstHeight / 2;

      // Calculate offset to middle of last element
      const lastRect = last.current.getBoundingClientRect();
      const bottomPos = lastRect.top - containerRect.top + lastHeight / 2;

      setTopOffset(topPos);
      setBottomOffset(bottomPos);
    };

    updateOffsets();
    window.addEventListener('resize', updateOffsets);
    return () => window.removeEventListener('resize', updateOffsets);
  }, [data?.references?.nodes?.length]);

  // Transform scroll progress to dot position
  const dotTop = useTransform(
    scrollYProgress,
    [0, 1],
    [topOffset, bottomOffset],
  );

  const content = data?.references?.nodes?.map((node, i) => {
    const {title, blurb} = normalizeMetaobject(node);
    return (
      <div
        key={node.id}
        className="title-and-blurb-item"
        ref={
          i === 0
            ? first
            : i === data?.references?.nodes?.length - 1
              ? last
              : null
        }
      >
        <h3>{title?.value}</h3>
        {blurb?.value && mapRichText(JSON.parse(blurb.value))}
      </div>
    );
  });

  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">{title?.value?.toUpperCase()}</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <div className="sticky-scroll-line-and-div-container">
          <div className="sticky-scroll-line" />
          <motion.div
            className="filter-dot"
            style={{
              top: dotTop,
            }}
          />
        </div>
        <div
          className="page-subgrid-content-container sticky-scroll-content-container"
          ref={containerRef}
        >
          {content}
        </div>
        <div>
          <Image
            data={image?.reference?.image}
            sizes="(min-width: 45em) 25vw, 100vw"
            className="sticky-scroll-image"
          />
        </div>
      </div>
    </section>
  );
}

function ServicesHeader({section}) {
  const {header, label, subheader, button_text, link, image} =
    normalizeMetaobject(section);
  return (
    <section className="hero-section services-header">
      <div>
        <div
          style={{
            aspectRatio: `${image?.reference?.image?.width}/${image?.reference?.image?.height}`,
          }}
        >
          <Image data={image?.reference?.image} sizes="25vw" />
        </div>
        <div className="services-header-text-container">
          <p>{label?.value?.toUpperCase()}</p>
          <h2>{header?.value}</h2>
          <p>{subheader?.value}</p>
          <Link to={link?.value || '#'} className="explore-all">
            {button_text?.value}
          </Link>
        </div>
      </div>
    </section>
  );
}

const FAQSection = forwardRef(({section}, ref) => {
  const {faqs} = normalizeMetaobject(section);
  const isFirstRender = useIsFirstRender();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <section className="home-featured-collection" ref={ref}>
      <div>
        <p className="red-dot">FREQUENTLY ASKED QUESTIONS</p>
      </div>
      <div>
        {faqs?.references?.nodes?.map((field) => {
          const {question, answer} = normalizeMetaobject(field);

          // Skip if question or answer is missing
          if (!question?.value || !answer?.value) {
            return null;
          }

          return (
            <Expandable
              key={field.id}
              openSection={openSection}
              toggleSection={toggleSection}
              title={question.value}
              details={answer?.value && mapRichText(JSON.parse(answer.value))}
              isFirstRender={isFirstRender}
            />
          );
        })}
      </div>
    </section>
  );
});

function MultiTitleAndBlurb({section}) {
  const {title, titles_and_blurbs} = normalizeMetaobject(section);
  const content = titles_and_blurbs?.references?.nodes
    .map((node) => {
      const {title: itemTitle, blurb} = normalizeMetaobject(node);

      // Skip rendering if either title or blurb is missing
      if (!itemTitle?.value || !blurb?.value) {
        return null;
      }

      return (
        <div key={node.id} className="title-and-blurb-item">
          <h3>{itemTitle?.value}</h3>
          {blurb?.value && mapRichText(JSON.parse(blurb.value))}
        </div>
      );
    })
    .filter(Boolean); // Remove null entries

  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">{title?.value?.toUpperCase() || ''}</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <div className="page-subgrid-content-container multi-title-and-blurb">
          {content}
        </div>
      </div>
    </section>
  );
}

const TitleAndBlurb = forwardRef(({section}, ref) => {
  const {title, blurb} = normalizeMetaobject(section);

  return (
    <section className="home-featured-collection" ref={ref}>
      <div>
        <p className="red-dot">{title?.value?.toUpperCase()}</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <div className="page-subgrid-content-container">
          {blurb?.value && mapRichText(JSON.parse(blurb.value))}
        </div>
      </div>
    </section>
  );
});

function PageHero({section}) {
  const {background, headline} = normalizeMetaobject(section);

  return (
    <section className="hero-section">
      <Image data={background?.reference?.image} sizes="100vw" />
      <div>
        <svg
          width="66"
          height="28"
          viewBox="0 0 66 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M65.0455 0.440001C65.0455 0.440001 13.3597 0 13.0581 0C5.48226 0 0 5.72355 0 13.5815C0 21.4394 5.48048 27.1629 13.0581 27.1629C20.6356 27.1629 26.1161 21.4411 26.1161 13.5815C26.1161 10.9663 25.5058 8.59064 24.4182 6.58226L36.7542 6.67274V21.2495C36.7542 21.6469 37.0753 21.9681 37.4727 21.9681H42.3624C42.7598 21.9681 43.081 21.6469 43.081 21.2495V18.5066C43.081 18.1092 43.4021 17.7881 43.7995 17.7881H53.3074C53.7048 17.7881 54.026 18.1092 54.026 18.5066V21.6913C54.026 22.0887 54.3471 22.4098 54.7445 22.4098H59.6342C60.0316 22.4098 60.3527 22.0887 60.3527 21.6913V6.75258L65.0402 6.76145C65.4731 6.765 65.8261 6.41371 65.8261 5.98258V1.22065C65.8261 0.789516 65.4766 0.440001 65.0455 0.440001ZM13.0581 21.3595C9.14952 21.3595 6.28774 18.0152 6.28774 13.5016C6.28774 8.98806 9.14952 5.64194 13.0581 5.64194C16.9666 5.64194 19.8284 8.90645 19.8284 13.5016C19.8284 18.0968 16.9666 21.3595 13.0581 21.3595ZM54.026 11.9403C54.026 12.3377 53.7048 12.6589 53.3074 12.6589H43.7995C43.4021 12.6589 43.081 12.3377 43.081 11.9403V6.71887L54.0242 6.74016V11.9403H54.026Z"
            fill="#F4F2EA"
          />
        </svg>
        {headline?.value && mapRichText(JSON.parse(headline.value))}
      </div>
    </section>
  );
}

function Marquee({section}) {
  const images = section?.fields?.[0]?.references?.nodes;
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [percentHidden, setPercentHidden] = useState(0);

  const {scrollYProgress} = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  useEffect(() => {
    const calculatePercentHidden = () => {
      if (contentRef.current && containerRef.current) {
        const contentWidth = contentRef.current.scrollWidth;
        const windowWidth = window.innerWidth;
        const hiddenWidth = contentWidth - windowWidth;
        const percent = (hiddenWidth / windowWidth) * 100;
        setPercentHidden(percent);
      }
    };

    calculatePercentHidden();
    window.addEventListener('resize', calculatePercentHidden);
    return () => window.removeEventListener('resize', calculatePercentHidden);
  }, [images]);

  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${percentHidden}%`]);

  return (
    <section className="marquee-section" ref={containerRef}>
      <motion.div ref={contentRef} style={{x}}>
        {images?.map((i) => (
          <Image
            key={i.id}
            data={i.image}
            sizes="(min-width: 767px) 30vw, 100vw"
          />
        ))}
      </motion.div>
    </section>
  );
}

function Partners({section}) {
  const {header, partners} = normalizeMetaobject(section);

  const allPartners = partners?.references?.nodes || [];
  const [displayed, setDisplayed] = useState(() => allPartners.slice(0, 20));
  const leftoverRef = useRef(allPartners.slice(20));
  const stagingRef = useRef([]);
  const isPullingFromLeftoverRef = useRef(true);
  const lastReplacedIndexRef = useRef(null);

  const containerRef = useRef(null);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true,
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsOnScreen(entry.isIntersecting);
        });
      },
      {threshold: 0.1},
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!isOnScreen || !isTabVisible) return;

    const interval = setInterval(() => {
      setDisplayed((prev) => {
        const newDisplayed = [...prev];
        let randomIndex;
        let attempts = 0;
        do {
          randomIndex = Math.floor(Math.random() * newDisplayed.length);
          attempts += 1;
        } while (randomIndex === lastReplacedIndexRef.current && attempts < 10);
        lastReplacedIndexRef.current = randomIndex;
        const removedNode = newDisplayed[randomIndex];

        let replacement = null;
        if (isPullingFromLeftoverRef.current) {
          if (leftoverRef.current.length > 0) {
            replacement = leftoverRef.current.shift();
          } else if (stagingRef.current.length > 0) {
            isPullingFromLeftoverRef.current = false;
            replacement = stagingRef.current.shift();
          }
        } else {
          if (stagingRef.current.length > 0) {
            replacement = stagingRef.current.shift();
          } else if (leftoverRef.current.length > 0) {
            isPullingFromLeftoverRef.current = true;
            replacement = leftoverRef.current.shift();
          }
        }

        if (replacement) {
          newDisplayed[randomIndex] = replacement;
          if (isPullingFromLeftoverRef.current) {
            stagingRef.current.push(removedNode);
          } else {
            leftoverRef.current.push(removedNode);
          }
        }
        return newDisplayed;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOnScreen, isTabVisible]);

  const renderLogo = (n, i) => {
    const fieldz = normalizeMetaobject(n);
    return (
      <div style={{overflow: 'hidden'}} key={n.id + '-' + i}>
        <motion.div
          initial={{opacity: 0, y: 100}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -100}}
          transition={{ease: [0.77, 0.03, 0.94, 0.74], duration: 0.6}}
          key={n.id + '-' + i}
          style={{width: '100%', height: '100%'}}
        >
          <Image
            data={{
              ...fieldz.logo?.reference?.image,
              altText: fieldz?.name?.value,
            }}
            sizes="100vw"
            className="partner-logo"
          />
        </motion.div>
      </div>
    );
  };

  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">PARTNERS</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <h3>{header?.value}</h3>
      </div>
      <div className="partners-wall-container" ref={containerRef}>
        <AnimatePresence mode="popLayout">
          {displayed.map(renderLogo)}
        </AnimatePresence>
      </div>
    </section>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
      hide_title:metafield(key: "hide_title", namespace: "custom"){
        value
      }
      sections:metafield(key: "sections", namespace: "custom") {
        references(first: 10) {
          nodes {
            ... on Metaobject {
              type
              id
              fields {
                type
                value
                key
                reference{
                  ...on MediaImage{
                    id
                    __typename
                    image{
                      url
                      height
                      id
                      width
                      altText
                    }
                  }
                }
                references(first: 200) {
                  nodes {
                    ...on MediaImage{
                      id
                      __typename
                      image{
                        url
                        height
                        id
                        width
                        altText
                      }
                    }
                    ... on Metaobject {
                      id
                      fields {
                        value
                        key
                        reference {
                          ... on MediaImage {
                            id
                            __typename
                            image {
                              url
                              height
                              id
                              width
                              altText
                            }
                          }
                        }
                        type
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** @typedef {import('./+types/pages.$handle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
