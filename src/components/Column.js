
import React from 'react';

import './Column.css'

const MAX_LAPS = 10 + 1; // add 1 to the expected laps count

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
      console.log('troppi giri', bib);
    }
  });
  return laps;
}

export default function column({
  category,
  onAddBib,
  onChangeBib,
  bibs
}) {
  const handleAddBib = e => {
    if (e.nativeEvent.keyCode &&
        e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = '';
    onAddBib(bib);
  }
  // const handleChangeBib = index => e => {
  //   // inconsistent behaviour, do not use
  //   // const nextBib = Number(e.target.value);
  //   // onChangeBib(index, nextBib);
  // }
  const laps = bibs ? computeLaps(bibs) : [[]];
  return (
    <div className="column">
      <h3>Categoria: {category}</h3>
      {laps.map((lap, lapNum0) => {
        if (lapNum0 !== 0 && lap.length === 0) {
          return false;
        }
        return (
          <table key={lapNum0}>
            <thead>
              <tr>
                <td>{lapNum0 === 0 ? 'lista conc.' : ('giro ' + lapNum0)}</td>
              </tr>
            </thead>
            <tbody>
              {lap.map((bib, index) => (
                <tr key={bib}>
                  <td>
                    <input
                      type="number"
                      defaultValue={bib}
                      readOnly
                      // onKeyDown={handleChangeBib(index)}
                      // onBlur={handleChangeBib(index)}
                    />
                  </td>
                </tr>
              ))}
              {lapNum0 === 0 &&
                <tr>
                  <td>
                    <input
                      type="number"
                      defaultValue=""
                      onKeyDown={handleAddBib}
                      onBlur={handleAddBib}
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
