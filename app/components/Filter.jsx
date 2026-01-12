import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router';
import {AnimatePresence, motion} from 'framer-motion';
import {useCascadingFilterSelection} from '~/hooks/useCascadingFilterSelection';

export default function Filter({isSearch, length, filters}) {
  const [open, setOpen] = useState(false);
  function toggleOpen() {
    setOpen(!open);
  }
  const [searchParams, setSearchParams] = useSearchParams();

  function addSort(input) {
    const parsed = JSON.parse(input);
    setSearchParams(
      (prev) => {
        prev.set('reverse', Boolean(parsed.reverse));
        prev.set('sortKey', parsed.sortKey);
        // Clear pagination when sort changes to avoid invalid cursor error
        prev.delete('direction');
        prev.delete('cursor');
        return prev;
      },
      {preventScrollReset: true},
    );
  }

  function removeSort() {
    setSearchParams(
      (prev) => {
        prev.delete('reverse');
        prev.delete('sortKey');
        prev.delete('direction');
        prev.delete('cursor');
        return prev;
      },
      {preventScrollReset: true},
    );
  }

  function isSortChecked(input) {
    const parsed = JSON.parse(input);
    return (
      searchParams.get('reverse') === parsed.reverse.toString() &&
      searchParams.get('sortKey') === parsed.sortKey
    );
  }

  return (
    <motion.div
      initial={{height: '36px'}}
      animate={{height: open ? 'auto' : '36px'}}
      className="filter-container"
    >
      <div
        className="filter-container"
        style={{justifyContent: length > 0 ? 'space-between' : 'flex-end'}}
      >
        {length > 0 && (
          <button onClick={toggleOpen}>
            <span style={{opacity: open ? 0 : 1}}>+</span>
            <span
              style={{
                position: 'relative',
                fontSize: '115%',
                opacity: open ? 1 : 0,
              }}
            >
              -
            </span>
          </button>
        )}
        {/* implementation from hosh for total products */}
        <p>{`${length} Product${length !== 1 ? 's' : ''}`}</p>
      </div>
      <div style={{zIndex: open ? 0 : -1}} className="filter-body">
        <FilterColumns filters={filters} />
        <SortColumn
          addSort={addSort}
          removeSort={removeSort}
          isChecked={isSortChecked}
          isSearch={isSearch}
        />
      </div>
    </motion.div>
  );
}

export function FilterColumns({filters, isSideMenu}) {
  const [searchParams, setSearchParams] = useSearchParams();

  function addFilter(input) {
    setSearchParams(
      (prev) => {
        if (prev.has('filter')) {
          const updated = prev
            .getAll('filter')
            .filter(
              (f) =>
                Object.keys(JSON.parse(f))[0] !==
                Object.keys(JSON.parse(input))[0],
            );
          updated.push(input);
          prev.set('filter', updated);
        } else prev.set('filter', input);
        prev.delete('direction');
        prev.delete('cursor');
        return prev;
      },
      {preventScrollReset: false},
    );
  }

  function removeFilter(input) {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev); // Clone to avoid mutation
        const filters = newParams.getAll('filter'); // Get all filter values
        newParams.delete('filter'); // Remove all instances
        newParams.delete('direction');
        newParams.delete('cursor');

        // Re-add only the filters that are NOT being removed
        filters
          .filter((f) => f !== input)
          .forEach((f) => newParams.append('filter', f));

        return newParams;
      },
      {preventScrollReset: false},
    );
  }

  function isChecked(input) {
    return searchParams.getAll('filter').includes(input);
  }
  return (
    <>
      {filters.map((f) => (
        <FilterColumn
          key={f.id}
          filter={f}
          addFilter={addFilter}
          isChecked={isChecked}
          removeFilter={removeFilter}
          isSideMenu={isSideMenu}
        />
      ))}
    </>
  );
}

function SortColumn({addSort, removeSort, isChecked, isSearch}) {
  const sortOptions = [
    JSON.stringify({reverse: false, sortKey: 'TITLE'}),
    JSON.stringify({reverse: true, sortKey: 'TITLE'}),
    JSON.stringify({reverse: true, sortKey: 'CREATED'}),
    JSON.stringify({reverse: false, sortKey: 'CREATED'}),
    JSON.stringify({reverse: false, sortKey: 'PRICE'}),
    JSON.stringify({reverse: true, sortKey: 'PRICE'}),
  ];

  const {transitioning, handleSelection} = useCascadingFilterSelection(
    sortOptions,
    isChecked,
  );

  return (
    <div className="sort-column-container">
      <p className="bold-filter-header">Sort</p>
      <div className="filter-column">
        <FilterInput
          columnKey={'sort'}
          label={'Alphabetically, A-Z'}
          value={JSON.stringify({reverse: false, sortKey: 'TITLE'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: false, sortKey: 'TITLE'}),
          )}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Alphabetically, Z-A'}
          value={JSON.stringify({reverse: true, sortKey: 'TITLE'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: true, sortKey: 'TITLE'}),
          )}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Date, New to Old'}
          value={JSON.stringify({reverse: true, sortKey: 'CREATED'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: true, sortKey: 'CREATED'}),
          )}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Date, Old to New'}
          value={JSON.stringify({reverse: false, sortKey: 'CREATED'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: false, sortKey: 'CREATED'}),
          )}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Price, Low to High'}
          value={JSON.stringify({reverse: false, sortKey: 'PRICE'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: false, sortKey: 'PRICE'}),
          )}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Price, High to Low'}
          value={JSON.stringify({reverse: true, sortKey: 'PRICE'})}
          addFilter={(value) => handleSelection(value, addSort)}
          isChecked={isChecked}
          removeFilter={removeSort}
          isTransitioning={transitioning.has(
            JSON.stringify({reverse: true, sortKey: 'PRICE'}),
          )}
        />
      </div>
    </div>
  );
}

function FilterColumn({
  filter,
  addFilter,
  isChecked,
  removeFilter,
  isSideMenu,
}) {
  const filterOrderRef = useRef(new Map());

  function storeInitialOrder(filters) {
    if (filterOrderRef.current.size === 0) {
      filters.forEach((filter, index) => {
        filterOrderRef.current.set(filter.label, index);
      });
    }
  }

  function sortByStoredOrder(filters) {
    return filters.slice().sort((a, b) => {
      return (
        (filterOrderRef.current.get(a.label) ?? Infinity) -
        (filterOrderRef.current.get(b.label) ?? Infinity)
      );
    });
  }

  useEffect(() => {
    storeInitialOrder(filter.values);
  }, []);

  // Prepare data before using hooks
  const col = String(filter.label || '').toLowerCase();
  const isCategories = col === 'categories';

  let options = [];
  let items = [];

  if (isCategories) {
    const allowedOrder = [
      'headware',
      'apparel',
      'leather goods',
      'uniforms',
      'carry',
      'accessories',
      'drinkware',
      'kitchenware',
    ];
    const existingMap = new Map(
      filter.values.map((v) => [String(v.label || '').toLowerCase(), v]),
    );

    function titleCase(str) {
      return String(str || '')
        .split(' ')
        .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
        .join(' ');
    }

    items = allowedOrder.map((lbl) => {
      const found = existingMap.get(lbl);
      if (found) return {...found, label: titleCase(found.label)};

      const inputSlug = lbl;
      return {
        id: `missing-${lbl.replace(/\s+/g, '-')}`,
        label: titleCase(lbl),
        input: inputSlug,
        count: 0,
      };
    });
    options = items.map((v) => v.input);
  } else {
    items = sortByStoredOrder(
      filter.values.filter(
        (v) => !(filter.label === 'category' && v.label.includes('men')),
      ),
    );
    options = items.map((v) => v.input);
  }

  // Now call the hook with prepared data
  const {transitioning, handleSelection} = useCascadingFilterSelection(
    options,
    isChecked,
  );

  return (
    <div className="filter-column-container">
      <p>{filter.label}</p>
      <div className="filter-column">
        {items.map((v) => (
          <FilterInput
            key={v.id}
            label={v.label}
            value={v.input}
            count={v.count}
            addFilter={(value) => handleSelection(value, addFilter)}
            isChecked={isChecked}
            removeFilter={removeFilter}
            isTransitioning={transitioning.has(v.input)}
            columnKey={isCategories ? filter.label + isSideMenu : filter.label}
          />
        ))}
      </div>
    </div>
  );
}

export function FilterInput({
  label,
  value,
  count,
  addFilter,
  isChecked,
  removeFilter,
  columnKey,
  isTransitioning,
}) {
  const [hide, setHide] = useState(false);
  const {pathname} = useLocation();

  useEffect(() => {
    if (columnKey.toLowerCase() === 'sort') setHide(count === 0);
  }, [pathname, columnKey, count]);

  return (
    <div
      style={{
        opacity: count === 0 ? '33%' : '100%',
        display: hide ? 'none' : 'flex',
        left: isTransitioning ? 15 : 0,
      }}
      className={columnKey}
    >
      <AnimatePresence mode="popLayout">
        {isChecked(value) && (
          <motion.div
            layoutId={columnKey}
            className="filter-dot"
            transition={{ease: 'easeInOut'}}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          />
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => {
          if (count === 0) return;
          if (!isChecked(value)) addFilter(value);
          else removeFilter(value);
        }}
        disabled={count === 0 ? true : null}
        style={{
          textDecoration: count === 0 ? 'underline' : 'none',
          textUnderlineOffset: '-38%',
          textDecorationSkipInk: 'none',
          color: 'var(--color-oh-black)',
        }}
        transition={{ease: 'easeInOut'}}
        layout
      >
        {label}
      </motion.button>
    </div>
  );
}
