
import React from 'react';

import './Column.css'

const MAX_LAPS = 20 + 1; // add 1 to the expected laps count

const computeLaps = bibs => {
  const laps = new Array(MAX_LAPS);
  for (let lapNum = 0; lapNum < MAX_LAPS; lapNum++) {
    laps[lapNum] = [];
  }
  bibs.forEach(bib => {
    let added = false;
    for (let lapNum = 0; lapNum < MAX_LAPS; lapNum++) {
      if (laps[lapNum].indexOf(bib) === -1) {
        laps[lapNum].push(bib);
        added = true;
        break;
      }
    }
    if (!added) {
      alert('troppi giri', bib);
    }
  });
  return laps;
}

export default function column({
  category,
  onCategoryAddBib,
  onChangeBib,
  bibs
}) {
  const handleCategoryAddBib = ({ prev = 0 }) => e => {
    if (e.nativeEvent.keyCode === 107) {
      e.target.value = Number(prev) + 1;
      e.preventDefault();
      return;
    }
    if (e.nativeEvent.keyCode &&
        e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    if (!bib) {
      return;
    }
    e.target.value = '';
    onCategoryAddBib(bib);
  }
  const handleChangeBib = (lapNum0, index) => e => {
    const nextBib = Number(e.target.value);
    if (!nextBib) {
      return;
    }
    onChangeBib(lapNum0, index, nextBib);
  }
  const laps = bibs ? computeLaps(bibs) : [[]];
  return (
    <div className="column">
      <h3>Categoria: {category}</h3>
      {laps.map((lap, lapNum0) => {
        if (lapNum0 !== 0 && lap.length === 0) {
          return false;
        }
        let totalCount = 0;
        let naCount = 0;
        let lastBib = 0;
        return (
          <table key={lapNum0}>
            <thead>
              <tr>
                <td>{lapNum0 === 0 ? 'griglia' : ('giro ' + lapNum0)}</td>
              </tr>
            </thead>
            <tbody>
              {lap.map((bib, index) => {
                if (bib === 0) {
                  return false;
                }
                totalCount++;
                let className = '';
                if (lapNum0 < laps.length &&
                  Array.isArray(laps[lapNum0 + 1]) &&
                  laps[lapNum0 + 1].indexOf(bib) === -1
                ) {
                  naCount++;
                  className += 'na';
                }
                if (!bib) {
                  return false; // ???
                }
                lastBib = bib;
                return (
                  <tr key={bib}>
                    <td className={lapNum0 === 0 ? 'first' : ''}>
                      <input
                        type="number"
                        className={className}
                        defaultValue={bib}
                        readOnly={lapNum0 !== 0}
                        onKeyDown={lapNum0 === 0 ? handleChangeBib(lapNum0, index): () => {}}
                        onBlur={lapNum0 === 0 ? handleChangeBib(lapNum0, index) : () => {}}
                      />
                    </td>
                  </tr>
                );
              })}
              {lapNum0 === 0 &&
                <tr>
                  <td>
                    <input
                      type="number"
                      defaultValue=""
                      onKeyDown={handleCategoryAddBib({ prev: lastBib })}
                      onBlur={handleCategoryAddBib}
                    />
                  </td>
                </tr>
              }
              <tr>
                <td className="stats">
                  <em><span style={{ color: 'green' }}>{totalCount - naCount}</span> / {totalCount}</em>
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
