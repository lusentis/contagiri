
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
    if (e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = '';
    onAddBib(bib);
  }
  const handleChangeBib = index => e => {
    const nextBib = Number(e.target.value);
    onChangeBib(index, nextBib);
  }
  const laps = computeLaps(bibs);
  return (
    <div className="column">
      <h3>Categoria: {category}</h3>
      {laps.map((lap, lapNum0) => {
        if (lap.length === 0) {
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
                <tr key={index}>
                  <td><input type="number" defaultValue={bib} onKeyDown={handleChangeBib(index)} /></td>
                </tr>
              ))}
              <tr>
                <td><input type="number" defaultValue="" onKeyDown={handleAddBib} /></td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
