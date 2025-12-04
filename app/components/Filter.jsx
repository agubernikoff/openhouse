import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router';
import {motion} from 'framer-motion';

export default function Filter({filters, isSearch, length}) {
  const [open, setOpen] = useState(false);
  function toggleOpen() {
    setOpen(!open);
  }
  const [searchParams, setSearchParams] = useSearchParams();

  function addFilter(input) {
    setSearchParams(
      (prev) => {
        if (prev.has('filter')) {
          prev.append('filter', input);
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
      <div className="filter-container">
        <button onClick={toggleOpen}>
          <span style={{opacity: open ? 0 : 1}}>+</span>
          <span
            style={{
              position: 'absolute',
              left: '2px',
              fontSize: '115%',
              top: '-3px',
              opacity: open ? 1 : 0,
            }}
          >
            -
          </span>{' '}
          Filter
        </button>
        {/* implementation from hosh for total products */}
        <p>{`${length} Product${length !== 1 ? 's' : ''}`}</p>
      </div>
      <div style={{zIndex: open ? 0 : -1}} className="filter-body">
        <FilterColumns
          filters={filters}
          addFilter={addFilter}
          removeFilter={removeFilter}
          isChecked={isChecked}
        />
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

function FilterColumns({filters, addFilter, isChecked, removeFilter}) {
  return (
    <div className="filter-columns-container">
      <p className="bold-filter-header">filter</p>
      <div className="filter-columns">
        {filters.map((f) => (
          <FilterColumn
            key={f.id}
            filter={f}
            addFilter={addFilter}
            isChecked={isChecked}
            removeFilter={removeFilter}
          />
        ))}
      </div>
    </div>
  );
}

function SortColumn({addSort, removeSort, isChecked, isSearch}) {
  return (
    <div className="sort-column-container">
      <p className="bold-filter-header">sort</p>
      <div className="filter-column">
        <FilterInput
          label={'alphabetically, a-z'}
          value={JSON.stringify({reverse: false, sortKey: 'TITLE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          label={'alphabetically, z-a'}
          value={JSON.stringify({reverse: true, sortKey: 'TITLE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          label={'date, new to old'}
          value={JSON.stringify({reverse: true, sortKey: 'CREATED'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          label={'date, old to new'}
          value={JSON.stringify({reverse: false, sortKey: 'CREATED'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
          count={isSearch ? 0 : null}
        />
        <FilterInput
          label={'price, low to high'}
          value={JSON.stringify({reverse: false, sortKey: 'PRICE'})}
          addFilter={addSort}
          isChecked={isChecked}
          removeFilter={removeSort}
        />
        <FilterInput
          label={'price, high to low'}
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
      <p>{filter.label}:</p>
      <div className="filter-column">
        {sortByStoredOrder(
          filter.values.filter(
            (v) => !(filter.label === 'category' && v.label.includes('men')),
          ),
        ).map((v) => (
          <FilterInput
            key={v.id}
            label={v.label}
            value={v.input}
            count={v.count}
            addFilter={addFilter}
            isChecked={isChecked}
            removeFilter={removeFilter}
          />
        ))}
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
}) {
  const [hide, setHide] = useState(false);
  const {pathname} = useLocation();
  useEffect(() => {
    setHide(count === 0);
  }, [pathname]);
  return (
    <div
      style={
        count === 0
          ? {
              opacity: '33%',
              display: hide ? 'none' : 'block',
            }
          : null
      }
    >
      <input
        type="checkbox"
        id={label}
        name="gender"
        value={value}
        checked={isChecked(value)}
        onChange={(e) => {
          if (e.target.checked) addFilter(e.target.value);
          else removeFilter(e.target.value);
        }}
        disabled={count === 0 ? true : null}
      />
      <label
        htmlFor={label}
        style={
          count === 0
            ? {
                textDecoration: 'underline',
                textUnderlineOffset: '-38%',
                textDecorationSkipInk: 'none',
              }
            : null
        }
      >
        {label.toLowerCase()}
      </label>
    </div>
  );
}
