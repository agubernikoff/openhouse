import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router';
import {AnimatePresence, motion} from 'framer-motion';

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

export function FilterColumns({filters}) {
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
      {preventScrollReset: true},
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
      {preventScrollReset: true},
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
        />
      ))}
    </>
  );
}

function SortColumn({addSort, removeSort, isChecked, isSearch}) {
  return (
    <div className="sort-column-container">
      <p className="bold-filter-header">Sort</p>
      <div className="filter-column">
        <FilterInput
          columnKey={'sort'}
          label={'Alphabetically, A-Z'}
          value={JSON.stringify({reverse: false, sortKey: 'TITLE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Alphabetically, Z-A'}
          value={JSON.stringify({reverse: true, sortKey: 'TITLE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Date, New to Old'}
          value={JSON.stringify({reverse: true, sortKey: 'CREATED'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Date, Old to New'}
          value={JSON.stringify({reverse: false, sortKey: 'CREATED'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Price, Low to High'}
          value={JSON.stringify({reverse: false, sortKey: 'PRICE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
        />
        <FilterInput
          columnKey={'sort'}
          label={'Price, High to Low'}
          value={JSON.stringify({reverse: true, sortKey: 'PRICE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
        />
      </div>
    </div>
  );
}

function FilterColumn({filter, addFilter, isChecked, removeFilter}) {
  const filterOrderRef = useRef(new Map()); // Persist across renders

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

  return (
    <div className="filter-column-container">
      <p>{filter.label}</p>
      <div className="filter-column">
        {(() => {
          // If this column is the categories column, only render the
          // specific allowed category labels (and in the declared order).
          const col = String(filter.label || '').toLowerCase();
          if (col === 'categories') {
            const allowedOrder = [
              'headware',
              'apparel',
              'leather goods',
              'uniforms',
              'carry',
              'accessories',
              'drinkware',
            ];
            const existingMap = new Map(
              filter.values.map((v) => [
                String(v.label || '').toLowerCase(),
                v,
              ]),
            );

            function titleCase(str) {
              return String(str || '')
                .split(' ')
                .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
                .join(' ');
            }

            const ordered = allowedOrder.map((lbl) => {
              const found = existingMap.get(lbl);
              if (found) return found;

              // Create a stand-in object for missing allowed category
              const inputSlug = lbl; // use lowercase label as slug/input
              return {
                id: `missing-${lbl.replace(/\s+/g, '-')}`,
                label: titleCase(lbl),
                input: inputSlug,
                count: 0,
              };
            });

            return ordered.map((v) => (
              <FilterInput
                key={v.id}
                label={v.label}
                value={v.input}
                count={v.count}
                addFilter={addFilter}
                isChecked={isChecked}
                removeFilter={removeFilter}
                columnKey={filter.label}
              />
            ));
          }

          // Default behaviour for other columns (preserve previous logic)
          const values = sortByStoredOrder(
            filter.values.filter(
              (v) => !(filter.label === 'category' && v.label.includes('men')),
            ),
          );

          return values.map((v) => (
            <FilterInput
              key={v.id}
              label={v.label}
              value={v.input}
              count={v.count}
              addFilter={addFilter}
              isChecked={isChecked}
              removeFilter={removeFilter}
              columnKey={filter.label}
            />
          ));
        })()}
      </div>
    </div>
  );
}

function FilterInput({
  label,
  value,
  count,
  addFilter,
  isChecked,
  removeFilter,
  columnKey,
}) {
  const [hide, setHide] = useState(false);
  const {pathname} = useLocation();
  useEffect(() => {
    if (columnKey.toLowerCase() === 'sort') setHide(count === 0);
  }, [pathname]);
  return (
    <div
      style={{
        opacity: count === 0 ? '33%' : '100%',
        display: hide ? 'none' : 'flex',
        left: isChecked(value) ? '0' : '15px',
      }}
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
      <button
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
        }}
      >
        {label}
      </button>
    </div>
  );
}
